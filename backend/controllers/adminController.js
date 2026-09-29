// ═══════════════════════════════════════════
// CONTROLLERS/ADMINCONTROLLER.JS
// All routes require: authMiddleware + adminMiddleware
// ═══════════════════════════════════════════
const bcrypt = require('bcryptjs');
const pool   = require('../config/database');

// ── GET /api/admin/users ──────────────────
async function getAllUsers(req, res) {
  try {
    const [rows] = await pool.query(
      'SELECT id, name, email, role, status, avatar, company, budget, total_spent, created_at FROM users ORDER BY created_at DESC'
    );
    return res.json({ success: true, users: rows });
  } catch (err) {
    console.error('Admin get users error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch users.' });
  }
}

// ── PATCH /api/admin/users/:id/status — activate or deactivate
async function updateUserStatus(req, res) {
  try {
    const { status } = req.body;
    if (!['active', 'inactive'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Status must be "active" or "inactive".' });
    }

    // Prevent admin from deactivating themselves
    if (Number(req.params.id) === req.user.id) {
      return res.status(400).json({ success: false, message: 'You cannot deactivate your own account.' });
    }

    // Prevent deactivating other admins
    const [targetRows] = await pool.query('SELECT role FROM users WHERE id = ?', [req.params.id]);
    if (targetRows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }
    if (targetRows[0].role === 'admin' && status === 'inactive') {
      return res.status(400).json({ success: false, message: 'Cannot deactivate an admin account.' });
    }

    await pool.query('UPDATE users SET status = ? WHERE id = ?', [status, req.params.id]);

    // Notify the user
    const label = status === 'active' ? 'reactivated' : 'deactivated';
    await pool.query(
      `INSERT INTO notifications (user_id, type, title, message) VALUES (?, ?, ?, ?)`,
      [
        req.params.id,
        status === 'active' ? 'success' : 'warning',
        `Account ${label.charAt(0).toUpperCase() + label.slice(1)}`,
        `Your account has been ${label} by an administrator.`
      ]
    );

    return res.json({ success: true, message: `User ${label} successfully.` });
  } catch (err) {
    console.error('Admin update user status error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update user status.' });
  }
}

// ── PATCH /api/admin/users/:id/role — promote/demote
async function updateUserRole(req, res) {
  try {
    const { role } = req.body;
    if (!['advertiser', 'admin'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Role must be "advertiser" or "admin".' });
    }
    if (Number(req.params.id) === req.user.id) {
      return res.status(400).json({ success: false, message: 'You cannot change your own role.' });
    }

    const [rows] = await pool.query('SELECT id FROM users WHERE id = ?', [req.params.id]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    await pool.query('UPDATE users SET role = ? WHERE id = ?', [role, req.params.id]);
    return res.json({ success: true, message: `User role updated to "${role}".` });
  } catch (err) {
    console.error('Admin update role error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update role.' });
  }
}

// ── GET /api/admin/campaigns — all campaigns with owner info
async function getAllCampaigns(req, res) {
  try {
    const [rows] = await pool.query(
      `SELECT c.*, u.name as owner_name, u.email as owner_email
       FROM campaigns c
       JOIN users u ON c.user_id = u.id
       ORDER BY c.created_at DESC`
    );
    const campaigns = rows.map(c => ({
      ...c,
      keywords: (() => { try { return JSON.parse(c.keywords); } catch { return []; } })()
    }));
    return res.json({ success: true, campaigns });
  } catch (err) {
    console.error('Admin get campaigns error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch campaigns.' });
  }
}

// ── PATCH /api/admin/campaigns/:id/approve
async function approveCampaign(req, res) {
  try {
    const [rows] = await pool.query('SELECT * FROM campaigns WHERE id = ?', [req.params.id]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Campaign not found.' });
    }
    const campaign = rows[0];

    await pool.query("UPDATE campaigns SET status = 'active' WHERE id = ?", [req.params.id]);

    await pool.query(
      `INSERT INTO notifications (user_id, type, title, message) VALUES (?, 'success', ?, ?)`,
      [campaign.user_id, 'Campaign Approved', `Your campaign "${campaign.title}" has been approved and is now live.`]
    );

    return res.json({ success: true, message: 'Campaign approved and activated.' });
  } catch (err) {
    console.error('Admin approve campaign error:', err);
    return res.status(500).json({ success: false, message: 'Failed to approve campaign.' });
  }
}

// ── PATCH /api/admin/campaigns/:id/reject
async function rejectCampaign(req, res) {
  try {
    const { reason } = req.body;
    const [rows] = await pool.query('SELECT * FROM campaigns WHERE id = ?', [req.params.id]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Campaign not found.' });
    }
    const campaign = rows[0];

    await pool.query("UPDATE campaigns SET status = 'rejected' WHERE id = ?", [req.params.id]);

    await pool.query(
      `INSERT INTO notifications (user_id, type, title, message) VALUES (?, 'warning', ?, ?)`,
      [
        campaign.user_id,
        'Campaign Rejected',
        `Your campaign "${campaign.title}" was rejected.${reason ? ' Reason: ' + reason : ''}`
      ]
    );

    return res.json({ success: true, message: 'Campaign rejected.' });
  } catch (err) {
    console.error('Admin reject campaign error:', err);
    return res.status(500).json({ success: false, message: 'Failed to reject campaign.' });
  }
}

