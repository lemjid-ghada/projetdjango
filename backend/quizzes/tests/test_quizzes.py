import json

import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from core.models import Notification
from courses.models import Course, Enrollment
from quizzes.models import Quiz, QuizAttempt


User = get_user_model()


@pytest.fixture
def teacher(db):
    return User.objects.create_user(
        email="quiz.teacher@example.com",
        password="Strong-pass-123!",
        full_name="Quiz Teacher",
        role=User.Role.TEACHER,
    )


@pytest.fixture
def other_teacher(db):
    return User.objects.create_user(
        email="quiz.other@example.com",
        password="Strong-pass-123!",
        full_name="Other Quiz Teacher",
        role=User.Role.TEACHER,
    )


@pytest.fixture
def student(db):
    return User.objects.create_user(
        email="quiz.student@example.com",
        password="Strong-pass-123!",
        full_name="Quiz Student",
        role=User.Role.STUDENT,
    )


@pytest.fixture
def course(teacher):
    return Course.objects.create(
        teacher=teacher,
        title="Quiz course",
        description="A course for quiz tests.",
        category="Development",
        level=Course.Level.BEGINNER,
        is_published=True,
    )


def quiz_payload(course, title="Quiz", answer=1):
    return {
        "title": title,
        "courseId": course.id,
        "duration": 20,
        "passingScore": 50,
        "questions": [
            {
                "text": "Which option is correct?",
                "type": "multiple_choice",
                "options": ["Wrong", "Correct"],
                "correctAnswer": answer,
                "explanation": "The second answer is correct.",
            },
            {
                "text": "Is this statement true?",
                "type": "true_false",
                "options": ["Vrai", "Faux"],
                "correctAnswer": 0,
            },
        ],
    }


@pytest.mark.django_db
def test_teacher_can_create_nested_quiz(course, teacher):
    client = APIClient()
    client.force_authenticate(teacher)

    response = client.post(
        "/api/quizzes/",
        quiz_payload(course),
        format="json",
    )

    assert response.status_code == 201
    assert response.data["teacherId"] == teacher.id
    assert response.data["courseId"] == course.id
    assert response.data["questions"][0]["correctAnswer"] == 1
    assert response.data["questions"][0]["options"] == ["Wrong", "Correct"]
    assert response.data["attemptCount"] == 0
    quiz = Quiz.objects.get()
    assert quiz.questions.count() == 2
    assert quiz.questions.first().choices.filter(is_correct=True).count() == 1


@pytest.mark.django_db
def test_teacher_can_create_strict_mode_quiz(course, teacher):
    client = APIClient()
    client.force_authenticate(teacher)
    payload = quiz_payload(course)
    payload["strictMode"] = True

    response = client.post("/api/quizzes/", payload, format="json")

    assert response.status_code == 201
    assert response.data["strictMode"] is True
    assert Quiz.objects.get(pk=response.data["id"]).strict_mode is True


@pytest.mark.django_db
def test_final_quiz_requires_active_premium_to_start(course, teacher, student):
    quiz = Quiz.objects.create(
        teacher=teacher,
        course=course,
        title="Final exam",
        is_final=True,
    )
    Enrollment.objects.create(student=student, course=course)
    client = APIClient()
    anonymous = client.post(f"/api/quizzes/{quiz.id}/attempts/", {}, format="json")
    client.force_authenticate(student)

    denied = client.post(f"/api/quizzes/{quiz.id}/attempts/", {}, format="json")
    student.activate_premium(days=30)
    allowed = client.post(f"/api/quizzes/{quiz.id}/attempts/", {}, format="json")

    assert anonymous.status_code == 401
    assert denied.status_code == 403
    assert allowed.status_code == 201


@pytest.mark.django_db
def test_teacher_cannot_create_quiz_for_another_teachers_course(
    other_teacher,
    course,
):
    client = APIClient()
    client.force_authenticate(other_teacher)

    response = client.post(
        "/api/quizzes/",
        quiz_payload(course),
        format="json",
    )

    assert response.status_code == 400
    assert "courseId" in response.data["errors"]
    assert Quiz.objects.count() == 0


