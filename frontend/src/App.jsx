import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import TrainPage from './pages/TrainPage'
import SearchPage from './pages/SearchPage'
export default function App() {
  return (
    <BrowserRouter>
      <div className='container'>
        <h1>
          AI Job Recommendation System
        </h1>
        <nav>
          <Link to='/'>
            Train
          </Link>
          <Link to='/search'>
            Search
          </Link>
        </nav>
        <div className='page'>
          <Routes>
            <Route
              path='/'
              element={<TrainPage />}
            />
            <Route
              path='/search'
              element={<SearchPage />}
            />
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  )
}