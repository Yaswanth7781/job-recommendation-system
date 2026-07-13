from fastapi import FastAPI, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import pandas as pd
import requests
import pdfplumber
import io
import os
import hashlib
import uuid
from pymongo import MongoClient
from typing import Optional, List

NLTK_URL = os.getenv('NLTK_URL', 'http://localhost:8001')
TFIDF_URL = os.getenv('TFIDF_URL', 'http://localhost:8002')

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=['*'], allow_credentials=True, allow_methods=['*'], allow_headers=['*'])

MONGO_URL = os.getenv('MONGO_URL', 'mongodb://localhost:27017/')
db_client = MongoClient(MONGO_URL)
db = db_client['ai_resume']
users_collection = db['users']
job_embeddings_collection = db['job_embeddings']

def hash_password(password: str, salt: str = None) -> tuple:
    if not salt:
        salt = uuid.uuid4().hex
    hashed = hashlib.sha256((password + salt).encode('utf-8')).hexdigest()
    return hashed, salt

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
async def train(file: UploadFile=File(...), company: str=Form("Global")):
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
        
        train_payload = {
            'job_roles': job_roles,
            'documents': cleaned_documents,
            'company': company.strip() or "Global"
        }
        requests.post(f'{TFIDF_URL}/train_tfidf', json=train_payload)
        return {'message': f'Training completed successfully for company "{company.strip() or "Global"}"'}
    except Exception as e:
        return {'error': str(e), 'message': f'Training failed: {str(e)}'}

@app.post('/search')
async def search(
    file: Optional[UploadFile] = File(None),
    top_k: int = Form(...),
    companies: str = Form(""),
    query_text: Optional[str] = Form(None)
):
    try:
        resume_text = ""
        if file:
            resume_text = extract_text_from_pdf(file.file)
        elif query_text:
            resume_text = query_text
        else:
            return JSONResponse(status_code=400, content={'error': 'No input', 'message': 'Please upload a resume file or enter search text.'})

        nltk_response = requests.post(f'{NLTK_URL}/preprocess_query', json={'text': resume_text})
        cleaned_query = nltk_response.json()['cleaned_text']
        
        companies_list = [c.strip() for c in companies.split(',') if c.strip()] if companies else []
        
        search_payload = {
            'query': cleaned_query,
            'top_k': top_k,
            'companies': companies_list
        }
        tfidf_response = requests.post(f'{TFIDF_URL}/search_tfidf', json=search_payload)
        return {'tfidf_results': tfidf_response.json().get('results', []), 'resume_text': resume_text}
    except Exception as e:
        return JSONResponse(status_code=500, content={'error': str(e), 'message': f'Search failed: {str(e)}'})

@app.get('/companies')
def get_companies():
    try:
        response = requests.get(f'{TFIDF_URL}/companies')
        return response.json()
    except Exception as e:
        return {'error': str(e), 'message': f'Failed to fetch companies: {str(e)}'}

@app.get('/job_roles')
def get_job_roles():
    try:
        response = requests.get(f'{TFIDF_URL}/job_roles')
        return response.json()
    except Exception as e:
        return {'error': str(e), 'message': f'Failed to fetch job roles: {str(e)}'}
from pydantic import BaseModel
from typing import List

class SignupRequest(BaseModel):
    username: str
    password: str
    role: str

class LoginRequest(BaseModel):
    username: str
    password: str

class JobRequest(BaseModel):
    title: str
    description: str

class JobLinksRequest(BaseModel):
    jobs: List[JobRequest]
    resume_text: str = ""

