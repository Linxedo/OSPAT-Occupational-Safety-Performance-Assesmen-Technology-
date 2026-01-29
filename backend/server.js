require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const path = require('path');
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const androidRoutes = require('./routes/android');
const uploadRoutes = require('./routes/upload');

const app = express();
const isProd = process.env.NODE_ENV === 'production';

// Global settings clients for SSE
global.settingsClients = new Map();

// Make broadcast function globally available
const pool = require('./models/db');
global.broadcastSettingsUpdate = async () => {
    if (!global.settingsClients || global.settingsClients.size === 0) {
        return;
    }

    try {
        const result = await pool.query("SELECT setting_key, setting_value FROM app_settings");
        const settings = result.rows.reduce((acc, row) => {
            const key = row.setting_key;
            const value = row.setting_value;

            // Parse boolean and numeric values (keep snake_case for Android compatibility)
            if (value === 'true') {
                acc[key] = true;
            } else if (value === 'false') {
                acc[key] = false;
            } else if (!isNaN(value) && value !== '') {
                acc[key] = parseFloat(value);
            } else {
                acc[key] = value;
            }
            return acc;
        }, {});

        const message = JSON.stringify({ type: 'settings_update', data: settings });

        // Send to all connected clients
        for (const [clientId, clientRes] of global.settingsClients) {
            try {
                clientRes.write(`data: ${message}\n\n`);
            } catch (error) {
                console.error(`Failed to send update to client ${clientId}:`, error);
                global.settingsClients.delete(clientId);
            }
        }

        console.log(`📡 [SERVER] Broadcasted settings update to ${global.settingsClients.size} clients`);
    } catch (error) {
        console.error('Error broadcasting settings update:', error);
    }
};

app.disable('x-powered-by');
if (isProd) {
    app.set('trust proxy', 1);
}

app.use(helmet({ contentSecurityPolicy: false }));
app.use(compression());
app.use(morgan(isProd ? 'combined' : 'dev'));

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: isProd ? 100 : 1000, // Higher limit for development
    message: 'Too many requests',
    standardHeaders: true,
    legacyHeaders: false,
});
app.use(limiter);

app.use(cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
    credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/android', androidRoutes);
app.use('/api/upload', uploadRoutes);

app.use((req, res) => {
    res.status(404).json({ success: false, message: 'Endpoint not found' });
});

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(err.status || 500).json({
        success: false,
        message: isProd ? 'Internal server error' : err.message
    });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`API Server running on port ${PORT}`);
});
