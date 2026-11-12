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


def test_research_prompts_load_and_roundtrip(tmp_path):
    g = load_prompt("guidance_map")
    assert (g.tier, g.schema) == ("T2", "GuidanceItems")
    assert "{transcript_pages}" in g.user and '"items"' in g.system
    v = load_prompt("pvd_reduce")
    assert (v.tier, v.schema) == ("T3", "PvDVerdicts")
    assert "quietly_dropped" in v.system

    s = make_settings(tmp_path, gemini_api_key="g")
    reply = json.dumps({"items": [{"metric": "Revenue growth (cc)", "target": "3-3.5%", "horizon": "FY26",
                                   "quote": "we guide 3 to 3.5 percent", "page": 4}]})
    client, seen = client_for(lambda r: ok_response(reply))
    out = run_task("guidance_map", {"transcript_pages": "[page 4] we guide 3 to 3.5 percent"},
                   feature="pull.guidance", unit="INFY", cache_key_extra="doc1", settings=s, client=client)
    assert out.items[0].page == 4 and out.items[0].horizon == "FY26"
    sys_msg = json.loads(seen[0].content)["messages"][0]["content"]
    assert '{"metric":"string"' in sys_msg

    verdicts = {"verdicts": [{"guidance_id": "g1", "verdict": "met", "reason": "3.1% vs 3-3.5%",
                              "sources": [{"doc_id": "q4", "page": 4, "quote": "3.1 percent"},
                                          {"doc_id": "screener", "actual_ref": "quarters.sales"}]}],
                "unresolved": [{"guidance_id": "g2", "missing": "Q2 transcript"}]}
    client2, _ = client_for(lambda r: ok_response(json.dumps(verdicts)))
    out2 = run_task("pvd_reduce", {"research_evidence": "{}"}, settings=s, client=client2)
    assert out2.verdicts[0].verdict == "met" and out2.unresolved[0].missing == "Q2 transcript"


@pytest.mark.parametrize("text",['{"a":1}', '```json\n{"a":1}\n```', 'Sure! {"a":1} hope that helps'])
def test_extract_json(text):
    assert router.extract_json(text) == {"a": 1}


# ───────── Push prompts from ChatGPT (G3): classify_batch, so_what, results_extract ─────────
def test_classify_prompt_labels_match_category_enum():
    """Drift guard: the labels listed in the prompt must be exactly the contract's Category enum."""
    import re

    from app.models import Category
    sys_text = load_prompt("classify_batch").system
    labels = set(re.findall(r"^- ([a-z_&]+):", sys_text, re.MULTILINE))
    assert labels == {c.value for c in Category}


def test_classify_batch_roundtrip_and_bad_label_retries(tmp_path):
    s = make_settings(tmp_path, gemini_api_key="g")
    good = {"items": [{"id": "a1", "category": "results", "confidence": 0.95},
                      {"id": "b2", "category": "credit_rating", "confidence": 0.75}]}
    bad = {"items": [{"id": "a1", "category": "earnings", "confidence": 0.9}]}   # not a real label
    replies = iter([json.dumps(bad), json.dumps(good)])
    client, seen = client_for(lambda r: ok_response(next(replies)))
    out = run_task("classify_batch", {"filings": json.dumps([{"id": "a1"}, {"id": "b2"}])},
                   feature="push.classify", settings=s, client=client)
    assert [i.category for i in out.items] == ["results", "credit_rating"] and len(seen) == 2


def test_classify_confidence_must_be_0_to_1(tmp_path):
    s = make_settings(tmp_path, gemini_api_key="g")
    client, _ = client_for(lambda r: ok_response('{"items":[{"id":"a","category":"results","confidence":95}]}'))
    with pytest.raises(LLMUnavailable):
        run_task("classify_batch", {"filings": "[]"}, settings=s, client=client)


def test_so_what_over_70_chars_is_rejected_not_truncated(tmp_path):
    s = make_settings(tmp_path, gemini_api_key="g")
    ok_line = "Executives to attend CLSA India Forum in Mumbai on 16 Nov"
    assert len(ok_line) <= 70
    replies = iter([json.dumps({"so_what": "x" * 71}), json.dumps({"so_what": ok_line})])
    client, seen = client_for(lambda r: ok_response(next(replies)))
    assert run_task("so_what", {"filing": "headline"}, settings=s, client=client).so_what == ok_line
    assert len(seen) == 2          # the 71-char reply triggered a corrective retry


