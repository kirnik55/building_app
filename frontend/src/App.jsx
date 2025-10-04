import { Routes, Route, NavLink, useNavigate, Navigate } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute.jsx";

import LoginPage from "./pages/LoginPage.jsx";
import ProjectsPage from "./pages/ProjectsPage.jsx";
import DefectsPage from "./pages/DefectsPage.jsx";
import ReportsPage from "./pages/ReportsPage.jsx";
import EngineersPage from "./pages/EngineersPage.jsx";

function Navbar() {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("refresh");
    navigate("/login");
  };

  return (
    <nav className="navbar navbar-expand bg-light px-3 mb-3 border-bottom">
      <span className="navbar-brand fw-semibold">Defects</span>

      {token && (
        <>
          <ul className="navbar-nav">
            <li className="nav-item">
              <NavLink to="/defects" className="nav-link">
                Дефекты
              </NavLink>
            </li>
            <li className="nav-item">
              <NavLink to="/projects" className="nav-link">
                Проекты
              </NavLink>
            </li>
            <li className="nav-item">
              <NavLink to="/reports" className="nav-link">
                Отчёты
              </NavLink>
            </li>
            {/* Новая вкладка Инженеры */}
            <li className="nav-item">
              <NavLink to="/engineers" className="nav-link">
                Инженеры
              </NavLink>
            </li>
          </ul>

          <div className="ms-auto">
            <button className="btn btn-outline-secondary btn-sm" onClick={logout}>
              Выйти
            </button>
          </div>
        </>
      )}

      {!token && (
        <div className="ms-auto">
          <NavLink to="/login" className="btn btn-primary btn-sm">
            Войти
          </NavLink>
        </div>
      )}
    </nav>
  );
}

export default function App() {
  return (
    <>
      <Navbar />
      <div className="container">
        <Routes>
          {/* Публично */}
          <Route path="/login" element={<LoginPage />} />

          {/* Публичный маршрут Инженеры (без ProtectedRoute) */}
          <Route path="/engineers" element={<EngineersPage />} />

          {/* Приватные */}
          <Route
            path="/projects"
            element={
              <ProtectedRoute>
                <ProjectsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/defects"
            element={
              <ProtectedRoute>
                <DefectsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports"
            element={
              <ProtectedRoute>
                <ReportsPage />
              </ProtectedRoute>
            }
          />

          {/* Редирект по-умолчанию */}
          <Route path="*" element={<Navigate to="/projects" replace />} />
        </Routes>
      </div>
    </>
  );
}
