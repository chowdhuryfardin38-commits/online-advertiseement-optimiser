// ═══════════════════════════════════════════
// MIDDLEWARE/AUTHMIDDLEWARE.JS
// Verifies the JWT stored in the HttpOnly cookie.
// Attaches req.user = { id, role, email, name }
// ═══════════════════════════════════════════
const jwt = require('jsonwebtoken');

function authMiddleware(req, res, next) {
  const token = req.cookies?.token;

  if (!token) {
    return res.status(401).json({ success: false, message: 'Not authenticated. Please log in.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { id, role, email, name }
    next();
  } catch (err) {
    res.clearCookie('token');
    return res.status(401).json({ success: false, message: 'Session expired. Please log in again.' });
  }
}

module.exports = authMiddleware;
