const { verifyToken } = require('../utils/jwt');
const db = require('../config/db');

function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];
  const decoded = verifyToken(token);

  if (!decoded) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  // Load user from DB to get fresh data
  const user = db.prepare('SELECT id, full_name, email, role, school, class FROM users WHERE id = ?').get(decoded.id);

  if (!user) {
    return res.status(401).json({ error: 'User no longer exists' });
  }

  req.user = user;
  next();
}

module.exports = { requireAuth };