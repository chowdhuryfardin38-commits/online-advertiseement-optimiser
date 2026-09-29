-- ═══════════════════════════════════════════════════
-- MYSQL SCHEMA — Advertisement Optimiser Database
-- Run this in MySQL Workbench or MySQL CLI:
--   mysql -u root -p < schema.sql
-- ═══════════════════════════════════════════════════

CREATE DATABASE IF NOT EXISTS advertisement_optimiser
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE advertisement_optimiser;

-- ── Users ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(100)  NOT NULL,
  email       VARCHAR(150)  NOT NULL UNIQUE,
  password    VARCHAR(255)  NOT NULL,          -- bcrypt hash, never plain text
  company     VARCHAR(150)  DEFAULT '',
  role        ENUM('advertiser','admin')        DEFAULT 'advertiser',
  status      ENUM('active','inactive')         DEFAULT 'active',
  avatar      VARCHAR(10)   DEFAULT '',
  budget      DECIMAL(12,2) DEFAULT 0.00,
  total_spent DECIMAL(12,2) DEFAULT 0.00,
  created_at  TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_email  (email),
  INDEX idx_role   (role),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Campaigns ────────────────────────────────────
CREATE TABLE IF NOT EXISTS campaigns (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  user_id      INT           NOT NULL,
  title        VARCHAR(200)  NOT NULL,
  description  TEXT,
  status       ENUM('pending','active','rejected','paused') DEFAULT 'pending',
  audience     VARCHAR(100)  DEFAULT 'general',
  budget       DECIMAL(12,2) DEFAULT 0.00,
  daily_budget DECIMAL(12,2) DEFAULT 0.00,
  spent        DECIMAL(12,2) DEFAULT 0.00,
  start_date   DATE,
  end_date     DATE,
  impressions  INT           DEFAULT 0,
  clicks       INT           DEFAULT 0,
  conversions  INT           DEFAULT 0,
  image        TEXT,
  ad_type      VARCHAR(50)   DEFAULT 'image',
  target_age   VARCHAR(50)   DEFAULT 'all',
  keywords     JSON,
  created_at   TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_status  (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Payments ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS payments (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  user_id     INT           NOT NULL,
  amount      DECIMAL(12,2) NOT NULL,
  method      VARCHAR(100)  DEFAULT '',
  status      ENUM('pending','completed','failed','refunded') DEFAULT 'completed',
  description TEXT,
  created_at  TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Notifications ────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  user_id    INT           NOT NULL,
  type       ENUM('success','warning','info','pending','error') DEFAULT 'info',
  title      VARCHAR(200)  NOT NULL,
  message    TEXT,
  is_read    BOOLEAN       DEFAULT FALSE,
  created_at TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_is_read (is_read)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Complaints / Support Tickets ─────────────────
CREATE TABLE IF NOT EXISTS complaints (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  user_id    INT          NOT NULL,
  subject    VARCHAR(200) NOT NULL,
  message    TEXT,
  status     ENUM('open','in-progress','resolved') DEFAULT 'open',
  priority   ENUM('low','medium','high')            DEFAULT 'medium',
  created_at TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_status  (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── System Settings (key-value store) ────────────
CREATE TABLE IF NOT EXISTS system_settings (
  `key`      VARCHAR(100) NOT NULL PRIMARY KEY,
  value      TEXT         NOT NULL,
  updated_at TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Default system settings
INSERT INTO system_settings (`key`, value) VALUES
  ('cpcRate',         '0.45'),
  ('cpmRate',         '2.50'),
  ('minBudget',       '50'),
  ('maxDailyBudget',  '10000'),
  ('autoApprove',     'false'),
  ('contentFilter',   'true'),
  ('peakHoursStart',  '18'),
  ('peakHoursEnd',    '22'),
  ('platformFee',     '5')
ON DUPLICATE KEY UPDATE value = VALUES(value);

-- ═══════════════════════════════════════════════════
-- NOTE: Do NOT create the admin user here.
-- Use POST /api/admin/seed with your SEED_SECRET
-- from .env after the server is running.
-- ═══════════════════════════════════════════════════