@pytest.mark.django_db
def test_teacher_can_update_nested_quiz_questions(course, teacher):
    client = APIClient()
    client.force_authenticate(teacher)
    create_response = client.post(
        "/api/quizzes/",
        quiz_payload(course),
        format="json",
    )
    quiz_id = create_response.data["id"]
    payload = quiz_payload(course, title="Updated quiz", answer=0)

    response = client.patch(
        f"/api/quizzes/{quiz_id}/",
        payload,
        format="json",
    )

    assert response.status_code == 200
    quiz = Quiz.objects.get(id=quiz_id)
    assert quiz.title == "Updated quiz"
    assert quiz.questions.count() == 2
    assert quiz.questions.first().choices.filter(is_correct=True).first().text == "Wrong"


@pytest.mark.django_db
def test_teacher_enabling_multiple_attempts_reopens_previously_closed_quiz(
    course,
    teacher,
):
    client = APIClient()
    client.force_authenticate(teacher)
    created = client.post("/api/quizzes/", quiz_payload(course), format="json")
    quiz = Quiz.objects.get(pk=created.data["id"])
    quiz.status = "closed"
    quiz.save(update_fields=["status"])
    payload = quiz_payload(course)
    payload["allowMultipleAttempts"] = True

    response = client.patch(
        f"/api/quizzes/{quiz.id}/",
        payload,
        format="json",
    )

    quiz.refresh_from_db()
    assert response.status_code == 200
    assert response.data["allowMultipleAttempts"] is True
    assert quiz.status == "active"


@pytest.mark.django_db
def test_ai_short_answer_falls_back_to_teacher_review_on_provider_failure(
    course,
    teacher,
    student,
    settings,
):
    settings.GROQ_API_KEY = ""
    payload = quiz_payload(course)
    payload["gradingMode"] = "AI"
    payload["questions"] = [
        {
            "text": "Explique la photosynthèse.",
            "type": "short_answer",
            "options": [],
            "modelAnswer": "Les plantes convertissent la lumière en énergie chimique.",
            "rubric": "Mentionner la lumière et la transformation en énergie.",
            "points": 2,
        }
    ]
    teacher_client = APIClient()
    teacher_client.force_authenticate(teacher)
    created = teacher_client.post("/api/quizzes/", payload, format="json")
    Enrollment.objects.create(student=student, course=course)
    student_client = APIClient()
    student_client.force_authenticate(student)
    started = student_client.post(
        f"/api/quizzes/{created.data['id']}/attempts/",
        {},
        format="json",
    )

    assert "modelAnswer" not in started.data["questions"][0]
    submitted = student_client.post(
        f"/api/attempts/{started.data['id']}/submit/",
        {
            "answers": [],
            "textAnswers": [
                {
                    "questionId": started.data["questions"][0]["id"],
                    "textAnswer": "Les plantes utilisent le soleil.",
                }
            ],
            "timeTaken": 2,
        },
        format="json",
    )

    assert created.status_code == 201
    assert submitted.status_code == 200
    assert submitted.data["needsReview"] is True
    assert submitted.data["review"][0]["needsReview"] is True
    assert submitted.data["review"][0]["textAnswer"] == "Les plantes utilisent le soleil."
    assert "relecture par l'enseignant" in submitted.data["review"][0]["aiFeedback"]
    assert QuizAttempt.objects.get().score == 0


