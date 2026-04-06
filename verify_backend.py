"""
Live HTTP API verification - tests the real running server at http://127.0.0.1:8000
"""
import urllib.request, urllib.error, json, sys

BASE = "http://127.0.0.1:8000/api"

def post(path, data, token=None):
    body = json.dumps(data).encode()
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(f"{BASE}{path}", data=body, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req) as r:
            return r.status, json.loads(r.read())
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read())

def get(path, token):
    headers = {"Authorization": f"Bearer {token}"}
    req = urllib.request.Request(f"{BASE}{path}", headers=headers)
    try:
        with urllib.request.urlopen(req) as r:
            return r.status, json.loads(r.read())
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read())

print("=" * 60)
print("LIVE HTTP BACKEND VERIFICATION")
print("=" * 60)

credentials = [
    ("admin",        "Admin@1234"),
    ("startup_admin","Test@1234"),
    ("beta_admin",   "Beta@1234"),
    ("newcorp_admin","Corp@1234"),
]

all_passed = True

for username, password in credentials:
    code, resp = post("/auth/login/", {"username": username, "password": password})
    if code != 200:
        print(f"\n[FAIL] LOGIN {username}: HTTP {code} -- {resp}")
        all_passed = False
        continue

    token = resp["access"]
    tenant = resp["user"].get("tenant") or {}
    print(f"\n[OK]   LOGIN: {username} | tenant: {tenant.get('name', 'None (superadmin)')}")

    # Dashboard
    code, data = get("/dashboard/", token)
    ok = code == 200
    label = "OK  " if ok else "FAIL"
    name = data.get("tenant", {}).get("name", "?") if ok else data.get("detail", str(data))
    print(f"       /dashboard/  [{code}] {label} -- {name}")
    if not ok:
        all_passed = False

    # Billing
    code, data = get("/billing/", token)
    ok = code in [200, 403]
    label = "OK  " if ok else "FAIL"
    print(f"       /billing/    [{code}] {label}")
    if not ok:
        all_passed = False

    # Documents
    code, data = get("/documents/", token)
    ok = code in [200, 403]
    label = "OK  " if ok else "FAIL"
    print(f"       /documents/  [{code}] {label}")
    if not ok:
        all_passed = False

print("\n" + "=" * 60)
if all_passed:
    print("ALL CHECKS PASSED -- backend is fully operational!")
else:
    print("SOME CHECKS FAILED -- see above for details.")
print("=" * 60)
