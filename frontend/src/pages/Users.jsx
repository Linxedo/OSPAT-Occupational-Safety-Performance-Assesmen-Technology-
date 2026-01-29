import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { Container, Row, Col, Card, Button, Modal, Form, Spinner, Alert, Table } from 'react-bootstrap'
import { useForm } from 'react-hook-form'
import { adminService } from '../services/adminService'

const Users = () => {
    const [showModal, setShowModal] = useState(false)
    const [editingUser, setEditingUser] = useState(null)
    const [showDeleteModal, setShowDeleteModal] = useState(false)
    const [deletingUser, setDeletingUser] = useState(null)
    const [showPassword, setShowPassword] = useState(false)
    const [searchTerm, setSearchTerm] = useState('')
    const [currentPage, setCurrentPage] = useState(1)
    const [pagination, setPagination] = useState(null)
    const [showSyncModal, setShowSyncModal] = useState(false)
    const [syncResult, setSyncResult] = useState(null)

    const { register, handleSubmit, reset, formState: { errors }, watch } = useForm()
    const queryClient = useQueryClient()

    const { data, isLoading, error } = useQuery(['users', currentPage, searchTerm], () => adminService.getUsers(currentPage, searchTerm), {
        retry: 2,
        retryDelay: 1000,
        refetchOnWindowFocus: false,
        keepPreviousData: true,
        onSuccess: (data) => {
            setPagination(data.pagination);
        }
    })

    const createMutation = useMutation(adminService.createUser, {
        onSuccess: () => {
            queryClient.invalidateQueries('users')
            setShowModal(false)
            reset()
        }
    })

    const updateMutation = useMutation(
        ({ id, data }) => adminService.updateUser(id, data),
        {
            onSuccess: () => {
                queryClient.invalidateQueries('users')
                setShowModal(false)
                setEditingUser(null)
                reset()
            }
        }
    )

    const deleteMutation = useMutation(adminService.deleteUser, {
        onSuccess: () => {
            queryClient.invalidateQueries('users')
            setShowDeleteModal(false)
            setDeletingUser(null)
        }
    })

    const syncMutation = useMutation(adminService.syncUsers, {
        onSuccess: (data) => {
            queryClient.invalidateQueries('users')
            setSyncResult(data.data)
        },
        onError: (err) => {
            alert(err.response?.data?.message || 'Failed to sync users')
            setShowSyncModal(false)
        }
    })

    // Backend handles search, so use data directly
    const users = data?.data || []
    const filteredUsers = users // No client-side filtering needed

    useEffect(() => {
        setCurrentPage(1)
    }, [searchTerm])

    const handleAddUser = () => {
        setEditingUser(null)
        setShowPassword(false)
        reset({
            name: '',
            employee_id: '',
            role: 'user',
            password: ''
        })
        setShowModal(true)
    }

    const handleEditUser = (user) => {
        setEditingUser(user)
        reset({
            name: user.name,
            role: user.role,
            password: ''
        })
        setShowModal(true)
    }

    const handleDeleteUser = (user) => {
        setDeletingUser(user)
        setShowDeleteModal(true)
    }

    const handleSync = () => {
        setSyncResult(null)
        setShowSyncModal(true)
    }

    const confirmSync = async () => {
        await syncMutation.mutateAsync()
    }

    const onSubmit = async (data) => {
        try {
            if (editingUser) {
                await updateMutation.mutateAsync({ id: editingUser.id, data })
            } else {
                await createMutation.mutateAsync(data)
            }
        } catch (error) {
            console.error('Submit error:', error)
        }
    }

    const confirmDelete = () => {
        deleteMutation.mutate(deletingUser.id)
    }

    const handlePageChange = (newPage) => {
        setCurrentPage(newPage)
    }

    if (isLoading) {
        return (
            <Container className="d-flex justify-content-center align-items-center" style={{ height: '60vh' }}>
                <div className="text-center">
                    <Spinner animation="border" variant="primary" />
                    <p className="text-muted mt-3">Loading users...</p>
                </div>
            </Container>
        )
    }

    if (error) {
        return (
            <Container>
                <Alert variant="danger">
                    <Alert.Heading>Users Error</Alert.Heading>
                    <p>Unable to load users. Please check:</p>
                    <ul>
                        <li>Backend server is running on port 5000</li>
                        <li>You are logged in with valid credentials</li>
                        <li>Database connection is active</li>
                        <li>Console for detailed error information</li>
                    </ul>
                    <hr />
                    <p className="mb-0">
                        <strong>Error details:</strong> {error.message}
                    </p>
                    <p className="mb-0">
                        <strong>Response:</strong> {JSON.stringify(error.response?.data)}
                    </p>
                </Alert>
            </Container>
        )
    }

    return (
        <Container fluid style={{ minHeight: '100vh', backgroundColor: 'var(--bg-primary)', padding: '2rem' }}>
            <Row className="mb-4 fade-in">
                <Col>
                    <h2 className="fw-bold" style={{ color: 'var(--text-primary)' }}>User Management</h2>
                    <p className="text-muted" style={{ color: 'var(--text-muted)' }}>Manage system users and their roles</p>
                </Col>
                <Col className="text-end d-flex justify-content-end gap-2">
                    <Button
                        onClick={handleSync}
                        className="hover-lift"
                        disabled={syncMutation.isLoading}
                    >
                        <i className="bi bi-arrow-repeat me-2"></i>
                        Sync Data
                    </Button>
                    <Button onClick={handleAddUser} className="hover-lift">
                        <i className="bi bi-person-plus me-2"></i>
                        Add User
                    </Button>
                </Col>
            </Row>

            <Card className="border-0 shadow-sm fade-in" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-primary)' }}>
                <Card.Header className="bg-transparent border-0 py-3">
                    <div className="d-flex justify-content-between align-items-center">
                        <div>
                            <h5 className="mb-1 fw-bold" style={{ color: 'var(--text-primary)' }}>
                                <i className="bi bi-people me-2" style={{ color: 'var(--accent-primary)' }}></i>
                                Users Directory
                            </h5>
                            <div className="d-flex align-items-center gap-3">
                                <small className="text-muted" style={{ color: 'var(--text-muted)' }}>
                                    {pagination ? `${pagination.totalRecords} total` : `${users.length} ${users.length === 1 ? 'user' : 'users'}`}
                                </small>
                                {pagination && pagination.totalPages > 1 && (
                                    <small className="text-muted" style={{ color: 'var(--text-muted)' }}>
                                        Page {pagination.currentPage} of {pagination.totalPages}
                                    </small>
                                )}
                            </div>
                        </div>
                        <div className="d-flex gap-2">
                            <div className="input-group" style={{ maxWidth: '300px' }}>
                                <span className="input-group-text bg-transparent border-secondary">
                                    <i className="bi bi-search"></i>
                                </span>
                                <input
                                    type="text"
                                    className="form-control bg-transparent border-secondary"
                                    placeholder="Search by name or employee ID..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    style={{ color: 'var(--text-primary)' }}
                                />
                                {searchTerm && (
                                    <button
                                        className="btn btn-outline-secondary border-secondary"
                                        type="button"
                                        onClick={() => setSearchTerm('')}
                                        style={{ backgroundColor: 'var(--bg-tertiary)', borderColor: 'var(--border-secondary)', color: 'var(--text-muted)' }}
                                    >
                                        <i className="bi bi-x"></i>
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </Card.Header>
                <Card.Body className="p-0">
                    {filteredUsers.length === 0 ? (
                        <div className="text-center py-5">
                            <div className="empty-icon mb-3">
                                <i className="bi bi-search" style={{ fontSize: '3rem', color: 'var(--text-muted)' }}></i>
                            </div>
                            <h6 className="text-muted">
                                {searchTerm ? 'No Users Found' : 'No Users Registered'}
                            </h6>
                            <small className="text-muted">
                                {searchTerm
                                    ? `No users found matching "${searchTerm}"`
                                    : 'No users have been registered yet.'
                                }
                            </small>
                            {searchTerm && (
                                <div className="mt-3">
                                    <Button variant="outline-secondary" onClick={() => setSearchTerm('')}>
                                        <i className="bi bi-x me-2"></i>
                                        Clear Search
                                    </Button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="table-responsive">
                            <Table className="align-middle table-modern hover" style={{ border: 'none' }}>
                                <thead>
                                    <tr>
                                        <th className="border-0">
                                            <div className="d-flex align-items-center">
                                                <i className="bi bi-hash me-2 text-muted"></i>
                                                ID
                                            </div>
                                        </th>
                                        <th className="border-0">
                                            <div className="d-flex align-items-center">
                                                <i className="bi bi-person me-2 text-muted"></i>
                                                Name
                                            </div>
                                        </th>
                                        <th className="border-0">
                                            <div className="d-flex align-items-center">
                                                <i className="bi bi-badge me-2 text-muted"></i>
                                                Employee ID
                                            </div>
                                        </th>
                                        <th className="border-0">
                                            <div className="d-flex align-items-center">
                                                <i className="bi bi-shield me-2 text-muted"></i>
                                                Role
                                            </div>
                                        </th>
                                        <th className="border-0 text-center">
                                            <div className="d-flex align-items-center justify-content-center">
                                                <i className="bi bi-gear me-2 text-muted"></i>
                                                Actions
                                            </div>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredUsers.map(user => (
                                        <tr key={user.id} className="table-row-hover">
                                            <td>
                                                <span className="text-muted fw-mono">#{user.id}</span>
                                            </td>
                                            <td>
                                                <div className="d-flex align-items-center">
                                                    <div className="user-avatar-small me-3">
                                                        {user.name?.charAt(0)?.toUpperCase() || 'U'}
                                                    </div>
                                                    <div>
                                                        <div className="fw-medium" style={{ color: 'var(--text-primary)' }}>
                                                            {user.name}
                                                        </div>
                                                        <small className="text-muted">User ID: {user.id}</small>
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                <div className="d-flex align-items-center">
                                                    <i className="bi bi-card-text me-2 text-muted small"></i>
                                                    <span className="fw-mono text-muted">{user.employee_id}</span>
                                                </div>
                                            </td>
                                            <td>
                                                <span className={`badge px-3 py-2 ${user.role === 'admin' ? 'bg-danger' : 'bg-primary'} bg-opacity-10 text-${user.role === 'admin' ? 'danger' : 'primary'}`}>
                                                    <i className={`bi ${user.role === 'admin' ? 'bi-shield-fill-check' : 'bi-person'} me-1`}></i>
                                                    {user.role}
                                                </span>
                                            </td>
                                            <td>
                                                <div className="d-flex justify-content-center gap-1">
                                                    <Button
                                                        size="sm"
                                                        variant="outline-warning"
                                                        className="action-btn"
                                                        onClick={() => handleEditUser(user)}
                                                        title="Edit User"
                                                    >
                                                        <i className="bi bi-pencil"></i>
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline-danger"
                                                        className="action-btn"
                                                        onClick={() => handleDeleteUser(user)}
                                                        title="Delete User"
                                                    >
                                                        <i className="bi bi-trash"></i>
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
                                    Showing {((pagination.currentPage - 1) * pagination.recordsPerPage) + 1} to {Math.min(pagination.currentPage * pagination.recordsPerPage, pagination.totalRecords)} of {pagination.totalRecords} users
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

            {/* Add/Edit User Modal */}
            <Modal show={showModal} onHide={() => setShowModal(false)} className="fade-in">
                <Modal.Header closeButton style={{ background: 'var(--gradient-card)', borderBottom: '1px solid var(--border-primary)' }}>
                    <Modal.Title style={{ color: 'var(--text-primary)' }}>{editingUser ? 'Edit User' : 'Add User'}</Modal.Title>
                </Modal.Header>
                <Modal.Body style={{ background: 'var(--bg-card)' }}>
                    <Form onSubmit={handleSubmit(onSubmit)}>
                        <Form.Group className="mb-3">
                            <Form.Label style={{ color: 'var(--text-primary)' }}>Name</Form.Label>
                            <Form.Control
                                {...register('name', { required: 'Name is required' })}
                                type="text"
                                placeholder="Enter name"
                                style={{
                                    backgroundColor: 'var(--bg-tertiary)',
                                    borderColor: 'var(--border-secondary)',
                                    color: 'var(--text-primary)'
                                }}
                                isInvalid={!!errors.name}
                            />
                            <Form.Control.Feedback type="invalid">
                                {errors.name?.message}
                            </Form.Control.Feedback>
                        </Form.Group>

                        <Form.Group className="mb-3">
                            <Form.Label style={{ color: 'var(--text-primary)' }}>Employee ID</Form.Label>
                            <Form.Control
                                {...register('employee_id', { required: 'Employee ID is required' })}
                                type="text"
                                placeholder="Enter employee ID"
                                style={{
                                    backgroundColor: 'var(--bg-tertiary)',
                                    borderColor: 'var(--border-secondary)',
                                    color: 'var(--text-primary)'
                                }}
                                isInvalid={!!errors.employee_id}
                                disabled={!!editingUser}
                            />
                            <Form.Control.Feedback type="invalid">
                                {errors.employee_id?.message}
                            </Form.Control.Feedback>
                        </Form.Group>

                        <Form.Group className="mb-3">
                            <Form.Label style={{ color: 'var(--text-primary)' }}>Role</Form.Label>
                            <Form.Select
                                {...register('role', { required: 'Role is required' })}
                                style={{
                                    backgroundColor: 'var(--bg-tertiary)',
                                    borderColor: 'var(--border-secondary)',
                                    color: 'var(--text-primary)'
                                }}
                                isInvalid={!!errors.role}
                            >
                                <option value="">Select role</option>
                                <option value="user">User</option>
                                <option value="admin">Admin</option>
                            </Form.Select>
                            <Form.Control.Feedback type="invalid">
                                {errors.role?.message}
                            </Form.Control.Feedback>
                        </Form.Group>

                        {watch('role') === 'admin' && (
                            <Form.Group className="mb-3">
                                <Form.Label style={{ color: 'var(--text-primary)' }}>
                                    Password {editingUser && '(leave blank to keep current)'}
                                </Form.Label>
                                <Form.Control
                                    {...register('password', editingUser ? {} : { required: 'Password is required for admin users' })}
                                    type="password"
                                    placeholder="Enter password"
                                    style={{
                                        backgroundColor: 'var(--bg-tertiary)',
                                        borderColor: 'var(--border-secondary)',
                                        color: 'var(--text-primary)'
                                    }}
                                    isInvalid={!!errors.password}
                                />
                                <Form.Control.Feedback type="invalid">
                                    {errors.password?.message}
                                </Form.Control.Feedback>
                            </Form.Group>
                        )}

                        <div className="d-flex justify-content-end gap-2">
                            <Button variant="secondary" onClick={() => setShowModal(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" variant="primary">
                                {editingUser ? 'Update' : 'Create'}
                            </Button>
                        </div>
                    </Form>
                </Modal.Body>
            </Modal>

            {/* Sync Configuration Modal */}
            <Modal show={showSyncModal} onHide={() => !syncMutation.isLoading && setShowSyncModal(false)} className="fade-in">
                <Modal.Header closeButton={!syncMutation.isLoading} style={{ background: 'var(--gradient-card)', borderBottom: '1px solid var(--border-primary)' }}>
                    <Modal.Title style={{ color: 'var(--text-primary)' }}>
                        <i className="bi bi-arrow-repeat me-2" style={{ color: 'var(--accent-primary)' }}></i>
                        Synchronize Users
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body style={{ background: 'var(--bg-card)', color: 'var(--text-primary)' }}>
                    {!syncResult ? (
                        <>
                            <p>You are about to synchronize user data from the external HR system.</p>
                            <Alert variant="info" className="bg-opacity-10 border-info text-info">
                                <i className="bi bi-info-circle me-2"></i>
                                This will add new users and update existing ones. No users will be deleted.
                            </Alert>
                            {syncMutation.isLoading && (
                                <div className="text-center py-4">
                                    <Spinner animation="border" variant="primary" className="mb-3" />
                                    <p className="mb-0">Syncing with external database...</p>
                                    <small className="text-muted">This may take a few moments</small>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="text-center py-3">
                            <div className="mb-4">
                                <i className="bi bi-check-circle-fill text-success" style={{ fontSize: '3rem' }}></i>
                                <h4 className="mt-2">Synchronization Complete!</h4>
                            </div>
                            <Row className="g-3">
                                <Col xs={6}>
                                    <Card className="border-0 bg-opacity-10 bg-primary text-primary py-3">
                                        <h3 className="mb-0 fw-bold">{syncResult.added}</h3>
                                        <small>New Users</small>
                                    </Card>
                                </Col>
                                <Col xs={6}>
                                    <Card className="border-0 bg-opacity-10 bg-info text-info py-3">
                                        <h3 className="mb-0 fw-bold">{syncResult.updated}</h3>
                                        <small>Updated</small>
                                    </Card>
                                </Col>
                            </Row>
                        </div>
                    )}
                </Modal.Body>
                <Modal.Footer style={{ background: 'var(--gradient-card)', borderTop: '1px solid var(--border-primary)' }}>
                    {!syncResult ? (
                        <>
                            <Button variant="secondary" onClick={() => setShowSyncModal(false)} disabled={syncMutation.isLoading}>
                                Cancel
                            </Button>
                            <Button variant="primary" onClick={confirmSync} disabled={syncMutation.isLoading}>
                                {syncMutation.isLoading ? 'Syncing...' : 'Start Synchronize'}
                            </Button>
                        </>
                    ) : (
                        <Button variant="primary" onClick={() => setShowSyncModal(false)}>
                            Close
                        </Button>
                    )}
                </Modal.Footer>
            </Modal>

            {/* Delete User Modal */}
            <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)} className="fade-in">
                <Modal.Header closeButton style={{ background: 'var(--gradient-card)', borderBottom: '1px solid var(--border-primary)' }}>
                    <Modal.Title style={{ color: 'var(--text-primary)' }}>
                        <i className="bi bi-exclamation-triangle me-2" style={{ color: '#ff6b6b' }}></i>
                        Delete User
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body style={{ background: 'var(--bg-card)', color: 'var(--text-primary)' }}>
                    {deletingUser && (
                        <>
                            <Alert variant="danger" className="bg-opacity-10 border-danger text-danger mb-3">
                                <i className="bi bi-exclamation-circle me-2"></i>
                                This action cannot be undone!
                            </Alert>
                            <p>Are you sure you want to delete this user?</p>
                            <Card className="border-0 bg-opacity-10 bg-secondary p-3" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                                <div className="mb-2">
                                    <strong style={{ color: 'var(--text-primary)' }}>Name:</strong>
                                    <br />
                                    <span className="text-muted">{deletingUser.name}</span>
                                </div>
                                <div className="mb-2">
                                    <strong style={{ color: 'var(--text-primary)' }}>Employee ID:</strong>
                                    <br />
                                    <span className="text-muted">{deletingUser.employee_id}</span>
                                </div>
                                <div>
                                    <strong style={{ color: 'var(--text-primary)' }}>Role:</strong>
                                    <br />
                                    <span className={`badge px-2 py-1 ${deletingUser.role === 'admin' ? 'bg-danger' : 'bg-primary'} bg-opacity-10 text-${deletingUser.role === 'admin' ? 'danger' : 'primary'}`}>
                                        {deletingUser.role}
                                    </span>
                                </div>
                            </Card>
                        </>
                    )}
                </Modal.Body>
                <Modal.Footer style={{ background: 'var(--gradient-card)', borderTop: '1px solid var(--border-primary)' }}>
                    <Button variant="secondary" onClick={() => setShowDeleteModal(false)} disabled={deleteMutation.isLoading}>
                        Cancel
                    </Button>
                    <Button variant="danger" onClick={confirmDelete} disabled={deleteMutation.isLoading}>
                        {deleteMutation.isLoading ? (
                            <>
                                <Spinner animation="border" size="sm" className="me-2" />
                                Deleting...
                            </>
                        ) : (
                            <>
                                <i className="bi bi-trash me-2"></i>
                                Delete User
                            </>
                        )}
                    </Button>
                </Modal.Footer>
            </Modal>
        </Container>
    )
}

export default Users