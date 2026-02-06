import React, { useEffect } from 'react'
import { Card, Form, Button, Row, Col } from 'react-bootstrap'
import { useForm } from 'react-hook-form'

const MinigameSettings = ({ settings, onSubmit, loading }) => {
    const settingsForm = useForm()

    useEffect(() => {
        if (settings && !settingsForm.formState.isDirty) {
            settingsForm.reset(settings)
        }
    }, [settings, settingsForm])

    const handleFormSubmit = (data) => {
        onSubmit(data)
    }

    // Generate speed levels (1-10 where 1=2500ms, 10=250ms)
    const speedLevels = Array.from({ length: 10 }, (_, i) => {
        const level = i + 1
        const speed = 2500 - (level - 1) * 250
        return {
            value: speed,
            label: `Level ${level} (${speed}ms)`
        }
    })

    const minigames = [
        {
            key: 'mg1',
            name: 'Minigame 1 - Reaction Speed',
            fields: [
                { key: 'enabled', label: 'Enable', type: 'switch', col: 4 },
                { key: 'speed_normal', label: 'Normal Speed', type: 'select', col: 4 },
                { key: 'speed_hard', label: 'Hard Speed', type: 'select', col: 4 }
            ]
        },
        {
            key: 'mg2',
            name: 'Minigame 2 - Color Matching',
            fields: [
                { key: 'enabled', label: 'Enable', type: 'switch', col: 3 },
                { key: 'rounds', label: 'Rounds', type: 'number', col: 3 },
                { key: 'speed_normal', label: 'Normal Speed', type: 'select', col: 3 },
                { key: 'speed_hard', label: 'Hard Speed', type: 'select', col: 3 }
            ]
        },
        {
            key: 'mg3',
            name: 'Minigame 3 - Memory Test',
            fields: [
                { key: 'enabled', label: 'Enable', type: 'switch', col: 3 },
                { key: 'rounds', label: 'Rounds', type: 'number', col: 3 },
                { key: 'time_normal', label: 'Normal Speed', type: 'select', col: 3 },
                { key: 'time_hard', label: 'Hard Speed', type: 'select', col: 3 }
            ]
        },
        {
            key: 'mg4',
            name: 'Minigame 4 - Rhythm Game OSU',
            fields: [
                { key: 'enabled', label: 'Enable', type: 'switch', col: 4 },
                { key: 'time_normal', label: 'Normal Speed', type: 'select', col: 4 },
                { key: 'time_hard', label: 'Hard Speed', type: 'select', col: 4 }
            ]
        },
        {
            key: 'mg5',
            name: 'Minigame 5 - Shape Game',
            fields: [
                { key: 'enabled', label: 'Enable', type: 'switch', col: 4 },
                { key: 'time_normal', label: 'Normal Speed', type: 'select', col: 4 },
                { key: 'time_hard', label: 'Hard Speed', type: 'select', col: 4 }
            ]
        }
    ]

    return (
        <Card className="border-0 shadow-sm" style={{ background: 'var(--bg-card)' }}>
            <Card.Body>
                <Form onSubmit={settingsForm.handleSubmit(handleFormSubmit)}>
                    {minigames.map((minigame) => (
                        <div key={minigame.key}>
                            <h5 className="mb-3" style={{ color: 'var(--text-primary)' }}>{minigame.name}</h5>
                            <Row className="mb-4">
                                {minigame.fields.map((field) => (
                                    <Col key={field.key} md={field.col}>
                                        {field.type === 'switch' ? (
                                            <Form.Check
                                                type="switch"
                                                label={field.label}
                                                {...settingsForm.register(`${minigame.key}_${field.key}`)}
                                                style={{ color: 'var(--text-primary)' }}
                                            />
                                        ) : field.type === 'select' ? (
                                            <Form.Group>
                                                <Form.Label style={{ color: 'var(--text-primary)' }}>{field.label}</Form.Label>
                                                <Form.Select
                                                    {...settingsForm.register(`${minigame.key}_${field.key}`, { valueAsNumber: true })}
                                                    style={{
                                                        backgroundColor: 'var(--bg-tertiary)',
                                                        borderColor: 'var(--border-secondary)',
                                                        color: 'var(--text-primary)'
                                                    }}
                                                >
                                                    {speedLevels.map((level) => (
                                                        <option key={level.value} value={level.value}>
                                                            {level.label}
                                                        </option>
                                                    ))}
                                                </Form.Select>
                                            </Form.Group>
                                        ) : (
                                            <Form.Group>
                                                <Form.Label style={{ color: 'var(--text-primary)' }}>{field.label}</Form.Label>
                                                <Form.Control
                                                    type="number"
                                                    {...settingsForm.register(`${minigame.key}_${field.key}`, { valueAsNumber: true })}
                                                    style={{
                                                        backgroundColor: 'var(--bg-tertiary)',
                                                        borderColor: 'var(--border-secondary)',
                                                        color: 'var(--text-primary)'
                                                    }}
                                                />
                                            </Form.Group>
                                        )}
                                    </Col>
                                ))}
                            </Row>
                        </div>
                    ))}

                    <Button
                        type="submit"
                        disabled={loading}
                        style={{
                            backgroundColor: 'var(--accent-primary)',
                            borderColor: 'var(--accent-primary)'
                        }}
                    >
                        {loading ? 'Saving...' : 'Update Minigame Settings'}
                    </Button>
                </Form>
            </Card.Body>
        </Card>
    )
}

export default MinigameSettings
