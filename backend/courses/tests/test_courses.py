import json

import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from courses.models import Course, Enrollment, Lesson
from courses.views import MAX_TRANSLATION_CHARS, split_translation_text
from progress.models import LessonProgress
from rag.models import CourseDocument, DocumentChunk


User = get_user_model()


def test_split_translation_text_keeps_long_source_text_without_oversized_parts():
    source = " ".join(f"notion{index}" for index in range(1_000))

    parts = list(split_translation_text(source))

    assert len(parts) > 1
    assert all(len(part) <= MAX_TRANSLATION_CHARS for part in parts)
    assert " ".join(parts) == source


@pytest.fixture
def teacher(db):
    return User.objects.create_user(
        email="courses.teacher@example.com",
        password="Strong-pass-123!",
        full_name="Course Teacher",
        role=User.Role.TEACHER,
    )


@pytest.fixture
def other_teacher(db):
    return User.objects.create_user(
        email="other.teacher@example.com",
        password="Strong-pass-123!",
        full_name="Other Teacher",
        role=User.Role.TEACHER,
    )


@pytest.fixture
def student(db):
    return User.objects.create_user(
        email="courses.student@example.com",
        password="Strong-pass-123!",
        full_name="Course Student",
        role=User.Role.STUDENT,
    )


def course_payload(title="Test course", published=True):
    return {
        "title": title,
        "description": "A useful course for learning.",
        "category": "Development",
        "level": "Débutant",
        "thumbnail": "",
        "isPublished": published,
        "lessons": [
            {"title": "Lesson one", "content": "First lesson", "order": 1},
            {"title": "Lesson two", "content": "Second lesson", "order": 2},
        ],
    }


@pytest.mark.django_db
def test_teacher_can_create_course_with_ordered_nested_lessons(teacher):
    client = APIClient()
    client.force_authenticate(teacher)

    response = client.post("/api/courses/", course_payload(), format="json")

    assert response.status_code == 201
    assert response.data["teacherId"] == teacher.id
    assert [lesson["order"] for lesson in response.data["lessons"]] == [1, 2]
    assert [lesson["title"] for lesson in response.data["lessons"]] == [
        "Lesson one",
        "Lesson two",
    ]
    assert Course.objects.get().teacher == teacher


@pytest.mark.django_db
def test_teacher_lists_only_own_courses_and_can_delete_own_course(
    teacher,
    other_teacher,
):
    own_course = Course.objects.create(
        teacher=teacher,
        title="Own course",
        description="A useful course.",
        category="Development",
        level=Course.Level.BEGINNER,
    )
    Course.objects.create(
        teacher=other_teacher,
        title="Other course",
        description="Another useful course.",
        category="Development",
        level=Course.Level.BEGINNER,
    )
    client = APIClient()
    client.force_authenticate(teacher)

    listing = client.get("/api/courses/")
    deletion = client.delete(f"/api/courses/{own_course.id}/")

    assert listing.status_code == 200
    assert [item["title"] for item in listing.data["results"]] == ["Own course"]
    assert deletion.status_code == 204
    assert not Course.objects.filter(pk=own_course.id).exists()


@pytest.mark.django_db
def test_teacher_can_update_nested_lessons_transactionally(teacher):
    client = APIClient()
    client.force_authenticate(teacher)
    course = Course.objects.create(
        teacher=teacher,
        title="Original",
        description="Original description",
        category="Development",
        level=Course.Level.BEGINNER,
        is_published=False,
    )
    Lesson.objects.create(course=course, title="Old", content="Old content", order=1)

    payload = course_payload("Updated", published=True)
    response = client.patch(f"/api/courses/{course.id}/", payload, format="json")

    assert response.status_code == 200
    course.refresh_from_db()
    assert course.title == "Updated"
    assert course.is_published is True
    assert list(course.lessons.values_list("title", flat=True)) == [
        "Lesson one",
        "Lesson two",
    ]


@pytest.mark.django_db
def test_teacher_cannot_edit_another_teachers_course(teacher, other_teacher):
    course = Course.objects.create(
        teacher=other_teacher,
        title="Private course",
        description="Owned by another teacher.",
        category="Development",
        level=Course.Level.BEGINNER,
    )
    client = APIClient()
    client.force_authenticate(teacher)

    response = client.patch(
        f"/api/courses/{course.id}/",
        {"title": "Changed"},
        format="json",
    )

    assert response.status_code == 404
    course.refresh_from_db()
    assert course.title == "Private course"


