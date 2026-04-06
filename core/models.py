import uuid
from datetime import date, timedelta
from django.db import models
from django.contrib.auth.models import AbstractUser


class Tenant(models.Model):
    """
    Represents a company (tenant) registered on the platform.
    Every piece of data in the system is scoped to a Tenant.
    """
    PLAN_CHOICES = [
        ('starter', 'Starter'),
        ('growth', 'Growth'),
        ('enterprise', 'Enterprise'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255, unique=True)
    domain = models.CharField(max_length=255, unique=True, blank=True)
    plan = models.CharField(max_length=20, choices=PLAN_CHOICES, default='starter')
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        # Auto-generate domain slug from name if not provided
        if not self.domain:
            slug = self.name.lower().replace(' ', '')
            self.domain = f"{slug}.yourapp.com"
        
        is_new = self._state.adding
        super().save(*args, **kwargs)
        
        if is_new:
            # Create a 1-year subscription by default
            Subscription.objects.create(
                tenant=self,
                expiry_date=date.today() + timedelta(days=365)
            )

    def __str__(self):
        return f"{self.name} ({self.get_plan_display()})"

    class Meta:
        ordering = ['name']

    @property
    def storage_limit_gb(self):
        limits = {'starter': 50, 'growth': 500, 'enterprise': 2048}
        return limits.get(self.plan, 50)

    @property
    def user_limit(self):
        limits = {'starter': 5, 'growth': 20, 'enterprise': 100}
        return limits.get(self.plan, 5)


class User(AbstractUser):
    """
    Custom user model. Each user belongs to exactly one Tenant.
    """
    ROLE_CHOICES = [
        ('admin', 'Admin'),
        ('employee', 'Employee'),
    ]

    tenant = models.ForeignKey(
        Tenant,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='users'
    )
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='employee')

    def __str__(self):
        tenant_name = self.tenant.name if self.tenant else 'Super Admin'
        return f"{self.username} @ {tenant_name} [{self.get_role_display()}]"


class Subscription(models.Model):
    """
    Stores the subscription details for a tenant.
    """
    tenant = models.OneToOneField(Tenant, on_delete=models.CASCADE, related_name='subscription')
    start_date = models.DateField(auto_now_add=True)
    expiry_date = models.DateField()
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return f"Subscription for {self.tenant.name} ({'Active' if self.is_active else 'Expired'})"


class Invoice(models.Model):
    """
    Monthly invoices generated for tenants.
    """
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('paid', 'Paid'),
        ('overdue', 'Overdue'),
    ]

    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='invoices')
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    issued_at = models.DateTimeField(auto_now_add=True)
    due_date = models.DateField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    payment_method = models.CharField(max_length=50, blank=True, null=True) # UPI, Card, Net Banking
    paid_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"Invoice {self.id} - {self.tenant.name} - ${self.amount} ({self.status})"


# ─────────────────────────────────────────────
# Document — encrypted file storage
# ─────────────────────────────────────────────

class Document(models.Model):
    """
    Represents a file uploaded by a user (stored encrypted on disk).
    """
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='documents')
    uploaded_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='documents')
    title = models.CharField(max_length=255)
    original_filename = models.CharField(max_length=255)
    file_type = models.CharField(max_length=100, blank=True)   # MIME type
    file_size = models.PositiveIntegerField(default=0)          # bytes
    # The actual data is stored as encrypted bytes in a FileField
    encrypted_file = models.FileField(upload_to='encrypted_docs/%Y/%m/')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.title} ({self.tenant.name})"

    class Meta:
        ordering = ['-created_at']


class DocumentVersion(models.Model):
    """
    Snapshot of a document's encrypted content at a given point in time.
    Created every time a document is updated.
    """
    document = models.ForeignKey(Document, on_delete=models.CASCADE, related_name='versions')
    version_number = models.PositiveIntegerField()
    encrypted_file = models.FileField(upload_to='encrypted_versions/%Y/%m/')
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-version_number']
        unique_together = ['document', 'version_number']

    def __str__(self):
        return f"{self.document.title} v{self.version_number}"


# ─────────────────────────────────────────────
# AuditLog — activity timeline
# ─────────────────────────────────────────────

class AuditLog(models.Model):
    ACTION_CHOICES = [
        ('UPLOAD', 'Upload'),
        ('DOWNLOAD', 'Download'),
        ('VIEW', 'View'),
        ('EDIT', 'Edit'),
        ('DELETE', 'Delete'),
        ('LOGIN', 'Login'),
    ]

    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='audit_logs')
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    action = models.CharField(max_length=20, choices=ACTION_CHOICES)
    document = models.ForeignKey(Document, on_delete=models.SET_NULL, null=True, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)
    detail = models.CharField(max_length=500, blank=True)

    class Meta:
        ordering = ['-timestamp']

    def __str__(self):
        return f"[{self.action}] {self.user} at {self.timestamp:%Y-%m-%d %H:%M}"


# ─────────────────────────────────────────────
# FileAnalytics — per-document stats
# ─────────────────────────────────────────────

class FileAnalytics(models.Model):
    document = models.OneToOneField(Document, on_delete=models.CASCADE, related_name='analytics')
    views_count = models.PositiveIntegerField(default=0)
    edits_count = models.PositiveIntegerField(default=0)
    downloads_count = models.PositiveIntegerField(default=0)

    def __str__(self):
        return f"Analytics for {self.document.title}"
