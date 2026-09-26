const express = require('express');
const { query, transact, initDB } = require('./db-client');

const app = express();
app.use(express.json({ limit: '10mb' })); // Support full DB syncs

// Helper to format setting values correctly
function parseSettingValue(key, value) {
  if (['cpcRate', 'cpmRate', 'minBudget', 'maxDailyBudget', 'platformFee'].includes(key)) {
    return parseFloat(value);
  }
  if (['peakHoursStart', 'peakHoursEnd'].includes(key)) {
    return parseInt(value, 10);
  }
  if (['autoApprove', 'contentFilter'].includes(key)) {
    return value === 'true' || value === '1';
  }
  return value;
}

// GET /api/db - Fetches full database state
app.get('/api/db', async (req, res) => {
  try {
    // Ensure DB is initialized
    await initDB();
    
    const usersRows = await query('SELECT * FROM users');
    const campaignsRows = await query('SELECT * FROM campaigns');
    const paymentsRows = await query('SELECT * FROM payments');
    const notificationsRows = await query('SELECT * FROM notifications');
    const complaintsRows = await query('SELECT * FROM complaints');
    const settingsRows = await query('SELECT * FROM system_settings');
    
    // Normalize boolean values & parse JSON structures
    const users = usersRows.map(u => ({
      ...u,
      active: u.active === 1 || u.active === true || u.active === 'true'
    }));
    
    const campaigns = campaignsRows.map(c => {
      let keywords = [];
      if (c.keywords) {
        try {
          keywords = typeof c.keywords === 'string' ? JSON.parse(c.keywords) : c.keywords;
        } catch (e) {
          keywords = [];
        }
      }
      return {
        ...c,
        keywords
      };
    });
    
    const payments = paymentsRows;
    
    const notifications = notificationsRows.map(n => ({
      ...n,
      read: n.read === 1 || n.read === true || n.read === 'true'
    }));
    
    const complaints = complaintsRows;
    
    const systemSettings = {};
    settingsRows.forEach(row => {
      systemSettings[row.key] = parseSettingValue(row.key, row.value);
    });
    
    res.json({
      version: 1,
      users,
      campaigns,
      payments,
      notifications,
      complaints,
      systemSettings,
      session: null // Frontend manages its own session cache in localStorage
    });
  } catch (err) {
    console.error('Error fetching database:', err);
    res.status(500).json({ error: 'Database fetch failed', details: err.message });
  }
});

