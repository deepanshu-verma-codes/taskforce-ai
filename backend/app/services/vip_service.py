"""VIP Unlimited Pass & Administrative Access Code Service.

Manages dynamic VIP access code validation, user upgrades to VIP Unlimited,
and administrative owner controls exclusively for 'deepanshu_verma'.
"""

from __future__ import annotations

from datetime import UTC, datetime
from typing import TYPE_CHECKING

from fastapi import HTTPException, status
from sqlalchemy.future import select

from app.config import settings
from app.models import SystemSetting, User
from app.schemas import VipStatusResponse, VipUserItem

if TYPE_CHECKING:
    from sqlalchemy.ext.asyncio import AsyncSession

VIP_SETTING_KEY = "vip_access_code"


def is_owner(user: User | None) -> bool:
    """Returns True strictly if the user is the platform owner ('deepanshu_verma')."""
    if not user or not getattr(user, "username", None):
        return False
    return str(user.username).strip().lower() in settings.exempt_usernames_list


async def get_active_vip_code(db: AsyncSession) -> str:
    """Retrieves the current dynamic VIP access code from system_settings or initializes default."""
    stmt = select(SystemSetting).where(SystemSetting.key == VIP_SETTING_KEY)
    result = await db.execute(stmt)
    setting = result.scalar_one_or_none()
    if not setting:
        setting = SystemSetting(
            key=VIP_SETTING_KEY,
            value=settings.DEFAULT_VIP_CODE,
            updated_at=datetime.now(UTC),
        )
        db.add(setting)
        await db.commit()
        await db.refresh(setting)
    return setting.value


async def update_vip_code(db: AsyncSession, new_code: str, admin_user: User) -> str:
    """Updates the active VIP access code. Strictly restricted to 'deepanshu_verma'."""
    if not is_owner(admin_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Only platform owner @deepanshu_verma can modify the VIP access code.",
        )

    clean_code = new_code.strip()
    if len(clean_code) < 3:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="VIP code must be at least 3 characters long.",
        )

    stmt = select(SystemSetting).where(SystemSetting.key == VIP_SETTING_KEY)
    result = await db.execute(stmt)
    setting = result.scalar_one_or_none()

    if not setting:
        setting = SystemSetting(
            key=VIP_SETTING_KEY,
            value=clean_code,
            updated_at=datetime.now(UTC),
        )
        db.add(setting)
    else:
        setting.value = clean_code
        setting.updated_at = datetime.now(UTC)

    await db.commit()
    return clean_code


async def redeem_vip_code(db: AsyncSession, code: str, user: User) -> dict[str, str | bool]:
    """Validates the entered VIP code and grants VIP Unlimited status to the user."""
    active_code = await get_active_vip_code(db)
    submitted = code.strip()

    # Case-insensitive comparison for user convenience
    if submitted.upper() != active_code.strip().upper():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid VIP access code. Please verify the code or contact @deepanshu_verma.",
        )

    if is_owner(user):
        return {
            "message": f"Owner account @{user.username} already possesses permanent VIP privileges.",
            "is_vip": True,
            "username": user.username,
        }

    # Grant VIP Unlimited status
    user.is_vip = 1
    user.vip_granted_at = datetime.now(UTC)
    db.add(user)
    await db.commit()
    await db.refresh(user)

    return {
        "message": "VIP Unlimited access successfully activated! Zero daily limits on games and problem solves.",
        "is_vip": True,
        "username": user.username,
    }


async def revoke_vip(db: AsyncSession, target_username: str, admin_user: User) -> dict[str, str]:
    """Revokes VIP Unlimited status from a user. Strictly restricted to 'deepanshu_verma'."""
    if not is_owner(admin_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Only platform owner @deepanshu_verma can revoke VIP access.",
        )

    clean_target = target_username.strip().lower()
    if clean_target in settings.exempt_usernames_list:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot revoke permanent owner privileges from platform administrator.",
        )

    stmt = select(User).where(User.username == clean_target)
    result = await db.execute(stmt)
    target_user = result.scalar_one_or_none()

    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User @{clean_target} not found.",
        )

    target_user.is_vip = 0
    target_user.vip_granted_at = None
    db.add(target_user)
    await db.commit()

    return {
        "message": f"VIP Unlimited access successfully revoked for @{target_user.username}.",
        "username": target_user.username,
    }


async def get_vip_status(db: AsyncSession, current_user: User) -> VipStatusResponse:
    """Returns VIP status for current user, including administrative oversight for deepanshu_verma."""
    user_is_owner = is_owner(current_user)
    user_is_vip = user_is_owner or bool(getattr(current_user, "is_vip", 0))

    active_code: str | None = None
    vip_users: list[VipUserItem] | None = None

    # Only deepanshu_verma receives the active VIP code and list of granted users
    if user_is_owner:
        active_code = await get_active_vip_code(db)
        stmt = (
            select(User)
            .where(User.is_vip == 1)
            .order_by(User.vip_granted_at.desc())
        )
        result = await db.execute(stmt)
        users = result.scalars().all()
        vip_users = [
            VipUserItem(
                id=u.id,
                username=u.username,
                name=u.name,
                vip_granted_at=u.vip_granted_at,
            )
            for u in users
        ]

    return VipStatusResponse(
        is_vip=user_is_vip,
        is_owner=user_is_owner,
        active_code=active_code,
        vip_users=vip_users,
    )
