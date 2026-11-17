# Enterprise Security Model, Defense-in-Depth & Invariants

> **Version:** 2.0.0  
> **Status:** Canonical Security Specification & Implementation Plan  
> **Lead Security Auditor:** James Thorne  
> **Target:** Platform Engineers, Security Auditors, and Autonomous AI Agents  
> **Rule:** Every endpoint, database query, client asset, and LLM prompt must strictly comply with these security invariants.

---

## 1. Defense-in-Depth Architecture

```
Layer 1: Network & Ingress   --> Cloudflare / Reverse Proxy, TLS 1.3, IP Filtering
Layer 2: Transport & Headers --> Helmet-Grade Security Headers (CSP, HSTS, X-Frame, X-Content-Type)
Layer 3: Rate Limiting       --> Sliding-Window IP Rate Limiter with Route Normalization & 429 JSON Responses
Layer 4: Input Sanitization  --> Pydantic v2 HTML/XSS Sanitization & File Path Traversal Immunity
Layer 5: Secret Isolation    --> Zero-Trust Client/Server Boundary (Vite Bundle Guard, No Leaked Keys)
Layer 6: Persistence Layer  --> Parameterized Queries (SQL Injection Immunity via SQLAlchemy ORM)
Layer 7: Swarm Agent Defense --> Delimited Prompt Sandboxing & Sensitive Credential Redaction
```

---

## 2. Security Enhancement Plan (Phased Roadmap)

| Phase | Security Domain | Target Artifacts | Deliverable |
| :--- | :--- | :--- | :--- |
| **Phase 1** | **Governance & Audit** | `docs/SECURITY.md` | Formal security architecture, threat model, and validation criteria. |
| **Phase 2** | **Sliding-Window Rate Limiting** | `backend/app/middleware.py` | Route-normalized sliding window rate limiter returning standard 429 JSON with `Retry-After`. |
| **Phase 3** | **XSS & Injection Protection** | `backend/app/schemas.py`, `backend/app/main.py` | Pydantic field validators stripping malicious HTML/scripts, event handlers, and path traversal tokens. |
| **Phase 4** | **Secret Isolation & Bundle Guard** | `frontend/vite.config.ts`, `backend/app/config.py` | Vite build-time leak detection plugin halting build on secret detection; verified client/server separation. |
| **Phase 5** | **Automated Security Verification** | `backend/tests/test_swarm.py` | Automated test suite validating 429 rate limit triggers, XSS payload stripping, and CSP headers. |

---

## 3. Rate Limiting & Denial-of-Service (DoS) Defense

