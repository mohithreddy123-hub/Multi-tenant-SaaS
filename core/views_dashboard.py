"""
Dashboard view: DashboardView
"""
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated

from .models import User


class DashboardView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        tenant = user.tenant

        # Super-admin: no tenant, show platform-wide stats
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

        # Payment wall: block if tenant has not activated
        if tenant.payment_status == 'unpaid':
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
