// frontend/src/components/AssignEngineerModal.jsx
import { useEffect, useState } from "react";
import api from "../api";

export default function AssignEngineerModal({ defect, show, onClose, onAssigned }) {
  const [engineers, setEngineers] = useState([]);
  const [selected, setSelected] = useState("");
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");
  const [error, setError] = useState("");

  // подгрузка инженеров (с поиском)
  useEffect(() => {
    if (!show) return;

    let cancelled = false;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const { data } = await api.get("/auth/users/", {
          params: { role: "engineer", search: q || undefined },
        });
        if (!cancelled) {
          const list = data.results || data;
          setEngineers(list);
          // если в дефекте уже есть назначенный инженер — подсветим
          setSelected(defect?.assignee || "");
        }
      } catch (e) {
        if (!cancelled) setError("Не удалось загрузить список инженеров");
        // опционально: console.error(e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show, q, defect?.assignee]);

  // сохранить назначение
  async function save() {
    if (!selected || !defect?.id) return;
    try {
      await api.patch(`/defects/${defect.id}/assign/`, { assignee: selected });
      onAssigned?.(selected);
      onClose?.();
    } catch (e) {
      setError("Не удалось назначить инженера");
      // опционально: console.error(e);
    }
  }

  // закрытие по клику вне окна
  function closeBackdrop(e) {
    if (e.target === e.currentTarget) onClose?.();
  }

  if (!show) return null;

  return (
    <div className="modal d-block" tabIndex="-1" role="dialog" onClick={closeBackdrop}>
      <div className="modal-dialog" role="document" onClick={(e) => e.stopPropagation()}>
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Назначение инженера</h5>
            <button type="button" className="btn-close" onClick={onClose} aria-label="Закрыть" />
          </div>

          <div className="modal-body">
            <div className="mb-2 small text-muted">
              Дефект: <b>#{defect?.id}</b> — {defect?.title}
            </div>

            <div className="mb-3">
              <label className="form-label">Поиск инженера</label>
              <input
                className="form-control"
                placeholder="Начните вводить e-mail или ФИО…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>

            <div className="mb-3">
              <label className="form-label">Инженер</label>
              <select
                className="form-select"
                value={selected}
                disabled={loading || engineers.length === 0}
                onChange={(e) => setSelected(e.target.value)}
              >
                <option value="">— выберите инженера —</option>
                {engineers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.full_name || u.name || u.email}
                  </option>
                ))}
              </select>
              {loading && <div className="form-text">Загрузка…</div>}
              {!loading && engineers.length === 0 && (
                <div className="form-text text-muted">Ничего не найдено</div>
              )}
            </div>

            {error && <div className="alert alert-danger py-2">{error}</div>}
          </div>

          <div className="modal-footer">
            <button className="btn btn-secondary" onClick={onClose}>
              Отмена
            </button>
            <button className="btn btn-primary" onClick={save} disabled={!selected || loading}>
              Сохранить
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
