from django.urls import include, path
from rest_framework.routers import DefaultRouter

from quizzes.views import (
    MyAttemptsView,
    QuizViewSet,
    SubmitAttemptView,
    TeacherAttemptsView,
    QuizGenerationView,
    ReportFraudView,  # <-- AJOUT DE L'IMPORT ICI
    RevisionPlanView,
)

router = DefaultRouter()
router.register("", QuizViewSet, basename="quiz")

urlpatterns = [
    path("generate/", QuizGenerationView.as_view(), name="quiz-generate"),
    path("attempts/mine/", MyAttemptsView.as_view(), name="my-attempts"),
    path("attempts/teacher/", TeacherAttemptsView.as_view(), name="teacher-attempts"),
    path(
        "attempts/<int:attempt_id>/submit/",
        SubmitAttemptView.as_view(),
        name="submit-attempt",
    ),
    path(
        "attempts/<int:attempt_id>/revision-plan/",
        RevisionPlanView.as_view(),
        name="revision-plan",
    ),
    # La nouvelle route pour la fraude doit être DANS la liste urlpatterns
    path("<int:quiz_id>/report-fraud/", ReportFraudView.as_view(), name="report-fraud"),
    # On garde le router en dernier
    path("", include(router.urls)),
]