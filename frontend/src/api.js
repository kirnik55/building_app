import axios from 'axios'
import { API_URL } from './config'
import { showError } from './ui/toast'

let isRefreshing = false
let failedQueue = []

const processQueue = (error, token = null) => {
  failedQueue.forEach(p => (token ? p.resolve(token) : p.reject(error)))
  failedQueue = []
}

const api = axios.create({ baseURL: API_URL })

// добавляем access токен
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// перехватываем ответы
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config
    const status = error?.response?.status

    // если 401 — пробуем обновить access токен
    if (status === 401 && !original._retry) {
      original._retry = true

      if (isRefreshing) {
        // ждём, пока другой запрос обновит токен
        return new Promise(function(resolve, reject) {
          failedQueue.push({
            resolve: (token) => {
              original.headers.Authorization = `Bearer ${token}`
              resolve(api(original))
            },
            reject: (err) => reject(err)
          })
        })
      }

      isRefreshing = true
      const refresh = localStorage.getItem('refresh')

      if (!refresh) {
        // нет refresh — выходим из аккаунта
        localStorage.removeItem('token')
        window.location.href = '/login'
        isRefreshing = false
        return Promise.reject(error)
      }

      try {
        const { data } = await axios.post(`${API_URL}/auth/token/refresh/`, { refresh })
        const newAccess = data.access
        localStorage.setItem('token', newAccess)
        processQueue(null, newAccess)
        original.headers.Authorization = `Bearer ${newAccess}`
        return api(original)
      } catch (err) {
        processQueue(err, null)
        localStorage.removeItem('token')
        localStorage.removeItem('refresh')
        window.location.href = '/login'
        return Promise.reject(err)
      } finally {
        isRefreshing = false
      }
    }

    // показываем ошибку человеку (кроме 401, которую мы обработали)
    const msg = error?.response?.data?.detail
      || error?.response?.data?.message
      || error?.message
      || 'Ошибка запроса'
    showError(msg)
    return Promise.reject(error)
  }
)

export default api
