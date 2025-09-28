import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api'
import { showError, showSuccess } from '../ui/toast'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()

  async function submit(e) {
    e.preventDefault()
    setError('')

    const payload = {
      email: email.trim().toLowerCase(),
      password: password.trim(),
    }

    try {
      const { data } = await api.post('/auth/token/', payload)
      // сохраняем токены
      localStorage.setItem('token', data.access)
      if (data.refresh) localStorage.setItem('refresh', data.refresh)

      showSuccess('Успешный вход')
      navigate('/projects')
    } catch (err) {
      const msg =
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        'Неверный e-mail или пароль'
      setError(String(msg))
      showError(String(msg))
      console.error('Login error:', err?.response || err)
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
                <input
                  className="form-control"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="username"
                  required
                />
              </div>

              <div className="mb-3">
                <label className="form-label">Пароль</label>
                <input
                  className="form-control"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
              </div>

              <button className="btn btn-primary w-100" type="submit">
                Войти
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
