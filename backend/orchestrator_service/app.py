from fastapi import FastAPI, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
import requests
import pdfplumber
import io
import os
NLTK_URL = os.getenv('NLTK_URL', 'http://localhost:8001')
TFIDF_URL = os.getenv('TFIDF_URL', 'http://localhost:8002')
app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=['*'], allow_credentials=True, allow_methods=['*'], allow_headers=['*'])

@app.get('/health')
def health():
    return {'status': 'ok'}

def extract_text_from_pdf(file):
    with pdfplumber.open(file) as pdf:
        text = ''
        for page in pdf.pages:
            text += page.extract_text()
    return text

@app.post('/train')
async def train(file: UploadFile=File(...)):
    try:
        content = await file.read()
        content_str = content.decode('utf-8-sig', errors='replace')
        lines = [line.strip() for line in content_str.splitlines() if line.strip()]
        job_roles = []
        documents = []
        for line in lines[1:]:
            if ',' in line:
                (role, skills) = line.split(',', 1)
                job_roles.append(role.strip())
                documents.append(skills.strip().strip('"'))
        nltk_response = requests.post(f'{NLTK_URL}/preprocess_dataset', json={'documents': documents})
        cleaned_documents = nltk_response.json()['cleaned_documents']
        requests.post(f'{TFIDF_URL}/train_tfidf', json={'job_roles': job_roles, 'documents': cleaned_documents})
        return {'message': 'Training completed successfully'}
    except Exception as e:
        return {'error': str(e), 'message': f'Training failed: {str(e)}'}

@app.post('/search')
async def search(file: UploadFile=File(...), top_k: int=Form(...)):
    try:
        resume_text = extract_text_from_pdf(file.file)
        nltk_response = requests.post(f'{NLTK_URL}/preprocess_query', json={'text': resume_text})
        cleaned_query = nltk_response.json()['cleaned_text']
        tfidf_response = requests.post(f'{TFIDF_URL}/search_tfidf', json={'query': cleaned_query, 'top_k': top_k})
        return {'tfidf_results': tfidf_response.json()['results']}
    except Exception as e:
        return {'error': str(e), 'message': f'Search failed: {str(e)}'}
from pydantic import BaseModel
from typing import List

class JobRequest(BaseModel):
    title: str
    description: str

class JobLinksRequest(BaseModel):
    jobs: List[JobRequest]
LINK_PROVIDER_URL = os.getenv('LINK_PROVIDER_URL', 'http://localhost:8010')

@app.post('/generate_job_links')
async def generate_job_links(request: JobLinksRequest):
    try:
        response = requests.post(f'{LINK_PROVIDER_URL}/fetch_links', json={'jobs': [{'title': j.title, 'description': j.description} for j in request.jobs]})
        return response.json()
    except Exception as e:
        return {'error': str(e), 'message': f'Failed to generate links via link provider: {str(e)}'}