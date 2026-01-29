import { useQuery, useQueryClient } from 'react-query'
import { Container, Row, Col, Card, Spinner, Alert, Button } from 'react-bootstrap'
import { useNavigate } from 'react-router-dom'
import { adminService } from '../services/adminService'
import '../styles/dashboard.css'

const Dashboard = () => {
    const navigate = useNavigate()
    const queryClient = useQueryClient()

    const { data, isLoading, error } = useQuery('dashboard', adminService.getDashboard, {
        retry: 2,
        retryDelay: 1000,
        refetchOnWindowFocus: false
    })

    const handleRefresh = () => {
        queryClient.invalidateQueries('dashboard')
    }

    const formatTimeAgo = (timestamp) => {
        if (!timestamp) return 'Recently'

        try {
            const now = new Date()
            const past = new Date(timestamp)
            const diffMs = now - past
            const diffMins = Math.floor(diffMs / 60000)
            const diffHours = Math.floor(diffMs / 3600000)
            const diffDays = Math.floor(diffMs / 86400000)

            if (diffMins < 1) return 'Just now'
            if (diffMins < 60) return `${diffMins} min ago`
            if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
            return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
        } catch (e) {
            return 'Recently'
        }
    }

    const formatFullDate = (timestamp) => {
        if (!timestamp) return ''
        return new Date(timestamp).toLocaleString()
    }

    if (isLoading) {
        return (
            <Container className="d-flex justify-content-center align-items-center" style={{ height: '60vh' }}>
                <Spinner animation="border" variant="primary" />
            </Container>
        )
    }

    if (error) {
        return (
            <Container>
                <Alert variant="danger">
                    <Alert.Heading>Dashboard Error</Alert.Heading>
                    <p>Unable to load dashboard data. Please check:</p>
                    <ul>
                        <li>Backend server is running on port 5000</li>
                        <li>You are logged in with valid credentials</li>
                        <li>Database connection is active</li>
                    </ul>
                    <hr />
                    <p className="mb-0">
                        <strong>Error details:</strong> {error.message}
                    </p>
                    <div className="mt-3">
                        <Button variant="primary" onClick={() => window.location.reload()}>
                            Reload Page
                        </Button>
                        <Button variant="outline-secondary" className="ms-2" onClick={() => navigate('/login')}>
                            Go to Login
                        </Button>
                    </div>
                </Alert>
            </Container>
        )
    }

    const dashboardData = data?.data || {}

    return (
        <Container fluid>
            <div className="d-flex justify-content-between align-items-center mb-4 fade-in">
                <div>
                    <h2 className="mb-0 fw-bold" style={{ color: 'var(--text-primary)' }}>ADMIN DASHBOARD</h2>
                    <p className="text-muted mb-0" style={{ color: 'var(--text-muted)' }}>
                        Welcome back! Here's what's happening with the system today.
                    </p>
                </div>
                <div className="text-end">
                    <small className="text-muted" style={{ color: 'var(--text-muted)' }}>Last updated</small>
                    <div className="fw-bold" style={{ color: 'var(--text-primary)' }}>
                        {new Date().toLocaleString()}
                    </div>
                </div>
            </div>

            <Row className="g-4">
                <Col lg={4} md={6} className="mb-4">
                    <Card className="border-0 shadow-sm h-100 hover-lift stat-card-modern" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-primary)' }}>
                        <Card.Body className="p-4 text-center">
                            <div className="stat-number-wrapper mb-3">
                                <h2 className="stat-number mb-0 fw-bold" style={{ color: 'var(--accent-primary)', fontSize: '2.5rem' }}>
                                    {dashboardData.totalUsers || 0}
                                </h2>
                            </div>
                            <div className="stat-label">
                                <h6 className="mb-0 fw-semibold" style={{ color: 'var(--text-primary)' }}>Total Users</h6>
                                <small className="text-muted" style={{ color: 'var(--text-muted)' }}>Registered users</small>
                            </div>
                        </Card.Body>
                    </Card>
                </Col>

                <Col lg={4} md={6} className="mb-4">
                    <Card className="border-0 shadow-sm h-100 hover-lift stat-card-modern" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-primary)' }}>
                        <Card.Body className="p-4 text-center">
                            <div className="stat-number-wrapper mb-3">
                                <h2 className="stat-number mb-0 fw-bold" style={{ color: 'var(--success)', fontSize: '2.5rem' }}>
                                    {dashboardData.totalTestResults || 0}
                                </h2>
                            </div>
                            <div className="stat-label">
                                <h6 className="mb-0 fw-semibold" style={{ color: 'var(--text-primary)' }}>Test Conducted</h6>
                                <small className="text-muted" style={{ color: 'var(--text-muted)' }}>Completed tests</small>
                            </div>
                        </Card.Body>
                    </Card>
                </Col>

                <Col lg={4} md={6} className="mb-4">
                    <Card className="border-0 shadow-sm h-100 hover-lift stat-card-modern" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-primary)' }}>
                        <Card.Body className="p-4 text-center">
                            <div className="stat-number-wrapper mb-3">
                                <h2 className="stat-number mb-0 fw-bold" style={{ color: 'var(--warning)', fontSize: '2.5rem' }}>
                                    {dashboardData.totalQuestions || 0}
                                </h2>
                            </div>
                            <div className="stat-label">
                                <h6 className="mb-0 fw-semibold" style={{ color: 'var(--text-primary)' }}>Active Questions</h6>
                                <small className="text-muted" style={{ color: 'var(--text-muted)' }}>Available questions</small>
                            </div>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            <Row>
                <Col lg={8} className="mb-4">
                    <Card className="border-0 shadow-sm fade-in" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-primary)' }}>
                        <Card.Header className="bg-transparent border-0 py-3">
                            <div className="d-flex justify-content-between align-items-center">
                                <h5 className="mb-0 fw-bold" style={{ color: 'var(--text-primary)' }}>
                                    <i className="bi bi-activity me-2" style={{ color: 'var(--accent-primary)' }}></i>
                                    Recent Activity
                                </h5>
                                <div className="d-flex align-items-center gap-2">
                                    <small className="badge bg-primary bg-opacity-10 text-primary px-2 py-1">
                                        {(dashboardData.recentUsers?.length || 0) + (dashboardData.recentActivities?.length || 0)} items
                                    </small>
                                    <Button
                                        variant="outline-secondary"
                                        size="sm"
                                        onClick={handleRefresh}
                                        title="Refresh recent activity"
                                        style={{
                                            backgroundColor: 'var(--bg-tertiary)',
                                            borderColor: 'var(--border-secondary)',
                                            color: 'var(--text-primary)'
                                        }}
                                    >
                                        <i className="bi bi-arrow-clockwise"></i>
                                    </Button>
                                </div>
                            </div>
                        </Card.Header>
                        <Card.Body className="p-0">
                            <div className="activity-timeline">
                                {/* Recent Activities */}
                                {dashboardData.recentActivities && dashboardData.recentActivities.length > 0 && (
                                    dashboardData.recentActivities.map((activity, index) => (
                                        <div key={`activity-${index}`} className="activity-item">
                                            <div className={`activity-indicator ${activity.activity_type === 'user_created' ? 'success' :
                                                activity.activity_type === 'user_deleted' ? 'danger' :
                                                    activity.activity_type === 'setting_updated' ? 'warning' :
                                                        'primary'
                                                }`}>
                                                <i className={`bi ${activity.activity_type === 'user_created' ? 'bi-person-plus' :
                                                    activity.activity_type === 'user_deleted' ? 'bi-person-dash' :
                                                        activity.activity_type === 'setting_updated' ? 'bi-gear' :
                                                            activity.activity_type.startsWith('question_') ? 'bi-question-circle' :
                                                                'bi-activity'
                                                    }`}></i>
                                            </div>
                                            <div className="activity-content">
                                                <div className="activity-header">
                                                    <span className="activity-title">
                                                        {activity.activity_type === 'user_created' ? 'New User Registered' :
                                                            activity.activity_type === 'user_deleted' ? 'User Deleted' :
                                                                activity.activity_type === 'setting_updated' ? 'Setting Updated' :
                                                                    activity.activity_type === 'question_created' ? 'New Question Added' :
                                                                        activity.activity_type === 'question_updated' ? 'Question Updated' :
                                                                            activity.activity_type === 'question_deleted' ? 'Question Removed' :
                                                                                'System Activity'}
                                                    </span>
                                                    <span className="activity-time" title={formatFullDate(activity.timestamp)}>
                                                        {formatTimeAgo(activity.timestamp)}
                                                    </span>
                                                </div>
                                                <div className="activity-description">
                                                    {activity.description}
                                                    {activity.admin_name && (
                                                        <span className="d-block mt-1 text-muted small">
                                                            <i className="bi bi-person-fill me-1"></i>
                                                            by {activity.admin_name}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}

                                {/* Empty State */}
                                {(!dashboardData.recentUsers || dashboardData.recentUsers.length === 0) &&
                                    (!dashboardData.recentActivities || dashboardData.recentActivities.length === 0) && (
                                        <div className="empty-state text-center py-5">
                                            <div className="empty-icon mb-3">
                                                <i className="bi bi-inbox" style={{ fontSize: '3rem', color: 'var(--text-muted)' }}></i>
                                            </div>
                                            <h6 className="text-muted">No Recent Activity</h6>
                                            <small className="text-muted">Activity will appear here when users are added, deleted, or settings are changed</small>
                                        </div>
                                    )}
                            </div>
                        </Card.Body>
                    </Card>
                </Col>

                <Col lg={4} className="mb-4">
                    <Card className="border-0 shadow-sm fade-in" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-primary)' }}>
                        <Card.Header className="bg-transparent border-0 py-3">
                            <h5 className="mb-0 fw-bold" style={{ color: 'var(--text-primary)' }}>Quick Actions</h5>
                        </Card.Header>
                        <Card.Body>
                            <div className="quick-actions-grid">
                                <Button
                                    variant="outline-primary"
                                    className="hover-lift"
                                    onClick={() => navigate('/users')}
                                >
                                    <i className="bi bi-person-plus me-2"></i>
                                    Add New User
                                </Button>
                                <Button
                                    variant="outline-success"
                                    className="hover-lift"
                                    onClick={() => navigate('/settings')}
                                >
                                    <i className="bi bi-file-earmark-plus me-2"></i>
                                    Create Question
                                </Button>
                                <Button
                                    variant="outline-info"
                                    className="hover-lift"
                                    onClick={() => navigate('/settings')}
                                >
                                    <i className="bi bi-gear me-2"></i>
                                    System Settings
                                </Button>
                                <Button
                                    variant="outline-warning"
                                    className="hover-lift"
                                    onClick={() => navigate('/history')}
                                >
                                    <i className="bi bi-download me-2"></i>
                                    View History
                                </Button>
                            </div>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>
        </Container>
    )
}

export default Dashboard
