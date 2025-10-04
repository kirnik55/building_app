# backend/defects/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import DefectViewSet, CommentViewSet, AttachmentViewSet, ReportsSummaryView

router = DefaultRouter()
router.register(r"defects", DefectViewSet, basename="defect")
router.register(r"comments", CommentViewSet, basename="comment")
router.register(r"attachments", AttachmentViewSet, basename="attachment")

urlpatterns = [
    path("", include(router.urls)),
    path("reports/summary/", ReportsSummaryView.as_view(), name="reports-summary"),
]
