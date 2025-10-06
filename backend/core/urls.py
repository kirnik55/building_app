# backend/core/urls.py
from django.contrib import admin
from django.urls import path, include
from django.views.generic import RedirectView
from django.http import JsonResponse
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView


def health(_request):
    """Простейший health-check: /api/health"""
    return JsonResponse({"status": "ok"})


urlpatterns = [
    # Редирект с корня на API, чтобы не видеть 404 на /
    path("", RedirectView.as_view(url="/api/", permanent=False)),

    # Админка
    path("admin/", admin.site.urls),

    # Health
    path("api/health", health),

    # JWT (логин/обновление токена)
    path("api/auth/token/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("api/auth/token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),

    # Аккаунты (обязательно, чтобы работали /api/auth/me/ и /api/auth/users/)
    path("api/auth/", include("accounts.urls")),

    # Остальные приложения
    path("api/", include("projects.urls")),
    path("api/", include("defects.urls")),
]
