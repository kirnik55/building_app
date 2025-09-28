import { useState } from 'react'
import api from '../api'
import { useNavigate } from 'react-router-dom'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()

  async function submit(e) {
    e.preventDefault()
    setError('')
    try {
      const { data } = await api.post('/auth/token/', { email, password })
      localStorage.setItem('token', data.access)
      navigate('/projects')
    } catch {
      setError('Неверный e-mail или пароль')
    }
  }

  return (
    <div className="row justify-content-center">
      <div className="col-md-5">
        <div className="card">
          <div className="card-body">
            <h5 className="card-title mb-3">Вход</h5>
            {error && <div className="alert alert-danger">{error}</div>}
            <form onSubmit={submit}>
              <div className="mb-3">
                <label className="form-label">Email</label>
                <input className="form-control" type="email" value={email}
                  onChange={e=>setEmail(e.target.value)} required />
              </div>
              <div className="mb-3">
                <label className="form-label">Пароль</label>
                <input className="form-control" type="password" value={password}
                  onChange={e=>setPassword(e.target.value)} required />
              </div>
              <button className="btn btn-primary w-100" type="submit">Войти</button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
