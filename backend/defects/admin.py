from django.contrib import admin
from .models import Defect, Comment, Attachment
admin.site.register(Defect)
admin.site.register(Comment)
admin.site.register(Attachment)
