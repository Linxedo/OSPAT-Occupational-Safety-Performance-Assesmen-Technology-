const pool = require('../../models/db');

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
};

exports.updateSettings = async (req, res) => {
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
};

exports.streamSettings = async (req, res) => {
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
};
