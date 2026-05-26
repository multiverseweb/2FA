web: python manage.py migrate --noinput && python manage.py collectstatic --noinput && gunicorn project_2FA.wsgi --bind 0.0.0.0:$PORT
