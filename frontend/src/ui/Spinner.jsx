export default function Spinner({ text = 'Загрузка…' }) {
  return (
    <div className="d-flex align-items-center gap-2 py-3">
      <div className="spinner-border" role="status" aria-hidden="true"></div>
      <span>{text}</span>
    </div>
  )
}
