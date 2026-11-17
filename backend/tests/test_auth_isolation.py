import uuid

import pytest
from fastapi.testclient import TestClient

from app.database import init_db
from app.main import app
from app.services import auth_service


@pytest.fixture(autouse=True)
async def setup_db():
    await init_db()


def test_auth_crypto_primitives():
    """Verify standard PBKDF2 password hashing and JWT RFC 7519 encoding/decoding."""
    pwd = "StrongPassword_123!"
    hashed = auth_service.hash_password(pwd)
    assert hashed != pwd
    assert ":" in hashed
    assert auth_service.verify_password(pwd, hashed) is True
    assert auth_service.verify_password("WrongPassword!", hashed) is False

    # JWT generation & verification
    user_id = str(uuid.uuid4())
    access_tok = auth_service.create_access_token(user_id, "testuser")
    refresh_tok = auth_service.create_refresh_token(user_id)

    access_payload = auth_service.verify_token(access_tok, expected_type="access")
    assert access_payload["sub"] == user_id
    assert access_payload["type"] == "access"

    refresh_payload = auth_service.verify_token(refresh_tok, expected_type="refresh")
    assert refresh_payload["sub"] == user_id
    assert refresh_payload["type"] == "refresh"


def test_registration_and_httponly_cookies():
    """Verify user registration sets HttpOnly cookies and returns clean profile."""
    client = TestClient(app)
    unique_user = f"user_{uuid.uuid4().hex[:8]}"

    res = client.post(
        "/api/auth/register",
        json={
            "username": unique_user,
            "name": "Test Engineer",
            "password": "Password123!",
        },
    )
    assert res.status_code == 201
    data = res.json()
    assert data["username"] == unique_user
    assert data["name"] == "Test Engineer"
    assert "id" in data

    # Verify HttpOnly session cookies were set
    cookies = res.cookies
    assert "access_token" in cookies
    assert "refresh_token" in cookies


def test_multi_tenant_problem_isolation():
    """Verify that User A cannot see or delete User B's problems."""
    client_a = TestClient(app)
    user_a = f"alice_{uuid.uuid4().hex[:8]}"
    res_a = client_a.post(
        "/api/auth/register",
        json={"username": user_a, "name": "Alice Developer", "password": "Password123!"},
    )
    assert res_a.status_code == 201

    # User A creates a problem
    prob_a_res = client_a.post(
        "/api/problems",
        json={
            "title": "Alice Private Memory Leak",
            "description": "High memory consumption in Alice cache service.",
            "language": "python",
            "agent_count": 3,
        },
    )
    assert prob_a_res.status_code == 201
    prob_a_id = prob_a_res.json()["id"]

    # User B registers on a separate client
    client_b = TestClient(app)
    user_b = f"bob_{uuid.uuid4().hex[:8]}"
    res_b = client_b.post(
        "/api/auth/register",
        json={"username": user_b, "name": "Bob Architect", "password": "Password123!"},
    )
    assert res_b.status_code == 201

    # User B queries problem list -> MUST NOT see Alice's problem!
    list_b = client_b.get("/api/problems")
    assert list_b.status_code == 200
    b_problem_ids = [p["id"] for p in list_b.json()]
    assert prob_a_id not in b_problem_ids, "Security breach: User B can see User A's problem!"

    # User B attempts to access Alice's problem directly -> 404 Not Found
    get_b = client_b.get(f"/api/problems/{prob_a_id}")
    assert get_b.status_code == 404

    # User B attempts to delete Alice's problem -> 404 / Forbidden
    del_b = client_b.delete(f"/api/problems/{prob_a_id}")
    assert del_b.status_code in [403, 404], "Security breach: User B deleted User A's problem!"

    # Alice CAN delete her own problem
    del_a = client_a.delete(f"/api/problems/{prob_a_id}")
    assert del_a.status_code == 200


def test_session_refresh_and_logout():
    """Verify refresh endpoint rotates access token and logout purges cookies."""
    client = TestClient(app)
    user = f"charlie_{uuid.uuid4().hex[:8]}"
    client.post(
        "/api/auth/register",
        json={"username": user, "name": "Charlie", "password": "Password123!"},
    )

    # Refresh session
    refresh_res = client.post("/api/auth/refresh")
    assert refresh_res.status_code == 200
    assert "access_token" in refresh_res.cookies

    # Profile lookup
    me_res = client.get("/api/auth/me")
    assert me_res.status_code == 200
    assert me_res.json()["username"] == user

    # Logout
    logout_res = client.post("/api/auth/logout")
    assert logout_res.status_code == 200

    # Unauthenticated request fails with 401
    me_after = client.get("/api/auth/me")
    assert me_after.status_code == 401


def test_reset_all_problems_to_pending():
    """Verify that POST /api/problems/reset-all resets user problems to PENDING."""
    client = TestClient(app)
    user = f"dave_{uuid.uuid4().hex[:8]}"
    client.post(
        "/api/auth/register",
        json={"username": user, "name": "Dave", "password": "Password123!"},
    )

    # Create problem
    prob_res = client.post(
        "/api/problems",
        json={"title": "Dave Problem to Reset", "description": "Needs resetting test."},
    )
    assert prob_res.status_code == 201

    # Call reset-all
    reset_res = client.post("/api/problems/reset-all")
    assert reset_res.status_code == 200
    assert reset_res.json()["count"] >= 1

    # Verify problem is PENDING
    problems_res = client.get("/api/problems")
    assert problems_res.status_code == 200
    for p in problems_res.json():
        assert p["status"] == "PENDING"
        assert p["solution_patch"] is None