@app.post('/signup')
async def signup(request: SignupRequest):
    try:
        username = request.username.strip().lower()
        password = request.password
        role = request.role.strip().lower()
        
        if role not in ['candidate', 'company']:
            return JSONResponse(status_code=400, content={'error': 'Invalid role', 'message': 'Role must be either candidate or company'})
            
        if users_collection.find_one({'username': username}):
            return JSONResponse(status_code=400, content={'error': 'User exists', 'message': 'Username already registered'})
            
        hashed_pwd, salt = hash_password(password)
        users_collection.insert_one({
            'username': username,
            'password_hash': hashed_pwd,
            'salt': salt,
            'role': role
        })
        return {'success': True, 'message': 'User registered successfully'}
    except Exception as e:
        return JSONResponse(status_code=500, content={'error': str(e), 'message': f'Signup failed: {str(e)}'})

@app.post('/login')
async def login(request: LoginRequest):
    try:
        username = request.username.strip().lower()
        password = request.password
        
        user = users_collection.find_one({'username': username})
        if not user:
            return JSONResponse(status_code=400, content={'error': 'Invalid credentials', 'message': 'Invalid username or password'})
            
        hashed_pwd, _ = hash_password(password, user['salt'])
        if hashed_pwd != user['password_hash']:
            return JSONResponse(status_code=400, content={'error': 'Invalid credentials', 'message': 'Invalid username or password'})
            
        return {
            'success': True,
            'username': user['username'],
            'role': user['role'],
            'message': 'Login successful'
        }
    except Exception as e:
        return JSONResponse(status_code=500, content={'error': str(e), 'message': f'Login failed: {str(e)}'})

LINK_PROVIDER_URL = os.getenv('LINK_PROVIDER_URL', 'http://localhost:8010')

@app.post('/generate_job_links')
async def generate_job_links(request: JobLinksRequest):
    try:
        payload = {
            'jobs': [{'title': j.title, 'description': j.description} for j in request.jobs],
            'resume_text': request.resume_text
        }
        response = requests.post(f'{LINK_PROVIDER_URL}/fetch_links', json=payload)
        return response.json()
    except Exception as e:
        return {'error': str(e), 'message': f'Failed to generate links via link provider: {str(e)}'}

@app.post('/bulk_match')
async def bulk_match(
    files: List[UploadFile] = File(...),
    job_description: Optional[str] = Form(None),
    job_role: Optional[str] = Form(None)
):
    try:
        target_desc = ""
        if job_role:
            # Query the database for the selected job role
            job_doc = job_embeddings_collection.find_one({'job_role': job_role})
            if job_doc:
                target_desc = job_doc['document']
            else:
                return JSONResponse(status_code=404, content={'error': 'Not Found', 'message': f'Job role "{job_role}" not found.'})
        elif job_description:
            # Clean/preprocess pasted job description
            nltk_response = requests.post(f'{NLTK_URL}/preprocess_query', json={'text': job_description})
            target_desc = nltk_response.json()['cleaned_text']
        else:
            return JSONResponse(status_code=400, content={'error': 'Invalid Input', 'message': 'Please provide either a job role or a description.'})

        if not files:
            return JSONResponse(status_code=400, content={'error': 'Invalid Input', 'message': 'Please upload at least one PDF resume.'})

        # Process all uploaded candidate files sequentially
        resumes_payload = []
        for file in files:
            try:
                # Extract text and run NLTK cleaning
                text = extract_text_from_pdf(file.file)
                nltk_resp = requests.post(f'{NLTK_URL}/preprocess_query', json={'text': text})
                cleaned_text = nltk_resp.json()['cleaned_text']
                resumes_payload.append({
                    'filename': file.filename,
                    'text': cleaned_text
                })
            except Exception as pdf_err:
                print(f"Error parsing resume {file.filename}: {pdf_err}")
                # Fallback to empty text so other files can still be processed
                resumes_payload.append({
                    'filename': file.filename,
                    'text': ""
                })

        # Request TF-IDF similarity comparisons
        payload = {
            'job_description': target_desc,
            'resumes': resumes_payload
        }
        tfidf_response = requests.post(f'{TFIDF_URL}/bulk_similarity', json=payload)
        return tfidf_response.json()
    except Exception as e:
        return JSONResponse(status_code=500, content={'error': str(e), 'message': f'Bulk matching failed: {str(e)}'})