import { Routes, Route, Navigate, Link, useNavigate } from 'react-router-dom'
import LoginPage from './pages/LoginPage.jsx'
import ProjectsPage from './pages/ProjectsPage.jsx'
import DefectsPage from './pages/DefectsPage.jsx'

function Protected({ children }) {
  const token = localStorage.getItem('token')
  return token ? children : <Navigate to="/login" replace />
}

function Navbar() {
  const navigate = useNavigate()
  const logout = () => { localStorage.removeItem('token'); navigate('/login') }
  const hasToken = !!localStorage.getItem('token')
  return (
    <nav className="navbar navbar-expand bg-light px-3 mb-3">
      <Link className="navbar-brand" to="/projects">Defects</Link>
      <div className="ms-auto">
        {hasToken ? (
          <button className="btn btn-outline-secondary btn-sm" onClick={logout}>Выйти</button>
        ) : (
          <Link className="btn btn-primary btn-sm" to="/login">Войти</Link>
        )}
      </div>
    </nav>
  )
}

export default function App() {
  return (
    <>
      <Navbar />
      <div className="container">
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/projects" element={<Protected><ProjectsPage /></Protected>} />
          <Route path="/defects" element={<Protected><DefectsPage /></Protected>} />
          <Route path="*" element={<Navigate to="/projects" replace />} />
        </Routes>
      </div>
    </>
  )
}
