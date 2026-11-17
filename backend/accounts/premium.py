from django.db import transaction
from django.db.models import F
from django.utils import timezone
from rest_framework.exceptions import APIException

from accounts.models import PremiumAIUsage, User

FREE_MONTHLY_AI_REQUESTS = 3


class PremiumRequired(APIException):
    status_code = 402
    default_detail = (
        "Vos 3 requêtes IA gratuites du mois sont utilisées. "
        "Passez à Premium pour continuer."
    )
    default_code = "premium_required"


def current_month_start():
    today = timezone.localdate()
    return today.replace(day=1)


def premium_usage(user):
    if user.is_premium_active or user.role != User.Role.STUDENT:
        return {
            "used": 0,
            "limit": FREE_MONTHLY_AI_REQUESTS,
            "remaining": None,
        }

    usage, _ = PremiumAIUsage.objects.get_or_create(
        user=user,
        month_start=current_month_start(),
    )
    remaining = max(0, FREE_MONTHLY_AI_REQUESTS - usage.request_count)
    return {
        "used": usage.request_count,
        "limit": FREE_MONTHLY_AI_REQUESTS,
        "remaining": remaining,
    }


def consume_ai_request(user):
    if user.role != User.Role.STUDENT or user.is_premium_active:
        return

    month_start = current_month_start()
    with transaction.atomic():
        usage, _ = PremiumAIUsage.objects.get_or_create(
            user=user,
            month_start=month_start,
        )
        usage = PremiumAIUsage.objects.select_for_update().get(pk=usage.pk)
        if usage.request_count >= FREE_MONTHLY_AI_REQUESTS:
            raise PremiumRequired()
        usage.request_count = F("request_count") + 1
        usage.save(update_fields=("request_count",))
