const express = require('express');
const axios = require('axios');
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcrypt');
const pool = require('../models/db');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const SALT_ROUNDS = 10;
const router = express.Router();

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

// Helper function to log activity
const logActivity = async (pool, activityType, description, userId) => {
    try {
        await pool.query(
            'INSERT INTO activity_log (activity_type, description, user_id) VALUES ($1, $2, $3)',
            [activityType, description, userId]
        );
    } catch (error) {
        console.log('Activity logging failed:', error.message);
    }
};

// Helper function for UPSERT (INSERT or UPDATE)
const upsertSetting = async (key, value) => {
    console.log(`💾 Upserting ${key} = ${value}`);
    try {
        const result = await pool.query(
            `INSERT INTO app_settings (setting_key, setting_value) 
             VALUES ($1, $2) 
             ON CONFLICT (setting_key) 
             DO UPDATE SET setting_value = EXCLUDED.setting_value
             RETURNING setting_key, setting_value`,
            [key, value.toString()]
        );
        console.log(`✅ Saved ${key} = ${result.rows[0].setting_value}`);
        return result;
    } catch (error) {
        console.log(`⚠️ ON CONFLICT failed for ${key}, trying manual upsert:`, error.message);

        const checkResult = await pool.query(
            'SELECT setting_key FROM app_settings WHERE setting_key = $1',
            [key]
        );

        if (checkResult.rows.length > 0) {
            const updateResult = await pool.query(
                'UPDATE app_settings SET setting_value = $1 WHERE setting_key = $2 RETURNING setting_key, setting_value',
                [value.toString(), key]
            );
            console.log(`✅ Updated ${key} = ${updateResult.rows[0].setting_value}`);
            return updateResult;
        } else {
            const insertResult = await pool.query(
                'INSERT INTO app_settings (setting_key, setting_value) VALUES ($1, $2) RETURNING setting_key, setting_value',
                [key, value.toString()]
            );
            console.log(`✅ Inserted ${key} = ${insertResult.rows[0].setting_value}`);
            return insertResult;
        }
    }
};

// Apply authentication middleware to all routes
router.use(authenticateToken);
router.use(requireAdmin);

// ============================================================================
// DASHBOARD API
// ============================================================================
router.get('/dashboard', async (req, res) => {
    try {
        console.log('Dashboard API called by authenticated user:', req.user);

        // Execute queries sequentially
        const usersResult = await pool.query('SELECT COUNT(*) as total FROM users');
        const testResultsResult = await pool.query('SELECT COUNT(*) as total FROM test_results');
        const questionsResult = await pool.query('SELECT COUNT(*) as total FROM questions');
        const recentUsersResult = await pool.query('SELECT id, name, employee_id FROM users ORDER BY id DESC LIMIT 5');
        const recentTestsResult = await pool.query('SELECT tr.result_id, tr.test_timestamp, tr.total_score, u.name as user_name FROM test_results tr JOIN users u ON tr.user_id = u.id ORDER BY tr.test_timestamp DESC LIMIT 5');

        // Get recent activities from activity_log
        let recentActivities = [];
        try {
            const activitiesResult = await pool.query(`
                SELECT al.activity_type, al.description, (al.timestamp AT TIME ZONE 'UTC') as timestamp, u.name as admin_name
                FROM activity_log al
                LEFT JOIN users u ON al.user_id = u.id
                ORDER BY al.timestamp DESC LIMIT 10
            `);
            recentActivities = activitiesResult.rows;
        } catch (activitiesError) {
            console.log('Activities tracking not available:', activitiesError.message);
        }

        const successThreshold = 80;
        const successResult = await pool.query(
            'SELECT COUNT(*) as total FROM test_results WHERE total_score >= $1',
            [successThreshold]
        );

        const successRate = testResultsResult.rows[0].total > 0
            ? Math.round((successResult.rows[0].total / testResultsResult.rows[0].total) * 100)
            : 0;

        console.log('Dashboard SUCCESS - Data loaded for user:', req.user.name);
        res.json({
            success: true,
            data: {
                totalUsers: parseInt(usersResult.rows[0].total),
                totalTestResults: parseInt(testResultsResult.rows[0].total),
                totalQuestions: parseInt(questionsResult.rows[0].total),
                successRate: successRate,
                recentUsers: recentUsersResult.rows,
                recentTests: recentTestsResult.rows,
                recentActivities: recentActivities
            }
        });
    } catch (error) {
        console.error('Dashboard error:', error.message);
        console.error('User info:', req.user);
        console.error('Error stack:', error.stack);
        res.status(500).json({
            success: false,
            message: 'Server error',
            details: error.message
        });
    }
});

