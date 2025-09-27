from rest_framework.permissions import BasePermission, SAFE_METHODS

class DefectPermission(BasePermission):
    def has_permission(self, request, view):
        # чтение всем аутентифицированным, запись — тоже (упростим на старте)
        return request.user and request.user.is_authenticated

    def has_object_permission(self, request, view, obj):
        return self.has_permission(request, view)
