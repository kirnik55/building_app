from django.http import JsonResponse
from rest_framework import generics, filters, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response

from .models import User, Roles
from .serializers import (
    MeSerializer,
    UserShortSerializer,
    CreateUserSerializer,
)


# ---- /api/auth/health  (служебно)
@api_view(["GET"])
@permission_classes([AllowAny])
def health(_request):
    return JsonResponse({"status": "ok"})


# ---- /api/auth/me/  (текущий пользователь)
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def me(request):
    return Response(MeSerializer(request.user).data)


class IsManagerOrAdmin(permissions.BasePermission):
    """
    Для POST на /api/auth/users/ разрешаем только менеджеру/админу.
    GET остаётся для всех аутентифицированных.
    """

    def has_permission(self, request, view):
        if request.method == "POST":
            user = request.user
            return bool(
                user
                and user.is_authenticated
                and user.role in {Roles.MANAGER, Roles.ADMIN}
            )
        return request.user and request.user.is_authenticated


# ---- /api/auth/users/  (GET список, POST создать инженера)
class UsersView(generics.ListCreateAPIView):
    """
    GET  /api/auth/users/?role=engineer   -> список пользователей (с поиском)
    POST /api/auth/users/  {email, name, password, role?}
         - роль принудительно выставим 'engineer', игнорируя то, что прислал фронт
    """
    queryset = User.objects.all().order_by("-created_at")
    filter_backends = [filters.SearchFilter]
    search_fields = ["email", "name"]
    permission_classes = [IsManagerOrAdmin]

    def get_queryset(self):
        qs = super().get_queryset()
        role = self.request.query_params.get("role")
        if role in {Roles.ENGINEER, Roles.MANAGER, Roles.LEAD, Roles.ADMIN}:
            qs = qs.filter(role=role)
        return qs

    def get_serializer_class(self):
        # На чтение — короткий сериализатор, на создание — CreateUser
        if self.request.method == "POST":
            return CreateUserSerializer
        return UserShortSerializer

    def perform_create(self, serializer):
        # Принудительно создаём инженера, чтобы никто не мог выдать себе роль
        serializer.save(role=Roles.ENGINEER)
