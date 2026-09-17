// ═══════════════════════════════════════════
// STORAGE.JS — LocalStorage abstraction
// ═══════════════════════════════════════════

const DB_KEY = 'adoptimize_db';

const defaultDB = {
  version: 1,
  users: [
    {
      id: 'admin_001',
      name: 'System Admin',
      email: 'admin@adpro.com',
      password: 'admin123',
      company: 'AdOptimize Pro',
      role: 'admin',
      active: true,
      createdAt: '2024-01-01T00:00:00Z',
      avatar: 'A'
    },
    {
      id: 'user_001',
      name: 'Alex Johnson',
      email: 'demo@adpro.com',
      password: 'demo123',
      company: 'TechCorp Inc.',
      role: 'advertiser',
      active: true,
      createdAt: '2024-02-15T09:30:00Z',
      avatar: 'A',
      budget: 5000,
      totalSpent: 2340
    }
  ],
  campaigns: [
    {
      id: 'camp_001',
      userId: 'user_001',
      title: 'Summer Sale 2024',
      description: 'Drive traffic to our summer collection with compelling visuals and special discounts.',
      status: 'active',
      audience: 'millennials',
      budget: 1500,
      dailyBudget: 50,
      spent: 870,
      startDate: '2024-06-01',
      endDate: '2024-08-31',
      impressions: 45230,
      clicks: 2340,
      conversions: 187,
      image: null,
      createdAt: '2024-05-28T10:00:00Z',
      keywords: ['summer', 'sale', 'fashion', 'discount'],
      adType: 'image',
      targetAge: '18-34'
    },
    {
      id: 'camp_002',
      userId: 'user_001',
      title: 'Product Launch — X1 Pro',
      description: 'Announcing our newest flagship product with cutting-edge features.',
      status: 'active',
      audience: 'tech-enthusiasts',
      budget: 3000,
      dailyBudget: 100,
      spent: 1470,
      startDate: '2024-06-15',
      endDate: '2024-09-15',
      impressions: 89400,
      clicks: 4520,
      conversions: 312,
      image: null,
      createdAt: '2024-06-10T14:00:00Z',
      keywords: ['technology', 'gadget', 'pro', 'innovation'],
      adType: 'video',
      targetAge: '25-45'
    },
    {
      id: 'camp_003',
      userId: 'user_001',
      title: 'Holiday Gift Guide',
      description: 'Curated holiday gift recommendations for every budget.',
      status: 'pending',
      audience: 'families',
      budget: 800,
      dailyBudget: 40,
      spent: 0,
      startDate: '2024-12-01',
      endDate: '2024-12-31',
      impressions: 0,
      clicks: 0,
      conversions: 0,
      image: null,
      createdAt: '2024-11-20T08:00:00Z',
      keywords: ['gifts', 'holiday', 'family', 'deals'],
      adType: 'image',
      targetAge: '30-55'
    }
  ],
  payments: [
    {
      id: 'pay_001',
      userId: 'user_001',
      amount: 500,
      method: 'Visa ****4242',
      status: 'completed',
      description: 'Campaign budget top-up',
      createdAt: '2024-06-01T10:00:00Z'
    },
    {
      id: 'pay_002',
      userId: 'user_001',
      amount: 1000,
      method: 'Mastercard ****5555',
      status: 'completed',
      description: 'Product Launch campaign deposit',
      createdAt: '2024-06-10T14:30:00Z'
    },
    {
      id: 'pay_003',
      userId: 'user_001',
      amount: 840,
      method: 'Visa ****4242',
      status: 'completed',
      description: 'Budget refill',
      createdAt: '2024-07-01T09:15:00Z'
    }
  ],
  notifications: [
    {
      id: 'notif_001',
      userId: 'user_001',
      type: 'success',
      title: 'Campaign Activated',
      message: 'Your "Summer Sale 2024" campaign is now live and running.',
      read: false,
      createdAt: '2024-06-01T10:05:00Z'
    },
    {
      id: 'notif_002',
      userId: 'user_001',
      type: 'warning',
      title: 'Budget Alert',
      message: 'Summer Sale 2024 has used 58% of its budget. Consider adding more.',
      read: false,
      createdAt: '2024-07-15T08:00:00Z'
    },
    {
      id: 'notif_003',
      userId: 'user_001',
      type: 'info',
      title: 'Optimization Tip',
      message: 'Your ads perform 40% better between 7-9 PM. Try peak-hour scheduling.',
      read: true,
      createdAt: '2024-07-20T12:00:00Z'
    },
    {
      id: 'notif_004',
      userId: 'user_001',
      type: 'pending',
      title: 'Ad Pending Review',
      message: '"Holiday Gift Guide" has been submitted and is awaiting admin approval.',
      read: false,
      createdAt: '2024-11-20T08:05:00Z'
    }
  ],
  complaints: [
    {
      id: 'ticket_001',
      userId: 'user_001',
      subject: 'Payment not processed',
      message: 'I made a payment of $500 but it has not been credited to my account.',
      status: 'open',
      priority: 'high',
      createdAt: '2024-07-10T11:00:00Z'
    },
    {
      id: 'ticket_002',
      userId: 'user_001',
      subject: 'Ad rejected unfairly',
      message: 'My ad was rejected but it follows all guidelines. Please review.',
      status: 'resolved',
      priority: 'medium',
      createdAt: '2024-06-25T14:00:00Z'
    }
  ],
  systemSettings: {
    cpcRate: 0.45,
    cpmRate: 2.50,
    minBudget: 50,
    maxDailyBudget: 10000,
    autoApprove: false,
    contentFilter: true,
    peakHoursStart: 18,
    peakHoursEnd: 22,
    platformFee: 5
  },
  session: null
};

