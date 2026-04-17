from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated

from rest_framework_simplejwt.tokens import RefreshToken
from .serializers import (
    TenantRegistrationSerializer,
    LoginSerializer,
    UserSerializer,
    InvoiceSerializer,
    ProcessPaymentSerializer,
    DocumentSerializer,
    DocumentVersionSerializer,
)
from .models import Invoice
from .models import User
from django.utils import timezone
from django.contrib.auth import update_session_auth_hash


# ─────────────────────────────────────────────
# POST /api/auth/register/
# ─────────────────────────────────────────────

class TenantRegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = TenantRegistrationSerializer(data=request.data)
        if serializer.is_valid():
            tenant, user = serializer.save()
            return Response({
                'message': f'Welcome! {tenant.name} has been registered successfully.',
                'tenant': {
                    'id': str(tenant.id),
                    'name': tenant.name,
                    'domain': tenant.domain,
                    'plan': tenant.plan,
                    'storage_limit_gb': tenant.storage_limit_gb,
                    'user_limit': tenant.user_limit,
                },
                'admin_user': {
                    'id': user.id,
                    'username': user.username,
                    'email': user.email,
                    'role': user.role,
                },
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# ─────────────────────────────────────────────
# POST /api/auth/login/
# ─────────────────────────────────────────────

class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        if serializer.is_valid():
            return Response(serializer.validated_data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_401_UNAUTHORIZED)


# ─────────────────────────────────────────────
# GET /api/auth/me/
# ─────────────────────────────────────────────

class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data, status=status.HTTP_200_OK)


# ─────────────────────────────────────────────
# GET /api/dashboard/
# ─────────────────────────────────────────────

class DashboardView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        tenant = user.tenant

        # ── Super-admin: no tenant, show platform-wide stats ──
        if not tenant:
            from .models import Tenant, Document
            return Response({
                'tenant': {
                    'id': None,
                    'name': 'Platform Admin',
                    'domain': 'admin.yourapp.com',
                    'plan': 'Super Admin',
                    'is_active': True,
                    'payment_status': 'paid',
                    'storage_limit_gb': 0,
                    'user_limit': 0,
                },
                'stats': {
                    'total_active_users': User.objects.filter(is_active=True).count(),
                    'total_documents': Document.objects.count(),
                    'used_storage_gb': 0,
                    'storage_percent': 0,
                    'total_tenants': Tenant.objects.count(),
                },
                'logged_in_as': {
                    'username': user.username,
                    'email': user.email,
                    'role': 'superadmin',
                }
            })

        # ━━ PAYMENT WALL: block if tenant has not activated ━━
        if tenant.payment_status == 'unpaid':
            # Return the pending invoice so the frontend can show the payment form
            pending_invoice = tenant.invoices.filter(status='pending').first()
            return Response({
                'payment_required': True,
                'message': 'Your workspace is not yet activated. Please complete your payment.',
                'invoice': {
                    'id': pending_invoice.id if pending_invoice else None,
                    'amount': str(pending_invoice.amount) if pending_invoice else '0.00',
                    'plan': tenant.plan,
                } if pending_invoice else None,
            }, status=status.HTTP_402_PAYMENT_REQUIRED)

        total_users = tenant.users.filter(is_active=True).count()
        total_docs = tenant.documents.count()
        used_bytes = sum(d.file_size for d in tenant.documents.all())
        used_gb = round(used_bytes / (1024 ** 3), 4)
        storage_pct = round((used_gb / tenant.storage_limit_gb) * 100, 2) if tenant.storage_limit_gb else 0

        return Response({
            'tenant': {
                'id': str(tenant.id),
                'name': tenant.name,
                'domain': tenant.domain,
                'plan': tenant.get_plan_display(),
                'is_active': tenant.is_active,
                'payment_status': tenant.payment_status,
                'storage_limit_gb': tenant.storage_limit_gb,
                'user_limit': tenant.user_limit,
            },
            'stats': {
                'total_active_users': total_users,
                'total_documents': total_docs,
                'used_storage_gb': used_gb,
                'storage_percent': storage_pct,
            },
            'logged_in_as': {
                'username': user.username,
                'email': user.email,
                'role': user.role,
            }
        })


# ─────────────────────────────────────────────
# GET /api/billing/
# ─────────────────────────────────────────────

class BillingView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not request.user.tenant:
            return Response({'detail': 'Billing is not available for super-admin accounts.'}, status=403)

        invoices = Invoice.objects.filter(tenant=request.user.tenant).order_by('-issued_at')
        serializer = InvoiceSerializer(invoices, many=True)
        return Response(serializer.data)


# ─────────────────────────────────────────────
# POST /api/billing/pay/
# ─────────────────────────────────────────────

class PayInvoiceView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ProcessPaymentSerializer(data=request.data)
        if serializer.is_valid():
            invoice_id = serializer.validated_data['invoice_id']
            method = serializer.validated_data['payment_method']

            try:
                invoice = Invoice.objects.get(id=invoice_id, tenant=request.user.tenant)

                if invoice.status == 'paid':
                    return Response({'detail': 'Invoice already paid.'}, status=400)

                invoice.status = 'paid'
                invoice.payment_method = method
                invoice.paid_at = timezone.now()
                invoice.save()

                # ━━ ACTIVATE the tenant on first successful payment ━━
                tenant = request.user.tenant
                if tenant.payment_status == 'unpaid':
                    tenant.payment_status = 'paid'
                    tenant.save(update_fields=['payment_status'])

                return Response({
                    'message': f'Payment of ₹{invoice.amount} via {method} was successful! Your workspace is now active.',
                    'invoice': InvoiceSerializer(invoice).data,
                    'workspace_activated': True,
                })
            except Invoice.DoesNotExist:
                return Response({'detail': 'Invoice not found.'}, status=404)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# ─────────────────────────────────────────────
# TEAM MANAGEMENT
# ─────────────────────────────────────────────

class TeamView(APIView):
    """
    GET  /api/team/  — list all users in the tenant
    POST /api/team/  — admin adds a new team member (enforces user_limit)
    DELETE /api/team/<user_id>/ — admin removes a member
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        tenant = request.user.tenant
        if not tenant:
            return Response({'detail': 'No tenant.'}, status=403)
        members = tenant.users.all().order_by('date_joined')
        return Response({
            'members': [
                {
                    'id': u.id,
                    'username': u.username,
                    'email': u.email,
                    'role': u.role,
                    'is_active': u.is_active,
                    'date_joined': u.date_joined.strftime('%b %d, %Y'),
                } for u in members
            ],
            'user_limit': tenant.user_limit,
            'current_count': members.count(),
            'slots_remaining': tenant.user_limit - members.count(),
        })

    def post(self, request):
        tenant = request.user.tenant
        if not tenant:
            return Response({'detail': 'No tenant.'}, status=403)
        if request.user.role != 'admin':
            return Response({'detail': 'Only admins can add team members.'}, status=403)

        current_count = tenant.users.count()
        if current_count >= tenant.user_limit:
            return Response({
                'detail': f'User limit reached ({tenant.user_limit}/{tenant.user_limit}). Upgrade your plan to add more members.'
            }, status=400)

        username = request.data.get('username', '').strip().lower()
        email    = request.data.get('email', '').strip()
        password = request.data.get('password', '').strip()
        role     = request.data.get('role', 'member')

        if not username or not email or not password:
            return Response({'detail': 'Username, email, and password are required.'}, status=400)
        if len(password) < 6:
            return Response({'detail': 'Password must be at least 6 characters.'}, status=400)
        if User.objects.filter(username__iexact=username).exists():
            return Response({'detail': f'Username "{username}" is already taken.'}, status=400)
        if User.objects.filter(email__iexact=email).exists():
            return Response({'detail': f'Email "{email}" is already registered.'}, status=400)

        new_user = User.objects.create_user(
            username=username,
            email=email,
            password=password,
            tenant=tenant,
            role=role if role in ['admin', 'member'] else 'member',
        )
        return Response({
            'message': f'✅ {username} has been added to {tenant.name}.',
            'member': {
                'id': new_user.id,
                'username': new_user.username,
                'email': new_user.email,
                'role': new_user.role,
            }
        }, status=201)

    def delete(self, request, user_id):
        tenant = request.user.tenant
        if request.user.role != 'admin':
            return Response({'detail': 'Only admins can remove members.'}, status=403)
        if request.user.id == user_id:
            return Response({'detail': 'You cannot remove yourself.'}, status=400)
        try:
            member = User.objects.get(id=user_id, tenant=tenant)
            member.delete()
            return Response({'message': f'{member.username} has been removed.'})
        except User.DoesNotExist:
            return Response({'detail': 'User not found.'}, status=404)


# ─────────────────────────────────────────────
# SETTINGS API
# ─────────────────────────────────────────────


class UpdateProfileView(APIView):
    """PATCH /api/settings/profile/ — update username & email"""
    permission_classes = [IsAuthenticated]

    def patch(self, request):
        user = request.user
        username = request.data.get('username', '').strip()
        email = request.data.get('email', '').strip()

        if username and username != user.username:
            if User.objects.filter(username__iexact=username).exclude(pk=user.pk).exists():
                return Response({'detail': 'Username already taken.'}, status=400)
            user.username = username

        if email and email != user.email:
            if User.objects.filter(email__iexact=email).exclude(pk=user.pk).exists():
                return Response({'detail': 'Email already in use by another account.'}, status=400)
            user.email = email

        user.save()
        return Response({'message': 'Profile updated successfully.', 'username': user.username, 'email': user.email})


class UpdatePasswordView(APIView):
    """PATCH /api/settings/password/ — change password"""
    permission_classes = [IsAuthenticated]

    def patch(self, request):
        user = request.user
        current = request.data.get('current_password', '')
        new_pass = request.data.get('new_password', '')

        if not user.check_password(current):
            return Response({'detail': 'Current password is incorrect.'}, status=400)
        if len(new_pass) < 8:
            return Response({'detail': 'New password must be at least 8 characters.'}, status=400)

        user.set_password(new_pass)
        user.save()
        return Response({'message': 'Password changed successfully. Please log in again.'})


class UpdateWorkspaceView(APIView):
    """PATCH /api/settings/workspace/ — update company name (admin only)"""
    permission_classes = [IsAuthenticated]

    def patch(self, request):
        user = request.user
        if user.role != 'admin':
            return Response({'detail': 'Only workspace admins can change workspace settings.'}, status=403)
        if not user.tenant:
            return Response({'detail': 'No workspace associated.'}, status=400)

        tenant = user.tenant
        name = request.data.get('name', '').strip()

        if name and name != tenant.name:
            from .models import Tenant
            if Tenant.objects.filter(name__iexact=name).exclude(pk=tenant.pk).exists():
                return Response({'detail': 'A workspace with this name already exists.'}, status=400)
            tenant.name = name
            # Regenerate domain slug
            tenant.domain = f"{name.lower().replace(' ', '')}.yourapp.com"
            tenant.save()

        return Response({
            'message': 'Workspace updated successfully.',
            'name': tenant.name,
            'domain': tenant.domain,
        })


# ─────────────────────────────────────────────
# DOCUMENTS
# ─────────────────────────────────────────────

from .models import Document, DocumentVersion, AuditLog, FileAnalytics
from django.core.files.base import ContentFile
from .utils.encryption import encrypt_bytes, decrypt_bytes
from django.http import HttpResponse
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer


def _broadcast_dashboard_update(tenant_id, event_type, payload):
    """Helper: broadcast a WebSocket event to all users in a tenant's room."""
    channel_layer = get_channel_layer()
    async_to_sync(channel_layer.group_send)(
        f"tenant_{tenant_id}",
        {
            'type': 'dashboard_update',
            'event': event_type,
            **payload,
        }
    )


# ─────────────────────────────────────────────
# GET /api/documents/
# ─────────────────────────────────────────────

class DocumentListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not request.user.tenant:
            return Response({'detail': 'Documents are not available for super-admin accounts.'}, status=403)

        docs = Document.objects.filter(tenant=request.user.tenant).prefetch_related('versions', 'analytics')
        serializer = DocumentSerializer(docs, many=True)
        return Response(serializer.data)


# ─────────────────────────────────────────────
# POST /api/documents/upload/
# ─────────────────────────────────────────────

class DocumentUploadView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        tenant = user.tenant

        if not tenant:
            return Response({'detail': 'No tenant associated.'}, status=400)

        used_storage_bytes = sum(d.file_size for d in tenant.documents.all())
        limit_bytes = tenant.storage_limit_gb * 1024 * 1024 * 1024

        if 'file' not in request.FILES:
            return Response({'detail': 'No file provided.'}, status=400)

        uploaded_file = request.FILES['file']

        if used_storage_bytes + uploaded_file.size > limit_bytes:
            return Response({'detail': f'Storage limit exceeded ({tenant.storage_limit_gb} GB).'}, status=400)

        raw_bytes = uploaded_file.read()
        encrypted_bytes = encrypt_bytes(raw_bytes)

        doc = Document(
            tenant=tenant,
            uploaded_by=user,
            title=request.POST.get('title', uploaded_file.name),
            original_filename=uploaded_file.name,
            file_type=uploaded_file.content_type or 'application/octet-stream',
            file_size=uploaded_file.size
        )
        doc.encrypted_file.save(uploaded_file.name, ContentFile(encrypted_bytes), save=False)
        doc.save()

        # Create version 1
        version = DocumentVersion(document=doc, version_number=1, created_by=user)
        version.encrypted_file.save(uploaded_file.name, ContentFile(encrypted_bytes), save=False)
        version.save()

        # Create analytics record
        FileAnalytics.objects.create(document=doc)

        # Log upload
        AuditLog.objects.create(
            tenant=tenant, user=user, action='UPLOAD', document=doc,
            detail=f'Uploaded {doc.original_filename} ({doc.file_size} bytes)'
        )

        # ── Real-time broadcast to dashboard ──
        try:
            _broadcast_dashboard_update(str(tenant.id), 'document_uploaded', {
                'doc_id': doc.id,
                'doc_title': doc.title,
                'uploader': user.username,
            })
        except Exception:
            pass  # Don't fail upload if WS broadcast fails

        return Response(DocumentSerializer(doc).data, status=status.HTTP_201_CREATED)


# ─────────────────────────────────────────────
# GET /api/documents/<id>/download/
# ─────────────────────────────────────────────

class DocumentDownloadView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        if not request.user.tenant:
            return Response({'detail': 'No tenant associated.'}, status=400)

        try:
            doc = Document.objects.get(id=pk, tenant=request.user.tenant)
        except Document.DoesNotExist:
            return Response({'detail': 'Document not found.'}, status=404)

        try:
            with doc.encrypted_file.open('rb') as f:
                encrypted_bytes = f.read()

            decrypted_bytes = decrypt_bytes(encrypted_bytes)

            response = HttpResponse(decrypted_bytes, content_type=doc.file_type)
            response['Content-Disposition'] = f'attachment; filename="{doc.original_filename}"'

            # Log download
            AuditLog.objects.create(
                tenant=request.user.tenant, user=request.user,
                action='DOWNLOAD', document=doc,
                detail=f'Downloaded {doc.original_filename}'
            )

            # Update analytics
            analytics, _ = FileAnalytics.objects.get_or_create(document=doc)
            analytics.downloads_count += 1
            analytics.save()

            return response

        except Exception as e:
            return Response({'detail': f'Error decrypting file: {str(e)}'}, status=500)


# ─────────────────────────────────────────────
# GET /api/documents/<id>/versions/
# Returns all saved versions for a document
# ─────────────────────────────────────────────

class DocumentVersionListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        try:
            doc = Document.objects.get(id=pk, tenant=request.user.tenant)
        except Document.DoesNotExist:
            return Response({'detail': 'Document not found.'}, status=404)

        versions = doc.versions.all()
        serializer = DocumentVersionSerializer(versions, many=True)
        return Response(serializer.data)


# ─────────────────────────────────────────────
# POST /api/documents/<id>/rollback/<version_number>/
# Restores the document to a specific version
# ─────────────────────────────────────────────

class DocumentRollbackView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk, version_number):
        try:
            doc = Document.objects.get(id=pk, tenant=request.user.tenant)
        except Document.DoesNotExist:
            return Response({'detail': 'Document not found.'}, status=404)

        try:
            target_version = DocumentVersion.objects.get(document=doc, version_number=version_number)
        except DocumentVersion.DoesNotExist:
            return Response({'detail': f'Version {version_number} not found.'}, status=404)

        # Read the old encrypted content
        with target_version.encrypted_file.open('rb') as f:
            old_encrypted_bytes = f.read()

        # Save it as a new version on the document
        next_version_number = doc.versions.count() + 1
        new_version = DocumentVersion(
            document=doc,
            version_number=next_version_number,
            created_by=request.user
        )
        new_version.encrypted_file.save(
            doc.original_filename,
            ContentFile(old_encrypted_bytes),
            save=False
        )
        new_version.save()

        # Overwrite the active document file
        doc.encrypted_file.delete(save=False)
        doc.encrypted_file.save(doc.original_filename, ContentFile(old_encrypted_bytes), save=False)
        doc.save()

        # Log rollback
        AuditLog.objects.create(
            tenant=request.user.tenant, user=request.user,
            action='EDIT', document=doc,
            detail=f'Rolled back to version {version_number} (new version {next_version_number})'
        )

        # Update analytics
        analytics, _ = FileAnalytics.objects.get_or_create(document=doc)
        analytics.edits_count += 1
        analytics.save()

        return Response({
            'message': f'Document rolled back to version {version_number} successfully.',
            'new_version_number': next_version_number,
            'document': DocumentSerializer(doc).data,
        })


# ─────────────────────────────────────────────
# GET /api/documents/<id>/analytics/
# Returns per-document analytics stats
# ─────────────────────────────────────────────

class DocumentAnalyticsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        try:
            doc = Document.objects.get(id=pk, tenant=request.user.tenant)
        except Document.DoesNotExist:
            return Response({'detail': 'Document not found.'}, status=404)

        analytics, _ = FileAnalytics.objects.get_or_create(document=doc)

        # Increment views count
        analytics.views_count += 1
        analytics.save()

        return Response({
            'doc_id': doc.id,
            'doc_title': doc.title,
            'views_count': analytics.views_count,
            'downloads_count': analytics.downloads_count,
            'edits_count': analytics.edits_count,
        })
