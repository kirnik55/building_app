

from typing import Any
auth_headers: Any  # for pylance
client: Any        # если тоже ругается
from defects.models import Defect, Priority, Status

def test_reports_summary_count(api_client, project, user_manager, user_engineer,auth_headers):
    # создадим 3 дефекта: 2 NEW, 1 RESOLVED
    Defect.objects.create(project=project, title="A", priority=Priority.MEDIUM, status=Status.NEW,
                          created_by=user_manager, assignee=user_engineer)
    Defect.objects.create(project=project, title="B", priority=Priority.MEDIUM, status=Status.NEW,
                          created_by=user_manager, assignee=user_engineer)
    Defect.objects.create(project=project, title="C", priority=Priority.MEDIUM, status=Status.RESOLVED,
                          created_by=user_manager, assignee=user_engineer)

    client = auth_headers(api_client, user_manager)
    resp = client.get("/api/reports/summary/", {"project": str(project.id)})
    assert resp.status_code == 200
    assert resp.data["total"] == 3

    by_status = {row["status"]: row["count"] for row in resp.data["by_status"]}
    assert by_status["new"] == 2
    assert by_status["resolved"] == 1
