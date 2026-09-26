const path = require('path');
const fs = require('fs');

let dbType = 'sqlite';
let queryFn = null;

if (process.env.POSTGRES_URL) {
  dbType = 'postgres';
  console.log('Database client: Using PostgreSQL (Vercel/Neon)');
  const { Pool } = require('pg');
  const pool = new Pool({
    connectionString: process.env.POSTGRES_URL,
    ssl: { rejectUnauthorized: false }
  });
  queryFn = (sql, params = []) => pool.query(sql, params).then(res => res.rows);
} else {
  dbType = 'sqlite';
  console.log('Database client: Using SQLite (Local)');
  const sqlite3 = require('sqlite3').verbose();
  const dbPath = path.resolve(__dirname, '../adoptimize.db');
  const db = new sqlite3.Database(dbPath);
  
  queryFn = (sql, params = []) => {
    // Translate $1, $2, ... to ? for SQLite
    const sqliteSql = sql.replace(/\$\d+/g, '?');
    return new Promise((resolve, reject) => {
      const isSelect = sqliteSql.trim().toUpperCase().startsWith('SELECT');
      if (isSelect) {
        db.all(sqliteSql, params, (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      } else {
        db.run(sqliteSql, params, function(err) {
          if (err) reject(err);
          else resolve({ insertId: this.lastID, changes: this.changes });
        });
      }
    });
  };
}

async function query(sql, params = []) {
  return queryFn(sql, params);
}

async function transact(actionsFn) {
  await query('BEGIN');
  try {
    const result = await actionsFn(query);
    await query('COMMIT');
    return result;
  } catch (err) {
    try {
      await query('ROLLBACK');
    } catch (e) {
      // Ignore rollback errors if transaction already aborted
    }
    throw err;
  }
}

// DDL Script to create tables
const DDL = [
  `CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(100) NOT NULL,
    company VARCHAR(100),
    role VARCHAR(50) DEFAULT 'advertiser',
    active BOOLEAN DEFAULT TRUE,
    createdAt VARCHAR(50),
    avatar VARCHAR(10),
    budget REAL DEFAULT 0,
    totalSpent REAL DEFAULT 0
  )`,
  `CREATE TABLE IF NOT EXISTS campaigns (
    id VARCHAR(50) PRIMARY KEY,
    userId VARCHAR(50),
    title VARCHAR(100) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'active',
    audience VARCHAR(100),
    budget REAL DEFAULT 0,
    dailyBudget REAL DEFAULT 0,
    spent REAL DEFAULT 0,
    startDate VARCHAR(50),
    endDate VARCHAR(50),
    impressions INTEGER DEFAULT 0,
    clicks INTEGER DEFAULT 0,
    conversions INTEGER DEFAULT 0,
    image TEXT,
    createdAt VARCHAR(50),
    keywords TEXT,
    adType VARCHAR(50),
    targetAge VARCHAR(50)
  )`,
  `CREATE TABLE IF NOT EXISTS payments (
    id VARCHAR(50) PRIMARY KEY,
    userId VARCHAR(50),
    amount REAL NOT NULL,
    method VARCHAR(100),
    status VARCHAR(50) DEFAULT 'completed',
    description TEXT,
    createdAt VARCHAR(50)
  )`,
  `CREATE TABLE IF NOT EXISTS notifications (
    id VARCHAR(50) PRIMARY KEY,
    userId VARCHAR(50),
    type VARCHAR(50),
    title VARCHAR(100) NOT NULL,
    message TEXT,
    read BOOLEAN DEFAULT FALSE,
    createdAt VARCHAR(50)
  )`,
  `CREATE TABLE IF NOT EXISTS complaints (
    id VARCHAR(50) PRIMARY KEY,
    userId VARCHAR(50),
    subject VARCHAR(200) NOT NULL,
    message TEXT,
    status VARCHAR(50) DEFAULT 'open',
    priority VARCHAR(50) DEFAULT 'medium',
    createdAt VARCHAR(50)
  )`,
  `CREATE TABLE IF NOT EXISTS system_settings (
    key VARCHAR(100) PRIMARY KEY,
    value TEXT NOT NULL
  )`
];

const defaultDB = {
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
      avatar: 'A',
      budget: 0,
      totalSpent: 0
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
  }
};

let initializing = null;

async function initDB() {
  if (initializing) return initializing;
  initializing = (async () => {
    // Run DDL statements
    for (const sql of DDL) {
      await query(sql);
    }
    
    // Check if seeded
    const usersCount = await query('SELECT count(*) as count FROM users');
    const hasUsers = parseInt(usersCount[0].count || usersCount[0].COUNT || 0, 10) > 0;
    
    if (!hasUsers) {
      console.log('Seeding SQL Database with default values...');
      await transact(async (q) => {
        // Seed users
        for (const u of defaultDB.users) {
          await q(
            `INSERT INTO users (id, name, email, password, company, role, active, createdAt, avatar, budget, totalSpent)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
            [u.id, u.name, u.email, u.password, u.company, u.role, u.active ? 1 : 0, u.createdAt, u.avatar, u.budget, u.totalSpent]
          );
        }
        // Seed campaigns
        for (const c of defaultDB.campaigns) {
          await q(
            `INSERT INTO campaigns (id, userId, title, description, status, audience, budget, dailyBudget, spent, startDate, endDate, impressions, clicks, conversions, image, createdAt, keywords, adType, targetAge)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)`,
            [
              c.id, c.userId, c.title, c.description, c.status, c.audience, c.budget, c.dailyBudget, c.spent,
              c.startDate, c.endDate, c.impressions, c.clicks, c.conversions, c.image, c.createdAt,
              JSON.stringify(c.keywords), c.adType, c.targetAge
            ]
          );
        }
        // Seed payments
        for (const p of defaultDB.payments) {
          await q(
            `INSERT INTO payments (id, userId, amount, method, status, description, createdAt)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [p.id, p.userId, p.amount, p.method, p.status, p.description, p.createdAt]
          );
        }
        // Seed notifications
        for (const n of defaultDB.notifications) {
          await q(
            `INSERT INTO notifications (id, userId, type, title, message, read, createdAt)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [n.id, n.userId, n.type, n.title, n.message, n.read ? 1 : 0, n.createdAt]
          );
        }
        // Seed complaints
        for (const c of defaultDB.complaints) {
          await q(
            `INSERT INTO complaints (id, userId, subject, message, status, priority, createdAt)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [c.id, c.userId, c.subject, c.message, c.status, c.priority, c.createdAt]
          );
        }
        // Seed settings
        for (const [key, value] of Object.entries(defaultDB.systemSettings)) {
          await q(
            `INSERT INTO system_settings (key, value) VALUES ($1, $2)`,
            [key, String(value)]
          );
        }
      });
      console.log('Seeding completed successfully!');
    }
  })();
  return initializing;
}

module.exports = {
  query,
  transact,
  initDB,
  dbType
};
