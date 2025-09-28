import { useEffect, useState } from 'react'
import api from '../api'

const STATUS = [
  ['','Статус: все'], ['new','Новая'], ['in_progress','В работе'],
  ['verify','На проверке'], ['resolved','Закрыта'], ['canceled','Отменена']
]
const PRIORITY_BADGE = { low:'secondary', medium:'primary', high:'warning', critical:'danger' }

export default function DefectsPage() {
  const [items, setItems] = useState([])
  const [filters, setFilters] = useState({ status: '', priority: '' })
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    const qs = new URLSearchParams()
    if (filters.status)   qs.set('status', filters.status)
    if (filters.priority) qs.set('priority', filters.priority)
    const { data } = await api.get(`/defects/?${qs.toString()}`)
    setItems(data.results || data)
    setLoading(false)
  }

  useEffect(() => { load() }, [filters])

  return (
    <>
      <h4 className="mb-3">Дефекты</h4>

      <div className="row g-2 mb-3">
        <div className="col-md-3">
          <select className="form-select" value={filters.status}
                  onChange={e=>setFilters(f=>({...f, status:e.target.value}))}>
            {STATUS.map(([v,l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        <div className="col-md-3">
          <select className="form-select" value={filters.priority}
                  onChange={e=>setFilters(f=>({...f, priority:e.target.value}))}>
            <option value="">Приоритет: все</option>
            <option value="low">Низкий</option>
            <option value="medium">Средний</option>
            <option value="high">Высокий</option>
            <option value="critical">Критический</option>
          </select>
        </div>
        <div className="col-md-2">
          <button className="btn btn-outline-secondary w-100" onClick={load}>Обновить</button>
        </div>
      </div>

      {loading && <div>Загрузка…</div>}
      {!loading && (
        <table className="table table-hover align-middle">
          <thead>
            <tr>
              <th>Проект</th>
              <th>Название</th>
              <th>Приоритет</th>
              <th>Статус</th>
              <th>Создан</th>
            </tr>
          </thead>
          <tbody>
            {items.map(d => (
              <tr key={d.id}>
                <td>{d.project}</td>
                <td>{d.title}</td>
                <td><span className={`badge bg-${PRIORITY_BADGE[d.priority]||'secondary'}`}>{d.priority}</span></td>
                <td>{d.status}</td>
                <td>{new Date(d.created_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  )
}
