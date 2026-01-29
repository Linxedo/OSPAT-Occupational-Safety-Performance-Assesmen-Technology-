import api from './authService'

export const adminService = {
    getDashboard: async () => {
        const response = await api.get('/admin/dashboard')
        return response.data
    },

    getUsers: async (page = 1, search = '') => {
        const url = search ? `/admin/users?page=${page}&search=${encodeURIComponent(search)}` : `/admin/users?page=${page}`
        const response = await api.get(url)
        return response.data
    },

    createUser: async (userData) => {
        const response = await api.post('/admin/users', userData)
        return response.data
    },

    updateUser: async (id, data) => {
        const response = await api.put(`/admin/users/${id}`, data)
        return response.data
    },

    deleteUser: async (id) => {
        const response = await api.delete(`/admin/users/${id}`)
        return response.data
    },

    syncUsers: async () => {
        const response = await api.post('/admin/users/sync-users')
        return response.data
    },

    // Settings
    getSettings: async () => {
        const response = await api.get('/admin/settings')
        return response.data
    },

    updateSettings: async (data) => {
        try {
            const response = await api.post('/admin/settings', data)
            return response.data
        } catch (error) {
            throw error
        }
    },

    // Questions
    getQuestions: async () => {
        const response = await api.get('/admin/questions')
        return response.data
    },

    createQuestion: async (data) => {
        const response = await api.post('/admin/questions', data)
        return response.data
    },

    updateQuestion: async (id, data) => {
        const response = await api.put(`/admin/questions/${id}`, data)
        return response.data
    },

    deleteQuestion: async (id) => {
        const response = await api.delete(`/admin/questions/${id}`)
        return response.data
    },

    // History
    getHistory: async (page = 1, search = '', date = '') => {
        const params = new URLSearchParams({ page: page.toString() })
        if (search) params.append('search', search)
        if (date) params.append('date', date)

        const response = await api.get(`/admin/history?${params.toString()}`)
        return response.data
    },

    // User Answers
    getUserAnswers: async (resultId) => {
        const response = await api.get(`/admin/user_answers/${resultId}`)
        return response.data
    }
}
