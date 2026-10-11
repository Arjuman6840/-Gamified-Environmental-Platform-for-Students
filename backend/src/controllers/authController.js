const bcrypt = require('bcryptjs');
const db = require('../config/db');
const { signToken } = require('../utils/jwt');
const { isValidEmail, isValidRole, isStrongPassword } = require('../utils/validators');

// POST /api/auth/register
async function register(req, res) {
  try {
    const { full_name, email, password, role, school, class: userClass } = req.body;

    // Validation
    if (!full_name || !email || !password || !role) {
      return res.status(400).json({ error: 'full_name, email, password, and role are required' });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    if (!isValidRole(role)) {
      return res.status(400).json({ error: 'role must be either "student" or "teacher"' });
    }

    if (!isStrongPassword(password)) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Check if email already exists
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase());
    if (existing) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    // Hash password
    const hash = await bcrypt.hash(password, 10);

    // Insert user
    const result = db.prepare(`
      INSERT INTO users (full_name, email, password, role, school, class)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      full_name,
      email.toLowerCase(),
      hash,
      role,
      school || null,
      userClass || null
    );

    const userId = result.lastInsertRowid;

    // If student, create an initial rewards row with 0 points
    if (role === 'student') {
      db.prepare('INSERT INTO rewards (student_id, total_points, badges) VALUES (?, 0, ?)').run(userId, '[]');
    }

    // Issue token
    const token = signToken({ id: userId, role });

    // Fetch created user (excluding password)
    const user = db.prepare('SELECT id, full_name, email, role, school, class, created_at FROM users WHERE id = ?').get(userId);

    return res.status(201).json({
      message: 'Registration successful',
      token,
      user
    });
  } catch (err) {
    console.error('Register error:', err);
    return res.status(500).json({ error: 'Server error during registration' });
  }
}

// POST /api/auth/login
async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required' });
    }

    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase());

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const passwordOk = await bcrypt.compare(password, user.password);
    if (!passwordOk) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = signToken({ id: user.id, role: user.role });

    // Return user without password
    const { password: _, ...safeUser } = user;

    return res.json({
      message: 'Login successful',
      token,
      user: safeUser
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Server error during login' });
  }
}

// GET /api/auth/me
function me(req, res) {
  // req.user is set by authMiddleware
  return res.json({ user: req.user });
}

module.exports = { register, login, me };