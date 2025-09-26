from django.contrib import admin
from django.urls import path
from django.http import JsonResponse


def health(_request):
    return JsonResponse({"status": "ok"})


urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/health", health),         # без слэша в конце
    # можно и так, если хочешь со слэшем: path("api/health/", health),
]
