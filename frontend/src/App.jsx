import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import { Container, Spinner } from 'react-bootstrap'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Users from './pages/Users'
import Settings from './pages/Settings'
import History from './pages/History'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'

function App() {
    const { user, loading } = useAuth()

    if (loading) {
        return (
            <Container className="d-flex justify-content-center align-items-center" style={{ height: '100vh' }}>
                <Spinner animation="border" />
            </Container>
        )
    }

    return (
        <Routes>
            <Route
                path="/login"
                element={!user ? <Login /> : <Navigate to="/dashboard" />}
            />
            <Route path="/" element={<Layout />}>
                <Route index element={<Navigate to="/dashboard" />} />
                <Route
                    path="dashboard"
                    element={
                        <ProtectedRoute>
                            <Dashboard />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="users"
                    element={
                        <ProtectedRoute>
                            <Users />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="settings"
                    element={
                        <ProtectedRoute>
                            <Settings />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="history"
                    element={
                        <ProtectedRoute>
                            <History />
                        </ProtectedRoute>
                    }
                />
            </Route>
            <Route path="*" element={<Navigate to="/dashboard" />} />
        </Routes>
    )
}

export default App
