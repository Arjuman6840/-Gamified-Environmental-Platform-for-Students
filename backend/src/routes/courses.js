const express = require('express');
const router = express.Router();
const {
  createCourse,
  listCourses,
  getCourse,
  enrollInCourse,
  myCourses
} = require('../controllers/courseController');
const { requireAuth } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

// All course routes require login
router.use(requireAuth);

// Teacher-only
router.post('/', requireRole('teacher'), createCourse);

// Any logged-in user
router.get('/', listCourses);
router.get('/mine', myCourses);
router.get('/:id', getCourse);

// Student-only
router.post('/:id/enroll', requireRole('student'), enrollInCourse);

module.exports = router;