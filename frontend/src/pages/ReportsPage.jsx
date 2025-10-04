import { useEffect, useMemo, useState } from "react";
import api from "../api";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
} from "chart.js";
import { Doughnut, Bar } from "react-chartjs-2";

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement
);

// Унифицированный способ получить количество элементов
async function getCount(url) {
  const { data } = await api.get(url);
  if (typeof data?.count === "number") return data.count;
  if (Array.isArray(data?.results)) return data.results.length;
  if (Array.isArray(data)) return data.length;
  return 0;
}

export default function ReportsPage() {
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState([]);
  const [perProject, setPerProject] = useState({}); // id -> { total, open, inProgress, resolved, canceled }

  async function loadProjects() {
    let url = "/projects/";
    let acc = [];
    while (url) {
      const { data } = await api.get(url);
      const chunk = data?.results ?? data;
      acc = acc.concat(chunk);
      url = data?.next
        ? data.next.replace(/^https?:\/\/[^/]+\/api/, "")
        : null;
    }
    return acc;
  }

  async function load() {
    setLoading(true);

    const proj = await loadProjects();
    setProjects(proj);

    const matrix = {};

    for (const p of proj) {
      const id = p.id;
      const [total, resolved, inProgress, canceled] = await Promise.all([
        getCount(`/defects/?project=${id}`),
        getCount(`/defects/resolved/?project=${id}`),
        getCount(`/defects/?project=${id}&status=in_progress`),
        getCount(`/defects/?project=${id}&status=canceled`).catch(() => 0),
      ]);

      const open = Math.max(total - resolved - canceled, 0);

      matrix[id] = { total, resolved, inProgress, canceled, open };
    }

    setPerProject(matrix);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  // KPI
  const kpi = useMemo(() => {
    let total = 0,
      resolved = 0,
      inProgress = 0,
      canceled = 0,
      open = 0;

    for (const id of Object.keys(perProject)) {
      const row = perProject[id];
      total += row.total;
      resolved += row.resolved;
      inProgress += row.inProgress;
      canceled += row.canceled;
      open += row.open;
    }
    const resolvedRate = total ? Math.round((resolved / total) * 100) : 0;
    return { total, resolved, inProgress, canceled, open, resolvedRate };
  }, [perProject]);

  // Donut
  const doughnutData = useMemo(() => {
    if (!Object.keys(perProject).length) return null;
    return {
      labels: ["Открытые", "В работе", "Закрытые", "Отменено"],
      datasets: [
        {
          data: [kpi.open, kpi.inProgress, kpi.resolved, kpi.canceled],
          backgroundColor: ["#0d6efd66", "#ffc10799", "#198754cc", "#6c757d99"],
          borderColor: ["#0d6efd", "#ffc107", "#198754", "#6c757d"],
          borderWidth: 1,
        },
      ],
    };
  }, [kpi, perProject]);

  // Bar
  const barData = useMemo(() => {
    if (!projects.length) return null;
    const labels = projects.map((p) => p.name);
    const openValues = projects.map((p) => perProject[p.id]?.open ?? 0);
    const resolvedValues = projects.map((p) => perProject[p.id]?.resolved ?? 0);

    return {
      labels,
      datasets: [
        {
          label: "Открытые",
          data: openValues,
          backgroundColor: "#0d6efd66",
          borderColor: "#0d6efd",
          borderWidth: 1,
        },
        {
          label: "Закрытые",
          data: resolvedValues,
          backgroundColor: "#19875466",
          borderColor: "#198754",
          borderWidth: 1,
        },
      ],
    };
  }, [projects, perProject]);

  return (
    <div className="container-fluid px-0">
      <div className="d-flex align-items-center justify-content-between mb-3">
        <h4 className="mb-0">Отчёт и статистика</h4>
        <button className="btn btn-outline-secondary" onClick={load} disabled={loading}>
          Обновить
        </button>
      </div>

      {/* KPI */}
      <div className="row g-3 mb-3">
        <div className="col-md-3">
          <div className="card h-100 shadow-sm">
            <div className="card-body">
              <div className="text-muted">Всего дефектов</div>
              <div className="display-6 fw-semibold">{kpi.total}</div>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card h-100 shadow-sm">
            <div className="card-body">
              <div className="text-muted">В работе</div>
              <div className="display-6 fw-semibold">{kpi.inProgress}</div>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card h-100 shadow-sm">
            <div className="card-body">
              <div className="text-muted">Закрыто</div>
              <div className="display-6 fw-semibold">{kpi.resolved}</div>
              <div className="small text-success mt-1">
                Уровень закрытия: <b>{kpi.resolvedRate}%</b>
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card h-100 shadow-sm">
            <div className="card-body">
              <div className="text-muted">Открыто сейчас</div>
              <div className="display-6 fw-semibold">{kpi.open}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Графики */}
      <div className="row g-3">
        <div className="col-xl-4">
          <div className="card h-100 shadow-sm">
            <div className="card-header bg-white fw-semibold">Структура дефектов</div>
            <div className="card-body">
              {loading ? (
                <div>Загрузка…</div>
              ) : doughnutData ? (
                <Doughnut data={doughnutData} />
              ) : (
                <div className="text-muted">Недостаточно данных</div>
              )}
            </div>
          </div>
        </div>

        <div className="col-xl-8">
          <div className="card h-100 shadow-sm">
            <div className="card-header bg-white fw-semibold">По проектам: открытые / закрытые</div>
            <div className="card-body" style={{ height: 360 }}>
              {loading ? (
                <div>Загрузка…</div>
              ) : barData ? (
                <Bar
                  data={barData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { position: "top" } },
                    scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
                  }}
                />
              ) : (
                <div className="text-muted">Недостаточно данных</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Таблица-детализация */}
      <div className="card shadow-sm mt-3">
        <div className="card-header bg-white fw-semibold">Детализация по проектам</div>
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead>
              <tr>
                <th>Проект</th>
                <th className="text-center">Всего</th>
                <th className="text-center">Открытые</th>
                <th className="text-center">В работе</th>
                <th className="text-center">Закрытые</th>
                <th className="text-center">Отменено</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((p) => {
                const row = perProject[p.id] || {};
                return (
                  <tr key={p.id}>
                    <td className="fw-semibold">{p.name}</td>
                    <td className="text-center">{row.total ?? "—"}</td>
                    <td className="text-center">{row.open ?? "—"}</td>
                    <td className="text-center">{row.inProgress ?? "—"}</td>
                    <td className="text-center">{row.resolved ?? "—"}</td>
                    <td className="text-center">{row.canceled ?? 0}</td>
                  </tr>
                );
              })}
              {!projects.length && (
                <tr>
                  <td colSpan={6} className="text-center text-muted py-4">
                    Нет данных
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
