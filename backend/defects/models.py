import uuid
from django.conf import settings
from django.db import models
from projects.models import Project

class Priority(models.TextChoices):
    LOW="low","Низкий"
    MEDIUM="medium","Средний"
    HIGH="high","Высокий"
    CRITICAL="critical","Критический"

class Status(models.TextChoices):
    NEW="new","Новая"
    IN_PROGRESS="in_progress","В работе"
    VERIFY="verify","На проверке"
    RESOLVED="resolved","Закрыта"
    CANCELED="canceled","Отменена"

class Defect(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="defects")
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    priority = models.CharField(max_length=10, choices=Priority.choices, default=Priority.MEDIUM)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.NEW)
    assignee = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True,
                                 on_delete=models.SET_NULL, related_name="assigned_defects")
    due_date = models.DateField(null=True, blank=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT,
                                   related_name="created_defects")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

class Comment(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    defect = models.ForeignKey(Defect, on_delete=models.CASCADE, related_name="comments")
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    text = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

class Attachment(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    defect = models.ForeignKey(Defect, on_delete=models.CASCADE, related_name="attachments")
    file = models.FileField(upload_to="attachments/")
    filename = models.CharField(max_length=255, blank=True)
    size_bytes = models.IntegerField(null=True, blank=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def save(self,*a,**kw):
        if self.file and not self.filename: self.filename = self.file.name
        if self.file and not self.size_bytes: self.size_bytes = getattr(self.file,"size",None)
        super().save(*a,**kw)
