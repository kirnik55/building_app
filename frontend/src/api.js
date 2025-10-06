import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:8000/api", // без завершающего слеша
});

// Подставляем Bearer токен
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// На 401 просто чистим токены и НЕ делаем никаких повторных запросов
let alreadyHandled401 = false;
api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err?.response?.status === 401 && !alreadyHandled401) {
      alreadyHandled401 = true;
      localStorage.removeItem("token");
      localStorage.removeItem("refresh");
      // Не редиректим тут, чтобы не зациклиться. Пользователь сам попадет на /login
      // через ProtectedRoute или руками.
      setTimeout(() => { alreadyHandled401 = false; }, 500);
    }
    return Promise.reject(err);
  }
);

export default api;