// POST /api/sync - Syncs client database state back to SQL database
app.post('/api/sync', async (req, res) => {
  try {
    await initDB();
    
    const db = req.body;
    if (!db || !db.users || !db.campaigns || !db.payments || !db.notifications || !db.complaints || !db.systemSettings) {
      return res.status(400).json({ error: 'Invalid database payload' });
    }
    
    await transact(async (q) => {
      // 1. Sync users
      const userIds = db.users.map(u => u.id);
      if (userIds.length > 0) {
        const params = userIds.map((_, i) => `$${i + 1}`).join(', ');
        await q(`DELETE FROM users WHERE id NOT IN (${params})`, userIds);
      } else {
        await q(`DELETE FROM users`);
      }
      for (const u of db.users) {
        await q(`
          INSERT INTO users (id, name, email, password, company, role, active, createdAt, avatar, budget, totalSpent)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            email = EXCLUDED.email,
            password = EXCLUDED.password,
            company = EXCLUDED.company,
            role = EXCLUDED.role,
            active = EXCLUDED.active,
            budget = EXCLUDED.budget,
            totalSpent = EXCLUDED.totalSpent
        `, [u.id, u.name, u.email, u.password, u.company, u.role, u.active ? 1 : 0, u.createdAt, u.avatar, u.budget, u.totalSpent]);
      }

      // 2. Sync campaigns
      const campaignIds = db.campaigns.map(c => c.id);
      if (campaignIds.length > 0) {
        const params = campaignIds.map((_, i) => `$${i + 1}`).join(', ');
        await q(`DELETE FROM campaigns WHERE id NOT IN (${params})`, campaignIds);
      } else {
        await q(`DELETE FROM campaigns`);
      }
      for (const c of db.campaigns) {
        await q(`
          INSERT INTO campaigns (id, userId, title, description, status, audience, budget, dailyBudget, spent, startDate, endDate, impressions, clicks, conversions, image, createdAt, keywords, adType, targetAge)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
          ON CONFLICT (id) DO UPDATE SET
            userId = EXCLUDED.userId,
            title = EXCLUDED.title,
            description = EXCLUDED.description,
            status = EXCLUDED.status,
            audience = EXCLUDED.audience,
            budget = EXCLUDED.budget,
            dailyBudget = EXCLUDED.dailyBudget,
            spent = EXCLUDED.spent,
            startDate = EXCLUDED.startDate,
            endDate = EXCLUDED.endDate,
            impressions = EXCLUDED.impressions,
            clicks = EXCLUDED.clicks,
            conversions = EXCLUDED.conversions,
            image = EXCLUDED.image,
            keywords = EXCLUDED.keywords,
            adType = EXCLUDED.adType,
            targetAge = EXCLUDED.targetAge
        `, [
          c.id, c.userId, c.title, c.description, c.status, c.audience, c.budget, c.dailyBudget, c.spent,
          c.startDate, c.endDate, c.impressions, c.clicks, c.conversions, c.image, c.createdAt,
          JSON.stringify(c.keywords || []), c.adType, c.targetAge
        ]);
      }

      // 3. Sync payments
      const paymentIds = db.payments.map(p => p.id);
      if (paymentIds.length > 0) {
        const params = paymentIds.map((_, i) => `$${i + 1}`).join(', ');
        await q(`DELETE FROM payments WHERE id NOT IN (${params})`, paymentIds);
      } else {
        await q(`DELETE FROM payments`);
      }
      for (const p of db.payments) {
        await q(`
          INSERT INTO payments (id, userId, amount, method, status, description, createdAt)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT (id) DO UPDATE SET
            userId = EXCLUDED.userId,
            amount = EXCLUDED.amount,
            method = EXCLUDED.method,
            status = EXCLUDED.status,
            description = EXCLUDED.description
        `, [p.id, p.userId, p.amount, p.method, p.status, p.description, p.createdAt]);
      }

      // 4. Sync notifications
      const notificationIds = db.notifications.map(n => n.id);
      if (notificationIds.length > 0) {
        const params = notificationIds.map((_, i) => `$${i + 1}`).join(', ');
        await q(`DELETE FROM notifications WHERE id NOT IN (${params})`, notificationIds);
      } else {
        await q(`DELETE FROM notifications`);
      }
      for (const n of db.notifications) {
        await q(`
          INSERT INTO notifications (id, userId, type, title, message, read, createdAt)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT (id) DO UPDATE SET
            userId = EXCLUDED.userId,
            type = EXCLUDED.type,
            title = EXCLUDED.title,
            message = EXCLUDED.message,
            read = EXCLUDED.read
        `, [n.id, n.userId, n.type, n.title, n.message, n.read ? 1 : 0, n.createdAt]);
      }

      // 5. Sync complaints
      const complaintIds = db.complaints.map(c => c.id);
      if (complaintIds.length > 0) {
        const params = complaintIds.map((_, i) => `$${i + 1}`).join(', ');
        await q(`DELETE FROM complaints WHERE id NOT IN (${params})`, complaintIds);
      } else {
        await q(`DELETE FROM complaints`);
      }
      for (const c of db.complaints) {
        await q(`
          INSERT INTO complaints (id, userId, subject, message, status, priority, createdAt)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT (id) DO UPDATE SET
            userId = EXCLUDED.userId,
            subject = EXCLUDED.subject,
            message = EXCLUDED.message,
            status = EXCLUDED.status,
            priority = EXCLUDED.priority
        `, [c.id, c.userId, c.subject, c.message, c.status, c.priority, c.createdAt]);
      }

      // 6. Sync settings
      await q(`DELETE FROM system_settings`);
      for (const [key, value] of Object.entries(db.systemSettings)) {
        await q(`INSERT INTO system_settings (key, value) VALUES ($1, $2)`, [key, String(value)]);
      }
    });
    
    res.json({ success: true });
  } catch (err) {
    console.error('Error syncing database:', err);
    res.status(500).json({ error: 'Database sync failed', details: err.message });
  }
});

module.exports = app;
