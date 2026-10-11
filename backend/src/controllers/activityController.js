const db = require('../config/db');
const path = require('path');

// POST /api/activities  (student only, multipart/form-data with "proof" file)
function submitActivity(req, res) {
  try {
    const { title, description, course_id } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'title is required' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'proof file is required' });
    }

    const proofUrl = `/uploads/${req.file.filename}`;

    const result = db.prepare(`
      INSERT INTO activities (student_id, course_id, title, description, proof_url)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      req.user.id,
      course_id ? parseInt(course_id) : null,
      title,
      description || null,
      proofUrl
    );

    const activity = db.prepare('SELECT * FROM activities WHERE id = ?').get(result.lastInsertRowid);

    return res.status(201).json({
      message: 'Activity submitted for review',
      activity
    });
  } catch (err) {
    console.error('submitActivity error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

// GET /api/activities/mine  (student — own submissions)
function myActivities(req, res) {
  try {
    const activities = db.prepare(`
      SELECT a.*, c.title AS course_title,
        (SELECT remark FROM activity_remarks ar WHERE ar.activity_id = a.id ORDER BY ar.created_at DESC LIMIT 1) AS latest_remark
      FROM activities a
      LEFT JOIN courses c ON c.id = a.course_id
      WHERE a.student_id = ?
      ORDER BY a.created_at DESC
    `).all(req.user.id);

    return res.json({ activities });
  } catch (err) {
    console.error('myActivities error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

// GET /api/activities/pending  (teacher — all pending)
function pendingActivities(req, res) {
  try {
    const activities = db.prepare(`
      SELECT a.*, u.full_name AS student_name, u.school AS student_school,
             c.title AS course_title
      FROM activities a
      JOIN users u ON u.id = a.student_id
      LEFT JOIN courses c ON c.id = a.course_id
      WHERE a.status = 'pending'
      ORDER BY a.created_at ASC
    `).all();

    return res.json({ activities });
  } catch (err) {
    console.error('pendingActivities error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

// GET /api/activities/all  (teacher — all submissions)
function allActivities(req, res) {
  try {
    const activities = db.prepare(`
      SELECT a.*, u.full_name AS student_name,
             c.title AS course_title
      FROM activities a
      JOIN users u ON u.id = a.student_id
      LEFT JOIN courses c ON c.id = a.course_id
      ORDER BY a.created_at DESC
    `).all();

    return res.json({ activities });
  } catch (err) {
    console.error('allActivities error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

// POST /api/activities/:id/review  (teacher only)
// Body: { status: "approved" | "rejected", remark: "...", points: 10 }
function reviewActivity(req, res) {
  try {
    const activityId = req.params.id;
    const { status, remark, points } = req.body;

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'status must be "approved" or "rejected"' });
    }

    const activity = db.prepare('SELECT * FROM activities WHERE id = ?').get(activityId);
    if (!activity) {
      return res.status(404).json({ error: 'Activity not found' });
    }

    if (activity.status !== 'pending') {
      return res.status(409).json({ error: 'Activity already reviewed' });
    }

    const pointsToAward = status === 'approved' ? (parseInt(points) || 10) : 0;

    // Update activity
    db.prepare(`
      UPDATE activities
      SET status = ?, points_awarded = ?
      WHERE id = ?
    `).run(status, pointsToAward, activityId);

    // Insert remark
    if (remark) {
      db.prepare(`
        INSERT INTO activity_remarks (activity_id, teacher_id, remark)
        VALUES (?, ?, ?)
      `).run(activityId, req.user.id, remark);
    }

    // Award points to student if approved
    if (status === 'approved' && pointsToAward > 0) {
      const reward = db.prepare('SELECT id FROM rewards WHERE student_id = ?').get(activity.student_id);
      if (reward) {
        db.prepare(`
          UPDATE rewards
          SET total_points = total_points + ?, updated_at = CURRENT_TIMESTAMP
          WHERE student_id = ?
        `).run(pointsToAward, activity.student_id);
      } else {
        db.prepare(`
          INSERT INTO rewards (student_id, total_points, badges)
          VALUES (?, ?, '[]')
        `).run(activity.student_id, pointsToAward);
      }
    }

    const updated = db.prepare('SELECT * FROM activities WHERE id = ?').get(activityId);

    return res.json({
      message: `Activity ${status}`,
      activity: updated,
      points_awarded: pointsToAward
    });
  } catch (err) {
    console.error('reviewActivity error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

module.exports = {
  submitActivity,
  myActivities,
  pendingActivities,
  allActivities,
  reviewActivity
};