import { Routes, Route, NavLink, useNavigate, Navigate } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute.jsx";

import LoginPage from "./pages/LoginPage.jsx";
import ProjectsPage from "./pages/ProjectsPage.jsx";
import DefectsPage from "./pages/DefectsPage.jsx";
import ReportsPage from "./pages/ReportsPage.jsx";
import EngineersPage from "./pages/EngineersPage.jsx";
import { useAuth } from "./auth/AuthContext";

function RoleBadge({ role }) {
  const map = {
    engineer: { text: "engineer", cls: "secondary" },
    manager:  { text: "manager",  cls: "primary"   },
    lead:     { text: "lead",     cls: "warning"   },
    admin:    { text: "admin",    cls: "danger"    },
  };
  const v = map[role] ?? { text: role, cls: "light" };
  return <span className={`badge text-uppercase bg-${v.cls}`}>{v.text}</span>;
}

function Navbar() {
  const navigate = useNavigate();
  const { isAuth, user, role, canManage, logout } = useAuth();

  return (
    <nav className="navbar navbar-expand bg-light px-3 mb-3 border-bottom">
      <span className="navbar-brand fw-semibold">Defects</span>

      {isAuth && (
        <>
          <ul className="navbar-nav">
            {/* всем авторизованным: Дефекты */}
            <li className="nav-item">
              <NavLink to="/defects" className="nav-link">Дефекты</NavLink>
            </li>

            {/* только менеджмент */}
            {canManage && (
              <>
                <li className="nav-item">
                  <NavLink to="/projects" className="nav-link">Проекты</NavLink>
                </li>
                <li className="nav-item">
                  <NavLink to="/reports" className="nav-link">Отчёты</NavLink>
                </li>
                <li className="nav-item">
                  <NavLink to="/engineers" className="nav-link">Инженеры</NavLink>
                </li>
              </>
            )}
          </ul>

          <div className="ms-auto d-flex align-items-center gap-2">
            <RoleBadge role={role} />
            <span className="text-muted small">{user?.email || user?.name}</span>
            <button
              className="btn btn-outline-secondary btn-sm"
              onClick={() => { logout(); navigate("/login"); }}
            >
              Выйти
            </button>
          </div>
        </>
      )}

      {!isAuth && (
        <div className="ms-auto">
          <NavLink to="/login" className="btn btn-primary btn-sm">Войти</NavLink>
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

          {/* Приватно */}
          <Route
            path="/defects"
            element={
              <ProtectedRoute>
                <DefectsPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/projects"
            element={
              <ProtectedRoute>
                <ProjectsPage />
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

          <Route
            path="/engineers"
            element={
              <ProtectedRoute>
                <EngineersPage />
              </ProtectedRoute>
            }
          />

          {/* default */}
          <Route path="*" element={<Navigate to="/defects" replace />} />
        </Routes>
      </div>
    </>
  );
}
