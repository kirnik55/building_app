# backend/accounts/views.py
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def me(request):
    """
    Возвращает сведения о текущем пользователе для фронтенда.
    Поле role может называться по-другому в твоей модели — подстроимcя.
    """
    user = request.user
    # пытаемся взять роль из нескольких возможных мест
    role = (
        getattr(user, "role", None)
        or getattr(user, "user_role", None)
        or "user"
    )
    return Response({
        "id": str(user.pk),
        "email": getattr(user, "email", ""),
        "role": role,
    })
