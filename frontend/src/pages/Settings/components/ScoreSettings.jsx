import React, { useEffect } from 'react'
import { Card, Form, Button, Row, Col } from 'react-bootstrap'
import { useForm } from 'react-hook-form'

const ScoreSettings = ({ settings, onSubmit, loading }) => {
    const settingsForm = useForm()

    useEffect(() => {
        if (settings && !settingsForm.formState.isDirty) {
            settingsForm.reset(settings)
        }
    }, [settings, settingsForm])

    const handleFormSubmit = (data) => {
        onSubmit(data)
    }

    return (
        <Card className="border-0 shadow-sm" style={{ background: 'var(--bg-card)' }}>
            <Card.Body>
                <Form onSubmit={settingsForm.handleSubmit(handleFormSubmit)}>
                    <Row>
                        <Col md={12}>
                            <h6 className="mt-4 mb-3" style={{ color: 'var(--accent-primary)', fontWeight: '600' }}>Score Settings For S.T.E.V.E</h6>
                        </Col>
                        <Col md={6}>
                            <Form.Group className="mb-3">
                                <Form.Label style={{ color: 'var(--text-primary)' }}>Minimum Passing Score</Form.Label>
                                <Form.Control
                                    type="number"
                                    {...settingsForm.register('minimum_passing_score', { valueAsNumber: true })}
                                    style={{
                                        backgroundColor: 'var(--bg-tertiary)',
                                        borderColor: 'var(--border-secondary)',
                                        color: 'var(--text-primary)'
                                    }}
                                />
                            </Form.Group>
                        </Col>
                        <Col md={6}>
                            <Form.Group className="mb-3">
                                <Form.Label style={{ color: 'var(--text-primary)' }}>Hard Mode Threshold</Form.Label>
                                <Form.Control
                                    type="number"
                                    {...settingsForm.register('hard_mode_threshold', { valueAsNumber: true })}
                                    style={{
                                        backgroundColor: 'var(--bg-tertiary)',
                                        borderColor: 'var(--border-secondary)',
                                        color: 'var(--text-primary)'
                                    }}
                                />
                            </Form.Group>
                        </Col>
                    </Row>

                    <Row className="mt-3">
                        <Col md={12}>
                            <h6 className="mb-3" style={{ color: 'var(--accent-primary)', fontWeight: '600' }}>Minigame Reward Settings</h6>
                        </Col>

                        {/* Minigame 1 */}
                        <Col md={4}>
                            <Form.Group className="mb-3">
                                <Form.Label style={{ color: 'var(--text-primary)' }}>Reaction Speed : Score per Hit</Form.Label>
                                <Form.Control
                                    type="number"
                                    {...settingsForm.register('mg1_score_hit', { valueAsNumber: true, min: 1 })}
                                    style={{
                                        backgroundColor: 'var(--bg-tertiary)',
                                        borderColor: 'var(--border-secondary)',
                                        color: 'var(--text-primary)'
                                    }}
                                />
                            </Form.Group>
                        </Col>

                        {/* Minigame 2 */}
                        <Col md={4}>
                            <Form.Group className="mb-3">
                                <Form.Label style={{ color: 'var(--text-primary)' }}>Reaction Time : Max Reaction Score</Form.Label>
                                <Form.Control
                                    type="number"
                                    {...settingsForm.register('mg2_score_max', { valueAsNumber: true, min: 1 })}
                                    style={{
                                        backgroundColor: 'var(--bg-tertiary)',
                                        borderColor: 'var(--border-secondary)',
                                        color: 'var(--text-primary)'
                                    }}
                                />
                            </Form.Group>
                        </Col>

                        {/* Minigame 3 */}
                        <Col md={4}>
                            <Form.Group className="mb-3">
                                <Form.Label style={{ color: 'var(--text-primary)' }}>Memory : Score per Round</Form.Label>
                                <Form.Control
                                    type="number"
                                    {...settingsForm.register('mg3_score_round', { valueAsNumber: true, min: 1 })}
                                    style={{
                                        backgroundColor: 'var(--bg-tertiary)',
                                        borderColor: 'var(--border-secondary)',
                                        color: 'var(--text-primary)'
                                    }}
                                />
                            </Form.Group>
                        </Col>

                        {/* Minigame 4 */}
                        <Col md={6}>
                            <Form.Group className="mb-3">
                                <Form.Label style={{ color: 'var(--text-primary)' }}>OSU : Max Rhythm Score</Form.Label>
                                <Form.Control
                                    type="number"
                                    {...settingsForm.register('mg4_score_max', { valueAsNumber: true, min: 1 })}
                                    style={{
                                        backgroundColor: 'var(--bg-tertiary)',
                                        borderColor: 'var(--border-secondary)',
                                        color: 'var(--text-primary)'
                                    }}
                                />
                            </Form.Group>
                        </Col>

                        {/* Minigame 5 */}
                        <Col md={6}>
                            <Form.Group className="mb-3">
                                <Form.Label style={{ color: 'var(--text-primary)' }}>Shape Matching : Score per Match</Form.Label>
                                <Form.Control
                                    type="number"
                                    {...settingsForm.register('mg5_score_hit', { valueAsNumber: true, min: 1 })}
                                    style={{
                                        backgroundColor: 'var(--bg-tertiary)',
                                        borderColor: 'var(--border-secondary)',
                                        color: 'var(--text-primary)'
                                    }}
                                />
                            </Form.Group>
                        </Col>
                    </Row>

                    <Button
                        type="submit"
                        disabled={loading}
                        className="mt-4"
                        style={{
                            backgroundColor: 'var(--accent-primary)',
                            borderColor: 'var(--accent-primary)',
                            padding: '10px 25px',
                            fontWeight: '600'
                        }}
                    >
                        {loading ? 'Saving...' : 'Update Score Configuration'}
                    </Button>
                </Form>
            </Card.Body>
        </Card>
    )
}

export default ScoreSettings
