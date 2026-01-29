const express = require('express');
const { body, validationResult } = require('express-validator');
const pool = require('../models/db');
const { validateApiKey } = require('../middleware/auth');
const rateLimit = require('express-rate-limit');

const router = express.Router();

// RATE LIMITING
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
    message: 'Too many requests',
    standardHeaders: true,
    legacyHeaders: false,
});

// APPLY MIDDLEWARE TO ALL ROUTES BELOW
router.use(validateApiKey);
router.use(apiLimiter);


// HELPER FUNCTIONS
async function saveAppSettings(settings) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        for (const [key, value] of Object.entries(settings)) {
            await client.query(
                `INSERT INTO app_settings (setting_key, setting_value) 
                 VALUES ($1, $2) 
                 ON CONFLICT (setting_key) 
                 DO UPDATE SET setting_value = $2`,
                [key, value.toString()]
            );
        }

        await client.query('COMMIT');
        console.log('Settings saved successfully:', Object.keys(settings).length, 'settings');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error saving settings:', err);
        throw err;
    } finally {
        client.release();
    }
}

// Helper to normalize Android naming to backend naming
const normalizeSettings = (settings) => {
    const normalized = { ...settings };
    
    // Map minigameX_enabled to mgX_enabled
    for (let i = 1; i <= 5; i++) {
        if (settings[`minigame${i}_enabled`] !== undefined) {
            normalized[`mg${i}_enabled`] = settings[`minigame${i}_enabled`];
        }
    }
    
    // Map minigame speed/time settings
    const mappings = {
        'minigame1_speed_normal': 'mg1_speed_normal',
        'minigame1_speed_hard': 'mg1_speed_hard',
        'minigame2_speed_normal': 'mg2_speed_normal',
        'minigame2_speed_hard': 'mg2_speed_hard',
        'minigame3_rounds': 'mg3_rounds',
        'minigame3_time_normal': 'mg3_time_normal',
        'minigame3_time_hard': 'mg3_time_hard',
        'minigame4_time_normal': 'mg4_time_normal',
        'minigame4_time_hard': 'mg4_time_hard',
        'minigame5_time_normal': 'mg5_time_normal',
        'minigame5_time_hard': 'mg5_time_hard'
    };
    
    Object.entries(mappings).forEach(([android, backend]) => {
        if (settings[android] !== undefined) {
            normalized[backend] = settings[android];
        }
    });
    
    return normalized;
};

// Helper to convert backend naming to Android naming
const toAndroidSettings = (settings) => {
    const android = { ...settings };
    
    // Map mgX_enabled to minigameX_enabled
    for (let i = 1; i <= 5; i++) {
        if (settings[`mg${i}_enabled`] !== undefined) {
            android[`minigame${i}_enabled`] = settings[`mg${i}_enabled`];
        }
    }
    
    // Map speed/time settings
    const mappings = {
        'mg1_speed_normal': 'minigame1_speed_normal',
        'mg1_speed_hard': 'minigame1_speed_hard',
        'mg2_speed_normal': 'minigame2_speed_normal',
        'mg2_speed_hard': 'minigame2_speed_hard',
        'mg3_rounds': 'minigame3_rounds',
        'mg3_time_normal': 'minigame3_time_normal',
        'mg3_time_hard': 'minigame3_time_hard',
        'mg4_time_normal': 'minigame4_time_normal',
        'mg4_time_hard': 'minigame4_time_hard',
        'mg5_time_normal': 'minigame5_time_normal',
        'mg5_time_hard': 'minigame5_time_hard'
    };
    
    Object.entries(mappings).forEach(([backend, androidKey]) => {
        if (settings[backend] !== undefined) {
            android[androidKey] = settings[backend];
        }
    });
    
    return android;
};

// AUTHENTICATION
router.post("/login", async (req, res) => {
    const { employee_id } = req.body;

    if (!employee_id || employee_id.trim() === '') {
        return res.status(400).json({
            success: false,
            message: "Employee ID is required"
        });
    }

    try {
        const result = await pool.query(
            "SELECT id, employee_id, name, role FROM users WHERE employee_id = $1",
            [employee_id.trim()]
        );

        if (result.rows.length > 0) {
            const user = result.rows[0];
            res.json({
                success: true,
                message: "Login successful",
                data: user,
                token: "dummy_token_" + Date.now()
            });
        } else {
            res.status(404).json({
                success: false,
                message: "User ID tidak ditemukan"
            });
        }
    } catch (err) {
        console.error("Login error:", err.message);
        res.status(500).json({ success: false, message: "Server error during login" });
    }
});

