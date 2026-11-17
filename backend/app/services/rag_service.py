import atexit
import hashlib
import io
import math
import os
import re
import uuid
from typing import Any

from pypdf import PdfReader
from qdrant_client import QdrantClient
from qdrant_client.models import (
    Distance,
    FieldCondition,
    Filter,
    MatchValue,
    PointStruct,
    VectorParams,
)

from app.config import settings

VECTOR_DIM = 384
_qdrant_client: QdrantClient | None = None


def get_qdrant_client() -> QdrantClient:
    """Initializes and returns a singleton QdrantClient instance with fallback to in-memory."""
    global _qdrant_client
    if _qdrant_client is not None:
        return _qdrant_client

    if settings.QDRANT_URL:
        try:
            _qdrant_client = QdrantClient(
                url=settings.QDRANT_URL,
                api_key=settings.QDRANT_API_KEY,
                timeout=10,
            )
        except Exception as e:
            print(
                f"[Qdrant] Could not connect to remote Qdrant URL ({e}). Falling back to local/in-memory."
            )
            _qdrant_client = None

    if _qdrant_client is None:
        storage_path = os.path.abspath(settings.QDRANT_PATH)
        os.makedirs(storage_path, exist_ok=True)
        try:
            _qdrant_client = QdrantClient(path=storage_path)
        except Exception as e:
            print(f"[Qdrant] Local disk lock issue ({e}). Falling back to in-memory client.")
            _qdrant_client = QdrantClient(location=":memory:")

    # Ensure collection exists
    try:
        collections_res = _qdrant_client.get_collections()
        existing_names = [c.name for c in collections_res.collections]
        if settings.QDRANT_COLLECTION not in existing_names:
            _qdrant_client.create_collection(
                collection_name=settings.QDRANT_COLLECTION,
                vectors_config=VectorParams(size=VECTOR_DIM, distance=Distance.COSINE),
            )
            print(
                f"[Qdrant] Initialized collection '{settings.QDRANT_COLLECTION}' (dim={VECTOR_DIM}, Cosine)."
            )
    except Exception as e:
        print(f"[Qdrant] Collection check error: {e}")

    return _qdrant_client


def close_qdrant_client() -> None:
    """Safely closes the Qdrant client connection during process shutdown."""
    global _qdrant_client
    if _qdrant_client is not None:
        try:
            _qdrant_client.close()
        except Exception:
            pass
        _qdrant_client = None


atexit.register(close_qdrant_client)


def generate_embedding(text: str, dim: int = VECTOR_DIM) -> list[float]:
    """
    Generates a deterministic 384-dimensional dense semantic embedding vector
    using term frequency, n-gram hashing, and L2 cosine normalization.
    """
    cleaned = re.sub(r"\s+", " ", text).strip().lower()
    tokens = re.findall(r"\b[a-zA-Z0-9_\-\.]{2,}\b", cleaned)
    if not tokens:
        return [1.0 / math.sqrt(dim)] * dim

    vec = [0.0] * dim
    features = list(tokens)
    for i in range(len(tokens) - 1):
        features.append(f"{tokens[i]}_{tokens[i + 1]}")

    for feat in features:
        h = int(hashlib.md5(feat.encode("utf-8")).hexdigest(), 16)
        idx = h % dim
        sign = 1.0 if ((h >> 8) & 1) else -1.0
        weight = 1.5 if "_" in feat else 1.0
        vec[idx] += sign * weight

    norm = math.sqrt(sum(x * x for x in vec))
    if norm > 0:
        vec = [round(x / norm, 6) for x in vec]
    return vec


def extract_text_from_file(filename: str, content: bytes) -> tuple[str, int]:
    """
    Extracts plain text and page/section count from uploaded document or PDF.
    Supports PDF, TXT, MD, JSON, CSV, LOG, and DOC files.
    """
    lower_name = filename.lower()
    if lower_name.endswith(".pdf"):
        try:
            reader = PdfReader(io.BytesIO(content))
            pages_text = []
            for page in reader.pages:
                text = page.extract_text()
                if text:
                    pages_text.append(text.strip())
            full_text = "\n\n".join(pages_text)
            return full_text, len(reader.pages)
        except Exception as e:
            print(f"[RAG] PDF parsing exception for {filename}: {e}")
            # Fallback to string extraction
            decoded = content.decode("latin-1", errors="ignore")
            readable = "".join(ch for ch in decoded if ch.isprintable() or ch in "\n\r\t")
            return readable, 1

    # Text, Markdown, JSON, Code, Log files
    try:
        decoded = content.decode("utf-8")
        return decoded, 1
    except UnicodeDecodeError:
        decoded = content.decode("latin-1", errors="replace")
        return decoded, 1


