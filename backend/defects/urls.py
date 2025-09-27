from rest_framework.routers import DefaultRouter
from django.urls import path, include
from .views import DefectViewSet, CommentViewSet, AttachmentViewSet

router = DefaultRouter()
router.register(r"defects", DefectViewSet, basename="defect")
router.register(r"comments", CommentViewSet, basename="comment")
router.register(r"attachments", AttachmentViewSet, basename="attachment")

urlpatterns = [path("", include(router.urls))]