def test_results_extract_parses_reported_derived_and_missing(tmp_path):
    src = {"label": "Revenue from operations", "printed": "73,188", "unit": "₹ crore", "page": 8}
    cell = {"value_inr_cr": 73188.0, "status": "reported", "source": src, "components": None}
    miss = {"value_inr_cr": None, "status": "missing", "source": None, "components": None}
    derived = {"value_inr_cr": None, "status": "derived", "source": None, "components": {
        k: {"label": k, "printed": "1", "unit": "₹ crore", "page": 8}
        for k in ("pbt", "finance_cost", "depreciation_amortisation", "other_income")}}
    reply = {"basis": "consolidated",
             "periods": {"current": "2026-09-30", "previous": "2026-06-30", "year_ago": "2025-09-30"},
             "metrics": {"revenue": {"current": cell, "previous": cell, "year_ago": cell},
                         "ebitda": {"current": derived, "previous": miss, "year_ago": miss},
                         "pbt": {"current": miss, "previous": miss, "year_ago": miss},
                         "pat": {"current": miss, "previous": miss, "year_ago": miss}}}
    s = make_settings(tmp_path, gemini_api_key="g")
    client, _ = client_for(lambda r: ok_response(json.dumps(reply)))
    out = run_task("results_extract", {"results_pdf": "[page 8] ..."}, feature="push.results", settings=s,
                   client=client)
    assert out.basis == "consolidated" and out.metrics.revenue.current.source.page == 8
    assert out.metrics.ebitda.current.status == "derived" and out.metrics.ebitda.current.value_inr_cr is None
    assert set(out.metrics.ebitda.current.components) == {"pbt", "finance_cost", "depreciation_amortisation",
                                                           "other_income"}


# ───────── free-tier DAILY quota (found live on 12 Nov: gemini-3.5-flash 429, retryDelay ~82 000 s) ─────────
def quota_429(delay="82004s", per_day=True):
    return httpx.Response(429, json={"error": {"code": 429, "status": "RESOURCE_EXHAUSTED", "details": [
        {"violations": [{"quotaId": "GenerateRequestsPerDayPerProjectPerModel-FreeTier" if per_day else "PerMinute"}]},
        {"retryDelay": delay}]}})


def test_quota_cooldown_parses_retry_delay_and_daily_quota():
    assert router.quota_cooldown(quota_429(), 60) == (82004.0, "daily free-tier quota used up")
    assert router.quota_cooldown(quota_429("500000s"), 60)[0] == 26 * 3600                         # capped at 26 h
    assert router.quota_cooldown(quota_429("32s", per_day=False), 60) == (60, "HTTP 429")           # short hint < default
    assert router.quota_cooldown(quota_429("120s", per_day=False), 60) == (120, "HTTP 429")
    assert router.quota_cooldown(httpx.Response(503, text="busy"), 60) == (60, "HTTP 503")


def test_daily_quota_skips_the_model_for_every_later_call_and_process(tmp_path):
    s = make_settings(tmp_path, gemini_api_key="g", groq_api_key="q")
    models_called = []

    def handler(req):
        model = json.loads(req.content)["model"]
        models_called.append(model)
        return quota_429() if model.startswith("gemini") else ok_response()

    client, _ = client_for(handler)
    run_task("ping", {"word": "a"}, settings=s, client=client)
    first = list(models_called)
    assert first[0].startswith("gemini") and first[-1] == "openai/gpt-oss-20b"
    router._cooldown.clear()                  # simulate a NEW process: only the persisted cooldown remains
    models_called.clear()
    run_task("ping", {"word": "b"}, settings=s, client=client)
    assert models_called == ["openai/gpt-oss-20b"]          # gemini models skipped without any request at all
    assert store.cooldown_until(s.llm_db_path, "gemini", "gemini-3.5-flash-lite")[1] == "daily free-tier quota used up"


def test_pdf_tasks_can_fall_back_to_flash_lite(tmp_path):
    from app.llm.config import load_config
    chain = load_config(BACKEND_DIR / "config" / "models.yaml").tiers["T2"]
    assert [r.model for r in chain if r.provider == "gemini"][-2:] == ["gemini-3.5-flash-lite", "gemini-3.1-flash-lite"]
