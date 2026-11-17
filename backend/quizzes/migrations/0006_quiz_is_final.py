from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("quizzes", "0005_quiz_strict_mode"),
    ]

    operations = [
        migrations.AddField(
            model_name="quiz",
            name="is_final",
            field=models.BooleanField(default=False),
        ),
    ]
