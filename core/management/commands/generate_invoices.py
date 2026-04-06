import os
from datetime import date, timedelta
from django.core.management.base import BaseCommand
from core.models import Tenant, Invoice

class Command(BaseCommand):
    help = 'Simulates the monthly billing task: generates invoices for all active tenants.'

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('Starting monthly billing simulation...'))
        
        tenants = Tenant.objects.filter(is_active=True)
        count = 0
        
        # Simple pricing map
        pricing = {
            'starter': 99.00,
            'growth': 299.00,
            'enterprise': 999.00
        }

        for tenant in tenants:
            amount = pricing.get(tenant.plan, 99.00)
            
            # Create invoice
            invoice = Invoice.objects.create(
                tenant=tenant,
                amount=amount,
                due_date=date.today() + timedelta(days=30),
                status='pending'
            )
            self.stdout.write(f"Generated Invoice for {tenant.name}: ${amount}")
            count += 1

        self.stdout.write(self.style.SUCCESS(f'Successfully generated {count} invoices.'))
