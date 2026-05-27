from django.db import models
import secrets


class OTPSession(models.Model):
    """Tracks an OTP verification session.

    Each time a user requests an OTP, a new session is created with a unique
    token. The token is returned to the client and must be presented along
    with the OTP for verification.
    """
    email = models.EmailField(db_index=True)
    secret = models.CharField(max_length=32)
    token = models.CharField(max_length=64, unique=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    verified = models.BooleanField(default=False)
    attempts = models.IntegerField(default=0)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"OTP for {self.email} ({'verified' if self.verified else 'pending'})"

    @staticmethod
    def generate_token():
        """Generate a cryptographically secure session token."""
        return secrets.token_urlsafe(48)
