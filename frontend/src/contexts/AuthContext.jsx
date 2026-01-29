import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { authService } from '../services/authService'

const AuthContext = createContext()

export const useAuth = () => {
    const context = useContext(AuthContext)
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider')
    }
    return context
}

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null)
    const [loading, setLoading] = useState(true)

    const login = useCallback(async (credentials) => {
        try {
            const response = await authService.login(credentials)

            if (response.success) {
                localStorage.setItem('token', response.data.token)
                setUser(response.data.admin)
                return { success: true }
            }
            return { success: false, message: response.message }
        } catch (error) {
            return {
                success: false,
                message: error.response?.data?.message || 'Login failed'
            }
        }
    }, [])

    const logout = useCallback(() => {
        localStorage.removeItem('token')
        setUser(null)
    }, [])

    const checkAuth = useCallback(async () => {
        const token = localStorage.getItem('token')
        if (!token) {
            setLoading(false)
            return
        }

        try {
            const response = await authService.validateToken()
            if (response.success) {
                setUser(response.data.admin)
            } else {
                localStorage.removeItem('token')
                setUser(null)
            }
        } catch (error) {
            localStorage.removeItem('token')
            setUser(null)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        checkAuth()
    }, [checkAuth])

    const value = {
        user,
        login,
        logout,
        loading
    }

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    )
}
