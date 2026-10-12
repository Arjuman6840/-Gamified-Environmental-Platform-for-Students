const express = require('express');
const router = express.Router();
const { getLeaderboard, myRank, awardBadge } = require('../controllers/leaderboardController');
const { requireAuth } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

router.use(requireAuth);

// Both roles
router.get('/', getLeaderboard);

// Student's own rank
router.get('/me', requireRole('student'), myRank);

// Teacher awards badge
router.post('/award-badge', requireRole('teacher'), awardBadge);

module.exports = router;