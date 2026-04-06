import urllib.request
import json
import os
import glob

# 1. Login
req = urllib.request.Request('http://127.0.0.1:8000/api/auth/login/', data=json.dumps({'username': 'beta_admin', 'password': 'Beta@1234'}).encode(), headers={'Content-Type': 'application/json'}, method='POST')
with urllib.request.urlopen(req) as r:
    tok = json.loads(r.read())['access']

headers = {'Authorization': 'Bearer ' + tok}

# 2. Upload dummy file
boundary = '------WebKitFormBoundary7MA4YWxkTrZu0gW'
body = (
    '--' + boundary + '\r\n'
    'Content-Disposition: form-data; name="title"\r\n\r\n'
    'Top Secret Report\r\n'
    '--' + boundary + '\r\n'
    'Content-Disposition: form-data; name="file"; filename="report.txt"\r\n'
    'Content-Type: text/plain\r\n\r\n'
    'THIS IS TOP SECRET COMPANY DATA that must be encrypted at rest!\r\n'
    '--' + boundary + '--\r\n'
).encode('utf-8')

req2 = urllib.request.Request('http://127.0.0.1:8000/api/documents/upload/', data=body, headers={**headers, 'Content-Type': 'multipart/form-data; boundary=' + boundary}, method='POST')
try:
    with urllib.request.urlopen(req2) as r2:
        doc_data = json.loads(r2.read())
        doc_id = doc_data['id']
        print(f'UPLOAD OK: ID {doc_id}, size {doc_data["file_size"]}, title {doc_data["title"]}')
except Exception as e:
    print('UPLOAD ERR:', getattr(e, "read", lambda: getattr(e, "msg", str(e)))().decode('utf-8'))
    exit(1)

# 3. Read encrypted file from disk to verify it's scrambled
files = glob.glob('c:/Multi-tenant/media/encrypted_docs/*/*/*.txt')
if files:
    
    # Sort by modification time to get the latest
    latest_file = max(files, key=os.path.getmtime)
    with open(latest_file, 'rb') as f:
        print('ENCRYPTED DISK CONTENT (raw bytes):', f.read(50))

# 4. Download file via API and ensure it's decrypted
req3 = urllib.request.Request(f'http://127.0.0.1:8000/api/documents/{doc_id}/download/', headers=headers)
with urllib.request.urlopen(req3) as r3:
    print('DOWNLOAD (Decrypted) CONTENT:\n', r3.read().decode())
