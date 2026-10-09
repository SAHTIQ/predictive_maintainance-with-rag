import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.database.session import SessionLocal
from backend.app.models.entities import User
from backend.app.utils.security import hash_password, verify_password

client = TestClient(app)

def test_password_hashing_utility():
    pw = "SuperSecret2026!"
    hashed = hash_password(pw)
    assert hashed != pw
    assert "$" in hashed
    assert verify_password(pw, hashed) is True
    assert verify_password("WrongPassword!", hashed) is False

def test_get_current_user_profile():
    res = client.get("/api/v1/users/me")
    assert res.status_code == 200
    data = res.json()
    assert "email" in data
    assert "full_name" in data
    assert "hashed_password" not in data  # Never expose password hashes
    assert data["account_status"] == "Active"
    assert data["auth_provider"] == "Resonex Local Identity"

def test_update_user_profile():
    # 1. Update personal details
    update_payload = {
        "full_name": "Mark A. Jenkins",
        "display_name": "Shift Lead Mark",
        "phone_number": "+1 (555) 999-4321",
        "job_title": "Senior Reliability Engineer",
        "department": "Plant Reliability & AI Diagnostics",
        "plant_assignment": "Facility Alpha - Advanced Spinning",
        "preferred_language": "en"
    }
    patch_res = client.patch("/api/v1/users/me", json=update_payload)
    assert patch_res.status_code == 200
    updated_data = patch_res.json()
    assert updated_data["full_name"] == "Mark A. Jenkins"
    assert updated_data["display_name"] == "Shift Lead Mark"
    assert updated_data["job_title"] == "Senior Reliability Engineer"

    # 2. Verify invalid short full name
    bad_res = client.patch("/api/v1/users/me", json={"full_name": "M"})
    assert bad_res.status_code in [400, 422]

    # 3. Verify invalid email format
    bad_email_res = client.patch("/api/v1/users/me", json={"email": "not-an-email"})
    assert bad_email_res.status_code == 400

def test_user_preferences():
    # 1. Get preferences
    get_res = client.get("/api/v1/users/me/preferences")
    assert get_res.status_code == 200

    # 2. Update preferences
    pref_payload = {
        "theme": "dark",
        "preferred_dashboard": "/machines",
        "email_alerts": False,
        "critical_push": True,
        "sound_effects": True
    }
    patch_res = client.patch("/api/v1/users/me/preferences", json=pref_payload)
    assert patch_res.status_code == 200
    saved_prefs = patch_res.json()
    assert saved_prefs["preferred_dashboard"] == "/machines"
    assert saved_prefs["email_alerts"] is False
    assert saved_prefs["critical_push"] is True

def test_change_password_flow():
    # 1. Mismatched passwords
    mismatch_res = client.post("/api/v1/users/me/change-password", json={
        "current_password": "Operator@2026!",
        "new_password": "NewSecret2026!",
        "confirm_password": "DifferentPassword!"
    })
    assert mismatch_res.status_code == 400
    assert "match" in mismatch_res.json()["detail"].lower()

    # 2. Too short password
    short_res = client.post("/api/v1/users/me/change-password", json={
        "current_password": "Operator@2026!",
        "new_password": "short",
        "confirm_password": "short"
    })
    assert short_res.status_code in [400, 422]

    # 3. Wrong current password
    wrong_curr_res = client.post("/api/v1/users/me/change-password", json={
        "current_password": "WrongCurrentPassword123!",
        "new_password": "NewValidSecret2026!",
        "confirm_password": "NewValidSecret2026!"
    })
    assert wrong_curr_res.status_code == 400
    assert "incorrect" in wrong_curr_res.json()["detail"].lower()

    # 4. Correct change
    correct_res = client.post("/api/v1/users/me/change-password", json={
        "current_password": "Operator@2026!",
        "new_password": "NewValidSecret2026!",
        "confirm_password": "NewValidSecret2026!"
    })
    assert correct_res.status_code == 200
    assert correct_res.json()["success"] is True

    # 5. Reset back to Operator@2026!
    reset_res = client.post("/api/v1/users/me/change-password", json={
        "current_password": "NewValidSecret2026!",
        "new_password": "Operator@2026!",
        "confirm_password": "Operator@2026!"
    })
    assert reset_res.status_code == 200

def test_sign_out_endpoint():
    res = client.post("/api/v1/users/me/sign-out")
    assert res.status_code == 200
    assert res.json()["success"] is True
