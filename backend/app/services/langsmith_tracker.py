import uuid
from typing import Any

from app.config import settings

try:
    from langsmith import Client

    _has_langsmith = True
except ImportError:
    _has_langsmith = False


def get_langsmith_client() -> Any | None:
    api_key = settings.LANGSMITH_API_KEY or settings.LANGCHAIN_API_KEY
    if _has_langsmith and api_key:
        try:
            return Client(api_key=api_key, api_url=settings.LANGSMITH_ENDPOINT)
        except Exception:
            return None
    return None


def create_trace_run(
    name: str,
    inputs: dict[str, Any],
    project_name: str | None = None,
    extra_metadata: dict[str, Any] | None = None,
    extra_tags: list[str] | None = None,
) -> str:
    run_id = str(uuid.uuid4())
    client = get_langsmith_client()
    if client:
        try:
            meta = {
                "agent_id": settings.LANGSMITH_AGENT_ID,
                "environment": settings.LANGSMITH_AGENT_ENVIRONMENT,
                **(extra_metadata or {}),
            }
            tags = [
                settings.LANGSMITH_AGENT_ID,
                settings.LANGSMITH_AGENT_ENVIRONMENT,
                *(extra_tags or []),
            ]
            client.create_run(
                id=run_id,
                name=name,
                run_type="chain",
                inputs=inputs,
                project_name=None
                if settings.LANGSMITH_AGENT_ID
                else (project_name or settings.LANGSMITH_PROJECT),
                extra={"metadata": meta},
                tags=tags,
            )
        except Exception as e:
            print(f"[LangSmith] Trace run creation warning: {e}")
    return run_id


def log_evaluation_feedback(run_id: str, key: str, score: float, comment: str | None = None):
    client = get_langsmith_client()
    if client and run_id:
        try:
            client.create_feedback(run_id=run_id, key=key, score=score, comment=comment or "")
        except Exception as e:
            print(f"[LangSmith] Feedback warning: {e}")
