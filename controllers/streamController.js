const fs = require('fs');
const path = require('path');
const db = require('../config/db');

const streamController = {
    streamMovie: async (req, res) => {
        try {
            const { id } = req.params;
            const range = req.headers.range;
            
            if (!range) {
                return res.status(400).send('Requires Range header');
            }
            
            // Get movie info
            const [movies] = await db.execute(
                'SELECT video_path FROM movies WHERE id = ?',
                [id]
            );
            
            if (movies.length === 0) {
                return res.status(404).json({ error: 'Movie not found' });
            }
            
            const videoPath = path.join(__dirname, '..', movies[0].video_path);
            
            // Check if file exists
            if (!fs.existsSync(videoPath)) {
                return res.status(404).json({ error: 'Video file not found' });
            }
            
            const videoSize = fs.statSync(videoPath).size;
            const CHUNK_SIZE = 10 ** 6; // 1MB
            const start = Number(range.replace(/\D/g, ""));
            const end = Math.min(start + CHUNK_SIZE, videoSize - 1);
            const contentLength = end - start + 1;
            
            const headers = {
                "Content-Range": `bytes ${start}-${end}/${videoSize}`,
                "Accept-Ranges": "bytes",
                "Content-Length": contentLength,
                "Content-Type": "video/mp4",
            };
            
            res.writeHead(206, headers);
            const videoStream = fs.createReadStream(videoPath, { start, end });
            videoStream.pipe(res);
            
            // Log stream start
            if (req.user) {
                await db.execute(
                    'INSERT INTO watch_progress (user_id, movie_id) VALUES (?, ?) ON DUPLICATE KEY UPDATE last_watched = CURRENT_TIMESTAMP',
                    [req.user.id, id]
                );
            }
        } catch (error) {
            console.error('Stream error:', error);
            res.status(500).json({ error: 'Streaming failed' });
        }
    },

    getMovieInfo: async (req, res) => {
        try {
            const { id } = req.params;
            
            const [movies] = await db.execute(`
                SELECT m.*, 
                       wp.progress,
                       wp.duration as total_duration
                FROM movies m
                LEFT JOIN watch_progress wp ON m.id = wp.movie_id AND wp.user_id = ?
                WHERE m.id = ?
            `, [req.user?.id || 0, id]);
            
            if (movies.length === 0) {
                return res.status(404).json({ error: 'Movie not found' });
            }
            
            const movie = movies[0];
            
            // Check if video file exists
            const videoPath = path.join(__dirname, '..', movie.video_path);
            const videoSize = fs.existsSync(videoPath) ? fs.statSync(videoPath).size : 0;
            
            res.json({
                ...movie,
                videoSize,
                streamingUrl: `/api/stream/${id}`
            });
        } catch (error) {
            console.error('Get movie info error:', error);
            res.status(500).json({ error: 'Failed to get movie info' });
        }
    },

    getRecommendedMovies: async (req, res) => {
        try {
            const { id } = req.params;
            
            // Get movie genre
            const [movies] = await db.execute(
                'SELECT genre FROM movies WHERE id = ?',
                [id]
            );
            
            if (movies.length === 0) {
                return res.status(404).json({ error: 'Movie not found' });
            }
            
            const genre = movies[0].genre.split(',')[0].trim();
            
            // Get recommended movies (same genre, high rating)
            const [recommended] = await db.execute(`
                SELECT m.*, 
                       (SELECT AVG(rating) FROM reviews WHERE movie_id = m.id) as average_rating
                FROM movies m
                WHERE m.id != ? AND genre LIKE ?
                ORDER BY (SELECT AVG(rating) FROM reviews WHERE movie_id = m.id) DESC
                LIMIT 10
            `, [id, `%${genre}%`]);
            
            res.json(recommended);
        } catch (error) {
            console.error('Get recommendations error:', error);
            res.status(500).json({ error: 'Failed to get recommendations' });
        }
    }
};

module.exports = streamController;