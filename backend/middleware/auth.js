const jwt = require('jsonwebtoken');
const pool = require('../models/db');

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ success: false, message: 'Access token required' });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ success: false, message: 'Invalid or expired token' });
        }
        req.user = user;
        next();
    });
};

const requireAdmin = async (req, res, next) => {
    try {
        const result = await pool.query(
            'SELECT id, name, employee_id FROM users WHERE id = $1 AND role = $2',
            [req.user.userId, 'admin']
        );

        if (result.rows.length === 0) {
            return res.status(403).json({ success: false, message: 'Admin access required' });
        }

        req.admin = result.rows[0];
        next();
    } catch (error) {
        console.error('Admin check error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

const validateApiKey = (req, res, next) => {
    const apiKey = req.headers['x-api-key'];
    const validApiKey = process.env.ANDROID_API_KEY;

    // Development mode: Allow requests without API key
    const isDevelopment = process.env.NODE_ENV !== 'production';

    if (isDevelopment && !validApiKey) {
        console.warn('WARNING: Development mode - no API key required');
        return next();
    }

    // If API key is configured in production, validate it
    if (validApiKey && (!apiKey || apiKey !== validApiKey)) {
        console.log('API Key validation failed in production mode');
        return res.status(401).json({ success: false, message: 'Invalid API key' });
    }

    // Allow request if no API key is configured or validation passes
    next();
};

module.exports = {
    authenticateToken,
    requireAdmin,
    validateApiKey
};
