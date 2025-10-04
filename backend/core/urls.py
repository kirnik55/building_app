# backend/core/urls.py
from django.contrib import admin
from django.urls import path, include
from django.views.generic import RedirectView
from django.http import JsonResponse
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

def health(_request):
    return JsonResponse({"status": "ok"})

urlpatterns = [
    # 👉 вот этот редирект чинит 404 на корне
    path("", RedirectView.as_view(url="/api/", permanent=False)),

    path("admin/", admin.site.urls),
    path("api/health", health),

    # JWT
    path("api/auth/token/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("api/auth/token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),

    # ваши API
    path("api/", include("projects.urls")),
    path("api/", include("defects.urls")),
    # если у вас есть accounts/urls с /api/auth/me/ — оставьте:
    # path("api/auth/", include("accounts.urls")),
]
