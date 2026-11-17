import time
from collections import defaultdict

from fastapi import Request, Response, status
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.responses import JSONResponse

from app.config import settings


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Injects Helmet-equivalent enterprise security headers into every response."""

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        response = await call_next(request)

        # Content-Security-Policy with strict origin, frame and script boundaries
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; "
            "script-src 'self'; "
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
            "font-src 'self' https://fonts.gstatic.com; "
            "connect-src 'self' http://localhost:* http://127.0.0.1:* ws://localhost:* ws://127.0.0.1:*; "
            "img-src 'self' data: https:; "
            "frame-ancestors 'none'; "
            "base-uri 'self'; "
            "form-action 'self';"
        )

        # Anti-Clickjacking & MIME sniffing defense
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-Content-Type-Options"] = "nosniff"

        # Transport & Privacy
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = (
            "camera=(), microphone=(), geolocation=(), payment=()"
        )
        response.headers["X-XSS-Protection"] = "1; mode=block"

        # HSTS (Strict-Transport-Security)
        response.headers["Strict-Transport-Security"] = (
            "max-age=31536000; includeSubDomains; preload"
        )

        return response


class RateLimiterMiddleware(BaseHTTPMiddleware):
    """In-memory sliding-window rate limiter per client IP with route normalization."""

    def __init__(self, app):
        super().__init__(app)
        self.request_history: dict[str, list[float]] = defaultdict(list)

    def _get_client_ip(self, request: Request) -> str:
        """Safely extract client IP from proxy headers or socket connection."""
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            return forwarded.split(",")[0].strip()
        real_ip = request.headers.get("X-Real-IP")
        if real_ip:
            return real_ip.strip()
        return request.client.host if request.client else "127.0.0.1"

    def _get_route_tier(self, method: str, path: str) -> tuple[int, int, str]:
        """Normalize route and method into configured limit tiers: (max_requests, window_seconds, tier_key)."""
        m = method.upper()

        # 1. Swarm Execution: POST /api/problems/{id}/solve
        if m == "POST" and "/solve" in path:
            return (settings.RATE_LIMIT_SOLVE, 60, "solve")

        # 2. Authentication: POST /api/auth/...
        if m == "POST" and path.startswith("/api/auth"):
            return (settings.RATE_LIMIT_AUTH, 60, "auth")

        # 2. Document & PDF Ingestion: POST /api/upload-document
        if m == "POST" and "/api/upload-document" in path:
            return (10, 60, "upload_doc")

        # 3. Problem Creation: POST /api/problems
        if m == "POST" and path == "/api/problems":
            return (15, 60, "create_problem")

        # 4. Problem Deletion: DELETE /api/problems/{id}
        if m == "DELETE" and path.startswith("/api/problems"):
            return (settings.RATE_LIMIT_DELETE, 60, "delete_problem")

        # 5. Standard Reads: GET /api/problems...
        if m == "GET" and path.startswith("/api/problems"):
            return (60, 60, "read_problems")

        # 6. Global Default Tier
        return (settings.RATE_LIMIT_DEFAULT, 60, "default")

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        # Exempt health check, docs, and SSE stream from rate counter
        if (
            request.url.path in ["/api/health", "/docs", "/openapi.json"]
            or "/stream" in request.url.path
        ):
            return await call_next(request)

        client_ip = self._get_client_ip(request)
        now = time.time()
        max_requests, window_seconds, tier_key = self._get_route_tier(
            request.method, request.url.path
        )

        storage_key = f"{client_ip}:{tier_key}"
        timestamps = self.request_history[storage_key]

        # Evict timestamps older than the sliding window
        valid_timestamps = [t for t in timestamps if now - t < window_seconds]
        self.request_history[storage_key] = valid_timestamps

        if len(valid_timestamps) >= max_requests:
            retry_after = max(1, int(window_seconds - (now - valid_timestamps[0])))
            return JSONResponse(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                content={
                    "detail": f"Rate limit exceeded. Please wait {retry_after} seconds.",
                    "retry_after": retry_after,
                },
                headers={
                    "Retry-After": str(retry_after),
                    "X-RateLimit-Limit": str(max_requests),
                    "X-RateLimit-Remaining": "0",
                },
            )

        valid_timestamps.append(now)
        response = await call_next(request)
        response.headers["X-RateLimit-Limit"] = str(max_requests)
        response.headers["X-RateLimit-Remaining"] = str(
            max(0, max_requests - len(valid_timestamps))
        )
        return response
