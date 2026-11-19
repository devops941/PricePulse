import pytest
from fastapi.testclient import TestClient
from app.main import create_app
from app.core.database import get_db, create_all_indexes
from app.core.security import hash_password
from app.repositories.all_repositories import UserRepository


@pytest.fixture
def client():
    app = create_app()
    with TestClient(app) as c:
        yield c


@pytest.fixture(autouse=True)
def setup_auth_db():
    db = get_db()
    create_all_indexes(db)
    db.users.delete_many({})
    user_repo = UserRepository()
    
    # Create Admin user
    user_repo.insert({
        "email": "admin@pricepulse.local",
        "name": "System Admin",
        "role": "Admin",
        "password_hash": hash_password("AdminPass@123"),
        "status": "active",
        "must_change_password": False,
        "market_ids": []
    })

    # Create Collector user
    user_repo.insert({
        "email": "collector@pricepulse.local",
        "name": "Local Collector",
        "role": "Collector",
        "password_hash": hash_password("CollectorPass@123"),
        "status": "active",
        "must_change_password": True,
        "market_ids": ["MKT-1", "MKT-2"]
    })
    yield db


def test_login_success_and_tokens(client):
    res = client.post("/api/v1/auth/login", json={
        "email": "admin@pricepulse.local",
        "password": "AdminPass@123"
    })
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["user"]["email"] == "admin@pricepulse.local"
    assert data["user"]["role"] == "Admin"


def test_login_invalid_password(client):
    res = client.post("/api/v1/auth/login", json={
        "email": "admin@pricepulse.local",
        "password": "WrongPassword@123"
    })
    assert res.status_code == 401
    assert res.json()["error"]["code"] == "INVALID_CREDENTIALS"


def test_role_guard_blocks_collector_from_admin_route(client):
    # Log in as collector
    c_res = client.post("/api/v1/auth/login", json={
        "email": "collector@pricepulse.local",
        "password": "CollectorPass@123"
    })
    token = c_res.json()["access_token"]

    # Collector attempts to register a new user
    res = client.post(
        "/api/v1/auth/users",
        json={"email": "new@pricepulse.local", "name": "New User", "role": "Viewer"},
        headers={"Authorization": f"Bearer {token}"}
    )
    assert res.status_code == 403
    assert res.json()["error"]["code"] == "FORBIDDEN"


def test_admin_registers_new_user(client):
    # Log in as admin
    a_res = client.post("/api/v1/auth/login", json={
        "email": "admin@pricepulse.local",
        "password": "AdminPass@123"
    })
    admin_token = a_res.json()["access_token"]

    # Admin registers analyst
    res = client.post(
        "/api/v1/auth/users",
        json={
            "email": "analyst@pricepulse.local",
            "name": "Econ Analyst",
            "role": "Analyst",
            "temporary_password": "TempPassword@123"
        },
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert res.status_code == 200
    user_data = res.json()
    assert user_data["email"] == "analyst@pricepulse.local"
    assert user_data["must_change_password"] is True


def test_token_refresh(client):
    res = client.post("/api/v1/auth/login", json={
        "email": "admin@pricepulse.local",
        "password": "AdminPass@123"
    })
    refresh_token = res.json()["refresh_token"]

    ref_res = client.post("/api/v1/auth/refresh", json={"refresh_token": refresh_token})
    assert ref_res.status_code == 200
    assert "access_token" in ref_res.json()


def test_password_change_flow(client):
    # Collector logs in
    c_res = client.post("/api/v1/auth/login", json={
        "email": "collector@pricepulse.local",
        "password": "CollectorPass@123"
    })
    token = c_res.json()["access_token"]
    assert c_res.json()["must_change_password"] is True

    # Change password
    chg_res = client.post(
        "/api/v1/auth/change-password",
        json={
            "current_password": "CollectorPass@123",
            "new_password": "BrandNewSecurePassword@2026"
        },
        headers={"Authorization": f"Bearer {token}"}
    )
    assert chg_res.status_code == 200

    # Old password fails
    fail_res = client.post("/api/v1/auth/login", json={
        "email": "collector@pricepulse.local",
        "password": "CollectorPass@123"
    })
    assert fail_res.status_code == 401

    # New password succeeds and must_change_password is False
    succ_res = client.post("/api/v1/auth/login", json={
        "email": "collector@pricepulse.local",
        "password": "BrandNewSecurePassword@2026"
    })
    assert succ_res.status_code == 200
    assert succ_res.json()["must_change_password"] is False
