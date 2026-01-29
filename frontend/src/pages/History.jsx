import { useState, useEffect } from 'react'
import { useQuery } from 'react-query'
import { Container, Card, Table, Spinner, Alert, Badge, Button, Row, Col, Form, Modal } from 'react-bootstrap'
import { adminService } from '../services/adminService'

const History = () => {
    console.log('History component rendering...')

    const [searchTerm, setSearchTerm] = useState('')
    const [selectedDate, setSelectedDate] = useState('')
    const [filteredResults, setFilteredResults] = useState([])
    const [showAnswersModal, setShowAnswersModal] = useState(false)
    const [selectedResult, setSelectedResult] = useState(null)
    const [userAnswers, setUserAnswers] = useState([])
    const [loadingAnswers, setLoadingAnswers] = useState(false)
    const [showScoreModal, setShowScoreModal] = useState(false)
    const [selectedScoreResult, setSelectedScoreResult] = useState(null)
    const [currentPage, setCurrentPage] = useState(1)
    const [pagination, setPagination] = useState(null)

    const { data, isLoading, error } = useQuery(['history', currentPage, searchTerm, selectedDate], () => adminService.getHistory(currentPage, searchTerm, selectedDate), {
        retry: 2,
        retryDelay: 1000,
        refetchOnWindowFocus: false,
        keepPreviousData: true, // Provides smoother UX while searching
        onSuccess: (data) => {
            console.log('History data loaded:', data);
            setPagination(data.pagination);
        },
        onError: (error) => {
            console.log('History error:', error);
        }
    })

    const { data: settingsData } = useQuery('settings', adminService.getSettings, {
        refetchOnWindowFocus: false
    })

    // Backend handles search and date filtering, so use data directly
    const testResults = data?.data || []
    const settings = settingsData?.data || {}
    const minimumPassingScore = settings.minimum_passing_score || 80
    const hardModeThreshold = settings.hard_mode_threshold || 60

    // Set filtered results to match testResults (backend handles filtering)
    useEffect(() => {
        setFilteredResults(testResults)
    }, [testResults])

    // Reset to page 1 when filters change - handled in filter change handlers

    const handleClearFilters = () => {
        setSearchTerm('')
        setSelectedDate('')
        setCurrentPage(1)
    }

    const handlePageChange = (newPage) => {
        setCurrentPage(newPage)
    }

    const handleViewScores = (result) => {
        setSelectedScoreResult(result)
        setShowScoreModal(true)
    }

    const handleCloseScoreModal = () => {
        setShowScoreModal(false)
        setSelectedScoreResult(null)
    }

    const handleViewAnswers = async (result) => {
        setSelectedResult(result)
        setShowAnswersModal(true)
        setLoadingAnswers(true)

        try {
            const response = await adminService.getUserAnswers(result.result_id)
            if (response.success) {
                setUserAnswers(response.data.answers || [])
            } else {
                console.error('Failed to load user answers:', response.message)
                setUserAnswers([])
            }
        } catch (error) {
            console.error('Error loading user answers:', error)
            setUserAnswers([])
        } finally {
            setLoadingAnswers(false)
        }
    }

    const handleCloseAnswersModal = () => {
        setShowAnswersModal(false)
        setSelectedResult(null)
        setUserAnswers([])
    }

    const hasActiveFilters = searchTerm || selectedDate

    if (isLoading) {
        console.log('History loading...')
        return (
            <Container className="d-flex justify-content-center align-items-center" style={{ height: '60vh' }}>
                <div className="text-center">
                    <Spinner animation="border" variant="primary" />
                    <p className="text-muted mt-3">Loading test results...</p>
                </div>
            </Container>
        )
    }

    if (error) {
        console.log('History error state:', error)
        return (
            <Container>
                <Alert variant="danger">
                    <Alert.Heading>History Error</Alert.Heading>
                    <p>Unable to load test history. Please check:</p>
                    <ul>
                        <li>Backend server is running on port 5000</li>
                        <li>You are logged in with valid credentials</li>
                        <li>Database connection is active</li>
                    </ul>
                    <hr />
                    <p className="mb-0">
                        <strong>Error details:</strong> {error.message}
                    </p>
                </Alert>
            </Container>
        )
    }

    return (
        <Container fluid style={{ minHeight: '100vh', backgroundColor: 'var(--bg-primary)', padding: '2rem' }}>
            <div className="mb-4 fade-in">
                <h2 className="fw-bold" style={{ color: 'var(--text-primary)' }}>Test History</h2>
                <p className="text-muted" style={{ color: 'var(--text-muted)' }}>
                    View and filter all test results
                </p>
            </div>

            {/* Search and Filter Card */}
            <Card className="border-0 shadow-sm mb-4 fade-in" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-primary)' }}>
                <Card.Body>
                    <Row className="g-3">
                        <Col md={6}>
                            <Form.Group>
                                <Form.Label style={{ color: 'var(--text-primary)', fontSize: '0.875rem', fontWeight: '500' }}>
                                    <i className="bi bi-search me-2"></i>
                                    Search by Name or Employee ID
                                </Form.Label>
                                <div className="input-group">
                                    <span className="input-group-text bg-transparent border-secondary">
                                        <i className="bi bi-search"></i>
                                    </span>
                                    <Form.Control
                                        type="text"
                                        placeholder="Enter name or employee ID..."
                                        value={searchTerm}
                                        onChange={(e) => {
                                            setSearchTerm(e.target.value)
                                            setCurrentPage(1)
                                        }}
                                        style={{
                                            backgroundColor: 'var(--bg-tertiary)',
                                            borderColor: 'var(--border-secondary)',
                                            color: 'var(--text-primary)'
                                        }}
                                    />
                                    {searchTerm && (
                                        <button
                                            className="btn btn-outline-secondary border-secondary"
                                            type="button"
                                            onClick={() => {
                                                setSearchTerm('')
                                                setCurrentPage(1)
                                            }}
                                            style={{
                                                backgroundColor: 'var(--bg-tertiary)',
                                                borderColor: 'var(--border-secondary)',
                                                color: 'var(--text-muted)'
                                            }}
                                        >
                                            <i className="bi bi-x"></i>
                                        </button>
                                    )}
                                </div>
                            </Form.Group>
                        </Col>
                        <Col md={4}>
                            <Form.Group>
                                <Form.Label style={{ color: 'var(--text-primary)', fontSize: '0.875rem', fontWeight: '500' }}>
                                    <i className="bi bi-calendar-event me-2"></i>
                                    Filter by Date
                                </Form.Label>
                                <Form.Control
                                    type="date"
                                    value={selectedDate}
                                    onChange={(e) => {
                                        setSelectedDate(e.target.value)
                                        setCurrentPage(1)
                                    }}
                                    style={{
                                        backgroundColor: 'var(--bg-tertiary)',
                                        borderColor: 'var(--border-secondary)',
                                        color: 'var(--text-primary)'
                                    }}
                                />
                            </Form.Group>
                        </Col>
                        <Col md={2} className="d-flex align-items-end">
                            {hasActiveFilters && (
                                <Button
                                    variant="outline-secondary"
                                    onClick={handleClearFilters}
                                    className="w-100"
                                >
                                    <i className="bi bi-x-circle me-2"></i>
                                    Clear Filters
                                </Button>
                            )}
                        </Col>
                    </Row>

                    {/* Filter Info */}
                    <div className="mt-3 d-flex align-items-center justify-content-between">
                        <div className="d-flex align-items-center gap-2">
                            <small className="text-muted" style={{ color: 'var(--text-muted)' }}>
                                <i className="bi bi-funnel me-1"></i>
                                Showing {filteredResults.length} of {testResults.length} results
                            </small>
                            {hasActiveFilters && (
                                <div className="d-flex gap-2 flex-wrap">
                                    {searchTerm && (
                                        <Badge bg="primary" className="px-2 py-1">
                                            <i className="bi bi-search me-1"></i>
                                            "{searchTerm}"
                                        </Badge>
                                    )}
                                    {selectedDate && (
                                        <Badge bg="info" className="px-2 py-1">
                                            <i className="bi bi-calendar-event me-1"></i>
                                            {new Date(selectedDate).toLocaleDateString()}
                                        </Badge>
                                    )}
                                </div>
                            )}
                        </div>
                        {pagination && pagination.totalPages > 1 && (
                            <div className="d-flex align-items-center gap-2">
                                <small className="text-muted" style={{ color: 'var(--text-muted)' }}>
                                    Page {pagination.currentPage} of {pagination.totalPages}
                                </small>
                            </div>
                        )}
                    </div>
                </Card.Body>
            </Card>

            {/* Results Table */}
            <Card className="border-0 shadow-sm fade-in" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-primary)' }}>
                <Card.Header className="bg-transparent border-0 py-3">
                    <div className="d-flex justify-content-between align-items-center">
                        <div>
                            <h5 className="mb-1 fw-bold" style={{ color: 'var(--text-primary)' }}>
                                <i className="bi bi-clock-history me-2" style={{ color: 'var(--accent-primary)' }}></i>
                                Test Results
                            </h5>
                            <small className="text-muted" style={{ color: 'var(--text-muted)' }}>
                                {filteredResults.length} {filteredResults.length === 1 ? 'result' : 'results'} found
                            </small>
                        </div>
                    </div>
                </Card.Header>
                <Card.Body className="p-0">
                    {filteredResults.length === 0 ? (
                        <div className="text-center py-5">
                            <div className="empty-icon mb-3">
                                <i className="bi bi-inbox" style={{ fontSize: '3rem', color: 'var(--text-muted)' }}></i>
                            </div>
                            <h6 className="text-muted">
                                {hasActiveFilters ? 'No Results Found' : 'No Test Results Found'}
                            </h6>
                            <small className="text-muted">
                                {hasActiveFilters
                                    ? 'Try adjusting your filters to see more results'
                                    : 'No test results have been recorded yet.'
                                }
                            </small>
                            {hasActiveFilters && (
                                <div className="mt-3">
                                    <Button variant="outline-secondary" onClick={handleClearFilters}>
                                        <i className="bi bi-x-circle me-2"></i>
                                        Clear All Filters
                                    </Button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="table-responsive">
                            <Table className="align-middle table-modern hover" style={{ border: 'none' }}>
                                <thead>
                                    <tr>
                                        <th className="border-0 text-nowrap">
                                            <div className="d-flex align-items-center">
                                                <i className="bi bi-person me-2 text-muted"></i>
                                                User
                                            </div>
                                        </th>
                                        <th className="border-0 text-nowrap">
                                            <div className="d-flex align-items-center">
                                                <i className="bi bi-badge me-2 text-muted"></i>
                                                Employee ID
                                            </div>
                                        </th>
                                        <th className="border-0 text-center text-nowrap">
                                            <div className="d-flex align-items-center justify-content-center">
                                                <i className="bi bi-clipboard-data me-2 text-muted"></i>
                                                Assessment
                                            </div>
                                        </th>
                                        <th className="border-0 text-center text-nowrap">
                                            <div className="d-flex align-items-center justify-content-center">
                                                <i className="bi bi-trophy me-2 text-muted"></i>
                                                Total
                                            </div>
                                        </th>
                                        <th className="border-0 text-nowrap">
                                            <div className="d-flex align-items-center">
                                                <i className="bi bi-calendar me-2 text-muted"></i>
                                                Date
                                            </div>
                                        </th>
                                        <th className="border-0 text-center text-nowrap">
                                            <div className="d-flex align-items-center justify-content-center">
                                                <i className="bi bi-patch-check me-2 text-muted"></i>
                                                Status
                                            </div>
                                        </th>
                                        <th className="border-0 text-center text-nowrap">
                                            <div className="d-flex align-items-center justify-content-center">
                                                <i className="bi bi-gear me-2 text-muted"></i>
                                                Actions
                                            </div>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredResults.map((result, index) => (
                                        <tr key={result.result_id || index}>
                                            <td>
                                                <div className="d-flex align-items-center">
                                                    <div className="user-avatar-small me-3">
                                                        {result.name?.charAt(0).toUpperCase() || 'U'}
                                                    </div>
                                                    <div>
                                                        <div className="fw-medium" style={{ color: 'var(--text-primary)' }}>
                                                            {result.name}
                                                        </div>
                                                        <small className="text-muted">Test #{result.result_id || index + 1}</small>
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                <div className="d-flex align-items-center">
                                                    <i className="bi bi-card-text me-2 text-muted small"></i>
                                                    <span className="fw-mono text-muted">{result.employee_id}</span>
                                                </div>
                                            </td>
                                            <td className="text-center">
                                                <div className="d-flex justify-content-center">
                                                    <span className={`badge px-3 py-2 bg-primary bg-opacity-10 text-primary`}>
                                                        <i className="bi bi-clipboard-check me-1"></i>
                                                        {result.assessment_score}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="text-center">
                                                <span className={`badge px-3 py-2 ${result.total_score >= minimumPassingScore ? 'bg-success' : 'bg-danger'} bg-opacity-10 text-${result.total_score >= minimumPassingScore ? 'success' : 'danger'}`}>
                                                    <i className={`bi ${result.total_score >= minimumPassingScore ? 'bi-trophy-fill' : 'bi-emoji-frown'} me-1`}></i>
                                                    {result.total_score}
                                                </span>
                                            </td>
                                            <td>
                                                <div className="d-flex flex-column">
                                                    <span className="text-muted small">
                                                        {new Date(new Date(result.test_timestamp).getTime() + 8 * 60 * 60 * 1000).toLocaleDateString('id-ID', {
                                                            day: '2-digit',
                                                            month: '2-digit',
                                                            year: 'numeric'
                                                        })}
                                                    </span>
                                                    <span className="text-muted" style={{ fontSize: '0.75rem' }}>
                                                        {new Date(new Date(result.test_timestamp).getTime() + 8 * 60 * 60 * 1000).toLocaleTimeString('id-ID', {
                                                            hour: '2-digit',
                                                            minute: '2-digit',
                                                            second: '2-digit'
                                                        })}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="text-center">
                                                <Badge
                                                    bg={result.total_score >= minimumPassingScore ? 'success' : 'danger'}
                                                    className="px-3 py-2"
                                                >
                                                    <i className={`bi ${result.total_score >= minimumPassingScore ? 'bi-check-circle-fill' : 'bi-x-circle-fill'} me-1`}></i>
                                                    {result.status || (result.total_score >= minimumPassingScore ? 'Fit' : 'Unfit')}
                                                </Badge>
                                            </td>
                                            <td className="text-center">
                                                <div className="d-flex gap-2 justify-content-center flex-wrap">
                                                    <Button
                                                        variant="outline-info"
                                                        size="sm"
                                                        onClick={() => handleViewScores(result)}
                                                        className="px-3"
                                                        title="View minigame scores breakdown"
                                                    >
                                                        <i className="bi bi-controller me-1"></i>
                                                        Score
                                                    </Button>
                                                    <Button
                                                        variant="outline-primary"
                                                        size="sm"
                                                        onClick={() => handleViewAnswers(result)}
                                                        className="px-3"
                                                    >
                                                        <i className="bi bi-eye me-1"></i>
                                                        Jawaban
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </Table>
                        </div>
                    )}
                </Card.Body>
            </Card>

            {/* Pagination Controls */}
            {pagination && pagination.totalPages > 1 && (
                <Card className="border-0 shadow-sm mt-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-primary)' }}>
                    <Card.Body className="py-3">
                        <div className="d-flex justify-content-between align-items-center">
                            <div>
                                <small className="text-muted" style={{ color: 'var(--text-muted)' }}>
                                    Showing {((pagination.currentPage - 1) * pagination.recordsPerPage) + 1} to {Math.min(pagination.currentPage * pagination.recordsPerPage, pagination.totalRecords)} of {pagination.totalRecords} results
                                </small>
                            </div>
                            <div className="d-flex gap-2">
                                <Button
                                    variant="outline-secondary"
                                    size="sm"
                                    onClick={() => handlePageChange(pagination.currentPage - 1)}
                                    disabled={!pagination.hasPrevPage}
                                    style={{
                                        backgroundColor: 'var(--bg-tertiary)',
                                        borderColor: 'var(--border-secondary)',
                                        color: 'var(--text-primary)'
                                    }}
                                >
                                    <i className="bi bi-chevron-left me-1"></i>
                                    Previous
                                </Button>

                                {/* Page Numbers */}
                                {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                                    let pageNum;
                                    if (pagination.totalPages <= 5) {
                                        pageNum = i + 1;
                                    } else if (pagination.currentPage <= 3) {
                                        pageNum = i + 1;
                                    } else if (pagination.currentPage >= pagination.totalPages - 2) {
                                        pageNum = pagination.totalPages - 4 + i;
                                    } else {
                                        pageNum = pagination.currentPage - 2 + i;
                                    }

                                    return (
                                        <Button
                                            key={pageNum}
                                            variant={pageNum === pagination.currentPage ? "primary" : "outline-secondary"}
                                            size="sm"
                                            onClick={() => handlePageChange(pageNum)}
                                            style={{
                                                backgroundColor: pageNum === pagination.currentPage ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
                                                borderColor: 'var(--border-secondary)',
                                                color: pageNum === pagination.currentPage ? 'white' : 'var(--text-primary)'
                                            }}
                                        >
                                            {pageNum}
                                        </Button>
                                    );
                                })}

                                <Button
                                    variant="outline-secondary"
                                    size="sm"
                                    onClick={() => handlePageChange(pagination.currentPage + 1)}
                                    disabled={!pagination.hasNextPage}
                                    style={{
                                        backgroundColor: 'var(--bg-tertiary)',
                                        borderColor: 'var(--border-secondary)',
                                        color: 'var(--text-primary)'
                                    }}
                                >
                                    Next
                                    <i className="bi bi-chevron-right ms-1"></i>
                                </Button>
                            </div>
                        </div>
                    </Card.Body>
                </Card>
            )}

            {/* User Answers Modal */}
            <Modal
                show={showAnswersModal}
                onHide={handleCloseAnswersModal}
                size="lg"
                centered
                className="answer-modal"
            >
                <Modal.Header
                    closeButton
                    className="border-0"
                    style={{
                        background: 'var(--bg-card)',
                        borderBottom: '1px solid var(--border-primary)'
                    }}
                >
                    <Modal.Title className="fw-bold">
                        <i className="bi bi-clipboard-check me-2" style={{ color: 'var(--accent-primary)' }}></i>
                        <span style={{ color: 'var(--text-primary)' }}>Detail Jawaban User</span>
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body
                    className="p-4"
                    style={{
                        background: 'var(--bg-card)',
                        maxHeight: '70vh',
                        overflowY: 'auto'
                    }}
                >
                    {selectedResult && (
                        <div className="mb-4">
                            <Card className="border-0 shadow-sm" style={{ background: 'var(--bg-secondary)' }}>
                                <Card.Body className="p-4">
                                    <Row className="g-3">
                                        <Col md={6}>
                                            <div className="d-flex align-items-center">
                                                <i className="bi bi-person-circle me-2" style={{ color: 'var(--accent-primary)' }}></i>
                                                <div>
                                                    <small className="text-muted d-block" style={{ color: 'var(--text-muted)' }}>Nama</small>
                                                    <strong style={{ color: 'var(--text-primary)' }}>{selectedResult.name}</strong>
                                                </div>
                                            </div>
                                        </Col>
                                        <Col md={6}>
                                            <div className="d-flex align-items-center">
                                                <i className="bi bi-badge me-2" style={{ color: 'var(--accent-primary)' }}></i>
                                                <div>
                                                    <small className="text-muted d-block" style={{ color: 'var(--text-muted)' }}>Employee ID</small>
                                                    <strong style={{ color: 'var(--text-primary)' }}>{selectedResult.employee_id}</strong>
                                                </div>
                                            </div>
                                        </Col>
                                        <Col md={6}>
                                            <div className="d-flex align-items-center">
                                                <i className="bi bi-clipboard-data me-2" style={{ color: 'var(--accent-primary)' }}></i>
                                                <div>
                                                    <small className="text-muted d-block" style={{ color: 'var(--text-muted)' }}>Assessment Score</small>
                                                    <Badge bg="primary" className="px-3 py-2">{selectedResult.assessment_score}</Badge>
                                                </div>
                                            </div>
                                        </Col>
                                        <Col md={6}>
                                            <div className="d-flex align-items-center">
                                                <i className="bi bi-trophy me-2" style={{ color: 'var(--accent-primary)' }}></i>
                                                <div>
                                                    <small className="text-muted d-block" style={{ color: 'var(--text-muted)' }}>Total Score</small>
                                                    <Badge
                                                        bg={selectedResult.total_score >= minimumPassingScore ? 'success' : 'danger'}
                                                        className="px-3 py-2"
                                                    >
                                                        {selectedResult.total_score}
                                                    </Badge>
                                                </div>
                                            </div>
                                        </Col>
                                    </Row>
                                </Card.Body>
                            </Card>
                        </div>
                    )}

                    {loadingAnswers ? (
                        <div className="text-center py-5">
                            <div className="loading-spinner mb-3">
                                <Spinner animation="border" className="text-primary" />
                            </div>
                            <p className="text-muted mb-0" style={{ color: 'var(--text-muted)' }}>
                                <i className="bi bi-hourglass-split me-2"></i>
                                Memuat jawaban...
                            </p>
                        </div>
                    ) : userAnswers.length > 0 ? (
                        <div>
                            <div className="d-flex align-items-center mb-4">
                                <i className="bi bi-list-check me-2" style={{ color: 'var(--accent-primary)' }}></i>
                                <h6 className="mb-0 fw-bold" style={{ color: 'var(--text-primary)' }}>
                                    Jawaban Assessment
                                </h6>
                                <Badge bg="primary" className="ms-2 px-3 py-1">
                                    {userAnswers.length} pertanyaan
                                </Badge>
                            </div>

                            <div className="answers-container">
                                {userAnswers.map((answer, index) => (
                                    <Card
                                        key={answer.questionId || index}
                                        className="mb-3 border-0 shadow-sm answer-card"
                                        style={{
                                            background: 'var(--bg-secondary)',
                                            border: '1px solid var(--border-primary)'
                                        }}
                                    >
                                        <Card.Header className="border-0 bg-transparent py-3">
                                            <div className="d-flex align-items-start">
                                                <div className="question-number me-3">
                                                    <div
                                                        className="rounded-circle d-flex align-items-center justify-content-center"
                                                        style={{
                                                            width: '32px',
                                                            height: '32px',
                                                            background: 'var(--accent-primary)',
                                                            color: 'white',
                                                            fontSize: '14px',
                                                            fontWeight: 'bold'
                                                        }}
                                                    >
                                                        {index + 1}
                                                    </div>
                                                </div>
                                                <div className="flex-grow-1">
                                                    <small className="text-muted d-block mb-1" style={{ color: 'var(--text-muted)' }}>
                                                        Pertanyaan {answer.questionId}
                                                    </small>
                                                    <h6 className="mb-0 fw-semibold" style={{ color: 'var(--text-primary)' }}>
                                                        {answer.questionText}
                                                    </h6>
                                                </div>
                                            </div>
                                        </Card.Header>
                                        <Card.Body className="pt-0">
                                            <div className="user-answer-section mb-3">
                                                <div className="d-flex align-items-center mb-2">
                                                    <i className="bi bi-chat-square-text me-2" style={{ color: 'var(--accent-primary)' }}></i>
                                                    <small className="text-muted" style={{ color: 'var(--text-muted)' }}>Jawaban User:</small>
                                                </div>
                                                <div className="user-answer-badge">
                                                    <Badge
                                                        bg="info"
                                                        className="px-3 py-2 fs-6"
                                                    >
                                                        <i className="bi bi-person-check me-2"></i>
                                                        {answer.userAnswer}
                                                    </Badge>
                                                </div>
                                            </div>

                                            {answer.possibleAnswers && answer.possibleAnswers.length > 0 && (
                                                <div className="possible-answers-section">
                                                    <div className="d-flex align-items-center mb-3">
                                                        <i className="bi bi-list-ul me-2" style={{ color: 'var(--accent-primary)' }}></i>
                                                        <small className="text-muted" style={{ color: 'var(--text-muted)' }}>Pilihan Jawaban:</small>
                                                    </div>
                                                    <div className="options-grid">
                                                        {answer.possibleAnswers.map((option, optIndex) => (
                                                            <div
                                                                key={optIndex}
                                                                className={`option-item p-3 rounded mb-2 d-flex justify-content-between align-items-center ${option.isUserAnswer
                                                                    ? 'selected-option'
                                                                    : 'unselected-option'
                                                                    }`}
                                                                style={{
                                                                    background: option.isUserAnswer
                                                                        ? 'var(--accent-primary)20'
                                                                        : 'var(--bg-tertiary)',
                                                                    border: option.isUserAnswer
                                                                        ? '2px solid var(--accent-primary)'
                                                                        : '1px solid var(--border-primary)',
                                                                    borderRadius: '8px'
                                                                }}
                                                            >
                                                                <div className="d-flex align-items-center">
                                                                    <div className="option-indicator me-3">
                                                                        {option.isUserAnswer ? (
                                                                            <i className="bi bi-check-circle-fill" style={{ color: 'var(--accent-primary)' }}></i>
                                                                        ) : (
                                                                            <i className="bi bi-circle" style={{ color: 'var(--text-muted)' }}></i>
                                                                        )}
                                                                    </div>
                                                                    <span className="option-text" style={{ color: 'var(--text-primary)' }}>
                                                                        {option.answerText}
                                                                    </span>
                                                                </div>
                                                                <div className="option-badges">
                                                                    {option.isUserAnswer && (
                                                                        <Badge
                                                                            bg="primary"
                                                                            className="me-2 px-2 py-1"
                                                                        >
                                                                            <i className="bi bi-check-lg me-1"></i>
                                                                            Dipilih
                                                                        </Badge>
                                                                    )}
                                                                    <Badge
                                                                        bg="secondary"
                                                                        className="px-2 py-1"
                                                                    >
                                                                        <i className="bi bi-star me-1"></i>
                                                                        {option.score}
                                                                    </Badge>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </Card.Body>
                                    </Card>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-5">
                            <div className="empty-state mb-3">
                                <i
                                    className="bi bi-inbox"
                                    style={{
                                        fontSize: '3rem',
                                        color: 'var(--text-muted)'
                                    }}
                                ></i>
                            </div>
                            <h6 className="text-muted mb-2" style={{ color: 'var(--text-muted)' }}>
                                Tidak Ada Jawaban
                            </h6>
                            <p className="text-muted mb-0" style={{ color: 'var(--text-muted)' }}>
                                Tidak ada jawaban yang tersedia untuk tes ini.
                            </p>
                        </div>
                    )}
                </Modal.Body>
                <Modal.Footer
                    className="border-0"
                    style={{
                        background: 'var(--bg-card)',
                        borderTop: '1px solid var(--border-primary)'
                    }}
                >
                    <Button
                        variant="secondary"
                        onClick={handleCloseAnswersModal}
                        className="px-4"
                    >
                        <i className="bi bi-x-circle me-2"></i>
                        Tutup
                    </Button>
                </Modal.Footer>
            </Modal>

            {/* Score Details Modal */}
            <Modal
                show={showScoreModal}
                onHide={handleCloseScoreModal}
                size="lg"
                centered
                className="score-modal"
            >
                <Modal.Header
                    closeButton
                    className="border-0"
                    style={{
                        background: 'var(--bg-card)',
                        borderBottom: '1px solid var(--border-primary)'
                    }}
                >
                    <Modal.Title className="fw-bold">
                        <i className="bi bi-controller me-2" style={{ color: 'var(--accent-primary)' }}></i>
                        <span style={{ color: 'var(--text-primary)' }}>Detail Score Minigame</span>
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body
                    className="p-4"
                    style={{
                        background: 'var(--bg-card)',
                        maxHeight: '70vh',
                        overflowY: 'auto'
                    }}
                >
                    {selectedScoreResult && (
                        <div>
                            {/* User Info */}
                            <Card className="border-0 shadow-sm mb-4" style={{ background: 'var(--bg-secondary)' }}>
                                <Card.Body className="p-3">
                                    <Row className="g-3 align-items-center">
                                        <Col md={6}>
                                            <div className="d-flex align-items-center">
                                                <div className="user-avatar-small me-3" style={{ fontSize: '1.5rem', width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--accent-primary)', color: 'white' }}>
                                                    {selectedScoreResult.name?.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <small className="text-muted" style={{ color: 'var(--text-muted)' }}>Nama</small>
                                                    <div style={{ color: 'var(--text-primary)', fontWeight: 'bold' }}>{selectedScoreResult.name}</div>
                                                </div>
                                            </div>
                                        </Col>
                                        <Col md={6}>
                                            <div className="d-flex align-items-center">
                                                <i className="bi bi-badge me-2" style={{ color: 'var(--accent-primary)', fontSize: '1.2rem' }}></i>
                                                <div>
                                                    <small className="text-muted" style={{ color: 'var(--text-muted)' }}>Employee ID</small>
                                                    <div style={{ color: 'var(--text-primary)', fontWeight: 'bold' }}>{selectedScoreResult.employee_id}</div>
                                                </div>
                                            </div>
                                        </Col>
                                    </Row>
                                </Card.Body>
                            </Card>

                            {/* Scores Grid */}
                            <Row className="g-3 mb-4">
                                <Col md={6}>
                                    <Card className="border-0 shadow-sm" style={{ background: 'var(--bg-secondary)', borderLeft: '4px solid var(--accent-primary)' }}>
                                        <Card.Body className="text-center p-4">
                                            <i className="bi bi-controller" style={{ fontSize: '2rem', color: 'var(--accent-primary)', marginBottom: '1rem' }}></i>
                                            <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Minigame 1</div>
                                            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>{selectedScoreResult.minigame1_score}</div>
                                        </Card.Body>
                                    </Card>
                                </Col>
                                <Col md={6}>
                                    <Card className="border-0 shadow-sm" style={{ background: 'var(--bg-secondary)', borderLeft: '4px solid var(--accent-primary)' }}>
                                        <Card.Body className="text-center p-4">
                                            <i className="bi bi-controller" style={{ fontSize: '2rem', color: 'var(--accent-primary)', marginBottom: '1rem' }}></i>
                                            <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Minigame 2</div>
                                            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>{selectedScoreResult.minigame2_score}</div>
                                        </Card.Body>
                                    </Card>
                                </Col>
                                <Col md={6}>
                                    <Card className="border-0 shadow-sm" style={{ background: 'var(--bg-secondary)', borderLeft: '4px solid var(--accent-primary)' }}>
                                        <Card.Body className="text-center p-4">
                                            <i className="bi bi-controller" style={{ fontSize: '2rem', color: 'var(--accent-primary)', marginBottom: '1rem' }}></i>
                                            <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Minigame 3</div>
                                            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>{selectedScoreResult.minigame3_score}</div>
                                        </Card.Body>
                                    </Card>
                                </Col>
                                <Col md={6}>
                                    <Card className="border-0 shadow-sm" style={{ background: 'var(--bg-secondary)', borderLeft: '4px solid var(--accent-primary)' }}>
                                        <Card.Body className="text-center p-4">
                                            <i className="bi bi-controller" style={{ fontSize: '2rem', color: 'var(--accent-primary)', marginBottom: '1rem' }}></i>
                                            <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Minigame 4</div>
                                            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>{selectedScoreResult.minigame4_score}</div>
                                        </Card.Body>
                                    </Card>
                                </Col>
                                <Col md={6}>
                                    <Card className="border-0 shadow-sm" style={{ background: 'var(--bg-secondary)', borderLeft: '4px solid var(--accent-primary)' }}>
                                        <Card.Body className="text-center p-4">
                                            <i className="bi bi-controller" style={{ fontSize: '2rem', color: 'var(--accent-primary)', marginBottom: '1rem' }}></i>
                                            <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Minigame 5</div>
                                            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>{selectedScoreResult.minigame5_score}</div>
                                        </Card.Body>
                                    </Card>
                                </Col>
                                <Col md={6}>
                                    <Card className="border-0 shadow-sm" style={{ background: 'var(--bg-secondary)', borderLeft: '4px solid var(--accent-success)' }}>
                                        <Card.Body className="text-center p-4">
                                            <i className="bi bi-trophy-fill" style={{ fontSize: '2rem', color: 'var(--accent-success)', marginBottom: '1rem' }}></i>
                                            <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Total Score</div>
                                            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>{selectedScoreResult.total_score}</div>
                                        </Card.Body>
                                    </Card>
                                </Col>
                            </Row>

                            {/* Summary */}
                            <Card className="border-0 shadow-sm" style={{ background: 'var(--bg-secondary)' }}>
                                <Card.Body className="p-3">
                                    <Row className="g-3">
                                        <Col md={6}>
                                            <div className="d-flex align-items-center">
                                                <i className="bi bi-clipboard-data me-2" style={{ color: 'var(--accent-primary)', fontSize: '1.2rem' }}></i>
                                                <div>
                                                    <small className="text-muted" style={{ color: 'var(--text-muted)' }}>Assessment Score</small>
                                                    <Badge bg="primary" className="px-3 py-2 d-block mt-1">{selectedScoreResult.assessment_score}</Badge>
                                                </div>
                                            </div>
                                        </Col>
                                        <Col md={6}>
                                            <div className="d-flex align-items-center">
                                                <i className="bi bi-clock me-2" style={{ color: 'var(--accent-primary)', fontSize: '1.2rem' }}></i>
                                                <div>
                                                    <small className="text-muted" style={{ color: 'var(--text-muted)' }}>Date & Time</small>
                                                    <div style={{ color: 'var(--text-primary)', fontWeight: 'bold', marginTop: '0.25rem', fontSize: '0.875rem' }}>
                                                        {new Date(new Date(selectedScoreResult.test_timestamp).getTime() + 8 * 60 * 60 * 1000).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' })} {new Date(new Date(selectedScoreResult.test_timestamp).getTime() + 8 * 60 * 60 * 1000).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                                                    </div>
                                                </div>
                                            </div>
                                        </Col>
                                    </Row>
                                </Card.Body>
                            </Card>
                        </div>
                    )}
                </Modal.Body>
                <Modal.Footer
                    className="border-0"
                    style={{
                        background: 'var(--bg-card)',
                        borderTop: '1px solid var(--border-primary)'
                    }}
                >
                    <Button
                        variant="secondary"
                        onClick={handleCloseScoreModal}
                        className="px-4"
                    >
                        <i className="bi bi-x-circle me-2"></i>
                        Tutup
                    </Button>
                </Modal.Footer>
            </Modal>
        </Container>
    )
}

export default History