import os, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from django.contrib.auth import authenticate
from core.models import User

tests = [
    ('admin',        'Admin@1234'),
    ('startup_admin','Test@1234'),
    ('beta_admin',   'Beta@1234'),
    ('newcorp_admin','Corp@1234'),
]

print("=== Auth Diagnostic ===")
for username, password in tests:
    user = authenticate(username=username, password=password)
    print(f"  {username}: {'OK' if user else 'FAIL - wrong password'}")

# Also check admin has no tenant (that's expected)
admin = User.objects.get(username='admin')
print(f"\n  admin has tenant: {admin.tenant}")
print(f"  startup_admin has tenant: {User.objects.get(username='startup_admin').tenant}")
