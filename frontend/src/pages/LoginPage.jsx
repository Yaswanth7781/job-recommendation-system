import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import API from '../api'

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleLogin = async (e) => {
    e.preventDefault()
    if (!username || !password) {
      setError('Please fill in all fields.')
      return
    }

    try {
      setLoading(false)
      setError('')
      setLoading(true)
      const response = await API.post('/login', { username, password })
      if (response.data?.success) {
        localStorage.setItem('user', JSON.stringify({
          username: response.data.username,
          role: response.data.role,
          company_name: response.data.company_name
        }))
        // Redirect based on role
        if (response.data.role === 'company') {
          navigate('/')
        } else {
          navigate('/search')
        }
        // Force refresh navbar
        window.dispatchEvent(new Event('storage'))
      } else {
        setError('Login failed. Please check credentials.')
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
        err.message ||
        'Failed to log in. Please try again.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: '420px', margin: '60px auto', padding: '0 16px' }}>
      <div className="page-header" style={{ textAlign: 'center', marginBottom: '24px' }}>
        <div className="page-badge">🔐 Welcome Back</div>
        <h1>Sign In</h1>
        <p>Access the AI Job Recommendation platform</p>
      </div>

      <div className="card">
        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: '16px' }}>
            <label className="form-label" htmlFor="login-username">Username or Email</label>
            <input
              id="login-username"
              type="text"
              className="form-input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              style={{ width: '100%', marginTop: '6px' }}
              required
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label className="form-label" htmlFor="login-password">Password</label>
            <input
              id="login-password"
              type="password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              style={{ width: '100%', marginTop: '6px' }}
              required
            />
          </div>

          {error && (
            <div className="alert alert-error" role="alert" style={{ marginBottom: '20px' }}>
              <span>⚠️</span> {error}
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ width: '100%', justifyContent: 'center' }}
          >
            {loading ? (
              <><div className="spinner" /> Signing In...</>
            ) : (
              'Sign In'
            )}
          </button>
        </form>
      </div>

      <div style={{ textAlign: 'center', marginTop: '20px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
        Don't have an account? <Link to="/signup" style={{ color: 'var(--accent)', fontWeight: '600', textDecoration: 'none' }}>Sign up here</Link>
      </div>
    </div>
  )
}
