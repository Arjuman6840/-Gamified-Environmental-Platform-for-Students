const db = require('../config/db');

// GET /api/leaderboard
// Students see top 10. Teachers see full list with more details.
function getLeaderboard(req, res) {
  try {
    const limit = req.user.role === 'teacher' ? 100 : 10;

    const rows = db.prepare(`
      SELECT
        u.id AS student_id,
        u.full_name,
        u.school,
        COALESCE(r.total_points, 0) AS total_points,
        COALESCE(r.badges, '[]') AS badges,
        (SELECT COUNT(*) FROM activities a WHERE a.student_id = u.id AND a.status = 'approved') AS approved_activities,
        (SELECT COUNT(*) FROM quiz_attempts qa WHERE qa.student_id = u.id) AS quiz_attempts
      FROM users u
      LEFT JOIN rewards r ON r.student_id = u.id
      WHERE u.role = 'student'
      ORDER BY total_points DESC, u.full_name ASC
      LIMIT ?
    `).all(limit);

    // Add rank number
    const leaderboard = rows.map((row, index) => ({
      rank: index + 1,
      ...row,
      badges: JSON.parse(row.badges || '[]')
    }));

    return res.json({
      leaderboard,
      viewer_role: req.user.role,
      total_students: rows.length
    });
  } catch (err) {
    console.error('getLeaderboard error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

// GET /api/leaderboard/me
// Student sees own rank + stats
function myRank(req, res) {
  try {
    const myRow = db.prepare(`
      SELECT
        u.id AS student_id,
        u.full_name,
        COALESCE(r.total_points, 0) AS total_points,
        COALESCE(r.badges, '[]') AS badges,
        (SELECT COUNT(*) FROM activities a WHERE a.student_id = u.id AND a.status = 'approved') AS approved_activities,
        (SELECT COUNT(*) FROM quiz_attempts qa WHERE qa.student_id = u.id) AS quiz_attempts
      FROM users u
      LEFT JOIN rewards r ON r.student_id = u.id
      WHERE u.id = ?
    `).get(req.user.id);

    if (!myRow) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const rankRow = db.prepare(`
      SELECT COUNT(*) + 1 AS rank
      FROM rewards r
      WHERE r.total_points > (SELECT COALESCE(total_points, 0) FROM rewards WHERE student_id = ?)
    `).get(req.user.id);

    return res.json({
      ...myRow,
      badges: JSON.parse(myRow.badges || '[]'),
      rank: rankRow.rank
    });
  } catch (err) {
    console.error('myRank error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

// POST /api/leaderboard/award-badge  (teacher only)
// Body: { studentId, badge }
function awardBadge(req, res) {
  try {
    const { studentId, badge } = req.body;

    if (!studentId || !badge) {
      return res.status(400).json({ error: 'studentId and badge are required' });
    }

    const student = db.prepare('SELECT id FROM users WHERE id = ? AND role = ?').get(studentId, 'student');
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const reward = db.prepare('SELECT * FROM rewards WHERE student_id = ?').get(studentId);
    if (!reward) {
      db.prepare('INSERT INTO rewards (student_id, total_points, badges) VALUES (?, 0, ?)').run(studentId, '[]');
    }

    const current = db.prepare('SELECT badges FROM rewards WHERE student_id = ?').get(studentId);
    const badges = JSON.parse(current.badges || '[]');
    if (!badges.includes(badge)) {
      badges.push(badge);
    }

    db.prepare('UPDATE rewards SET badges = ?, updated_at = CURRENT_TIMESTAMP WHERE student_id = ?')
      .run(JSON.stringify(badges), studentId);

    return res.json({
      message: 'Badge awarded',
      studentId,
      badges
    });
  } catch (err) {
    console.error('awardBadge error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

module.exports = { getLeaderboard, myRank, awardBadge };