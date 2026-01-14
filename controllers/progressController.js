const db = require('../config/db');

const progressController = {
    updateProgress: async (req, res) => {
        try {
            const { movieId } = req.params;
            const { progress, duration, completed } = req.body;
            
            await db.execute(
                `INSERT INTO watch_progress (user_id, movie_id, progress, duration, completed) 
                 VALUES (?, ?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE 
                 progress = VALUES(progress),
                 duration = VALUES(duration),
                 completed = VALUES(completed),
                 last_watched = CURRENT_TIMESTAMP`,
                [req.user.id, movieId, progress, duration, completed || false]
            );
            
            res.json({ message: 'Progress updated' });
        } catch (error) {
            console.error('Update progress error:', error);
            res.status(500).json({ error: 'Failed to update progress' });
        }
    },

    getProgress: async (req, res) => {
        try {
            const { movieId } = req.params;
            
            const [progress] = await db.execute(
                'SELECT progress, duration, completed FROM watch_progress WHERE user_id = ? AND movie_id = ?',
                [req.user.id, movieId]
            );
            
            res.json(progress[0] || { progress: 0, duration: 0, completed: false });
        } catch (error) {
            res.status(500).json({ error: 'Failed to get progress' });
        }
    },

    getContinueWatching: async (req, res) => {
        try {
            const [movies] = await db.execute(`
                SELECT m.*, wp.progress, wp.duration, wp.last_watched
                FROM movies m
                JOIN watch_progress wp ON m.id = wp.movie_id
                WHERE wp.user_id = ? AND wp.completed = FALSE
                ORDER BY wp.last_watched DESC
                LIMIT 10
            `, [req.user.id]);
            
            res.json(movies);
        } catch (error) {
            console.error('Get continue watching error:', error);
            res.status(500).json({ error: 'Failed to get continue watching' });
        }
    },

    getWatchHistory: async (req, res) => {
        try {
            const { page = 1, limit = 20 } = req.query;
            const offset = (page - 1) * limit;
            
            const [movies] = await db.execute(`
                SELECT m.*, wp.progress, wp.duration, wp.completed, wp.last_watched
                FROM movies m
                JOIN watch_progress wp ON m.id = wp.movie_id
                WHERE wp.user_id = ?
                ORDER BY wp.last_watched DESC
                LIMIT ? OFFSET ?
            `, [req.user.id, parseInt(limit), offset]);
            
            res.json(movies);
        } catch (error) {
            console.error('Get watch history error:', error);
            res.status(500).json({ error: 'Failed to get watch history' });
        }
    }
};

module.exports = progressController;