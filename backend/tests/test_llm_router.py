"""Router tests with a mocked HTTP transport — no network, no keys."""
import json

import httpx
import pytest

from app.llm import LLMUnavailable, router, run_task, store
from app.llm.prompts import load_prompt
from app.llm.schemas import Ping
from app.settings import BACKEND_DIR, AppSettings


@pytest.fixture(autouse=True)
def _reset():
    router._cooldown.clear()
    yield
    router._cooldown.clear()


def make_settings(tmp_path, **keys) -> AppSettings:
    return AppSettings(_env_file=None, finn_data_dir=tmp_path, finn_llm_config=BACKEND_DIR / "config" / "models.yaml",
                       **keys)


def ok_response(content='{"ok": true, "echo": "hi"}', tin=10, tout=5) -> httpx.Response:
    return httpx.Response(200, json={"choices": [{"message": {"content": content}}],
                                     "usage": {"prompt_tokens": tin, "completion_tokens": tout}})


def client_for(handler) -> tuple[httpx.Client, list[httpx.Request]]:
    seen: list[httpx.Request] = []

    def wrapped(req: httpx.Request) -> httpx.Response:
        seen.append(req)
        return handler(req)

    return httpx.Client(transport=httpx.MockTransport(wrapped)), seen


def test_success_validates_and_logs(tmp_path):
    s = make_settings(tmp_path, gemini_api_key="g")
    client, seen = client_for(lambda r: ok_response())
    out = run_task("ping", {"word": "hi"}, settings=s, client=client)
    assert out == Ping(ok=True, echo="hi")
    assert len(seen) == 1 and "generativelanguage" in str(seen[0].url)
    assert json.loads(seen[0].content)["response_format"] == {"type": "json_object"}
    st = store.stats(s.llm_db_path)
    assert st.totals.calls == 1 and st.totals.tokens_in == 10 and st.totals.spend_inr == 0


def test_second_call_is_a_cache_hit_with_zero_http(tmp_path):
    s = make_settings(tmp_path, gemini_api_key="g")
    client, seen = client_for(lambda r: ok_response())
    run_task("ping", {"word": "hi"}, settings=s, client=client)
    run_task("ping", {"word": "hi"}, settings=s, client=client)
    assert len(seen) == 1
    st = store.stats(s.llm_db_path)
    assert st.totals.calls == 1 and st.totals.cache_hits == 1 and st.totals.cache_hit_pct == 50.0


def test_cache_key_changes_with_inputs_and_extra(tmp_path):
    s = make_settings(tmp_path, gemini_api_key="g")
    client, seen = client_for(lambda r: ok_response())
    run_task("ping", {"word": "a"}, settings=s, client=client)
    run_task("ping", {"word": "b"}, settings=s, client=client)
    run_task("ping", {"word": "a"}, cache_key_extra="doc2", settings=s, client=client)
    assert len(seen) == 3


def test_429_falls_through_to_next_model_and_cools_down(tmp_path):
    s = make_settings(tmp_path, gemini_api_key="g", groq_api_key="q")

    def handler(req):
        body = json.loads(req.content)
        return httpx.Response(429) if body["model"].startswith("gemini") else ok_response()

    client, seen = client_for(handler)
    run_task("ping", {"word": "x"}, settings=s, client=client)
    models = [json.loads(r.content)["model"] for r in seen]
    assert models[0].startswith("gemini") and models[-1] == "openai/gpt-oss-20b"
    n_first = len(seen)
    run_task("ping", {"word": "y"}, settings=s, client=client)  # gemini models are cooling down → only groq
    assert [json.loads(r.content)["model"] for r in seen[n_first:]] == ["openai/gpt-oss-20b"]


def test_invalid_json_gets_one_corrective_retry_then_succeeds(tmp_path):
    s = make_settings(tmp_path, gemini_api_key="g")
    replies = iter(["not json at all", '```json\n{"ok": true, "echo": "z"}\n```'])
    client, seen = client_for(lambda r: ok_response(next(replies)))
    out = run_task("ping", {"word": "z"}, settings=s, client=client)
    assert out.echo == "z" and len(seen) == 2
    assert "not valid JSON" in json.loads(seen[1].content)["messages"][1]["content"]


def test_schema_invalid_output_falls_through(tmp_path):
    s = make_settings(tmp_path, gemini_api_key="g", groq_api_key="q")

    def handler(req):
        gem = json.loads(req.content)["model"].startswith("gemini")
        return ok_response('{"wrong": 1}' if gem else '{"ok": true, "echo": "g"}')

    client, _ = client_for(handler)
    assert run_task("ping", {"word": "g"}, settings=s, client=client).echo == "g"


def test_5xx_and_timeout_fall_through(tmp_path):
    s = make_settings(tmp_path, gemini_api_key="g", groq_api_key="q")

    def handler(req):
        m = json.loads(req.content)["model"]
        if m == "gemini-3.5-flash-lite":
            return httpx.Response(503)
        if m == "gemini-3.1-flash-lite":
            raise httpx.ReadTimeout("slow")
        return ok_response()

    client, _ = client_for(handler)
    assert run_task("ping", {"word": "t"}, settings=s, client=client).ok


def test_missing_keys_raises_with_reasons(tmp_path):
    s = make_settings(tmp_path)
    client, seen = client_for(lambda r: ok_response())
    with pytest.raises(LLMUnavailable, match="no API key"):
        run_task("ping", {"word": "k"}, settings=s, client=client)
    assert seen == []


def test_oversized_input_skips_small_models(tmp_path):
    s = make_settings(tmp_path, groq_api_key="q")  # only groq available, but it has a 18k-char cap
    client, seen = client_for(lambda r: ok_response())
    with pytest.raises(LLMUnavailable, match="chars"):
        run_task("ping", {"word": "x" * 20000}, settings=s, client=client)
    assert seen == []


def test_all_failures_raise_and_are_ledgered(tmp_path):
    s = make_settings(tmp_path, gemini_api_key="g")
    client, _ = client_for(lambda r: httpx.Response(500))
    with pytest.raises(LLMUnavailable):
        run_task("ping", {"word": "f"}, settings=s, client=client)
    st = store.stats(s.llm_db_path)
    assert st.totals.calls == 0  # failures are not counted as calls


def test_unit_tracking_gives_avg_calls_per_ticker(tmp_path):
    s = make_settings(tmp_path, gemini_api_key="g")
    client, _ = client_for(lambda r: ok_response())
    for i, unit in enumerate(["AAA", "AAA", "BBB"]):
        run_task("ping", {"word": str(i)}, feature="pull.guidance", unit=unit, settings=s, client=client)
    assert store.stats(s.llm_db_path).avg_calls_new_ticker == 1.5


def test_grounding_counter(tmp_path):
    s = make_settings(tmp_path)
    store.incr(s.llm_db_path, "grounding_dropped", 3)
    assert store.stats(s.llm_db_path).grounding_dropped == 3


def test_prompt_loader():
    p = load_prompt("ping")
    assert (p.task, p.version, p.tier, p.schema) == ("ping", 1, "T1", "Ping")
    assert p.render({"word": "hi"})[1] == 'Return {"ok": true, "echo": "hi"}'
    with pytest.raises(ValueError, match="needs input"):
        p.render({})


@pytest.mark.parametrize("text", ['{"a":1}', '```json\n{"a":1}\n```', 'Sure! {"a":1} hope that helps'])
def test_extract_json(text):
    assert router.extract_json(text) == {"a": 1}
