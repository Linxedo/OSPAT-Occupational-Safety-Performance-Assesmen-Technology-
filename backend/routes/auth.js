const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const pool = require('../models/db');
const rateLimit = require('express-rate-limit');

const router = express.Router();

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: 'Too many login attempts',
    standardHeaders: true,
    legacyHeaders: false,
});

router.post('/login', loginLimiter, [
    body('employee_id').notEmpty().withMessage('Employee ID is required'),
    body('password').notEmpty().withMessage('Password is required')
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

        const { employee_id, password } = req.body;

        const result = await pool.query(
            'SELECT id, name, employee_id, password FROM users WHERE employee_id = $1 AND role = $2',
            [employee_id, 'admin']
        );

        if (result.rows.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        const user = result.rows[0];
        if (!user.password || typeof user.password !== 'string' || user.password.trim() === '') {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        if (!process.env.JWT_SECRET) {
            return res.status(500).json({
                success: false,
                message: 'Server misconfiguration: JWT_SECRET is not set'
            });
        }

        const token = jwt.sign(
            { userId: user.id, employeeId: user.employee_id },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRE || '7d' }
        );

        res.json({
            success: true,
            message: 'Login successful',
            data: {
                token,
                admin: {
                    id: user.id,
                    name: user.name,
                    employee_id: user.employee_id
                }
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

router.get('/validate', async (req, res) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        if (!token) {
            return res.status(401).json({ success: false, message: 'Access token required' });
        }

        jwt.verify(token, process.env.JWT_SECRET, async (err, user) => {
            if (err) {
                return res.status(403).json({ success: false, message: 'Invalid or expired token' });
            }

            try {
                const result = await pool.query(
                    'SELECT id, name, employee_id FROM users WHERE id = $1 AND role = $2',
                    [user.userId, 'admin']
                );

                if (result.rows.length === 0) {
                    return res.status(403).json({ success: false, message: 'Admin access required' });
                }

                res.json({
                    success: true,
                    data: {
                        admin: result.rows[0]
                    }
                });
            } catch (error) {
                console.error('Admin validation error:', error);
                res.status(500).json({ success: false, message: 'Server error' });
            }
        });
    } catch (error) {
        console.error('Token validation error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

module.exports = router;
