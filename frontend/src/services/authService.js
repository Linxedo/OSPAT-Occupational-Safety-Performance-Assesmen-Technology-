import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

const api = axios.create({
    baseURL: `${API_BASE_URL}/api`,
})

api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token')
    if (token) {
        config.headers.Authorization = `Bearer ${token}`
    }
    return config
})

api.interceptors.response.use(
    (response) => {
        return response
    },
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('token')
            window.location.href = '/login'
        }
        return Promise.reject(error)
    }
)

export const authService = {
    login: async (credentials) => {
        try {
            const response = await api.post('/auth/login', credentials)
            return response.data
        } catch (error) {
            throw error
        }
    },

    validateToken: async () => {
        try {
            const response = await api.get('/auth/validate')
            return response.data
        } catch (error) {
            throw error
        }
    }
}

export default api
