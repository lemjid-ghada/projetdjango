from django.urls import path

from accounts.views import (
    ChangePasswordView,
    LoginView,
    LogoutView,
    MeView,
    MockPaymentView,
    PremiumStatusView,
    RefreshView,
    RegisterView,
)


urlpatterns = [
    path("register/", RegisterView.as_view(), name="register"),
    path("login/", LoginView.as_view(), name="login"),
    path("token/refresh/", RefreshView.as_view(), name="token-refresh"),
    path("logout/", LogoutView.as_view(), name="logout"),
    path("me/", MeView.as_view(), name="me"),
    path("mock-payment/", MockPaymentView.as_view(), name="mock-payment"),
    path("premium-status/", PremiumStatusView.as_view(), name="premium-status"),
    path("change-password/", ChangePasswordView.as_view(), name="change-password"),
]
