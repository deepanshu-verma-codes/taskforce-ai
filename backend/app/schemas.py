import os
import re
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator


def sanitize_text_input(v: str | None) -> str | None:
    if not v:
        return v
    # 1. Strip raw <script>...</script> tags and contents
    v = re.sub(r"<script[\s\S]*?>[\s\S]*?</script>", "", v, flags=re.IGNORECASE)
    # 2. Strip dangerous tags: iframe, object, embed, applet, style
    v = re.sub(
        r"<(iframe|object|embed|applet|style)[\s\S]*?>[\s\S]*?</\1>", "", v, flags=re.IGNORECASE
    )
    # 3. Strip standalone opening/closing tags of hazardous elements
    v = re.sub(r"</?(script|iframe|object|embed|applet|style)[^>]*>", "", v, flags=re.IGNORECASE)
    # 4. Neutralize inline event handlers: onerror=, onload=, onclick=, onmouseover=
    v = re.sub(r"\bon\w+\s*=\s*['\"][^'\"]*['\"]", "", v, flags=re.IGNORECASE)
    v = re.sub(r"\bon\w+\s*=\s*[^\s>]+", "", v, flags=re.IGNORECASE)
    # 5. Neutralize dangerous javascript: pseudoprotocol URLs
    v = re.sub(r"javascript:\s*", "", v, flags=re.IGNORECASE)
    return v.strip()


def sanitize_filename(v: str | None) -> str | None:
    if not v:
        return v
    # Prevent directory traversal attacks
    base = os.path.basename(v)
    # Allow alphanumeric, hyphens, underscores, dots, and spaces
    clean = re.sub(r"[^a-zA-Z0-9_\-\. ]", "", base).strip()
    return clean or "document"


class ProblemCreate(BaseModel):
    title: str = Field(..., min_length=3, description="Summary title of the technical issue")
    description: str = Field(..., description="Detailed description of the bug or requirement")
    code_snippet: str | None = Field(
        None, description="Failing source code, script, or architecture"
    )
    logs: str | None = Field(None, description="Error stack trace, logs, or test failure output")
    language: str | None = Field("python", description="Target programming language")
    agent_count: int | None = Field(
        3, ge=1, le=5, description="Number of swarm agents to assign (1 to 5)"
    )
    # Document upload & RAG context
    document_name: str | None = Field(None, description="Name of uploaded context doc or PDF")
    document_text: str | None = Field(None, description="Raw extracted text of uploaded document")

    @field_validator("title", "description", mode="after")
    @classmethod
    def validate_and_sanitize_text(cls, v: str) -> str:
        sanitized = sanitize_text_input(v)
        if not sanitized or len(sanitized) < 2:
            raise ValueError("Input text contains invalid or malicious content.")
        return sanitized

    @field_validator("document_name", mode="after")
    @classmethod
    def validate_and_sanitize_doc_name(cls, v: str | None) -> str | None:
        if v is None:
            return None
        return sanitize_filename(v)


class DocumentUploadResponse(BaseModel):
    filename: str
    extracted_text: str
    char_count: int
    word_count: int
    pages_count: int
    preview_chunks: list[str]


class RagChunkItem(BaseModel):
    chunk_id: int
    text: str
    char_count: int
    filename: str | None = None
    score: float | None = None


class ProblemRagChunksResponse(BaseModel):
    problem_id: str
    document_name: str | None = None
    total_chunks: int
    chunks: list[RagChunkItem]


class AgentRunResponse(BaseModel):
    id: str
    agent_name: str
    agent_role: str
    status: str
    iteration: int
    input_summary: str | None = None
    output_content: str | None = None
    lead_feedback: str | None = None
    tokens_used: int
    cost: float
    latency_ms: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AgentLogResponse(BaseModel):
    id: str
    problem_id: str
    agent_name: str
    event_type: str
    message: str
    metadata_json: str | None = None
    timestamp: datetime

    model_config = ConfigDict(from_attributes=True)


class EvaluationResponse(BaseModel):
    id: str
    metric_name: str
    score: float
    rationale: str | None = None
    timestamp: datetime

    model_config = ConfigDict(from_attributes=True)


class UserRegisterRequest(BaseModel):
    username: str = Field(
        ...,
        min_length=3,
        max_length=50,
        pattern=r"^[a-zA-Z0-9_-]+$",
        description="Unique username containing letters, numbers, underscores, and hyphens",
    )
    name: str = Field(..., min_length=1, max_length=100, description="Display name of user")
    password: str = Field(..., min_length=6, max_length=128, description="User password")

    @field_validator("name", mode="after")
    @classmethod
    def validate_name(cls, v: str) -> str:
        clean = sanitize_text_input(v)
        if not clean:
            raise ValueError("Name cannot be empty")
        return clean


class UserLoginRequest(BaseModel):
    username: str = Field(..., description="Username")
    password: str = Field(..., description="Password")


