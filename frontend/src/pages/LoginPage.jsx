import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export default function LoginPage() {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");

  const { login, role } = useAuth();
  const navigate = useNavigate();

  async function submit(e) {
    e.preventDefault();
    setError("");
    try {
      await login(email.trim().toLowerCase(), password.trim());
      // редирект по роли
      if (["manager","lead","admin"].includes(role)) {
        navigate("/projects", { replace: true });
      } else {
        navigate("/defects", { replace: true });
      }
    } catch (err) {
      setError("Неверный e-mail или пароль");
      console.error(err);
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
                <input className="form-control" type="email"
                       value={email} onChange={e=>setEmail(e.target.value)}
                       autoComplete="username" required />
              </div>
              <div className="mb-3">
                <label className="form-label">Пароль</label>
                <input className="form-control" type="password"
                       value={password} onChange={e=>setPassword(e.target.value)}
                       autoComplete="current-password" required />
              </div>
              <button className="btn btn-primary w-100" type="submit">Войти</button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
