// Simple validation helpers

function isValidEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

function isValidRole(role) {
  return role === 'student' || role === 'teacher';
}

function isStrongPassword(password) {
  return typeof password === 'string' && password.length >= 6;
}

module.exports = { isValidEmail, isValidRole, isStrongPassword };