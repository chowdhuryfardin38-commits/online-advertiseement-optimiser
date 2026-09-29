// ═══════════════════════════════════════════
// CONTROLLERS/CAMPAIGNCONTROLLER.JS
// Authenticated advertiser campaign management
// ═══════════════════════════════════════════
const pool = require('../config/database');

// ── GET /api/campaigns — list user's campaigns
async function getCampaigns(req, res) {
  try {
    const [rows] = await pool.query(
      `SELECT id, user_id, title, description, status, audience, budget, daily_budget,
              spent, start_date, end_date, impressions, clicks, conversions,
              ad_type, target_age, keywords, created_at
       FROM campaigns
       WHERE user_id = ?
       ORDER BY created_at DESC`,
      [req.user.id]
    );

    // Parse JSON keywords
    const campaigns = rows.map(c => ({
      ...c,
      keywords: (() => { try { return JSON.parse(c.keywords); } catch { return []; } })()
    }));

    return res.json({ success: true, campaigns });
  } catch (err) {
    console.error('Get campaigns error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch campaigns.' });
  }
}

// ── GET /api/campaigns/:id — single campaign (must belong to user)
async function getCampaignById(req, res) {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM campaigns WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Campaign not found.' });
    }
    const c = rows[0];
    c.keywords = (() => { try { return JSON.parse(c.keywords); } catch { return []; } })();
    return res.json({ success: true, campaign: c });
  } catch (err) {
    console.error('Get campaign error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch campaign.' });
  }
}

// ── POST /api/campaigns — create campaign
async function createCampaign(req, res) {
  try {
    const {
      title, description, audience, budget, daily_budget,
      start_date, end_date, ad_type, target_age, keywords
    } = req.body;

    if (!title) {
      return res.status(400).json({ success: false, message: 'Campaign title is required.' });
    }
    if (!budget || isNaN(budget) || Number(budget) < 0) {
      return res.status(400).json({ success: false, message: 'A valid budget is required.' });
    }

    // Get system minimum budget setting
    const [settings] = await pool.query("SELECT value FROM system_settings WHERE `key` = 'minBudget'");
    const minBudget = settings.length > 0 ? parseFloat(settings[0].value) : 50;

    if (Number(budget) < minBudget) {
      return res.status(400).json({ success: false, message: `Minimum budget is $${minBudget}.` });
    }

    // Check autoApprove setting
    const [autoSetting] = await pool.query("SELECT value FROM system_settings WHERE `key` = 'autoApprove'");
    const autoApprove = autoSetting.length > 0 && (autoSetting[0].value === 'true' || autoSetting[0].value === '1');
    const campaignStatus = autoApprove ? 'active' : 'pending';

    const keywordsJson = JSON.stringify(
      Array.isArray(keywords) ? keywords : (keywords ? String(keywords).split(',').map(k => k.trim()) : [])
    );

    const [result] = await pool.query(
      `INSERT INTO campaigns
         (user_id, title, description, status, audience, budget, daily_budget,
          start_date, end_date, ad_type, target_age, keywords,
          spent, impressions, clicks, conversions)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 0, 0)`,
      [
        req.user.id, title.trim(), (description || '').trim(), campaignStatus,
        audience || 'general', Number(budget), Number(daily_budget || 0),
        start_date || null, end_date || null,
        ad_type || 'image', target_age || 'all', keywordsJson
      ]
    );

    // Notify user
    await pool.query(
      `INSERT INTO notifications (user_id, type, title, message)
       VALUES (?, ?, ?, ?)`,
      [
        req.user.id,
        campaignStatus === 'active' ? 'success' : 'pending',
        campaignStatus === 'active' ? 'Campaign Activated' : 'Ad Pending Review',
        campaignStatus === 'active'
          ? `Your campaign "${title.trim()}" is now live.`
          : `"${title.trim()}" has been submitted and is awaiting admin approval.`
      ]
    );

    return res.status(201).json({
      success: true,
      message: campaignStatus === 'active'
        ? 'Campaign created and activated.'
        : 'Campaign submitted for admin approval.',
      campaign: { id: result.insertId, status: campaignStatus }
    });

  } catch (err) {
    console.error('Create campaign error:', err);
    return res.status(500).json({ success: false, message: 'Failed to create campaign.' });
  }
}

