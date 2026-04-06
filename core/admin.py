from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import Tenant, User, Subscription, Invoice, Document, DocumentVersion, AuditLog, FileAnalytics


@admin.register(Tenant)
class TenantAdmin(admin.ModelAdmin):
    list_display = ('name', 'domain', 'plan', 'is_active', 'storage_limit_gb', 'user_limit', 'created_at')
    list_filter = ('plan', 'is_active')
    search_fields = ('name', 'domain')
    readonly_fields = ('id', 'created_at')
    fieldsets = (
        ('Company Info', {'fields': ('id', 'name', 'domain')}),
        ('Subscription', {'fields': ('plan', 'is_active')}),
        ('Timestamps', {'fields': ('created_at',)}),
    )


@admin.register(Subscription)
class SubscriptionAdmin(admin.ModelAdmin):
    list_display = ('tenant', 'start_date', 'expiry_date', 'is_active')
    list_filter = ('is_active',)
    search_fields = ('tenant__name',)


@admin.register(Invoice)
class InvoiceAdmin(admin.ModelAdmin):
    list_display = ('id', 'tenant', 'amount', 'status', 'due_date', 'issued_at')
    list_filter = ('status', 'due_date')
    search_fields = ('tenant__name',)
    readonly_fields = ('issued_at',)


@admin.register(User)
class CustomUserAdmin(UserAdmin):
    list_display = ('username', 'email', 'tenant', 'role', 'is_active', 'is_staff')
    list_filter = ('role', 'is_active', 'tenant')
    search_fields = ('username', 'email', 'tenant__name')

    fieldsets = UserAdmin.fieldsets + (
        ('Tenant Info', {'fields': ('tenant', 'role')}),
    )
    add_fieldsets = UserAdmin.add_fieldsets + (
        ('Tenant Info', {'fields': ('tenant', 'role')}),
    )


@admin.register(Document)
class DocumentAdmin(admin.ModelAdmin):
    list_display = ('title', 'tenant', 'uploaded_by', 'file_type', 'file_size', 'created_at')
    list_filter = ('tenant', 'file_type')
    search_fields = ('title', 'original_filename', 'tenant__name')
    readonly_fields = ('created_at', 'updated_at')


@admin.register(DocumentVersion)
class DocumentVersionAdmin(admin.ModelAdmin):
    list_display = ('document', 'version_number', 'created_by', 'created_at')
    list_filter = ('document__tenant',)
    readonly_fields = ('created_at',)


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ('action', 'user', 'tenant', 'document', 'timestamp', 'detail')
    list_filter = ('action', 'tenant')
    search_fields = ('user__username', 'document__title')
    readonly_fields = ('timestamp',)


@admin.register(FileAnalytics)
class FileAnalyticsAdmin(admin.ModelAdmin):
    list_display = ('document', 'views_count', 'edits_count', 'downloads_count')
    search_fields = ('document__title',)
