"""In-app LLM access. Feature code imports ONLY `run_task` from here."""
from app.llm.router import LLMUnavailable, run_task

__all__ = ["LLMUnavailable", "run_task"]
