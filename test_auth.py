"""
Quick integration test for Part 2 — JWT Auth endpoints.
Run with: python test_auth.py
"""
import json
import urllib.request
import urllib.error

BASE = "http://127.0.0.1:8000/api"

def post(url, data):
    req = urllib.request.Request(
        url,
        data=json.dumps(data).encode(),
        headers={"Content-Type": "application/json"},
        method="POST"
    )
    try:
        with urllib.request.urlopen(req) as r:
            return r.status, json.loads(r.read())
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read())

def get(url, token):
    req = urllib.request.Request(url, headers={"Authorization": f"Bearer {token}"})
    try:
        with urllib.request.urlopen(req) as r:
            return r.status, json.loads(r.read())
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read())

print("=" * 55)
print("TEST 1: Register a new Tenant (TechStartup)")
print("=" * 55)
code, res = post(f"{BASE}/auth/register/", {
    "company_name": "TechStartup",
    "plan": "starter",
    "username": "startup_admin",
    "email": "admin@techstartup.com",
    "password": "Test@1234"
})
print(f"Status: {code}")
print(json.dumps(res, indent=2))

print("\n" + "=" * 55)
print("TEST 2: Login with startup_admin credentials")
print("=" * 55)
code, res = post(f"{BASE}/auth/login/", {
    "username": "startup_admin",
    "password": "Test@1234"
})
print(f"Status: {code}")
access_token = res.get("access", "")
print(f"Access Token: {access_token[:40]}...")
print(f"Tenant: {res.get('user', {}).get('tenant', {}).get('name')}")
print(f"Role: {res.get('user', {}).get('role')}")

print("\n" + "=" * 55)
print("TEST 3: GET /api/auth/me/ (with JWT token)")
print("=" * 55)
code, res = get(f"{BASE}/auth/me/", access_token)
print(f"Status: {code}")
print(json.dumps(res, indent=2))

print("\n" + "=" * 55)
print("TEST 4: GET /api/dashboard/ (tenant-scoped data)")
print("=" * 55)
code, res = get(f"{BASE}/dashboard/", access_token)
print(f"Status: {code}")
print(json.dumps(res, indent=2))

print("\n" + "=" * 55)
print("TEST 5: Login attempt with WRONG password")
print("=" * 55)
code, res = post(f"{BASE}/auth/login/", {
    "username": "startup_admin",
    "password": "WrongPassword"
})
print(f"Status: {code} (expected 401)")
print(json.dumps(res, indent=2))

print("\nAll tests completed!")
