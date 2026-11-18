import pytest
from httpx import ASGITransport, AsyncClient

from app.config import settings
from app.main import app
from app.models import User
from app.services import quota_service


def test_is_user_exempt():
    # deepanshu_verma should be exempt
    user_deepanshu = User(id="test-id", username="deepanshu_verma", name="Deepanshu")
    assert quota_service.is_user_exempt(user_deepanshu) is True

    # Case insensitive
    user_upper = User(id="test-id", username="Deepanshu_Verma", name="Deepanshu")
    assert quota_service.is_user_exempt(user_upper) is True

    # Hyphen variant
    user_hyphen = User(id="test-id", username="deepanshu-verma", name="Deepanshu")
    assert quota_service.is_user_exempt(user_hyphen) is True

    # Regular user should NOT be exempt
    user_regular = User(id="reg-id", username="alice_dev", name="Alice")
    assert quota_service.is_user_exempt(user_regular) is False

    # Guest / None user should NOT be exempt
    assert quota_service.is_user_exempt(None) is False


@pytest.mark.asyncio
async def test_game_quota_limit_and_exemption():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Check initial quota
        res = await client.get("/api/game/quota")
        assert res.status_code == 200
        data = res.json()
        assert data["action"] == "game"
        assert data["daily_limit"] == settings.DAILY_GAME_LIMIT
        assert data["is_exempt"] is False

        # 2. Simulate 5 games for a regular test IP
        test_ip_identifier = "ip:192.168.1.100"
        for i in range(5):
            quota_service.check_and_consume_game_quota(
                identifier=test_ip_identifier,
                user=None,
                match_id=f"match_{i}",
            )

        # 3. 6th game should trigger HTTP 429
        with pytest.raises(Exception) as exc_info:
            quota_service.check_and_consume_game_quota(
                identifier=test_ip_identifier,
                user=None,
                match_id="match_overflow",
            )
        assert "429" in str(exc_info.value)

        # 4. deepanshu_verma should NOT be blocked even after 10 games
        owner = User(id="owner-id", username="deepanshu_verma", name="Deepanshu")
        owner_id = "user:deepanshu_verma"
        for i in range(10):
            res_owner = quota_service.check_and_consume_game_quota(
                identifier=owner_id,
                user=owner,
                match_id=f"owner_match_{i}",
            )
            assert res_owner.is_exempt is True
            assert res_owner.remaining_today > 1000


@pytest.mark.asyncio
async def test_moves_in_same_match_deduplicated():
    """Moves within the same match_id should not double-consume quota."""
    test_identifier = "ip:192.168.1.200"
    match_id = "single_round_uuid_123"

    # Move 1 in match
    q1 = quota_service.check_and_consume_game_quota(
        identifier=test_identifier,
        match_id=match_id,
    )
    # Move 2 in same match
    q2 = quota_service.check_and_consume_game_quota(
        identifier=test_identifier,
        match_id=match_id,
    )
    # Move 3 in same match
    q3 = quota_service.check_and_consume_game_quota(
        identifier=test_identifier,
        match_id=match_id,
    )

    assert q1.used_today == q2.used_today == q3.used_today == 1


@pytest.mark.asyncio
async def test_problem_solve_quota_limit_and_exemption():
    regular_user = User(id="reg-user-1", username="charlie_test", name="Charlie")
    reg_id = "user:charlie_test"

    # Consume 5 problem solves
    for _ in range(5):
        quota_service.check_and_consume_problem_quota(identifier=reg_id, user=regular_user)

    # 6th solve should raise 429
    with pytest.raises(Exception) as exc_info:
        quota_service.check_and_consume_problem_quota(identifier=reg_id, user=regular_user)
    assert "429" in str(exc_info.value)

    # deepanshu_verma should be able to solve unlimited problems
    owner = User(id="owner-id", username="deepanshu_verma", name="Deepanshu")
    owner_id = "user:deepanshu_verma"
    for _ in range(12):
        q = quota_service.check_and_consume_problem_quota(identifier=owner_id, user=owner)
        assert q.is_exempt is True