@pytest.mark.django_db
def test_manual_grading_can_be_overridden_by_quiz_owner(
    course,
    teacher,
    student,
):
    payload = quiz_payload(course)
    payload["gradingMode"] = "MANUAL"
    payload["questions"] = [
        {
            "text": "Quelle est la couleur du ciel ?",
            "type": "multiple_choice",
            "options": ["Bleu", "Vert"],
            "correctAnswer": 0,
            "points": 2,
        }
    ]
    teacher_client = APIClient()
    teacher_client.force_authenticate(teacher)
    created = teacher_client.post("/api/quizzes/", payload, format="json")
    quiz = Quiz.objects.get(pk=created.data["id"])
    Enrollment.objects.create(student=student, course=course)
    student_client = APIClient()
    student_client.force_authenticate(student)
    started = student_client.post(f"/api/quizzes/{quiz.id}/attempts/", {}, format="json")
    submitted = student_client.post(
        f"/api/quizzes/attempts/{started.data['id']}/submit/",
        {"answers": [0], "timeTaken": 1},
        format="json",
    )

    pending = teacher_client.get(f"/api/quizzes/{quiz.id}/attempts/pending/")

    assert created.status_code == 201
    assert submitted.data["needsReview"] is True
    assert submitted.data["score"] == 0
    assert pending.status_code == 200
    assert len(pending.data) == 1
    answer_id = quiz.attempts.get().attempt_answers.get().id
    override = teacher_client.patch(
        f"/api/attempts/{started.data['id']}/answers/{answer_id}/override/",
        {"score": 2, "feedback": "Bonne réponse."},
        format="json",
    )

    quiz.attempts.get().refresh_from_db()
    assert override.status_code == 200
    assert override.data["teacherOverrideScore"] == 2
    assert override.data["needsReview"] is False
    assert quiz.attempts.get().score == 100
    assert quiz.attempts.get().needs_review is False


@pytest.mark.django_db
def test_ai_short_answer_uses_validated_provider_score(
    course,
    teacher,
    student,
    monkeypatch,
    settings,
):
    settings.GROQ_API_KEY = "test-key"

    class FakeGroq:
        def chat(self, *args, **kwargs):
            return '{"score": 1.5, "feedback": "Bonne explication."}'

    monkeypatch.setattr("quizzes.grading.GroqClient", FakeGroq)
    payload = quiz_payload(course)
    payload["gradingMode"] = "AI"
    payload["questions"] = [
        {
            "text": "Définis une variable.",
            "type": "short_answer",
            "options": [],
            "modelAnswer": "Un espace nommé qui contient une valeur.",
            "rubric": "Mentionner une valeur associée à un nom.",
            "points": 2,
        }
    ]
    teacher_client = APIClient()
    teacher_client.force_authenticate(teacher)
    created = teacher_client.post("/api/quizzes/", payload, format="json")
    Enrollment.objects.create(student=student, course=course)
    student_client = APIClient()
    student_client.force_authenticate(student)
    started = student_client.post(
        f"/api/quizzes/{created.data['id']}/attempts/",
        {},
        format="json",
    )
    submitted = student_client.post(
        f"/api/quizzes/attempts/{started.data['id']}/submit/",
        {
            "answers": [],
            "textAnswers": [
                {
                    "questionId": started.data["questions"][0]["id"],
                    "textAnswer": "Un nom qui référence une valeur.",
                }
            ],
            "timeTaken": 1,
        },
        format="json",
    )

    assert submitted.status_code == 200
    assert submitted.data["needsReview"] is False
    assert submitted.data["score"] == 75
    assert submitted.data["review"][0]["aiScore"] == 1.5
    assert submitted.data["review"][0]["aiFeedback"] == "Bonne explication."


@pytest.mark.django_db
def test_student_quiz_payload_never_contains_answer_key(course, teacher, student):
    teacher_client = APIClient()
    teacher_client.force_authenticate(teacher)
    teacher_client.post("/api/quizzes/", quiz_payload(course), format="json")
    Enrollment.objects.create(student=student, course=course)
    student_client = APIClient()
    student_client.force_authenticate(student)

    listing = student_client.get("/api/quizzes/")
    detail = student_client.get(f"/api/quizzes/{Quiz.objects.get().id}/")

    assert listing.status_code == 200
    question = listing.data["results"][0]["questions"][0]
    assert question["options"] == ["Wrong", "Correct"]
    assert "correctAnswer" not in question
    assert "explanation" not in question
    assert detail.status_code == 200
    assert "correctAnswer" not in detail.data["questions"][0]


