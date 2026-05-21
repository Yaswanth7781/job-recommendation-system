import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom'
import TrainPage from './pages/TrainPage'
import SearchPage from './pages/SearchPage'
import './index.css'

export default function App() {
  return (
    <BrowserRouter>
      <nav className="navbar">
        <NavLink to="/" className="navbar-brand">
          <div className="navbar-logo">AI</div>
          <span className="navbar-title">JobAI</span>
        </NavLink>
        <div className="navbar-nav">
          <NavLink
            id="nav-train"
            to="/"
            end
            className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
          >
            ⚡ Train
          </NavLink>
          <NavLink
            id="nav-search"
            to="/search"
            className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
          >
            🔍 Search
          </NavLink>
        </div>
      </nav>
      <main className="main-content">
        <Routes>
          <Route path="/" element={<TrainPage />} />
          <Route path="/search" element={<SearchPage />} />
        </Routes>
      </main>
    </BrowserRouter>
  )
}