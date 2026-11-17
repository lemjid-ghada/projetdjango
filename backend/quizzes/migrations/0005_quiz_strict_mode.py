from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("quizzes", "0004_quiz_allow_multiple_attempts"),
    ]

    operations = [
        migrations.AddField(
            model_name="quiz",
            name="strict_mode",
            field=models.BooleanField(default=False),
        ),
    ]