@pytest.mark.django_db
def test_teacher_can_reorder_owned_lessons(teacher):
    course = Course.objects.create(
        teacher=teacher,
        title="Course",
        description="A course description.",
        category="Development",
        level=Course.Level.BEGINNER,
    )
    first = Lesson.objects.create(
        course=course,
        title="First",
        content="First content",
        order=1,
    )
    second = Lesson.objects.create(
        course=course,
        title="Second",
        content="Second content",
        order=2,
    )
    client = APIClient()
    client.force_authenticate(teacher)

    response = client.patch(
        f"/api/courses/{course.id}/lessons/reorder/",
        {"lessonIds": [second.id, first.id]},
        format="json",
    )

    assert response.status_code == 200
    assert [lesson["id"] for lesson in response.data["lessons"]] == [
        second.id,
        first.id,
    ]


@pytest.mark.django_db
def test_student_sees_only_published_courses(teacher, student):
    published = Course.objects.create(
        teacher=teacher,
        title="Published",
        description="Visible to learners.",
        category="Development",
        level=Course.Level.BEGINNER,
        is_published=True,
    )
    Course.objects.create(
        teacher=teacher,
        title="Draft",
        description="Not visible.",
        category="Development",
        level=Course.Level.BEGINNER,
        is_published=False,
    )
    client = APIClient()
    client.force_authenticate(student)

    response = client.get("/api/courses/")

    assert response.status_code == 200
    assert [item["id"] for item in response.data["results"]] == [published.id]


@pytest.mark.django_db
def test_student_must_enroll_before_completing_lesson(teacher, student):
    course = Course.objects.create(
        teacher=teacher,
        title="Published",
        description="Visible to learners.",
        category="Development",
        level=Course.Level.BEGINNER,
        is_published=True,
    )
    lesson = Lesson.objects.create(
        course=course,
        title="Lesson",
        content="Lesson content.",
        order=1,
    )
    client = APIClient()
    client.force_authenticate(student)

    forbidden = client.post(
        f"/api/courses/{course.id}/lessons/{lesson.id}/complete/",
        {},
        format="json",
    )
    assert forbidden.status_code == 403

    Enrollment.objects.create(student=student, course=course)
    completed = client.post(
        f"/api/courses/{course.id}/lessons/{lesson.id}/complete/",
        {},
        format="json",
    )
    repeated = client.post(
        f"/api/courses/{course.id}/lessons/{lesson.id}/complete/",
        {},
        format="json",
    )

    assert completed.status_code == 200
    assert completed.data["completedLessons"] == 1
    assert completed.data["totalLessons"] == 1
    assert completed.data["percentage"] == 100
    assert repeated.status_code == 200
    assert LessonProgress.objects.filter(student=student, lesson=lesson).count() == 1


@pytest.mark.django_db
def test_student_can_enroll_idempotently_and_wrong_role_is_blocked(teacher, student):
    course = Course.objects.create(
        teacher=teacher,
        title="Published",
        description="Visible to learners.",
        category="Development",
        level=Course.Level.BEGINNER,
        is_published=True,
    )
    client = APIClient()
    client.force_authenticate(student)

    first = client.post(f"/api/courses/{course.id}/enroll/", {}, format="json")
    second = client.post(f"/api/courses/{course.id}/enroll/", {}, format="json")

    assert first.status_code == 201
    assert second.status_code == 200
    assert Enrollment.objects.filter(student=student, course=course).count() == 1

    teacher_client = APIClient()
    teacher_client.force_authenticate(teacher)
    forbidden = teacher_client.post(
        f"/api/courses/{course.id}/enroll/",
        {},
        format="json",
    )
    assert forbidden.status_code == 403


@pytest.mark.django_db
def test_unauthenticated_cannot_access_course_api(teacher):
    Course.objects.create(
        teacher=teacher,
        title="Published",
        description="Description",
        category="Development",
        level=Course.Level.BEGINNER,
        is_published=True,
    )

    response = APIClient().get("/api/courses/")

    assert response.status_code == 401


