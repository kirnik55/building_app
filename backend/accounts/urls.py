from django.urls import path
from .views import me, health, UsersView

urlpatterns = [
    path("me/", me, name="me"),
    path("health/", health, name="auth-health"),
    path("users/", UsersView.as_view(), name="users"),
]
