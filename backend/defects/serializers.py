# backend/defects/serializers.py
from rest_framework import serializers
from .models import Defect, Comment, Attachment


class DefectSerializer(serializers.ModelSerializer):
    """
    Сериализатор дефектов.
    created_by заполняется автоматически из request.user.
    В ответе приводим UUID-поля к строкам.
    """
    class Meta:
        model = Defect
        fields = (
            "id",
            "project",
            "title",
            "description",
            "priority",
            "status",
            "assignee",
            "created_by",
            "due_date",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("created_by", "created_at", "updated_at")

    def create(self, validated_data):
        if "created_by" not in validated_data:
            req = self.context.get("request")
            if req and req.user and req.user.is_authenticated:
                validated_data["created_by"] = req.user
        return super().create(validated_data)

    def to_representation(self, instance):
        data = super().to_representation(instance)
        # приводим UUID к строкам
        data["id"] = str(instance.id)
        if instance.project_id:
            data["project"] = str(instance.project_id)
        else:
            data["project"] = None
        if instance.assignee_id:
            data["assignee"] = str(instance.assignee_id)
        else:
            data["assignee"] = None
        if instance.created_by_id:
            data["created_by"] = str(instance.created_by_id)
        else:
            data["created_by"] = None
        return data


class CommentSerializer(serializers.ModelSerializer):
    """
    Комментарии к дефектам.
    - defect: на входе PK (UUID) — write_only; на выходе — строка UUID.
    - author: только чтение, строка UUID (author_id).
    """
    defect = serializers.PrimaryKeyRelatedField(queryset=Defect.objects.all(), write_only=True)
    author = serializers.UUIDField(read_only=True, source="author_id")

    class Meta:
        model = Comment
        fields = ("id", "defect", "text", "author", "created_at")
        read_only_fields = ("author", "created_at")

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data["id"] = str(instance.id)
        data["defect"] = str(instance.defect_id)
        return data


class AttachmentSerializer(serializers.ModelSerializer):
    """
    Вложения к дефекту.
    """
    defect = serializers.PrimaryKeyRelatedField(queryset=Defect.objects.all())

    class Meta:
        model = Attachment
        fields = ("id", "defect", "file", "filename", "size_bytes", "uploaded_at")
        read_only_fields = ("uploaded_at",)

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data["id"] = str(instance.id)
        data["defect"] = str(instance.defect_id)
        return data
