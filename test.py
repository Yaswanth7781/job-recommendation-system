import requests
import json

import os

GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "")

prompt_text = 'You are an expert AI career coach. The candidate wants to apply for the job role "React Developer". Provide 3 to 5 short, actionable, and specific suggestions on how the candidate can improve their resume. Output your response strictly as a JSON object with a single key "suggestions" containing an array of strings, where each string is one full suggestion.'

response = requests.post(
    'https://api.groq.com/openai/v1/chat/completions',
    headers={
        'Content-Type': 'application/json',
        'Authorization': f'Bearer {GROQ_API_KEY}'
    },
    json={
        'model': 'llama-3.1-8b-instant',
        'messages': [{'role': 'user', 'content': prompt_text}],
        'temperature': 0.4,
        'max_tokens': 800,
        'response_format': {'type': 'json_object'}
    }
)
result = response.json()
print("Raw API response:")
print(json.dumps(result, indent=2))
