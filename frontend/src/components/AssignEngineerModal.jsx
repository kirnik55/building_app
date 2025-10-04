import { useEffect, useState } from "react";
import api from "../api";

export default function AssignEngineerModal({ defect, show, onClose, onAssigned }) {
  const [engineers, setEngineers] = useState([]);
  const [selected, setSelected] = useState("");

  useEffect(() => {
    if (!show) return;
    (async () => {
      const { data } = await api.get("/users/?role=engineer");
      const list = data.results || data;
      setEngineers(list);
      setSelected(defect?.assignee || "");
    })();
  }, [show, defect]);

  async function save() {
    if (!selected) return;
    await api.patch(`/defects/${defect.id}/assign/`, { assignee: selected });
    onAssigned?.(selected);
    onClose?.();
  }

  if (!show) return null;

  return (
    <div className="modal d-block" tabIndex="-1" role="dialog" onClick={onClose}>
      <div className="modal-dialog" role="document" onClick={(e) => e.stopPropagation()}>
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Назначение инженера</h5>
            <button type="button" className="btn-close" onClick={onClose}/>
          </div>
          <div className="modal-body">
            <div className="mb-3">
              <label className="form-label">Инженер</label>
              <select className="form-select" value={selected} onChange={(e) => setSelected(e.target.value)}>
                <option value="">— выберите инженера —</option>
                {engineers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.full_name || u.email}
                  </option>
                ))}
              </select>
            </div>
            <div className="small text-muted">
              Дефект: <b>#{defect?.id}</b> — {defect?.title}
            </div>
          </div>
          <div className="modal-footer">
            <button className="btn btn-secondary" onClick={onClose}>Отмена</button>
            <button className="btn btn-primary" onClick={save} disabled={!selected}>Сохранить</button>
          </div>
        </div>
      </div>
    </div>
  );
}
