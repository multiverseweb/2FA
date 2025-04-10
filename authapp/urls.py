from django.urls import path
from .views import register_view, login_view, verify_otp_view, home_view

from django.urls import path
from . import views

urlpatterns = [
    path('', views.default_view, name='default'),
    path('register/', views.register_view, name='register'),
    path('login/', views.login_view, name='login'),
    path('verify-otp/', views.verify_otp_view, name='verify_otp'),
    path('home/', views.home_view, name='home'),
]