@pytest.mark.django_db
def test_server_grades_attempt_and_returns_review_only_after_submit(
    course,
    teacher,
    student,
):
    teacher_client = APIClient()
    teacher_client.force_authenticate(teacher)
    teacher_client.post("/api/quizzes/", quiz_payload(course), format="json")
    quiz = Quiz.objects.get()
    Enrollment.objects.create(student=student, course=course)
    student_client = APIClient()
    student_client.force_authenticate(student)

    start = student_client.post(
        f"/api/quizzes/{quiz.id}/attempts/",
        {},
        format="json",
    )
    assert start.status_code == 201
    assert "correctAnswer" not in start.data["questions"][0]
    assert "explanation" not in start.data["questions"][0]

    submitted = student_client.post(
        f"/api/quizzes/attempts/{start.data['id']}/submit/",
        {"answers": [1, -1], "timeTaken": 3},
        format="json",
    )

    assert submitted.status_code == 200
    assert submitted.data["score"] == 50
    assert submitted.data["passed"] is True
    assert Quiz.objects.get().status == "active"
    assert submitted.data["answers"] == [1, -1]
    assert submitted.data["review"][0]["selectedIndex"] == 1
    assert submitted.data["review"][0]["correctIndex"] == 1
    assert submitted.data["review"][0]["is_correct"] is True
    assert submitted.data["review"][1]["is_correct"] is False
    assert QuizAttempt.objects.get().score == 50

    duplicate = student_client.post(
        f"/api/quizzes/attempts/{start.data['id']}/submit/",
        {"answers": [0, 0], "timeTaken": 3},
        format="json",
    )
    assert duplicate.status_code == 400


@pytest.mark.django_db
def test_student_cannot_start_without_enrollment_or_view_another_students_attempt(
    course,
    teacher,
    student,
):
    teacher_client = APIClient()
    teacher_client.force_authenticate(teacher)
    teacher_client.post("/api/quizzes/", quiz_payload(course), format="json")
    quiz = Quiz.objects.get()
    student_client = APIClient()
    student_client.force_authenticate(student)

    start = student_client.post(
        f"/api/quizzes/{quiz.id}/attempts/",
        {},
        format="json",
    )
    assert start.status_code == 404
    assert QuizAttempt.objects.count() == 0

    other_student = User.objects.create_user(
        email="quiz.other.student@example.com",
        password="Strong-pass-123!",
        full_name="Other Student",
        role=User.Role.STUDENT,
    )
    attempt = QuizAttempt.objects.create(quiz=quiz, student=other_student)
    submission = student_client.post(
        f"/api/quizzes/attempts/{attempt.id}/submit/",
        {"answers": [0, 0], "timeTaken": 1},
        format="json",
    )
    assert submission.status_code == 404


@pytest.mark.django_db
def test_single_attempt_quiz_blocks_student_after_submission(
    course,
    teacher,
    student,
):
    teacher_client = APIClient()
    teacher_client.force_authenticate(teacher)
    payload = quiz_payload(course)
    payload["allowMultipleAttempts"] = False
    created = teacher_client.post("/api/quizzes/", payload, format="json")
    Enrollment.objects.create(student=student, course=course)
    student_client = APIClient()
    student_client.force_authenticate(student)

    started = student_client.post(
        f"/api/quizzes/{created.data['id']}/attempts/",
        {},
        format="json",
    )
    submitted = student_client.post(
        f"/api/quizzes/attempts/{started.data['id']}/submit/",
        {"answers": [1, 0], "timeTaken": 2},
        format="json",
    )
    second_start = student_client.post(
        f"/api/quizzes/{created.data['id']}/attempts/",
        {},
        format="json",
    )

    assert created.status_code == 201
    assert created.data["allowMultipleAttempts"] is False
    assert started.status_code == 201
    assert submitted.status_code == 200
    assert second_start.status_code == 403
    assert Quiz.objects.get(pk=created.data["id"]).status == "active"
    assert QuizAttempt.objects.filter(quiz_id=created.data["id"]).count() == 1

    another_student = User.objects.create_user(
        email="quiz.another.student@example.com",
        password="test-password",
        full_name="Another Student",
        role=User.Role.STUDENT,
    )
    Enrollment.objects.create(student=another_student, course=course)
    another_client = APIClient()
    another_client.force_authenticate(another_student)
    another_start = another_client.post(
        f"/api/quizzes/{created.data['id']}/attempts/",
        {},
        format="json",
    )
    assert another_start.status_code == 201


