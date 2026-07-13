import { useState, useRef } from 'react'
import API from '../api'

export default function TrainPage() {
  const [file, setFile] = useState(null)
  const [company, setCompany] = useState('Global')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef(null)

  const handleDrop = (e) => {
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

  return (
    <>
      <div className="page-header">
        <div className="page-badge">⚡ Training Pipeline</div>
        <h1>Train Your Dataset</h1>
        <p>Upload a CSV file containing job listings to build the TF-IDF recommendation model.</p>
      </div>

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
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
        >
          <input
            ref={inputRef}
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
          <div className="alert alert-error" role="alert">
            <span>⚠️</span> {error}
          </div>
        )}
        {message && (
          <div className="alert alert-success" role="status">
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
  )
}