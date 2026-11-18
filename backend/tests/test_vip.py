import asyncio
import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select

from app.database import AsyncSessionLocal, init_db
from app.main import app
from app.models import User
from app.services import auth_service, vip_service


@pytest.fixture(autouse=True)
async def setup_db():
    await init_db()


def test_vip_flow_and_owner_controls():
    client = TestClient(app)

    owner_username = "deepanshu_verma"
    user_a_username = f"user_a_{uuid.uuid4().hex[:6]}"
    user_b_username = f"user_b_{uuid.uuid4().hex[:6]}"

    # Ensure owner user exists in database
    async def get_or_create_owner():
        async with AsyncSessionLocal() as session:
            owner = await auth_service.get_user_by_username(session, owner_username)
            if not owner:
                owner = User(
                    id=str(uuid.uuid4()),
                    username=owner_username,
                    name="Deepanshu Verma",
                    hashed_password=auth_service.hash_password("OwnerPassword123!"),
                )
                session.add(owner)
                await session.commit()
                await session.refresh(owner)
            return owner.id

    owner_id = asyncio.run(get_or_create_owner())

    # Ensure code starts as VIP2026
    async def reset_vip_code():
        async with AsyncSessionLocal() as session:
            stmt = select(User).where(User.username == owner_username)
            res = await session.execute(stmt)
            owner_user = res.scalar_one()
            await vip_service.update_vip_code(session, "VIP2026", owner_user)

    asyncio.run(reset_vip_code())

    # Register user A and user B
    res_a = client.post(
        "/api/auth/register",
        json={"username": user_a_username, "name": "User Alpha", "password": "Password123!"},
    )
    assert res_a.status_code == 201
    user_a_id = res_a.json()["id"]

    res_b = client.post(
        "/api/auth/register",
        json={"username": user_b_username, "name": "User Beta", "password": "Password123!"},
    )
    assert res_b.status_code == 201

    # 1. Login as User A: standard user should not be VIP initially
    client.post(
        "/api/auth/login",
        json={"username": user_a_username, "password": "Password123!"},
    )

    res_status = client.get("/api/vip/status")
    assert res_status.status_code == 200
    status_data = res_status.json()
    assert status_data["is_vip"] is False
    assert status_data["is_owner"] is False
    assert status_data["active_code"] is None  # Standard users cannot see the code

    # User A tries to change VIP code -> Forbidden
    res_fail_code = client.post("/api/vip/code", json={"new_code": "HACKED_CODE"})
    assert res_fail_code.status_code == 403

    # User A tries wrong code -> Bad Request
    res_wrong = client.post("/api/vip/redeem", json={"code": "WRONG_CODE_999"})
    assert res_wrong.status_code == 400

    # User A redeems valid default code "VIP2026"
    res_redeem = client.post("/api/vip/redeem", json={"code": "VIP2026"})
    assert res_redeem.status_code == 200
    assert res_redeem.json()["is_vip"] is True

    # User A quota is now exempt
    res_quota = client.get("/api/game/quota")
    assert res_quota.status_code == 200
    assert res_quota.json()["is_exempt"] is True
    assert res_quota.json()["remaining_today"] == 999999

    # 2. Simulate login as owner deepanshu_verma using auth cookie
    client.cookies.clear()
    owner_token = auth_service.create_access_token(owner_id, owner_username)
    client.cookies.set("access_token", owner_token)

    # Owner checks VIP status -> sees active code and User A in vip_users list
    res_owner_status = client.get("/api/vip/status")
    assert res_owner_status.status_code == 200
    owner_data = res_owner_status.json()
    assert owner_data["is_owner"] is True
    assert owner_data["is_vip"] is True
    assert owner_data["active_code"] == "VIP2026"
    assert any(u["username"] == user_a_username for u in owner_data["vip_users"])

    # Owner updates the code to "SWARM_SUPER_2026"
    res_update = client.post("/api/vip/code", json={"new_code": "SWARM_SUPER_2026"})
    assert res_update.status_code == 200
    assert res_update.json()["active_code"] == "SWARM_SUPER_2026"

    # Owner revokes VIP from User A
    res_revoke = client.post("/api/vip/revoke", json={"username": user_a_username})
    assert res_revoke.status_code == 200

    # 3. Switch back to User A
    client.cookies.clear()
    user_a_token = auth_service.create_access_token(user_a_id, user_a_username)
    client.cookies.set("access_token", user_a_token)

    # User A quota is no longer exempt
    res_revoked_quota = client.get("/api/game/quota")
    assert res_revoked_quota.status_code == 200
    assert res_revoked_quota.json()["is_exempt"] is False
    assert res_revoked_quota.json()["daily_limit"] == 5

    # User A tries to redeem old code "VIP2026" -> fails
    res_old_code = client.post("/api/vip/redeem", json={"code": "VIP2026"})
    assert res_old_code.status_code == 400

    # User A redeems new code "SWARM_SUPER_2026" -> succeeds!
    res_new_code = client.post("/api/vip/redeem", json={"code": "SWARM_SUPER_2026"})
    assert res_new_code.status_code == 200
    assert res_new_code.json()["is_vip"] is True