@pytest.mark.django_db
def test_multiple_attempt_quiz_allows_retry_after_submission(
    course,
    teacher,
    student,
):
    teacher_client = APIClient()
    teacher_client.force_authenticate(teacher)
    created = teacher_client.post(
        "/api/quizzes/",
        quiz_payload(course),
        format="json",
    )
    Enrollment.objects.create(student=student, course=course)
    student_client = APIClient()
    student_client.force_authenticate(student)

    first = student_client.post(
        f"/api/quizzes/{created.data['id']}/attempts/",
        {},
        format="json",
    )
    submitted = student_client.post(
        f"/api/quizzes/attempts/{first.data['id']}/submit/",
        {"answers": [1, 0], "timeTaken": 2},
        format="json",
    )
    second = student_client.post(
        f"/api/quizzes/{created.data['id']}/attempts/",
        {},
        format="json",
    )

    assert created.data["allowMultipleAttempts"] is True
    assert submitted.status_code == 200
    assert Quiz.objects.get(pk=created.data["id"]).status == "active"
    assert second.status_code == 201
    assert second.data["id"] != first.data["id"]


@pytest.mark.django_db
def test_teacher_results_and_csv_export_are_scoped_to_owned_quiz(
    course,
    teacher,
    student,
):
    teacher_client = APIClient()
    teacher_client.force_authenticate(teacher)
    teacher_client.post("/api/quizzes/", quiz_payload(course), format="json")
    quiz = Quiz.objects.get()
    Enrollment.objects.create(student=student, course=course)
    student_client = APIClient()
    student_client.force_authenticate(student)
    attempt = student_client.post(
        f"/api/quizzes/{quiz.id}/attempts/",
        {},
        format="json",
    )
    student_client.post(
        f"/api/quizzes/attempts/{attempt.data['id']}/submit/",
        {"answers": [1, 0], "timeTaken": 4},
        format="json",
    )

    results = teacher_client.get(f"/api/quizzes/{quiz.id}/results/")
    export = teacher_client.get(f"/api/quizzes/{quiz.id}/results-csv/")

    assert results.status_code == 200
    assert results.data["attemptCount"] == 1
    assert results.data["averageScore"] == 100
    assert results.data["passRate"] == 100
    assert sum(item["count"] for item in results.data["distribution"]) == 1
    assert export.status_code == 200
    assert export["Content-Type"].startswith("text/csv")
    assert "Quiz Student" in export.content.decode("utf-8-sig")


@pytest.mark.django_db
def test_student_copy_report_notifies_teacher_without_closing_quiz(
    course,
    teacher,
    student,
    monkeypatch,
):
    Enrollment.objects.create(student=student, course=course)
    quiz = Quiz.objects.create(teacher=teacher, course=course, title="Quiz de test")
    QuizAttempt.objects.create(quiz=quiz, student=student)
    sent_emails = []
    monkeypatch.setattr(
        "quizzes.views.send_mail",
        lambda **kwargs: sent_emails.append(kwargs),
    )
    client = APIClient()
    client.force_authenticate(student)

    response = client.post(
        f"/api/quizzes/{quiz.id}/report-fraud/",
        {},
        format="json",
    )

    quiz.refresh_from_db()
    notification = Notification.objects.get(
        user=teacher,
        title="Tentative de copie détectée",
    )
    assert response.status_code == 200
    assert response.data["attemptClosed"] is False
    assert notification.title == "Tentative de copie détectée"
    assert student.full_name in notification.message
    assert quiz.status == "active"
    assert sent_emails[0]["recipient_list"] == [teacher.email]


