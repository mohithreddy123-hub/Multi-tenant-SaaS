"""
Billing views: BillingView, PayInvoiceView
"""
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone

from .models import Invoice
from .serializers import InvoiceSerializer, ProcessPaymentSerializer


class BillingView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not request.user.tenant:
            return Response({'detail': 'Billing is not available for super-admin accounts.'}, status=403)
        invoices = Invoice.objects.filter(tenant=request.user.tenant).order_by('-issued_at')
        serializer = InvoiceSerializer(invoices, many=True)
        return Response(serializer.data)


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

                # Activate the tenant on first successful payment
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