def chunk_text(
    text: str, chunk_size: int = settings.RAG_CHUNK_SIZE, overlap: int = settings.RAG_CHUNK_OVERLAP
) -> list[str]:
    """Splits document text into coherent, overlapping chunks along sentence or paragraph boundaries."""
    cleaned = " ".join(text.split())
    if not cleaned:
        return []
    if len(cleaned) <= chunk_size:
        return [cleaned]

    chunks = []
    start = 0
    while start < len(cleaned):
        end = start + chunk_size
        if end >= len(cleaned):
            chunks.append(cleaned[start:])
            break

        # Seek sentence boundary (. ! ?)
        split_idx = -1
        for punct in [". ", "? ", "! ", "\n"]:
            pos = cleaned.rfind(punct, start + chunk_size // 2, end)
            if pos > split_idx:
                split_idx = pos + len(punct) - 1

        # Fallback to whitespace
        if split_idx == -1:
            pos = cleaned.rfind(" ", start + chunk_size // 2, end)
            if pos != -1:
                split_idx = pos

        if split_idx == -1:
            split_idx = end

        chunk = cleaned[start:split_idx].strip()
        if chunk:
            chunks.append(chunk)

        start = max(start + 1, split_idx - overlap)

    return chunks


def index_document(
    problem_id: str,
    title: str,
    text: str,
    filename: str | None = None,
) -> int:
    """
    Chunks document text, generates semantic vectors, and upserts them
    into Qdrant collection under problem_id metadata.
    """
    if not text or not text.strip():
        return 0

    client = get_qdrant_client()
    chunks = chunk_text(text)
    if not chunks:
        return 0

    points = []
    for i, chunk in enumerate(chunks):
        vec = generate_embedding(chunk)
        point_id = str(uuid.uuid4())
        payload = {
            "problem_id": problem_id,
            "chunk_id": i,
            "text": chunk,
            "char_count": len(chunk),
            "filename": filename or "problem_context",
            "title": title,
        }
        points.append(PointStruct(id=point_id, vector=vec, payload=payload))

    try:
        client.upsert(collection_name=settings.QDRANT_COLLECTION, points=points)
        print(
            f"[Qdrant] Successfully upserted {len(points)} vector chunks for problem {problem_id} (file: {filename})"
        )
        return len(points)
    except Exception as e:
        print(f"[Qdrant] Error upserting points for problem {problem_id}: {e}")
        return 0


def query_problem_context(
    problem_id: str,
    query: str,
    top_k: int = settings.RAG_TOP_K,
) -> dict[str, Any]:
    """
    Performs vector similarity search in Qdrant for the given problem,
    returning top-K relevant chunks and a structured RAG context dossier.
    """
    client = get_qdrant_client()
    query_vec = generate_embedding(query)

    try:
        search_filter = Filter(
            must=[FieldCondition(key="problem_id", match=MatchValue(value=problem_id))]
        )
        res = client.query_points(
            collection_name=settings.QDRANT_COLLECTION,
            query=query_vec,
            query_filter=search_filter,
            limit=top_k,
        )
        points = res.points if hasattr(res, "points") else []
    except Exception as e:
        print(f"[Qdrant] Query error for problem {problem_id}: {e}")
        points = []

    chunks = []
    top_score = 0.0
    for p in points:
        score = float(p.score) if hasattr(p, "score") and p.score is not None else 1.0
        if score > top_score:
            top_score = score
        chunks.append(
            {
                "chunk_id": p.payload.get("chunk_id", 0) if p.payload else 0,
                "text": p.payload.get("text", "") if p.payload else "",
                "char_count": p.payload.get("char_count", 0) if p.payload else 0,
                "filename": p.payload.get("filename", "") if p.payload else "",
                "score": round(score, 3),
            }
        )

    formatted_sections = []
    if chunks:
        doc_name = chunks[0].get("filename") or "Attached Document"
        formatted_sections.append(
            f"=== QDRANT VECTOR RAG CONTEXT (Retrieved from '{doc_name}', Top Similarity: {top_score:.2f}) ==="
        )
        for i, c in enumerate(chunks, 1):
            formatted_sections.append(
                f"[Retrieved Source Chunk #{i} (Chunk ID: {c['chunk_id'] + 1}) | Relevance: {c['score']}]:\n{c['text']}"
            )
        formatted_sections.append("=== END OF QDRANT VECTOR CONTEXT ===")

    formatted_context = "\n\n".join(formatted_sections)
    return {
        "chunks": chunks,
        "top_score": top_score,
        "formatted_context": formatted_context,
    }


def get_problem_chunks(problem_id: str) -> list[dict[str, Any]]:
    """Retrieves all indexed vector chunks stored in Qdrant for a given problem."""
    client = get_qdrant_client()
    try:
        scroll_filter = Filter(
            must=[FieldCondition(key="problem_id", match=MatchValue(value=problem_id))]
        )
        records, _ = client.scroll(
            collection_name=settings.QDRANT_COLLECTION,
            scroll_filter=scroll_filter,
            limit=50,
            with_payload=True,
        )
        results = []
        for r in records:
            if r.payload:
                results.append(
                    {
                        "chunk_id": r.payload.get("chunk_id", 0),
                        "text": r.payload.get("text", ""),
                        "char_count": r.payload.get("char_count", len(r.payload.get("text", ""))),
                        "filename": r.payload.get("filename"),
                        "score": 1.0,
                    }
                )
        results.sort(key=lambda x: x["chunk_id"])
        return results
    except Exception as e:
        print(f"[Qdrant] Error scrolling chunks for problem {problem_id}: {e}")
        return []
