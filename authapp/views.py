import pyotp
import time
from django.shortcuts import render, redirect
from django.contrib.auth import authenticate, login
from django.contrib.auth.decorators import login_required
from django.core.mail import send_mail
from django.utils import timezone
from django.conf import settings
from django.contrib import messages
from .forms import RegisterForm, LoginForm, OTPForm
from .models import CustomUser

lockout_dict = {}
otp_secrets = {}

def default_view(request):
    return redirect('register')


def register_view(request):
    if request.method == 'POST':
        form = RegisterForm(request.POST)
        if form.is_valid():
            form.save()
            return redirect('login')
    else:
        form = RegisterForm()
    return render(request, 'authapp/register.html', {'form': form})


def login_view(request):
    if request.method == 'POST':
        form = LoginForm(request.POST)
        if form.is_valid():
            email = form.cleaned_data['email']
            password = form.cleaned_data['password']

            if email in lockout_dict and timezone.now() < lockout_dict[email]:
                messages.error(request, 'System locked due to multiple failed attempts. Try again later.')
                return redirect('login')

            try:
                user = CustomUser.objects.get(email=email)
            except CustomUser.DoesNotExist:
                messages.error(request, 'User does not exist.')
                return redirect('login')

            auth_user = authenticate(username=user.username, password=password)
            if auth_user:
                secret = pyotp.random_base32()
                otp_secrets[email] = (secret, timezone.now())
                totp = pyotp.TOTP(secret, interval=30)
                otp = totp.now()
                send_mail(
                    'Your 2FA OTP Code',
                    f'Your OTP is {otp}. It is valid for 30 seconds.',
                    settings.EMAIL_HOST_USER,
                    [email]
                )
                request.session['email'] = email
                request.session['username'] = user.username
                request.session['login_valid'] = True
                print("Redirecting to OTP...")
                return redirect('verify_otp')
            else:
                messages.error(request, 'Invalid credentials.')
    else:
        form = LoginForm()
    return render(request, 'authapp/login.html', {'form': form})


def verify_otp_view(request):
    email = request.session.get('email')
    if not email:
        return redirect('login')

    if request.method == 'POST':
        form = OTPForm(request.POST)
        if form.is_valid():
            entered_otp = form.cleaned_data['otp']
            otp_data = otp_secrets.get(email)

            if otp_data is None:
                messages.error(request, 'OTP expired or invalid session. Please login again.')
                return redirect('login')

            secret, timestamp = otp_data
            totp = pyotp.TOTP(secret, interval=30)

            if totp.verify(entered_otp, valid_window=1):
                user = CustomUser.objects.get(email=email)
                login(request, user)
                messages.success(request, 'Login successful!')
                return redirect('home')
            else:
                lockout_dict[email] = timezone.now() + timezone.timedelta(minutes=2)
                messages.error(request, 'Incorrect OTP. You are locked out for 2 minutes.')
                return redirect('login')
    else:
        form = OTPForm()

    return render(request, 'authapp/verify_otp.html', {'form': form})



@login_required
def home_view(request):
    return render(request, 'authapp/home.html')