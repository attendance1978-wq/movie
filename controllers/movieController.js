const db = require('../config/db');

const movieController = {
    getAllMovies: async (req, res) => {
        try {
            const { genre, year, search, sort = 'rating', order = 'DESC', page = 1, limit = 20 } = req.query;
            
            let query = `
                SELECT m.*, 
                       (SELECT AVG(rating) FROM reviews WHERE movie_id = m.id) as average_rating,
                       (SELECT COUNT(*) FROM favorites WHERE movie_id = m.id) as favorite_count
                FROM movies m
                WHERE 1=1
            `;
            const params = [];
            
            if (genre) {
                query += ' AND genre LIKE ?';
                params.push(`%${genre}%`);
            }
            
            if (year) {
                query += ' AND year = ?';
                params.push(year);
            }
            
            if (search) {
                query += ' AND (title LIKE ? OR description LIKE ? OR director LIKE ? OR cast LIKE ?)';
                const searchTerm = `%${search}%`;
                params.push(searchTerm, searchTerm, searchTerm, searchTerm);
            }
            
            // Count total results
            const countQuery = query.replace('SELECT m.*', 'SELECT COUNT(*) as total');
            const [countResult] = await db.execute(countQuery, params);
            const total = countResult[0].total;
            
            // Add sorting and pagination
            const validSortFields = ['title', 'year', 'rating', 'created_at'];
            const sortField = validSortFields.includes(sort) ? sort : 'rating';
            const sortOrder = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
            
            query += ` ORDER BY ${sortField} ${sortOrder}`;
            query += ' LIMIT ? OFFSET ?';
            
            const offset = (page - 1) * limit;
            params.push(parseInt(limit), offset);
            
            const [movies] = await db.execute(query, params);
            
            res.json({
                movies,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    pages: Math.ceil(total / limit)
                }
            });
        } catch (error) {
            console.error('Get movies error:', error);
            res.status(500).json({ error: 'Failed to fetch movies' });
        }
    },

    getMovieById: async (req, res) => {
        try {
            const { id } = req.params;
            
            const [movies] = await db.execute(`
                SELECT m.*, 
                       (SELECT AVG(rating) FROM reviews WHERE movie_id = m.id) as average_rating,
                       wp.progress as user_progress,
                       wp.duration as total_duration,
                       CASE WHEN f.id IS NOT NULL THEN TRUE ELSE FALSE END as is_favorite
                FROM movies m
                LEFT JOIN watch_progress wp ON m.id = wp.movie_id AND wp.user_id = ?
                LEFT JOIN favorites f ON m.id = f.movie_id AND f.user_id = ?
                WHERE m.id = ?
            `, [req.user?.id || 0, req.user?.id || 0, id]);
            
            if (movies.length === 0) {
                return res.status(404).json({ error: 'Movie not found' });
            }
            
            // Get reviews
            const [reviews] = await db.execute(`
                SELECT r.*, u.username 
                FROM reviews r
                JOIN users u ON r.user_id = u.id
                WHERE r.movie_id = ?
                ORDER BY r.created_at DESC
                LIMIT 20
            `, [id]);
            
            res.json({
                ...movies[0],
                reviews
            });
        } catch (error) {
            console.error('Get movie error:', error);
            res.status(500).json({ error: 'Failed to fetch movie' });
        }
    },

    getFeaturedMovies: async (req, res) => {
        try {
            const [movies] = await db.execute(`
                SELECT m.*, 
                       (SELECT AVG(rating) FROM reviews WHERE movie_id = m.id) as average_rating,
                       (SELECT COUNT(*) FROM favorites WHERE movie_id = m.id) as favorite_count
                FROM movies m
                ORDER BY (SELECT AVG(rating) FROM reviews WHERE movie_id = m.id) DESC
                LIMIT 10
            `);
            
            res.json(movies);
        } catch (error) {
            res.status(500).json({ error: 'Failed to fetch featured movies' });
        }
    },

    getMoviesByGenre: async (req, res) => {
        try {
            const { genre } = req.params;
            
            const [movies] = await db.execute(`
                SELECT m.*, 
                       (SELECT AVG(rating) FROM reviews WHERE movie_id = m.id) as average_rating
                FROM movies m
                WHERE genre LIKE ?
                ORDER BY rating DESC
                LIMIT 20
            `, [`%${genre}%`]);
            
            res.json(movies);
        } catch (error) {
            res.status(500).json({ error: 'Failed to fetch movies by genre' });
        }
    },

    addToFavorites: async (req, res) => {
        try {
            const { movieId } = req.params;
            
            await db.execute(
                'INSERT IGNORE INTO favorites (user_id, movie_id) VALUES (?, ?)',
                [req.user.id, movieId]
            );
            
            res.json({ message: 'Added to favorites' });
        } catch (error) {
            res.status(500).json({ error: 'Failed to add to favorites' });
        }
    },

    removeFromFavorites: async (req, res) => {
        try {
            const { movieId } = req.params;
            
            await db.execute(
                'DELETE FROM favorites WHERE user_id = ? AND movie_id = ?',
                [req.user.id, movieId]
            );
            
            res.json({ message: 'Removed from favorites' });
        } catch (error) {
            res.status(500).json({ error: 'Failed to remove from favorites' });
        }
    },

    getFavorites: async (req, res) => {
        try {
            const [favorites] = await db.execute(`
                SELECT m.* 
                FROM movies m
                JOIN favorites f ON m.id = f.movie_id
                WHERE f.user_id = ?
                ORDER BY f.added_at DESC
            `, [req.user.id]);
            
            res.json(favorites);
        } catch (error) {
            res.status(500).json({ error: 'Failed to fetch favorites' });
        }
    },

    addToWatchlist: async (req, res) => {
        try {
            const { movieId } = req.params;

            await db.execute(
                'INSERT IGNORE INTO watchlist (user_id, movie_id) VALUES (?, ?)',
                [req.user.id, movieId]
            );

            res.json({ message: 'Added to watchlist' });
        } catch (error) {
            res.status(500).json({ error: 'Failed to add to watchlist' });
        }
    },

    removeFromWatchlist: async (req, res) => {
        try {
            const { movieId } = req.params;

            await db.execute(
                'DELETE FROM watchlist WHERE user_id = ? AND movie_id = ?',
                [req.user.id, movieId]
            );

            res.json({ message: 'Removed from watchlist' });
        } catch (error) {
            res.status(500).json({ error: 'Failed to remove from watchlist' });
        }
    },

    getWatchlist: async (req, res) => {
        try {
            const [watchlist] = await db.execute(`
                SELECT m.*
                FROM movies m
                JOIN watchlist w ON m.id = w.movie_id
                WHERE w.user_id = ?
                ORDER BY w.added_at DESC
            `, [req.user.id]);

            res.json(watchlist);
        } catch (error) {
            res.status(500).json({ error: 'Failed to fetch watchlist' });
        }
    },

    addReview: async (req, res) => {
        try {
            const { movieId } = req.params;
            const { rating, comment } = req.body;

            if (!rating || rating < 1 || rating > 5) {
                return res.status(400).json({ error: 'Rating must be between 1 and 5' });
            }

            await db.execute(
                `INSERT INTO reviews (user_id, movie_id, rating, comment)
                 VALUES (?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE rating = VALUES(rating), comment = VALUES(comment)`,
                [req.user.id, movieId, rating, comment]
            );

            res.json({ message: 'Review added successfully' });
        } catch (error) {
            res.status(500).json({ error: 'Failed to add review' });
        }
    }
};

module.exports = movieController;