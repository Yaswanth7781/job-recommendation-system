# AI Job Recommendation System

An AI-powered job recommendation platform built on a FastAPI microservices backend and a React client. The system matches user resumes (PDFs) against job roles, ranks them using TF-IDF similarity, fetches live job application links via DuckDuckGo, and dynamically generates related career suggestions using the Gemini API.

---

## Technical Stack

- **Frontend**: React (Vite), Axios, CSS (modern styled UI)
- **Backend Services**: FastAPI (Python 3.9+)
- **Database**: MongoDB (stores TF-IDF vectors in the `ai_resume` database)
- **Deployment & Orchestration**: Docker, Docker Compose, PowerShell scripts

---

## Project Structure

```
job-recommendation-system/
│
├── frontend/                   # React web client (Port 5173 / Port 80 in Docker)
│   ├── src/                    # Page components, layouts, API config
│   ├── Dockerfile
│   └── package.json
│
├── backend/                    # Python FastAPI microservices
│   │
│   ├── nltk_service/           # Preprocesses documents and queries using NLTK (Port 8001)
│   │
│   ├── tfidf_service/          # Fits TF-IDF vectorizer and calculates similarity (Port 8002)
│   │
│   ├── link_provider_service/  # Fetches live job links (DDG) & Gemini suggestions (Port 8010)
│   │
│   ├── orchestrator_service/   # API Gateway; coordinates files, flows, and services (Port 9000)
│   │
│   └── dataset/                # Dataset store
│       └── IT_Job_Roles_Skills.csv
│
├── docker-compose.yml          # Builds and orchestrates all containers and MongoDB
├── start_all.ps1               # Script to run all services concurrently in local terminal windows
└── README.md
```

---

## Service Port Allocations

| Service | Port | Description |
| :--- | :--- | :--- |
| **Frontend** | `5173` (local) / `80` (Docker) | React UI Console |
| **Orchestrator Service** | `9000` | Main entry point for training and query/search API |
| **NLTK Preprocessing Service** | `8001` | Tokenizes and cleans natural language text |
| **TF-IDF Vector Service** | `8002` | Stores job role embeddings & computes cosine similarity |
| **Link Provider Service** | `8010` | Uses DuckDuckGo search and Gemini LLM for suggestions |
| **MongoDB (Local)** | `27017` | Stores job roles and their corresponding TF-IDF vectors |

---

## Database Schema (MongoDB - `ai_resume` database)

### Collection: `job_embeddings`
Stored within MongoDB to allow persistent and cached job matching:
- `job_role` (String) - The name of the job profile/role.
- `document` (String) - The cleaned/preprocessed skills list associated with the role.
- `vector` (Array of Doubles) - The calculated TF-IDF vector representation of the document.

---

## Core Flows

### 1. Training Flow (Data ingestion & indexing)
1. **Upload Dataset**: The buyer/user uploads a CSV containing job roles and skill listings via the UI.
2. **Orchestrator Gateway**: The orchestrator receives the CSV, parses the columns, and extracts job roles and skills.
3. **NLTK Preprocessing**: Text descriptions are sent to the NLTK service to be lowercased, tokenized, and stripped of English stop words and punctuation.
4. **Vector Generation**: TF-IDF service fits the preprocessed text, pickles the vectorizer (`vectorizer.pkl`), and converts the sparse matrix into dense vectors.
5. **Database Storage**: The vectors, original roles, and cleaned documents are saved in MongoDB (`job_embeddings`).

### 2. Search / Recommendation Flow (Resume matching)
1. **Resume Submission**: The user uploads a resume PDF and selects the `top_k` matches.
2. **PDF Parsing**: The orchestrator extracts raw text from the uploaded PDF.
3. **Query Preprocessing**: NLTK service processes the resume text.
4. **Similarity Search**: TF-IDF service computes cosine similarity between the preprocessed resume text vector and the job vectors cached in MongoDB. It returns the top `top_k` matching job roles.
5. **Real-time Enrichment**: For each top match:
   - **DuckDuckGo Search**: The Link Provider service queries live application links.
   - **Gemini Recommendations**: The Link Provider service calls the Gemini API to suggest alternative career pathways or related skill focuses.
6. **Results Delivery**: The React frontend displays the matched jobs with dynamic percentage matches, application buttons, and AI-generated suggestions.

---

## Getting Started

### Prerequisites
- Python 3.9+ installed locally
- Node.js (v18+)
- MongoDB running locally (default: `localhost:27017`)
- A **Gemini API Key** (for career suggestions)

---

### Run Locally (Separate Consoles or PowerShell)

#### Option A: Quick-start with PowerShell
1. Open a PowerShell prompt in the project root directory.
2. Run the startup script:
   ```powershell
   ./start_all.ps1
   ```
   *Note: Ensure you set the `GEMINI_API_KEY` environment variable in your terminal if you want AI suggestions.*

#### Option B: Step-by-Step Manual Execution
Run the commands below in individual terminal tabs:

1. **NLTK Service (Port 8001)**:
   ```bash
   cd backend/nltk_service
   pip install -r requirements.txt
   uvicorn app:app --reload --port 8001
   ```

2. **TF-IDF Service (Port 8002)**:
   ```bash
   cd backend/tfidf_service
   pip install -r requirements.txt
   uvicorn app:app --reload --port 8002
   ```

3. **Link Provider Service (Port 8010)**:
   ```bash
   cd backend/link_provider_service
   pip install -r requirements.txt
   # Set the Gemini API key environment variable
   $env:GEMINI_API_KEY="your_api_key_here"  # PowerShell
   # export GEMINI_API_KEY="your_api_key_here"  # Linux/macOS
   uvicorn app:app --reload --port 8010
   ```

4. **Orchestrator Service (Port 9000)**:
   ```bash
   cd backend/orchestrator_service
   pip install -r requirements.txt
   uvicorn app:app --reload --port 9000
   ```

5. **Frontend Client (Port 5173)**:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
   Open `http://localhost:5173` in your browser.

---

### Run with Docker Compose

To orchestrate all services along with a local MongoDB instance in containerized environments:

1. Create a `.env` file in the root directory containing your Gemini API key:
   ```env
   GEMINI_API_KEY=your_gemini_api_key
   ```
2. Build and start all containers:
   ```bash
   docker-compose up --build
   ```
3. Once fully started, open your web browser to:
   - Frontend client: `http://localhost` (exposed on port `80`)
   - Services are exposed internally and routed through the Orchestrator on `http://localhost:9000`.