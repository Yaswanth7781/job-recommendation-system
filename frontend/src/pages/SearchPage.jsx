import { useState } from 'react'
import API from '../api'
export default function SearchPage() {
  const [file, setFile] = useState(null)
  const [topK, setTopK] = useState(5)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [tfidfResults, setTfidfResults] = useState([])
  const [jobLinks, setJobLinks] = useState({})
  const handleSearch = async () => {
    if (!file) {
      setError('Please upload a PDF resume')
      return
    }
    try {
      setLoading(true)
      setError('')
      setJobLinks({})
      const formData = new FormData()
      formData.append('file', file)
      formData.append('top_k', topK)
      const response = await API.post('/search', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      const tfidf = response.data.tfidf_results || []
      setTfidfResults(tfidf)
      const jobRequests = tfidf.map(item => ({
        title: item.job_role || item.title || 'Unknown Role',
        description: item.document || item.description || ''
      })).filter(req => req.title !== 'Unknown Role')
      if (jobRequests.length > 0) {
        try {
          const linksResponse = await API.post('/generate_job_links', { jobs: jobRequests })
          if (linksResponse.data.error) {
            setError('Link Provider Error: ' + linksResponse.data.message)
          }
          const linksData = linksResponse.data.job_links || []
          const linksMap = {}
          linksData.forEach(linkObj => {
            linksMap[linkObj.title] = linkObj
          })
          setJobLinks(linksMap)
        } catch (linksErr) {
          console.error('Failed to generate job links:', linksErr)
          setError('Failed to fetch application links. Check console.')
        }
      }
    } catch (err) {
      console.error('SEARCH ERROR:', err)
      setError(err.response?.data?.message || err.message || 'Search failed')
    } finally {
      setLoading(false)
    }
  }
  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1 style={{ textAlign: 'center' }}>AI Job Recommendation System</h1>
      <h2>Resume Similarity Search</h2>
      <div style={{ marginBottom: '20px' }}>
        <input
          type='file'
          accept='.pdf'
          onChange={(e) => setFile(e.target.files[0])}
        />
      </div>
      <div style={{ marginBottom: '20px' }}>
        <label style={{ marginRight: '10px' }}>Top K Results:</label>
        <input
          type='number'
          min='1'
          value={topK}
          onChange={(e) => setTopK(e.target.value)}
        />
      </div>
      <button
        onClick={handleSearch}
        disabled={loading}
        style={{ padding: '10px 20px', cursor: loading ? 'not-allowed' : 'pointer' }}
      >
        {loading ? 'Searching...' : 'Search Jobs'}
      </button>
      {error && (
        <p style={{ color: 'red', marginTop: '20px' }}>{error}</p>
      )}
      <h2 style={{ marginTop: '40px' }}>Recommended Jobs</h2>
      {tfidfResults?.length === 0 ? (
        <p>No jobs found. Try uploading a different resume.</p>
      ) : (
        tfidfResults.map((item, index) => {
          const score = item.score ?? item.similarity_score ?? item.similarity ?? item.cosine_similarity ?? 0
          const title = item.job_role || item.title || 'Unknown Role'
          const links = jobLinks[title]
          return (
            <div
              key={index}
              className='result-card'
              style={{
                border: '1px solid #ddd',
                borderRadius: '10px',
                padding: '20px',
                marginBottom: '20px',
                backgroundColor: '#f9f9f9',
                boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
              }}
            >
              <h3 style={{ marginTop: 0, color: '#333' }}>{title}</h3>
              <p><strong>Similarity Score:</strong> {Number(score).toFixed(4)}</p>
              {}
              {links && links.search_links && links.search_links.length > 0 && (
                <div style={{ marginTop: '15px', paddingTop: '15px', borderTop: '1px solid #eee' }}>
                  <strong>Live Application Links:</strong>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px' }}>
                    {links.search_links.map((linkObj, idx) => (
                      <a 
                        key={idx} 
                        href={linkObj.url} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        style={{ textDecoration: 'none', color: '#0054a6' }}
                      >
                        {linkObj.title || linkObj.url}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )
        })
      )}
    </div>
  )
}