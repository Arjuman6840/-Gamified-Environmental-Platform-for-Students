const express = require('express');
const router = express.Router();
const { tutor, generateQuizHandler, submitQuiz, analyze } = require('../controllers/aiController');
const { requireAuth } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

router.use(requireAuth);

router.post('/tutor', tutor);

router.post('/quiz/generate', requireRole('student'), generateQuizHandler);
router.post('/quiz/submit', requireRole('student'), submitQuiz);
router.get('/analyze', requireRole('student'), analyze);

module.exports = router;