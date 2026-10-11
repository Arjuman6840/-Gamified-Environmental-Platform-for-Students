const express = require('express');
const router = express.Router();
const upload = require('../middleware/uploadMiddleware');
const {
  submitActivity,
  myActivities,
  pendingActivities,
  allActivities,
  reviewActivity
} = require('../controllers/activityController');
const { requireAuth } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

// All routes require login
router.use(requireAuth);

// Student routes
router.post('/', requireRole('student'), upload.single('proof'), submitActivity);
router.get('/mine', requireRole('student'), myActivities);

// Teacher routes
router.get('/pending', requireRole('teacher'), pendingActivities);
router.get('/all', requireRole('teacher'), allActivities);
router.post('/:id/review', requireRole('teacher'), reviewActivity);

module.exports = router;