@pytest.mark.django_db
def test_enrolled_student_can_listen_to_ai_summary_of_course_documents(
    teacher,
    student,
    monkeypatch,
    tmp_path,
):
    course = Course.objects.create(
        teacher=teacher,
        title="Biologie",
        description="Introduction à la biologie.",
        content="Les cellules sont les unités du vivant.",
        category="Sciences",
        level=Course.Level.BEGINNER,
        is_published=True,
    )
    Enrollment.objects.create(student=student, course=course)
    document = CourseDocument.objects.create(
        course=course,
        uploaded_by=teacher,
        file="course-documents/biology.pdf",
        title="Biologie.pdf",
        status=CourseDocument.Status.READY,
    )
    DocumentChunk.objects.create(
        document=document,
        content="La photosynthèse transforme la lumière en énergie chimique.",
        page_number=1,
        chunk_index=0,
        embedding_id="biology-summary-chunk",
    )
    lesson_pdf = tmp_path / "lessons" / "biology.pdf"
    lesson_pdf.parent.mkdir()
    lesson_pdf.write_bytes(b"test pdf")
    Lesson.objects.create(
        course=course,
        title="Les écosystèmes",
        content="",
        pdf_url="/media/lessons/biology.pdf",
    )
    generated_audio = {}

    class FakePdfReader:
        pages = [type("Page", (), {"extract_text": lambda self: "Un écosystème réunit les êtres vivants et leur milieu."})()]

        def __init__(self, file_path):
            assert file_path == lesson_pdf

    class FakeGroqClient:
        def chat(self, messages, **kwargs):
            generated_audio["source"] = messages[1]["content"]
            return "Les cellules sont les unités du vivant. La photosynthèse stocke l'énergie."

    class FakeTTS:
        def __init__(self, text, **kwargs):
            generated_audio["summary"] = text

        def write_to_fp(self, audio_file):
            audio_file.write(b"audio")

    monkeypatch.setattr("courses.views.GroqClient", FakeGroqClient)
    monkeypatch.setattr("courses.views.gTTS", FakeTTS)
    monkeypatch.setattr("courses.views.PdfReader", FakePdfReader)
    monkeypatch.setattr("courses.views.settings.MEDIA_ROOT", str(tmp_path))
    client = APIClient()
    client.force_authenticate(student)

    response = client.get(f"/api/courses/{course.id}/podcast/")

    assert response.status_code == 200
    assert response["Content-Type"] == "audio/mpeg"
    assert generated_audio["summary"].startswith("Les cellules")
    assert "photosynthèse" in generated_audio["source"]
    assert "écosystème" in generated_audio["source"]
    assert b"".join(response.streaming_content) == b"audio"


@pytest.mark.django_db
def test_student_must_be_enrolled_to_listen_to_course_summary(teacher, student):
    course = Course.objects.create(
        teacher=teacher,
        title="Biologie",
        description="Introduction à la biologie.",
        category="Sciences",
        level=Course.Level.BEGINNER,
        is_published=True,
    )
    client = APIClient()
    client.force_authenticate(student)

    response = client.get(f"/api/courses/{course.id}/podcast/")

    assert response.status_code == 403


@pytest.mark.django_db
def test_course_summary_reports_missing_groq_configuration(
    teacher,
    student,
    monkeypatch,
):
    course = Course.objects.create(
        teacher=teacher,
        title="Biologie",
        description="Introduction à la biologie.",
        category="Sciences",
        level=Course.Level.BEGINNER,
        is_published=True,
    )
    Enrollment.objects.create(student=student, course=course)

    class FakeGroqClient:
        def chat(self, messages, **kwargs):
            return "Réponse simulée : configurez GROQ_API_KEY."

    monkeypatch.setattr("courses.views.GroqClient", FakeGroqClient)
    client = APIClient()
    client.force_authenticate(student)

    response = client.get(f"/api/courses/{course.id}/podcast/")

    assert response.status_code == 503
    assert "GROQ_API_KEY" in response.data["detail"]


