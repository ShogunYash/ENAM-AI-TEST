"""Hermetic test environment: route tests must never depend on the developer's real finn.sqlite / LLM ledger."""
import os
import tempfile

_TMP = tempfile.mkdtemp(prefix="finn-test-")
os.environ["FINN_DATA_DIR"] = _TMP   # read by AppSettings at first get_settings() call (env beats .env)
