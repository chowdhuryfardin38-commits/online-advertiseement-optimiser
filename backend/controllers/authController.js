// ═══════════════════════════════════════════
// CONTROLLERS/AUTHCONTROLLER.JS
// Handles: register, login, logout, me, updateProfile
// ═══════════════════════════════════════════
const bcrypt       = require('bcryptjs');
const jwt          = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const pool         = require('../config/database');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// ── Cookie helper ─────────────────────────
function sendAuthCookie(res, token) {
  const isProduction = process.env.NODE_ENV === 'production';
  res.cookie('token', token, {
    httpOnly: true,                    // JS cannot read this cookie
    secure:   isProduction,            // HTTPS only in production
    sameSite: isProduction ? 'None' : 'Lax',
    maxAge:   7 * 24 * 60 * 60 * 1000 // 7 days
  });
}

// ── POST /api/auth/register ───────────────
async function register(req, res) {
  try {
    const { name, email, password, company } = req.body;

    // Validate required fields
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Name, email, and password are required.' });
    }
    if (password.length < 8) {
      return res.status(400).json({ success: false, message: 'Password must be at least 8 characters.' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ success: false, message: 'Invalid email address.' });
    }

    // Check for existing email
    const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email.toLowerCase()]);
    if (existing.length > 0) {
      return res.status(409).json({ success: false, message: 'An account with this email already exists.' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);
    const avatar = name.trim()[0].toUpperCase();

    // Insert user — role is always 'advertiser', never from client input
    const [result] = await pool.query(
      `INSERT INTO users (name, email, password, company, role, status, avatar, budget, total_spent)
       VALUES (?, ?, ?, ?, 'advertiser', 'active', ?, 0, 0)`,
      [name.trim(), email.toLowerCase(), hashedPassword, (company || '').trim(), avatar]
    );

    const userId = result.insertId;

    // Create welcome notification
    await pool.query(
      `INSERT INTO notifications (user_id, type, title, message)
       VALUES (?, 'success', 'Welcome to AdOptimize Pro!', ?)`,
      [userId, `Hi ${name.trim()}, your account is set up. Create your first campaign to get started!`]
    );

    // Sign JWT
    const token = jwt.sign(
      { id: userId, role: 'advertiser', email: email.toLowerCase(), name: name.trim() },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    sendAuthCookie(res, token);

    return res.status(201).json({
      success: true,
      message: 'Account created successfully.',
      user: { id: userId, name: name.trim(), email: email.toLowerCase(), role: 'advertiser', avatar }
    });

  } catch (err) {
    console.error('Register error:', err);
    return res.status(500).json({ success: false, message: 'Registration failed. Please try again.' });
  }
}

// ── POST /api/auth/login ──────────────────
async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    // Fetch user
    const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email.toLowerCase()]);
    if (rows.length === 0) {
      return res.status(401).json({ success: false, message: 'No account found with that email.' });
    }

    const user = rows[0];

    // Check account status
    if (user.status === 'inactive') {
      return res.status(403).json({ success: false, message: 'Your account has been deactivated. Please contact support.' });
    }

    // Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Incorrect password. Please try again.' });
    }

    // Sign JWT
    const token = jwt.sign(
      { id: user.id, role: user.role, email: user.email, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    sendAuthCookie(res, token);

    return res.json({
      success: true,
      message: 'Login successful.',
      user: {
        id:     user.id,
        name:   user.name,
        email:  user.email,
        role:   user.role,
        avatar: user.avatar,
        budget: user.budget,
        company: user.company
      }
    });

  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ success: false, message: 'Login failed. Please try again.' });
  }
}

// ── POST /api/auth/logout ─────────────────
function logout(req, res) {
  res.clearCookie('token', { httpOnly: true, sameSite: 'Lax' });
  return res.json({ success: true, message: 'Logged out successfully.' });
}