@pytest.mark.django_db
def test_enrolled_student_can_generate_ten_flashcards_from_course_and_pdf(
    teacher,
    student,
    monkeypatch,
):
    course = Course.objects.create(
        teacher=teacher,
        title="Biologie",
        description="Introduction à la biologie.",
        content="Les cellules sont les unités du vivant.",
        category="Sciences",
        level=Course.Level.BEGINNER,
        is_published=True,
    )
    Enrollment.objects.create(student=student, course=course)
    document = CourseDocument.objects.create(
        course=course,
        uploaded_by=teacher,
        file="course-documents/biology.pdf",
        title="Biologie.pdf",
        status=CourseDocument.Status.READY,
    )
    DocumentChunk.objects.create(
        document=document,
        content="La photosynthèse transforme la lumière en énergie chimique.",
        page_number=1,
        chunk_index=0,
        embedding_id="biology-flashcard-chunk",
    )
    generated_request = {}
    flashcards = [
        {"recto": f"Question {index} ?", "verso": f"Réponse {index}."}
        for index in range(1, 11)
    ]

    class FakeGroqClient:
        def chat(self, messages, **kwargs):
            generated_request["source"] = json.loads(messages[1]["content"])
            assert kwargs["json_mode"] is True
            return json.dumps({"flashcards": flashcards}, ensure_ascii=False)

    monkeypatch.setattr("courses.views.GroqClient", FakeGroqClient)
    client = APIClient()
    client.force_authenticate(student)

    response = client.post(f"/api/courses/{course.id}/flashcards/", {}, format="json")

    assert response.status_code == 200
    assert len(response.data["flashcards"]) == 10
    assert response.data["flashcards"][0] == flashcards[0]
    assert generated_request["source"]["course"] == course.title
    assert "cellules" in generated_request["source"]["source"]
    assert "photosynthèse" in generated_request["source"]["source"]


@pytest.mark.django_db
def test_student_must_be_enrolled_to_generate_course_flashcards(teacher, student):
    course = Course.objects.create(
        teacher=teacher,
        title="Biologie",
        description="Introduction à la biologie.",
        category="Sciences",
        level=Course.Level.BEGINNER,
        is_published=True,
    )
    client = APIClient()
    client.force_authenticate(student)

    response = client.post(f"/api/courses/{course.id}/flashcards/", {}, format="json")

    assert response.status_code == 403


@pytest.mark.django_db
def test_course_flashcards_reject_invalid_groq_response(
    teacher,
    student,
    monkeypatch,
):
    course = Course.objects.create(
        teacher=teacher,
        title="Biologie",
        description="Introduction à la biologie.",
        category="Sciences",
        level=Course.Level.BEGINNER,
        is_published=True,
    )
    Enrollment.objects.create(student=student, course=course)

    class FakeGroqClient:
        def chat(self, messages, **kwargs):
            return json.dumps(
                {"flashcards": [{"recto": "Une seule carte ?", "verso": "Réponse."}]}
            )

    monkeypatch.setattr("courses.views.GroqClient", FakeGroqClient)
    client = APIClient()
    client.force_authenticate(student)

    response = client.post(f"/api/courses/{course.id}/flashcards/", {}, format="json")

    assert response.status_code == 502
    assert "format de flashcards invalide" in response.data["detail"]