@pytest.mark.django_db
def test_strict_mode_tab_switch_closes_attempt_and_alerts_teacher(
    course,
    teacher,
    student,
    monkeypatch,
):
    Enrollment.objects.create(student=student, course=course)
    quiz = Quiz.objects.create(
        teacher=teacher,
        course=course,
        title="Examen strict",
        strict_mode=True,
    )
    attempt = QuizAttempt.objects.create(quiz=quiz, student=student)
    sent_emails = []
    monkeypatch.setattr(
        "quizzes.views.send_mail",
        lambda **kwargs: sent_emails.append(kwargs),
    )
    client = APIClient()
    client.force_authenticate(student)

    response = client.post(
        f"/api/quizzes/{quiz.id}/report-fraud/",
        {"reason": "tab_hidden"},
        format="json",
    )

    attempt.refresh_from_db()
    notification = Notification.objects.get(
        user=teacher,
        title="Incident du mode examen strict",
    )
    assert response.status_code == 200
    assert response.data["attemptClosed"] is True
    assert attempt.completed_at is not None
    assert attempt.score == 0
    assert "quitté l'onglet" in notification.message
    assert "score de 0" in notification.message
    assert sent_emails[0]["recipient_list"] == [teacher.email]


@pytest.mark.django_db
def test_non_strict_quiz_rejects_strict_mode_incident(
    course,
    teacher,
    student,
):
    Enrollment.objects.create(student=student, course=course)
    quiz = Quiz.objects.create(teacher=teacher, course=course, title="Quiz normal")
    attempt = QuizAttempt.objects.create(quiz=quiz, student=student)
    client = APIClient()
    client.force_authenticate(student)

    response = client.post(
        f"/api/quizzes/{quiz.id}/report-fraud/",
        {"reason": "tab_hidden"},
        format="json",
    )

    attempt.refresh_from_db()
    assert response.status_code == 403
    assert attempt.completed_at is None
    assert not Notification.objects.filter(
        user=teacher,
        title="Incident du mode examen strict",
    ).exists()


@pytest.mark.django_db
def test_student_cannot_report_copy_without_enrollment_and_active_attempt(
    course,
    teacher,
    student,
):
    quiz = Quiz.objects.create(teacher=teacher, course=course, title="Quiz de test")
    client = APIClient()
    client.force_authenticate(student)

    response = client.post(
        f"/api/quizzes/{quiz.id}/report-fraud/",
        {},
        format="json",
    )

    assert response.status_code == 404
    assert not Notification.objects.filter(
        title="Tentative de copie détectée"
    ).exists()
    quiz.refresh_from_db()
    assert quiz.status == "active"


@pytest.mark.django_db
def test_student_cannot_report_copy_without_active_attempt(
    course,
    teacher,
    student,
):
    Enrollment.objects.create(student=student, course=course)
    quiz = Quiz.objects.create(teacher=teacher, course=course, title="Quiz de test")
    client = APIClient()
    client.force_authenticate(student)

    response = client.post(
        f"/api/quizzes/{quiz.id}/report-fraud/",
        {},
        format="json",
    )

    assert response.status_code == 404
    assert not Notification.objects.filter(
        title="Tentative de copie détectée"
    ).exists()


@pytest.mark.django_db
def test_email_failure_keeps_copy_alert_and_returns_api_error(
    course,
    teacher,
    student,
    monkeypatch,
):
    Enrollment.objects.create(student=student, course=course)
    quiz = Quiz.objects.create(teacher=teacher, course=course, title="Quiz de test")
    QuizAttempt.objects.create(quiz=quiz, student=student)

    def fail_to_send_email(**kwargs):
        raise RuntimeError("Email backend unavailable")

    monkeypatch.setattr("quizzes.views.send_mail", fail_to_send_email)
    client = APIClient()
    client.force_authenticate(student)

    response = client.post(
        f"/api/quizzes/{quiz.id}/report-fraud/",
        {},
        format="json",
    )

    assert response.status_code == 200
    assert response.data["emailSent"] is False
    assert "e-mail n'a pas pu être envoyé" in response.data["detail"]
    assert Notification.objects.filter(
        user=teacher,
        title="Tentative de copie détectée",
    ).exists()


