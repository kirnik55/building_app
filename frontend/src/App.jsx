import { Routes, Route, NavLink, useNavigate, Navigate } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute.jsx";

import LoginPage from "./pages/LoginPage.jsx";
import ProjectsPage from "./pages/ProjectsPage.jsx";
import DefectsPage from "./pages/DefectsPage.jsx";
import ReportsPage from "./pages/ReportsPage.jsx";
import EngineersPage from "./pages/EngineersPage.jsx";

import { useAuth } from "./context/AuthContext.jsx";

function Navbar() {
  const navigate = useNavigate();
  const { me } = useAuth(); // { id, email, role, ... } или null

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("refresh");
    navigate("/login");
    // Перезагрузим UI, чтобы контекст очистился
    window.location.reload();
  };

  const isAuthed = !!me;
  const canManage = me && ["manager", "lead", "admin"].includes(me.role);

  return (
    <nav className="navbar navbar-expand bg-light px-3 mb-3 border-bottom">
      <span className="navbar-brand fw-semibold">Defects</span>

      {isAuthed && (
        <>
          <ul className="navbar-nav">
            <li className="nav-item">
              <NavLink to="/defects" className="nav-link">
                Дефекты
              </NavLink>
            </li>

            {/* Проекты и отчёты только для manager/lead/admin */}
            {canManage && (
              <>
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
                <li className="nav-item">
                  <NavLink to="/engineers" className="nav-link">
                    Инженеры
                  </NavLink>
                </li>
              </>
            )}
          </ul>

          <div className="ms-auto d-flex align-items-center gap-2">
            {/* бейдж роли */}
            <span className="badge text-bg-secondary text-uppercase">{me.role}</span>
            <button className="btn btn-outline-secondary btn-sm" onClick={logout}>
              Выйти
            </button>
          </div>
        </>
      )}

      {!isAuthed && (
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

          {/* Публичный маршрут Инженеры (по вашей просьбе). 
              В меню ссылка видна только manager/lead/admin. */}
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
          <Route path="*" element={<Navigate to="/defects" replace />} />
        </Routes>
      </div>
    </>
  );
}