@pytest.mark.django_db
def test_enrolled_student_can_translate_course_lessons_and_pdf_text(
    teacher,
    student,
    monkeypatch,
    tmp_path,
):
    course = Course.objects.create(
        teacher=teacher,
        title="Biologie",
        description="Introduction à la biologie.",
        content="Les cellules sont les unités du vivant.",
        category="Sciences",
        level=Course.Level.BEGINNER,
        is_published=True,
    )
    Enrollment.objects.create(student=student, course=course)
    Lesson.objects.create(
        course=course,
        title="Les écosystèmes",
        content="Un écosystème réunit les êtres vivants.",
        pdf_url="/media/lessons/biology.pdf",
    )
    document = CourseDocument.objects.create(
        course=course,
        uploaded_by=teacher,
        file="course-documents/biology.pdf",
        title="Notes de biologie.pdf",
        status=CourseDocument.Status.READY,
    )
    DocumentChunk.objects.create(
        document=document,
        content="La photosynthèse transforme la lumière en énergie chimique.",
        page_number=2,
        chunk_index=0,
        embedding_id="biology-translation-chunk",
    )
    lesson_pdf = tmp_path / "lessons" / "biology.pdf"
    lesson_pdf.parent.mkdir()
    lesson_pdf.write_bytes(b"test pdf")

    class FakePdfReader:
        pages = [
            type(
                "Page",
                (),
                {
                    "extract_text": lambda self: (
                        "Un habitat fournit aux espèces nourriture et abri."
                    )
                },
            )()
        ]

        def __init__(self, file_path):
            assert file_path == lesson_pdf

    translated_inputs = []

    class FakeGroqClient:
        def chat(self, messages, **kwargs):
            translated_inputs.extend(
                item["text"] for item in json.loads(messages[1]["content"])
            )
            return json.dumps(
                {
                    "sections": [
                        {
                            "title": item["title"],
                            "content": f"Translated: {item['text']}",
                        }
                        for item in json.loads(messages[1]["content"])
                    ]
                }
            )

    monkeypatch.setattr("courses.views.PdfReader", FakePdfReader)
    monkeypatch.setattr("courses.views.settings.MEDIA_ROOT", str(tmp_path))
    monkeypatch.setattr("courses.views.GroqClient", FakeGroqClient)
    client = APIClient()
    client.force_authenticate(student)

    response = client.post(
        f"/api/courses/{course.id}/translate/",
        {"lang": "en"},
        format="json",
    )

    assert response.status_code == 200
    assert response.data["langue"] == "en"
    titles = [section["title"] for section in response.data["sections"]]
    assert "Description" in titles
    assert "Leçon : Les écosystèmes" in titles
    assert "PDF de la leçon « Les écosystèmes » — page 1" in titles
    assert "PDF : Notes de biologie.pdf — page 2" in titles
    assert any("habitat" in text for text in translated_inputs)
    assert any("photosynthèse" in text for text in translated_inputs)
    assert len(translated_inputs) == 5
    assert all(
        section["content"].startswith("Translated: ")
        for section in response.data["sections"]
    )


@pytest.mark.django_db
def test_course_translation_batches_many_sections_into_one_groq_request(
    teacher,
    student,
    monkeypatch,
):
    course = Course.objects.create(
        teacher=teacher,
        title="Biologie",
        description="Introduction à la biologie.",
        category="Sciences",
        level=Course.Level.BEGINNER,
        is_published=True,
    )
    Enrollment.objects.create(student=student, course=course)
    for order in range(1, 9):
        Lesson.objects.create(
            course=course,
            title=f"Leçon {order}",
            content=f"Contenu pédagogique {order}.",
            order=order,
        )
    requests = []

    class FakeGroqClient:
        def chat(self, messages, **kwargs):
            batch = json.loads(messages[1]["content"])
            requests.append(batch)
            return json.dumps(
                {
                    "sections": [
                        {"title": item["title"], "content": f"Traduit: {item['text']}"}
                        for item in batch
                    ]
                }
            )

    monkeypatch.setattr("courses.views.GroqClient", FakeGroqClient)
    client = APIClient()
    client.force_authenticate(student)

    response = client.post(
        f"/api/courses/{course.id}/translate/",
        {"lang": "en"},
        format="json",
    )

    assert response.status_code == 200
    assert len(requests) == 1
    assert len(response.data["sections"]) == 9


@pytest.mark.django_db
def test_student_must_be_enrolled_to_translate_course(teacher, student):
    course = Course.objects.create(
        teacher=teacher,
        title="Biologie",
        description="Introduction à la biologie.",
        category="Sciences",
        level=Course.Level.BEGINNER,
        is_published=True,
    )
    client = APIClient()
    client.force_authenticate(student)

    response = client.post(
        f"/api/courses/{course.id}/translate/",
        {"lang": "en"},
        format="json",
    )

    assert response.status_code == 403


@pytest.mark.django_db
def test_course_translation_rejects_unsupported_language(teacher, student):
    course = Course.objects.create(
        teacher=teacher,
        title="Biologie",
        description="Introduction à la biologie.",
        category="Sciences",
        level=Course.Level.BEGINNER,
        is_published=True,
    )
    Enrollment.objects.create(student=student, course=course)
    client = APIClient()
    client.force_authenticate(student)

    response = client.post(
        f"/api/courses/{course.id}/translate/",
        {"lang": "xx"},
        format="json",
    )

    assert response.status_code == 400