// ── GET /api/auth/me ──────────────────────
async function me(req, res) {
  try {
    const [rows] = await pool.query(
      'SELECT id, name, email, role, status, avatar, budget, total_spent, company, created_at FROM users WHERE id = ?',
      [req.user.id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }
    return res.json({ success: true, user: rows[0] });
  } catch (err) {
    console.error('Me error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch profile.' });
  }
}

// ── PATCH /api/auth/profile ───────────────
async function updateProfile(req, res) {
  try {
    const { name, company, currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [userId]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }
    const user = rows[0];

    const updates = {};
    if (name)    updates.name    = name.trim();
    if (company !== undefined) updates.company = company.trim();

    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({ success: false, message: 'Current password is required to set a new password.' });
      }
      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) {
        return res.status(400).json({ success: false, message: 'Current password is incorrect.' });
      }
      if (newPassword.length < 8) {
        return res.status(400).json({ success: false, message: 'New password must be at least 8 characters.' });
      }
      updates.password = await bcrypt.hash(newPassword, 12);
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ success: false, message: 'No changes provided.' });
    }

    const setClauses = Object.keys(updates).map(k => `${k} = ?`).join(', ');
    await pool.query(`UPDATE users SET ${setClauses} WHERE id = ?`, [...Object.values(updates), userId]);

    return res.json({ success: true, message: 'Profile updated successfully.' });

  } catch (err) {
    console.error('Update profile error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update profile.' });
  }
}

// ── POST /api/auth/google ─────────────────
async function googleAuth(req, res) {
  try {
    const { credential } = req.body;

    if (!credential) {
      return res.status(400).json({ success: false, message: 'Google credential token is required.' });
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: clientId
    });

    const payload = ticket.getPayload();
    const { email, name, sub: googleId, picture } = payload;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Google account does not contain a valid email.' });
    }

    const lowerEmail = email.toLowerCase();

    // Check if user exists
    const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [lowerEmail]);
    let user;

    if (rows.length > 0) {
      user = rows[0];

      // Block inactive
      if (user.status === 'inactive') {
        return res.status(403).json({ success: false, message: 'Your account has been deactivated. Please contact support.' });
      }

      // Block admin from public Google sign in
      if (user.role === 'admin') {
        return res.status(403).json({ success: false, message: 'Admins must sign in via the Admin Portal.' });
      }

      // Update google_id and picture if not already set
      await pool.query(
        'UPDATE users SET google_id = COALESCE(google_id, ?), picture = COALESCE(picture, ?) WHERE id = ?',
        [googleId, picture || null, user.id]
      );
    } else {
      // Auto-register new user
      const avatar = (name || email)[0].toUpperCase();
      const [result] = await pool.query(
        `INSERT INTO users (name, email, password, company, role, status, avatar, google_id, picture, budget, total_spent)
         VALUES (?, ?, NULL, '', 'advertiser', 'active', ?, ?, ?, 0, 0)`,
        [name ? name.trim() : lowerEmail.split('@')[0], lowerEmail, avatar, googleId, picture || null]
      );

      const userId = result.insertId;

      await pool.query(
        `INSERT INTO notifications (user_id, type, title, message)
         VALUES (?, 'success', 'Welcome to AdOptimize Pro!', ?)`,
        [userId, `Hi ${name || 'there'}, your account is set up via Google Sign-In. Create your first campaign to get started!`]
      );

      user = {
        id: userId,
        name: name ? name.trim() : lowerEmail.split('@')[0],
        email: lowerEmail,
        role: 'advertiser',
        avatar,
        budget: 0,
        company: ''
      };
    }

    // Sign JWT
    const token = jwt.sign(
      { id: user.id, role: user.role, email: user.email, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    sendAuthCookie(res, token);

    return res.json({
      success: true,
      message: 'Google login successful.',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        budget: user.budget || 0,
        company: user.company || ''
      }
    });

  } catch (err) {
    console.error('Google Auth Controller Error:', err);
    return res.status(401).json({ success: false, message: 'Google authentication failed: ' + (err.message || 'Invalid token') });
  }
}

module.exports = { register, login, logout, me, updateProfile, googleAuth };