// ── GET /api/admin/stats — platform-wide stats
async function getPlatformStats(req, res) {
  try {
    const [[{ totalUsers }]]       = await pool.query('SELECT COUNT(*) as totalUsers FROM users');
    const [[{ activeUsers }]]      = await pool.query("SELECT COUNT(*) as activeUsers FROM users WHERE status = 'active'");
    const [[{ totalCampaigns }]]   = await pool.query('SELECT COUNT(*) as totalCampaigns FROM campaigns');
    const [[{ activeCampaigns }]]  = await pool.query("SELECT COUNT(*) as activeCampaigns FROM campaigns WHERE status = 'active'");
    const [[{ pendingCampaigns }]] = await pool.query("SELECT COUNT(*) as pendingCampaigns FROM campaigns WHERE status = 'pending'");
    const [[{ totalRevenue }]]     = await pool.query('SELECT COALESCE(SUM(amount), 0) as totalRevenue FROM payments WHERE status = "completed"');
    const [[{ openComplaints }]]   = await pool.query("SELECT COUNT(*) as openComplaints FROM complaints WHERE status = 'open'");

    return res.json({
      success: true,
      stats: { totalUsers, activeUsers, totalCampaigns, activeCampaigns, pendingCampaigns, totalRevenue, openComplaints }
    });
  } catch (err) {
    console.error('Admin stats error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch platform stats.' });
  }
}

// ── GET /api/admin/settings — get system settings
async function getSettings(req, res) {
  try {
    const [rows] = await pool.query('SELECT `key`, value FROM system_settings');
    const settings = {};
    rows.forEach(r => { settings[r.key] = r.value; });
    return res.json({ success: true, settings });
  } catch (err) {
    console.error('Admin get settings error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch settings.' });
  }
}

// ── PATCH /api/admin/settings — update system settings
async function updateSettings(req, res) {
  try {
    const allowed = ['cpcRate', 'cpmRate', 'minBudget', 'maxDailyBudget', 'autoApprove', 'contentFilter', 'peakHoursStart', 'peakHoursEnd', 'platformFee'];
    const updates = req.body;

    for (const [key, value] of Object.entries(updates)) {
      if (!allowed.includes(key)) continue;
      await pool.query(
        'INSERT INTO system_settings (`key`, value) VALUES (?, ?) ON DUPLICATE KEY UPDATE value = ?',
        [key, String(value), String(value)]
      );
    }

    return res.json({ success: true, message: 'Settings updated.' });
  } catch (err) {
    console.error('Admin update settings error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update settings.' });
  }
}

// ── GET /api/admin/complaints — all support tickets
async function getComplaints(req, res) {
  try {
    const [rows] = await pool.query(
      `SELECT c.*, u.name as user_name, u.email as user_email
       FROM complaints c
       JOIN users u ON c.user_id = u.id
       ORDER BY c.created_at DESC`
    );
    return res.json({ success: true, complaints: rows });
  } catch (err) {
    console.error('Admin get complaints error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch complaints.' });
  }
}

// ── PATCH /api/admin/complaints/:id — update complaint status
async function updateComplaint(req, res) {
  try {
    const { status } = req.body;
    if (!['open', 'in-progress', 'resolved'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status.' });
    }
    const [result] = await pool.query('UPDATE complaints SET status = ? WHERE id = ?', [status, req.params.id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Complaint not found.' });
    }
    return res.json({ success: true, message: 'Complaint updated.' });
  } catch (err) {
    console.error('Admin update complaint error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update complaint.' });
  }
}

// ── POST /api/admin/seed — create initial admin (only if no admin exists)
async function seedAdmin(req, res) {
  try {
    const { name, email, password, seedSecret } = req.body;

    // Protect with a seed secret from .env
    if (seedSecret !== process.env.SEED_SECRET) {
      return res.status(403).json({ success: false, message: 'Invalid seed secret.' });
    }

    const [existing] = await pool.query("SELECT id FROM users WHERE role = 'admin' LIMIT 1");
    if (existing.length > 0) {
      return res.status(400).json({ success: false, message: 'Admin already exists. Use the secure database to manage admins.' });
    }

    if (!name || !email || !password || password.length < 8) {
      return res.status(400).json({ success: false, message: 'Name, email, and password (min 8 chars) are required.' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    await pool.query(
      `INSERT INTO users (name, email, password, role, status, avatar, budget, total_spent)
       VALUES (?, ?, ?, 'admin', 'active', ?, 0, 0)`,
      [name.trim(), email.toLowerCase(), hashedPassword, name.trim()[0].toUpperCase()]
    );

    return res.status(201).json({ success: true, message: 'Admin account created. Remove SEED_SECRET from .env after setup.' });
  } catch (err) {
    console.error('Seed admin error:', err);
    return res.status(500).json({ success: false, message: 'Failed to seed admin.' });
  }
}

module.exports = {
  getAllUsers, updateUserStatus, updateUserRole,
  getAllCampaigns, approveCampaign, rejectCampaign,
  getPlatformStats, getSettings, updateSettings,
  getComplaints, updateComplaint, seedAdmin
};
