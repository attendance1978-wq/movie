const express = require('express');
const router = express.Router();
const uploadController = require('../controllers/uploadController');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

// All admin routes require authentication and admin privileges
router.use(authMiddleware);
router.use(adminMiddleware);

// Movie management
router.post('/movies', uploadController.uploadMovie);
router.put('/movies/:id', uploadController.updateMovie);
router.delete('/movies/:id', uploadController.deleteMovie);

module.exports = router;