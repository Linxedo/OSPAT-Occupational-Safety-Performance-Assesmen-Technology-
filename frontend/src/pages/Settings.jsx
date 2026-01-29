import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { Container, Row, Col, Card, Button, Modal, Form, Spinner, Alert, Table, Badge, Toast } from 'react-bootstrap'
import { useForm, useFieldArray } from 'react-hook-form'
import { adminService } from '../services/adminService'

const Settings = () => {
    const [showQuestionModal, setShowQuestionModal] = useState(false)
    const [editingQuestion, setEditingQuestion] = useState(null)
    const [activeTab, setActiveTab] = useState('settings')
    const [showToast, setShowToast] = useState(false)
    const [toastMessage, setToastMessage] = useState('')
    const [toastVariant, setToastVariant] = useState('success')
    const [showDeleteModal, setShowDeleteModal] = useState(false)
    const [questionToDelete, setQuestionToDelete] = useState(null)

    const queryClient = useQueryClient()

    // Fetching Data
    const { data: settingsData, isLoading: settingsLoading, error: settingsError } = useQuery('settings', adminService.getSettings)
    const { data: questionsData, isLoading: questionsLoading } = useQuery('questions', adminService.getQuestions)

    // Form Instance for Questions (Modal)
    const { register, handleSubmit, reset, control, formState: { errors } } = useForm({
        defaultValues: {
            question_text: '',
            answers: [{ answer_text: '', score: 0 }]
        }
    })
    const { fields, append, remove } = useFieldArray({ control, name: 'answers' })

    // Form Instance for Settings (Score & Minigames)
    const settingsForm = useForm()

    // Sync settings data from API to Form
    useEffect(() => {
        if (settingsData?.data && !settingsForm.formState.isDirty) {
            settingsForm.reset(settingsData.data)
        }
    }, [settingsData])

    const showToastNotification = (message, variant = 'success') => {
        setToastMessage(message)
        setToastVariant(variant)
        setShowToast(true)
    }

    // Mutations
    const updateSettingsMutation = useMutation(adminService.updateSettings, {
        onMutate: async (newSettings) => {
            await queryClient.cancelQueries('settings')
            const previousSettings = queryClient.getQueryData('settings')
            queryClient.setQueryData('settings', (old) => ({
                ...old,
                data: { ...old?.data, ...newSettings }
            }))
            return { previousSettings }
        },
        onSuccess: (response) => {
            queryClient.invalidateQueries('settings')
            showToastNotification('Settings updated successfully!')
        },
        onError: (error, variables, context) => {
            if (context?.previousSettings) {
                queryClient.setQueryData('settings', context.previousSettings)
            }
            console.error('Update Error:', error)
            showToastNotification('Failed to update settings', 'danger')
        }
    })

    const createQuestionMutation = useMutation(adminService.createQuestion, {
        onSuccess: () => {
            queryClient.invalidateQueries('questions')
            setShowQuestionModal(false)
            reset()
            showToastNotification('Question created successfully!')
        }
    })

    const updateQuestionMutation = useMutation(
        ({ id, data }) => adminService.updateQuestion(id, data),
        {
            onSuccess: () => {
                queryClient.invalidateQueries('questions')
                setShowQuestionModal(false)
                showToastNotification('Question updated successfully!')
            }
        }
    )

    const deleteQuestionMutation = useMutation(adminService.deleteQuestion, {
        onSuccess: () => {
            queryClient.invalidateQueries('questions')
            showToastNotification('Question deleted successfully!')
        }
    })

    // Handlers
    const onScoreSettingsSubmit = (data) => {
        const scoreData = {
            minimum_passing_score: data.minimum_passing_score,
            hard_mode_threshold: data.hard_mode_threshold
        }
        console.log('Submitting score settings:', scoreData)
        updateSettingsMutation.mutate(scoreData)
    }

    const onMinigameSettingsSubmit = (data) => {
        const minigameData = {
            mg1_enabled: data.mg1_enabled,
            mg1_speed_normal: data.mg1_speed_normal,
            mg1_speed_hard: data.mg1_speed_hard,
            mg2_enabled: data.mg2_enabled,
            mg2_speed_normal: data.mg2_speed_normal,
            mg2_speed_hard: data.mg2_speed_hard,
            mg3_enabled: data.mg3_enabled,
            mg3_rounds: data.mg3_rounds,
            mg3_time_normal: data.mg3_time_normal,
            mg3_time_hard: data.mg3_time_hard,
            mg4_enabled: data.mg4_enabled,
            mg4_time_normal: data.mg4_time_normal,
            mg4_time_hard: data.mg4_time_hard,
            mg5_enabled: data.mg5_enabled,
            mg5_time_normal: data.mg5_time_normal,
            mg5_time_hard: data.mg5_time_hard
        }
        console.log('Submitting minigame settings:', minigameData)
        updateSettingsMutation.mutate(minigameData)
    }

    const onQuestionSubmit = (data) => {
        if (editingQuestion) {
            updateQuestionMutation.mutate({ id: editingQuestion.question_id, data })
        } else {
            createQuestionMutation.mutate(data)
        }
    }

    const handleEditQuestion = (question) => {
        setEditingQuestion(question)
        reset({
            question_text: question.question_text,
            answers: question.answers?.length > 0 ? question.answers : [{ answer_text: '', score: 0 }]
        })
        setShowQuestionModal(true)
    }

    const handleDeleteQuestion = (question) => {
        setQuestionToDelete(question)
        setShowDeleteModal(true)
    }

    const confirmDeleteQuestion = () => {
        if (questionToDelete) {
            deleteQuestionMutation.mutate(questionToDelete.question_id)
            setShowDeleteModal(false)
            setQuestionToDelete(null)
        }
    }

    const cancelDeleteQuestion = () => {
        setShowDeleteModal(false)
        setQuestionToDelete(null)
    }

    if (settingsLoading || questionsLoading) {
        return (
            <Container className="d-flex justify-content-center align-items-center" style={{ height: '60vh' }}>
                <Spinner animation="border" variant="primary" />
            </Container>
        )
    }

    const questions = questionsData?.data || []

    return (
        <Container fluid style={{ minHeight: '100vh', backgroundColor: 'var(--bg-primary)', padding: '2rem' }}>
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h2 className="fw-bold mb-0" style={{ color: 'var(--text-primary)' }}>Settings</h2>
            </div>

            {/* Tab Navigation */}
            <Card className="border-0 shadow-sm mb-4" style={{ background: 'var(--bg-card)' }}>
                <Card.Body className="p-0 d-flex">
                    {['settings', 'minigame', 'questions'].map((tab) => (
                        <Button
                            key={tab}
                            className="rounded-0 border-0 flex-grow-1"
                            style={{
                                background: activeTab === tab ? 'var(--accent-primary)' : 'transparent',
                                color: activeTab === tab ? 'white' : 'var(--text-muted)',
                                padding: '12px'
                            }}
                            onClick={() => setActiveTab(tab)}
                        >
                            {tab === 'settings' ? 'Score Settings' :
                                tab === 'minigame' ? 'Minigame Settings' :
                                    tab.charAt(0).toUpperCase() + tab.slice(1) + ' Settings'}
                        </Button>
                    ))}
                </Card.Body>
            </Card>

            {/* Score Settings */}
            {activeTab === 'settings' && (
                <Card className="border-0 shadow-sm" style={{ background: 'var(--bg-card)' }}>
                    <Card.Body>
                        <Form onSubmit={settingsForm.handleSubmit(onScoreSettingsSubmit)}>
                            <Row>
                                <Col md={6}>
                                    <Form.Group className="mb-3">
                                        <Form.Label>Minimum Passing Score</Form.Label>
                                        <Form.Control type="number" {...settingsForm.register('minimum_passing_score', { valueAsNumber: true })} />
                                    </Form.Group>
                                </Col>
                                <Col md={6}>
                                    <Form.Group className="mb-3">
                                        <Form.Label>Hard Mode Threshold</Form.Label>
                                        <Form.Control type="number" {...settingsForm.register('hard_mode_threshold', { valueAsNumber: true })} />
                                    </Form.Group>
                                </Col>
                            </Row>
                            <Button type="submit" disabled={updateSettingsMutation.isLoading}>
                                {updateSettingsMutation.isLoading ? 'Saving...' : 'Update Score Settings'}
                            </Button>
                        </Form>
                    </Card.Body>
                </Card>
            )}

            {/* Minigame Settings */}
            {activeTab === 'minigame' && (
                <Card className="border-0 shadow-sm" style={{ background: 'var(--bg-card)' }}>
                    <Card.Body>
                        <Form onSubmit={settingsForm.handleSubmit(onMinigameSettingsSubmit)}>
                            {/* Minigame 1 */}
                            <h5 className="mb-3">Minigame 1 - Reaction Speed</h5>
                            <Row className="mb-4">
                                <Col md={4}>
                                    <Form.Check type="switch" label="Enable" {...settingsForm.register('mg1_enabled')} />
                                </Col>
                                <Col md={4}>
                                    <Form.Label>Normal (ms)</Form.Label>
                                    <Form.Control type="number" {...settingsForm.register('mg1_speed_normal', { valueAsNumber: true })} />
                                </Col>
                                <Col md={4}>
                                    <Form.Label>Hard (ms)</Form.Label>
                                    <Form.Control type="number" {...settingsForm.register('mg1_speed_hard', { valueAsNumber: true })} />
                                </Col>
                            </Row>

                            {/* Minigame 2 */}
                            <h5 className="mb-3">Minigame 2 - Color Matching</h5>
                            <Row className="mb-4">
                                <Col md={4}>
                                    <Form.Check type="switch" label="Enable" {...settingsForm.register('mg2_enabled')} />
                                </Col>
                                <Col md={4}>
                                    <Form.Label>Normal (ms)</Form.Label>
                                    <Form.Control type="number" {...settingsForm.register('mg2_speed_normal', { valueAsNumber: true })} />
                                </Col>
                                <Col md={4}>
                                    <Form.Label>Hard (ms)</Form.Label>
                                    <Form.Control type="number" {...settingsForm.register('mg2_speed_hard', { valueAsNumber: true })} />
                                </Col>
                            </Row>

                            {/* Minigame 3 */}
                            <h5 className="mb-3">Minigame 3 - Memory Test</h5>
                            <Row className="mb-4">
                                <Col md={3}>
                                    <Form.Check type="switch" label="Enable" {...settingsForm.register('mg3_enabled')} />
                                </Col>
                                <Col md={3}>
                                    <Form.Label>Rounds</Form.Label>
                                    <Form.Control type="number" {...settingsForm.register('mg3_rounds', { valueAsNumber: true })} />
                                </Col>
                                <Col md={3}>
                                    <Form.Label>Normal (ms)</Form.Label>
                                    <Form.Control type="number" {...settingsForm.register('mg3_time_normal', { valueAsNumber: true })} />
                                </Col>
                                <Col md={3}>
                                    <Form.Label>Hard (ms)</Form.Label>
                                    <Form.Control type="number" {...settingsForm.register('mg3_time_hard', { valueAsNumber: true })} />
                                </Col>
                            </Row>

                            {/* Minigame 4 */}
                            <h5 className="mb-3">Minigame 4 - Rhythm Game OSU</h5>
                            <Row className="mb-4">
                                <Col md={4}>
                                    <Form.Check type="switch" label="Enable" {...settingsForm.register('mg4_enabled')} />
                                </Col>
                                <Col md={4}>
                                    <Form.Label>Normal (ms)</Form.Label>
                                    <Form.Control type="number" {...settingsForm.register('mg4_time_normal', { valueAsNumber: true })} />
                                </Col>
                                <Col md={4}>
                                    <Form.Label>Hard (ms)</Form.Label>
                                    <Form.Control type="number" {...settingsForm.register('mg4_time_hard', { valueAsNumber: true })} />
                                </Col>
                            </Row>

                            {/* Minigame 5 */}
                            <h5 className="mb-3">Minigame 5 - Shape Game</h5>
                            <Row className="mb-4">
                                <Col md={4}>
                                    <Form.Check type="switch" label="Enable" {...settingsForm.register('mg5_enabled')} />
                                </Col>
                                <Col md={4}>
                                    <Form.Label>Normal (ms)</Form.Label>
                                    <Form.Control type="number" {...settingsForm.register('mg5_time_normal', { valueAsNumber: true })} />
                                </Col>
                                <Col md={4}>
                                    <Form.Label>Hard (ms)</Form.Label>
                                    <Form.Control type="number" {...settingsForm.register('mg5_time_hard', { valueAsNumber: true })} />
                                </Col>
                            </Row>

                            <Button type="submit" disabled={updateSettingsMutation.isLoading}>
                                Update Minigame Settings
                            </Button>
                        </Form>
                    </Card.Body>
                </Card>
            )}

            {/* Questions Table */}
            {activeTab === 'questions' && (
                <Card className="border-0 shadow-sm" style={{ background: 'var(--bg-card)' }}>
                    <Card.Header className="bg-transparent d-flex justify-content-between align-items-center">
                        <h5 className="mb-0">Questions Management</h5>
                        <Button onClick={() => { setEditingQuestion(null); reset(); setShowQuestionModal(true); }}>
                            Add Question
                        </Button>
                    </Card.Header>
                    <Card.Body>
                        <Table hover responsive>
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Question</th>
                                    <th>Answers</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {questions.map((q) => (
                                    <tr key={q.question_id}>
                                        <td>{q.question_id}</td>
                                        <td>{q.question_text}</td>
                                        <td>
                                            {q.answers?.map((a, i) => (
                                                <Badge key={i} bg="info" className="me-1">{a.answer_text} ({a.score})</Badge>
                                            ))}
                                        </td>
                                        <td>
                                            <Button size="sm" variant="outline-warning" className="me-2" onClick={() => handleEditQuestion(q)}>Edit</Button>
                                            <Button size="sm" variant="outline-danger" onClick={() => handleDeleteQuestion(q)}>Delete</Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    </Card.Body>
                </Card>
            )}

            {/* Question Modal */}
            <Modal show={showQuestionModal} onHide={() => setShowQuestionModal(false)}>
                <Modal.Header closeButton>
                    <Modal.Title>{editingQuestion ? 'Edit' : 'Add'} Question</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form onSubmit={handleSubmit(onQuestionSubmit)}>
                        <Form.Group className="mb-3">
                            <Form.Label>Question Text</Form.Label>
                            <Form.Control as="textarea" {...register('question_text', { required: true })} />
                        </Form.Group>
                        <Form.Label>Answers</Form.Label>
                        {fields.map((field, index) => (
                            <div key={field.id} className="d-flex gap-2 mb-2">
                                <Form.Control {...register(`answers.${index}.answer_text`)} placeholder="Answer" />
                                <Form.Control type="number" {...register(`answers.${index}.score`, { valueAsNumber: true })} style={{ width: '80px' }} />
                                <Button variant="outline-danger" onClick={() => remove(index)}>×</Button>
                            </div>
                        ))}
                        <Button variant="link" onClick={() => append({ answer_text: '', score: 0 })}>+ Add Answer</Button>
                        <hr />
                        <div className="d-flex justify-content-end gap-2">
                            <Button variant="secondary" onClick={() => setShowQuestionModal(false)}>Cancel</Button>
                            <Button type="submit">Save Question</Button>
                        </div>
                    </Form>
                </Modal.Body>
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal show={showDeleteModal} onHide={cancelDeleteQuestion} centered>
                <Modal.Header closeButton style={{ background: 'var(--bg-card)', borderBottom: '1px solid var(--border-color)' }}>
                    <Modal.Title style={{ color: 'var(--text-primary)' }}>
                        <i className="bi bi-exclamation-triangle-fill text-danger me-2"></i>
                        Confirm Delete
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body style={{ background: 'var(--bg-card)', color: 'var(--text-primary)' }}>
                    <p className="mb-3">Are you sure you want to delete this question?</p>
                    {questionToDelete && (
                        <div style={{
                            padding: '12px',
                            backgroundColor: 'var(--bg-tertiary)',
                            borderRadius: '8px',
                            border: '1px solid var(--border-color)'
                        }}>
                            <h6 className="mb-2" style={{ color: 'var(--text-primary)' }}>Question Details:</h6>
                            <p className="mb-1" style={{ color: 'var(--text-secondary)' }}>
                                <strong>ID:</strong> {questionToDelete.question_id}
                            </p>
                            <p className="mb-1" style={{ color: 'var(--text-secondary)' }}>
                                <strong>Question:</strong> {questionToDelete.question_text}
                            </p>
                            <p className="mb-0" style={{ color: 'var(--text-secondary)' }}>
                                <strong>Answers:</strong> {questionToDelete.answers?.length || 0} answer(s)
                            </p>
                        </div>
                    )}
                    <div className="mt-3" style={{ color: '#dc3545' }}>
                        <small>
                            <i className="bi bi-info-circle me-1"></i>
                            This action cannot be undone. The question will be permanently deleted.
                        </small>
                    </div>
                </Modal.Body>
                <Modal.Footer style={{ background: 'var(--bg-card)', borderTop: '1px solid var(--border-color)' }}>
                    <Button
                        variant="secondary"
                        onClick={cancelDeleteQuestion}
                        style={{
                            backgroundColor: 'var(--bg-tertiary)',
                            borderColor: 'var(--border-color)',
                            color: 'var(--text-primary)'
                        }}
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="danger"
                        onClick={confirmDeleteQuestion}
                        disabled={deleteQuestionMutation.isLoading}
                        style={{
                            backgroundColor: '#dc3545',
                            borderColor: '#dc3545'
                        }}
                    >
                        {deleteQuestionMutation.isLoading ? (
                            <>
                                <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" />
                                <span className="ms-2">Deleting...</span>
                            </>
                        ) : (
                            <>
                                <i className="bi bi-trash3 me-2"></i>
                                Delete Question
                            </>
                        )}
                    </Button>
                </Modal.Footer>
            </Modal>

            {/* Toast Notification */}
            <Toast
                onClose={() => setShowToast(false)}
                show={showToast}
                delay={3000}
                autohide
                style={{
                    position: 'fixed',
                    bottom: '20px',
                    right: '20px',
                    zIndex: 9999,
                    minWidth: '300px',
                    maxWidth: '400px',
                    backgroundColor: 'var(--bg-card)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
                }}
            >
                <Toast.Header
                    style={{
                        backgroundColor: toastVariant === 'success' ? '#28a745' :
                            toastVariant === 'danger' ? '#dc3545' :
                                '#17a2b8',
                        color: 'white',
                        borderBottom: 'none',
                        borderRadius: '8px 8px 0 0',
                        padding: '12px 16px'
                    }}
                    closeButton={false}
                >
                    <div className="d-flex align-items-center">
                        <span style={{ marginRight: '8px', fontSize: '16px' }}>
                            {toastVariant === 'success' ?
                                <i className="bi bi-check-circle-fill text-success"></i> :
                                toastVariant === 'danger' ?
                                    <i className="bi bi-x-circle-fill text-danger"></i> :
                                    <i className="bi bi-info-circle-fill text-info"></i>}
                        </span>
                        <strong className="me-auto">
                            {toastVariant === 'success' ? 'Success' :
                                toastVariant === 'danger' ? 'Error' : 'Info'}
                        </strong>
                        <button
                            type="button"
                            className="btn-close btn-close-white"
                            onClick={() => setShowToast(false)}
                            style={{
                                fontSize: '12px',
                                opacity: 0.8,
                                border: 'none',
                                background: 'none'
                            }}
                        />
                    </div>
                </Toast.Header>
                <Toast.Body
                    style={{
                        backgroundColor: 'var(--bg-card)',
                        color: 'var(--text-primary)',
                        padding: '16px',
                        borderRadius: '0 0 8px 8px'
                    }}
                >
                    <div className="d-flex align-items-start">
                        <span style={{
                            marginRight: '12px',
                            fontSize: '14px',
                            marginTop: '2px'
                        }}>
                            {toastVariant === 'success' ?
                                <i className="bi bi-emoji-smile-fill text-success"></i> :
                                toastVariant === 'danger' ?
                                    <i className="bi bi-exclamation-triangle-fill text-warning"></i> :
                                    <i className="bi bi-lightbulb-fill text-info"></i>}
                        </span>
                        <div style={{ flex: 1 }}>
                            {toastMessage}
                        </div>
                    </div>
                </Toast.Body>
            </Toast>
        </Container >
    )
}

export default Settings