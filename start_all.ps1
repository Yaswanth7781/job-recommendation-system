# Load environment variables from .env file if it exists
if (Test-Path ".env") {
    Write-Host "Loading environment variables from .env"
    foreach ($line in Get-Content ".env") {
        if ($line -match "^([^#\s]+)=(.*)$") {
            Set-Item -Path "Env:\$($matches[1])" -Value $matches[2].Trim()
        }
    }
}

Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd backend\nltk_service; uvicorn app:app --reload --port 8001"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd backend\tfidf_service; uvicorn app:app --reload --port 8002"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd backend\link_provider_service; uvicorn app:app --reload --port 8010"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd backend\orchestrator_service;  uvicorn app:app --reload --port 9000"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd frontend; npm run dev"
