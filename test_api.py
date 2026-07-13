import urllib.request
import urllib.error
import json

url = 'https://generativelanguage.googleapis.com/v1beta/models?key=AIzaSyCEztGiKSN0z3h3pre8o0zGybw9wcJ9Vsk'

try:
    response = urllib.request.urlopen(url)
    data = json.loads(response.read().decode())
    for m in data.get('models', []):
        print(m['name'])
except urllib.error.HTTPError as e:
    print('Error:', e.code, e.read().decode())
