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

class TrainRequest(BaseModel):
    job_roles: list
    documents: list

class SearchRequest(BaseModel):
    query: str
    top_k: int = 5

@app.get('/')
def home():
    return {'message': 'TFIDF Service Running with MongoDB'}

@app.get('/test')
def test():
    return {'working': True}
cache = {'loaded': False, 'job_roles': [], 'documents': [], 'vectors_np': None}

def load_cache():
    if cache['loaded']:
        return True
    all_jobs = list(collection.find({}))
    if not all_jobs:
        return False
    job_roles = []
    documents = []
    vectors = []
    for job in all_jobs:
        job_roles.append(job['job_role'])
        documents.append(job['document'])
        vectors.append(job['vector'])
    cache['job_roles'] = job_roles
    cache['documents'] = documents
    cache['vectors_np'] = np.array(vectors)
    cache['loaded'] = True
    return True

@app.post('/train_tfidf')
def train_tfidf(data: TrainRequest):
    global cache
    job_roles = data.job_roles
    documents = data.documents
    vectorizer = TfidfVectorizer(stop_words='english')
    vectors = vectorizer.fit_transform(documents)
    with open(VECTORIZER_PATH, 'wb') as f:
        pickle.dump(vectorizer, f)
    dense_vectors = vectors.toarray()
    collection.delete_many({})
    docs_to_insert = []
    for idx in range(len(job_roles)):
        docs_to_insert.append({'job_role': job_roles[idx], 'document': documents[idx], 'vector': dense_vectors[idx].tolist()})
    if docs_to_insert:
        collection.insert_many(docs_to_insert)
    cache['loaded'] = False
    return {'message': 'Training completed successfully and saved to MongoDB', 'total_jobs': len(job_roles)}

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
    vectors_np = cache['vectors_np']
    job_roles = cache['job_roles']
    documents = cache['documents']
    similarities = cosine_similarity(query_vector, vectors_np)[0]
    top_indices = np.argsort(similarities)[::-1][:data.top_k]
    results = []
    for idx in top_indices:
        results.append({'job_role': job_roles[idx], 'document': documents[idx], 'score': float(similarities[idx])})
    return {'results': results}