import io

from fastapi import FastAPI
from fastapi.testclient import TestClient
from pypdf import PdfWriter

from app.agents.graph import build_swarm_graph, swarm_app
from app.agents.workers import generate_worker_analysis
from app.middleware import RateLimiterMiddleware, SecurityHeadersMiddleware
from app.schemas import ProblemCreate, sanitize_filename, sanitize_text_input
from app.services import rag_service


def test_domain_worker_rosters():
    """Verify that domain-tailored worker outputs are generated accurately across multiple domains."""
    domains = ["programming", "math", "automobile", "conversation", "business", "science"]

    for dom in domains:
        output = generate_worker_analysis(
            role="Analyst",
            title=f"Sample {dom.title()} Problem",
            description=f"Testing {dom} problem description.",
            context="sample context",
            logs="sample logs",
            domain=dom,
        )
        assert isinstance(output, str)
        assert len(output) > 20


def test_swarm_graph_compilation():
    """Verify that the LangGraph multi-agent state graph compiles successfully."""
    graph = build_swarm_graph()
    assert graph is not None
    assert swarm_app is not None


def test_security_headers_middleware():
    """Verify that Helmet-equivalent security headers are injected into HTTP responses."""
    test_app = FastAPI()
    test_app.add_middleware(SecurityHeadersMiddleware)

    @test_app.get("/ping")
    def ping():
        return {"status": "ok"}

    client = TestClient(test_app)
    response = client.get("/ping")

    assert response.status_code == 200
    headers = response.headers
    assert headers.get("X-Frame-Options") == "DENY"
    assert headers.get("X-Content-Type-Options") == "nosniff"
    assert "Strict-Transport-Security" in headers
    assert "Content-Security-Policy" in headers
    assert headers.get("Referrer-Policy") == "strict-origin-when-cross-origin"


def test_rate_limiter_middleware_and_breach():
    """Verify that the sliding-window rate limiter allows valid traffic and returns 429 JSON on breach."""
    test_app = FastAPI()
    test_app.add_middleware(RateLimiterMiddleware)

    @test_app.post("/api/problems/{id}/solve")
    def mock_solve(id: str):
        return {"solved": True}

    client = TestClient(test_app)

    # Solve route limit is configured in RateLimiterMiddleware
    # Send requests until breach
    breached = False
    for _ in range(15):
        resp = client.post("/api/problems/test-id/solve")
        if resp.status_code == 429:
            breached = True
            assert "Retry-After" in resp.headers
            assert resp.headers.get("X-RateLimit-Remaining") == "0"
            data = resp.json()
            assert "Rate limit exceeded" in data["detail"]
            assert data["retry_after"] > 0
            break

    assert breached is True


def test_xss_input_sanitization():
    """Verify that Pydantic input validators neutralize XSS scripts, handlers, and path traversal."""
    # 1. Script tag stripping
    raw_title = "<script>alert('xss')</script>Memory Leak in Worker"
    cleaned_title = sanitize_text_input(raw_title)
    assert "<script>" not in cleaned_title
    assert "Memory Leak in Worker" in cleaned_title

    # 2. Event handler stripping (onerror, onload)
    raw_desc = "<img src=x onerror=alert('cookie')>Detailed bug narrative with onload=steal()"
    cleaned_desc = sanitize_text_input(raw_desc)
    assert "onerror=" not in cleaned_desc
    assert "onload=" not in cleaned_desc

    # 3. Javascript: pseudoprotocol stripping
    raw_js = "Check link javascript: evilPayload()"
    cleaned_js = sanitize_text_input(raw_js)
    assert "javascript:" not in cleaned_js

    # 4. Filename directory traversal defense
    raw_path = "../../../../etc/passwd"
    cleaned_fn = sanitize_filename(raw_path)
    assert "../" not in cleaned_fn
    assert cleaned_fn == "passwd"

    # 5. Pydantic Model Integration
    model = ProblemCreate(
        title="<script>alert(1)</script>Fix SSE",
        description="<img src=x onerror=alert(2)>App crashed on load",
        document_name="../../sensitive/runbook.pdf",
    )
    assert "<script>" not in model.title
    assert "onerror=" not in model.description
    assert "../" not in (model.document_name or "")
    assert model.document_name == "runbook.pdf"


def test_qdrant_chunking_and_indexing():
    """Verify that documents are chunked, vectorized, and indexed into Qdrant."""
    test_prob_id = "test-prob-rag-uuid-1"
    doc_text = (
        "Distributed lock starvation incident runbook. "
        "When Redis master experiences latency spikes, workers timeout on lock acquisition. "
        "PostgreSQL row locks accumulate in pg_locks table causing cascading transaction rollbacks. "
        "Recommended remediation is jittered exponential backoff and lock lease time tuning."
    )
    chunks_indexed = rag_service.index_document(
        problem_id=test_prob_id,
        title="Distributed Lock Starvation",
        text=doc_text,
        filename="incident_runbook.pdf",
    )
    assert chunks_indexed >= 1

    # Query context
    query_res = rag_service.query_problem_context(
        problem_id=test_prob_id,
        query="Redis lock timeouts and transaction rollback",
        top_k=3,
    )
    assert len(query_res["chunks"]) >= 1
    assert "Redis" in query_res["formatted_context"]
    assert query_res["top_score"] > 0


def test_text_and_pdf_extraction():
    """Verify that plain text and simulated documents are extracted properly."""
    raw_bytes = b"Sample operational runbook with step-by-step diagnostic procedures."
    extracted, pages = rag_service.extract_text_from_file("runbook.txt", raw_bytes)
    assert "diagnostic procedures" in extracted
    assert pages == 1

    # PDF extraction
    writer = PdfWriter()
    writer.add_blank_page(width=72, height=72)
    buf = io.BytesIO()
    writer.write(buf)
    pdf_bytes = buf.getvalue()

    pdf_extracted, pdf_pages = rag_service.extract_text_from_file("blank.pdf", pdf_bytes)
    assert pdf_pages >= 1
