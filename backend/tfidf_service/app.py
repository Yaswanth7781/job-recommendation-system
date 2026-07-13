from fastapi import FastAPI
from pydantic import BaseModel
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np
from pymongo import MongoClient
import pickle
import os
app = FastAPI()
import os
MONGO_URL = os.getenv('MONGO_URL', 'mongodb://localhost:27017/')
client = MongoClient(MONGO_URL)
db = client['ai_resume']
collection = db['job_embeddings']
VECTORIZER_PATH = 'vectorizer.pkl'

from typing import List

class TrainRequest(BaseModel):
    job_roles: list
    documents: list
    company: str = "Global"

class SearchRequest(BaseModel):
    query: str
    top_k: int = 5
    companies: list = []

class ResumeItem(BaseModel):
    filename: str
    text: str

class BulkSearchRequest(BaseModel):
    job_description: str
    resumes: List[ResumeItem]

@app.get('/')
def home():
    return {'message': 'TFIDF Service Running with MongoDB'}

@app.get('/test')
def test():
    return {'working': True}

@app.get('/companies')
def get_companies():
    companies = collection.distinct('company')
    # Filter out empty/None values
    companies = [c for c in companies if c]
    if not companies:
        if collection.count_documents({}) > 0:
            return ['Global']
    return companies

@app.get('/job_roles')
def get_job_roles():
    roles = collection.distinct('job_role')
    return [r for r in roles if r]

cache = {'loaded': False, 'job_roles': [], 'documents': [], 'vectors_np': None, 'companies': []}

def load_cache():
    if cache['loaded']:
        return True
    all_jobs = list(collection.find({}))
    if not all_jobs:
        return False
    job_roles = []
    documents = []
    vectors = []
    companies = []
    for job in all_jobs:
        job_roles.append(job['job_role'])
        documents.append(job['document'])
        vectors.append(job['vector'])
        companies.append(job.get('company', 'Global'))
    cache['job_roles'] = job_roles
    cache['documents'] = documents
    cache['vectors_np'] = np.array(vectors)
    cache['companies'] = companies
    cache['loaded'] = True
    return True

@app.post('/train_tfidf')
def train_tfidf(data: TrainRequest):
    global cache
    job_roles = data.job_roles
    documents = data.documents
    company = data.company or "Global"
    
    # 1. Delete old records for this specific company
    collection.delete_many({"company": company})
    
    # 2. Insert new records for this company (initially empty vectors)
    docs_to_insert = []
    for idx in range(len(job_roles)):
        docs_to_insert.append({
            'company': company,
            'job_role': job_roles[idx],
            'document': documents[idx],
            'vector': []
        })
    if docs_to_insert:
        collection.insert_many(docs_to_insert)
        
    # 3. Retrieve ALL jobs from database to retrain TF-IDF globally
    all_jobs = list(collection.find({}))
    if not all_jobs:
        cache['loaded'] = False
        return {'message': 'No jobs in database to train', 'total_jobs': 0}
        
    all_docs = [job['document'] for job in all_jobs]
    
    # 4. Fit vectorizer on all documents
    vectorizer = TfidfVectorizer(stop_words='english')
    vectors = vectorizer.fit_transform(all_docs)
    
    with open(VECTORIZER_PATH, 'wb') as f:
        pickle.dump(vectorizer, f)
        
    dense_vectors = vectors.toarray()
    
    # 5. Update each job's vector in the database
    for idx, job in enumerate(all_jobs):
        collection.update_one(
            {'_id': job['_id']},
            {'$set': {'vector': dense_vectors[idx].tolist()}}
        )
        
    cache['loaded'] = False
    return {'message': f'Training completed successfully for company "{company}" and saved to MongoDB', 'total_jobs': len(job_roles)}

@app.post('/search_tfidf')
def search_tfidf(data: SearchRequest):
    if not os.path.exists(VECTORIZER_PATH):
        return {'error': 'Model not trained'}
    with open(VECTORIZER_PATH, 'rb') as f:
        vectorizer = pickle.load(f)
    query_vector = vectorizer.transform([data.query]).toarray()
    
    success = load_cache()
    if not success:
        return {'error': 'No data in MongoDB'}
        
    job_roles = cache['job_roles']
    documents = cache['documents']
    vectors_np = cache['vectors_np']
    companies = cache['companies']
    
    # Filter indices based on company selection
    target_companies = data.companies
    filtered_indices = []
    for idx, comp in enumerate(companies):
        if not target_companies or comp in target_companies:
            filtered_indices.append(idx)
            
    if not filtered_indices:
        return {'results': []}
        
    # Slice the cached data for the filtered company subset
    sub_vectors = vectors_np[filtered_indices]
    sub_roles = [job_roles[i] for i in filtered_indices]
    sub_docs = [documents[i] for i in filtered_indices]
    sub_comps = [companies[i] for i in filtered_indices]
    
    similarities = cosine_similarity(query_vector, sub_vectors)[0]
    
    top_k = min(data.top_k, len(filtered_indices))
    top_indices = np.argsort(similarities)[::-1][:top_k]
    
    results = []
    for idx in top_indices:
        results.append({
            'job_role': sub_roles[idx],
            'document': sub_docs[idx],
            'company': sub_comps[idx],
            'score': float(similarities[idx])
        })
    return {'results': results}

@app.post('/bulk_similarity')
def bulk_similarity(data: BulkSearchRequest):
    if not os.path.exists(VECTORIZER_PATH):
        return {'error': 'Model not trained'}
    with open(VECTORIZER_PATH, 'rb') as f:
        vectorizer = pickle.load(f)
        
    if not data.resumes:
        return {'results': []}
        
    # 1. Vectorize the job description query
    job_vector = vectorizer.transform([data.job_description]).toarray()
    
    # 2. Vectorize all candidate resumes
    resume_texts = [r.text for r in data.resumes]
    resume_vectors = vectorizer.transform(resume_texts).toarray()
    
    # 3. Compute cosine similarities
    similarities = cosine_similarity(job_vector, resume_vectors)[0]
    
    # 4. Format and sort the results
    results = []
    for idx, r in enumerate(data.resumes):
        results.append({
            'filename': r.filename,
            'score': float(similarities[idx])
        })
        
    results.sort(key=lambda x: x['score'], reverse=True)
    return {'results': results}