To protect costly LLM swarm inference pipelines, prevent CPU/memory exhaustion, and stop automated abuse, the backend implements a **sliding-window rate limiter** in [middleware.py](file:///Users/deepanshuverma/Documents/Deepanshu's%20Project/Task/taskforce-ai/backend/app/middleware.py).

### 3.1 Rate Limiting Policy Tiers:

| Route / Method Pattern | Window | Max Requests | Purpose |
| :--- | :--- | :--- | :--- |
| `POST /api/problems/{id}/solve` | 60 seconds | **5 requests** | Prevents concurrent swarm orchestration exhaustion & API quota drain. |
| `POST /api/upload-document` | 60 seconds | **10 requests** | Guards against heavy PDF text extraction and vector embedding denial-of-service. |
| `POST /api/problems` | 60 seconds | **15 requests** | Prevents database spamming and problem table bloat. |
| `GET /api/problems*`, `GET /api/stats` | 60 seconds | **60 requests** | Accommodates UI polling while throttling scraping. |
| **Global Default** | 60 seconds | **120 requests** | Fallback protection for all other endpoints. |

### 3.2 Key Invariants:
1. **Route Normalization:** Dynamic UUIDs/IDs in URLs (`/api/problems/{id}/solve`) are normalized before checking limits. Attackers cannot bypass limits by calling solve on multiple problem IDs.
2. **HTTP Method Differentiation:** `POST` operations on problem resources carry stricter limits than `GET` reads.
3. **Clean 429 JSON Response:** Never raises uncaught exceptions in Starlette middleware. Returns a compliant `429 Too Many Requests` JSON payload with:
   ```json
   {
     "detail": "Rate limit exceeded. Please wait 12 seconds.",
     "retry_after": 12
   }
   ```
4. **Standard Headers:** Emits `X-RateLimit-Limit`, `X-RateLimit-Remaining`, and `Retry-After` headers on all tracked routes.
5. **Trusted Client IP Extraction:** Evaluates `X-Forwarded-For` and `X-Real-IP` proxies safely, falling back to `request.client.host`.

---

## 4. Cross-Site Scripting (XSS) & Injection Defense

### 4.1 Multi-Layered XSS Defense Matrix:

```
[Untrusted User Input]
         │
         ▼
[Layer 1: Pydantic v2 Sanitizer] ──> Strips <script>, <iframe>, <object>, <svg/onload>, javascript: URLs
         │
         ▼
[Layer 2: Database Persistence]  ──> Cleaned, sanitized plain text stored in SQLite
         │
         ▼
[Layer 3: React JSX Rendering]   ──> Safe DOM data-binding (React natively HTML-escapes all strings)
         │
         ▼
[Layer 4: Content Security Policy] ──> Browser blocks inline unauthorized scripts & untrusted origins
```

### 4.2 Backend Input Sanitization Rules:
1. **Script Tag Neutralization:** Strips all `<script>...</script>` and `<style>...</style>` blocks from text inputs.
2. **Event Handler Stripping:** Removes inline DOM event handlers (e.g. `onload=`, `onerror=`, `onclick=`, `onmouseover=`).
3. **Pseudoprotocol Neutralization:** Strips `javascript:`, `data:text/html`, and `vbscript:` URI schemes.
4. **Document Filename Sanitization:** Applies `os.path.basename` and regex alphanumeric filtering (`re.sub(r'[^a-zA-Z0-9_\-\. ]', '', ...)`), guaranteeing directory traversal (`../../etc/passwd`) immunity.
5. **SQL Injection Immunity:** Zero string concatenation. 100% of database queries use parameterized SQLAlchemy ORM statements.

### 4.3 Content-Security-Policy (CSP) Invariant:
FastAPI injects Helmet-grade CSP headers on every response:
```http
Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; connect-src 'self' http://localhost:* http://127.0.0.1:* ws://localhost:* ws://127.0.0.1:*; img-src 'self' data: https:; frame-ancestors 'none'; base-uri 'self'; form-action 'self';
```

---

## 5. Secret & API Key Isolation (Zero Browser-Side Exposure)

To protect commercial LLM provider credentials (`GROQ_API_KEY`, `GEMINI_API_KEY`, `OPENAI_API_KEY`, `LANGCHAIN_API_KEY`, `QDRANT_API_KEY`):

### 5.1 Client / Server Isolation Boundary:
1. **Strict Vite Prefix Enforcing:** Vite only injects environment variables prefixed with `VITE_` into client bundles (`import.meta.env.VITE_...`).
2. **Zero Private Keys in Frontend:** The frontend `.env` contains strictly non-sensitive configuration:
   - `VITE_PORT=5173`
   - `VITE_BACKEND_URL=http://127.0.0.1:8000`
   - `VITE_API_URL=http://127.0.0.1:8000/api`
   - `VITE_APP_TITLE="Taskforce | Autonomous Multi-Agent Floor"`
3. **Server-Side Only Secrets:** All LLM provider keys and signing secrets reside solely in the backend runtime process via `pydantic-settings` ([config.py](file:///Users/deepanshuverma/Documents/Deepanshu's%20Project/Task/taskforce-ai/backend/app/config.py)). No backend endpoint echoes configuration values or secrets.
4. **Vite Build-Time Secret Scanner:** The frontend build toolchain includes an automated audit step in [vite.config.ts](file:///Users/deepanshuverma/Documents/Deepanshu's%20Project/Task/taskforce-ai/frontend/vite.config.ts) that inspects generated JavaScript and CSS chunks for credential patterns (e.g., `AIza...`, `gsk_...`, `sk-...`, `lsv2_...`). If any secret token is discovered, the build halts with a fatal security error.

---

## 6. Audit & Verification Checklist

Before signing off on any code release, the following checklist must pass:
- [x] Sliding-window rate limiter returns HTTP 429 JSON response on threshold breaches with valid `Retry-After`.
- [x] Route normalization prevents rate limit evasion via problem ID manipulation.
- [x] Pydantic validators sanitize XSS payloads (`<script>`, `onerror=`, `javascript:`) before database writes.
- [x] Uploaded document filenames are sanitized against path traversal (`../`).
- [x] Zero API keys or private tokens are present in client source or `frontend/dist` bundle chunks.
- [x] CSP and anti-clickjacking headers (`X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`) are returned on all HTTP responses.
- [x] Automated security test suite in `backend/tests/test_swarm.py` passes 100%.
