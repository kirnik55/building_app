import { useEffect, useMemo, useState } from "react";
import api from "../api";
import AssignEngineerModal from "../components/AssignEngineerModal.jsx";

export default function EngineersPage() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);

  // форма создания инженера
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");

  // назначение
  const [modal, setModal] = useState({ open: false, defect: null });
  const [defects, setDefects] = useState([]);
  const [defectsLoading, setDefectsLoading] = useState(false);
  const [search, setSearch] = useState("");

  const filteredDefects = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return defects;
    return defects.filter(
      (d) =>
        String(d.id).includes(q) ||
        (d.title || "").toLowerCase().includes(q) ||
        (d.project_name || "").toLowerCase().includes(q)
    );
  }, [defects, search]);

  async function loadEngineers() {
    setLoading(true);
    const { data } = await api.get("/users/?role=engineer");
    setList(data.results || data);
    setLoading(false);
  }

  async function loadDefects() {
    setDefectsLoading(true);
    // подтягиваем дефекты (можно доп. фильтры: только открытые, только без assignee и т.п.)
    const acc = [];
    let url = "/defects/?ordering=-created_at";
    while (url) {
      const { data } = await api.get(url);
      const chunk = data?.results ?? data;
      // обогатим для удобства
      acc.push(
        ...chunk.map((d) => ({
          ...d,
          project_name: d.project_name || d.project || "",
        }))
      );
      url = data?.next ? data.next.replace(/^https?:\/\/[^/]+\/api/, "") : null;
    }
    setDefects(acc);
    setDefectsLoading(false);
  }

  useEffect(() => {
    loadEngineers();
    loadDefects();
  }, []);

  async function createEngineer(e) {
    e.preventDefault();
    if (!email || !password) return;
    await api.post("/users/", {
      email: email.trim().toLowerCase(),
      full_name: fullName.trim(),
      password: password.trim(),
      // role игнорируется бэком — всегда engineer
    });
    setEmail("");
    setFullName("");
    setPassword("");
    await loadEngineers();
  }

  return (
    <div className="container-fluid px-0">
      <div className="d-flex align-items-center justify-content-between mb-3">
        <h4 className="mb-0">Инженеры</h4>
        <button className="btn btn-outline-secondary" onClick={loadEngineers} disabled={loading}>
          Обновить
        </button>
      </div>

      {/* Форма создания */}
      <div className="card shadow-sm mb-3">
        <div className="card-header bg-white fw-semibold">Создать инженера</div>
        <div className="card-body">
          <form className="row g-3" onSubmit={createEngineer}>
            <div className="col-md-4">
              <label className="form-label">Email</label>
              <input
                className="form-control"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="engineer@example.com"
              />
            </div>
            <div className="col-md-4">
              <label className="form-label">ФИО</label>
              <input
                className="form-control"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Иванов И.И."
              />
            </div>
            <div className="col-md-3">
              <label className="form-label">Пароль</label>
              <input
                className="form-control"
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="минимум 6 символов"
                required
              />
            </div>
            <div className="col-md-1 d-flex align-items-end">
              <button className="btn btn-primary w-100" type="submit" disabled={!email || !password}>
                Создать
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Список инженеров */}
      <div className="card shadow-sm">
        <div className="card-header bg-white fw-semibold">Список инженеров</div>
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead>
              <tr>
                <th>ID</th>
                <th>Email</th>
                <th>ФИО</th>
                <th>Статус</th>
                <th className="text-end">Действия</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="text-center py-4">Загрузка…</td>
                </tr>
              ) : list.length ? (
                list.map((u) => (
                  <tr key={u.id}>
                    <td>{u.id}</td>
                    <td>{u.email}</td>
                    <td>{u.full_name || "—"}</td>
                    <td>
                      <span className="badge bg-success">активен</span>
                    </td>
                    <td className="text-end">
                      <button
                        className="btn btn-sm btn-outline-primary"
                        onClick={() => setModal({ open: true, defect: null })}
                        title="Назначить на дефект (выберите дефект ниже)"
                        disabled
                        style={{ opacity: 0.6, cursor: "not-allowed" }}
                      >
                        Назначить (через таблицу дефектов)
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="text-center text-muted py-4">
                    Инженеров пока нет
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Блок дефектов для назначения */}
      <div className="card shadow-sm mt-3">
        <div className="card-header bg-white fw-semibold d-flex justify-content-between align-items-center">
          <span>Дефекты (для назначения инженера)</span>
          <input
            className="form-control form-control-sm"
            style={{ width: 260 }}
            placeholder="Поиск по ID/названию/проекту…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead>
              <tr>
                <th>ID</th>
                <th>Проект</th>
                <th>Название</th>
                <th>Статус</th>
                <th>Инженер</th>
                <th className="text-end">Назначение</th>
              </tr>
            </thead>
            <tbody>
              {defectsLoading ? (
                <tr>
                  <td colSpan={6} className="text-center py-4">
                    Загрузка…
                  </td>
                </tr>
              ) : filteredDefects.length ? (
                filteredDefects.map((d) => (
                  <tr key={d.id}>
                    <td>#{d.id}</td>
                    <td>{d.project_name || "—"}</td>
                    <td className="text-truncate" style={{ maxWidth: 380 }}>{d.title}</td>
                    <td>{d.status}</td>
                    <td>{d.assignee_name || d.assignee || "—"}</td>
                    <td className="text-end">
                      <button
                        className="btn btn-sm btn-primary"
                        onClick={() => setModal({ open: true, defect: d })}
                      >
                        Назначить инженера
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="text-center text-muted py-4">
                    Дефектов не найдено
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Модал выбора инженера и назначения */}
      <AssignEngineerModal
        defect={modal.defect}
        show={modal.open && !!modal.defect}
        onClose={() => setModal({ open: false, defect: null })}
        onAssigned={() => {
          // после успеха перезагружаем список дефектов
          loadDefects();
        }}
      />
    </div>
  );
}
