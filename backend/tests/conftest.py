# backend/tests/conftest.py
import pytest
from datetime import timedelta
from django.utils import timezone
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import AccessToken

from projects.models import Project
from defects.models import Defect, Status, Priority

User = get_user_model()


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def auth_headers():
    """
    Фикстура-хелпер: авторизует APIClient под заданным пользователем.
    Использование:
        client = auth_headers(api_client, user)
        response = client.get("/api/...")
    """
    def _apply(client, user):
        token = str(AccessToken.for_user(user))
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
        return client
    return _apply


# ---------- пользователи ----------
@pytest.fixture
def user_engineer(db):
    return User.objects.create_user(
        email="eng1@example.com",
        password="pass12345",
        role="engineer",
        name="Инженер №1",
        is_active=True,
    )


@pytest.fixture
def user_engineer_2(db):
    return User.objects.create_user(
        email="eng2@example.com",
        password="pass12345",
        role="engineer",
        name="Инженер №2",
        is_active=True,
    )


@pytest.fixture
def user_manager(db):
    return User.objects.create_user(
        email="manager@example.com",
        password="pass12345",
        role="manager",
        name="Менеджер",
        is_active=True,
    )


@pytest.fixture
def user_lead(db):
    return User.objects.create_user(
        email="lead@example.com",
        password="pass12345",
        role="lead",
        name="Руководитель",
        is_active=True,
    )


# ---------- проекты ----------
@pytest.fixture
def project(db):
    return Project.objects.create(
        name="Офис на Остоженке",
        customer="ООО Ромашка",
        description="Основной объект",
    )


@pytest.fixture
def another_project(db):
    return Project.objects.create(
        name="Магазин на Беговой",
        customer="ООО Василёк",
        description="Второй объект",
    )


# ---------- дефекты ----------
@pytest.fixture
def defect_new(db, project, user_engineer, user_manager):
    return Defect.objects.create(
        project=project,
        title="Запотевание окна",
        description="Конденсат на стеклопакете",
        status=Status.NEW,
        priority=Priority.MEDIUM,
        due_date=timezone.now().date() + timedelta(days=7),
        created_by=user_manager,
        assignee=None,
    )


@pytest.fixture
def defect_in_progress(db, project, user_engineer, user_manager):
    return Defect.objects.create(
        project=project,
        title="Потеки по фасаду",
        description="Нарушение гидроизоляции",
        status=Status.IN_PROGRESS,
        priority=Priority.HIGH,
        due_date=timezone.now().date() + timedelta(days=3),
        created_by=user_manager,
        assignee=user_engineer,
    )


@pytest.fixture
def defect_other_engineer(db, project, user_engineer_2, user_manager):
    return Defect.objects.create(
        project=project,
        title="Скол плитки",
        description="Повреждение при монтаже",
        status=Status.IN_PROGRESS,
        priority=Priority.LOW,
        due_date=timezone.now().date() + timedelta(days=10),
        created_by=user_manager,
        assignee=user_engineer_2,
    )


@pytest.fixture
def defect(defect_new):
    return defect_new
