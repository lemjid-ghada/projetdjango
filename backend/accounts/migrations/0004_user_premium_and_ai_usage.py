from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0003_administrateur_enseignant_etudiant_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="user",
            name="is_premium",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="user",
            name="premium_until",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.CreateModel(
            name="PremiumAIUsage",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("month_start", models.DateField()),
                ("request_count", models.PositiveSmallIntegerField(default=0)),
                (
                    "user",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="premium_ai_usage",
                        to="accounts.user",
                    ),
                ),
            ],
            options={
                "constraints": [
                    models.UniqueConstraint(
                        fields=("user", "month_start"),
                        name="unique_premium_ai_usage_per_month",
                    ),
                ],
            },
        ),
    ]