// ── PATCH /api/campaigns/:id — update own campaign
async function updateCampaign(req, res) {
  try {
    // Verify ownership
    const [rows] = await pool.query(
      'SELECT id, status FROM campaigns WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Campaign not found.' });
    }

    const { title, description, audience, budget, daily_budget, start_date, end_date, ad_type, target_age, keywords } = req.body;
    const updates = {};

    if (title)        updates.title        = title.trim();
    if (description !== undefined) updates.description = description.trim();
    if (audience)     updates.audience     = audience;
    if (budget !== undefined)      updates.budget      = Number(budget);
    if (daily_budget !== undefined) updates.daily_budget = Number(daily_budget);
    if (start_date)   updates.start_date   = start_date;
    if (end_date)     updates.end_date     = end_date;
    if (ad_type)      updates.ad_type      = ad_type;
    if (target_age)   updates.target_age   = target_age;
    if (keywords !== undefined) {
      updates.keywords = JSON.stringify(
        Array.isArray(keywords) ? keywords : String(keywords).split(',').map(k => k.trim())
      );
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ success: false, message: 'No changes provided.' });
    }

    const setClauses = Object.keys(updates).map(k => `${k} = ?`).join(', ');
    await pool.query(
      `UPDATE campaigns SET ${setClauses} WHERE id = ? AND user_id = ?`,
      [...Object.values(updates), req.params.id, req.user.id]
    );

    return res.json({ success: true, message: 'Campaign updated successfully.' });

  } catch (err) {
    console.error('Update campaign error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update campaign.' });
  }
}

// ── DELETE /api/campaigns/:id — delete own campaign
async function deleteCampaign(req, res) {
  try {
    const [result] = await pool.query(
      'DELETE FROM campaigns WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Campaign not found.' });
    }
    return res.json({ success: true, message: 'Campaign deleted.' });
  } catch (err) {
    console.error('Delete campaign error:', err);
    return res.status(500).json({ success: false, message: 'Failed to delete campaign.' });
  }
}

// ── GET /api/campaigns/stats — dashboard stats for current user
async function getStats(req, res) {
  try {
    const userId = req.user.id;

    const [[{ total }]] = await pool.query('SELECT COUNT(*) as total FROM campaigns WHERE user_id = ?', [userId]);
    const [[{ active }]] = await pool.query("SELECT COUNT(*) as active FROM campaigns WHERE user_id = ? AND status = 'active'", [userId]);
    const [[{ totalSpent }]] = await pool.query('SELECT COALESCE(SUM(spent), 0) as totalSpent FROM campaigns WHERE user_id = ?', [userId]);
    const [[{ impressions }]] = await pool.query('SELECT COALESCE(SUM(impressions), 0) as impressions FROM campaigns WHERE user_id = ?', [userId]);
    const [[{ clicks }]] = await pool.query('SELECT COALESCE(SUM(clicks), 0) as clicks FROM campaigns WHERE user_id = ?', [userId]);
    const [[{ conversions }]] = await pool.query('SELECT COALESCE(SUM(conversions), 0) as conversions FROM campaigns WHERE user_id = ?', [userId]);

    const ctr = impressions > 0 ? ((clicks / impressions) * 100).toFixed(2) : '0.00';

    return res.json({
      success: true,
      stats: {
        totalCampaigns: total,
        activeCampaigns: active,
        totalSpent,
        impressions,
        clicks,
        conversions,
        ctr: parseFloat(ctr)
      }
    });
  } catch (err) {
    console.error('Stats error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch stats.' });
  }
}

module.exports = { getCampaigns, getCampaignById, createCampaign, updateCampaign, deleteCampaign, getStats };
