# AGENTS.md — Master Autonomous Agent Operating Charter

> **Version:** 1.1.0  
> **Status:** Canonical & Mandatory  
> **Target:** All AI Agents, Autonomous Subagents, and Engineers working on Taskforce (Taskforce.ai)  

---

## 1. Prime Directive & Mandatory Reading Sequence

Before reading any user request or modifying any file in this repository, **EVERY AGENT MUST EXECUTE THIS STRICT READING SEQUENCE**:

```mermaid
flowchart TD
    A[Start Turn] --> B[1. AGENTS.md\nMaster Operating Charter]
    B --> S[2. docs/STATUS.md\nCurrent Handover & Runtime State]
    S --> C[3. docs/PROCESS.md\n7-Stage Engineering Lifecycle]
    C --> D[4. docs/PLAN.md\nStrategic Roadmap & Milestones]
    D --> E[5. docs/STRUCTURE.md\nCode Organization & Reusability]
    E --> F[6. docs/SYSTEM_DESIGN.md\nHigh-Scale Architecture & Limits]
    F --> G[7. docs/SECURITY.md\nSecurity Invariants & Defenses]
    G --> H[Execute Assigned Task\nUnder Tech Lead Supervision]
```

**Non-Negotiable Invariants:**
1. **Never Skip Governance:** Do not produce code or make architectural decisions that contradict `docs/STRUCTURE.md`, `docs/SYSTEM_DESIGN.md`, or `docs/SECURITY.md`.
2. **Current Handover Awareness:** Always read `STATUS.md` at project start or turn inception to ingest active runtime configurations, background tasks, model routing policies, and historical context.
3. **Tech Lead Authority:** All subagents report to the `TechLead-Orchestrator` (Marcus Vance). If the Tech Lead issues a critique or rejection, the target worker must revise the code until the Tech Lead approves.
4. **Clean Persona Names:** Agent personas appear in all user-facing UI and messages as clean names (`Marcus Vance`, `Elena Rostova`, `David Park`, `Maya Patel`, `James Thorne`, `Sarah Chen`) with zero parenthetical role descriptions.
5. **Deterministic Verification:** Code must be accompanied by tests, boundary checks, and syntax validation. Never assume code works without verification.
6. **Observable by Design:** Every run, token count, latency metric, and critique event must be tracked in SQLite and LangSmith.

---

## 2. Agent Swarm Roster & Scopes of Responsibility

The swarm supports dynamic capacity from 1 to 5 worker agents, orchestrated by the Tech Lead:

```
                                  ┌──────────────────────────────┐
                                  │   TechLead-Orchestrator      │
                                  │   (Meta-Supervisor & Critic) │
                                  └──────────────┬───────────────┘
                                                 │
          ┌──────────────────────┬───────────────┴──────────────┬──────────────────────┐
          ▼                      ▼                              ▼                      ▼
┌──────────────────┐   ┌──────────────────┐           ┌──────────────────┐   ┌──────────────────┐
│Worker-RootCause  │   │Worker-PatchEng   │           │Worker-QAValidator│   │Worker-SecAuditor │
│Root Cause & Logs │   │Diff & Code Patch │           │Unit & Edge Tests │   │CVE & Perf Scan   │
└──────────────────┘   └──────────────────┘           └──────────────────┘   └──────────────────┘
                                                 │
                                                 ▼
                                       ┌──────────────────┐
                                       │Worker-ArchReview │
                                       │System Contracts  │
                                       └──────────────────┘
```

### 1. `Marcus Vance` — TechLead-Orchestrator (Meta-Supervisor)
- **Role:** Global state coordinator, task decomposer, and code quality inspector.
- **Authority:** Approves or rejects worker artifacts. Intervenes when a worker produces incomplete, flawed, or vulnerable solutions.
- **Output:** Global dispatch plan, critique directives, architectural explanation, and 100% verified sign-off.

### 2. `Elena Rostova` — Worker-RootCause (Diagnostic Specialist)
- **Role:** Analyzes user problem narratives, exception stack traces, and code execution paths.
- **Focus:** Isolates failure points, variable state mutation, race conditions, and boundary overflows.
- **Output:** Failure mechanism dossier, stack trace mapping, and affected line references.

### 3. `David Park` — Worker-PatchEngineer (Software Craftsman & Solutions)
- **Role:** Authors production-grade patches with minimal blast radius.
- **Invariants:** Clean syntax, PEP 8 / TypeScript typing, zero hallucinated imports, defensive null/empty input checks.
- **Output:** Idiomatic diff / code replacement and rationale.

