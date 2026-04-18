"""
Document views: List, Upload (with size + MIME validation), Download, Preview,
                VersionList, Rollback (admin-only), Analytics
"""
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from django.core.files.base import ContentFile
from django.http import HttpResponse
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

from .models import Document, DocumentVersion, AuditLog, FileAnalytics
from .serializers import DocumentSerializer, DocumentVersionSerializer
from .utils.encryption import encrypt_bytes, decrypt_bytes

# ── Per-file upload cap (Issue 2 + 4: memory bound) ──
MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024  # 100 MB

# ── Permitted MIME types (Issue 3: backend whitelist) ──
ALLOWED_MIME_TYPES = {
    'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
    'video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm',
    'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4', 'audio/x-m4a',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain', 'text/csv',
    'application/zip', 'application/x-rar-compressed',
    'application/x-7z-compressed', 'application/x-tar', 'application/gzip',
    'application/octet-stream',
}


def _broadcast_dashboard_update(tenant_id, event_type, payload):
    """Broadcast a WebSocket event to all users in a tenant's room."""
    channel_layer = get_channel_layer()
    async_to_sync(channel_layer.group_send)(
        f"tenant_{tenant_id}",
        {'type': 'dashboard_update', 'event': event_type, **payload}
    )


class DocumentListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not request.user.tenant:
            return Response({'detail': 'Documents are not available for super-admin accounts.'}, status=403)
        docs = Document.objects.filter(tenant=request.user.tenant).prefetch_related('versions', 'analytics')
        return Response(DocumentSerializer(docs, many=True).data)


class DocumentUploadView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        tenant = user.tenant

        if not tenant:
            return Response({'detail': 'No tenant associated.'}, status=400)

        if 'file' not in request.FILES:
            return Response({'detail': 'No file provided.'}, status=400)

        uploaded_file = request.FILES['file']

        # Issue 2: Validate size BEFORE reading into memory
        if uploaded_file.size > MAX_FILE_SIZE_BYTES:
            return Response({'detail': 'File exceeds the 100 MB per-file limit.'}, status=400)

        # Issue 3: Backend MIME type whitelist
        file_mime = (uploaded_file.content_type or 'application/octet-stream').split(';')[0].strip()
        if file_mime not in ALLOWED_MIME_TYPES:
            return Response({'detail': f'File type "{file_mime}" is not permitted.'}, status=400)

        # Storage quota check
        used_storage_bytes = sum(d.file_size for d in tenant.documents.all())
        limit_bytes = tenant.storage_limit_gb * 1024 * 1024 * 1024
        if used_storage_bytes + uploaded_file.size > limit_bytes:
            return Response({'detail': f'Storage limit exceeded ({tenant.storage_limit_gb} GB).'}, status=400)

        raw_bytes = uploaded_file.read()
        encrypted_bytes = encrypt_bytes(raw_bytes)

        doc = Document(
            tenant=tenant,
            uploaded_by=user,
            title=request.POST.get('title', uploaded_file.name),
            original_filename=uploaded_file.name,
            file_type=file_mime,
            file_size=uploaded_file.size
        )
        doc.encrypted_file.save(uploaded_file.name, ContentFile(encrypted_bytes), save=False)
        doc.save()

        version = DocumentVersion(document=doc, version_number=1, created_by=user)
        version.encrypted_file.save(uploaded_file.name, ContentFile(encrypted_bytes), save=False)
        version.save()

        FileAnalytics.objects.create(document=doc)
        AuditLog.objects.create(
            tenant=tenant, user=user, action='UPLOAD', document=doc,
            detail=f'Uploaded {doc.original_filename} ({doc.file_size} bytes)'
        )

        try:
            _broadcast_dashboard_update(str(tenant.id), 'document_uploaded', {
                'doc_id': doc.id, 'doc_title': doc.title, 'uploader': user.username,
            })
        except Exception:
            pass

        return Response(DocumentSerializer(doc).data, status=status.HTTP_201_CREATED)


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

            AuditLog.objects.create(
                tenant=request.user.tenant, user=request.user,
                action='DOWNLOAD', document=doc,
                detail=f'Downloaded {doc.original_filename}'
            )
            analytics, _ = FileAnalytics.objects.get_or_create(document=doc)
            analytics.downloads_count += 1
            analytics.save()
            return response
        except Exception as e:
            return Response({'detail': f'Error decrypting file: {str(e)}'}, status=500)


