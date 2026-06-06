import os
import requests

token = os.environ.get("TEST_TOKEN", "")
if not token:
    print("Set TEST_TOKEN env var to run")
    exit(1)

r2 = requests.get("http://localhost:5000/api/polls", headers={"Authorization": f"Bearer {token}"})
print("polls:", r2.status_code, r2.text)
