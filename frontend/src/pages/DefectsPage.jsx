import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import api from "../api";

/* ====== словари ====== */
const STATUS_LABEL = {
  new: "Новая",
  in_progress: "В работе",
  verify: "На проверке",
  resolved: "Закрыта",
  canceled: "Отменена",
};
const STATUS_BADGE = {
  new: "secondary",
  in_progress: "primary",
  verify: "warning",
  resolved: "success",
  canceled: "dark",
};

const PRIORITY_LABEL = {
  low: "Низкий",
  medium: "Средний",
  high: "Высокий",
  critical: "Критический",
};
const PRIORITY_BADGE = {
  low: "secondary",
  medium: "info",
  high: "warning",
  critical: "danger",
};

const SORTS = [
  { v: "-created_at", l: "Новые сверху" },
  { v: "created_at", l: "Старые сверху" },
  { v: "due_date", l: "Срок (раньше → позже)" },
  { v: "-due_date", l: "Срок (позже → раньше)" },
  { v: "-priority", l: "Приоритет (высокий → низкий)" },
  { v: "priority", l: "Приоритет (низкий → высокий)" },
];

/* ====== утилиты ====== */
const useQuery = () => {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
};

const debounce = (fn, ms) => {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
};

const tryDecodeRole = () => {
  try {
    const token = localStorage.getItem("token");
    if (!token) return null;
    const [, payload] = token.split(".");
    const json = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
    // ожидаем, что на бэке в клейме есть role, иначе вернем null
    return json.role || null;
  } catch {
    return null;
  }
};

