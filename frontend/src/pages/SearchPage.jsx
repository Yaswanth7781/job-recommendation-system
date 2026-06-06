import { useState, useRef } from 'react'
import API from '../api'

function ScoreBadge({ score }) {
  const pct = Number(score)
  const cls = pct >= 0.6 ? 'score-high' : pct >= 0.35 ? 'score-med' : 'score-low'
  const label = pct >= 0.6 ? '🟢 High' : pct >= 0.35 ? '🟡 Medium' : '🔵 Low'
  return (
    <span className={`score-badge ${cls}`}>
      {label} match &nbsp;{pct.toFixed(3)}
    </span>
  )
}

function JobCard({ item, index, links }) {
  const score = item.score ?? item.similarity_score ?? item.similarity ?? item.cosine_similarity ?? 0
  const title = item.job_role || item.title || 'Unknown Role'
  const jobLinks = links?.search_links || []
  const suggestions = links?.suggestions || []

  return (
    <div className="job-card" style={{ animationDelay: `${index * 0.07}s` }}>
      <div className="job-card-header">
        <div className="job-rank">#{index + 1}</div>
        <div className="job-title">{title}</div>
        <ScoreBadge score={score} />
      </div>

      {jobLinks.length > 0 && (
        <div className="links-section">
          <div className="links-label">🔗 Live Application Links</div>
          <div className="links-list">
            {jobLinks.map((lnk, i) => (
              <a
                key={i}
                href={lnk.url}
                target="_blank"
                rel="noopener noreferrer"
                className="job-link"
                title={lnk.url}
              >
                ↗ {lnk.title || lnk.url}
              </a>
            ))}
          </div>
        </div>
      )}

      {suggestions.length > 0 && (
        <div className="suggestions-section">
          <div className="suggestions-label">💡 Resume Improvements for this Role</div>
          <ul className="suggestions-list">
            {suggestions.map((suggestion, i) => (
              <li key={i} className="suggestion-item">{suggestion}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

export default function SearchPage() {
  const [file, setFile] = useState(null)
  const [topK, setTopK] = useState(5)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [tfidfResults, setTfidfResults] = useState([])
  const [jobLinks, setJobLinks] = useState({})
  const [loadingLinks, setLoadingLinks] = useState(false)
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef(null)

  const handleDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    const dropped = e.dataTransfer.files[0]
    if (dropped && dropped.name.endsWith('.pdf')) {
      setFile(dropped)
      setError('')
    } else {
      setError('Only PDF resumes are supported.')
    }
  }

  const handleSearch = async () => {
    if (!file) { setError('Please upload a PDF resume first.'); return }
    try {
      setLoading(true)
      setError('')
      setJobLinks({})
      setTfidfResults([])

      const formData = new FormData()
      formData.append('file', file)
      formData.append('top_k', topK)
      const response = await API.post('/search', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })

      const tfidf = response.data.tfidf_results || []
      const resumeText = response.data.resume_text || ''
      setTfidfResults(tfidf)
      setLoading(false)

      const jobRequests = tfidf
        .map(item => ({
          title: item.job_role || item.title || '',
          description: item.document || item.description || ''
        }))
        .filter(r => r.title)

      if (jobRequests.length > 0) {
        setLoadingLinks(true)
        try {
          const linksResponse = await API.post('/generate_job_links', { 
            jobs: jobRequests,
            resume_text: resumeText
          })
          const linksData = linksResponse.data?.job_links || []
          const linksMap = {}
          linksData.forEach(l => { linksMap[l.title] = l })
          setJobLinks(linksMap)
        } catch (e) {
          console.error('Link fetch failed:', e)
        } finally {
          setLoadingLinks(false)
        }
      }
    } catch (err) {
      setLoading(false)
      setError(err.response?.data?.message || err.message || 'Search failed. Is the model trained?')
    }
  }

  const hasResults = tfidfResults.length > 0

  return (
    <>
      <div className="page-header">
        <div className="page-badge">🔍 Smart Matching</div>
        <h1>Find Your Best Jobs</h1>
        <p>Upload your PDF resume and our AI will rank the top matching job roles using TF-IDF similarity.</p>
      </div>

      {/* Controls card */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '20px', alignItems: 'end' }}>
          <div>
            <div className="card-title">Upload Resume</div>
            <div className="card-desc">PDF format only. Your resume is processed locally.</div>
            <div
              id="search-upload-zone"
              className={`upload-zone${dragging ? ' dragging' : ''}`}
              style={{ padding: '24px 16px' }}
              onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => inputRef.current?.click()}
            >
              <input
                ref={inputRef}
                type="file"
                accept=".pdf"
                id="search-file-input"
                style={{ display: 'none' }}
                onChange={(e) => { setFile(e.target.files[0]); setError('') }}
              />
              <div className="upload-icon" style={{ width: 40, height: 40, fontSize: 16, marginBottom: 10 }}>📄</div>
              {file ? (
                <div className="file-selected">📄 {file.name}</div>
              ) : (
                <>
                  <h3 style={{ fontSize: '0.9rem' }}>Drop PDF or click</h3>
                  <p>Resume (.pdf)</p>
                </>
              )}
            </div>
          </div>

          <div style={{ minWidth: '120px' }}>
            <label className="form-label" htmlFor="topk-input">Top K Results</label>
            <input
              id="topk-input"
              type="number"
              min="1"
              max="20"
              value={topK}
              onChange={(e) => setTopK(e.target.value)}
              className="form-input"
              style={{ textAlign: 'center' }}
            />
          </div>
        </div>

        {error && (
          <div className="alert alert-error" role="alert">
            <span>⚠️</span> {error}
          </div>
        )}
      </div>

      <button
        id="search-submit-btn"
        className="btn btn-primary"
        onClick={handleSearch}
        disabled={loading || !file}
        style={{ marginBottom: '40px' }}
      >
        {loading ? (
          <><div className="spinner" /> Analyzing Resume...</>
        ) : (
          <>🔍 Find Matching Jobs</>
        )}
      </button>

      {/* Results */}
      {(hasResults || loading) && (
        <>
          <div className="section-divider"><span>Recommended Jobs</span></div>

          {hasResults && (
            <div className="stats-row">
              <div className="stat-chip">🎯 <strong>{tfidfResults.length}</strong> matches found</div>
              {loadingLinks && <div className="stat-chip">🔗 Fetching application links...</div>}
            </div>
          )}

          {loading ? (
            <div className="job-grid">
              {Array.from({ length: topK > 5 ? 5 : topK }).map((_, i) => (
                <div key={i} className="job-card" style={{ animationDelay: `${i * 0.07}s` }}>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <div className="skeleton" style={{ width: 32, height: 32, borderRadius: 8 }} />
                    <div className="skeleton" style={{ flex: 1, height: 20 }} />
                    <div className="skeleton" style={{ width: 90, height: 24, borderRadius: 100 }} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="job-grid">
              {tfidfResults.map((item, i) => {
                const title = item.job_role || item.title || ''
                return (
                  <JobCard
                    key={i}
                    item={item}
                    index={i}
                    links={jobLinks[title]}
                  />
                )
              })}
            </div>
          )}
        </>
      )}

      {!hasResults && !loading && (
        <div className="empty-state">
          <div className="empty-state-icon">🎯</div>
          <h3>No results yet</h3>
          <p>Upload your resume and click "Find Matching Jobs" to get personalized recommendations.</p>
        </div>
      )}
    </>
  )
}