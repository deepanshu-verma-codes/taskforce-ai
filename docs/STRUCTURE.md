# Codebase Structure & Reusability Specification

> **Version:** 1.0.0  
> **Status:** Canonical & Mandatory  
> **Target:** All AI Agents & Software Engineers  
> **Rule:** Every agent creating or editing code must conform strictly to the structure, patterns, and naming conventions defined herein.

---

## 1. High-Level Project Anatomy

```
taskforce-ai/
├── AGENTS.md                 # Master Agent Operating Charter
├── README.md                 # Project Overview & Setup Instructions
├── .gitignore                # Universal Git Ignore Rules
├── docs/                     # Architecture, Strategy & Governance Specs
│   ├── PROCESS.md            # 7-Stage Engineering Lifecycle
│   ├── PLAN.md               # Phased Strategic Roadmap
│   ├── STRUCTURE.md          # Codebase Anatomy & Reusability Standards (This Doc)
│   ├── SYSTEM_DESIGN.md      # High-Scale System Architecture (Millions of Users)
│   └── SECURITY.md           # Enterprise Security Model & Invariants
│
├── backend/                  # Python 3.12 + FastAPI + SQLite + LangGraph (uv managed)
│   ├── pyproject.toml        # Dependencies, tools & Ruff configuration
│   ├── uv.lock               # Deterministic dependency lockfile
│   ├── .python-version       # Pinned Python version (3.12)
│   ├── .env.example          # Template environment configurations
│   ├── seed.py               # Pre-configured test problem seeder
│   └── app/
│       ├── __init__.py
│       ├── config.py         # Application settings & environment loader
│       ├── database.py       # Async SQLite database engine & session provider
│       ├── models.py         # SQLAlchemy ORM models (Problem, AgentRun, Log, Evaluation)
│       ├── schemas.py        # Pydantic v2 data contracts (Requests/Responses)
│       ├── main.py           # FastAPI entrypoint, middleware, routers & SSE
│       ├── services/         # Layered business logic & aggregators
│       │   ├── __init__.py
│       │   ├── cost_tracker.py      # Token counting & dollar cost calculator
│       │   ├── langsmith_tracker.py # LangSmith trace runner & feedback logger
│       │   └── problem_service.py   # Problem CRUD & Swarm execution runner
│       └── agents/           # LangGraph Multi-Agent Swarm Orchestration
│           ├── __init__.py
│           ├── state.py      # LangGraph SwarmState TypedDict
│           ├── llm_client.py # LLM adapter (OpenAI / Gemini / Deterministic Fallback)
│           ├── tech_lead.py  # Tech Lead supervisor, task dispatcher & reviewer
│           ├── workers.py    # Specialized worker nodes (Root Cause, Patch, QA, etc.)
│           └── graph.py      # LangGraph StateGraph assembly & conditional routing
│
└── frontend/                 # Vite + React 19 + TypeScript + Tailwind CSS
    ├── package.json          # Dependencies & npm scripts
    ├── vite.config.ts        # Vite configuration & backend proxy
    ├── tsconfig.json         # TypeScript project configuration
    ├── tailwind.config.js    # Design system tokens & colors
    ├── index.html            # HTML entry point with dark theme
    └── src/
        ├── main.tsx          # React application root mount
        ├── App.tsx           # Main workspace view orchestrator
        ├── index.css         # Global styles & Tailwind directives
        ├── types.ts          # Domain interfaces & TypeScript schemas
        ├── api.ts            # Typed REST API client
        └── components/       # Atomic, single-responsibility UI components
            ├── Header.tsx             # Navbar, system status, sync & new problem
            ├── MetricsRibbon.tsx      # KPI cards (Interventions, Tokens, Cost, Time)
            ├── ProblemList.tsx        # Multi-problem selector with filters & status
            ├── ProblemDetail.tsx      # Command center (Tech Lead, Swarm, Patch, QA)
            └── CreateProblemModal.tsx # Problem creation modal with swarm size slider
```

---

## 2. Backend Architecture: Layered Service Pattern

The backend follows a strict **Layered Service Pattern** with unidirectional dependencies:

