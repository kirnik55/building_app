import pytest
from rest_framework import status
from defects.models import Defect, Status, Priority

@pytest.mark.django_db
def test_engineer_sees_only_own_defects(api_client, user_engineer, user_engineer_2, project, user_manager, auth_headers):
    """
    Инженер должен видеть ТОЛЬКО дефекты, назначенные на него.
    """
    # создаём два дефекта: один на engineer, второй на engineer_2
    d1 = Defect.objects.create(
        project=project,
        title="1",
        priority=Priority.LOW,
        status=Status.NEW,
        assignee=user_engineer,
        created_by=user_manager,
    )
    d2 = Defect.objects.create(
        project=project,
        title="2",
        priority=Priority.LOW,
        status=Status.NEW,
        assignee=user_engineer_2,
        created_by=user_manager,
    )

    client = auth_headers(api_client, user_engineer)
    resp = client.get("/api/defects/")
    assert resp.status_code == status.HTTP_200_OK, resp.data

    # Если включена пагинация — берём results, иначе сам список
    payload = resp.data.get("results", resp.data)
    returned_ids = {str(item["id"]) for item in payload}

    # Сравниваем строки, а не UUID-объекты
    assert str(d1.id) in returned_ids
    assert str(d2.id) not in returned_ids
