import asyncio
from fastapi import FastAPI
from pydantic import BaseModel
from typing import List
from ddgs import DDGS
app = FastAPI()

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
        return {'title': job.title, 'search_links': search_results}
    return await asyncio.to_thread(do_search)

@app.post('/fetch_links')
async def fetch_links(request: JobLinksRequest):
    try:
        tasks = [fetch_links_for_job(job) for job in request.jobs]
        links = await asyncio.gather(*tasks)
        return {'job_links': links}
    except Exception as e:
        return {'error': str(e), 'message': f'Failed to fetch links: {str(e)}'}