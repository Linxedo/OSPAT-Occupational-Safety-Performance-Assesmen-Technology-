import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom'
import { Container, Button } from 'react-bootstrap'
import { useAuth } from '../contexts/AuthContext'
import { useState } from 'react'

const Layout = () => {
    const { user, logout } = useAuth()
    const navigate = useNavigate()
    const location = useLocation()
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

    const handleLogout = () => {
        logout()
        navigate('/login')
    }

    const isActive = (path) => location.pathname === path

    const menuItems = [
        { path: '/dashboard', icon: 'bi-grid-1x2-fill', label: 'Dashboard' },
        { path: '/users', icon: 'bi-person-lines-fill', label: 'Users' },
        { path: '/settings', icon: 'bi-sliders', label: 'Settings' },
        { path: '/history', icon: 'bi-journal-text', label: 'History' }
    ]

    return (
        <div className="app-wrapper">
            {/* Sidebar */}
            <div className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
                <div className="sidebar-header">
                    <div className="d-flex align-items-center justify-content-center">
                        <img
                            src="/logo_sma.png"
                            alt="STEVE Logo"
                            style={{
                                width: sidebarCollapsed ? '80px' : '95px',
                                height: 'auto',
                                maxHeight: sidebarCollapsed ? '80px' : '95px',
                                objectFit: 'contain',
                                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))'
                            }}
                        />
                    </div>
                    {!sidebarCollapsed && (
                        <div className="sidebar-brand text-center mt-3">
                            <h5 className="mb-1 fw-bold" style={{
                                color: 'var(--text-primary)',
                                fontSize: '1.1rem',
                                letterSpacing: '0.5px'
                            }}>
                                S.T.E.V.E
                            </h5>
                            <small className="text-muted" style={{
                                fontSize: '0.75rem',
                                textTransform: 'uppercase',
                                letterSpacing: '1px'
                            }}>
                                Admin Panel
                            </small>
                        </div>
                    )}
                </div>

                <nav className="sidebar-nav">
                    {menuItems.map((item) => (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={`sidebar-nav-item ${isActive(item.path) ? 'active' : ''}`}
                        >
                            <span className="sidebar-icon">
                                <i className={`bi ${item.icon}`}></i>
                            </span>
                            {!sidebarCollapsed && (
                                <span className="sidebar-text">{item.label}</span>
                            )}
                        </Link>
                    ))}
                </nav>

                <div className="sidebar-footer">
                    <div className="d-flex align-items-center">
                        <div className="user-avatar">
                            <span>{user?.name?.charAt(0)?.toUpperCase() || 'A'}</span>
                        </div>
                        {!sidebarCollapsed && (
                            <div className="user-info">
                                <div className="user-name">{user?.name || 'Admin'}</div>
                                <small className="user-role">{user?.role || 'Administrator'}</small>
                            </div>
                        )}
                        <Button
                            variant="link"
                            className="logout-btn"
                            onClick={handleLogout}
                            title="Logout"
                        >
                            <i className="bi bi-box-arrow-right"></i>
                        </Button>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="main-content">
                {/* Header */}
                <header className="header">
                    <Container fluid>
                        <div className="header-content">
                            <div className="d-flex align-items-center">
                                <Button
                                    variant="light"
                                    className="sidebar-toggle me-3"
                                    onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                                >
                                    ☰
                                </Button>
                                <div>
                                    <h4 className="header-title">
                                        {location.pathname === '/dashboard' && 'Dashboard'}
                                        {location.pathname === '/users' && 'User Management'}
                                        {location.pathname === '/settings' && 'Settings'}
                                        {location.pathname === '/history' && 'Test History'}
                                    </h4>
                                    <small className="header-subtitle">Welcome back, {user?.name || 'Admin'}!</small>
                                </div>
                            </div>
                            <div className="header-right">
                                <div className="last-login">
                                    <div className="text-muted small">Last login</div>
                                    <div className="fw-bold">{new Date().toLocaleDateString()}</div>
                                </div>
                            </div>
                        </div>
                    </Container>
                </header>

                {/* Page Content */}
                <main className="page-content">
                    <Outlet />
                </main>
            </div>
        </div>
    )
}

export default Layout
