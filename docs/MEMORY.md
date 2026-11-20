# MEMORY.md — Platform Conventions, Architectural Invariants & Memory

> **Platform:** Taskforce (`Taskforce.ai`)  
> **Status:** Canonical Working Memory  
> **Target Audience:** All AI Agents, Autonomous Subagents, Core Engineers  

---

## 1. Prime Architectural Memory & Non-Negotiable Invariants

1. **Tooling & Environment:**
   - **Always use `uv`:** Never run `pip install` or invoke global python. All python execution is through `uv run ...` or `uv add ...`.
   - **Virtualenv Entrypoint:** The backend server is launched via `uv run server` (mapped to `app.main:start` in `pyproject.toml`).
   - **Modern Python Typing:** Strictly Python 3.12 syntax (`dict`, `list`, `X | None`, `Annotated[T, Depends(...)]`). Never use legacy `typing.Dict` or `param: T = Depends(...)`.

2. **Clean Persona Naming (Zero Parenthetical Roles):**
   - Agent names must appear in all UI components, badges, and headers strictly as:
     - `Marcus Vance` (NOT `Marcus Vance (Team Lead)`)
     - `Elena Rostova` (NOT `Elena Rostova (Diagnostics)`)
     - `David Park` (NOT `David Park (Solutions)`)
     - `Maya Patel` (NOT `Maya Patel (QA)`)
     - `James Thorne` (NOT `James Thorne (Security)`)
     - `Sarah Chen` (NOT `Sarah Chen (Architect)`)

3. **Multi-Domain Empathy & Zero-Code Invariant:**
   - When a user submits an emotional, medical, or life advice problem (e.g. heartbreak, grief, physical pain), the swarm is **strictly forbidden** from generating code snippets or programming functions.
   - Marcus Vance automatically rejects code in non-technical inquiries during the self-healing critique loop.

4. **Database Async Integrity:**
   - Always specify `lazy="selectin"` on SQLAlchemy relationships in `models.py` to prevent greenlet context switching errors (`MissingGreenlet`).
   - Always use parameterized ORM queries. Never construct raw SQL strings with Python f-strings.

5. **Token Compression & Groq TPM Ceilings:**
   - Groq free tier has an 8,000 Token-Per-Minute limit.
   - Prompts passed to downstream agents must summarize prior worker context into concise excerpts (<180 chars) to keep total swarm execution under 2,500 tokens.

6. **Authentication & Tenant Isolation:**
   - User sessions are governed by `access_token` (15m) and `refresh_token` (7d) stored in secure `HttpOnly` cookies.
   - Every problem query must enforce `Problem.user_id == current_user.id`.

7. **VIP Exemption & Owner Immunity:**
   - User `deepanshu_verma` (and `deepanshu-verma`) is hardcoded in `QUOTA_EXEMPT_USERNAMES`.
   - The owner is permanently exempt from daily quotas (999,999 remaining) and cannot be revoked.
   - Active dynamic VIP access code is persisted in SQLite table `system_settings` under key `vip_access_code`.

8. **Qdrant Vector Database Resilience:**
   - Ingestion connects to Qdrant Cloud when `QDRANT_CLUSTER_URL` is available.
   - If offline or during sandboxed automated testing, client automatically verifies connectivity and falls back to local storage (`./qdrant_storage`) or `:memory:` with zero crashes.

---

## 2. Key System Paths & File Mapping

- **Backend Configuration:** `backend/app/config.py`
- **LangGraph Swarm State & Orchestration:** `backend/app/agents/graph.py` & `tech_lead.py`
- **Agent System Prompts & Logic:** `backend/app/agents/workers.py`
- **Qdrant Cloud RAG Service:** `backend/app/services/rag_service.py`
- **VIP & Quota Engines:** `backend/app/services/vip_service.py` & `quota_service.py`
- **Tic-Tac-Toe Service:** `backend/app/services/game_service.py`
- **Frontend App Router & Root:** `frontend/src/App.tsx`
- **Markdown & Math Normalizer:** `frontend/src/components/FormattedContent.tsx`
- **VIP Console Modal:** `frontend/src/components/VipModal.tsx`
