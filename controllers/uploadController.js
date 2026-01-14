const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../config/db');
const ffmpeg = require('../config/ffmpeg');

// Configure storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '..', 'uploads', 'videos');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

// File filter
const fileFilter = (req, file, cb) => {
    const allowedTypes = /mp4|mov|avi|mkv|webm/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (extname && mimetype) {
        return cb(null, true);
    } else {
        cb(new Error('Only video files are allowed'));
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 1024 * 1024 * 1024 // 1GB max file size
    }
});

const uploadController = {
    uploadMovie: [
        upload.single('video'),
        async (req, res) => {
            try {
                if (!req.file) {
                    return res.status(400).json({ error: 'No video file uploaded' });
                }
                
                const { title, description, year, genre, duration, director, cast } = req.body;
                
                // Validate required fields
                if (!title || !genre) {
                    return res.status(400).json({ error: 'Title and genre are required' });
                }
                
                // Create thumbnail
                const thumbnailDir = path.join(__dirname, '..', 'uploads', 'thumbnails');
                if (!fs.existsSync(thumbnailDir)) {
                    fs.mkdirSync(thumbnailDir, { recursive: true });
                }
                
                const thumbnailName = `${Date.now()}-thumbnail.jpg`;
                const thumbnailPath = path.join('uploads', 'thumbnails', thumbnailName);
                const fullThumbnailPath = path.join(__dirname, '..', thumbnailPath);
                
                try {
                    await ffmpeg.createThumbnail(req.file.path, path.dirname(fullThumbnailPath));
                } catch (error) {
                    console.warn('Could not create thumbnail:', error.message);
                }
                
                // Insert into database
                const [result] = await db.execute(
                    `INSERT INTO movies 
                     (title, description, year, genre, duration, director, cast, video_path, thumbnail_path) 
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        title,
                        description || null,
                        year || null,
                        genre,
                        duration || null,
                        director || null,
                        cast || null,
                        req.file.path,
                        thumbnailPath
                    ]
                );
                
                res.status(201).json({
                    message: 'Movie uploaded successfully',
                    movieId: result.insertId,
                    videoPath: req.file.path,
                    thumbnailPath: thumbnailPath
                });
            } catch (error) {
                console.error('Upload error:', error);
                res.status(500).json({ error: 'Upload failed' });
            }
        }
    ],

    deleteMovie: async (req, res) => {
        try {
            const { id } = req.params;
            
            // Get movie info
            const [movies] = await db.execute(
                'SELECT video_path, thumbnail_path FROM movies WHERE id = ?',
                [id]
            );
            
            if (movies.length === 0) {
                return res.status(404).json({ error: 'Movie not found' });
            }
            
            // Delete files
            const movie = movies[0];
            if (movie.video_path && fs.existsSync(movie.video_path)) {
                fs.unlinkSync(movie.video_path);
            }
            if (movie.thumbnail_path && fs.existsSync(movie.thumbnail_path)) {
                fs.unlinkSync(movie.thumbnail_path);
            }
            
            // Delete from database
            await db.execute('DELETE FROM movies WHERE id = ?', [id]);
            
            res.json({ message: 'Movie deleted successfully' });
        } catch (error) {
            console.error('Delete error:', error);
            res.status(500).json({ error: 'Delete failed' });
        }
    },

    updateMovie: async (req, res) => {
        try {
            const { id } = req.params;
            const { title, description, year, genre, duration, director, cast } = req.body;
            
            // Check if movie exists
            const [movies] = await db.execute('SELECT id FROM movies WHERE id = ?', [id]);
            if (movies.length === 0) {
                return res.status(404).json({ error: 'Movie not found' });
            }
            
            // Update movie
            await db.execute(
                `UPDATE movies 
                 SET title = ?, description = ?, year = ?, genre = ?, duration = ?, 
                     director = ?, cast = ?, updated_at = CURRENT_TIMESTAMP
                 WHERE id = ?`,
                [title, description, year, genre, duration, director, cast, id]
            );
            
            res.json({ message: 'Movie updated successfully' });
        } catch (error) {
            console.error('Update error:', error);
            res.status(500).json({ error: 'Update failed' });
        }
    }
};

module.exports = uploadController;