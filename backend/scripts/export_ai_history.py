"""Export the AI build history as readable, scrubbed Markdown for the submission (docs/ai-history/transcripts/).

  uv run python -m scripts.export_ai_history --claude <session.jsonl> --antigravity <transcript.jsonl> [--artifacts <dir>] --out ../docs/ai-history/transcripts

What is kept: the human prompts and the assistant's written replies (Claude Code), the human requests plus a digest of the agent's
activity (Antigravity). What is dropped: images, hidden reasoning, raw tool output, system boilerplate. Everything that is kept goes
through `scrub()`: API keys, e-mail addresses, IP addresses and the local user name are removed (AGENTS.md rule 10).
"""
from __future__ import annotations

import argparse
import ast
import json
import re
import shutil
from collections import Counter, defaultdict
from datetime import datetime, timedelta, timezone
from pathlib import Path

IST = timezone(timedelta(hours=5, minutes=30))
MAX_USER, MAX_ASSISTANT, MAX_PASTE = 6000, 6000, 2500

SECRETS = [
    (re.compile(r"AIza[0-9A-Za-z_\-]{20,}"), "<redacted-key>"),
    (re.compile(r"gsk_[0-9A-Za-z]{20,}"), "<redacted-key>"),
    (re.compile(r"sk-or-v1-[0-9a-fA-F]{20,}"), "<redacted-key>"),
    (re.compile(r"\b(?:sk|pk|rk)-[A-Za-z0-9_\-]{24,}"), "<redacted-key>"),
    (re.compile(r"\bgh[pousr]_[A-Za-z0-9]{20,}"), "<redacted-token>"),
    (re.compile(r"\bhf_[A-Za-z0-9]{20,}"), "<redacted-token>"),
    (re.compile(r"(?i)\b(Bearer)\s+[A-Za-z0-9._\-]{20,}"), r"\1 <redacted-token>"),
    (re.compile(r"(?im)^(\s*(?:export\s+)?[A-Z0-9_]*(?:API_KEY|SECRET|TOKEN|PASSWORD)[A-Z0-9_]*\s*=\s*)\S+"), r"\1<redacted>"),
    (re.compile(r"(?i)\b(api[_-]?key|secret|token|password)\b(\s*[:=]\s*)['\"]?[A-Za-z0-9_\-]{24,}['\"]?"), r"\1\2<redacted>"),
    (re.compile(r"[\w.+\-]+@[\w\-]+\.[\w.\-]+"), "<email>"),
    (re.compile(r"\b(?:\d{1,3}\.){3}\d{1,3}\b"), "<ip>"),
    (re.compile(r"(?i)(?:[A-Z]:)?[\\/]+(?:c[\\/]+)?Users[\\/]+shind\b"), "~"),
    (re.compile(r"(?i)shind(?!ekar)\w*"), "<user>"),
]
NOISE_TAGS = re.compile(r"<(system-reminder|ide_selection|ide_opened_file|task-notification|local-command-\w+|command-\w+"
                        r"|ADDITIONAL_METADATA|USER_SETTINGS_CHANGE|EPHEMERAL_MESSAGE)[^>]*>.*?</\1>", re.DOTALL)
PASTE = re.compile(r"<pasted_content id=\"[^\"]*\">(.*?)</pasted_content id=\"[^\"]*\">", re.DOTALL)


def scrub(text: str) -> str:
    for pattern, repl in SECRETS:
        text = pattern.sub(repl, text)
    return text


def clip(text: str, limit: int) -> str:
    return text if len(text) <= limit else text[:limit].rstrip() + f"\n\n[... {len(text) - limit} more characters omitted ...]"


def when(stamp: str) -> datetime:
    return datetime.fromisoformat(stamp).astimezone(IST)


def clean_user(text: str) -> str:
    text = PASTE.sub(lambda m: "\n> [pasted from another tool]\n> " + clip(m.group(1).strip(), MAX_PASTE).replace("\n", "\n> "), text)
    text = NOISE_TAGS.sub("", text).strip()
    return text


def skip_user(text: str) -> bool:
    return (not text or text.startswith(("This session is being continued", "Caveat:", "<command-", "<local-command", "[Request interrupted")))


