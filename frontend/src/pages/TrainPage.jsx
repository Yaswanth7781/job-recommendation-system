import { useState, useRef, useEffect } from 'react'
import API from '../api'

export default function TrainPage() {
  const [activeTab, setActiveTab] = useState('train') // 'train' or 'screener'

  // State for Training/Ingestion
  const [file, setFile] = useState(null)
  const [company, setCompany] = useState('Global')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [dragging, setDragging] = useState(false)
  const trainInputRef = useRef(null)

  // State for Candidate Screener
  const [screenerFiles, setScreenerFiles] = useState([])
  const [screenerMode, setScreenerMode] = useState('select') // 'select' or 'custom'
  const [selectedJobRole, setSelectedJobRole] = useState('')
  const [customJobDesc, setCustomJobDesc] = useState('')
  const [jobRoles, setJobRoles] = useState([])
  const [screenerResults, setScreenerResults] = useState([])
  const [screenerLoading, setScreenerLoading] = useState(false)
  const [screenerError, setScreenerError] = useState('')
  const [screenerDragging, setScreenerDragging] = useState(false)
  const screenerInputRef = useRef(null)

  // Fetch unique job roles for the dropdown on mount or when switching tabs
  useEffect(() => {
    if (activeTab === 'screener') {
      const fetchJobRoles = async () => {
        try {
          const response = await API.get('/job_roles')
          setJobRoles(response.data || [])
          if (response.data && response.data.length > 0) {
            setSelectedJobRole(response.data[0])
          }
        } catch (err) {
          console.error('Failed to fetch job roles:', err)
        }
      }
      fetchJobRoles()
    }
  }, [activeTab])

  // Training Handlers
  const handleDropTrain = (e) => {
    e.preventDefault()
    setDragging(false)
    const dropped = e.dataTransfer.files[0]
    if (dropped && dropped.name.endsWith('.csv')) {
      setFile(dropped)
      setError('')
    } else {
      setError('Only .csv files are supported.')
    }
  }

  const handleTrain = async () => {
    if (!file) { setError('Please select a CSV file first.'); return }
    try {
      setLoading(true)
      setError('')
      setMessage('')
      const formData = new FormData()
      formData.append('file', file)
      formData.append('company', company.trim() || 'Global')
      const response = await API.post('/train', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      setMessage(response.data.message || 'Dataset trained successfully!')
    } catch (err) {
      setError(
        err.response?.data?.error ||
        err.response?.data?.message ||
        err.message ||
        'Training failed. Please try again.'
      )
    } finally {
      setLoading(false)
    }
  }

  // Screener Handlers
  const handleDropScreener = (e) => {
    e.preventDefault()
    setScreenerDragging(false)
    const dropped = Array.from(e.dataTransfer.files)
    const pdfs = dropped.filter(f => f.name.endsWith('.pdf'))
    if (pdfs.length > 0) {
      setScreenerFiles(prev => [...prev, ...pdfs])
      setScreenerError('')
    } else {
      setScreenerError('Only PDF files are supported.')
    }
  }

  const handleScreenerFileChange = (e) => {
    const selected = Array.from(e.target.files)
    const pdfs = selected.filter(f => f.name.endsWith('.pdf'))
    if (pdfs.length > 0) {
      setScreenerFiles(prev => [...prev, ...pdfs])
      setScreenerError('')
    }
  }

  const removeScreenerFile = (indexToRemove) => {
    setScreenerFiles(prev => prev.filter((_, idx) => idx !== indexToRemove))
  }

  const handleBulkMatch = async () => {
    if (screenerFiles.length === 0) {
      setScreenerError('Please upload at least one candidate resume.')
      return
    }
    if (screenerMode === 'select' && !selectedJobRole) {
      setScreenerError('Please select a job role.')
      return
    }
    if (screenerMode === 'custom' && !customJobDesc.trim()) {
      setScreenerError('Please enter a job description.')
      return
    }

    try {
      setScreenerLoading(true)
      setScreenerError('')
      setScreenerResults([])

      const formData = new FormData()
      
      // Append multiple files
      screenerFiles.forEach(file => {
        formData.append('files', file)
      })

      if (screenerMode === 'select') {
        formData.append('job_role', selectedJobRole)
      } else {
        formData.append('job_description', customJobDesc.trim())
      }

      const response = await API.post('/bulk_match', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })

      setScreenerResults(response.data?.results || [])
    } catch (err) {
      setScreenerError(
        err.response?.data?.message ||
        err.message ||
        'Bulk analysis failed. Please try again.'
      )
    } finally {
      setScreenerLoading(false)
    }
  }

  // Format filename to candidate name (e.g. John_Doe_CV.pdf -> John Doe)
  const formatCandidateName = (filename) => {
    let name = filename.replace(/\.pdf$/i, '')
    name = name.replace(/[_-]/g, ' ')
    // Capitalize words
    return name.replace(/\b\w/g, c => c.toUpperCase())
  }

  const getScoreClass = (score) => {
    if (score >= 0.5) return 'score-high'
    if (score >= 0.25) return 'score-med'
    return 'score-low'
  }

  const getScoreText = (score) => {
    if (score >= 0.5) return '🟢 High Match'
    if (score >= 0.25) return '🟡 Medium Match'
    return '🔵 Low Match'
  }

  return (
    <>
      {/* Header */}
      <div className="page-header">
        <div className="page-badge">🏢 Recruiter Command Center</div>
        <h1>Company Workspace</h1>
        <p>Ingest job specification datasets or screen multiple candidate resumes against specific roles.</p>
      </div>

      {/* Tabs Control */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', borderBottom: '1px solid var(--border)', paddingBottom: '16px' }}>
        <button
          className={`btn ${activeTab === 'train' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setActiveTab('train')}
          style={{ padding: '8px 16px', fontSize: '0.9rem' }}
        >
          ⚡ Dataset Manager
        </button>
        <button
          className={`btn ${activeTab === 'screener' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setActiveTab('screener')}
          style={{ padding: '8px 16px', fontSize: '0.9rem' }}
        >
          👥 Candidate Screener (Dashboard)
        </button>
      </div>

      {/* Tab 1: Train/Ingestion */}
      {activeTab === 'train' && (
        <>
          <div className="card" style={{ marginBottom: '20px' }}>
            <div style={{ marginBottom: '20px' }}>
              <label className="form-label" htmlFor="train-company-input">🏢 Company Name</label>
              <input
                id="train-company-input"
                type="text"
                className="form-input"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="e.g. Google, Microsoft, Global"
                style={{ width: '100%', maxWidth: '360px', marginTop: '6px' }}
              />
              <div className="card-desc" style={{ marginTop: '6px' }}>
                Uploading a dataset under an existing company will overwrite that company's jobs.
              </div>
            </div>

            <div className="card-title">Upload CSV Dataset</div>
            <div className="card-desc" style={{ marginBottom: '16px' }}>Drag and drop or click to browse. Must be a .csv file with job role and skills columns.</div>

            <div
              id="train-upload-zone"
              className={`upload-zone${dragging ? ' dragging' : ''}`}
              onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDropTrain}
              onClick={() => trainInputRef.current?.click()}
            >
              <input
                ref={trainInputRef}
                type="file"
                accept=".csv"
                id="train-file-input"
                style={{ display: 'none' }}
                onChange={(e) => {
                  setFile(e.target.files[0])
                  setError('')
                }}
              />
              <div className="upload-icon">📂</div>
              {file ? (
                <>
                  <h3>File ready</h3>
                  <p>Click to change file</p>
                  <div className="file-selected">📄 {file.name}</div>
                </>
              ) : (
                <>
                  <h3>Drop your CSV here</h3>
                  <p>or click to browse files</p>
                </>
              )}
            </div>

            {error && (
              <div className="alert alert-error" role="alert" style={{ marginTop: '16px' }}>
                <span>⚠️</span> {error}
              </div>
            )}
            {message && (
              <div className="alert alert-success" role="status" style={{ marginTop: '16px' }}>
                <span>✅</span> {message}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <button
              id="train-submit-btn"
              className="btn btn-primary"
              onClick={handleTrain}
              disabled={loading || !file}
            >
              {loading ? (
                <><div className="spinner" /> Training...</>
              ) : (
                <>⚡ Train Dataset</>
              )}
            </button>
            {file && (
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => { setFile(null); setMessage(''); setError('') }}
              >
                Clear
              </button>
            )}
          </div>

          {!loading && !message && (
            <div style={{ marginTop: '48px' }}>
              <div className="section-divider"><span>How it works</span></div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                {[
                  { icon: '📤', title: 'Upload CSV', desc: 'Provide a structured job dataset with roles and descriptions.' },
                  { icon: '🧠', title: 'TF-IDF Vectorization', desc: 'The model extracts keywords and builds a similarity matrix.' },
                  { icon: '✅', title: 'Ready to Search', desc: 'Navigate to Search to match your resume against the dataset.' }
                ].map((step, i) => (
                  <div key={i} className="card" style={{ animationDelay: `${i * 0.1}s` }}>
                    <div style={{ fontSize: '1.6rem', marginBottom: '10px' }}>{step.icon}</div>
                    <div className="card-title">{step.title}</div>
                    <div className="card-desc" style={{ marginBottom: 0 }}>{step.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Tab 2: Candidate Screener (Dashboard) */}
      {activeTab === 'screener' && (
        <>
          <div className="card" style={{ marginBottom: '20px' }}>
            <div className="card-title">1. Target Job Specification</div>
            <div className="card-desc" style={{ marginBottom: '16px' }}>Choose an existing job role or write custom requirements to compare resumes against.</div>

            {/* Mode selection toggles */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
              <button
                type="button"
                className={`btn ${screenerMode === 'select' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => { setScreenerMode('select'); setScreenerError('') }}
                style={{ padding: '6px 12px', fontSize: '0.8rem' }}
              >
                💼 Select Existing Role
              </button>
              <button
                type="button"
                className={`btn ${screenerMode === 'custom' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => { setScreenerMode('custom'); setScreenerError('') }}
                style={{ padding: '6px 12px', fontSize: '0.8rem' }}
              >
                ✏️ Paste Custom Requirements
              </button>
            </div>

            {/* Screener mode inputs */}
            {screenerMode === 'select' ? (
              <div style={{ marginBottom: '16px' }}>
                <label className="form-label" htmlFor="screener-job-dropdown">Selected Job Role</label>
                {jobRoles.length > 0 ? (
                  <select
                    id="screener-job-dropdown"
                    className="form-input"
                    value={selectedJobRole}
                    onChange={(e) => setSelectedJobRole(e.target.value)}
                    style={{ width: '100%', maxWidth: '360px', marginTop: '6px', cursor: 'pointer' }}
                  >
                    {jobRoles.map((role) => (
                      <option key={role} value={role}>{role}</option>
                    ))}
                  </select>
                ) : (
                  <div className="alert alert-error" style={{ marginTop: '8px', padding: '10px 14px' }}>
                    ⚠️ No job roles trained yet. Go to "Dataset Manager" to upload jobs or use the custom option.
                  </div>
                )}
              </div>
            ) : (
              <div style={{ marginBottom: '16px' }}>
                <label className="form-label" htmlFor="screener-desc-input">Job Description / Required Skills</label>
                <textarea
                  id="screener-desc-input"
                  className="form-input"
                  rows="4"
                  value={customJobDesc}
                  onChange={(e) => setCustomJobDesc(e.target.value)}
                  placeholder="Paste skills, certifications, and requirements (e.g. JavaScript, React, Node.js, 3+ years experience...)"
                  style={{ width: '100%', marginTop: '6px', resize: 'vertical', fontFamily: 'inherit' }}
                />
              </div>
            )}
          </div>

          <div className="card" style={{ marginBottom: '20px' }}>
            <div className="card-title">2. Upload Candidate Resumes</div>
            <div className="card-desc" style={{ marginBottom: '16px' }}>Upload multiple PDF resumes to screen them against the chosen job criteria.</div>

            <div
              id="screener-upload-zone"
              className={`upload-zone${screenerDragging ? ' dragging' : ''}`}
              onDragOver={(e) => { e.preventDefault(); setScreenerDragging(true) }}
              onDragLeave={() => setScreenerDragging(false)}
              onDrop={handleDropScreener}
              onClick={() => screenerInputRef.current?.click()}
              style={{ padding: '30px 16px' }}
            >
              <input
                ref={screenerInputRef}
                type="file"
                accept=".pdf"
                multiple
                id="screener-file-input"
                style={{ display: 'none' }}
                onChange={handleScreenerFileChange}
              />
              <div className="upload-icon">📂</div>
              <h3>Drop candidate resumes here</h3>
              <p>Supports uploading multiple PDFs (.pdf)</p>
            </div>

            {/* List of uploaded files */}
            {screenerFiles.length > 0 && (
              <div style={{ marginTop: '20px' }}>
                <div style={{ fontWeight: '600', fontSize: '0.9rem', marginBottom: '8px', color: 'var(--text-secondary)' }}>
                  📁 Uploaded Resumes ({screenerFiles.length})
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {screenerFiles.map((file, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: '6px 12px',
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid var(--border)',
                        borderRadius: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontSize: '0.8rem'
                      }}
                    >
                      <span>📄 {file.name}</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          removeScreenerFile(idx)
                        }}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--error)',
                          cursor: 'pointer',
                          fontWeight: '600',
                          padding: '0 4px'
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {screenerError && (
              <div className="alert alert-error" role="alert" style={{ marginTop: '16px' }}>
                <span>⚠️</span> {screenerError}
              </div>
            )}
          </div>

          <div style={{ marginBottom: '40px' }}>
            <button
              id="screener-submit-btn"
              className="btn btn-primary"
              onClick={handleBulkMatch}
              disabled={screenerLoading || screenerFiles.length === 0}
            >
              {screenerLoading ? (
                <><div className="spinner" /> Analyzing Candidates...</>
              ) : (
                <>👥 Screen & Rank Candidates</>
              )}
            </button>
            {screenerFiles.length > 0 && (
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => { setScreenerFiles([]); setScreenerResults([]); setScreenerError('') }}
                style={{ marginLeft: '12px' }}
              >
                Clear All Files
              </button>
            )}
          </div>

          {/* Screener Results Dashboard */}
          {(screenerResults.length > 0 || screenerLoading) && (
            <>
              <div className="section-divider">
                <span>Ranked Candidates Dashboard</span>
              </div>

              {screenerLoading ? (
                <div className="card">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {[1, 2, 3].map((n) => (
                      <div key={n} style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div className="skeleton" style={{ width: '24px', height: '24px', borderRadius: '50%' }} />
                        <div className="skeleton" style={{ flex: 2, height: '20px' }} />
                        <div className="skeleton" style={{ flex: 3, height: '14px', borderRadius: '4px' }} />
                        <div className="skeleton" style={{ width: '80px', height: '20px', borderRadius: '100px' }} />
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="card" style={{ padding: '20px' }}>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--border)' }}>
                          <th style={{ padding: '12px 8px', color: 'var(--text-secondary)', fontWeight: '500', fontSize: '0.85rem' }}>Rank</th>
                          <th style={{ padding: '12px 8px', color: 'var(--text-secondary)', fontWeight: '500', fontSize: '0.85rem' }}>Candidate</th>
                          <th style={{ padding: '12px 8px', color: 'var(--text-secondary)', fontWeight: '500', fontSize: '0.85rem' }}>Match strength</th>
                          <th style={{ padding: '12px 8px', color: 'var(--text-secondary)', fontWeight: '500', fontSize: '0.85rem', textAlign: 'right' }}>Score</th>
                        </tr>
                      </thead>
                      <tbody>
                        {screenerResults.map((candidate, index) => {
                          const pct = candidate.score * 100
                          const scoreCls = getScoreClass(candidate.score)
                          const scoreText = getScoreText(candidate.score)
                          return (
                            <tr
                              key={index}
                              className="job-card"
                              style={{
                                display: 'table-row',
                                animationDelay: `${index * 0.05}s`,
                                borderBottom: '1px solid var(--border)',
                                background: 'transparent',
                                border: 'none'
                              }}
                            >
                              <td style={{ padding: '16px 8px', fontWeight: '700', color: 'var(--accent)', fontSize: '1.1rem', width: '60px' }}>
                                #{index + 1}
                              </td>
                              <td style={{ padding: '16px 8px', fontWeight: '600' }}>
                                <div style={{ fontSize: '0.95rem' }}>{formatCandidateName(candidate.filename)}</div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: '400', marginTop: '2px' }}>
                                  {candidate.filename}
                                </div>
                              </td>
                              <td style={{ padding: '16px 8px', minWidth: '180px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                  <div
                                    style={{
                                      flex: 1,
                                      height: '8px',
                                      background: 'rgba(255,255,255,0.02)',
                                      borderRadius: '100px',
                                      overflow: 'hidden',
                                      border: '1px solid var(--border)'
                                    }}
                                  >
                                    <div
                                      style={{
                                        width: `${Math.max(pct, 3)}%`,
                                        height: '100%',
                                        background: candidate.score >= 0.5 
                                          ? 'var(--success)' 
                                          : candidate.score >= 0.25 
                                            ? 'var(--warning)' 
                                            : 'var(--accent)',
                                        borderRadius: '100px',
                                        boxShadow: '0 0 10px rgba(99,102,241,0.2)'
                                      }}
                                    />
                                  </div>
                                  <span className={`score-badge ${scoreCls}`} style={{ display: 'inline-block', minWidth: '110px', textAlign: 'center' }}>
                                    {scoreText}
                                  </span>
                                </div>
                              </td>
                              <td
                                style={{
                                  padding: '16px 8px',
                                  textAlign: 'right',
                                  fontWeight: '700',
                                  color: 'var(--text-primary)',
                                  fontSize: '1rem',
                                  width: '90px'
                                }}
                              >
                                {pct.toFixed(1)}%
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}
    </>
  )
}