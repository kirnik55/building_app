import { useEffect, useState } from 'react'
import api from '../api'

export default function ProjectsPage() {
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    const { data } = await api.get('/projects/')
    setProjects(data.results || data)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  return (
    <>
      <h4 className="mb-3">Проекты</h4>
      {loading && <div>Загрузка…</div>}
      {!loading && (
        <table className="table table-hover">
          <thead><tr><th>Название</th><th>Заказчик</th><th>Описание</th></tr></thead>
          <tbody>
            {projects.map(p => (
              <tr key={p.id}>
                <td>{p.name}</td>
                <td>{p.customer}</td>
                <td>{p.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  )
}
