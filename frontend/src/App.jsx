import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom'
import TrainPage from './pages/TrainPage'
import SearchPage from './pages/SearchPage'
import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'
import './index.css'

function ProtectedRoute({ children, allowedRoles }) {
  const userStr = localStorage.getItem('user')
  if (!userStr) {
    return <Navigate to="/login" replace />
  }
  const currentUser = JSON.parse(userStr)
  if (allowedRoles && !allowedRoles.includes(currentUser.role)) {
    return <Navigate to={currentUser.role === 'company' ? '/train' : '/search'} replace />
  }
  return children
}

export default function App() {
  const [user, setUser] = useState(null)

  const loadUser = () => {
    const userStr = localStorage.getItem('user')
    if (userStr) {
      setUser(JSON.parse(userStr))
    } else {
      setUser(null)
    }
  }

  useEffect(() => {
    loadUser()
    window.addEventListener('storage', loadUser)
    return () => window.removeEventListener('storage', loadUser)
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('user')
    setUser(null)
    // Dispatch event to notify listeners
    window.dispatchEvent(new Event('storage'))
  }

  // Redirect component for base route `/`
  const HomeRedirect = () => {
    if (!user) return <Navigate to="/login" replace />
    return user.role === 'company' ? <Navigate to="/train" replace /> : <Navigate to="/search" replace />
  }

  return (
    <BrowserRouter>
      <nav className="navbar">
        <NavLink to="/" className="navbar-brand">
          <div className="navbar-logo">AI</div>
          <span className="navbar-title">JobAI</span>
        </NavLink>
        
        {user && (
          <div className="navbar-nav">
            {user.role === 'company' && (
              <NavLink
                id="nav-train"
                to="/train"
                className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
              >
                ⚡ Train
              </NavLink>
            )}
            <NavLink
              id="nav-search"
              to="/search"
              className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
            >
              🔍 Search
            </NavLink>
            
            <button
              onClick={handleLogout}
              className="nav-link btn-logout"
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-secondary)',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              🚪 Logout ({user.username})
            </button>
          </div>
        )}
      </nav>
      
      <main className="main-content">
        <Routes>
          {/* Public Auth routes (redirect if already logged in) */}
          <Route 
            path="/login" 
            element={user ? <HomeRedirect /> : <LoginPage />} 
          />
          <Route 
            path="/signup" 
            element={user ? <HomeRedirect /> : <SignupPage />} 
          />

          {/* Protected routes */}
          <Route
            path="/train"
            element={
              <ProtectedRoute allowedRoles={['company']}>
                <TrainPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/search"
            element={
              <ProtectedRoute allowedRoles={['candidate', 'company']}>
                <SearchPage />
              </ProtectedRoute>
            }
          />

          {/* Default path redirection */}
          <Route path="/" element={<HomeRedirect />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </BrowserRouter>
  )
}