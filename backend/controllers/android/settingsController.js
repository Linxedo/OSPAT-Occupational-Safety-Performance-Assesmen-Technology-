const pool = require('../../models/db');
const { getCachedSettings, invalidateCache, CACHE_KEYS } = require('../../utils/cache');

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
        'minigame2_rounds': 'minigame2_rounds',
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
        'minigame2_rounds': 'minigame2_rounds',
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

// Helper to save app settings
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

exports.getSettings = async (req, res) => {
    try {
        console.log('📥 Android Settings GET received (cached)');

        const settings = await getCachedSettings();

        // Use the proper conversion function
        const androidSettings = toAndroidSettings(settings);

        console.log('📱 Android settings sent:', Object.keys(androidSettings));

        res.json({
            success: true,
            message: "Settings loaded successfully",
            data: androidSettings
        });
    } catch (error) {
        console.error('Android Settings fetch error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.updateSettings = async (req, res) => {
    try {
        // Normalize Android naming to backend naming
        const processedSettings = normalizeSettings(req.body);

        await saveAppSettings(processedSettings);

        // Invalidate cache to force refresh on next request
        invalidateCache(CACHE_KEYS.SETTINGS);

        // Broadcast updates if function exists
        if (typeof global.broadcastSettingsUpdate === 'function') {
            await global.broadcastSettingsUpdate();
        }

        res.json({ success: true, message: "Settings saved successfully" });
    } catch (err) {
        console.error("Error saving settings:", err);
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.streamSettings = async (req, res) => {
    try {
        console.log('📡 Android SSE client connected');

        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Cache-Control'
        });

        const clientId = Date.now() + '_' + Math.random();
        if (!global.androidClients) {
            global.androidClients = new Map();
        }
        global.androidClients.set(clientId, res);

        console.log(`📡 Android SSE client ${clientId} added. Total Android clients: ${global.androidClients.size}`);

        // Send initial settings to Android client
        try {
            const settings = await getCachedSettings();
            const androidSettings = toAndroidSettings(settings);

            res.write('data: ' + JSON.stringify({
                type: 'settings_update',
                data: androidSettings
            }) + '\n\n');

            console.log('📱 Initial settings sent to Android client');
        } catch (error) {
            console.error('Error sending initial settings to Android:', error);
        }

        req.on('close', () => {
            console.log(`📡 Android SSE client ${clientId} disconnected`);
            global.androidClients.delete(clientId);
            console.log(`📡 Remaining Android clients: ${global.androidClients.size}`);
        });

    } catch (error) {
        console.error('Android SSE setup error:', error);
        res.status(500).json({ success: false, message: 'SSE setup failed' });
    }
};

// Export helper functions for use in other modules
exports.toAndroidSettings = toAndroidSettings;
