from django.urls import path

from rag.views import (
    CourseDocumentDeleteView,
    CourseDocumentFileView,
    CourseDocumentListCreateView,
    CourseDocumentStatusView,
)


urlpatterns = [
    path(
        "courses/<int:course_id>/documents/",
        CourseDocumentListCreateView.as_view(),
        name="course-documents",
    ),
    path(
        "documents/<int:document_id>/",
        CourseDocumentDeleteView.as_view(),
        name="document-delete",
    ),
    path(
        "documents/<int:document_id>/status/",
        CourseDocumentStatusView.as_view(),
        name="document-status",
    ),
    path(
        "courses/<int:course_id>/documents/<int:document_id>/file/",
        CourseDocumentFileView.as_view(),
        name="course-document-file",
    ),
]
