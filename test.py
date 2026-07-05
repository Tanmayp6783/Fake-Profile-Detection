import requests

url = "http://127.0.0.1:5000/predict"

data = {
    "followers": 20,
    "following": 5000,
    "posts": 1,
    "likes": 0,
    "comments": 0,
    "accountAge": 2,
    "hasPic": 0,
    "hasBio": 0,
    "isPrivate": 0,
    "hasUrl": 1,
    "numericName": 1
}

response = requests.post(url, json=data)

print("Status Code:", response.status_code)
print("Response:", response.text)