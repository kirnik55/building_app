# backend/tests/test_comments.py
import pytest
from rest_framework import status


@pytest.mark.django_db
def test_comment_author_is_request_user(api_client, defect, user_engineer, auth_headers):
    """
    Должен создаваться комментарий к дефекту от имени текущего пользователя.
    """
    client = auth_headers(api_client, user_engineer)

    payload = {
        "defect": str(defect.id),                 # ВАЖНО: передаём id дефекта
        "text": "Автотестовый комментарий"
    }

    resp = client.post("/api/comments/", payload, format="json")
    assert resp.status_code == status.HTTP_201_CREATED, resp.data

    # Проверяем, что комментарий привязался к нужному дефекту,
    # и автор выставился как текущий пользователь.
    assert resp.data["defect"] == str(defect.id)

    # В зависимости от сериализатора author может быть строкой UUID
    # или объектом { "id": "<uuid>", ... }. Поддержим оба варианта.
    author_value = resp.data.get("author")
    if isinstance(author_value, dict):
        assert author_value.get("id") == str(user_engineer.id)
    else:
        assert author_value == str(user_engineer.id)
