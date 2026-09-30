// ═══════════════════════════════════════════
// ROUTES/AUTHROUTES.JS
// ═══════════════════════════════════════════
const express        = require('express');
const router         = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const {
  register, login, logout, me, updateProfile, googleAuth
} = require('../controllers/authController');

// Public routes
router.post('/register', register);
router.post('/login',    login);
router.post('/logout',   logout);
router.post('/google',   googleAuth);

// Protected routes
router.get('/me',             authMiddleware, me);
router.patch('/profile',      authMiddleware, updateProfile);

module.exports = router;
