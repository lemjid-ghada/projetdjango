from django.urls import path

from chatbot.views import (
    ChatbotMessageView,
    ChatMessagesView,
    ChatSessionDeleteView,
    ChatSessionListCreateView,
    StudentCommandView,
    StudyPlannerView,
)


urlpatterns = [
    path("message/", ChatbotMessageView.as_view(), name="chatbot-message"),
    path("command/", StudentCommandView.as_view(), name="student-command"),
    path("planner/", StudyPlannerView.as_view(), name="study-planner"),
    path("sessions/", ChatSessionListCreateView.as_view(), name="chat-sessions"),
    path(
        "sessions/<int:session_id>/messages/",
        ChatMessagesView.as_view(),
        name="chat-messages",
    ),
    path(
        "sessions/<int:session_id>/",
        ChatSessionDeleteView.as_view(),
        name="chat-session-delete",
    ),
]
