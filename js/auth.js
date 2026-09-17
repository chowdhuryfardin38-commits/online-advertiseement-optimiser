// ═══════════════════════════════════════════
// AUTH.JS
// ═══════════════════════════════════════════

function hashPassword(password) {
  // Simple deterministic hash for demo (not for production)
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return 'hash_' + Math.abs(hash).toString(36);
}

function loginUser(email, password) {
  const users = getUsers();
  const user  = users.find(u => u.email.toLowerCase() === email.toLowerCase());

  if (!user) return { success: false, message: 'No account found with that email.' };
  if (!user.active) return { success: false, message: 'Your account has been deactivated. Please contact support.' };
  if (user.password !== password) return { success: false, message: 'Incorrect password. Please try again.' };

  setSession(user);
  return { success: true, user };
}

function registerUser(name, email, password, company) {
  const users = getUsers();
  if (users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
    return { success: false, message: 'An account with this email already exists.' };
  }
  if (password.length < 6) {
    return { success: false, message: 'Password must be at least 6 characters.' };
  }

  const user = {
    id: genId('user'),
    name: name.trim(),
    email: email.trim().toLowerCase(),
    password,
    company: (company || '').trim(),
    role: 'advertiser',
    active: true,
    createdAt: new Date().toISOString(),
    avatar: name.trim()[0].toUpperCase(),
    budget: 0,
    totalSpent: 0
  };

  addUser(user);
  setSession(user);
  return { success: true, user };
}

function logoutUser() {
  const session = getSession();
  const isAdmin = session && session.role === 'admin';
  clearSession();
  window.location.href = isAdmin ? 'admin-login.html' : 'index.html';
}

function requireAuth(role = null) {
  const session = getSession();
  if (!session) {
    window.location.href = (role === 'admin') ? 'admin-login.html' : 'index.html';
    return null;
  }
  if (role && session.role !== role) {
    window.location.href = session.role === 'admin' ? 'admin.html' : 'dashboard.html';
    return null;
  }
  return session;
}

function updateProfile(userId, updates) {
  const user = getUserById(userId);
  if (!user) return { success: false, message: 'User not found.' };

  if (updates.newPassword) {
    if (updates.currentPassword !== user.password) {
      return { success: false, message: 'Current password is incorrect.' };
    }
    if (updates.newPassword.length < 6) {
      return { success: false, message: 'New password must be at least 6 characters.' };
    }
    updates.password = updates.newPassword;
    delete updates.newPassword;
    delete updates.currentPassword;
  }

  updateUser(userId, updates);
  // Update session name if name changed
  if (updates.name) {
    const db = getDB();
    if (db.session) { db.session.name = updates.name; saveDB(db); }
  }
  return { success: true };
}
