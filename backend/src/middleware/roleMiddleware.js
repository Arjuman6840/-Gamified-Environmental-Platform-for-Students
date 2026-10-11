function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Forbidden — you do not have permission for this action',
        your_role: req.user.role,
        required_role: allowedRoles
      });
    }

    next();
  };
}

module.exports = { requireRole };