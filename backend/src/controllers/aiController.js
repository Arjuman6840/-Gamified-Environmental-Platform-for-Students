const db = require('../config/db');
const { askTutor, generateQuiz, analyzePerformance } = require('../services/aiService');

// POST /api/ai/tutor  { question }
async function tutor(req, res) {
  try {
    const { question } = req.body;
    if (!question || question.trim().length < 3) {
      return res.status(400).json({ error: 'question is required (min 3 characters)' });
    }

    const answer = await askTutor(question.trim());

    db.prepare(`
      INSERT INTO ai_interactions (student_id, topic, question, response)
      VALUES (?, ?, ?, ?)
    `).run(req.user.id, null, question, answer);

    return res.json({ question, answer });
  } catch (err) {
    console.error('tutor error:', err);
    return res.status(500).json({ error: 'AI service failed. Try again.' });
  }
}

// POST /api/ai/quiz/generate  { topic, difficulty, numQuestions }
async function generateQuizHandler(req, res) {
  try {
    const { topic, difficulty = 'easy', numQuestions = 5 } = req.body;
    if (!topic) return res.status(400).json({ error: 'topic is required' });

    const questions = await generateQuiz(topic, difficulty, parseInt(numQuestions));

    const result = db.prepare(`
      INSERT INTO quizzes (topic, difficulty, questions, created_for)
      VALUES (?, ?, ?, ?)
    `).run(topic, difficulty, JSON.stringify(questions), req.user.id);

    const quiz = db.prepare(
      'SELECT id, topic, difficulty, created_at FROM quizzes WHERE id = ?'
    ).get(result.lastInsertRowid);

    return res.status(201).json({ message: 'Quiz generated', quiz, questions });
  } catch (err) {
    console.error('generateQuiz error:', err);
    return res.status(500).json({ error: 'Quiz generation failed. Try again.' });
  }
}

// POST /api/ai/quiz/submit  { quizId, answers: [0,2,1,...] }
function submitQuiz(req, res) {
  try {
    const { quizId, answers } = req.body;
    if (!quizId || !Array.isArray(answers)) {
      return res.status(400).json({ error: 'quizId and answers array are required' });
    }

    const quiz = db.prepare('SELECT * FROM quizzes WHERE id = ?').get(quizId);
    if (!quiz) return res.status(404).json({ error: 'Quiz not found' });

    const questions = JSON.parse(quiz.questions);
    if (answers.length !== questions.length) {
      return res.status(400).json({ error: `Expected ${questions.length} answers, got ${answers.length}` });
    }

    let score = 0;
    const results = questions.map((q, i) => {
      const correct = q.correctIndex === answers[i];
      if (correct) score++;
      return {
        questionIndex: i,
        yourAnswer: answers[i],
        correctIndex: q.correctIndex,
        isCorrect: correct,
        explanation: q.explanation
      };
    });

    const total = questions.length;
    const percentage = Math.round((score / total) * 100);

    db.prepare(`
      INSERT INTO quiz_attempts (student_id, quiz_id, answers, score, total_questions)
      VALUES (?, ?, ?, ?, ?)
    `).run(req.user.id, quizId, JSON.stringify(answers), score, total);

    const mastered = percentage >= 70 ? 1 : 0;
    const needsPractice = percentage < 70 ? 1 : 0;

    db.prepare(`
      INSERT INTO learning_progress (student_id, topic, mastered, needs_practice, last_score, updated_at)
      VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(student_id, topic) DO UPDATE SET
        mastered = excluded.mastered,
        needs_practice = excluded.needs_practice,
        last_score = excluded.last_score,
        updated_at = CURRENT_TIMESTAMP
    `).run(req.user.id, quiz.topic, mastered, needsPractice, percentage);

    const pointsEarned = percentage >= 80 ? 10 : 5;
    const reward = db.prepare('SELECT id FROM rewards WHERE student_id = ?').get(req.user.id);
    if (reward) {
      db.prepare('UPDATE rewards SET total_points = total_points + ?, updated_at = CURRENT_TIMESTAMP WHERE student_id = ?')
        .run(pointsEarned, req.user.id);
    } else {
      db.prepare('INSERT INTO rewards (student_id, total_points, badges) VALUES (?, ?, ?)')
        .run(req.user.id, pointsEarned, '[]');
    }

    return res.json({
      message: 'Quiz submitted',
      score, total, percentage, pointsEarned,
      results
    });
  } catch (err) {
    console.error('submitQuiz error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

// GET /api/ai/analyze
async function analyze(req, res) {
  try {
    const rows = db.prepare(`
      SELECT q.topic, qa.score, qa.total_questions
      FROM quiz_attempts qa
      JOIN quizzes q ON q.id = qa.quiz_id
      WHERE qa.student_id = ?
    `).all(req.user.id);

    if (rows.length === 0) {
      return res.json({ message: 'No quiz attempts yet', analysis: null });
    }

    const topicsMap = {};
    rows.forEach(r => {
      const pct = Math.round((r.score / r.total_questions) * 100);
      if (!topicsMap[r.topic]) topicsMap[r.topic] = [];
      topicsMap[r.topic].push(pct);
    });

    const scoreData = Object.entries(topicsMap).map(([topic, pcts]) => ({
      topic,
      avgScore: Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length),
      attempts: pcts.length
    }));

    const analysis = await analyzePerformance(scoreData);

    return res.json({ scoreData, analysis });
  } catch (err) {
    console.error('analyze error:', err);
    return res.status(500).json({ error: 'Analysis failed' });
  }
}

module.exports = { tutor, generateQuizHandler, submitQuiz, analyze };