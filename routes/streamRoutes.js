const express = require('express');
const router = express.Router();
const streamController = require('../controllers/streamController');
const { authMiddleware } = require('../middleware/auth');

// Public routes
router.get('/:id', streamController.streamMovie);
router.get('/:id/info', streamController.getMovieInfo);
router.get('/:id/recommended', streamController.getRecommendedMovies);

module.exports = router;