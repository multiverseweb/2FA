from django.urls import path
from .views import register_view, login_view, verify_otp_view, home_view

urlpatterns = [
    path('register/', register_view, name='register'),
    path('login/', login_view, name='login'),
    path('verify/', verify_otp_view, name='verify_otp'),
    path('home/', home_view, name='home'),
]
