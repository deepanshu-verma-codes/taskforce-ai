# FEATURES.md — Taskforce Feature Catalog & Capabilities

> **Platform:** Taskforce (`Taskforce.ai`)  
> **Status:** Canonical Feature Guide  
> **Target Audience:** Users, Product Teams, QA Engineers  

---

## 1. Feature Architecture Overview

Taskforce provides an end-to-end autonomous problem resolution workflow, balancing powerful AI agent orchestration with a polished, professional user interface.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Taskforce Platform Features                     │
├──────────────────┬──────────────────┬─────────────────┬────────────────┤
│ Swarm Core       │ Experience & UI  │ Vector RAG      │ Auth & VIP     │
├──────────────────┼──────────────────┼─────────────────┼────────────────┤
│ 6 Agent Personas │ Binance Theme    │ Qdrant Cloud    │ HttpOnly JWT   │
│ Critique Loop    │ VS Code Blocks   │ PDF Extraction  │ Quota Engine   │
│ LLM Waterfall    │ Unicode Math     │ Cosine Search   │ VIP Code Pass  │
│ Context Empathy  │ Live Telemetry   │ Hybrid Fallback │ Owner Console  │
└──────────────────┴──────────────────┴─────────────────┴────────────────┘
```

---

## 2. Core Autonomous Swarm Features

### 1. Dynamic 6-Agent Problem Resolution Floor
- **Marcus Vance (Team Lead & Orchestrator):** Analyzes the problem, structures a master execution plan, critiques specialist submissions, and issues the final verified sign-off.
- **Elena Rostova (Diagnostics):** Investigates root causes, system state mutations, stack traces, and failure timelines.
- **David Park (Solutions):** Crafts production-ready steps, surgical patches, and minimal blast-radius remediation.
- **Maya Patel (Quality & Boundary):** Builds regression assertions, edge-case boundary checks, and stress tests.
- **James Thorne (Risk & Safety):** Audits safety hazards, CVE security vulnerabilities, side effects, and compliance.
- **Sarah Chen (Architect):** Evaluates system contracts, backward compatibility, and architectural sustainability.

### 2. Multi-Tier Commercial LLM Waterfall
- **Primary:** Groq Cloud with ultra-fast inference on `openai/gpt-oss-20b` (or LLaMA-3.3-70b-versatile).
- **Secondary:** Automatic zero-delay failover to Google Gemini (`gemini-flash-lite-latest`) on rate limit or outage.
- **Tertiary:** OpenAI fallback (`gpt-4o-mini`).
- **Enforced SLA:** 12-second individual LLM timeout; 150-second hard boundary for total swarm workflow.

### 3. Contextual Intelligence & Human Empathy Protocol
- Automatically classifies problems into technical vs non-technical domains (Medical, Emotional, Financial, Engineering).
- **Zero-Code Invariant:** Strictly blocks code generation for human emotional, medical, or life advice inquiries. Marcus Vance will critique and reject any bogus code snippets generated for personal situations.

---

## 3. User Experience & Interface Features

### 1. High-Density Binance Design System
- Dark mode (`#0b0e11`, `#1e2329`) and light mode support with gold tactical accents (`#FCD535`).
- Clean typography with zero parenthetical job titles (e.g. `Marcus Vance` instead of `Marcus Vance (Team Lead)`).

### 2. Live Telemetry Ribbon
- Real-time ticker showing active agents, total tokens consumed, execution latency, and LangSmith tracing status.

### 3. VS Code Style Code Blocks
- Formatted code view featuring traffic light controls (`red`, `yellow`, `green`), line numbers gutter, copy button, and syntax styling.
- Auto-unpacks code trapped inside markdown table cells into clean standalone code blocks.

### 4. Unicode LaTeX Math Normalizer
- Replaces raw LaTeX symbols with clean, readable Unicode math ($∇, ∑, ≤, ≥, λ, μ, x_k$).
- Dedicated math cards with formula copy actions and SciPy optimization code blocks.

---

## 4. Vector RAG & Document Intelligence

### 1. Multi-Format Document Ingestion
- Upload `.pdf`, `.txt`, `.md`, `.doc`, `.json`, or `.log` files during problem creation.
- Text is automatically extracted, segmented into 600-character chunks with 100-character overlaps, and converted to 384-dimensional dense semantic vectors.

### 2. Qdrant Cloud Cluster Integration
- Synchronized with remote Qdrant Cloud cluster (`collection: taskforce_rag`).
- Seamless offline/local fallback ensures tests and local sandboxes never crash if the internet is disconnected.
- Compact gold database icon (`<Database />`) in problem list avoids visual clutter.

---

## 5. Security, Multi-Tenancy & Access Control

### 1. Isolated Multi-Tenant Workspaces
- Each user only sees, creates, and solves their own problems.
- Database queries enforce `Problem.user_id == current_user.id` on all endpoints.

### 2. Secure HttpOnly Cookie Authentication
- 15-minute access tokens and 7-day refresh tokens stored in secure `HttpOnly` cookies.
- Password input with interactive eye toggle (`Eye`/`EyeOff`) to view credentials before submitting.
- Friendly session security messages and terms-of-service consent checkboxes.

### 3. Sliding-Window Rate Limiting
- Defense against automated scraping and compute exhaustion on critical endpoints (`/solve`, `/upload-document`, `/auth`).

### 4. Binance-Themed Confirmation Modals
- Custom dark-mode dialogs for problem deletion and VIP revocation, eliminating unstyled browser `window.confirm()` popups.

---

## 6. Gamification, Quotas & VIP Console

### 1. Autonomous Tic-Tac-Toe Arena (`/game`)
- Challenge any of the 6 swarm agents in interactive 3x3 Tic-Tac-Toe.
- 3 difficulty modes: "Easy", "Tactical / Try to Win" (has intentional openings so users can find forks and win!), and "Grandmaster" (pure minimax).
- Real-time agent commentary, synthesized sound effects via Web Audio API, and confetti victory celebrations.

### 2. Daily Resource Quota System
- Standard users receive **5 problem solves** and **5 games** per day to safeguard server resources.
- Quotas automatically reset at midnight UTC.

### 3. VIP Unlimited Access & Owner Admin Console
- Users can enter a secret VIP access code to unlock unlimited solves and games (`SWARM_SUPER_2026`).
- Platform owner (`deepanshu_verma`) has permanent VIP exemption and an exclusive Admin Console:
  - View all users who have redeemed VIP access.
  - Update the active VIP code dynamically.
  - Revoke VIP status from any user with a single click.
