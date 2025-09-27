from rest_framework import serializers
from .models import Defect, Comment, Attachment

class AttachmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Attachment
        fields = ("id","filename","size_bytes","uploaded_at","file")

class CommentSerializer(serializers.ModelSerializer):
    author_name = serializers.CharField(source="author.name", read_only=True)
    class Meta:
        model = Comment
        fields = ("id","author","author_name","text","created_at")
        read_only_fields = ("author",)

class DefectSerializer(serializers.ModelSerializer):
    attachments = AttachmentSerializer(many=True, read_only=True)
    comments = CommentSerializer(many=True, read_only=True)
    class Meta:
        model = Defect
        fields = ("id","project","title","description","priority","status",
                  "assignee","due_date","created_by","created_at","updated_at",
                  "attachments","comments")
        read_only_fields = ("created_by","created_at","updated_at")

    def create(self, validated_data):
        validated_data["created_by"] = self.context["request"].user
        return super().create(validated_data)
