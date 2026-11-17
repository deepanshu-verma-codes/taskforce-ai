from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import declarative_base

from app.config import settings

engine = create_async_engine(
    settings.DATABASE_URL,
    echo=False,
    connect_args={"check_same_thread": False} if "sqlite" in settings.DATABASE_URL else {},
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine, class_=AsyncSession, expire_on_commit=False, autoflush=False
)

Base = declarative_base()


async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()


async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        # Idempotent column migrations for Qdrant RAG and Auth
        for migration in [
            "ALTER TABLE problems ADD COLUMN document_name VARCHAR(255)",
            "ALTER TABLE problems ADD COLUMN has_rag INTEGER DEFAULT 0",
            "ALTER TABLE problems ADD COLUMN rag_chunks_count INTEGER DEFAULT 0",
            "ALTER TABLE problems ADD COLUMN user_id VARCHAR(36) REFERENCES users(id)",
        ]:
            try:
                await conn.exec_driver_sql(migration)
            except Exception:
                pass

    # Ensure demo user exists and legacy problems are claimed
    async with AsyncSessionLocal() as session:
        try:
            from app.services.auth_service import ensure_demo_user

            await ensure_demo_user(session)
        except Exception:
            pass
