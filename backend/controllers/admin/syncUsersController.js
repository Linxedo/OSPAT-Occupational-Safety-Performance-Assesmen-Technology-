const axios = require('axios');
const pool = require('../../models/db');

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

exports.syncUsers = async (req, res) => {
    try {
        console.log('User Sync requested by:', req.user.name);

        const externalApiUrl = 'https://system.samuderamuliaabadi.com:8083/api/hrpersonnel/public?queries=empProjCode%3AC0021&limit=250&offset=0';
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

        // Process in chunks to avoid exhausting DB connection pool
        const CHUNK_SIZE = 20;
        for (let i = 0; i < externalUsers.length; i += CHUNK_SIZE) {
            const chunk = externalUsers.slice(i, i + CHUNK_SIZE);

            const syncPromises = chunk.map(async (extUser) => {
                const name = extUser.empName;
                const employee_id = extUser.empNumber;

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
        }

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
};
