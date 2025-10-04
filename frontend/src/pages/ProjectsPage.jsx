import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";

/* ====== утилиты ====== */
const debounce = (fn, ms) => {
  let t;
  return (...a) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...a), ms);
  };
};

const tryDecodeRole = () => {
  try {
    const token = localStorage.getItem("token");
    if (!token) return null;
    const [, payload] = token.split(".");
    const json = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
    return json.role || null;
  } catch {
    return null;
  }
};

const SORTS = [
  { v: "name_asc", l: "Название (A → Z)" },
  { v: "name_desc", l: "Название (Z → A)" },
  { v: "created_desc", l: "Новые сверху" },
  { v: "created_asc", l: "Старые сверху" },
];

/* ====== компонент ====== */
export default function ProjectsPage() {
  const navigate = useNavigate();
  const myRole = tryDecodeRole(); // engineer / manager / lead / null

  const [raw, setRaw] = useState([]);          // исходный список с бэка
  const [items, setItems] = useState([]);      // отфильтрованный + отсортированный
  const [loading, setLoading] = useState(true);

  const [view, setView] = useState("cards");   // cards | table
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("name_asc");

  // модалка create/edit
  const [modal, setModal] = useState({ open: false, id: null });
  const [form, setForm] = useState({ name: "", customer: "", description: "" });

  // id проекта → { total, resolved }
  const [stats, setStats] = useState({});

  /* ---------- загрузка проектов ---------- */
  async function load() {
    setLoading(true);
    const { data } = await api.get("/projects/");
    const list = data.results || data;
    setRaw(list);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  /* ---------- мини-статистика по дефектам (лениво) ---------- */
  async function loadStats(id) {
    // уже есть — не перезагружаем
    if (stats[id]) return;
    try {
      const [all, resolved] = await Promise.all([
        api.get(`/defects/?project=${id}`),                // total -> .count
        api.get(`/defects/resolved/?project=${id}`),       // resolved -> .count (у вас есть этот endpoint)
      ]);
      setStats((s) => ({
        ...s,
        [id]: {
          total: all.data?.count ?? (all.data?.results?.length || 0),
          resolved: resolved.data?.count ?? (resolved.data?.results?.length || 0),
        },
      }));
    } catch {
      // если эндпоинта нет — тихо игнорируем
    }
  }

  /* ---------- поиск + сортировка (клиент) ---------- */
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = raw;
    if (q) {
      list = raw.filter(
        (p) =>
          (p.name || "").toLowerCase().includes(q) ||
          (p.customer || "").toLowerCase().includes(q) ||
          (p.description || "").toLowerCase().includes(q)
      );
    }
    switch (sort) {
      case "name_asc":
        list = [...list].sort((a, b) => (a.name || "").localeCompare(b.name || ""));
        break;
      case "name_desc":
        list = [...list].sort((a, b) => (b.name || "").localeCompare(a.name || ""));
        break;
      case "created_desc":
        list = [...list].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
        break;
      case "created_asc":
        list = [...list].sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0));
        break;
      default:
        break;
    }
    return list;
  }, [raw, query, sort]);

  useEffect(() => setItems(filtered), [filtered]);

  const updateSearch = useMemo(() => debounce((v) => setQuery(v), 250), []);

  /* ---------- экспорт CSV ---------- */
  function exportCSV() {
    const rows = [
      ["Название", "Заказчик", "Описание"],
      ...items.map((p) => [p.name || "", p.customer || "", p.description || ""]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replaceAll('"', '""')}"`).join(";")).join("\r\n");
    const blob = new Blob([`\ufeff${csv}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "projects.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  /* ---------- модалка create/edit ---------- */
  function openCreate() {
    setForm({ name: "", customer: "", description: "" });
    setModal({ open: true, id: null });
  }
  function openEdit(p) {
    setForm({ name: p.name || "", customer: p.customer || "", description: p.description || "" });
    setModal({ open: true, id: p.id });
  }
  function closeModal() {
    setModal({ open: false, id: null });
  }
  async function saveProject(e) {
    e.preventDefault();
    const payload = { ...form, name: form.name.trim() };
    if (!payload.name) return;
    if (modal.id) {
      await api.patch(`/projects/${modal.id}/`, payload);
    } else {
      await api.post("/projects/", payload);
    }
    closeModal();
    load();
  }

  /* ---------- карточка проекта ---------- */
  const ProjectCard = ({ p }) => {
    const st = stats[p.id];
    const unresolved = st ? Math.max(st.total - st.resolved, 0) : null;

    return (
      <div
        className="card h-100 hover-shadow"
        onMouseEnter={() => loadStats(p.id)}
      >
        <div className="card-body d-flex flex-column">
          <div className="d-flex align-items-start justify-content-between">
            <h5 className="card-title mb-2">{p.name}</h5>
            {myRole !== "engineer" && (
              <button className="btn btn-sm btn-outline-secondary" onClick={() => openEdit(p)}>
                Редактировать
              </button>
            )}
          </div>

          {p.customer && <div className="text-muted mb-2">Заказчик: {p.customer}</div>}
          {p.description && <div className="mb-3">{p.description}</div>}

          {/* мини-статистика по дефектам */}
          {st && (
            <div className="d-flex gap-2 mb-3">
              <span className="badge bg-secondary">Всего: {st.total}</span>
              <span className="badge bg-success">Закрыто: {st.resolved}</span>
              <span className={`badge ${unresolved ? "bg-warning text-dark" : "bg-light text-dark"}`}>
                Открыто: {unresolved}
              </span>
            </div>
          )}

          <div className="mt-auto d-flex gap-2">
            <button
              className="btn btn-primary"
              onClick={() => navigate(`/defects?project=${p.id}`)}
            >
              К дефектам
            </button>
            <button
              className="btn btn-outline-secondary"
              onClick={() => navigate(`/defects?project=${p.id}&status=in_progress`)}
            >
              В работе
            </button>
            <button
              className="btn btn-outline-success"
              onClick={() => navigate(`/defects?project=${p.id}&status=resolved`)}
            >
              Закрытые
            </button>
          </div>
        </div>
      </div>
    );
  };

  /* ---------- разметка ---------- */
  return (
    <div className="container-fluid px-0">
      <div className="d-flex align-items-center justify-content-between mb-3">
        <h4 className="mb-0">Проекты</h4>
        <div className="d-flex gap-2">
          <div className="btn-group me-2">
            <button
              className={`btn btn-outline-secondary ${view === "cards" ? "active" : ""}`}
              onClick={() => setView("cards")}
              title="Карточки"
            >
              ▦
            </button>
            <button
              className={`btn btn-outline-secondary ${view === "table" ? "active" : ""}`}
              onClick={() => setView("table")}
              title="Таблица"
            >
              ☰
            </button>
          </div>
          <button className="btn btn-outline-secondary" onClick={exportCSV}>
            Экспорт CSV
          </button>
          {myRole !== "engineer" && (
            <button className="btn btn-primary" onClick={openCreate}>
              Новый проект
            </button>
          )}
        </div>
      </div>

      {/* фильтры/сортировка */}
      <div className="row g-2 mb-3">
        <div className="col-md-6">
          <input
            className="form-control"
            placeholder="Поиск по названию, заказчику, описанию…"
            onChange={(e) => updateSearch(e.target.value)}
          />
        </div>
        <div className="col-md-3">
          <select className="form-select" value={sort} onChange={(e) => setSort(e.target.value)}>
            {SORTS.map((s) => (
              <option key={s.v} value={s.v}>
                {s.l}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* контент */}
      {loading ? (
        <div>Загрузка…</div>
      ) : view === "table" ? (
        <div className="table-responsive">
          <table className="table table-hover align-middle">
            <thead>
              <tr>
                <th>Название</th>
                <th>Заказчик</th>
                <th>Описание</th>
                <th style={{ width: 210 }} />
              </tr>
            </thead>
            <tbody>
              {items.map((p) => {
                const st = stats[p.id];
                const unresolved =
                  st ? Math.max(st.total - st.resolved, 0) : null;
                return (
                  <tr key={p.id} onMouseEnter={() => loadStats(p.id)}>
                    <td className="fw-semibold">{p.name}</td>
                    <td className="text-muted">{p.customer || "—"}</td>
                    <td className="text-muted">{p.description || "—"}</td>
                    <td className="text-end">
                      {/* бейджи, если смогли загрузить */}
                      {st && (
                        <span className="me-2 small">
                          <span className="badge bg-secondary me-1">{st.total}</span>
                          <span className="badge bg-success me-1">{st.resolved}</span>
                          <span className={`badge ${unresolved ? "bg-warning text-dark" : "bg-light text-dark"}`}>
                            {unresolved}
                          </span>
                        </span>
                      )}
                      <div className="btn-group">
                        <button
                          className="btn btn-sm btn-primary"
                          onClick={() => navigate(`/defects?project=${p.id}`)}
                        >
                          Дефекты
                        </button>
                        {myRole !== "engineer" && (
                          <button
                            className="btn btn-sm btn-outline-secondary"
                            onClick={() => openEdit(p)}
                          >
                            Изм.
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!items.length && (
                <tr>
                  <td colSpan={4} className="text-center text-muted py-4">
                    Ничего не найдено
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="row row-cols-1 row-cols-md-2 row-cols-xl-3 g-3">
          {items.map((p) => (
            <div key={p.id} className="col">
              <ProjectCard p={p} />
            </div>
          ))}
          {!items.length && (
            <div className="col">
              <div className="text-center text-muted py-4">Ничего не найдено</div>
            </div>
          )}
        </div>
      )}

      {/* МОДАЛКА: создание/редактирование */}
      {modal.open && (
        <div
          className="modal d-block"
          tabIndex={-1}
          onMouseDown={(e) => e.target.classList.contains("modal") && closeModal()}
        >
          <div className="modal-dialog modal-lg modal-dialog-centered" onMouseDown={(e) => e.stopPropagation()}>
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">{modal.id ? "Редактировать проект" : "Новый проект"}</h5>
                <button className="btn-close" onClick={closeModal} />
              </div>
              <form onSubmit={saveProject}>
                <div className="modal-body">
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label">Название</label>
                      <input
                        className="form-control"
                        value={form.name}
                        onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
                        required
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Заказчик</label>
                      <input
                        className="form-control"
                        value={form.customer}
                        onChange={(e) => setForm((s) => ({ ...s, customer: e.target.value }))}
                      />
                    </div>
                    <div className="col-12">
                      <label className="form-label">Описание</label>
                      <textarea
                        className="form-control"
                        rows={4}
                        value={form.description}
                        onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))}
                      />
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-outline-secondary" onClick={closeModal}>
                    Отмена
                  </button>
                  <button type="submit" className="btn btn-success">
                    {modal.id ? "Сохранить" : "Создать"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
