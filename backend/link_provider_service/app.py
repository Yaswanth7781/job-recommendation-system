import asyncio
import os
import re
import requests
from fastapi import FastAPI
from pydantic import BaseModel
from typing import List
from ddgs import DDGS
app = FastAPI()

GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')

class JobRequest(BaseModel):
    title: str
    description: str

class JobLinksRequest(BaseModel):
    jobs: List[JobRequest]

@app.get('/health')
def health():
    return {'status': 'ok'}

async def fetch_links_for_job(job: JobRequest):
    context = ' '.join(job.description.split()[:15])
    query = f'"{job.title}" job application apply {context}'

    def generate_suggestions():
        if not GEMINI_API_KEY:
            return []

        prompt_text = (
            f'You are an AI career assistant. Given the job title "{job.title}" and the description "{job.description}", '
            'provide up to 5 short, relevant job search suggestions, alternative titles, or related career paths that a candidate should consider. '
            'Return each suggestion on its own line with no extra commentary.'
        )

        try:
            response = requests.post(
                f'https://generativelanguage.googleapis.com/v1beta2/models/gemini-1.5-preview/texts:generate?key={GEMINI_API_KEY}',
                headers={'Content-Type': 'application/json'},
                json={
                    'prompt': {'text': prompt_text},
                    'temperature': 0.4,
                    'maxOutputTokens': 200
                },
                timeout=15
            )
            response.raise_for_status()
            result = response.json()
            output_text = ''
            if isinstance(result.get('candidates'), list) and result['candidates']:
                output_text = result['candidates'][0].get('output', '')
            elif isinstance(result.get('output'), str):
                output_text = result['output']
            else:
                output_text = ''

            suggestions = []
            for line in output_text.splitlines():
                text = line.strip(' -•\t')
                text = re.sub(r'^\d+[\).]\s*', '', text)
                if text:
                    suggestions.append(text)
            return suggestions[:5]
        except Exception as e:
            print(f'Gemini suggestion generation failed for {job.title}: {e}')
            return []

    def do_search():
        search_results = []
        try:
            ddgs = DDGS()
            results = ddgs.text(query, max_results=3)
            for r in results:
                search_results.append({'title': r.get('title'), 'url': r.get('href')})
        except Exception as e:
            print(f'Search failed for {job.title}: {e}')
            search_results.append({'title': f'DuckDuckGo Search Failed (Rate Limit or Error): {str(e)}', 'url': '#'})
        if not search_results:
            search_results.append({'title': 'No links found. You might be rate-limited by DuckDuckGo.', 'url': '#'})

        return {
            'title': job.title,
            'search_links': search_results,
            'suggestions': generate_suggestions()
        }

    return await asyncio.to_thread(do_search)

@app.post('/fetch_links')
async def fetch_links(request: JobLinksRequest):
    try:
        tasks = [fetch_links_for_job(job) for job in request.jobs]
        links = await asyncio.gather(*tasks)
        return {'job_links': links}
    except Exception as e:
        return {'error': str(e), 'message': f'Failed to fetch links: {str(e)}'}