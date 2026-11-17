import uuid
from datetime import datetime

from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from app.database import Base


class Problem(Base):
    __tablename__ = "problems"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    code_snippet = Column(Text, nullable=True)
    logs = Column(Text, nullable=True)
    language = Column(String(50), default="python")

    # Qdrant Vector Storage & RAG
    document_name = Column(String(255), nullable=True)
    has_rag = Column(Integer, default=0)
    rag_chunks_count = Column(Integer, default=0)

    # Swarm configuration
    agent_count = Column(Integer, default=3)
    status = Column(String(50), default="PENDING")  # PENDING, IN_PROGRESS, RESOLVED, FAILED

    # Solution & Tech Lead verdict
    tech_lead_verdict = Column(Text, nullable=True)
    solution_patch = Column(Text, nullable=True)
    solution_explanation = Column(Text, nullable=True)
    verification_report = Column(Text, nullable=True)
    quality_score = Column(Float, default=0.0)

    # Observability & Cost
    total_tokens = Column(Integer, default=0)
    prompt_tokens = Column(Integer, default=0)
    completion_tokens = Column(Integer, default=0)
    total_cost = Column(Float, default=0.0)  # in USD
    duration_ms = Column(Integer, default=0)
    langsmith_run_id = Column(String(100), nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    agent_runs = relationship(
        "AgentRun", back_populates="problem", cascade="all, delete-orphan", lazy="selectin"
    )
    logs_rel = relationship(
        "AgentLog", back_populates="problem", cascade="all, delete-orphan", lazy="selectin"
    )
    evaluations = relationship(
        "EvaluationMetric", back_populates="problem", cascade="all, delete-orphan", lazy="selectin"
    )


class AgentRun(Base):
    __tablename__ = "agent_runs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    problem_id = Column(String(36), ForeignKey("problems.id"), nullable=False)
    agent_name = Column(String(100), nullable=False)
    agent_role = Column(String(100), nullable=False)
    status = Column(String(50), default="PENDING")
    iteration = Column(Integer, default=1)

    input_summary = Column(Text, nullable=True)
    output_content = Column(Text, nullable=True)
    lead_feedback = Column(Text, nullable=True)  # Instructions from Tech Lead to fix issues

    tokens_used = Column(Integer, default=0)
    cost = Column(Float, default=0.0)
    latency_ms = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

    problem = relationship("Problem", back_populates="agent_runs")


class AgentLog(Base):
    __tablename__ = "agent_logs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    problem_id = Column(String(36), ForeignKey("problems.id"), nullable=False)
    agent_name = Column(String(100), nullable=False)
    event_type = Column(
        String(50), nullable=False
    )  # DISPATCH, THOUGHT, REVISION, VERIFICATION, COMPLETE
    message = Column(Text, nullable=False)
    metadata_json = Column(Text, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)

    problem = relationship("Problem", back_populates="logs_rel")


class EvaluationMetric(Base):
    __tablename__ = "evaluation_metrics"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    problem_id = Column(String(36), ForeignKey("problems.id"), nullable=False)
    metric_name = Column(String(100), nullable=False)
    score = Column(Float, default=0.0)
    rationale = Column(Text, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)

    problem = relationship("Problem", back_populates="evaluations")
