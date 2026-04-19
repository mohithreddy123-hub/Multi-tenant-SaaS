"""
core/tasks.py — Celery background tasks.

encrypt_and_finalize_document:
    Reads the temporary raw (unencrypted) file saved during upload,
    performs AES-128 Fernet encryption, writes the encrypted file,
    creates the DocumentVersion snapshot, initialises FileAnalytics,
    logs the AuditLog entry, removes the temp raw file, and broadcasts
    a WebSocket event so all connected users see the document become ready.
"""
from celery import shared_task
from django.core.files.base import ContentFile


@shared_task(bind=True, max_retries=3, default_retry_delay=30)
def encrypt_and_finalize_document(self, doc_id):
    """
    Background task: encrypt the raw uploaded file and finalise the Document record.
    Called immediately after the upload view returns 202, so the server stays responsive.
    """
    # Import inside the task to avoid circular imports at module load time
    from .models import Document, DocumentVersion, AuditLog, FileAnalytics
    from .utils.encryption import encrypt_bytes
    from channels.layers import get_channel_layer
    from asgiref.sync import async_to_sync

    try:
        doc = Document.objects.get(id=doc_id)
    except Document.DoesNotExist:
        return  # Document was deleted before the task ran — nothing to do

    try:
        # ── Step 1: Read the raw (unencrypted) bytes from the temp file ──
        with doc.raw_file.open('rb') as f:
            raw_bytes = f.read()

        # ── Step 2: Encrypt (the heavy CPU operation — now off the web thread) ──
        encrypted_bytes = encrypt_bytes(raw_bytes)

        # ── Step 3: Save the encrypted file and mark document as ready ──
        doc.encrypted_file.save(
            doc.original_filename,
            ContentFile(encrypted_bytes),
            save=False
        )
        doc.status = 'ready'
        doc.save(update_fields=['encrypted_file', 'status', 'updated_at'])

        # ── Step 4: Delete the temp raw file immediately (security) ──
        doc.raw_file.delete(save=True)

        # ── Step 5: Create version 1 snapshot ──
        version = DocumentVersion(document=doc, version_number=1, created_by=doc.uploaded_by)
        version.encrypted_file.save(
            doc.original_filename,
            ContentFile(encrypted_bytes),
            save=True
        )

        # ── Step 6: Create analytics record ──
        FileAnalytics.objects.get_or_create(document=doc)

        # ── Step 7: Write AuditLog ──
        AuditLog.objects.create(
            tenant=doc.tenant,
            user=doc.uploaded_by,
            action='UPLOAD',
            document=doc,
            detail=f'Encrypted and stored {doc.original_filename} ({doc.file_size} bytes)'
        )

        # ── Step 8: Broadcast WebSocket event — all users see the doc go "ready" ──
        try:
            channel_layer = get_channel_layer()
            async_to_sync(channel_layer.group_send)(
                f"tenant_{doc.tenant.id}",
                {
                    'type': 'dashboard_update',
                    'event': 'document_ready',
                    'doc_id': doc.id,
                    'doc_title': doc.title,
                    'uploader': doc.uploaded_by.username if doc.uploaded_by else 'Unknown',
                }
            )
        except Exception:
            pass  # Don't fail the task if the WebSocket broadcast fails

    except Exception as exc:
        # Mark document as failed so the frontend can show an error badge
        try:
            doc.status = 'failed'
            doc.save(update_fields=['status'])
        except Exception:
            pass
        # Retry the task up to 3 times with a 30-second delay
        raise self.retry(exc=exc)
