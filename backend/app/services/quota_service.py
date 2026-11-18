"""Daily Resource & Agent Compute Quota Service.

Enforces strict daily usage limits (5 games/day + 5 problem solves/day per user/IP)
to prevent compute exhaustion, rate limit abuse, and token bloat.
Accounts belonging to 'deepanshu_verma' are permanently exempt from all limits.
"""

from __future__ import annotations

from collections import defaultdict
from datetime import UTC, datetime
from typing import TYPE_CHECKING

from fastapi import HTTPException, Request, status

from app.config import settings
from app.schemas import QuotaStatusResponse

if TYPE_CHECKING:
    from app.models import User

# In-memory daily usage tracking: (date_str, identifier, action) -> count
_daily_usage: dict[tuple[str, str, str], int] = defaultdict(int)

# Tracked match IDs to prevent charging multiple moves in the same match:
# (date_str, identifier, match_id)
_seen_matches: set[tuple[str, str, str]] = set()

# Last cleaned date
_last_cleanup_date: str = ""


def _get_current_utc_date() -> str:
    """Returns current date formatted as YYYY-MM-DD in UTC."""
    return datetime.now(UTC).strftime("%Y-%m-%d")


def _cleanup_old_records_if_needed() -> None:
    """Purges records from previous calendar days to eliminate in-memory bloat."""
    global _last_cleanup_date
    today = _get_current_utc_date()
    if today == _last_cleanup_date:
        return

    # Evict usage entries not matching today
    keys_to_delete = [k for k in _daily_usage if k[0] != today]
    for k in keys_to_delete:
        del _daily_usage[k]

    # Evict seen matches not matching today
    matches_to_delete = [m for m in _seen_matches if m[0] != today]
    for m in matches_to_delete:
        _seen_matches.remove(m)

    _last_cleanup_date = today


def is_user_exempt(user: User | None = None, username: str | None = None) -> bool:
    """Returns True if the user is the owner/admin ('deepanshu_verma') or has active VIP status."""
    target_username = ""
    if user and getattr(user, "username", None):
        target_username = str(user.username).strip().lower()
    elif username:
        target_username = str(username).strip().lower()

    if target_username and target_username in settings.exempt_usernames_list:
        return True

    # Check if user has redeemed VIP Unlimited status
    if user and getattr(user, "is_vip", 0) == 1:
        return True

    return False


def get_client_identifier(request: Request, user: User | None = None) -> str:
    """Safely extracts a consistent client identifier: user.id if authenticated, else client IP."""
    if user and getattr(user, "username", None):
        return f"user:{user.username.lower()}"

    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        client_ip = forwarded.split(",")[0].strip()
    elif request.headers.get("X-Real-IP"):
        client_ip = request.headers["X-Real-IP"].strip()
    else:
        client_ip = request.client.host if request.client else "127.0.0.1"

    return f"ip:{client_ip}"


def get_quota_status(
    action: str,
    identifier: str,
    user: User | None = None,
) -> QuotaStatusResponse:
    """Returns the current daily quota status for the specified action ('game' or 'problem')."""
    _cleanup_old_records_if_needed()
    today = _get_current_utc_date()
    exempt = is_user_exempt(user)

    limit = settings.DAILY_GAME_LIMIT if action == "game" else settings.DAILY_PROBLEM_LIMIT
    used = _daily_usage.get((today, identifier, action), 0)

    if exempt:
        remaining = 999999
        username_str = user.username if user else "deepanshu_verma"
        is_owner = username_str.lower() in settings.exempt_usernames_list
        if is_owner:
            message = f"VIP Owner Account (@{username_str}): Unlimited {action}s enabled."
        else:
            message = f"VIP Unlimited Pass Active (@{username_str}): Zero daily {action} limits."
    else:
        remaining = max(0, limit - used)
        message = (
            f"Daily {action} limit: {used}/{limit} used today ({remaining} remaining). "
            "Resets at midnight UTC."
        )

    return QuotaStatusResponse(
        action=action,
        used_today=used,
        daily_limit=limit if not exempt else 999999,
        remaining_today=remaining,
        is_exempt=exempt,
        username=user.username if user else None,
        resets_at=f"{today}T23:59:59Z",
        message=message,
    )


def check_and_consume_game_quota(
    identifier: str,
    user: User | None = None,
    match_id: str | None = None,
    is_new_game: bool = False,
) -> QuotaStatusResponse:
    """Verifies that the user has remaining game quota, and consumes 1 game if starting a new match."""
    _cleanup_old_records_if_needed()
    today = _get_current_utc_date()
    exempt = is_user_exempt(user)

    action = "game"
    limit = settings.DAILY_GAME_LIMIT
    used = _daily_usage.get((today, identifier, action), 0)

    # If exempt (deepanshu_verma), allow without limit
    if exempt:
        return get_quota_status(action, identifier, user)

    # Check if already at limit
    if used >= limit:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail={
                "message": f"Daily game limit reached ({limit}/{limit} games played). Quota resets at midnight UTC to protect agent compute tokens.",
                "action": "game",
                "used_today": used,
                "daily_limit": limit,
                "remaining_today": 0,
                "is_exempt": False,
            },
        )

    # Deduplicate moves within the same match
    if match_id:
        match_key = (today, identifier, match_id)
        if match_key not in _seen_matches:
            _seen_matches.add(match_key)
            _daily_usage[(today, identifier, action)] = used + 1
    elif is_new_game:
        _daily_usage[(today, identifier, action)] = used + 1

    return get_quota_status(action, identifier, user)


def check_and_consume_problem_quota(
    identifier: str,
    user: User | None = None,
) -> QuotaStatusResponse:
    """Verifies that the user has remaining problem solve quota, and consumes 1 solve."""
    _cleanup_old_records_if_needed()
    today = _get_current_utc_date()
    exempt = is_user_exempt(user)

    action = "problem"
    limit = settings.DAILY_PROBLEM_LIMIT
    used = _daily_usage.get((today, identifier, action), 0)

    # If exempt (deepanshu_verma), allow without limit
    if exempt:
        return get_quota_status(action, identifier, user)

    # Check if already at limit
    if used >= limit:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail={
                "message": f"Daily problem resolution limit reached ({limit}/{limit} problems solved). Quota resets at midnight UTC to protect agent compute tokens.",
                "action": "problem",
                "used_today": used,
                "daily_limit": limit,
                "remaining_today": 0,
                "is_exempt": False,
            },
        )

    _daily_usage[(today, identifier, action)] = used + 1
    return get_quota_status(action, identifier, user)
