import asyncio
import os
import re
import requests
from fastapi import FastAPI
from pydantic import BaseModel
from typing import List
from ddgs import DDGS 
app = FastAPI()

GROQ_API_KEY = os.getenv('GROQ_API_KEY')

class JobRequest(BaseModel):
    title: str
    description: str

class JobLinksRequest(BaseModel):
    jobs: List[JobRequest]
    resume_text: str = ""

@app.get('/health')
def health():
    return {'status': 'ok'}

async def fetch_links_for_job(job: JobRequest, resume_text: str):
    context = ' '.join(job.description.split()[:15])
    query = f'"{job.title}" job application apply {context}'

    def generate_suggestions():
        if not GROQ_API_KEY:
            return ['API Key missing. Unable to generate suggestions.']

        if not resume_text:
            return ['No resume text provided.']

        prompt_text = (
            f'You are an expert AI career coach. The candidate wants to apply for the job role "{job.title}". '
            f'Here is their resume text:\n{resume_text[:2500]}\n\n'
            'Provide 3 to 5 short, actionable, and specific suggestions on how the candidate can improve their resume '
            f'specifically to match the "{job.title}" role. '
            'Focus on missing keywords, missing skills, or phrasing. '
            'Output your response strictly as a JSON object with a single key "suggestions" containing an array of strings, where each string is one full suggestion.'
        )

        try:
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
                },
                timeout=20
            )
            response.raise_for_status()
            result = response.json()
            output_text = ''
            
            if 'choices' in result and len(result['choices']) > 0:
                output_text = result['choices'][0].get('message', {}).get('content', '')

            if not output_text:
                return []
                
            import json
            try:
                suggestions = json.loads(output_text)
                if isinstance(suggestions, list):
                    return suggestions[:5]
                elif isinstance(suggestions, dict) and 'suggestions' in suggestions:
                    return suggestions['suggestions'][:5]
            except json.JSONDecodeError:
                pass
                
            # Fallback if json parsing fails
            suggestions = []
            for line in output_text.splitlines():
                text = line.strip(' -•*\t[]",')
                text = re.sub(r'^\d+[\).]\s*', '', text)
                if len(text) > 5:
                    suggestions.append(text)
            return suggestions[:5]
        except Exception as e:
            print(f'Groq suggestion generation failed for {job.title}: {e}')
            return [f'Error generating suggestions: {str(e)}']

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
        tasks = [fetch_links_for_job(job, request.resume_text) for job in request.jobs]
        links = await asyncio.gather(*tasks)
        return {'job_links': links}
    except Exception as e:
        return {'error': str(e), 'message': f'Failed to fetch links: {str(e)}'}