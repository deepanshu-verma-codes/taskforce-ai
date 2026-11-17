# SwarmLead FDE Backend

FastAPI application powered by LangGraph Swarm Orchestration, SQLite, and LangSmith.

## Management with uv

Run commands using `uv`:
```bash
# Start server
uv run uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload

# Add a package
uv add <package-name>

# Sync dependencies
uv sync

# Run seeds/scripts
uv run python seed.py
```
