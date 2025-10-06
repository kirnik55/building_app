# backend/defects/views.py
from datetime import datetime
import logging

from django.db.models import Count
from rest_framework import viewsets, mixins, status
from rest_framework.decorators import action
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Defect, Comment, Attachment, Status
from .serializers import DefectSerializer, CommentSerializer, AttachmentSerializer
from .permissions import DefectPermission

# для проверки ролей при назначении
from accounts.models import User, Roles

logger = logging.getLogger(__name__)


class DefectViewSet(viewsets.ModelViewSet):
    """
    CRUD по дефектам + /defects/resolved/ + /defects/<id>/assign/
    """
    queryset = (
        Defect.objects
        .select_related("project", "assignee", "created_by")
    )
    serializer_class = DefectSerializer
    # Требуем авторизацию и наши объектные права
    permission_classes = [IsAuthenticated, DefectPermission]
    filterset_fields = ["project", "priority", "status", "assignee"]
    search_fields = ["title", "description"]
    ordering_fields = ["created_at", "priority", "due_date"]

    @action(detail=False, methods=["get"])
    def resolved(self, request):
        qs = self.filter_queryset(self.get_queryset().filter(status=Status.RESOLVED))
        page = self.paginate_queryset(qs)
        ser = self.get_serializer(page or qs, many=True)
        return (
            self.get_paginated_response(ser.data)
            if page is not None
            else Response(ser.data)
        )

    @action(detail=True, methods=["patch"], url_path="assign")
    def assign(self, request, pk=None):
        """
        PATCH /api/defects/<id>/assign/
        Тело: {"assignee": "<uuid инженера>"}  (или null/"" чтобы снять назначение)

        Доступ: менеджер / руководитель (lead) / админ.
        """
        defect = self.get_object()

        # простая проверка роли
        role = getattr(request.user, "role", None)
        if role not in {Roles.MANAGER, Roles.LEAD, Roles.ADMIN}:
            return Response({"detail": "Недостаточно прав."}, status=status.HTTP_403_FORBIDDEN)

        assignee_id = request.data.get("assignee")

        if not assignee_id:
            # снимаем назначение
            prev = defect.assignee_id
            defect.assignee = None
            defect.save(update_fields=["assignee"])
            logger.info("User %s unassigned engineer from defect %s (prev=%s)",
                        request.user.id, defect.id, prev)
            return Response(DefectSerializer(defect, context={"request": request}).data)

        try:
            engineer = User.objects.get(pk=assignee_id, role=Roles.ENGINEER)
        except User.DoesNotExist:
            return Response({"detail": "Инженер не найден."}, status=status.HTTP_400_BAD_REQUEST)

        defect.assignee = engineer
        defect.save(update_fields=["assignee"])

        logger.info("User %s assigned engineer %s to defect %s",
                    request.user.id, engineer.id, defect.id)

        return Response(DefectSerializer(defect, context={"request": request}).data)


class CommentViewSet(mixins.CreateModelMixin,
                     mixins.ListModelMixin,
                     viewsets.GenericViewSet):
    """
    Комментарии к дефектам
    """
    queryset = (
        Comment.objects
        .select_related("defect", "author")
        .order_by("-created_at")
    )
    serializer_class = CommentSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)


class AttachmentViewSet(mixins.CreateModelMixin,
                        mixins.DestroyModelMixin,
                        mixins.ListModelMixin,
                        viewsets.GenericViewSet):
    """
    Файлы/фото к дефектам
    """
    queryset = (
        Attachment.objects
        .select_related("defect")
        .order_by("-uploaded_at")
    )
    serializer_class = AttachmentSerializer
    parser_classes = [MultiPartParser, FormParser]
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        # uploaded_at ставится автоматически в модели
        serializer.save()


# ----------------------  ОТЧЁТЫ  ----------------------

class ReportsSummaryView(APIView):
    """
    GET /api/reports/summary/?project=<id>&date_from=YYYY-MM-DD&date_to=YYYY-MM-DD

    Ответ:
    {
      "total": 12,
      "by_status": [{"status":"new","count":5}, ...],
      "by_priority": [{"priority":"medium","count":7}, ...],
      "by_project": [{"project_id":"...","project_name":"Офис ...","count":8}, ...]
    }
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = Defect.objects.all()

        project_id = request.query_params.get("project")
        if project_id:
            qs = qs.filter(project_id=project_id)

        def parse_date(s):
            try:
                return datetime.strptime(s, "%Y-%m-%d").date()
            except Exception:
                return None

        date_from = parse_date(request.query_params.get("date_from", ""))
        date_to = parse_date(request.query_params.get("date_to", ""))

        if date_from:
            qs = qs.filter(created_at__date__gte=date_from)
        if date_to:
            qs = qs.filter(created_at__date__lte=date_to)

        total = qs.count()
        by_status = list(qs.values("status").annotate(count=Count("id")).order_by("status"))
        by_priority = list(qs.values("priority").annotate(count=Count("id")).order_by("priority"))
        by_project_raw = list(
            qs.values("project__id", "project__name")
              .annotate(count=Count("id"))
              .order_by("project__name")
        )
        by_project = [
            {
                "project_id": r["project__id"],
                "project_name": r["project__name"],
                "count": r["count"],
            }
            for r in by_project_raw
        ]

        return Response({
            "total": total,
            "by_status": by_status,
            "by_priority": by_priority,
            "by_project": by_project,
        })