@pytest.mark.django_db
def test_student_under_50_percent_gets_a_groq_revision_plan(
    course,
    teacher,
    student,
    monkeypatch,
    settings,
):
    settings.GROQ_API_KEY = "test-key"
    payload = quiz_payload(course)
    teacher_client = APIClient()
    teacher_client.force_authenticate(teacher)
    created = teacher_client.post("/api/quizzes/", payload, format="json")
    Enrollment.objects.create(student=student, course=course)
    student_client = APIClient()
    student_client.force_authenticate(student)
    started = student_client.post(
        f"/api/quizzes/{created.data['id']}/attempts/",
        {},
        format="json",
    )
    submitted = student_client.post(
        f"/api/quizzes/attempts/{started.data['id']}/submit/",
        {"answers": [0, 1], "timeTaken": 2},
        format="json",
    )
    groq_calls = []
    plan_json = json.dumps(
        {
            "title": "Plan pour revoir les bases",
            "summary": "Reprenez les notions des deux questions manquées.",
            "weakPoints": [
                {
                    "topic": "Notions du quiz",
                    "diagnosis": "Les réponses indiquent des lacunes sur les notions.",
                    "recommendation": "Relisez les notions puis reformulez-les.",
                }
            ],
            "steps": [
                {
                    "day": 1,
                    "title": "Revoir le cours",
                    "activity": "Relire les notions et répondre de nouveau aux questions.",
                    "durationMinutes": 20,
                }
            ],
            "encouragement": "Une révision ciblée aidera à progresser.",
        }
    )

    class FakeGroq:
        def chat(self, messages, **kwargs):
            groq_calls.append((messages, kwargs))
            return plan_json

    monkeypatch.setattr("quizzes.revision.GroqClient", FakeGroq)

    response = student_client.post(
        f"/api/quizzes/attempts/{submitted.data['id']}/revision-plan/",
        {},
        format="json",
    )

    assert submitted.status_code == 200
    assert submitted.data["score"] == 0
    assert response.status_code == 200
    assert response.data["title"] == "Plan pour revoir les bases"
    assert len(response.data["weakPoints"]) == 1
    assert groq_calls[0][1]["json_mode"] is True
    prompt_data = json.loads(groq_calls[0][0][1]["content"])
    assert len(prompt_data["weak_answers"]) == 2
    assert prompt_data["weak_answers"][0]["question"] == "Which option is correct?"


@pytest.mark.django_db
def test_revision_plan_is_not_generated_for_score_of_50_or_more(
    course,
    teacher,
    student,
    monkeypatch,
):
    teacher_client = APIClient()
    teacher_client.force_authenticate(teacher)
    created = teacher_client.post(
        "/api/quizzes/",
        quiz_payload(course),
        format="json",
    )
    Enrollment.objects.create(student=student, course=course)
    student_client = APIClient()
    student_client.force_authenticate(student)
    started = student_client.post(
        f"/api/quizzes/{created.data['id']}/attempts/",
        {},
        format="json",
    )
    submitted = student_client.post(
        f"/api/quizzes/attempts/{started.data['id']}/submit/",
        {"answers": [1, 1], "timeTaken": 2},
        format="json",
    )
    monkeypatch.setattr(
        "quizzes.revision.GroqClient.chat",
        lambda *args, **kwargs: pytest.fail("Groq must not be called for this score"),
    )

    response = student_client.post(
        f"/api/quizzes/attempts/{submitted.data['id']}/revision-plan/",
        {},
        format="json",
    )

    assert submitted.data["score"] == 50
    assert response.status_code == 400
