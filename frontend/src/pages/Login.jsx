import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { Container, Card, Form, Button, Alert, Spinner } from 'react-bootstrap'
import { useAuth } from '../contexts/AuthContext'

const Login = () => {
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const { login } = useAuth()
    const navigate = useNavigate()

    const { register, handleSubmit, formState: { errors } } = useForm()

    const onSubmit = async (data) => {
        setLoading(true)
        setError('')

        try {
            const result = await login(data)

            if (result.success) {
                navigate('/dashboard')
            } else {
                setError(result.message || 'Login failed')
            }
        } catch (error) {
            setError(error.message || 'Login failed')
        }

        setLoading(false)
    }

    return (
        <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
            <Container>
                <div className="row justify-content-center">
                    <div className="col-md-6 col-lg-4">
                        <Card className="border-0 shadow-lg fade-in" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-primary)' }}>
                            <Card.Body className="p-4">
                                <div className="text-center mb-4">
                                    <div className="mb-4">
                                        <img
                                            src="/logo_sma.png"
                                            alt="OSPAT Logo"
                                            style={{
                                                width: '350px',
                                                height: 'auto',
                                                maxHeight: '350px',
                                                objectFit: 'contain'
                                            }}
                                        />
                                    </div>
                                    <h2 className="mb-2 fw-bold" style={{ color: 'var(--text-primary)' }}>S.T.E.V.E</h2>
                                    <p className="text-muted" style={{ color: 'var(--text-muted)' }}>Safety Technology for Early Vulnerability Evaluation</p>
                                </div>

                                {error && (
                                    <Alert variant="danger" className="mb-4 fade-in">
                                        {error}
                                    </Alert>
                                )}

                                <Form onSubmit={handleSubmit(onSubmit)}>
                                    <Form.Group className="mb-3">
                                        <Form.Label className="fw-semibold" style={{ color: 'var(--text-primary)' }}>
                                            Employee ID
                                        </Form.Label>
                                        <Form.Control
                                            type="text"
                                            {...register('employee_id', { required: 'Employee ID is required' })}
                                            placeholder="Enter employee ID"
                                            isInvalid={!!errors.employee_id}
                                            className="form-control-lg"
                                            style={{
                                                background: 'var(--bg-tertiary)',
                                                border: '1px solid var(--border-primary)',
                                                color: 'var(--text-primary)'
                                            }}
                                        />
                                        <Form.Control.Feedback type="invalid">
                                            {errors.employee_id?.message}
                                        </Form.Control.Feedback>
                                    </Form.Group>

                                    <Form.Group className="mb-4">
                                        <Form.Label className="fw-semibold" style={{ color: 'var(--text-primary)' }}>
                                            Password
                                        </Form.Label>
                                        <Form.Control
                                            type="password"
                                            {...register('password', { required: 'Password is required' })}
                                            placeholder="Enter password"
                                            isInvalid={!!errors.password}
                                            className="form-control-lg"
                                            style={{
                                                background: 'var(--bg-tertiary)',
                                                border: '1px solid var(--border-primary)',
                                                color: 'var(--text-primary)'
                                            }}
                                        />
                                        <Form.Control.Feedback type="invalid">
                                            {errors.password?.message}
                                        </Form.Control.Feedback>
                                    </Form.Group>

                                    <Button
                                        type="submit"
                                        className="w-100 btn-lg hover-lift"
                                        disabled={loading}
                                        variant="primary"
                                    >
                                        {loading ? (
                                            <>
                                                <Spinner size="sm" className="me-2" />
                                                Logging in...
                                            </>
                                        ) : (
                                            'Login'
                                        )}
                                    </Button>
                                </Form>

                                <div className="text-center mt-4">
                                    <small className="text-muted" style={{ color: 'var(--text-muted)' }}>
                                        Enter your credentials to access the system
                                    </small>
                                </div>
                            </Card.Body>
                        </Card>
                    </div>
                </div>
            </Container>
        </div>
    )
}

export default Login