// Initialize DB
function initDB() {
  if (!localStorage.getItem(DB_KEY)) {
    localStorage.setItem(DB_KEY, JSON.stringify(defaultDB));
  }
}

function getDB() {
  try {
    return JSON.parse(localStorage.getItem(DB_KEY)) || defaultDB;
  } catch {
    return defaultDB;
  }
}

function saveDB(db) {
  localStorage.setItem(DB_KEY, JSON.stringify(db));
}

// ─── CRUD Helpers ───────────────────────────
function getUsers()     { return getDB().users; }
function getCampaigns() { return getDB().campaigns; }
function getPayments()  { return getDB().payments; }
function getNotifications() { return getDB().notifications; }
function getComplaints()    { return getDB().complaints; }
function getSettings()      { return getDB().systemSettings; }

function getUserById(id) { return getUsers().find(u => u.id === id); }
function getCampaignById(id) { return getCampaigns().find(c => c.id === id); }

function getUserCampaigns(userId) {
  return getCampaigns().filter(c => c.userId === userId);
}

function getUserNotifications(userId) {
  return getNotifications().filter(n => n.userId === userId)
    .sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
}

function getUserPayments(userId) {
  return getPayments().filter(p => p.userId === userId)
    .sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
}

function addUser(user) {
  const db = getDB();
  db.users.push(user);
  saveDB(db);
}

function updateUser(id, updates) {
  const db = getDB();
  const idx = db.users.findIndex(u => u.id === id);
  if (idx !== -1) { db.users[idx] = { ...db.users[idx], ...updates }; saveDB(db); }
}

function addCampaign(campaign) {
  const db = getDB();
  db.campaigns.push(campaign);
  saveDB(db);
}

function updateCampaign(id, updates) {
  const db = getDB();
  const idx = db.campaigns.findIndex(c => c.id === id);
  if (idx !== -1) { db.campaigns[idx] = { ...db.campaigns[idx], ...updates }; saveDB(db); }
}

function deleteCampaign(id) {
  const db = getDB();
  db.campaigns = db.campaigns.filter(c => c.id !== id);
  saveDB(db);
}

function addPayment(payment) {
  const db = getDB();
  db.payments.push(payment);
  // Update user's totalSpent
  const userIdx = db.users.findIndex(u => u.id === payment.userId);
  if (userIdx !== -1) {
    db.users[userIdx].totalSpent = (db.users[userIdx].totalSpent || 0) + payment.amount;
    db.users[userIdx].budget = (db.users[userIdx].budget || 0) + payment.amount;
  }
  saveDB(db);
}

function addNotification(notif) {
  const db = getDB();
  db.notifications.push(notif);
  saveDB(db);
}

function markNotificationRead(id) {
  const db = getDB();
  const idx = db.notifications.findIndex(n => n.id === id);
  if (idx !== -1) { db.notifications[idx].read = true; saveDB(db); }
}

function markAllNotificationsRead(userId) {
  const db = getDB();
  db.notifications.forEach(n => { if (n.userId === userId) n.read = true; });
  saveDB(db);
}

function addComplaint(complaint) {
  const db = getDB();
  db.complaints.push(complaint);
  saveDB(db);
}

function updateComplaint(id, updates) {
  const db = getDB();
  const idx = db.complaints.findIndex(c => c.id === id);
  if (idx !== -1) { db.complaints[idx] = { ...db.complaints[idx], ...updates }; saveDB(db); }
}

function updateSettings(updates) {
  const db = getDB();
  db.systemSettings = { ...db.systemSettings, ...updates };
  saveDB(db);
}

// Session
function getSession()     { return getDB().session; }
function setSession(user) {
  const db = getDB();
  db.session = { userId: user.id, role: user.role, name: user.name, email: user.email };
  saveDB(db);
}
function clearSession() {
  const db = getDB();
  db.session = null;
  saveDB(db);
}

// Unique ID generator
function genId(prefix = 'id') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2,7)}`;
}

// Format helpers
function formatMoney(n) {
  return '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatNum(n) {
  if (n >= 1000000) return (n/1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n/1000).toFixed(1) + 'K';
  return String(n);
}

function formatDate(d) {
  return new Date(d).toLocaleDateString('en-US', { year:'numeric', month:'short', day:'numeric' });
}

function timeAgo(d) {
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60000);
  const h = Math.floor(m / 60);
  const day = Math.floor(h / 24);
  if (day > 0) return `${day}d ago`;
  if (h > 0) return `${h}h ago`;
  if (m > 0) return `${m}m ago`;
  return 'just now';
}