### 4. `Maya Patel` — Worker-QAValidator (Test & Boundary Verifier)
- **Role:** Constructs automated test suites, edge-case assertions, and regression checks.
- **Focus:** Null payloads, empty lists, malformed types, concurrency collisions, and boundary limits.
- **Output:** Unit tests, regression assertions, and test pass/fail matrices.

### 5. `James Thorne` — Worker-SecurityAuditor (Security & Performance Auditor)
- **Role:** Audits proposed patches against `docs/SECURITY.md`.
- **Focus:** SQL injection, XSS vectors, prompt injection, algorithmic complexity ($O(N^2) \rightarrow O(N)$), and memory leaks.
- **Output:** Security compliance audit and performance footprint analysis.

### 6. `Sarah Chen` — Worker-IntegrationArchitect (Systems Architect)
- **Role:** Validates system contracts, backward compatibility, and schema migrations.
- **Focus:** API contract adherence, database migration safety, and environment isolation.
- **Output:** Contract verification and deployment readiness checklist.

---

## 3. The Self-Healing Critique Protocol

When an agent's deliverable contains bugs, missing edge cases, or security flaws:

```mermaid
sequenceDiagram
    participant Worker as Worker-PatchEngineer
    participant QA as Worker-QAValidator
    participant Lead as TechLead-Orchestrator

    Worker->>Lead: Submits Candidate Patch
    QA->>Lead: Flags Unhandled Boundary Condition
    Note over Lead: Tech Lead Audits Deliverables
    Lead->>Worker: CRITIQUE: "Patch fails when payload is empty. Add defensive bounds."
    Note over Worker: Worker Enters Revision Mode
    Worker->>Lead: Submits Revised Patch with Defensive Guards
    Lead->>Lead: Verifies 100% Quality & Regression Pass
    Lead->>User: Signs Off 100% Verified Fix
```

1. **Detection:** The Tech Lead or QA Validator identifies an unhandled condition or defect.
2. **Directive:** The Tech Lead issues a structured `CRITIQUE` event detailing the exact file, lines, and corrective instructions.
3. **Correction:** The target worker enters revision mode, applies the Tech Lead's guidance, and updates the artifact.
4. **Approval Gate:** The Tech Lead re-evaluates the revised patch. Only upon 100% pass does it proceed to final synthesis.

---

## 4. Code Generation Invariants (Universal Rules)

Every agent generating code in this repository MUST abide by these rules:

### Backend (Python / FastAPI / LangGraph):
1. **Tooling:** Always use `uv` for python execution (`uv run ...`, `uv add ...`). Never invoke system pip directly.
2. **Formatting & Linting:** Code must pass `uv run ruff check .` and `uv run ruff format --check .`.
3. **Typing:** Use modern Python 3.12 syntax (`dict`, `list`, `X | None`, `Annotated`). Never use deprecated `typing.Dict`, `typing.List`, `typing.Optional`.
4. **FastAPI Dependency Injection:** Always use `Annotated[T, Depends(...)]`. Never use `param: T = Depends(...)` which triggers linter warnings.
5. **Database Queries:** Always use parameterized SQLAlchemy ORM queries or select constructs. Never use raw f-string SQL queries.
6. **Async Integrity:** Always await async I/O. Use `lazy="selectin"` on SQLAlchemy relationships to avoid `MissingGreenlet` errors.

### Frontend (React 19 / TypeScript / Vite / Tailwind):
1. **Typing:** Strict TypeScript (`noImplicitAny`). Zero `any` allowed.
2. **Styling:** Use Tailwind CSS utility classes adhering to the dark design system (`#090d16` background, `#0f172a` cards, `#1e293b` borders).
3. **Icons:** Use `lucide-react` icons exclusively.
4. **Compilation:** Code must pass `npm run build` (`tsc -b && vite build`) with zero type errors.

---

## 5. Definition of Done (DoD) Checklist

Before completing any task, an agent must verify:
- [ ] Code strictly follows `docs/STRUCTURE.md` and `docs/SECURITY.md`.
- [ ] Automated tests or QA validation assertions are provided.
- [ ] All linters pass with zero errors (`ruff check .`, `tsc -b`).
- [ ] Token count and execution latency are calculated and tracked.
- [ ] Tech Lead has signed off on the resolution.
