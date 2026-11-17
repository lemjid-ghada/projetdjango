from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("quizzes", "0003_quiz_description_quiz_due_at_quiz_max_score_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="quiz",
            name="allow_multiple_attempts",
            field=models.BooleanField(default=True),
        ),
    ]
