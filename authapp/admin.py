from django.contrib import admin
from .models import OTPSession


@admin.register(OTPSession)
class OTPSessionAdmin(admin.ModelAdmin):
    list_display = ('email', 'token', 'created_at', 'verified', 'attempts')
    list_filter = ('verified', 'created_at')
    search_fields = ('email',)
    readonly_fields = ('secret', 'token', 'created_at')
