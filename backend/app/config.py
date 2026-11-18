import os

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=(".env", "../.env"), extra="allow")

    APP_NAME: str = "Taskforce Autonomous Agent Platform"
    DEBUG: bool = True
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    SECRET_KEY: str = "taskforce_fde_secret_signing_key_change_in_production_32bytes"
    DATABASE_URL: str = "sqlite+aiosqlite:///./fde_swarm.db"

    # CORS Allowed Origins
    CORS_ORIGINS: str = (
        "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000,http://127.0.0.1:3000"
    )

    # Authentication & Session Security (HttpOnly Cookies & JWT)
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15  # Short-lived access token (15 mins)
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7  # Long-lived refresh token (7 days)
    COOKIE_SECURE: bool = False  # False for local HTTP development, True for production HTTPS
    RATE_LIMIT_AUTH: int = 20

    # Free & Commercial LLM Provider Keys
    # 1. Google Gemini (Free tier available on Google AI Studio)
    GEMINI_API_KEY: str | None = None
    GOOGLE_API_KEY: str | None = None
    GEMINI_MODEL: str = "gemini-flash-lite-latest"

    # 2. Groq Cloud (Free high-speed 120B / LLaMA)
    GROQ_API_KEY: str | None = None
    GROQ_MODEL: str = "openai/gpt-oss-20b"

    # 3. OpenAI
    OPENAI_API_KEY: str | None = None
    OPENAI_MODEL: str = "gpt-4o-mini"

    # Performance & SLA Timeouts (2-3 minute boundary)
    REQUEST_TIMEOUT_SECONDS: float = 150.0  # 2.5 minutes max total swarm execution
    LLM_CALL_TIMEOUT: float = 12.0  # 12 seconds max per individual LLM call

    # LangSmith Observability, Tracing & Agent Identity
    LANGSMITH_ENDPOINT: str = "https://api.smith.langchain.com"
    LANGSMITH_AGENT_ID: str = "taskforce-ai-agent"
    LANGSMITH_AGENT_ENVIRONMENT: str = "local"
    LANGSMITH_TRACING: str = "true"
    LANGCHAIN_TRACING_V2: str = "true"
    LANGCHAIN_API_KEY: str | None = None
    LANGSMITH_API_KEY: str | None = None
    LANGCHAIN_PROJECT: str = "fde-swarm-taskforce-ai"
    LANGSMITH_PROJECT: str = "fde-swarm-taskforce-ai"
    LANGCHAIN_ENDPOINT: str = "https://api.smith.langchain.com"

    # Rate Limiting & Defense
    RATE_LIMIT_DEFAULT: int = 120
    RATE_LIMIT_SOLVE: int = 10
    RATE_LIMIT_DELETE: int = 15

    # Daily Usage Quotas (5 games + 5 problems/day, deepanshu_verma is exempt)
    DAILY_GAME_LIMIT: int = 5
    DAILY_PROBLEM_LIMIT: int = 5
    QUOTA_EXEMPT_USERNAMES: str = "deepanshu_verma,deepanshu-verma"
    DEFAULT_VIP_CODE: str = "VIP2026"

    @property
    def exempt_usernames_list(self) -> list[str]:
        return [u.strip().lower() for u in self.QUOTA_EXEMPT_USERNAMES.split(",") if u.strip()]

    # Qdrant Vector Database & RAG Configuration
    QDRANT_PATH: str = "./qdrant_storage"
    QDRANT_URL: str | None = None
    QDRANT_CLUSTER_URL: str | None = None
    QDRANT_API_KEY: str | None = None
    QDRANT_COLLECTION: str = "taskforce_rag"
    RAG_TOP_K: int = 4
    RAG_CHUNK_SIZE: int = 600
    RAG_CHUNK_OVERLAP: int = 100

    @property
    def effective_qdrant_url(self) -> str | None:
        return self.QDRANT_URL or self.QDRANT_CLUSTER_URL

    # Default Agent Settings
    DEFAULT_MODEL: str = "openai/gpt-oss-20b"
    MOCK_MODE_IF_NO_KEY: bool = True

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]


settings = Settings()

# Configure environment for LangSmith Tracing & Metadata (as per langsmith-trace skill)
os.environ["LANGSMITH_ENDPOINT"] = settings.LANGSMITH_ENDPOINT
os.environ["LANGCHAIN_ENDPOINT"] = settings.LANGSMITH_ENDPOINT
os.environ["LANGSMITH_TRACING"] = settings.LANGSMITH_TRACING
os.environ["LANGCHAIN_TRACING_V2"] = (
    "true" if settings.LANGSMITH_TRACING.lower() == "true" else "false"
)

if settings.LANGSMITH_AGENT_ID:
    os.environ["LANGSMITH_AGENT_ID"] = settings.LANGSMITH_AGENT_ID
    os.environ["LANGSMITH_AGENT_ENVIRONMENT"] = settings.LANGSMITH_AGENT_ENVIRONMENT
    # Prevent EnvAddressError: do not set project in env when agent address is active
    os.environ.pop("LANGSMITH_PROJECT", None)
    os.environ.pop("LANGCHAIN_PROJECT", None)
elif settings.LANGSMITH_PROJECT:
    os.environ["LANGSMITH_PROJECT"] = settings.LANGSMITH_PROJECT
    os.environ["LANGCHAIN_PROJECT"] = settings.LANGSMITH_PROJECT

if settings.LANGSMITH_API_KEY or settings.LANGCHAIN_API_KEY:
    api_key_val = settings.LANGSMITH_API_KEY or settings.LANGCHAIN_API_KEY
    if api_key_val:
        os.environ["LANGSMITH_API_KEY"] = api_key_val
        os.environ["LANGCHAIN_API_KEY"] = api_key_val
