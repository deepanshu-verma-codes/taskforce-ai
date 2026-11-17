import base64
import hashlib
import hmac
import json
import re
import secrets
import time
import uuid
from datetime import datetime
from typing import Any

from fastapi import HTTPException, Response, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.config import settings
from app.models import Problem, User
from app.schemas import UserRegisterRequest


def hash_password(password: str) -> str:
    """Hash a password using PBKDF2-HMAC-SHA256 with 100,000 iterations and a cryptographic salt."""
    salt = secrets.token_hex(16)
    key = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), 100_000)
    return f"{salt}:{key.hex()}"


def verify_password(password: str, hashed_password: str) -> bool:
    """Verify a plain password against the stored PBKDF2 hash using constant-time comparison."""
    if not hashed_password or ":" not in hashed_password:
        return False
    salt, expected_hex = hashed_password.split(":", 1)
    key = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), 100_000)
    return hmac.compare_digest(key.hex(), expected_hex)


def _b64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("utf-8")


def _b64url_decode(s: str) -> bytes:
    padding = 4 - (len(s) % 4)
    if padding != 4:
        s += "=" * padding
    return base64.urlsafe_b64decode(s)


def _create_jwt(payload: dict[str, Any], secret: str) -> str:
    """Standard RFC 7519 JSON Web Token generator with HMAC-SHA256."""
    header = {"alg": "HS256", "typ": "JWT"}
    header_b64 = _b64url_encode(json.dumps(header, separators=(",", ":")).encode("utf-8"))
    payload_b64 = _b64url_encode(json.dumps(payload, separators=(",", ":")).encode("utf-8"))
    signing_input = f"{header_b64}.{payload_b64}".encode()
    signature = hmac.new(secret.encode("utf-8"), signing_input, hashlib.sha256).digest()
    sig_b64 = _b64url_encode(signature)
    return f"{header_b64}.{payload_b64}.{sig_b64}"


def verify_token(token: str, expected_type: str = "access") -> dict[str, Any]:
    """Validate token signature, expiration timestamp, and token type."""
    parts = token.split(".")
    if len(parts) != 3:
        raise ValueError("Malformed token format")

    header_b64, payload_b64, sig_b64 = parts
    signing_input = f"{header_b64}.{payload_b64}".encode()
    expected_sig = hmac.new(
        settings.SECRET_KEY.encode("utf-8"), signing_input, hashlib.sha256
    ).digest()

    try:
        actual_sig = _b64url_decode(sig_b64)
    except Exception as exc:
        raise ValueError("Invalid signature encoding") from exc

    if not hmac.compare_digest(expected_sig, actual_sig):
        raise ValueError("Token signature mismatch")

    try:
        payload = json.loads(_b64url_decode(payload_b64).decode("utf-8"))
    except Exception as exc:
        raise ValueError("Invalid payload encoding") from exc

    now = time.time()
    if "exp" in payload and payload["exp"] < now:
        raise ValueError("Token has expired")

    token_type = payload.get("type")
    if expected_type and token_type != expected_type:
        raise ValueError(f"Invalid token type: expected '{expected_type}', got '{token_type}'")

    return payload


def create_access_token(user_id: str, username: str) -> str:
    """Issue short-lived access token (15 minutes)."""
    now = time.time()
    expire_seconds = settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
    payload = {
        "sub": user_id,
        "username": username,
        "type": "access",
        "iat": int(now),
        "exp": int(now + expire_seconds),
    }
    return _create_jwt(payload, settings.SECRET_KEY)


def create_refresh_token(user_id: str) -> str:
    """Issue long-lived refresh token (7 days)."""
    now = time.time()
    expire_seconds = settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400
    payload = {
        "sub": user_id,
        "type": "refresh",
        "iat": int(now),
        "exp": int(now + expire_seconds),
    }
    return _create_jwt(payload, settings.SECRET_KEY)


def set_auth_cookies(
    response: Response, access_token: str, refresh_token: str | None = None
) -> None:
    """Set secure HttpOnly cookies for short-lived access and long-lived refresh tokens."""
    access_max_age = settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
    response.set_cookie(
        key="access_token",
        value=access_token,
        max_age=access_max_age,
        expires=access_max_age,
        httponly=True,
        samesite="lax",
        secure=settings.COOKIE_SECURE,
        path="/",
    )

    if refresh_token:
        refresh_max_age = settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400
        response.set_cookie(
            key="refresh_token",
            value=refresh_token,
            max_age=refresh_max_age,
            expires=refresh_max_age,
            httponly=True,
            samesite="lax",
            secure=settings.COOKIE_SECURE,
            path="/",
        )


def clear_auth_cookies(response: Response) -> None:
    """Invalidate and remove authentication cookies."""
    response.delete_cookie(key="access_token", path="/")
    response.delete_cookie(key="refresh_token", path="/")
    response.delete_cookie(key="refresh_token", path="/api/auth")