// QUESTIONS API
router.get("/questions", async (req, res) => {
    try {
        console.log('Questions endpoint called');

        // Fix NULL is_active values
        await pool.query("UPDATE questions SET is_active = true WHERE is_active IS NULL");

        const questionsResult = await pool.query(
            "SELECT question_id, question_text FROM questions WHERE is_active = true ORDER BY question_id ASC"
        );

        if (questionsResult.rows.length === 0) {
            console.log('No questions found');
            return res.json({ success: true, message: "No questions available", data: [] });
        }

        const questionIds = questionsResult.rows.map(q => q.question_id);
        const answersResult = await pool.query(
            "SELECT question_id, answer_id, answer_text, score FROM question_answers WHERE question_id = ANY($1) ORDER BY answer_id ASC",
            [questionIds]
        );

        // Group answers by question
        const answersMap = answersResult.rows.reduce((acc, ans) => {
            if (!acc[ans.question_id]) acc[ans.question_id] = [];
            acc[ans.question_id].push({
                id: ans.answer_id,
                answer_text: ans.answer_text,
                score: ans.score
            });
            return acc;
        }, {});

        const questions = questionsResult.rows.map(q => ({
            id: q.question_id,
            question_text: q.question_text,
            answers: answersMap[q.question_id] || []
        }));

        console.log(`Sending ${questions.length} questions`);
        res.json({ success: true, questions });
    } catch (err) {
        console.error("Error fetching questions:", err);
        res.status(500).json({ success: false, message: "Server error fetching questions" });
    }
});

router.post("/questions", async (req, res) => {
    try {
        const question_text = req.body.question_text || req.body.questionText;
        const answers = req.body.answers;

        if (!question_text) {
            return res.status(400).json({ success: false, message: "Question text is required" });
        }

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            const qResult = await client.query(
                "INSERT INTO questions (question_text, is_active) VALUES ($1, true) RETURNING question_id",
                [question_text]
            );
            const questionId = qResult.rows[0].question_id;

            if (answers && Array.isArray(answers)) {
                for (const answer of answers) {
                    const text = answer.answer_text || answer.answerText;
                    const score = answer.score ?? answer.scoreValue ?? 0;
                    await client.query(
                        "INSERT INTO question_answers (question_id, answer_text, score) VALUES ($1, $2, $3)",
                        [questionId, text, score]
                    );
                }
            }

            await client.query('COMMIT');
            res.json({ success: true, message: "Question created", questionId });
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    } catch (err) {
        console.error("Error creating question:", err);
        res.status(500).json({ success: false, message: err.message });
    }
});

router.put("/questions/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const { question_text, answers } = req.body;

        if (!question_text) {
            return res.status(400).json({ success: false, message: "Question text is required" });
        }

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // Check if question exists
            const questionCheck = await client.query(
                "SELECT question_id FROM questions WHERE question_id = $1 AND is_active = true",
                [id]
            );

            if (questionCheck.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(404).json({ success: false, message: "Question not found" });
            }

            // Update question
            await client.query(
                "UPDATE questions SET question_text = $1 WHERE question_id = $2 AND is_active = true",
                [question_text, id]
            );

            // Delete old answers
            await client.query("DELETE FROM question_answers WHERE question_id = $1", [id]);

            // Insert new answers
            if (answers && Array.isArray(answers)) {
                for (const answer of answers) {
                    if (answer.answer_text && answer.score !== undefined) {
                        await client.query(
                            "INSERT INTO question_answers (question_id, answer_text, score) VALUES ($1, $2, $3)",
                            [id, answer.answer_text, answer.score]
                        );
                    }
                }
            }

            await client.query('COMMIT');
            res.json({ success: true, message: "Question updated successfully" });
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    } catch (err) {
        console.error("Error updating question:", err);
        res.status(500).json({ success: false, message: err.message });
    }
});

router.delete("/questions/:id", async (req, res) => {
    try {
        const { id } = req.params;

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // Check if question exists
            const questionCheck = await client.query(
                "SELECT question_id FROM questions WHERE question_id = $1 AND is_active = true",
                [id]
            );

            if (questionCheck.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(404).json({ success: false, message: "Question not found" });
            }

            // Soft delete
            await client.query("UPDATE questions SET is_active = false WHERE question_id = $1", [id]);

            await client.query('COMMIT');
            res.json({ success: true, message: "Question deleted successfully" });
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    } catch (err) {
        console.error("Error deleting question:", err);
        res.status(500).json({ success: false, message: err.message });
    }
});

