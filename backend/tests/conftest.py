"""Hermetic test environment: route tests must never depend on the developer's real finn.sqlite / LLM ledger."""
import os
import tempfile

_TMP = tempfile.mkdtemp(prefix="finn-test-")
os.environ["FINN_DATA_DIR"] = _TMP   # read by AppSettings at first get_settings() call (env beats .env)
os.environ["FINN_USE_LOCAL_LLM"] = "0"   # tests never talk to the station
os.environ["FINN_SEED"] = "0"            # tests never restore the committed demo seed