```
[ HTTP Request ]
       │
       ▼
┌────────────────────────────────────────┐
│  API Routing Layer (app/main.py)       │  • Parameter validation via Pydantic
│                                        │  • Dependency Injection (DbSession)
└──────────────────┬─────────────────────┘
                   │
                   ▼
┌────────────────────────────────────────┐
│  Service Layer (app/services/)         │  • Business logic & orchestration
│                                        │  • Metrics, token & cost calculation
└─────────┬────────────────────┬─────────┘
          │                    │
          ▼                    ▼
┌──────────────────┐  ┌──────────────────┐
│ Swarm Graph      │  │ Repository / DB  │
│ (app/agents/)    │  │ (app/models.py)  │  • SQLAlchemy async session
│ • LangGraph DAG  │  │ • SQLite schema  │  • Eager loading (`selectin`)
│ • Tech Lead      │  │ • Transactional  │
│ • Swarm Workers  │  │   commits        │
└──────────────────┘  └──────────────────┘
```

### Layer Rules:
1. **Never Put Business Logic in Routes:** Routes in `main.py` must only parse parameters, invoke service methods, and return typed responses.
2. **Never Put Direct Database Queries in Agents:** Agents interact with `SwarmState`. Persisting agent results to the database is the exclusive responsibility of `problem_service.py`.
3. **Use `Annotated` for Dependency Injection:**
   ```python
   # Correct
   DbSession = Annotated[AsyncSession, Depends(get_db)]
   async def my_endpoint(db: DbSession):
       ...
   ```
4. **Relationship Loading Invariant:**
   Always use `lazy="selectin"` on SQLAlchemy relationships to ensure compatibility with asyncio.

---

## 3. Frontend Architecture: Atomic Component Hierarchy

The frontend is structured to maximize reusability, predictability, and visual polish:

```
src/
├── App.tsx                   # Top-level Orchestrator (State & Data Fetching)
├── api.ts                    # Single Source of Truth for API Calls
├── types.ts                  # Shared TypeScript Interfaces
└── components/
    ├── Header.tsx            # Navigation, Brand, System Telemetry Pills
    ├── MetricsRibbon.tsx     # Reusable Dashboard KPI Cards
    ├── ProblemList.tsx       # Searchable & Filterable Problem Drawer
    ├── ProblemDetail.tsx     # Tabbed Problem Workspace & Agent Telemetry
    └── CreateProblemModal.tsx # Swarm Configuration & Input Form
```

### Reusability Rules:
1. **Design System Tokens:** Adhere strictly to the Tailwind color palette:
   - Primary Background: `#090d16`
   - Card / Surface Background: `#0f172a`
   - Borders: `#1e293b`
   - Accent Blues: `#3b82f6` (Primary Action)
   - Status Success: `#10b981` (Emerald)
   - Status Warning / Critique: `#f59e0b` (Amber)
2. **Strict TypeScript:** No `any`. All API responses, state variables, and component props must use typed interfaces defined in `src/types.ts`.
3. **Component Independence:** Components receive data via props and communicate via callback events. They do not trigger rogue background fetch calls.

---

## 4. Naming Conventions

| Artifact | Convention | Example |
|---|---|---|
| Python Modules & Files | `snake_case.py` | `cost_tracker.py`, `tech_lead.py` |
| Python Classes & Models | `PascalCase` | `Problem`, `AgentRun`, `SwarmState` |
| Python Functions & Vars | `snake_case` | `solve_problem_with_swarm()`, `elapsed_ms` |
| TypeScript Components | `PascalCase.tsx` | `MetricsRibbon.tsx`, `Header.tsx` |
| TypeScript Types & Interfaces | `PascalCase` | `AgentLog`, `DashboardStats` |
| TypeScript Functions & Hooks | `camelCase` | `fetchProblemById()`, `handleSolve()` |
| Database Tables | `snake_case` plural | `problems`, `agent_runs`, `agent_logs` |
| API Endpoints | `kebab-case` plural | `/api/problems`, `/api/problems/{id}/solve` |
