# PRD.md — Product Requirements Document: Taskforce (`Taskforce.ai`)

> **Platform:** Taskforce Autonomous Problem Floor  
> **Status:** Canonical PRD (v2.4)  
> **Target Audience:** Product, Design, Engineering, Executive Leadership  

---

## 1. Problem Statement & Opportunity

Modern operations, software engineering, healthcare, and finance face high-stress problem resolution challenges where human experts must synthesize disparate data, isolate root causes, craft minimal blast-radius remedies, and audit risks under tight SLAs.

Existing AI tools provide single-prompt responses that frequently hallucinate, overlook edge cases, lack security auditing, and fail to provide deterministic verification. **Taskforce** solves this by orchestrating an autonomous swarm of 6 specialized AI agents supervised by a Team Lead (Marcus Vance) with a self-healing critique loop, document RAG, and multi-tenant security.

---

## 2. Target User Personas

1. **Platform Owner / Lead Architect (`deepanshu_verma`):**
   - Requires full visibility over platform health, token expenditure, and active users.
   - Manages VIP access codes, inspects the VIP user directory, and revokes access on demand.
2. **Operations & SRE Engineers:**
   - Submit incident reports, stack traces, and runbooks (via PDF upload).
   - Demand actionable, step-by-step remediation with regression test assertions.
3. **Multi-Disciplinary Operators (Finance, Healthcare, Math, Auto):**
   - Submit real-world domain problems.
   - Require human-readable explanations (visual analogies, clean Unicode formulas) without developer jargon or bogus code snippets.
4. **Interactive Users / Gamers:**
   - Challenge AI agents in tactical 3x3 Tic-Tac-Toe games to test reasoning and strategy.

---

## 3. Functional Requirements

### FR-1: Problem Ingestion & Multi-Domain Adaptation
- Users submit a title and problem narrative (with optional PDF/document attachment).
- System auto-detects domain and tailors vocabulary. If non-technical, strictly forbids code snippets.

### FR-2: Swarm Orchestration & Self-Healing
- Marcus Vance dispatches tasks to Elena Rostova, David Park, Maya Patel, James Thorne, and Sarah Chen.
- Marcus audits submissions. If boundary conditions or security risks are unhandled, triggers a critique cycle.
- Total execution time must not exceed 150 seconds.

### FR-3: Document RAG Intelligence
- Uploaded PDFs and text files are chunked and embedded as 384-dimensional vectors in Qdrant Cloud.
- Context is retrieved and injected into the swarm dossier. If offline, the client seamlessly falls back to local storage.

### FR-4: Multi-Tenant Authentication & Privacy
- Users register with unique username, name, and password (minimum 6 characters).
- Password inputs feature an interactive show/hide toggle (`Eye`/`EyeOff`).
- Problems and solutions are strictly isolated to the authenticated user.

### FR-5: Daily Quota & VIP Access Engine
- Standard users are allocated 5 problems and 5 games per day (resetting at midnight UTC).
- Users can redeem a VIP access code (`SWARM_SUPER_2026`) for unlimited access.
- Owner has permanent exemption and an administrative console to change codes and revoke access.

### FR-6: Autonomous Tic-Tac-Toe Arena (`/game`)
- Interactive 3x3 board with 3 difficulty modes: "Easy", "Tactical / Try to Win", and "Grandmaster".
- Dynamic agent dialogue balloons, Web Audio sound synthesis, and celebratory confetti.

---

## 4. Non-Functional Requirements & SLAs

- **Latency:** Maximum 12 seconds per individual LLM call; maximum 150 seconds total swarm solve time.
- **Availability:** Multi-provider waterfall (Groq $\to$ Gemini $\to$ OpenAI) ensures 99.9% uptime.
- **Security:** Strict CSP headers, rate limiting (120 req/min general, 10 req/min solve), HttpOnly cookies, and XSS sanitization.
- **Code Quality:** 100% test pass rate (`pytest`), zero Ruff lint errors, and zero TypeScript compilation errors.
