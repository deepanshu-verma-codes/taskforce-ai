import asyncio
import json
import os
import re
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager
from typing import Annotated

from fastapi import (
    Depends,
    FastAPI,
    File,
    HTTPException,
    Query,
    Request,
    Response,
    UploadFile,
    status,
)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db, init_db
from app.middleware import RateLimiterMiddleware, SecurityHeadersMiddleware
from app.models import User
from app.schemas import (
    AgentLogResponse,
    DashboardStatsResponse,
    DocumentUploadResponse,
    GameAgentProfile,
    GameMoveRequest,
    GameMoveResponse,
    ProblemCreate,
    ProblemRagChunksResponse,
    ProblemResponse,
    QuotaStatusResponse,
    RagChunkItem,
    UserLoginRequest,
    UsernameCheckResponse,
    UserRegisterRequest,
    UserResponse,
    VipRedeemRequest,
    VipRevokeRequest,
    VipStatusResponse,
    VipUpdateCodeRequest,
    sanitize_filename,
)
from app.services import (
    auth_service,
    game_service,
    problem_service,
    quota_service,
    rag_service,
    vip_service,
)

DbSession = Annotated[AsyncSession, Depends(get_db)]


async def get_current_user_optional(
    request: Request,
    db: DbSession,
) -> User | None:
    """Extract authenticated user from HttpOnly access_token cookie or Bearer header."""
    token = request.cookies.get("access_token")
    if not token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header[7:].strip()

    if not token:
        return None

    try:
        payload = auth_service.verify_token(token, expected_type="access")
        user_id = payload.get("sub")
        if not user_id:
            return None
        return await auth_service.get_user_by_id(db, user_id)
    except Exception:
        return None


async def get_current_user(
    current_user: Annotated[User | None, Depends(get_current_user_optional)],
) -> User:
    """Enforces authentication. Rejects unauthenticated requests with 401 Unauthorized."""
    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please log in.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return current_user


CurrentUser = Annotated[User, Depends(get_current_user)]
OptionalUser = Annotated[User | None, Depends(get_current_user_optional)]


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize SQLite database schema
    await init_db()
    yield


app = FastAPI(
    title=settings.APP_NAME,
    description="FDE Autonomous Swarm Resolution Engine with Tech Lead Orchestration & LangSmith Observability",
    version="1.0.0",
    lifespan=lifespan,
)

# Enterprise Security Headers & Rate Limiting
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(RateLimiterMiddleware)

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)


@app.exception_handler(HTTPException)
async def custom_http_exception_handler(request: Request, exc: HTTPException):
    """Formats HTTPException into consistent JSON, preserving structured fields like suggestions."""
    if isinstance(exc.detail, dict):
        message = exc.detail.get("message") or exc.detail.get("detail") or "Request failed"
        content = {
            "detail": message,
            **exc.detail,
        }
        return JSONResponse(status_code=exc.status_code, content=content, headers=exc.headers)
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": str(exc.detail)},
        headers=exc.headers,
    )


@app.get("/api/health")
async def health_check():
    return {
        "status": "healthy",
        "app_name": settings.APP_NAME,
        "langsmith_configured": bool(settings.LANGSMITH_API_KEY or settings.LANGCHAIN_API_KEY),
        "langsmith_endpoint": settings.LANGSMITH_ENDPOINT,
        "langsmith_agent_id": settings.LANGSMITH_AGENT_ID,
        "langsmith_agent_environment": settings.LANGSMITH_AGENT_ENVIRONMENT,
        "openai_configured": bool(settings.OPENAI_API_KEY),
        "gemini_configured": bool(settings.GEMINI_API_KEY or settings.GOOGLE_API_KEY),
    }


# ============================================================================
# Authentication & Multi-Tenant User Management
# ============================================================================


