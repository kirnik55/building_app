from typing import Any
auth_headers: Any  # for pylance
client: Any        # если тоже ругается
def test_me_returns_user_role(api_client, user_manager,auth_headers):
    client = auth_headers(api_client, user_manager)
    resp = client.get("/api/auth/me/")
    assert resp.status_code == 200
    assert resp.data["email"] == user_manager.email
    assert resp.data["role"] == "manager"
