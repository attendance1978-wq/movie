const express = require('express');
const router = express.Router();
const movieController = require('../controllers/movieController');
const { authMiddleware } = require('../middleware/auth');

// Public routes
router.get('/', movieController.getAllMovies);
router.get('/featured', movieController.getFeaturedMovies);
router.get('/genre/:genre', movieController.getMoviesByGenre);
router.get('/:id', movieController.getMovieById);

// Protected routes
router.post('/:movieId/favorite', authMiddleware, movieController.addToFavorites);
router.delete('/:movieId/favorite', authMiddleware, movieController.removeFromFavorites);
router.get('/user/favorites', authMiddleware, movieController.getFavorites);
router.post('/:movieId/watchlist', authMiddleware, movieController.addToWatchlist);
router.delete('/:movieId/watchlist', authMiddleware, movieController.removeFromWatchlist);
router.get('/user/watchlist', authMiddleware, movieController.getWatchlist);
router.post('/:movieId/review', authMiddleware, movieController.addReview);

module.exports = router;