async def get_user_by_id(db: AsyncSession, user_id: str) -> User | None:
    stmt = select(User).where(User.id == user_id)
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def get_user_by_username(db: AsyncSession, username: str) -> User | None:
    stmt = select(User).where(User.username == username.lower().strip())
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def generate_username_suggestions(
    db: AsyncSession,
    base_username: str,
    name: str | None = None,
    limit: int = 4,
) -> list[str]:
    """Generates intelligent, Gmail-style alternative username suggestions based on

    the taken username and user's display name, guaranteeing that every returned
    suggestion is available in the database.
    """
    clean_base = re.sub(r"[^a-zA-Z0-9_-]", "", base_username.lower()).strip("_-")
    if not clean_base or len(clean_base) < 2:
        clean_base = "user"

    candidates: list[str] = []

    # 1. Name-based variations (if name provided)
    if name:
        parts = [re.sub(r"[^a-zA-Z0-9]", "", p.lower()) for p in name.split()]
        parts = [p for p in parts if p]
        if len(parts) >= 2:
            first, last = parts[0], parts[-1]
            candidates.append(f"{first}{last}")
            candidates.append(f"{first}_{last}")
            candidates.append(f"{first[0]}{last}")
            candidates.append(f"{first}{last[0]}")
            candidates.append(f"{last}_{first}")
        elif len(parts) == 1 and parts[0] != clean_base:
            candidates.append(parts[0])

    # 2. Year & number variations
    now_year = datetime.now().year
    year_short = str(now_year)[-2:]
    candidates.append(f"{clean_base}{year_short}")
    candidates.append(f"{clean_base}{now_year}")

    for _ in range(4):
        num = secrets.randbelow(90) + 10
        candidates.append(f"{clean_base}{num}")
        candidates.append(f"{clean_base}_{num}")

    # 3. Delimiter alternations
    if "_" in clean_base:
        candidates.append(clean_base.replace("_", ""))
        candidates.append(clean_base.replace("_", "-"))
    if "-" in clean_base:
        candidates.append(clean_base.replace("-", ""))
        candidates.append(clean_base.replace("-", "_"))

    # 4. Tech / role / platform suffixes & prefixes
    suffixes = ["dev", "ai", "hub", "pro", "lab", "hq"]
    for s in suffixes:
        candidates.append(f"{clean_base}_{s}")
        candidates.append(f"{clean_base}{s}")

    prefixes = ["the_", "iam_"]
    for p in prefixes:
        candidates.append(f"{p}{clean_base}")

    # 5. Sanitize, validate length, and deduplicate candidates preserving order
    valid_candidates: list[str] = []
    seen = {clean_base, base_username.lower().strip()}
    for c in candidates:
        c_clean = c.lower().strip("_-")
        if (
            len(c_clean) >= 3
            and len(c_clean) <= 30
            and re.match(r"^[a-zA-Z0-9_-]+$", c_clean)
            and c_clean not in seen
        ):
            seen.add(c_clean)
            valid_candidates.append(c_clean)

    if not valid_candidates:
        valid_candidates = [f"{clean_base}{secrets.randbelow(900) + 100}" for _ in range(6)]

    # 6. Check candidates against the database in a single query
    stmt = select(User.username).where(User.username.in_(valid_candidates))
    result = await db.execute(stmt)
    taken = set(result.scalars().all())

    available = [c for c in valid_candidates if c not in taken]

    # Ensure at least `limit` suggestions are provided
    while len(available) < limit:
        extra_cand = f"{clean_base}{secrets.randbelow(9000) + 1000}"
        if extra_cand not in taken and extra_cand not in available:
            chk = await get_user_by_username(db, extra_cand)
            if not chk:
                available.append(extra_cand)

    return available[:limit]


async def register_user(db: AsyncSession, req: UserRegisterRequest) -> User:
    clean_username = req.username.lower().strip()
    existing = await get_user_by_username(db, clean_username)
    if existing:
        suggestions = await generate_username_suggestions(db, clean_username, req.name)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "message": "That username is taken. Try another.",
                "code": "USERNAME_TAKEN",
                "suggestions": suggestions,
            },
        )

    user = User(
        id=str(uuid.uuid4()),
        username=clean_username,
        name=req.name.strip(),
        hashed_password=hash_password(req.password),
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


async def authenticate_user(db: AsyncSession, username: str, password: str) -> User | None:
    user = await get_user_by_username(db, username)
    if not user:
        return None
    if not verify_password(password, user.hashed_password):
        return None
    return user


DEMO_USER_ID = "00000000-0000-0000-0000-000000000001"


async def ensure_demo_user(db: AsyncSession) -> User:
    """Ensures a default demo user exists and claims any orphaned legacy problems."""
    demo_user = await get_user_by_id(db, DEMO_USER_ID)
    if not demo_user:
        demo_user = await get_user_by_username(db, "demo")

    if not demo_user:
        demo_user = User(
            id=DEMO_USER_ID,
            username="demo",
            name="Demo Engineer",
            hashed_password=hash_password("demo123"),
        )
        db.add(demo_user)
        await db.commit()
        await db.refresh(demo_user)

    # Claim any orphaned legacy problems to deepanshu_verma if available, else demo_user
    deepanshu = await get_user_by_username(db, "deepanshu_verma")
    owner_id = deepanshu.id if deepanshu else demo_user.id

    stmt = select(Problem).where(Problem.user_id.is_(None))
    orphaned_res = await db.execute(stmt)
    orphaned = orphaned_res.scalars().all()
    if orphaned:
        for p in orphaned:
            p.user_id = owner_id
        await db.commit()

    return demo_user
