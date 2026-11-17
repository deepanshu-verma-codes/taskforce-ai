# Taskforce | Autonomous Multi-Agent Swarm Platform

> **Live Handover & Status Dossier:** See [STATUS.md](file:///Users/deepanshuverma/Documents/Deepanshu's%20Project/Task/reco/STATUS.md) for the complete engineering handover, current runtime state, and architecture guide.

An enterprise-grade **Autonomous Multi-Agent Problem Resolution Floor** built with **FastAPI**, **SQLite**, **LangChain**, **LangGraph**, **LangSmith**, and **React 19 + TypeScript + Vite + Tailwind CSS**.

Users can submit complex problems across any domain (software, infrastructure, operations, business, or personal emergencies), and deploy a coordinated swarm supervised by autonomous team lead **Marcus Vance** and specialized agents **Elena Rostova**, **David Park**, **Maya Patel**, **James Thorne**, and **Sarah Chen**.

---

## 🏛️ Architecture & Core Concepts

### 1. The Tech Lead (Meta-Supervisor)
- **Global Context & Visibility**: Maintains real-time situational awareness across all problems and worker agents.
- **Decomposition & Dispatch**: Translates the user's problem into specialized tasks assigned to the chosen number of swarm agents.
- **Defect Detection & Critique Loop**: Inspects worker artifacts. If a worker misses boundary conditions, produces broken syntax, or misses edge cases, the Tech Lead **intervenes with explicit corrective instructions** and routes the worker into a revision loop until the fix meets a 100% quality guarantee.

### 2. Configurable Swarm Capacity (1 to 5 Agents)
Users can dial the number of agents working on their issue:
1. **Worker-RootCause**: Deep stack trace analysis, failure point isolation, and bug mechanics.
2. **Worker-PatchEngineer**: Idiomatic, minimal-blast-radius code patch generation.
3. **Worker-QAValidator**: Unit tests, edge-case boundary assertions, and regression validation.
4. **Worker-SecurityAuditor**: Vulnerability scan, memory leak prevention, and complexity audit.
5. **Worker-IntegrationArchitect**: System interface validation and dependency contract compliance.

### 3. Observability & Cost Tracking (LangSmith)
- **Token Accounting**: Real-time tracking of prompt tokens, completion tokens, and total token consumption.
- **Cost Engine**: Accurate dollar calculation ($) based on token volumes.
- **Latency Profiling**: Millisecond-level stopwatch profiling each agent step and total resolution time.
- **LangSmith Trace Runs & Evaluations**: Direct integration with LangSmith tracing (`LANGSMITH_API_KEY`) and automated multi-dimensional evaluation metrics:
  - *Code Correctness*
  - *Tech Lead Confidence*
  - *Edge Case Coverage*
  - *Security & Vulnerability Score*

---

## 📂 Project Structure

```
reco/
├── backend/                  # Managed with uv (pyproject.toml, uv.lock)
│   ├── app/
│   │   ├── config.py         # Settings, env vars, LangSmith & LLM configs
│   │   ├── database.py       # SQLite async engine & session management
│   │   ├── models.py         # SQLAlchemy models (Problem, AgentRun, AgentLog, Evaluation)
│   │   ├── schemas.py        # Pydantic request/response schemas
│   │   ├── services/
│   │   │   ├── problem_service.py # Problem CRUD & metrics aggregation
│   │   │   ├── cost_tracker.py    # Token counter & cost calculator ($/1M tokens)
│   │   │   └── langsmith_tracker.py # LangSmith trace links & evaluator hooks
│   │   ├── agents/
│   │   │   ├── state.py      # LangGraph state schema
│   │   │   ├── llm_client.py # OpenAI / Gemini / fallback solver
│   │   │   ├── tech_lead.py  # Tech Lead supervisor node & reflection/critic node
│   │   │   ├── workers.py    # Swarm worker nodes (Root Cause, Fixer, QA, etc.)
│   │   │   └── graph.py      # LangGraph StateGraph assembly with conditional routing
│   │   └── main.py           # FastAPI application entry point, CORS, SSE endpoint
│   ├── seed.py               # Sample problem seeder
│   ├── pyproject.toml        # uv configuration & dependencies
│   └── uv.lock               # Deterministic dependency lockfile
│
├── frontend/                 # Vite + React 19 + TypeScript + Tailwind CSS
│   ├── src/
│   │   ├── components/
│   │   │   ├── Header.tsx             # Brand, status pills, and new problem trigger
│   │   │   ├── MetricsRibbon.tsx      # KPI cards (Interventions, Tokens, Cost, Latency)
│   │   │   ├── ProblemList.tsx        # Multi-problem selector with status & agent count
│   │   │   ├── ProblemDetail.tsx      # Command center (Tech Lead tab, Swarm tab, Patch tab)
│   │   │   └── CreateProblemModal.tsx # Dynamic agent count slider (1-5) and upload form
│   │   ├── types.ts                   # TypeScript interfaces
│   │   ├── api.ts                     # REST client
│   │   ├── App.tsx                    # Main orchestrator component
│   │   └── main.tsx                   # React 19 entry point
│   ├── package.json
│   ├── vite.config.ts
│   └── tailwind.config.js
```

---

## 🚀 Quickstart

### 1. Backend Setup (`uv`)

The backend is fully managed with **`uv`**:

```bash
cd backend

# Sync dependencies and build environment
uv sync

# Add any new package effortlessly
uv add <package-name>

# (Optional) Seed the SQLite database with realistic problems
uv run python seed.py

# Start the FastAPI server with hot-reload (runs on http://127.0.0.1:8000)
uv run server
```

### 2. Frontend Setup (NomadKit Design System)

The UI is built on the **NomadKit Design System** (`docs/DESIGN.md`) using warm sand tones (`#D4A373`), secondary ocean accents (`#0891B2`), tertiary forest accents (`#166534`), and a clean, light-packed canvas (`#FFFDF7`).

```bash
cd frontend

# Install packages
npm install

# Type-check and build
npm run build

# Start Vite dev server (runs on http://127.0.0.1:5173)
npm run dev
```

Open your browser to [http://127.0.0.1:5173](http://127.0.0.1:5173).

---

## 🧪 Testing & Verification

Deterministic automated tests and linter suites enforce the DoD checklist (`AGENTS.md`):

```bash
# Backend pytest suite (Swarm graph, worker rosters, security headers, rate limiting)
cd backend
uv run pytest tests/

# Code quality and formatting
uv run ruff check .
uv run ruff format --check .

# Frontend TypeScript compilation
cd ../frontend
npm run build
```
