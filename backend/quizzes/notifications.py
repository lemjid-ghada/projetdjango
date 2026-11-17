from django.conf import settings
from django.core.mail import send_mail
from django.utils import timezone


def notify_teacher_quiz_attempt(attempt):
    """Envoie un email au professeur quand un étudiant démarre et répond à son quiz."""
    quiz = attempt.quiz
    student = attempt.student
    teacher = quiz.teacher

    subject = f"[EduLearn] {student.full_name} a passé votre quiz : « {quiz.title} »"
    
    # On s'assure d'afficher l'heure locale
    date_debut = timezone.localtime(attempt.started_at).strftime('%d/%m/%Y à %H:%M:%S')

    message = (
        f"Bonjour {teacher.full_name},\n\n"
        f"Un étudiant vient de soumettre ses réponses à votre quiz.\n\n"
        f"=== DÉTAILS DE LA TENTATIVE ===\n"
        f"Étudiant : {student.full_name} ({student.email})\n"
        f"Quiz     : {quiz.title}\n"
        f"Cours    : {quiz.course.title}\n"
        f"Date     : {date_debut}\n"
        f"Tentative: #{attempt.id}\n\n"
        f"⚠️ ATTENTION : Ce quiz a été automatiquement fermé. Vous pouvez consulter les résultats dans votre espace enseignant.\n\n"
        f"Cordialement,\n"
        f"La plateforme EduLearn."
    )

    send_mail(
        subject=subject,
        message=message,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[teacher.email],  # <-- Envoi direct au professeur du quiz
        fail_silently=False,
    )