@app.get("/api/auth/check-username", response_model=UsernameCheckResponse)
async def check_username(
    db: DbSession,
    username: str = Query(..., min_length=1, max_length=50),
    name: str | None = Query(None, max_length=100),
):
    """Checks real-time availability of a username. If taken, returns intelligent

    Gmail-style alternative suggestions based on user input.
    """
    clean_username = username.strip().lower()
    if len(clean_username) < 3:
        return UsernameCheckResponse(
            available=False,
            username=clean_username,
            message="Username must be at least 3 characters.",
            suggestions=[],
        )

    if not re.match(r"^[a-zA-Z0-9_-]+$", clean_username):
        return UsernameCheckResponse(
            available=False,
            username=clean_username,
            message="Letters, numbers, underscores, and hyphens only.",
            suggestions=[],
        )

    existing = await auth_service.get_user_by_username(db, clean_username)
    if existing:
        suggestions = await auth_service.generate_username_suggestions(db, clean_username, name)
        return UsernameCheckResponse(
            available=False,
            username=clean_username,
            message="That username is taken. Try another.",
            suggestions=suggestions,
        )

    return UsernameCheckResponse(
        available=True,
        username=clean_username,
        message="Username is available!",
        suggestions=[],
    )


@app.post("/api/auth/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(req: UserRegisterRequest, response: Response, db: DbSession):
    """Registers a new user with unique username and sets secure HttpOnly session cookies."""
    user = await auth_service.register_user(db, req)
    access_token = auth_service.create_access_token(user.id, user.username)
    refresh_token = auth_service.create_refresh_token(user.id)
    auth_service.set_auth_cookies(response, access_token, refresh_token)
    return user


@app.post("/api/auth/login", response_model=UserResponse)
async def login(req: UserLoginRequest, response: Response, db: DbSession):
    """Authenticates credentials and establishes secure HttpOnly session cookies."""
    user = await auth_service.authenticate_user(db, req.username, req.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password. Please try again.",
        )
    access_token = auth_service.create_access_token(user.id, user.username)
    refresh_token = auth_service.create_refresh_token(user.id)
    auth_service.set_auth_cookies(response, access_token, refresh_token)
    return user


@app.post("/api/auth/refresh", response_model=UserResponse)
async def refresh_session(request: Request, response: Response, db: DbSession):
    """Reads HttpOnly refresh token cookie and issues a fresh short-lived access token."""
    refresh_token = request.cookies.get("refresh_token")
    if not refresh_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token missing. Please log in again.",
        )

    try:
        payload = auth_service.verify_token(refresh_token, expected_type="refresh")
    except Exception as exc:
        auth_service.clear_auth_cookies(response)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token. Please log in again.",
        ) from exc

    user_id = payload.get("sub")
    if not user_id:
        auth_service.clear_auth_cookies(response)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Malformed token payload.",
        )

    user = await auth_service.get_user_by_id(db, user_id)
    if not user:
        auth_service.clear_auth_cookies(response)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account no longer exists.",
        )

    new_access_token = auth_service.create_access_token(user.id, user.username)
    auth_service.set_auth_cookies(response, new_access_token)
    return user


@app.post("/api/auth/logout")
async def logout(response: Response):
    """Clears HttpOnly access and refresh session cookies."""
    auth_service.clear_auth_cookies(response)
    return {"message": "Logged out successfully"}


@app.get("/api/auth/me", response_model=UserResponse)
async def get_current_user_profile(current_user: CurrentUser):
    """Returns profile for currently authenticated user."""
    return current_user


# ============================================================================
# VIP Unlimited Pass & Access Code Endpoints
# ============================================================================


@app.get("/api/vip/status", response_model=VipStatusResponse)
async def get_vip_status(db: DbSession, current_user: CurrentUser):
    """Returns VIP status for current user, including administrative oversight for deepanshu_verma."""
    return await vip_service.get_vip_status(db, current_user)


@app.post("/api/vip/redeem")
async def redeem_vip(req: VipRedeemRequest, db: DbSession, current_user: CurrentUser):
    """Redeems a valid VIP access code to unlock VIP Unlimited status."""
    return await vip_service.redeem_vip_code(db, req.code, current_user)


@app.post("/api/vip/code")
async def update_vip_code(req: VipUpdateCodeRequest, db: DbSession, current_user: CurrentUser):
    """Updates the active VIP access code. Strictly restricted to owner deepanshu_verma."""
    updated = await vip_service.update_vip_code(db, req.new_code, current_user)
    return {"message": "VIP access code updated successfully", "active_code": updated}


@app.post("/api/vip/revoke")
async def revoke_vip(req: VipRevokeRequest, db: DbSession, current_user: CurrentUser):
    """Revokes VIP Unlimited status from a user. Strictly restricted to owner deepanshu_verma."""
    return await vip_service.revoke_vip(db, req.username, current_user)