// SETTINGS API
router.get("/settings", async (req, res) => {
    try {
        const result = await pool.query("SELECT setting_key, setting_value FROM app_settings");

        if (result.rows.length === 0) {
            return res.json({
                success: true,
                message: "Using defaults",
                data: {
                    minimum_passing_score: 1500,
                    hard_mode_threshold: 400,
                    minigame_enabled: true,
                    mg1_enabled: true,
                    mg1_speed_normal: 2500,
                    mg1_speed_hard: 1000,
                    mg2_enabled: true,
                    mg2_speed_normal: 2500,
                    mg2_speed_hard: 1500,
                    mg3_enabled: true,
                    mg3_rounds: 5,
                    mg3_time_normal: 3000,
                    mg3_time_hard: 2500,
                    mg4_enabled: true,
                    mg4_time_normal: 3000,
                    mg4_time_hard: 2000,
                    mg5_enabled: true,
                    mg5_time_normal: 3000,
                    mg5_time_hard: 2000
                }
            });
        }

        // Parse settings
        const settings = result.rows.reduce((acc, row) => {
            let val = row.setting_value;
            if (val === 'true') val = true;
            else if (val === 'false') val = false;
            else if (!isNaN(val)) val = parseFloat(val);
            acc[row.setting_key] = val;
            return acc;
        }, {});

        // Convert to Android naming
        const androidSettings = toAndroidSettings(settings);

        res.json({ success: true, data: androidSettings });
    } catch (err) {
        console.error("Error loading settings:", err);
        res.status(500).json({ success: false, message: "Error loading settings" });
    }
});

router.post("/settings", async (req, res) => {
    try {
        // Normalize Android naming to backend naming
        const processedSettings = normalizeSettings(req.body);

        await saveAppSettings(processedSettings);

        // Broadcast updates if function exists
        if (typeof global.broadcastSettingsUpdate === 'function') {
            await global.broadcastSettingsUpdate();
        }

        res.json({ success: true, message: "Settings saved successfully" });
    } catch (err) {
        console.error("Error saving settings:", err);
        res.status(500).json({ success: false, message: err.message });
    }
});

// Server-Sent Events for Real-Time Settings Sync
router.get("/settings/stream", async (req, res) => {
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
    });

    const clientId = Date.now();
    if (!global.settingsClients) {
        global.settingsClients = new Map();
    }
    global.settingsClients.set(clientId, res);

    console.log(`SSE client ${clientId} connected`);

    req.on('close', () => {
        global.settingsClients.delete(clientId);
        console.log(`SSE client ${clientId} disconnected`);
    });
});

// TEST RESULTS API
router.post("/results", async (req, res) => {
    try {
        const {
            user_id,
            assessment_score,
            minigame1_score,
            minigame2_score,
            minigame3_score,
            minigame4_score,
            minigame5_score,
            total_score
        } = req.body;

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            const newResult = await client.query(
                `INSERT INTO test_results 
                (user_id, assessment_score, minigame1_score, minigame2_score, minigame3_score, minigame4_score, minigame5_score, total_score) 
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
                RETURNING *`,
                [user_id, assessment_score, minigame1_score, minigame2_score, minigame3_score, minigame4_score || 0, minigame5_score || 0, total_score]
            );

            const resultId = newResult.rows[0].result_id;
            console.log('Test result saved with ID:', resultId);

            await client.query('COMMIT');

            res.json({
                success: true,
                data: {
                    ...newResult.rows[0],
                    result_id: resultId
                }
            });
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    } catch (err) {
        console.error("Error saving test results:", err);
        res.status(500).json({ success: false, message: "Server error saving results" });
    }
});

// USER ANSWERS API
router.post("/user-answers", async (req, res) => {
    try {
        const { result_id, answers } = req.body;

        if (!result_id || !Array.isArray(answers)) {
            return res.status(400).json({
                success: false,
                message: "result_id and answers array are required"
            });
        }

        console.log('Saving user answers for result_id:', result_id);

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            for (const answer of answers) {
                const { question_id, question_text, user_answer } = answer;

                await client.query(
                    `INSERT INTO user_answers (result_id, question_id, question_text, user_answer, created_at) 
                     VALUES ($1, $2, $3, $4, NOW())`,
                    [result_id, question_id, question_text, user_answer]
                );
            }

            await client.query('COMMIT');

            console.log(`Successfully saved ${answers.length} user answers`);

            res.json({
                success: true,
                message: `Successfully saved ${answers.length} answers`,
                data: {
                    result_id: result_id,
                    answers_saved: answers.length
                }
            });
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    } catch (err) {
        console.error("Error saving user answers:", err);
        res.status(500).json({ success: false, message: "Server error saving user answers" });
    }
});

module.exports = router;