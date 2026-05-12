import { useState } from 'react'
import API from '../api'
export default function TrainPage() {
  const [file, setFile] = useState(null)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const handleTrain = async () => {
    if (!file) {
      setError('Please select a file')
      return
    }
    try {
      setLoading(true)
      setError('')
      setMessage('')
      const formData = new FormData()
      formData.append('file', file)
      const response = await API.post(
        '/train',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        }
      )
      setMessage(response.data.message)
    } catch (err) {
      const errorMessage = 
        err.response?.data?.error ||
        err.response?.data?.message ||
        err.message || 
        'Training failed'
      setError(errorMessage)
      console.error('Training error:', err)
    } finally {
      setLoading(false)
    }
  }
  return (
    <div>
      <h2>Train Company Dataset</h2>
      <input
        type="file"
        onChange={(e) => setFile(e.target.files[0])}
        accept=".csv"
      />
      <button onClick={handleTrain} disabled={loading}>
        {loading ? 'Training...' : 'Train Dataset'}
      </button>
      {error && (
        <p style={{ color: 'red' }}>
          Error: {error}
        </p>
      )}
      {message && (
        <p style={{ color: 'green' }}>
          {message}
        </p>
      )}
    </div>
  )
}