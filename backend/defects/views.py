from datetime import datetime

from django.db.models import Count
from rest_framework import viewsets, mixins
from rest_framework.decorators import action
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Defect, Comment, Attachment, Status
from .serializers import DefectSerializer, CommentSerializer, AttachmentSerializer
from .permissions import DefectPermission


class DefectViewSet(viewsets.ModelViewSet):
    """
    CRUD по дефектам + /defects/resolved/
    """
    queryset = Defect.objects.select_related("project", "assignee", "created_by")
    serializer_class = DefectSerializer
    permission_classes = [DefectPermission]
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


class CommentViewSet(mixins.CreateModelMixin,
                     mixins.ListModelMixin,
                     viewsets.GenericViewSet):
    """
    Комментарии к дефектам
    """
    queryset = Comment.objects.select_related("defect", "author").order_by("-created_at")
    serializer_class = CommentSerializer

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)


class AttachmentViewSet(mixins.CreateModelMixin,
                        mixins.DestroyModelMixin,
                        mixins.ListModelMixin,
                        viewsets.GenericViewSet):
    """
    Файлы/фото к дефектам
    """
    queryset = Attachment.objects.select_related("defect").order_by("-uploaded_at")
    serializer_class = AttachmentSerializer
    parser_classes = [MultiPartParser, FormParser]

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