# ───────────────────────────── Claude Code ─────────────────────────────
def export_claude(src: Path, out: Path) -> dict:
    days: dict[str, list[str]] = defaultdict(list)
    counts = Counter()
    pending_tools: Counter = Counter()
    last_assistant = ""

    def flush_tools(day: str) -> None:
        if pending_tools:
            days[day].append("_Tools used: " + ", ".join(f"{k}×{v}" for k, v in pending_tools.most_common(8)) + "_\n")
            pending_tools.clear()

    cur_day = ""
    for line in src.read_text("utf-8").splitlines():
        try:
            row = json.loads(line)
        except json.JSONDecodeError:
            continue
        if row.get("type") not in ("user", "assistant") or row.get("isSidechain") or row.get("isMeta"):
            continue
        msg = row.get("message") or {}
        content = msg.get("content")
        stamp = row.get("timestamp")
        if not stamp:
            continue
        t = when(stamp)
        day = t.strftime("%Y-%m-%d")
        if row["type"] == "user":
            parts = [content] if isinstance(content, str) else [b.get("text", "") for b in (content or []) if isinstance(b, dict) and b.get("type") == "text"]
            text = clean_user("\n\n".join(p for p in parts if p))
            if skip_user(text):
                continue
            flush_tools(cur_day or day)
            cur_day = day
            days[day].append(f"### {t:%H:%M} IST · You\n\n{scrub(clip(text, MAX_USER))}\n")
            counts["user"] += 1
        else:
            blocks = content if isinstance(content, list) else []
            for b in blocks:
                if b.get("type") == "tool_use":
                    pending_tools[b.get("name", "tool")] += 1
            text = "\n\n".join(b.get("text", "") for b in blocks if b.get("type") == "text").strip()
            if text and text != last_assistant:
                flush_tools(day)
                cur_day = day
                days[day].append(f"### {t:%H:%M} IST · Claude Code\n\n{scrub(clip(text, MAX_ASSISTANT))}\n")
                counts["assistant"] += 1
                last_assistant = text
    flush_tools(cur_day or "")
    out.mkdir(parents=True, exist_ok=True)
    for day, parts in sorted(days.items()):
        if not day:
            continue
        head = (f"# Claude Code session log, {day}\n\nHuman prompts and the assistant's written replies, in order (IST). Raw tool output, images and hidden reasoning are "
                "omitted; secrets, e-mail addresses, IPs and the local user name are scrubbed. A line like _Tools used: Bash×3_ marks work done between messages.\n\n")
        (out / f"claude-code-{day}.md").write_text(head + "\n".join(parts), "utf-8")
    return dict(counts, days=len(days))


# ───────────────────────────── Antigravity ─────────────────────────────
def tool_calls(raw) -> list[dict]:
    if isinstance(raw, str):
        try:
            raw = json.loads(raw)
        except json.JSONDecodeError:
            try:
                raw = ast.literal_eval(raw)
            except (ValueError, SyntaxError):
                return []
    return [c for c in raw if isinstance(c, dict)] if isinstance(raw, list) else []


def export_antigravity(src: Path, out: Path) -> dict:
    sections: list[dict] = []
    for line in src.read_text("utf-8").splitlines():
        try:
            row = json.loads(line)
        except json.JSONDecodeError:
            continue
        kind = row.get("type")
        if kind == "USER_INPUT":
            text = re.sub(r"</?USER_REQUEST>", "", str(row.get("content", ""))).strip()
            sections.append({"t": row.get("created_at"), "text": text, "tools": Counter(), "files": [], "steps": 0})
        elif kind == "PLANNER_RESPONSE" and sections:
            s = sections[-1]
            s["steps"] += 1
            for call in tool_calls(row.get("tool_calls")):
                name = call.get("name", "tool")
                s["tools"][name] += 1
                if re.search(r"write|replace|edit|create", name, re.IGNORECASE):
                    for key, val in (call.get("args") or {}).items():
                        if re.search(r"path|file", key, re.IGNORECASE) and isinstance(val, str):
                            p = val.strip('"').replace("\\\\", "\\")
                            if p not in s["files"]:
                                s["files"].append(p)
    out.mkdir(parents=True, exist_ok=True)
    lines = ["# Antigravity session log (Gemini 3.8 Flash)\n",
             "Your requests to Antigravity in order (IST), each followed by a digest of what the agent did: steps, tools and the files it wrote or edited. "
             "Hidden reasoning and raw tool output are omitted; secrets, e-mail addresses, IPs and the local user name are scrubbed.\n"]
    for i, s in enumerate(sections, 1):
        t = when(s["t"]) if s["t"] else None
        lines.append(f"## Request {i}" + (f" · {t:%d %b %H:%M} IST" if t else "") + "\n")
        lines.append(scrub(clip(clean_user(s["text"]), MAX_USER)) + "\n")
        tools = ", ".join(f"{k}×{v}" for k, v in s["tools"].most_common(8)) or "none"
        files = s["files"][:25]
        lines.append(f"_Agent activity: {s['steps']} steps · tools: {tools}_\n")
        if files:
            lines.append("_Files written or edited:_ " + ", ".join(f"`{scrub(f)}`" for f in files) + (f" … (+{len(s['files']) - 25} more)" if len(s["files"]) > 25 else "") + "\n")
    (out / "antigravity.md").write_text("\n".join(lines), "utf-8")
    return {"requests": len(sections)}


def copy_artifacts(src: Path, out: Path) -> int:
    n = 0
    for f in sorted(src.glob("*.md")):
        (out / f"antigravity-{f.name}").write_text(scrub(f.read_text("utf-8")), "utf-8")
        n += 1
    return n


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--claude", type=Path)
    ap.add_argument("--antigravity", type=Path)
    ap.add_argument("--artifacts", type=Path, help="folder with Antigravity's own *.md verification reports")
    ap.add_argument("--out", type=Path, required=True)
    a = ap.parse_args()
    if a.out.exists():
        shutil.rmtree(a.out)
    a.out.mkdir(parents=True)
    if a.claude:
        print("claude-code:", export_claude(a.claude, a.out))
    if a.antigravity:
        print("antigravity:", export_antigravity(a.antigravity, a.out))
    if a.artifacts:
        print("antigravity artifacts copied:", copy_artifacts(a.artifacts, a.out))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
