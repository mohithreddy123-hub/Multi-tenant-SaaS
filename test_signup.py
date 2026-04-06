import json
import urllib.request
import urllib.error

BASE = 'http://127.0.0.1:8000/api'

def post(url, data):
    req = urllib.request.Request(
        url, 
        data=json.dumps(data).encode(), 
        headers={'Content-Type': 'application/json'}, 
        method='POST'
    )
    try:
        with urllib.request.urlopen(req) as r:
            return r.status, json.loads(r.read())
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read())

def get(url, token):
    req = urllib.request.Request(url, headers={'Authorization': f'Bearer {token}'})
    with urllib.request.urlopen(req) as r:
        return r.status, json.loads(r.read())

print('--- STEP 1: Register BetaVentures ---')
code, res = post(f'{BASE}/auth/register/', {
    'company_name': 'BetaVentures',
    'plan': 'growth',
    'username': 'beta_admin',
    'email': 'admin@betaventures.com',
    'password': 'Beta@1234'
})
print(f'Status: {code}')
if code == 201:
    t = res['tenant']
    print(f"Company : {t['name']}")
    print(f"Domain  : {t['domain']}")
    print(f"Plan    : {t['plan']}")
    print(f"Storage : {t['storage_limit_gb']} GB")
    print(f"Users   : {t['user_limit']} max users")
elif code == 400:
    print('Already exists or validation error:', res)
else:
    print('Error:', res)

print()
print('--- STEP 2: Login as beta_admin ---')
code, res = post(f'{BASE}/auth/login/', {
    'username': 'beta_admin',
    'password': 'Beta@1234'
})
print(f'Status: {code}')
token = res.get('access', '')
user = res.get('user', {})
print(f"Logged in as : {user.get('username')} ({user.get('role')})")
print(f"JWT (preview): {token[:60]}...")

print()
print('--- STEP 3: Dashboard (tenant-scoped) ---')
code, res = get(f'{BASE}/dashboard/', token)
print(f'Status: {code}')
print(json.dumps(res, indent=2))
