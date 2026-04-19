from django.contrib.auth import authenticate
from rest_framework import serializers
from .models import Tenant, User, Invoice, Document, DocumentVersion, FileAnalytics
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.tokens import RefreshToken

# ─────────────────────────────────────────────
# Tenant Serializer
# ─────────────────────────────────────────────

class TenantSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tenant
        fields = ['id', 'name', 'domain', 'plan', 'is_active', 'payment_status',
                  'storage_limit_gb', 'user_limit', 'created_at']
        read_only_fields = ['id', 'domain', 'created_at', 'storage_limit_gb', 'user_limit']


# ─────────────────────────────────────────────
# Tenant Registration Serializer
# Creates a new Tenant + its first Admin user
# ─────────────────────────────────────────────

class TenantRegistrationSerializer(serializers.Serializer):
    # Company info
    company_name = serializers.CharField(max_length=255)
    plan = serializers.ChoiceField(choices=['starter', 'growth', 'enterprise'], default='starter')

    # Admin user info
    username = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=6)

    def validate_company_name(self, value):
        if Tenant.objects.filter(name__iexact=value).exists():
            raise serializers.ValidationError("A company with this name already exists.")
        return value

    def validate_username(self, value):
        if User.objects.filter(username__iexact=value).exists():
            raise serializers.ValidationError("This username is already taken.")
        return value

    def validate_email(self, value):
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("This email is already registered.")
        return value

    def create(self, validated_data):
        from datetime import date, timedelta

        # Plan pricing map
        PLAN_PRICES = {'starter': 99.00, 'growth': 299.00, 'enterprise': 999.00}

        # 1. Create Tenant (starts as unpaid)
        tenant = Tenant.objects.create(
            name=validated_data['company_name'],
            plan=validated_data['plan'],
            payment_status='unpaid',
        )

        # 2. Create Admin user for this Tenant
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=validated_data['password'],
            tenant=tenant,
            role='admin',
        )

        # 3. Auto-create the activation invoice
        Invoice.objects.create(
            tenant=tenant,
            amount=PLAN_PRICES.get(validated_data['plan'], 99.00),
            due_date=date.today() + timedelta(days=7),
            status='pending',
        )

        return tenant, user


# ─────────────────────────────────────────────
# Login Serializer — returns JWT tokens
# ─────────────────────────────────────────────

class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(write_only=True)

    def validate(self, data):
        user = authenticate(username=data['username'], password=data['password'])
        if not user:
            raise serializers.ValidationError("Invalid username or password.")
        if not user.is_active:
            raise serializers.ValidationError("This account has been deactivated.")
        if user.tenant and not user.tenant.is_active:
            raise serializers.ValidationError("Your company account has been suspended.")

        # Generate JWT tokens
        refresh = RefreshToken.for_user(user)
        # Safely embed tenant_id (None for super-admins without a tenant)
        tenant_id = str(user.tenant.id) if user.tenant else None
        refresh['tenant_id'] = tenant_id
        refresh['role'] = user.role

        return {
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'role': user.role,
                'is_superadmin': user.is_superuser,
                'tenant': TenantSerializer(user.tenant).data if user.tenant else None,
            }
        }


# ─────────────────────────────────────────────
# User Serializer — for profile info
# ─────────────────────────────────────────────

class UserSerializer(serializers.ModelSerializer):
    tenant = TenantSerializer(read_only=True)

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'role', 'tenant', 'is_active', 'date_joined']
        read_only_fields = ['id', 'date_joined']


class InvoiceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Invoice
        fields = ['id', 'amount', 'issued_at', 'due_date', 'status', 'payment_method', 'paid_at']
        read_only_fields = ['id', 'amount', 'issued_at', 'due_date', 'status', 'paid_at']


class ProcessPaymentSerializer(serializers.Serializer):
    invoice_id = serializers.IntegerField()
    # Accept any non-empty string so all UPI apps, banks, EMI variants pass through
    payment_method = serializers.CharField(max_length=100)

    def validate_payment_method(self, value):
        if not value.strip():
            raise serializers.ValidationError("Payment method cannot be empty.")
        return value.strip()


# ─────────────────────────────────────────────
# Document Version Serializer
# ─────────────────────────────────────────────

class DocumentVersionSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source='created_by.username', read_only=True)

    class Meta:
        model = DocumentVersion
        fields = ['id', 'version_number', 'created_by_name', 'created_at']
        read_only_fields = fields


# ─────────────────────────────────────────────
# File Analytics Serializer
# ─────────────────────────────────────────────

class FileAnalyticsSerializer(serializers.ModelSerializer):
    class Meta:
        model = FileAnalytics
        fields = ['views_count', 'edits_count', 'downloads_count']
        read_only_fields = fields


# ─────────────────────────────────────────────
# Document Serializer (with nested analytics + versions)
# ─────────────────────────────────────────────

class DocumentSerializer(serializers.ModelSerializer):
    uploaded_by_name = serializers.CharField(source='uploaded_by.username', read_only=True)
    versions = DocumentVersionSerializer(many=True, read_only=True)
    analytics = FileAnalyticsSerializer(read_only=True)

    class Meta:
        model = Document
        fields = ['id', 'title', 'original_filename', 'file_type', 'file_size',
                  'status', 'uploaded_by_name', 'created_at', 'updated_at',
                  'versions', 'analytics']
        read_only_fields = ['id', 'original_filename', 'file_type', 'file_size',
                            'status', 'created_at', 'updated_at']

