from django.urls import include, path
from rest_framework.routers import DefaultRouter

from courses.views import (
    CompleteLessonView,
    CourseViewSet,
    MyEnrollmentsView,
    CoursePodcastView,
    CourseTranslationView,
    CourseFlashcardsView,
)

router = DefaultRouter()
router.register("", CourseViewSet, basename="course")

urlpatterns = [
    path("", include(router.urls)),
    path("enrollments/mine/", MyEnrollmentsView.as_view(), name="my-enrollments"),
    path(
        "<int:course_id>/lessons/<int:lesson_id>/complete/",
        CompleteLessonView.as_view(),
        name="complete-lesson",
    ),
    path("<int:course_id>/podcast/", CoursePodcastView.as_view(), name="course-podcast"),
    path(
        "<int:course_id>/translate/",
        CourseTranslationView.as_view(),
        name="translate-course",
    ),
    path(
        "<int:course_id>/flashcards/",
        CourseFlashcardsView.as_view(),
        name="course-flashcards",
    ),
]