import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import API from '../api'

export default function SignupPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('candidate')
  const [companyName, setCompanyName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const navigate = useNavigate()

  const handleSignup = async (e) => {
    e.preventDefault()
    if (!username || !password || !role) {
      setError('Please fill in all fields.')
      return
    }
    if (role === 'company' && !companyName) {
      setError('Company name is required for company recruiters.')
      return
    }

    try {
      setLoading(false)
      setError('')
      setSuccess('')
      setLoading(true)
      
      const payload = {
        username,
        password,
        role,
        company_name: role === 'company' ? companyName.trim() : null
      }
      
      const response = await API.post('/signup', payload)
      if (response.data?.success) {
        setSuccess('Registration successful! Redirecting to login page...')
        setTimeout(() => {
          navigate('/login')
        }, 1500)
      } else {
        setError('Signup failed. Please try again.')
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
        err.message ||
        'Failed to register. Please try again.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: '420px', margin: '60px auto', padding: '0 16px' }}>
      <div className="page-header" style={{ textAlign: 'center', marginBottom: '24px' }}>
        <div className="page-badge">🌱 Join Us</div>
        <h1>Create Account</h1>
        <p>Register as a candidate or a company recruiter</p>
      </div>

      <div className="card">
        <form onSubmit={handleSignup}>
          <div style={{ marginBottom: '16px' }}>
            <label className="form-label" htmlFor="signup-username">Username or Email</label>
            <input
              id="signup-username"
              type="text"
              className="form-input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Pick a username"
              style={{ width: '100%', marginTop: '6px' }}
              required
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label className="form-label" htmlFor="signup-password">Password</label>
            <input
              id="signup-password"
              type="password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              style={{ width: '100%', marginTop: '6px' }}
              required
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label className="form-label">I am a:</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '6px' }}>
              <button
                type="button"
                className={`btn ${role === 'candidate' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => { setRole('candidate'); setCompanyName('') }}
                style={{ justifyContent: 'center', padding: '10px' }}
              >
                👤 Candidate
              </button>
              <button
                type="button"
                className={`btn ${role === 'company' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setRole('company')}
                style={{ justifyContent: 'center', padding: '10px' }}
              >
                🏢 Company Recruiter
              </button>
            </div>
          </div>

          {role === 'company' && (
            <div style={{ marginBottom: '24px' }}>
              <label className="form-label" htmlFor="signup-company">Company Name</label>
              <input
                id="signup-company"
                type="text"
                className="form-input"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="e.g. Google, Microsoft"
                style={{ width: '100%', marginTop: '6px' }}
                required
              />
            </div>
          )}

          {error && (
            <div className="alert alert-error" role="alert" style={{ marginBottom: '20px' }}>
              <span>⚠️</span> {error}
            </div>
          )}

          {success && (
            <div className="alert alert-success" role="alert" style={{ marginBottom: '20px' }}>
              <span>✅</span> {success}
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ width: '100%', justifyContent: 'center' }}
          >
            {loading ? (
              <><div className="spinner" /> Creating Account...</>
            ) : (
              'Sign Up'
            )}
          </button>
        </form>
      </div>

      <div style={{ textAlign: 'center', marginTop: '20px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
        Already have an account? <Link to="/login" style={{ color: 'var(--accent)', fontWeight: '600', textDecoration: 'none' }}>Log in here</Link>
      </div>
    </div>
  )
}
