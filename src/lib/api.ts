import axios from 'axios'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api',
  withCredentials: true, // sends/receives the httpOnly refresh-token cookie
})

// Access token is held in memory only (never localStorage) — a module-level
// variable is enough since AuthContext is the only thing that sets it.
let accessToken: string | null = null

export function setAccessToken(token: string | null) {
  accessToken = token
}

api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`
  }
  return config
})

// If a request 401s (expired access token), try one silent refresh, then
// retry the original request once.
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config

    // Never try to "refresh" a failed refresh call — that's what's looping.
    const isRefreshCall = original?.url?.includes('/auth/refresh-token')

    if (error.response?.status === 401 && !original._retry && !isRefreshCall) {
      original._retry = true
      try {
        const { data } = await api.post('/auth/refresh-token')
        setAccessToken(data.data.accessToken)
        original.headers.Authorization = `Bearer ${data.data.accessToken}`
        return api(original)
      } catch {
        setAccessToken(null)
      }
    }
    return Promise.reject(error)
  }
)