# ============================================================================
# Autonomous Game Arena Endpoints (Tic-Tac-Toe vs Swarm Agents)
# ============================================================================


@app.get("/api/game/agents", response_model=list[GameAgentProfile])
async def list_game_agents():
    """Returns the roster of available AI agent opponents with their playstyles and stats."""
    return game_service.get_all_agents()


@app.get("/api/game/quota", response_model=QuotaStatusResponse)
async def get_game_quota(request: Request, current_user: OptionalUser):
    """Returns current daily game quota for the user or client IP. deepanshu_verma is exempt."""
    identifier = quota_service.get_client_identifier(request, current_user)
    return quota_service.get_quota_status("game", identifier, user=current_user)


@app.post("/api/game/move", response_model=GameMoveResponse)
async def play_game_move(req: GameMoveRequest, request: Request, current_user: OptionalUser):
    """Calculates the opponent agent's next move in Tic-Tac-Toe and generates live persona commentary."""
    identifier = quota_service.get_client_identifier(request, current_user)
    is_new = (req.board.count("X") + req.board.count("O")) <= 1
    quota_service.check_and_consume_game_quota(
        identifier=identifier,
        user=current_user,
        match_id=req.match_id,
        is_new_game=is_new,
    )
    board_copy = list(req.board)
    return await game_service.process_game_turn(
        board=board_copy,
        agent_name=req.agent_name,
        difficulty=req.difficulty,
        player_symbol=req.player_symbol,
        last_move=req.last_move,
    )




# ============================================================================
# Isolated Problem Floor & Observability Endpoints
# ============================================================================


@app.get("/api/stats", response_model=DashboardStatsResponse)
async def get_stats(db: DbSession, current_user: CurrentUser):
    return await problem_service.get_dashboard_stats(db, user_id=current_user.id)


@app.get("/api/problems", response_model=list[ProblemResponse])
async def list_problems(db: DbSession, current_user: CurrentUser):
    return await problem_service.get_all_problems(db, user_id=current_user.id)


@app.post("/api/upload-document", response_model=DocumentUploadResponse)
async def upload_document(file: UploadFile = File(...)):
    """Uploads a PDF, Doc, or text file, extracts content, and prepares chunks for Qdrant RAG."""
    filename = sanitize_filename(file.filename or "uploaded_document") or "uploaded_document"

    # Enforce allowed document file extensions
    allowed_extensions = {".pdf", ".txt", ".md", ".doc", ".docx", ".json", ".log", ".csv"}
    ext = os.path.splitext(filename)[1].lower()
    if ext not in allowed_extensions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file type '{ext}'. Allowed extensions: {', '.join(sorted(allowed_extensions))}",
        )

    # Limit max file size to 15MB
    content = await file.read()
    if len(content) > 15 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="File too large. Maximum size is 15MB.")

    extracted_text, pages = rag_service.extract_text_from_file(filename, content)
    if not extracted_text.strip():
        raise HTTPException(
            status_code=400,
            detail="Could not extract readable text from this file. Ensure it is not a scanned image PDF.",
        )

    chunks = rag_service.chunk_text(extracted_text)
    preview_chunks = chunks[:3]

    return DocumentUploadResponse(
        filename=filename,
        extracted_text=extracted_text,
        char_count=len(extracted_text),
        word_count=len(extracted_text.split()),
        pages_count=pages,
        preview_chunks=preview_chunks,
    )


@app.get("/api/problems/{problem_id}/rag-chunks", response_model=ProblemRagChunksResponse)
async def get_problem_rag_chunks(problem_id: str, db: DbSession, current_user: CurrentUser):
    """Retrieves all vector chunks stored in Qdrant for a given problem."""
    problem = await problem_service.get_problem_by_id(db, problem_id, user_id=current_user.id)
    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found")

    raw_chunks = rag_service.get_problem_chunks(problem_id)
    items = [
        RagChunkItem(
            chunk_id=c["chunk_id"],
            text=c["text"],
            char_count=c["char_count"],
            filename=c.get("filename"),
            score=c.get("score", 1.0),
        )
        for c in raw_chunks
    ]

    return ProblemRagChunksResponse(
        problem_id=problem_id,
        document_name=problem.document_name,
        total_chunks=len(items),
        chunks=items,
    )


