import pytest
from rest_framework import status

@pytest.mark.django_db
def test_manager_can_assign(api_client, defect, user_manager, user_engineer_2, auth_headers):
    client = auth_headers(api_client, user_manager)

    resp = client.patch(
        f"/api/defects/{defect.id}/assign/",
        {"assignee": str(user_engineer_2.id)},     # <-- отправляем строку
        format="json",
    )
    assert resp.status_code == status.HTTP_200_OK, resp.data
    assert resp.data["assignee"] == str(user_engineer_2.id)  # <-- сравниваем со строкой