/* ====== основной компонент ====== */
export default function DefectsPage() {
  const query = useQuery();
  const navigate = useNavigate();

  const [projects, setProjects] = useState([]);
  const [items, setItems] = useState([]);
  const [pageInfo, setPageInfo] = useState({ count: 0, next: null, previous: null, page: 1 });

  const [loading, setLoading] = useState(true);
  const [drawer, setDrawer] = useState(null); // выбранный дефект для правой панели
  const [checked, setChecked] = useState(new Set()); // для массовых операций

  // фильтры/сортировка/поиск (инициализируем из URL)
  const [filters, setFilters] = useState({
    project: query.get("project") || "",
    status: query.get("status") || "",
    priority: query.get("priority") || "",
    ordering: query.get("ordering") || "-created_at",
    q: query.get("q") || "",
    page: Number(query.get("page") || 1),
  });

  // форма модалки (create/edit)
  const [modal, setModal] = useState({ open: false, id: null });
  const [form, setForm] = useState({
    project: "",
    title: "",
    description: "",
    priority: "medium",
    status: "new",
    due_date: "",
    files: [],
  });

  // комментарий в дроуэре
  const [newComment, setNewComment] = useState("");
  const dropRef = useRef(null);

  const myRole = tryDecodeRole(); // 'manager' | 'engineer' | 'lead' | null

  /* ---------- загрузка справочников ---------- */
  async function loadProjects() {
    const { data } = await api.get("/projects/");
    setProjects(data.results || data);
  }

  /* ---------- загрузка списка ---------- */
  async function load() {
    setLoading(true);
    const qs = new URLSearchParams();
    if (filters.project) qs.set("project", filters.project);
    if (filters.status) qs.set("status", filters.status);
    if (filters.priority) qs.set("priority", filters.priority);
    if (filters.ordering) qs.set("ordering", filters.ordering);
    if (filters.q) qs.set("search", filters.q);
    if (filters.page) qs.set("page", String(filters.page));

    const { data } = await api.get(`/defects/?${qs.toString()}`);
    const results = data.results || data;
    setItems(results);
    setPageInfo({
      count: data.count ?? results.length,
      next: data.next || null,
      previous: data.previous || null,
      page: filters.page,
    });
    setLoading(false);
    setChecked(new Set()); // сбрасываем выделение при новой выборке
  }

  /* ---------- синхронизация URL ---------- */
  useEffect(() => {
    const qs = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (!v) return;
      if (k === "q") qs.set("q", v);
      else if (k === "ordering") qs.set("ordering", v);
      else if (k === "page") qs.set("page", String(v));
      else qs.set(k, v);
    });
    navigate(`/defects?${qs.toString()}`, { replace: true });
  }, [filters, navigate]);

  /* ---------- init ---------- */
  useEffect(() => {
    loadProjects();
  }, []);
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.project, filters.status, filters.priority, filters.ordering, filters.q, filters.page]);

  /* ---------- debounce поиска ---------- */
  const updateSearch = useMemo(
    () =>
      debounce((val) => setFilters((f) => ({ ...f, q: val, page: 1 })), 300),
    []
  );

  /* ---------- helpers ---------- */
  const openCreate = () => {
    setForm({
      project: filters.project || "",
      title: "",
      description: "",
      priority: "medium",
      status: "new",
      due_date: "",
      files: [],
    });
    setModal({ open: true, id: null });
  };

  const openEdit = (d) => {
    setForm({
      project: d.project_id || d.project,
      title: d.title,
      description: d.description || "",
      priority: d.priority,
      status: d.status,
      due_date: d.due_date || "",
      files: [],
    });
    setModal({ open: true, id: d.id });
  };

  const closeModal = () => setModal({ open: false, id: null });

  /* ---------- сохранение (create/edit) ---------- */
  async function saveDefect(e) {
    e.preventDefault();
    const payload = {
      project: form.project,
      title: form.title.trim(),
      description: form.description.trim(),
      priority: form.priority,
      status: form.status,
      due_date: form.due_date || null,
    };
    if (!payload.project || !payload.title) return;

    let id = modal.id;
    if (id) {
      await api.patch(`/defects/${id}/`, payload);
    } else {
      const { data } = await api.post("/defects/", payload);
      id = data.id;
    }

    // файлы
    if (form.files?.length) {
      const fd = new FormData();
      [...form.files].forEach((f) => fd.append("file", f));
      fd.append("defect", id);
      await api.post("/attachments/", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
    }

    closeModal();
    await load();
  }

  /* ---------- быстрые действия ---------- */
  async function quickStatus(id, status) {
    await api.patch(`/defects/${id}/`, { status });
    if (drawer?.id === id) setDrawer({ ...drawer, status }); // сразу обновим в панели
    load();
  }

  const toggleCheck = (id) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  async function bulkStatus(status) {
    if (!checked.size) return;
    await Promise.all([...checked].map((id) => api.patch(`/defects/${id}/`, { status })));
    await load();
  }

  /* ---------- экспорт CSV ---------- */
  function exportCSV() {
    const rows = [
      ["Проект", "Название", "Приоритет", "Статус", "Срок", "Создан"],
      ...items.map((d) => [
        d.project_name || d.project || "",
        d.title || "",
        PRIORITY_LABEL[d.priority] || d.priority || "",
        STATUS_LABEL[d.status] || d.status || "",
        d.due_date || "",
        new Date(d.created_at).toLocaleString(),
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replaceAll('"', '""')}"`).join(";")).join("\r\n");
    const blob = new Blob([`\ufeff${csv}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "defects.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  /* ---------- детали в правой панели ---------- */
  function openDrawer(d) {
    setDrawer(d);
    setNewComment("");
  }
  function closeDrawer() {
    setDrawer(null);
    setNewComment("");
  }
  async function addComment() {
    if (!drawer || !newComment.trim()) return;
    await api.post("/comments/", { defect: drawer.id, text: newComment.trim() });
    // перезагрузим деталь
    const { data } = await api.get(`/defects/${drawer.id}/`);
    setDrawer(data);
    setNewComment("");
  }

  /* ---------- drag&drop для файлов в модалке ---------- */
  useEffect(() => {
    const node = dropRef.current;
    if (!node) return;
    const prevent = (e) => {
      e.preventDefault();
      e.stopPropagation();
    };
    const onDrop = (e) => {
      prevent(e);
      const files = Array.from(e.dataTransfer.files || []);
      if (files.length) {
        setForm((s) => ({ ...s, files: [...(s.files || []), ...files] }));
      }
    };
    ["dragenter", "dragover", "dragleave", "drop"].forEach((ev) => node.addEventListener(ev, prevent));
    node.addEventListener("drop", onDrop);
    return () => {
      ["dragenter", "dragover", "dragleave", "drop"].forEach((ev) => node.removeEventListener(ev, prevent));
      node.removeEventListener("drop", onDrop);
    };
  }, [dropRef]);

  /* ---------- вью ---------- */
  return (
    <div className="container-fluid px-0">
      {/* заголовок */}
      <div className="d-flex align-items-center justify-content-between mb-3">
        <h4 className="mb-0">Дефекты</h4>
        <div className="d-flex gap-2">
          <button className="btn btn-outline-secondary" onClick={exportCSV}>
            Экспорт CSV
          </button>
          <button className="btn btn-primary" onClick={openCreate}>
            Новый дефект
          </button>
        </div>
      </div>

      {/* фильтры */}
      <div className="row g-2 mb-3">
        <div className="col-md-3">
          <select
            className="form-select"
            value={filters.project}
            onChange={(e) => setFilters((f) => ({ ...f, project: e.target.value, page: 1 }))}
          >
            <option value="">Проект: все</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <div className="col-md-3">
          <select
            className="form-select"
            value={filters.status}
            onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value, page: 1 }))}
          >
            <option value="">Статус: все</option>
            {Object.entries(STATUS_LABEL).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </div>

        <div className="col-md-3">
          <select
            className="form-select"
            value={filters.priority}
            onChange={(e) => setFilters((f) => ({ ...f, priority: e.target.value, page: 1 }))}
          >
            <option value="">Приоритет: все</option>
            {Object.entries(PRIORITY_LABEL).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </div>

        <div className="col-md-3">
          <select
            className="form-select"
            value={filters.ordering}
            onChange={(e) => setFilters((f) => ({ ...f, ordering: e.target.value, page: 1 }))}
          >
            {SORTS.map((s) => (
              <option key={s.v} value={s.v}>
                {s.l}
              </option>
            ))}
          </select>
        </div>

        <div className="col-12 col-md-6">
          <input
            className="form-control"
            placeholder="Поиск по названию/описанию…"
            defaultValue={filters.q}
            onChange={(e) => updateSearch(e.target.value)}
          />
        </div>

        {/* панель массовых действий — скрыта для инженера */}
        {(myRole && myRole !== "engineer") && (
          <div className="col-12 col-md-6 d-flex gap-2">
            <button
              className="btn btn-outline-secondary"
              disabled={!checked.size}
              onClick={() => bulkStatus("in_progress")}
            >
              В работу
            </button>
            <button
              className="btn btn-outline-success"
              disabled={!checked.size}
              onClick={() => bulkStatus("resolved")}
            >
              Закрыть
            </button>
            <button
              className="btn btn-outline-dark"
              disabled={!checked.size}
              onClick={() => bulkStatus("canceled")}
            >
              Отменить
            </button>
          </div>
        )}
      </div>

      {/* список */}
      {loading ? (
        <div>Загрузка…</div>
      ) : (
        <div className="table-responsive mb-3">
          <table className="table table-hover align-middle">
            <thead>
              <tr>
                <th style={{ width: 36 }}>
                  <input
                    type="checkbox"
                    checked={items.length && checked.size === items.length}
                    onChange={(e) =>
                      setChecked(e.target.checked ? new Set(items.map((i) => i.id)) : new Set())
                    }
                  />
                </th>
                <th style={{ width: 290 }}>Проект</th>
                <th>Название</th>
                <th style={{ width: 130 }}>Приоритет</th>
                <th style={{ width: 140 }}>Статус</th>
                <th style={{ width: 160 }}>Срок</th>
                <th style={{ width: 210 }}>Действия</th>
              </tr>
            </thead>
            <tbody>
              {items.map((d) => {
                const overdue =
                  d.due_date && d.status !== "resolved" && new Date(d.due_date) < new Date();
                return (
                  <tr key={d.id} onDoubleClick={() => openDrawer(d)} style={{ cursor: "pointer" }}>
                    <td>
                      <input
                        type="checkbox"
                        checked={checked.has(d.id)}
                        onChange={() => toggleCheck(d.id)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </td>
                    <td className="text-truncate">{d.project_name || d.project || "—"}</td>
                    <td>
                      <div className="fw-semibold">{d.title}</div>
                      {d.description && (
                        <div className="text-muted small text-truncate">{d.description}</div>
                      )}
                    </td>
                    <td>
                      <span className={`badge bg-${PRIORITY_BADGE[d.priority] || "secondary"}`}>
                        {PRIORITY_LABEL[d.priority] || d.priority}
                      </span>
                    </td>
                    <td>
                      <span className={`badge bg-${STATUS_BADGE[d.status] || "secondary"}`}>
                        {STATUS_LABEL[d.status] || d.status}
                      </span>
                    </td>
                    <td className={overdue ? "text-danger fw-semibold" : ""}>
                      {d.due_date || "—"}
                    </td>
                    <td className="d-flex gap-2">
                      <button
                        className="btn btn-sm btn-outline-primary"
                        onClick={(e) => {
                          e.stopPropagation();
                          openEdit(d);
                        }}
                      >
                        Изменить
                      </button>
                      {d.status !== "in_progress" && (
                        <button
                          className="btn btn-sm btn-outline-secondary"
                          onClick={(e) => {
                            e.stopPropagation();
                            quickStatus(d.id, "in_progress");
                          }}
                        >
                          В работу
                        </button>
                      )}
                      {d.status !== "resolved" && (
                        <button
                          className="btn btn-sm btn-outline-success"
                          onClick={(e) => {
                            e.stopPropagation();
                            quickStatus(d.id, "resolved");
                          }}
                        >
                          Закрыть
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {!items.length && (
                <tr>
                  <td colSpan={7} className="text-center text-muted py-4">
                    Ничего не найдено — измените фильтры или добавьте новый дефект
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* пагинация */}
      {pageInfo.count > (items?.length || 0) && (
        <div className="d-flex justify-content-between align-items-center">
          <div className="small text-muted">
            Страница {filters.page} • Всего {pageInfo.count}
          </div>
          <div className="btn-group">
            <button
              className="btn btn-outline-secondary"
              disabled={!pageInfo.previous}
              onClick={() => setFilters((f) => ({ ...f, page: Math.max(1, f.page - 1) }))}
            >
              ← Назад
            </button>
            <button
              className="btn btn-outline-secondary"
              disabled={!pageInfo.next}
              onClick={() => setFilters((f) => ({ ...f, page: f.page + 1 }))}
            >
              Вперёд →
            </button>
          </div>
        </div>
      )}

      {/* МОДАЛКА: создание/редактирование */}
      {modal.open && (
        <div className="modal d-block" tabIndex="-1" onMouseDown={(e) => e.target.classList.contains("modal") && closeModal()}>
          <div className="modal-dialog modal-xl modal-dialog-centered" onMouseDown={(e) => e.stopPropagation()}>
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">{modal.id ? "Редактировать дефект" : "Новый дефект"}</h5>
                <button type="button" className="btn-close" onClick={closeModal} />
              </div>
              <form onSubmit={saveDefect}>
                <div className="modal-body">
                  <div className="row g-3">
                    <div className="col-md-4">
                      <label className="form-label">Проект</label>
                      <select
                        className="form-select"
                        value={form.project}
                        onChange={(e) => setForm((s) => ({ ...s, project: e.target.value }))}
                        required
                      >
                        <option value="">— выберите проект —</option>
                        {projects.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-md-8">
                      <label className="form-label">Название</label>
                      <input
                        className="form-control"
                        value={form.title}
                        onChange={(e) => setForm((s) => ({ ...s, title: e.target.value }))}
                        required
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
                    <div className="col-md-3">
                      <label className="form-label">Приоритет</label>
                      <select
                        className="form-select"
                        value={form.priority}
                        onChange={(e) => setForm((s) => ({ ...s, priority: e.target.value }))}
                      >
                        {Object.entries(PRIORITY_LABEL).map(([v, l]) => (
                          <option key={v} value={v}>
                            {l}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-md-3">
                      <label className="form-label">Статус</label>
                      <select
                        className="form-select"
                        value={form.status}
                        onChange={(e) => setForm((s) => ({ ...s, status: e.target.value }))}
                      >
                        {Object.entries(STATUS_LABEL).map(([v, l]) => (
                          <option key={v} value={v}>
                            {l}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-md-3">
                      <label className="form-label">Срок</label>
                      <input
                        type="date"
                        className="form-control"
                        value={form.due_date || ""}
                        onChange={(e) => setForm((s) => ({ ...s, due_date: e.target.value }))}
                      />
                    </div>
                    <div className="col-md-3">
                      <label className="form-label">Файлы</label>
                      <input
                        type="file"
                        className="form-control mb-2"
                        multiple
                        onChange={(e) => setForm((s) => ({ ...s, files: [...(s.files || []), ...e.target.files] }))}
                      />
                      <div
                        ref={dropRef}
                        className="border rounded p-3 text-center text-muted"
                        style={{ borderStyle: "dashed" }}
                      >
                        Перетащите файлы сюда
                      </div>
                      {!!form.files?.length && (
                        <div className="small text-muted mt-1">
                          Файлов: {form.files.length} — {Array.from(form.files).map((f) => f.name).join(", ")}
                        </div>
                      )}
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

      {/* ПРАВАЯ ПАНЕЛЬ С ДЕТАЛЯМИ */}
      {drawer && (
        <div
          className="position-fixed top-0 end-0 h-100 bg-white shadow"
          style={{ width: 420, zIndex: 1050 }}
        >
          <div className="d-flex align-items-center justify-content-between border-bottom p-3">
            <h6 className="mb-0">Дефект</h6>
            <button className="btn btn-sm btn-outline-secondary" onClick={closeDrawer}>
              Закрыть
            </button>
          </div>

          <div className="p-3" style={{ overflowY: "auto", height: "calc(100% - 56px)" }}>
            <div className="mb-2 text-muted small">{drawer.project_name || drawer.project}</div>
            <div className="fw-semibold">{drawer.title}</div>
            {drawer.description && <div className="mt-2">{drawer.description}</div>}

            <div className="mt-3 d-flex flex-wrap gap-2">
              <span className={`badge bg-${PRIORITY_BADGE[drawer.priority] || "secondary"}`}>
                {PRIORITY_LABEL[drawer.priority] || drawer.priority}
              </span>
              <span className={`badge bg-${STATUS_BADGE[drawer.status] || "secondary"}`}>
                {STATUS_LABEL[drawer.status] || drawer.status}
              </span>
              <span className="badge bg-light text-dark">
                Срок: {drawer.due_date || "—"}
              </span>
            </div>

            {/* вложения */}
            {!!drawer.attachments?.length && (
              <>
                <hr />
                <div className="fw-semibold mb-2">Вложения</div>
                <div className="d-flex flex-wrap gap-2">
                  {drawer.attachments.map((a) => {
                    const isImg = /\.(jpg|jpeg|png|gif|webp)$/i.test(a.filename || a.file || "");
                    return (
                      <a
                        key={a.id}
                        href={a.file}
                        target="_blank"
                        rel="noreferrer"
                        className="text-decoration-none"
                        title={a.filename}
                      >
                        {isImg ? (
                          <img
                            src={a.file}
                            alt={a.filename}
                            width={90}
                            height={90}
                            style={{ objectFit: "cover" }}
                            className="rounded border"
                          />
                        ) : (
                          <div className="border rounded p-2" style={{ width: 90, height: 90 }}>
                            <div className="small">{a.filename}</div>
                          </div>
                        )}
                      </a>
                    );
                  })}
                </div>
              </>
            )}

            {/* комментарии */}
            <hr />
            <div className="fw-semibold mb-2">Комментарии</div>
            {(drawer.comments || []).map((c) => (
              <div key={c.id} className="mb-2">
                <div className="small text-muted">
                  {c.author_name || c.author || "—"}, {new Date(c.created_at).toLocaleString()}
                </div>
                <div>{c.text}</div>
              </div>
            ))}

            <div className="mt-2 d-flex gap-2">
              <input
                className="form-control"
                placeholder="Добавить комментарий…"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
              />
              <button className="btn btn-primary" onClick={addComment}>
                Отправить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