@app.post("/api/problems", response_model=ProblemResponse, status_code=status.HTTP_201_CREATED)
async def create_new_problem(data: ProblemCreate, db: DbSession, current_user: CurrentUser):
    return await problem_service.create_problem(db, data, user_id=current_user.id)


@app.post("/api/problems/reset-all")
async def reset_all_problems(db: DbSession, current_user: CurrentUser):
    """Resets all problems for the authenticated user to PENDING, purging runs, logs, and scorecards."""
    count = await problem_service.reset_all_problems_to_pending(db, user_id=current_user.id)
    return {"message": f"Successfully reset {count} problems to PENDING", "count": count}


@app.get("/api/problems/quota", response_model=QuotaStatusResponse)
async def get_problem_quota(request: Request, current_user: OptionalUser):
    """Returns current daily problem solve quota for the user or client IP. deepanshu_verma is exempt."""
    identifier = quota_service.get_client_identifier(request, current_user)
    return quota_service.get_quota_status("problem", identifier, user=current_user)


@app.get("/api/problems/{problem_id}", response_model=ProblemResponse)
async def get_problem(problem_id: str, db: DbSession, current_user: CurrentUser):
    problem = await problem_service.get_problem_by_id(db, problem_id, user_id=current_user.id)
    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found")
    return problem


@app.get("/api/problems/{problem_id}/logs", response_model=list[AgentLogResponse])
async def get_logs(problem_id: str, db: DbSession, current_user: CurrentUser):
    return await problem_service.get_problem_logs(db, problem_id, user_id=current_user.id)


@app.post("/api/problems/{problem_id}/solve", response_model=ProblemResponse)
async def solve_problem(
    problem_id: str, request: Request, db: DbSession, current_user: CurrentUser
):
    identifier = quota_service.get_client_identifier(request, current_user)
    quota_service.check_and_consume_problem_quota(identifier=identifier, user=current_user)
    problem = await problem_service.solve_problem_with_swarm(
        db, problem_id, user_id=current_user.id
    )
    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found")
    return problem


@app.delete("/api/problems/{problem_id}")
async def delete_problem(problem_id: str, db: DbSession, current_user: CurrentUser):
    success = await problem_service.delete_problem(db, problem_id, user_id=current_user.id)
    if not success:
        raise HTTPException(status_code=404, detail="Problem not found or permission denied")
    return {"message": "Problem deleted successfully", "id": problem_id}


@app.get("/api/problems/{problem_id}/stream")
async def stream_problem_events(problem_id: str, db: DbSession, current_user: CurrentUser):
    """Server-Sent Events endpoint streaming agent logs and status in real-time."""

    async def event_generator() -> AsyncGenerator[str, None]:
        last_log_count = 0
        while True:
            problem = await problem_service.get_problem_by_id(
                db, problem_id, user_id=current_user.id
            )
            if not problem:
                yield f"data: {json.dumps({'error': 'Problem not found'})}\n\n"
                break

            logs = await problem_service.get_problem_logs(db, problem_id, user_id=current_user.id)
            if len(logs) > last_log_count:
                new_logs = logs[last_log_count:]
                last_log_count = len(logs)
                for log in new_logs:
                    data = {
                        "type": "log",
                        "agent_name": log.agent_name,
                        "event_type": log.event_type,
                        "message": log.message,
                        "timestamp": log.timestamp.isoformat(),
                    }
                    yield f"data: {json.dumps(data)}\n\n"

            status_payload = {
                "type": "status_update",
                "status": problem.status,
                "total_tokens": problem.total_tokens,
                "total_cost": problem.total_cost,
                "duration_ms": problem.duration_ms,
                "quality_score": problem.quality_score,
                "tech_lead_verdict": problem.tech_lead_verdict,
            }
            yield f"data: {json.dumps(status_payload)}\n\n"

            if problem.status in ["RESOLVED", "COMPLETED", "FAILED"]:
                break

            await asyncio.sleep(1.0)

    return StreamingResponse(event_generator(), media_type="text/event-stream")


def start() -> None:
    """CLI entrypoint for `uv run server`."""
    import uvicorn

    uvicorn.run("app.main:app", host=settings.HOST, port=settings.PORT, reload=settings.DEBUG)


if __name__ == "__main__":
    start()