class DocumentPreviewView(APIView):
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
            response['Content-Disposition'] = f'inline; filename="{doc.original_filename}"'
            response['X-Frame-Options'] = 'SAMEORIGIN'

            AuditLog.objects.create(
                tenant=request.user.tenant, user=request.user,
                action='VIEW', document=doc,
                detail=f'Previewed {doc.original_filename}'
            )
            analytics, _ = FileAnalytics.objects.get_or_create(document=doc)
            analytics.views_count += 1
            analytics.save()
            return response
        except Exception as e:
            return Response({'detail': f'Error previewing file: {str(e)}'}, status=500)


class DocumentVersionListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        try:
            doc = Document.objects.get(id=pk, tenant=request.user.tenant)
        except Document.DoesNotExist:
            return Response({'detail': 'Document not found.'}, status=404)
        return Response(DocumentVersionSerializer(doc.versions.all(), many=True).data)


class DocumentRollbackView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk, version_number):
        # Issue 1: RBAC — only admins may overwrite the active document
        if request.user.role != 'admin':
            return Response({'detail': 'Only admins can roll back documents.'}, status=403)

        try:
            doc = Document.objects.get(id=pk, tenant=request.user.tenant)
        except Document.DoesNotExist:
            return Response({'detail': 'Document not found.'}, status=404)

        try:
            target_version = DocumentVersion.objects.get(document=doc, version_number=version_number)
        except DocumentVersion.DoesNotExist:
            return Response({'detail': f'Version {version_number} not found.'}, status=404)

        with target_version.encrypted_file.open('rb') as f:
            old_encrypted_bytes = f.read()

        next_version_number = doc.versions.count() + 1
        new_version = DocumentVersion(document=doc, version_number=next_version_number, created_by=request.user)
        new_version.encrypted_file.save(doc.original_filename, ContentFile(old_encrypted_bytes), save=False)
        new_version.save()

        doc.encrypted_file.delete(save=False)
        doc.encrypted_file.save(doc.original_filename, ContentFile(old_encrypted_bytes), save=False)
        doc.save()

        AuditLog.objects.create(
            tenant=request.user.tenant, user=request.user,
            action='EDIT', document=doc,
            detail=f'Rolled back to version {version_number} (new version {next_version_number})'
        )
        analytics, _ = FileAnalytics.objects.get_or_create(document=doc)
        analytics.edits_count += 1
        analytics.save()

        return Response({
            'message': f'Document rolled back to version {version_number} successfully.',
            'new_version_number': next_version_number,
            'document': DocumentSerializer(doc).data,
        })


class DocumentAnalyticsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        try:
            doc = Document.objects.get(id=pk, tenant=request.user.tenant)
        except Document.DoesNotExist:
            return Response({'detail': 'Document not found.'}, status=404)

        analytics, _ = FileAnalytics.objects.get_or_create(document=doc)
        analytics.views_count += 1
        analytics.save()

        return Response({
            'doc_id': doc.id,
            'doc_title': doc.title,
            'views_count': analytics.views_count,
            'downloads_count': analytics.downloads_count,
            'edits_count': analytics.edits_count,
        })


class DocumentDeleteView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, pk):
        # RBAC: only admins may permanently delete documents
        if request.user.role != 'admin':
            return Response({'detail': 'Only admins can delete documents.'}, status=403)

        try:
            doc = Document.objects.get(id=pk, tenant=request.user.tenant)
        except Document.DoesNotExist:
            return Response({'detail': 'Document not found.'}, status=404)

        doc_id = doc.id
        doc_title = doc.title

        # Delete the document (Django will handle deleting associated versions and analytics due to CASCADE)
        doc.delete()

        # Log deletion
        AuditLog.objects.create(
            tenant=request.user.tenant, user=request.user,
            action='DELETE',
            detail=f'Deleted document {doc_title}'
        )

        # Broadcast deletion to dashboard so all users see it disappear
        try:
            _broadcast_dashboard_update(str(request.user.tenant.id), 'document_deleted', {
                'doc_id': doc_id,
            })
        except Exception:
            pass

        return Response({'message': f'Document "{doc_title}" deleted successfully.'}, status=200)

