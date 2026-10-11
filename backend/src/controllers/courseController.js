const db = require('../config/db');

// POST /api/courses  (teacher only)
function createCourse(req, res) {
  try {
    const { title, description, topic } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'title is required' });
    }

    const result = db.prepare(`
      INSERT INTO courses (title, description, topic, created_by)
      VALUES (?, ?, ?, ?)
    `).run(title, description || null, topic || null, req.user.id);

    const course = db.prepare('SELECT * FROM courses WHERE id = ?').get(result.lastInsertRowid);

    return res.status(201).json({ message: 'Course created', course });
  } catch (err) {
    console.error('createCourse error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

// GET /api/courses  (all users)
function listCourses(req, res) {
  try {
    const courses = db.prepare(`
      SELECT c.*, u.full_name AS teacher_name,
        (SELECT COUNT(*) FROM enrollments e WHERE e.course_id = c.id) AS enrolled_count
      FROM courses c
      LEFT JOIN users u ON u.id = c.created_by
      ORDER BY c.created_at DESC
    `).all();

    return res.json({ courses });
  } catch (err) {
    console.error('listCourses error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

// GET /api/courses/:id
function getCourse(req, res) {
  try {
    const course = db.prepare(`
      SELECT c.*, u.full_name AS teacher_name
      FROM courses c
      LEFT JOIN users u ON u.id = c.created_by
      WHERE c.id = ?
    `).get(req.params.id);

    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    return res.json({ course });
  } catch (err) {
    console.error('getCourse error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

// POST /api/courses/:id/enroll  (student only)
function enrollInCourse(req, res) {
  try {
    const courseId = req.params.id;
    const studentId = req.user.id;

    const course = db.prepare('SELECT id FROM courses WHERE id = ?').get(courseId);
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    const existing = db.prepare(
      'SELECT id FROM enrollments WHERE student_id = ? AND course_id = ?'
    ).get(studentId, courseId);

    if (existing) {
      return res.status(409).json({ error: 'Already enrolled in this course' });
    }

    db.prepare('INSERT INTO enrollments (student_id, course_id) VALUES (?, ?)').run(studentId, courseId);

    return res.status(201).json({ message: 'Enrolled successfully' });
  } catch (err) {
    console.error('enrollInCourse error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

// GET /api/courses/mine  (both roles)
function myCourses(req, res) {
  try {
    if (req.user.role === 'teacher') {
      const courses = db.prepare(`
        SELECT c.*,
          (SELECT COUNT(*) FROM enrollments e WHERE e.course_id = c.id) AS enrolled_count
        FROM courses c
        WHERE c.created_by = ?
        ORDER BY c.created_at DESC
      `).all(req.user.id);
      return res.json({ courses });
    }

    // student
    const courses = db.prepare(`
      SELECT c.*, u.full_name AS teacher_name, e.enrolled_at
      FROM enrollments e
      JOIN courses c ON c.id = e.course_id
      LEFT JOIN users u ON u.id = c.created_by
      WHERE e.student_id = ?
      ORDER BY e.enrolled_at DESC
    `).all(req.user.id);

    return res.json({ courses });
  } catch (err) {
    console.error('myCourses error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

module.exports = { createCourse, listCourses, getCourse, enrollInCourse, myCourses };