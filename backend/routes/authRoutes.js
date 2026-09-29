// ═══════════════════════════════════════════
// ROUTES/AUTHROUTES.JS
// ═══════════════════════════════════════════
const express        = require('express');
const router         = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const {
  register, login, logout, me, updateProfile
} = require('../controllers/authController');

// Public routes
router.post('/register', register);
router.post('/login',    login);
router.post('/logout',   logout);

// Protected routes
router.get('/me',             authMiddleware, me);
router.patch('/profile',      authMiddleware, updateProfile);

module.exports = router;
