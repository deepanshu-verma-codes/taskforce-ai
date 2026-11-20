# ADR.md — Architectural Decision Records

> **Platform:** Taskforce (`Taskforce.ai`)  
> **Status:** Canonical & Approved  

---

## Index of Architectural Decisions

- [ADR-001: LangGraph Multi-Agent Swarm with Tech Lead Supervision](#adr-001-langgraph-multi-agent-swarm-with-tech-lead-supervision)
- [ADR-002: Cloud LLM Waterfall (Groq -> Gemini -> OpenAI) Over Local Ollama](#adr-002-cloud-llm-waterfall-groq---gemini---openai-over-local-ollama)
- [ADR-003: Qdrant Cloud Vector Database with Resilient Offline Fallback](#adr-003-qdrant-cloud-vector-database-with-resilient-offline-fallback)
- [ADR-004: Multi-Tenant Problem Isolation with HttpOnly JWT Cookies](#adr-004-multi-tenant-problem-isolation-with-httponly-jwt-cookies)
- [ADR-005: Tic-Tac-Toe Arena (`/game`) with Controlled Tactical Heuristics](#adr-005-tic-tac-toe-arena-game-with-controlled-tactical-heuristics)
- [ADR-006: Daily Quota System & Owner VIP Pass Console](#adr-006-daily-quota-system--owner-vip-pass-console)
- [ADR-007: Unicode Math Normalizer & Elimination of Code-in-Tables](#adr-007-unicode-math-normalizer--elimination-of-code-in-tables)
- [ADR-008: Binance Tactical Design System & Modal Architecture](#adr-008-binance-tactical-design-system--modal-architecture)

---

### ADR-001: LangGraph Multi-Agent Swarm with Tech Lead Supervision
- **Context:** Complex problems require decomposition, root-cause diagnosis, action planning, boundary testing, safety audits, and synthesis. A single monolithic LLM prompt fails on nuanced edge cases.
- **Decision:** Implemented a directed acyclic LangGraph `StateGraph` coordinated by Marcus Vance (Team Lead). Marcus synthesizes findings and can invoke a critique cycle if worker deliverables lack defensive bounds or contain bugs.
- **Consequences:** Deterministic execution order, isolated agent roles, and high-quality outputs. Total latency capped at 150 seconds.

---

### ADR-002: Cloud LLM Waterfall (Groq -> Gemini -> OpenAI) Over Local Ollama
- **Context:** Local Ollama models (e.g. LLaMA-3-8B) took 2–3+ minutes per agent run on developer machines, causing browser timeouts and sluggish UI responses.
- **Decision:** Deprecated local Ollama. Built a cloud LLM waterfall:
  1. Groq Cloud (`openai/gpt-oss-20b`) for sub-second streaming inference.
  2. Google Gemini (`gemini-flash-lite-latest`) for instant fallback on Groq rate limits.
  3. OpenAI (`gpt-4o-mini`) as tertiary safety net.
- **Consequences:** Total swarm execution time dropped from 180s+ to under 20s.

---

### ADR-003: Qdrant Cloud Vector Database with Resilient Offline Fallback
- **Context:** Users upload PDFs, incident logs, and technical specs requiring semantic search during swarm execution.
- **Decision:** Integrated Qdrant Cloud (`collection: taskforce_rag`) using dense 384-dimensional sentence vectors. Decoupled text-only problems from vector storage (so text problems don't get indexed). Configured automatic fallback to local disk storage (`./qdrant_storage`) or `:memory:` when network is offline or in sandbox tests.
- **Consequences:** Robust document context injection with zero crash risk in disconnected environments.

---

### ADR-004: Multi-Tenant Problem Isolation with HttpOnly JWT Cookies
- **Context:** Previously, all problems were global, allowing any visitor to view, modify, or delete other users' work.
- **Decision:** Implemented multi-tenant user authentication. Issued short-lived access tokens (15m) and long-lived refresh tokens (7d) in secure `HttpOnly` cookies. Added `Problem.user_id` foreign key and strictly filtered all queries by authenticated user.
- **Consequences:** Complete tenant data isolation. Protection against cross-site scripting (XSS) token theft.

---

### ADR-005: Tic-Tac-Toe Arena (`/game`) with Controlled Tactical Heuristics
- **Context:** Operators desired an interactive testing ground to engage swarm agents in quick game theory challenges with "try to win" mechanics.
- **Decision:** Built `/game` with a minimax engine that supports 3 levels. In "Tactical / Try to Win" mode, the AI intentionally injects a controlled 20% defensive blunder on non-critical tiles, allowing observant players to set up forks and win.
- **Consequences:** Engaging demonstration of agent personality, game theory, and sound FX without compromising the optimal engine on Grandmaster mode.

---

### ADR-006: Daily Quota System & Owner VIP Pass Console
- **Context:** Unconstrained problem resolution and game moves threatened to exhaust LLM API rate limits and token budgets.
- **Decision:** Enforced a daily quota of 5 problems and 5 games per day. Added a VIP pass redemption system (`POST /api/vip/redeem`). Hardcoded platform owner `deepanshu_verma` with permanent VIP exemption. Built an owner console for changing VIP codes and revoking user access.
- **Consequences:** Protected API budgets while providing a monetization and privilege tier.

---

### ADR-007: Unicode Math Normalizer & Elimination of Code-in-Tables
- **Context:** Non-linear optimization solutions (KKT conditions) produced walls of unreadable raw LaTeX syntax and broken markdown tables containing embedded code.
- **Decision:** Created `formatLatexMath` to transform LaTeX macros into Unicode math symbols ($∇, ∑, ≤, ≥, λ, μ, x_k$). Implemented `normalizeCodeTablesAndFences` to unpack code trapped inside markdown table cells into standalone VS Code styled editors.
- **Consequences:** Elegant, human-readable mathematical solutions and flawless code formatting.

---

### ADR-008: Binance Tactical Design System & Modal Architecture
- **Context:** Native browser alerts (`window.confirm`) were jarring and visually degraded the dark-mode aesthetic.
- **Decision:** Built dedicated modal dialogs for problem deletion and VIP revocation conforming to Binance dark/light design tokens (`#0b0e11`, `#1e2329`, gold `#FCD535`, red `#f6465d`).
- **Consequences:** Professional, cohesive enterprise appearance across all user flows.
