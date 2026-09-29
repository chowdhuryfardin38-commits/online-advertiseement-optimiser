// ═══════════════════════════════════════════
// ROUTES/CAMPAIGNROUTES.JS
// All routes require authentication
// ═══════════════════════════════════════════
const express        = require('express');
const router         = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const {
  getCampaigns, getCampaignById, createCampaign,
  updateCampaign, deleteCampaign, getStats
} = require('../controllers/campaignController');

router.use(authMiddleware); // All campaign routes require login

router.get('/',         getCampaigns);
router.get('/stats',    getStats);
router.get('/:id',      getCampaignById);
router.post('/',        createCampaign);
router.patch('/:id',    updateCampaign);
router.delete('/:id',   deleteCampaign);

module.exports = router;