// ============================================================================
// USERS API
// ============================================================================
router.get('/users', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const search = req.query.search || '';
        const limit = 10;
        const offset = (page - 1) * limit;

        let countQuery = 'SELECT COUNT(*) as total FROM users';
        let dataQuery = 'SELECT id, name, employee_id, role FROM users';
        let queryParams = [];
        let countParams = [];

        if (search) {
            countQuery += ' WHERE (name ILIKE $1 OR employee_id ILIKE $1)';
            dataQuery += ' WHERE (name ILIKE $1 OR employee_id ILIKE $1)';
            countParams.push(`%${search}%`);
            queryParams.push(`%${search}%`);
        }

        dataQuery += ' ORDER BY CASE WHEN role = \'admin\' THEN 0 ELSE 1 END, name ASC LIMIT $' + (queryParams.length + 1) + ' OFFSET $' + (queryParams.length + 2);
        queryParams.push(limit, offset);

        const countResult = await pool.query(countQuery, countParams);
        const totalCount = parseInt(countResult.rows[0].total);
        const result = await pool.query(dataQuery, queryParams);
        const totalPages = Math.ceil(totalCount / limit);

        res.json({
            success: true,
            data: result.rows,
            pagination: {
                currentPage: page,
                totalPages: totalPages,
                totalRecords: totalCount,
                recordsPerPage: limit,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1
            }
        });
    } catch (error) {
        console.error('Users fetch error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

router.post('/users', [
    body('name').notEmpty().withMessage('Name is required'),
    body('employee_id').notEmpty().withMessage('Employee ID is required'),
    body('role').isIn(['admin', 'user']).withMessage('Invalid role'),
    body('password').custom((value, { req }) => {
        if (req.body.role === 'admin' && !value) {
            throw new Error('Password is required for admin users');
        }
        return true;
    })
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const { name, employee_id, role, password } = req.body;

        const existingUser = await pool.query(
            'SELECT id FROM users WHERE employee_id = $1',
            [employee_id]
        );

        if (existingUser.rows.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Employee ID already exists'
            });
        }

        let hashedPassword = '';
        if (role === 'admin' && password) {
            hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
        }

        const result = await pool.query(
            'INSERT INTO users (name, employee_id, role, password) VALUES ($1, $2, $3, $4) RETURNING id, name, employee_id, role',
            [name, employee_id, role, hashedPassword]
        );

        await logActivity(pool, 'user_created', `New user "${name}" (${employee_id}) joined the system`, req.user?.userId);

        res.status(201).json({
            success: true,
            message: 'User created successfully',
            data: result.rows[0]
        });
    } catch (error) {
        console.error('User creation error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

router.put('/users/:id', [
    body('name').notEmpty().withMessage('Name is required'),
    body('role').isIn(['admin', 'user']).withMessage('Invalid role'),
    body('password').optional().custom((value, { req }) => {
        if (req.body.role === 'admin' && value && value.length < 6) {
            throw new Error('Password must be at least 6 characters for admin users');
        }
        return true;
    })
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const { id } = req.params;
        const { name, role, password } = req.body;

        const currentUser = await pool.query('SELECT role FROM users WHERE id = $1', [id]);
        if (currentUser.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const currentRole = currentUser.rows[0].role;
        let updateQuery = 'UPDATE users SET name = $1, role = $2';
        let queryParams = [name, role];

        if ((role === 'admin' || currentRole === 'admin') && password) {
            const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
            updateQuery += ', password = $3 WHERE id = $4 RETURNING id, name, employee_id, role';
            queryParams.push(hashedPassword, id);
        } else {
            updateQuery += ' WHERE id = $3 RETURNING id, name, employee_id, role';
            queryParams.push(id);
        }

        const result = await pool.query(updateQuery, queryParams);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.json({
            success: true,
            message: 'User updated successfully',
            data: result.rows[0]
        });
    } catch (error) {
        console.error('User update error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

router.delete('/users/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const userResult = await pool.query(
            'SELECT name, employee_id, role FROM users WHERE id = $1',
            [id]
        );

        if (userResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const deletedUser = userResult.rows[0];

        try {
            // Delete all related records first (if any)
            await pool.query('DELETE FROM test_results WHERE user_id = $1', [id]);
            await pool.query('DELETE FROM activity_log WHERE user_id = $1', [id]);
            
            // Then delete the user
            await pool.query('DELETE FROM users WHERE id = $1', [id]);
        } catch (deleteError) {
            console.error('Delete error details:', deleteError);
            
            // Handle foreign key constraint violation
            if (deleteError.code === '23503') {
                return res.status(400).json({
                    success: false,
                    message: 'Cannot delete user. User has related records (test results, etc). Please delete related data first.'
                });
            }
            
            throw deleteError;
        }

        await logActivity(pool, 'user_deleted', `User "${deletedUser.name}" (${deletedUser.employee_id}) was removed from the system`, req.user?.userId);

        res.json({
            success: true,
            message: 'User deleted successfully'
        });
    } catch (error) {
        console.error('User deletion error:', error);
        res.status(500).json({ success: false, message: 'Server error: ' + error.message });
    }
});

// Sync Users from External API
router.post('/sync-users', async (req, res) => {
    try {
        console.log('User Sync requested by:', req.user.name);

        const externalApiUrl = 'https://sistem.stevewalewangko.com:8080/api/hrpersonnel/public?queries=empProjCode%3AC0021&limit=100&offset=0';
        const response = await axios.get(externalApiUrl);

        if (!response.data || !response.data.data) {
            return res.status(400).json({
                success: false,
                message: 'Invalid data format from external API'
            });
        }

        const externalUsers = response.data.data;
        let syncedCount = 0;
        let updatedCount = 0;

        const syncPromises = externalUsers.map(async (extUser) => {
            const name = extUser.empName || extUser.name;
            const employee_id = extUser.empID || extUser.employee_id;

            if (!name || !employee_id) return;

            const upsertQuery = `
                INSERT INTO users (name, employee_id, role)
                VALUES ($1, $2, 'user')
                ON CONFLICT (employee_id) 
                DO UPDATE SET name = EXCLUDED.name
                RETURNING (xmax = 0) AS inserted
            `;

            const result = await pool.query(upsertQuery, [name, employee_id]);
            if (result.rows[0].inserted) {
                syncedCount++;
            } else {
                updatedCount++;
            }
        });

        await Promise.all(syncPromises);

        await logActivity(
            pool,
            'sync_users',
            `Synchronized ${externalUsers.length} users from HR system (${syncedCount} new, ${updatedCount} updated)`,
            req.user.userId
        );

        res.json({
            success: true,
            message: `Sync completed: ${syncedCount} new users added, ${updatedCount} updated.`,
            data: {
                total: externalUsers.length,
                added: syncedCount,
                updated: updatedCount
            }
        });

    } catch (error) {
        console.error('User Sync Error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to sync users',
            error: error.message
        });
    }
});

// ============================================================================
// SETTINGS API
// ============================================================================
router.get('/settings', async (req, res) => {
    try {
        console.log('📥 Settings GET received');

        const result = await pool.query("SELECT setting_key, setting_value FROM app_settings");

        if (result.rows.length === 0) {
            console.log("No settings found, returning defaults");
            return res.json({
                success: true,
                message: "Settings loaded (using defaults)",
                data: {
                    minimum_passing_score: 70,
                    hard_mode_threshold: 85,
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
                    mg3_time_hard: 2000,
                    mg4_enabled: true,
                    mg4_time_normal: 3000,
                    mg4_time_hard: 2000,
                    mg5_enabled: true,
                    mg5_time_normal: 3000,
                    mg5_time_hard: 2000
                }
            });
        }

        const settings = result.rows.reduce((acc, row) => {
            if (row.setting_value === 'true') {
                acc[row.setting_key] = true;
            } else if (row.setting_value === 'false') {
                acc[row.setting_key] = false;
            } else if (!isNaN(row.setting_value)) {
                acc[row.setting_key] = parseFloat(row.setting_value);
            } else {
                acc[row.setting_key] = row.setting_value;
            }
            return acc;
        }, {});

        console.log("Settings loaded:", Object.keys(settings).length, "settings found");

        res.json({
            success: true,
            message: "Settings loaded successfully",
            data: settings
        });
    } catch (error) {
        console.error('Settings fetch error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

router.post('/settings', [
    body('minimum_passing_score').optional().isInt({ min: 0, max: 10000 }),
    body('hard_mode_threshold').optional().isInt({ min: 0, max: 10000 }),
    body('minigame_enabled').optional().isBoolean(),
    body('mg1_enabled').optional().isBoolean(),
    body('mg1_speed_normal').optional().isInt({ min: 100, max: 5000 }),
    body('mg1_speed_hard').optional().isInt({ min: 50, max: 2000 }),
    body('mg2_enabled').optional().isBoolean(),
    body('mg2_speed_normal').optional().isInt({ min: 100, max: 5000 }),
    body('mg2_speed_hard').optional().isInt({ min: 50, max: 2000 }),
    body('mg3_enabled').optional().isBoolean(),
    body('mg3_rounds').optional().isInt({ min: 1, max: 20 }),
    body('mg3_time_normal').optional().isInt({ min: 250, max: 10000 }),
    body('mg3_time_hard').optional().isInt({ min: 250, max: 5000 }),
    body('mg4_enabled').optional().isBoolean(),
    body('mg4_time_normal').optional().isInt({ min: 250, max: 10000 }),
    body('mg4_time_hard').optional().isInt({ min: 250, max: 5000 }),
    body('mg5_enabled').optional().isBoolean(),
    body('mg5_time_normal').optional().isInt({ min: 250, max: 10000 }),
    body('mg5_time_hard').optional().isInt({ min: 250, max: 5000 })
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        // Get current settings BEFORE updates for accurate logging
        const currentSettingsResult = await pool.query('SELECT setting_key, setting_value FROM app_settings');
        const currentSettings = currentSettingsResult.rows.reduce((acc, row) => {
            acc[row.setting_key] = row.setting_value;
            return acc;
        }, {});

        // Log activity only for settings that actually changed
        for (const [key, newValue] of Object.entries(req.body)) {
            if (newValue !== undefined && newValue !== null) {
                const currentValue = currentSettings[key];
                if (currentValue !== newValue.toString()) {
                    await logActivity(pool, 'setting_updated', `Setting "${key}" changed from "${currentValue || 'empty'}" to "${newValue}"`, req.user?.userId);
                }
            }
        }

        const updatePromises = [];

        // Update all settings that are provided
        for (const [key, value] of Object.entries(req.body)) {
            if (value !== undefined) {
                updatePromises.push(upsertSetting(key, value));
            }
        }

        console.log(`🔄 Executing ${updatePromises.length} upsert operations...`);
        await Promise.all(updatePromises);
        console.log('✅ All updates completed successfully');

        // Broadcast real-time updates to all connected admin clients
        if (typeof global.broadcastSettingsUpdate === 'function') {
            await global.broadcastSettingsUpdate();
        }

        // Fetch fresh data from database
        const result = await pool.query("SELECT * FROM app_settings");
        const settings = result.rows.reduce((acc, row) => {
            acc[row.setting_key] = row.setting_value;
            return acc;
        }, {});

        const responseData = {
            minimum_passing_score: parseInt(settings.minimum_passing_score) || 70,
            hard_mode_threshold: parseInt(settings.hard_mode_threshold) || 85,
            minigame_enabled: settings.minigame_enabled === 'true',
            mg1_enabled: settings.mg1_enabled === 'true',
            mg1_speed_normal: parseInt(settings.mg1_speed_normal) || 2500,
            mg1_speed_hard: parseInt(settings.mg1_speed_hard) || 250,
            mg2_enabled: settings.mg2_enabled === 'true',
            mg2_speed_normal: parseInt(settings.mg2_speed_normal) || 2500,
            mg2_speed_hard: parseInt(settings.mg2_speed_hard) || 250,
            mg3_enabled: settings.mg3_enabled === 'true',
            mg3_rounds: parseInt(settings.mg3_rounds) || 5,
            mg3_time_normal: parseInt(settings.mg3_time_normal) || 3000,
            mg3_time_hard: parseInt(settings.mg3_time_hard) || 2000,
            mg4_enabled: settings.mg4_enabled === 'true',
            mg4_time_normal: parseInt(settings.mg4_time_normal) || 3000,
            mg4_time_hard: parseInt(settings.mg4_time_hard) || 2000,
            mg5_enabled: settings.mg5_enabled === 'true',
            mg5_time_normal: parseInt(settings.mg5_time_normal) || 3000,
            mg5_time_hard: parseInt(settings.mg5_time_hard) || 2000
        };

        res.json({
            success: true,
            message: 'Settings updated successfully',
            data: responseData
        });
    } catch (error) {
        console.error('Settings update error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
});

// Server-Sent Events for Real-Time Settings Sync
router.get('/settings/stream', async (req, res) => {
    try {
        console.log('📡 SSE client connected');

        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Cache-Control'
        });

        res.write('data: ' + JSON.stringify({
            type: 'connected',
            message: 'SSE connection established'
        }) + '\n\n');

        const clientId = Date.now() + '_' + Math.random();
        if (!global.settingsClients) {
            global.settingsClients = new Map();
        }
        global.settingsClients.set(clientId, res);

        console.log(`📡 SSE client ${clientId} added. Total clients: ${global.settingsClients.size}`);

        try {
            const result = await pool.query("SELECT setting_key, setting_value FROM app_settings");
            const settings = result.rows.reduce((acc, row) => {
                if (row.setting_value === 'true') {
                    acc[row.setting_key] = true;
                } else if (row.setting_value === 'false') {
                    acc[row.setting_key] = false;
                } else if (!isNaN(row.setting_value)) {
                    acc[row.setting_key] = parseFloat(row.setting_value);
                } else {
                    acc[row.setting_key] = row.setting_value;
                }
                return acc;
            }, {});

            res.write('data: ' + JSON.stringify({
                type: 'settings_update',
                data: settings
            }) + '\n\n');
        } catch (error) {
            console.error('Error sending initial settings:', error);
        }

        req.on('close', () => {
            console.log(`📡 SSE client ${clientId} disconnected`);
            global.settingsClients.delete(clientId);
            console.log(`📡 Remaining clients: ${global.settingsClients.size}`);
        });

    } catch (error) {
        console.error('SSE setup error:', error);
        res.status(500).json({ success: false, message: 'SSE setup failed' });
    }
});

// ============================================================================
// QUESTIONS API
// ============================================================================
router.get('/questions', async (req, res) => {
    try {
        await pool.query("UPDATE questions SET is_active = true WHERE is_active IS NULL");

        const questionsResult = await pool.query("SELECT * FROM questions WHERE is_active = true ORDER BY question_id ASC");

        if (questionsResult.rows.length === 0) {
            return res.json({
                success: true,
                data: []
            });
        }

        const questionIds = questionsResult.rows.map(q => q.question_id);

        const answersResult = await pool.query(
            "SELECT question_id, answer_id, answer_text, score FROM question_answers WHERE question_id = ANY($1) ORDER BY answer_id ASC",
            [questionIds]
        );

        const answersMap = answersResult.rows.reduce((acc, ans) => {
            if (!acc[ans.question_id]) acc[ans.question_id] = [];
            acc[ans.question_id].push(ans);
            return acc;
        }, {});

        const questions = questionsResult.rows.map(q => ({
            ...q,
            answers: answersMap[q.question_id] || []
        }));

        res.json({
            success: true,
            data: questions
        });
    } catch (error) {
        console.error('Questions fetch error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

router.post('/questions', [
    body('question_text').notEmpty().withMessage('Question text is required'),
    body('answers').isArray().withMessage('Answers array is required')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const { question_text, answers } = req.body;

        await pool.query('BEGIN');

        const questionResult = await pool.query(
            "INSERT INTO questions (question_text, is_active) VALUES ($1, true) RETURNING question_id",
            [question_text]
        );

        const questionId = questionResult.rows[0].question_id;

        if (answers && Array.isArray(answers)) {
            for (const answer of answers) {
                if (answer.answer_text && answer.score !== undefined) {
                    await pool.query(
                        "INSERT INTO question_answers (question_id, answer_text, score) VALUES ($1, $2, $3)",
                        [questionId, answer.answer_text, answer.score]
                    );
                }
            }
        }

        await pool.query('COMMIT');

        await logActivity(pool, 'question_created', `New question created: "${question_text}"`, req.user?.userId);

        const answersResult = await pool.query(
            "SELECT answer_id, answer_text, score FROM question_answers WHERE question_id = $1 ORDER BY answer_id ASC",
            [questionId]
        );

        res.status(201).json({
            success: true,
            message: 'Question created successfully',
            data: {
                question_id: questionId,
                question_text: question_text,
                answers: answersResult.rows
            }
        });
    } catch (error) {
        await pool.query('ROLLBACK');
        console.error('Question creation error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

router.put('/questions/:id', [
    body('question_text').notEmpty().withMessage('Question text is required'),
    body('answers').isArray().withMessage('Answers array is required')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const { id } = req.params;
        const { question_text, answers } = req.body;

        await pool.query('BEGIN');

        await pool.query(
            "UPDATE questions SET question_text = $1 WHERE question_id = $2 AND is_active = true",
            [question_text, id]
        );

        await pool.query("DELETE FROM question_answers WHERE question_id = $1", [id]);

        if (answers && Array.isArray(answers)) {
            for (const answer of answers) {
                if (answer.answer_text && answer.score !== undefined) {
                    await pool.query(
                        "INSERT INTO question_answers (question_id, answer_text, score) VALUES ($1, $2, $3)",
                        [id, answer.answer_text, answer.score]
                    );
                }
            }
        }

        await pool.query('COMMIT');

        await logActivity(pool, 'question_updated', `Question edited: "${question_text}"`, req.user?.userId);

        const answersResult = await pool.query(
            "SELECT answer_id, answer_text, score FROM question_answers WHERE question_id = $1 ORDER BY answer_id ASC",
            [id]
        );

        res.json({
            success: true,
            message: 'Question updated successfully',
            data: {
                question_id: parseInt(id),
                question_text: question_text,
                answers: answersResult.rows
            }
        });
    } catch (error) {
        await pool.query('ROLLBACK');
        console.error('Question update error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

router.delete('/questions/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const questionInfo = await pool.query("SELECT question_text FROM questions WHERE question_id = $1", [id]);
        const questionText = questionInfo.rows[0]?.question_text || `ID: ${id}`;

        await pool.query("UPDATE questions SET is_active = false WHERE question_id = $1", [id]);

        await logActivity(pool, 'question_deleted', `Question deleted: "${questionText}"`, req.user?.userId);

        res.json({
            success: true,
            message: 'Question deleted successfully'
        });
    } catch (error) {
        console.error('Question deletion error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// ============================================================================
// HISTORY API
// ============================================================================
router.get('/history', async (req, res) => {
    try {
        console.log('History API called by authenticated user:', req.user);

        const page = parseInt(req.query.page) || 1;
        const search = req.query.search || '';
        const date = req.query.date || '';
        const limit = 10;
        const offset = (page - 1) * limit;

        // Get minimum passing score with fallback
        let minPassingScore = 70;
        try {
            const minScoreResult = await pool.query(
                'SELECT setting_value::INTEGER as min_score FROM app_settings WHERE setting_key = $1',
                ['minimum_passing_score']
            );
            if (minScoreResult.rows.length > 0) {
                minPassingScore = minScoreResult.rows[0].min_score;
            }
        } catch (settingsError) {
            console.log('Settings table error, using default 70:', settingsError.message);
        }

        // Build WHERE clause for search and date
        let whereClause = 'WHERE u.role != \'admin\'';
        let queryParams = [];
        let paramIndex = 1;

        if (search) {
            whereClause += ` AND (u.name ILIKE $${paramIndex} OR u.employee_id ILIKE $${paramIndex})`;
            queryParams.push(`%${search}%`);
            paramIndex++;
        }

        if (date) {
            whereClause += ` AND DATE(tr.test_timestamp) = $${paramIndex}`;
            queryParams.push(date);
            paramIndex++;
        }

        // Get total count for pagination
        const countQuery = `
            SELECT COUNT(*) as total
            FROM test_results tr
            JOIN users u ON tr.user_id = u.id
            ${whereClause}
        `;
        const countResult = await pool.query(countQuery, queryParams);
        const totalCount = parseInt(countResult.rows[0].total);

        // Main query with pagination and search
        const mainQuery = `
            SELECT tr.result_id, tr.test_timestamp, tr.assessment_score, 
                   tr.minigame1_score, tr.minigame2_score, tr.minigame3_score, 
                   tr.minigame4_score, tr.minigame5_score,
                   tr.total_score, u.name, u.employee_id,
                   CASE
                       WHEN tr.total_score >= $${paramIndex} THEN 'Fit'
                       ELSE 'Unfit'
                   END AS status
            FROM test_results tr
            JOIN users u ON tr.user_id = u.id
            ${whereClause}
            ORDER BY tr.test_timestamp DESC
            LIMIT $${paramIndex + 1} OFFSET $${paramIndex + 2}
        `;

        const mainParams = [...queryParams, minPassingScore, limit, offset];
        const result = await pool.query(mainQuery, mainParams);

        const totalPages = Math.ceil(totalCount / limit);

        console.log('History SUCCESS - Data loaded for user:', req.user.name);
        res.json({
            success: true,
            data: result.rows,
            pagination: {
                currentPage: page,
                totalPages: totalPages,
                totalRecords: totalCount,
                recordsPerPage: limit,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1
            }
        });
    } catch (error) {
        console.error('History error:', error.message);
        console.error('Error stack:', error.stack);
        res.status(500).json({
            success: false,
            message: 'Server error',
            details: error.message
        });
    }
});

// ============================================================================
// USER ANSWERS API
// ============================================================================
router.get('/user_answers/:resultId', async (req, res) => {
    try {
        const { resultId } = req.params;
        console.log('Getting user answers for result ID:', resultId);

        if (!resultId || isNaN(resultId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid result ID'
            });
        }

        const answersQuery = `
            SELECT
                ua.answer_id,
                ua.question_id,
                ua.question_text,
                ua.user_answer,
                ua.created_at,
                qa.answer_text as correct_answer,
                qa.score as answer_score,
                tr.assessment_score as total_assessment_score
            FROM user_answers ua
            LEFT JOIN question_answers qa ON ua.question_id = qa.question_id
            LEFT JOIN test_results tr ON ua.result_id = tr.result_id
            WHERE ua.result_id = $1
            ORDER BY ua.question_id
        `;

        const result = await pool.query(answersQuery, [resultId]);

        if (result.rows.length === 0) {
            return res.json({
                success: true,
                message: 'No answers found for this test result',
                data: {
                    resultId: parseInt(resultId),
                    totalQuestions: 0,
                    answers: []
                }
            });
        }

        const answersByQuestion = {};
        result.rows.forEach(row => {
            if (!answersByQuestion[row.question_id]) {
                answersByQuestion[row.question_id] = {
                    questionId: row.question_id,
                    questionText: row.question_text,
                    userAnswer: row.user_answer,
                    totalAssessmentScore: row.total_assessment_score,
                    possibleAnswers: []
                };
            }

            if (row.correct_answer) {
                answersByQuestion[row.question_id].possibleAnswers.push({
                    answerText: row.correct_answer,
                    score: row.answer_score,
                    isUserAnswer: row.correct_answer === row.user_answer
                });
            }
        });

        const answers = Object.values(answersByQuestion);

        console.log(`Found ${answers.length} questions answered for result ${resultId}`);

        res.json({
            success: true,
            data: {
                resultId: parseInt(resultId),
                totalQuestions: answers.length,
                answers: answers
            }
        });

    } catch (error) {
        console.error('Error getting user answers:', error.message);
        res.status(500).json({
            success: false,
            message: 'Server error fetching user answers'
        });
    }
});

module.exports = router;