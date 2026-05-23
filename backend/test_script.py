import requests

token = "ec3f2deb018f8d751d17ec42f5e3e94843629b1e6f3f5dbc489e91283d620e1f"
r2 = requests.get("http://localhost:5000/api/polls", headers={"Authorization": f"Bearer {token}"})
print("polls:", r2.status_code, r2.text)
