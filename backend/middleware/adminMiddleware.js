// ═══════════════════════════════════════════
// MIDDLEWARE/ADMINMIDDLEWARE.JS
// Must be used AFTER authMiddleware.
// Rejects requests from non-admin users.
// ═══════════════════════════════════════════
function adminMiddleware(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Not authenticated.' });
  }
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Access denied. Admin privileges required.' });
  }
  next();
}

module.exports = adminMiddleware;
