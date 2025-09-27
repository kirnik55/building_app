from rest_framework import viewsets, mixins
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from .models import Defect, Comment, Attachment, Status
from .serializers import DefectSerializer, CommentSerializer, AttachmentSerializer
from .permissions import DefectPermission

class DefectViewSet(viewsets.ModelViewSet):
    queryset = Defect.objects.select_related("project","assignee","created_by")
    serializer_class = DefectSerializer
    permission_classes = [DefectPermission]
    filterset_fields = ["project","priority","status","assignee"]
    search_fields = ["title","description"]
    ordering_fields = ["created_at","priority","due_date"]

    @action(detail=False, methods=["get"])
    def resolved(self, request):
        qs = self.filter_queryset(self.get_queryset().filter(status=Status.RESOLVED))
        page = self.paginate_queryset(qs)
        ser = self.get_serializer(page or qs, many=True)
        return self.get_paginated_response(ser.data) if page is not None else Response(ser.data)

class CommentViewSet(mixins.CreateModelMixin, mixins.ListModelMixin, viewsets.GenericViewSet):
    queryset = Comment.objects.select_related("defect","author")
    serializer_class = CommentSerializer
    def perform_create(self, serializer):
        serializer.save(author=self.request.user)

class AttachmentViewSet(mixins.CreateModelMixin, mixins.DestroyModelMixin, mixins.ListModelMixin, viewsets.GenericViewSet):
    queryset = Attachment.objects.select_related("defect")
    serializer_class = AttachmentSerializer
    parser_classes = [MultiPartParser, FormParser]