class UsernameCheckResponse(BaseModel):
    available: bool = Field(..., description="True if the username is free to register")
    username: str = Field(..., description="Normalized username checked")
    message: str = Field(..., description="Status explanation or validation feedback")
    suggestions: list[str] = Field(
        default_factory=list, description="Available alternative suggestions if taken"
    )


class UserResponse(BaseModel):
    id: str
    username: str
    name: str
    created_at: datetime
    is_vip: int = 0
    vip_granted_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)


class ProblemResponse(BaseModel):
    id: str
    user_id: str | None = None
    title: str
    description: str
    code_snippet: str | None = None
    logs: str | None = None
    language: str
    document_name: str | None = None
    has_rag: int | None = 0
    rag_chunks_count: int | None = 0
    agent_count: int
    status: str
    tech_lead_verdict: str | None = None
    solution_patch: str | None = None
    solution_explanation: str | None = None
    verification_report: str | None = None
    quality_score: float
    total_tokens: int
    prompt_tokens: int
    completion_tokens: int
    total_cost: float
    duration_ms: int
    langsmith_run_id: str | None = None
    created_at: datetime
    updated_at: datetime
    agent_runs: list[AgentRunResponse] | None = []
    evaluations: list[EvaluationResponse] | None = []

    model_config = ConfigDict(from_attributes=True)


class DashboardStatsResponse(BaseModel):
    total_problems: int
    resolved_problems: int
    in_progress_problems: int
    total_tokens_consumed: int
    total_estimated_cost: float
    avg_resolution_time_ms: float
    active_worker_agents: int
    tech_lead_interventions_count: int


# ============================================================================
# Game & Tic-Tac-Toe Autonomous Arena Schemas
# ============================================================================


class GameAgentProfile(BaseModel):
    name: str
    specialization: str
    tagline: str
    difficulty_tendency: str
    avatar_color: str
    offense: int = Field(..., ge=1, le=100)
    defense: int = Field(..., ge=1, le=100)
    foresight: int = Field(..., ge=1, le=100)
    opening_quote: str


class GameMoveRequest(BaseModel):
    board: list[str] = Field(
        ...,
        min_length=9,
        max_length=9,
        description="9-cell board state containing '', 'X', or 'O'",
    )
    agent_name: str = Field(default="Marcus Vance", description="Name of the opponent agent")
    difficulty: str = Field(
        default="medium", description="Difficulty level: 'easy', 'medium', or 'hard'"
    )
    player_symbol: str = Field(default="X", description="Player symbol: 'X' or 'O'")
    last_move: int | None = Field(
        default=None, ge=0, le=8, description="Last move made by player (0-8)"
    )
    match_id: str | None = Field(
        default=None, description="Unique client session ID for the current match"
    )

    @field_validator("board")
    @classmethod
    def validate_board(cls, v: list[str]) -> list[str]:
        if len(v) != 9:
            raise ValueError("Board must contain exactly 9 cells")
        for idx, cell in enumerate(v):
            if cell not in ("", "X", "O"):
                raise ValueError(f"Cell at index {idx} must be '', 'X', or 'O'")
        return v

    @field_validator("player_symbol")
    @classmethod
    def validate_player_symbol(cls, v: str) -> str:
        v_upper = v.upper()
        if v_upper not in ("X", "O"):
            raise ValueError("player_symbol must be 'X' or 'O'")
        return v_upper

    @field_validator("difficulty")
    @classmethod
    def validate_difficulty(cls, v: str) -> str:
        v_lower = v.lower()
        if v_lower not in ("easy", "medium", "hard"):
            raise ValueError("difficulty must be 'easy', 'medium', or 'hard'")
        return v_lower


class GameMoveResponse(BaseModel):
    agent_move: int = Field(..., ge=0, le=8)
    agent_name: str
    commentary: str
    tactical_insight: str
    status: str = Field(..., description="'in_progress', 'agent_won', 'player_won', 'draw'")
    winning_line: list[int] | None = None


class QuotaStatusResponse(BaseModel):
    action: str = Field(..., description="'game' or 'problem'")
    used_today: int
    daily_limit: int
    remaining_today: int
    is_exempt: bool
    username: str | None = None
    resets_at: str
    message: str


class VipRedeemRequest(BaseModel):
    code: str = Field(..., min_length=2, max_length=64, description="VIP access code to redeem")


class VipUpdateCodeRequest(BaseModel):
    new_code: str = Field(..., min_length=3, max_length=64, description="New VIP access code")


class VipRevokeRequest(BaseModel):
    username: str = Field(..., description="Target username to revoke VIP privileges from")


class VipUserItem(BaseModel):
    id: str
    username: str
    name: str
    vip_granted_at: datetime | None = None


class VipStatusResponse(BaseModel):
    is_vip: bool
    is_owner: bool
    active_code: str | None = None
    vip_users: list[VipUserItem] | None = None


