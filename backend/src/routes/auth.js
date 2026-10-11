const express = require('express');
const router = express.Router();
const { register, login, me } = require('../controllers/authController');
const { requireAuth } = require('../middleware/authMiddleware');

// Public routes
router.post('/register', register);
router.post('/login', login);

// Protected route (requires valid token)
router.get('/me', requireAuth, me);

module.exports = router;