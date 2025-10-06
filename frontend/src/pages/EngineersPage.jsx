// frontend/src/pages/EngineersPage.jsx
import { useEffect, useState } from "react";
import api from "../api";
import AssignEngineerModal from "../components/AssignEngineerModal.jsx";

export default function EngineersPage() {
  // --- состояния
  const [engineers, setEngineers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  // создание инженера (если у вас нет POST /auth/users/ — закомментируйте форму)
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");

  // дефекты (для назначения)
  const [defects, setDefects] = useState([]);
  const [defLoading, setDefLoading] = useState(false);

  // модалка назначения
  const [assignOpen, setAssignOpen] = useState(false);
  const [currentDefect, setCurrentDefect] = useState(null);

  // ---- загрузка инженеров
  async function loadEngineers() {
    setLoading(true);
    try {
      const { data } = await api.get("/auth/users/", {
        params: { role: "engineer", search: q || undefined },
      });
      setEngineers(data.results || data);
    } catch (e) {
      console.error("Failed to load engineers:", e);
      setEngineers([]);
    } finally {
      setLoading(false);
    }
  }

  // ---- загрузка дефектов (пример — берём все; при желании фильтровать)
  async function loadDefects() {
    setDefLoading(true);
    try {
      const { data } = await api.get("/defects/", { params: { ordering: "-created_at" } });
      setDefects(data.results || data);
    } catch (e) {
      console.error("Failed to load defects:", e);
      setDefects([]);
    } finally {
      setDefLoading(false);
    }
  }

  useEffect(() => {
    loadEngineers();
    loadDefects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // перезагрузка при поиске
  useEffect(() => {
    const t = setTimeout(loadEngineers, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  // ---- создать инженера (если есть эндпоинт POST /auth/users/)
  async function createEngineer(e) {
    e.preventDefault();
    if (!email || !password) return;
    try {
      await api.post("/auth/users/", {
        email: email.trim().toLowerCase(),
        name: fullName.trim(),
        role: "engineer",
        password: password.trim(),
      });
      setEmail("");
      setFullName("");
      setPassword("");
      await loadEngineers();
      alert("Инженер создан");
    } catch (err) {
      console.error(err);
      alert("Не удалось создать инженера");
    }
  }

  // ---- открыть модалку назначения
  function openAssign(defect) {
    setCurrentDefect(defect);
    setAssignOpen(true);
  }

  return (
    <div className="container-fluid">
      <h4 className="mb-3">Инженеры</h4>

      {/* форма создания инженера */}
      <div className="card mb-3">
        <div className="card-header">Создать инженера</div>
        <div className="card-body">
          <form className="row g-2" onSubmit={createEngineer}>
            <div className="col-md-4">
              <label className="form-label">Email</label>
              <input
                className="form-control"
                type="email"
                placeholder="engineer@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="col-md-4">
              <label className="form-label">ФИО</label>
              <input
                className="form-control"
                placeholder="Иванов И.И."
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>
            <div className="col-md-3">
              <label className="form-label">Пароль</label>
              <input
                className="form-control"
                type="password"
                placeholder="минимум 6 символов"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={6}
              />
            </div>
            <div className="col-md-1 d-flex align-items-end">
              <button className="btn btn-primary w-100" type="submit">
                Создать
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* список инженеров */}
      <div className="card mb-3">
        <div className="card-header d-flex align-items-center">
          <div className="me-3">Список инженеров</div>
          <div className="ms-auto" style={{ maxWidth: 320 }}>
            <input
              className="form-control form-control-sm"
              placeholder="Поиск по e-mail/ФИО…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <button className="btn btn-outline-secondary btn-sm ms-2" onClick={loadEngineers}>
            Обновить
          </button>
        </div>
        <div className="card-body p-0">
          {loading ? (
            <div className="p-3">Загрузка…</div>
          ) : (
            <div className="table-responsive">
              <table className="table table-striped table-hover mb-0 align-middle">
                <thead>
                  <tr>
                    <th style={{ width: 220 }}>ID</th>
                    <th>Email</th>
                    <th>ФИО</th>
                  </tr>
                </thead>
                <tbody>
                  {engineers.map((u) => (
                    <tr key={u.id}>
                      <td className="text-muted">{u.id}</td>
                      <td>{u.email}</td>
                      <td>{u.full_name || u.name || "—"}</td>
                    </tr>
                  ))}
                  {engineers.length === 0 && (
                    <tr>
                      <td colSpan={3} className="text-center text-muted py-3">
                        Ничего не найдено
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* дефекты для назначения */}
      <div className="card">
        <div className="card-header">Дефекты (для назначения инженера)</div>
        <div className="card-body p-0">
          {defLoading ? (
            <div className="p-3">Загрузка…</div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover mb-0 align-middle">
                <thead>
                  <tr>
                    <th style={{ width: 220 }}>ID</th>
                    <th>Проект</th>
                    <th>Название</th>
                    <th>Статус</th>
                    <th>Инженер</th>
                    <th style={{ width: 160 }}>Назначение</th>
                  </tr>
                </thead>
                <tbody>
                  {defects.map((d) => (
                    <tr key={d.id}>
                      <td className="text-muted">{d.id}</td>
                      <td className="text-muted">{d.project}</td>
                      <td>{d.title}</td>
                      <td>{d.status}</td>
                      <td className="text-muted">{d.assignee || "—"}</td>
                      <td>
                        <button className="btn btn-outline-primary btn-sm" onClick={() => openAssign(d)}>
                          Назначить
                        </button>
                      </td>
                    </tr>
                  ))}
                  {defects.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center text-muted py-3">
                        Дефектов нет
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* модалка назначения инженера */}
      <AssignEngineerModal
        defect={currentDefect}
        show={assignOpen}
        onClose={() => setAssignOpen(false)}
        onAssigned={() => {
          // после назначения обновим список дефектов, чтобы увидеть изменения
          loadDefects();
        }}
      />
    </div>
  );
}
