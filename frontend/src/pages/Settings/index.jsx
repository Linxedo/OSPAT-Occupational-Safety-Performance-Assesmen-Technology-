import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { Container, Spinner } from 'react-bootstrap'
import { adminService } from '../../services/adminService'
import SettingsHeader from './components/SettingsHeader'
import SettingsTabs from './components/SettingsTabs'
import ScoreSettings from './components/ScoreSettings'
import MinigameSettings from './components/MinigameSettings'
import QuestionsManagement from './components/QuestionsManagement'
import QuestionModal from './components/QuestionModal'
import DeleteModal from './components/DeleteModal'
import ToastNotification from './components/ToastNotification'

const Settings = () => {
    const [activeTab, setActiveTab] = useState('settings')
    const [showToast, setShowToast] = useState(false)
    const [toastMessage, setToastMessage] = useState('')
    const [toastVariant, setToastVariant] = useState('success')
    const [showQuestionModal, setShowQuestionModal] = useState(false)
    const [editingQuestion, setEditingQuestion] = useState(null)
    const [showDeleteModal, setShowDeleteModal] = useState(false)
    const [questionToDelete, setQuestionToDelete] = useState(null)

    const queryClient = useQueryClient()

    const { data: settingsData, isLoading: settingsLoading, error: settingsError } = useQuery('settings', adminService.getSettings)
    const { data: questionsData, isLoading: questionsLoading } = useQuery('questions', adminService.getQuestions)

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
            setEditingQuestion(null)
            showToastNotification('Question created successfully!')
        }
    })

    const updateQuestionMutation = useMutation(
        ({ id, data }) => adminService.updateQuestion(id, data),
        {
            onSuccess: () => {
                queryClient.invalidateQueries('questions')
                setShowQuestionModal(false)
                setEditingQuestion(null)
                showToastNotification('Question updated successfully!')
            }
        }
    )

    const deleteQuestionMutation = useMutation(adminService.deleteQuestion, {
        onSuccess: () => {
            queryClient.invalidateQueries('questions')
            setShowDeleteModal(false)
            setQuestionToDelete(null)
            showToastNotification('Question deleted successfully!')
        }
    })

    const showToastNotification = (message, variant = 'success') => {
        setToastMessage(message)
        setToastVariant(variant)
        setShowToast(true)
    }

    const handleScoreSettingsSubmit = (data) => {
        const scoreData = {
            minimum_passing_score: data.minimum_passing_score,
            hard_mode_threshold: data.hard_mode_threshold
        }
        updateSettingsMutation.mutate(scoreData)
    }

    const handleMinigameSettingsSubmit = (data) => {
        // Explicitly extract and sanitize ALL fields to be 1000% sure they are correct
        const minigameData = {
            // Minigame 1
            mg1_enabled: Boolean(data.mg1_enabled),
            mg1_speed_normal: Number(data.mg1_speed_normal),
            mg1_speed_hard: Number(data.mg1_speed_hard),

            // Minigame 2 - The one with reporting issues
            mg2_enabled: Boolean(data.mg2_enabled),
            mg2_rounds: Number(data.mg2_rounds),
            mg2_speed_normal: Number(data.mg2_speed_normal),
            mg2_speed_hard: Number(data.mg2_speed_hard),

            // Minigame 3
            mg3_enabled: Boolean(data.mg3_enabled),
            mg3_rounds: Number(data.mg3_rounds),
            mg3_time_normal: Number(data.mg3_time_normal),
            mg3_time_hard: Number(data.mg3_time_hard),

            // Minigame 4
            mg4_enabled: Boolean(data.mg4_enabled),
            mg4_time_normal: Number(data.mg4_time_normal),
            mg4_time_hard: Number(data.mg4_time_hard),

            // Minigame 5
            mg5_enabled: Boolean(data.mg5_enabled),
            mg5_time_normal: Number(data.mg5_time_normal),
            mg5_time_hard: Number(data.mg5_time_hard)
        }

        console.log('Sending minigame settings update:', minigameData);
        updateSettingsMutation.mutate(minigameData)
    }

    const handleQuestionSubmit = (data) => {
        if (editingQuestion) {
            updateQuestionMutation.mutate({ id: editingQuestion.question_id, data })
        } else {
            createQuestionMutation.mutate(data)
        }
    }

    const handleEditQuestion = (question) => {
        setEditingQuestion(question)
        setShowQuestionModal(true)
    }

    const handleAddQuestion = () => {
        setEditingQuestion(null)
        setShowQuestionModal(true)
    }

    const handleDeleteQuestion = (question) => {
        setQuestionToDelete(question)
        setShowDeleteModal(true)
    }

    const confirmDeleteQuestion = () => {
        if (questionToDelete) {
            deleteQuestionMutation.mutate(questionToDelete.question_id)
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

    const settings = settingsData?.data || {}
    const questions = questionsData?.data || []

    return (
        <Container fluid style={{ minHeight: '100vh', backgroundColor: 'var(--bg-primary)', padding: '2rem' }}>
            <SettingsHeader />

            <SettingsTabs activeTab={activeTab} onTabChange={setActiveTab} />

            {activeTab === 'settings' && (
                <ScoreSettings
                    settings={settings}
                    onSubmit={handleScoreSettingsSubmit}
                    loading={updateSettingsMutation.isLoading}
                />
            )}

            {activeTab === 'minigame' && (
                <MinigameSettings
                    settings={settings}
                    onSubmit={handleMinigameSettingsSubmit}
                    loading={updateSettingsMutation.isLoading}
                />
            )}

            {activeTab === 'questions' && (
                <QuestionsManagement
                    questions={questions}
                    onAddQuestion={handleAddQuestion}
                    onEditQuestion={handleEditQuestion}
                    onDeleteQuestion={handleDeleteQuestion}
                />
            )}

            <QuestionModal
                show={showQuestionModal}
                onHide={() => {
                    setShowQuestionModal(false)
                    setEditingQuestion(null)
                }}
                editingQuestion={editingQuestion}
                onSubmit={handleQuestionSubmit}
                loading={createQuestionMutation.isLoading || updateQuestionMutation.isLoading}
            />

            <DeleteModal
                show={showDeleteModal}
                onHide={cancelDeleteQuestion}
                onConfirm={confirmDeleteQuestion}
                question={questionToDelete}
                loading={deleteQuestionMutation.isLoading}
            />

            <ToastNotification
                show={showToast}
                onClose={() => setShowToast(false)}
                message={toastMessage}
                variant={toastVariant}
            />
        </Container>
    )
}

export default Settings
