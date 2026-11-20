# SETUP.md — Local Development & Environment Setup Guide

> **Platform:** Taskforce (`Taskforce.ai`)  
> **Status:** Canonical Setup Guide  
> **Prerequisites:** Python 3.12+, Node.js 20+, `uv`  

---

## 1. Prerequisites Installation

### 1. Python Package Manager (`uv`)
Taskforce strictly enforces Astral `uv` for Python dependency management and execution. Never invoke `pip` or global `python` directly.
```bash
# macOS / Linux
curl -LsSf https://astral.sh/uv/install.sh | sh
```

### 2. Node.js & npm
Node.js version 20 LTS or higher is required for the React 19 / Vite frontend.
```bash
node -v   # Should output v20.x or higher
npm -v    # Should output v10.x or higher
```

---

## 2. Repository Cloning & Environment Setup

```bash
git clone https://github.com/deepanshuverma/taskforce-ai.git
cd taskforce-ai
```

### Configure Environment Variables
Copy the template files into both the root, backend, and frontend directories:
```bash
cp .env.example .env
cp .env.example backend/.env
cp .env.example frontend/.env
```

### Key Environment Variables (`.env`)
```ini
# Application Mode
DEBUG=True
HOST=0.0.0.0
PORT=8000
SECRET_KEY=taskforce_fde_secret_signing_key_change_in_production_32bytes

# Primary LLM API Keys (At least one key is recommended)
GROQ_API_KEY=gsk_your_groq_api_key_here
GEMINI_API_KEY=AIza_your_gemini_api_key_here
OPENAI_API_KEY=sk_your_openai_api_key_here

# LangSmith Observability & Tracing
LANGSMITH_ENDPOINT=https://api.smith.langchain.com
LANGSMITH_AGENT_ID=taskforce-ai-agent
LANGSMITH_AGENT_ENVIRONMENT=local
LANGCHAIN_TRACING_V2=true
LANGSMITH_PROJECT=fde-swarm-taskforce-ai
LANGSMITH_API_KEY=lsv2_your_langsmith_api_key_here

# Qdrant Vector Database (Cloud or Local)
QDRANT_CLUSTER_URL=https://your-cluster.aws.cloud.qdrant.io
QDRANT_API_KEY=your_qdrant_cloud_api_key_here
QDRANT_COLLECTION=taskforce_rag

# VIP Quotas & Exemptions
QUOTA_EXEMPT_USERNAMES=deepanshu_verma,deepanshu-verma
DEFAULT_VIP_CODE=SWARM_SUPER_2026
```

---

## 3. Backend Setup & Startup

```bash
cd backend

# Sync dependencies into dedicated virtualenv
uv sync

# Run database migrations / seed 25 diverse scenarios
uv run python seed.py

# Start the FastAPI server with hot-reloading
uv run server
```
- **Backend API:** Available at `http://localhost:8000`
- **Interactive Swagger Docs:** Available at `http://localhost:8000/docs`

---

## 4. Frontend Setup & Startup

Open a second terminal window:
```bash
cd frontend

# Install npm dependencies
npm install

# Start Vite dev server on port 5173
npm run dev -- --host 0.0.0.0 --port 5173
```
- **User Interface:** Accessible at `http://localhost:5173`

---

## 5. Verification & Testing

Ensure everything passes cleanly before committing or deploying:

```bash
# 1. Run all 26 backend tests (Auth, Swarm, Quota, Game, VIP)
cd backend
uv run pytest tests/

# 2. Run Python linter and code formatting checks
uv run ruff check .

# 3. Compile frontend TypeScript and build production bundle
cd ../frontend
npm run build
```

---

## 6. Common Troubleshooting

| Issue | Cause | Solution |
| :--- | :--- | :--- |
| **`MissingGreenlet` error in backend** | SQLAlchemy async relationship serialization | Ensure `lazy="selectin"` is set on model relationships in `backend/app/models.py`. |
| **`Qdrant connection timeout`** | Network unavailable or Qdrant Cloud cluster asleep | System automatically falls back to local disk storage (`./qdrant_storage`) or `:memory:`. |
| **`HTTP 429 Too Many Requests` on Groq** | Groq free-tier 8,000 TPM limit exceeded | The waterfall automatically falls back to Gemini `gemini-flash-lite-latest` without interruption. |
| **`Password toggle not working`** | Browser autofill styling clash | Click the eye icon inside the password field to toggle plain text. |
