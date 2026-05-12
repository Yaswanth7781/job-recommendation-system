# AI Job Recommendation System

## Project Structure

ai-job-recommendation-system/
│
├── frontend/
│
├── backend/
│   │
│   ├── nltk_service/
│   │
│   ├── tfidf_service/
│   │
│   ├── bert_service/
│   │
│   ├── orchestrator_service/
│   │
│   └── dataset/
│       └── IT_Job_Roles_Skills.csv
│
└── README.md

## How to Run

### Install MongoDB

Run MongoDB locally.

### Start NLTK Service

cd backend/nltk_service
pip install -r requirements.txt
uvicorn app:app --reload --port 8001

### Start TF-IDF Service

cd backend/tfidf_service
pip install -r requirements.txt
uvicorn app:app --reload --port 8002

### Start BERT Service

cd backend/bert_service
pip install -r requirements.txt
uvicorn app:app --reload --port 8003

### Start Orchestrator Service

cd backend/orchestrator_service
pip install -r requirements.txt
uvicorn app:app --reload --port 9000

### Start Frontend

cd frontend
npm install
npm run dev

## Training Flow

Open Train page.
Upload company CSV dataset.
Click Train.
Dataset:
Dataset
  ↓
NLTK preprocessing
  ↓
TF-IDF embeddings
  ↓
BERT embeddings
  ↓
MongoDB storage

## Search Flow

Open Search page.
Upload Resume PDF.
Select Top K.
Click Search.
Resume:
Resume PDF
   ↓
PDF text extraction
   ↓
NLTK preprocessing
   ↓
TF-IDF similarity search
   ↓
BERT similarity search
   ↓
Top matching job roles

## MongoDB Structure

### TF-IDF Collection

{
  "job_role": "Machine Learning Engineer",
  "embedding": [0.12, 0.44, 0.81]
}

### BERT Collection

{
  "job_role": "Machine Learning Engineer",
  "embedding": [0.91, -0.22, 0.55]
}