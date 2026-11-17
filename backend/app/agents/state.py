from typing import Any, TypedDict


class SwarmState(TypedDict):
    problem_id: str
    problem_title: str
    problem_description: str
    code_snippet: str | None
    logs: str | None
    language: str
    agent_count: int

    # Qdrant Vector RAG
    rag_context: str | None
    document_name: str | None

    current_iteration: int
    max_iterations: int

    # Roster & Workers State (Tech Lead's knowledge base)
    active_workers: list[dict[str, Any]]
    worker_reports: list[dict[str, Any]]

    # Tech Lead State
    tech_lead_analysis: str
    tech_lead_instructions: dict[str, str]
    tech_lead_critique: str | None
    needs_correction: bool
    correction_target: str | None

    # Final resolution
    final_patch: str | None
    final_explanation: str | None
    qa_verification: str | None
    quality_score: float
    is_resolved: bool

    # Observability & Metrics
    total_tokens: int
    prompt_tokens: int
    completion_tokens: int
    total_cost: float
    duration_ms: int
    langsmith_run_id: str | None

    # Event logs streamable to frontend
    event_logs: list[dict[str, Any]]
    evaluations: list[dict[str, Any]]
