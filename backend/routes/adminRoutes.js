// ═══════════════════════════════════════════
// ROUTES/ADMINROUTES.JS
// All routes require auth + admin role
// ═══════════════════════════════════════════
const express          = require('express');
const router           = express.Router();
const authMiddleware   = require('../middleware/authMiddleware');
const adminMiddleware  = require('../middleware/adminMiddleware');
const {
  getAllUsers, updateUserStatus, updateUserRole,
  getAllCampaigns, approveCampaign, rejectCampaign,
  getPlatformStats, getSettings, updateSettings,
  getComplaints, updateComplaint, seedAdmin
} = require('../controllers/adminController');

// Seed route — protected by SEED_SECRET, NOT by admin middleware
// (used only once before any admin exists)
router.post('/seed', seedAdmin);

// All other routes require auth + admin
router.use(authMiddleware, adminMiddleware);

// Platform stats
router.get('/stats', getPlatformStats);

// Users
router.get('/users',                     getAllUsers);
router.patch('/users/:id/status',        updateUserStatus);
router.patch('/users/:id/role',          updateUserRole);

// Campaigns
router.get('/campaigns',                 getAllCampaigns);
router.patch('/campaigns/:id/approve',   approveCampaign);
router.patch('/campaigns/:id/reject',    rejectCampaign);

// System settings
router.get('/settings',    getSettings);
router.patch('/settings',  updateSettings);

// Complaints / support tickets
router.get('/complaints',        getComplaints);
router.patch('/complaints/:id',  updateComplaint);

module.exports = router;
