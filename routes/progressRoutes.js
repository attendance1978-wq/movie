const express = require('express');
const router = express.Router();
const progressController = require('../controllers/progressController');
const { authMiddleware } = require('../middleware/auth');

// All routes require authentication
router.use(authMiddleware);

router.put('/:movieId', progressController.updateProgress);
router.get('/:movieId', progressController.getProgress);
router.get('/continue', progressController.getContinueWatching);
router.get('/history', progressController.getWatchHistory);

module.exports = router;