'use strict';
const path = require('path');
const Database = require('better-sqlite3');

const DB_PATH = path.join(__dirname, '..', '..', 'aataki.db');
let db;

function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initializeSchema();
  }
  return db;
}

function initializeSchema() {
  const d = db;

  d.exec(`
    CREATE TABLE IF NOT EXISTS administrators (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('SUPER_ADMIN','ADMIN','STAFF')) DEFAULT 'STAFF',
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      last_login TEXT
    );

    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT DEFAULT '',
      phone TEXT DEFAULT '',
      address TEXT DEFAULT '',
      password_hash TEXT DEFAULT '',
      is_active INTEGER NOT NULL DEFAULT 1,
      notification_email INTEGER NOT NULL DEFAULT 1,
      notification_website INTEGER NOT NULL DEFAULT 1,
      notification_monthly INTEGER NOT NULL DEFAULT 1,
      notification_offers INTEGER NOT NULL DEFAULT 1,
      notification_orders INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      last_activity TEXT DEFAULT (datetime('now')),
      last_login TEXT
    );

    CREATE TABLE IF NOT EXISTS contact_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT DEFAULT '',
      message TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'new' CHECK(status IN ('new','read','resolved')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      description TEXT DEFAULT '',
      slug TEXT NOT NULL UNIQUE,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      sku TEXT UNIQUE,
      category_id INTEGER,
      price REAL NOT NULL CHECK(price > 0),
      original_price REAL DEFAULT 0,
      discount REAL DEFAULT 0,
      stock_quantity INTEGER NOT NULL DEFAULT 0 CHECK(stock_quantity >= 0),
      image_url TEXT DEFAULT '',
      is_active INTEGER NOT NULL DEFAULT 1,
      deleted INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id TEXT NOT NULL UNIQUE,
      customer_id INTEGER,
      subtotal REAL NOT NULL DEFAULT 0,
      discount REAL NOT NULL DEFAULT 0,
      tax REAL NOT NULL DEFAULT 0,
      shipping_cost REAL NOT NULL DEFAULT 0,
      total_amount REAL NOT NULL DEFAULT 0,
      payment_status TEXT NOT NULL DEFAULT 'paid' CHECK(payment_status IN ('pending','paid','failed','refunded')),
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','confirmed','processing','shipped','delivered','cancelled','refunded')),
      shipping_name TEXT DEFAULT '',
      shipping_phone TEXT DEFAULT '',
      shipping_address TEXT DEFAULT '',
      notes TEXT DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      product_id INTEGER,
      product_name TEXT NOT NULL,
      quantity REAL NOT NULL DEFAULT 1,
      unit_price REAL NOT NULL DEFAULT 0,
      price REAL NOT NULL DEFAULT 0,
      subtotal REAL NOT NULL DEFAULT 0,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS order_status_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      old_status TEXT,
      new_status TEXT NOT NULL,
      status TEXT NOT NULL,
      notes TEXT DEFAULT '',
      note TEXT DEFAULT '',
      admin_id INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
      FOREIGN KEY (admin_id) REFERENCES administrators(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS offers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      discount_type TEXT NOT NULL DEFAULT 'percentage' CHECK(discount_type IN ('percentage','fixed')),
      discount_value REAL NOT NULL DEFAULT 0,
      min_order_amount REAL DEFAULT 0,
      promo_code TEXT DEFAULT '',
      start_date TEXT,
      end_date TEXT,
      is_global INTEGER NOT NULL DEFAULT 1,
      applicable_products TEXT DEFAULT '[]',
      applicable_categories TEXT DEFAULT '[]',
      image_url TEXT DEFAULT '',
      status TEXT NOT NULL DEFAULT 'scheduled' CHECK(status IN ('scheduled','active','expired','disabled','draft')),
      notify_on_activate INTEGER NOT NULL DEFAULT 0,
      notify_email INTEGER NOT NULL DEFAULT 0,
      notify_website INTEGER NOT NULL DEFAULT 0,
      notify_sms INTEGER NOT NULL DEFAULT 0,
      notify_push INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS monthly_posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      content TEXT DEFAULT '',
      image_url TEXT DEFAULT '',
      publish_date TEXT,
      expiration_date TEXT,
      target_month TEXT,
      status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','scheduled','published','unpublished')),
      author_id INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (author_id) REFERENCES administrators(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL DEFAULT 'SYSTEM' CHECK(type IN ('ORDER','OFFER','MONTHLY_POST','SYSTEM')),
      recipient_id INTEGER,
      recipient_email TEXT DEFAULT '',
      title TEXT NOT NULL,
      message TEXT DEFAULT '',
      status TEXT NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING','SENT','FAILED','CANCELLED')),
      failure_reason TEXT DEFAULT '',
      retry_count INTEGER NOT NULL DEFAULT 0,
      max_retries INTEGER NOT NULL DEFAULT 3,
      sent_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (recipient_id) REFERENCES customers(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS inventory_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      previous_stock INTEGER NOT NULL,
      previous_qty INTEGER NOT NULL,
      new_stock INTEGER NOT NULL,
      new_qty INTEGER NOT NULL,
      quantity_change INTEGER NOT NULL,
      difference INTEGER NOT NULL,
      reason TEXT DEFAULT '',
      admin_id INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
      FOREIGN KEY (admin_id) REFERENCES administrators(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS activity_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      admin_id INTEGER,
      admin_name TEXT DEFAULT '',
      action TEXT NOT NULL,
      entity_type TEXT DEFAULT '',
      entity_id TEXT DEFAULT '',
      details TEXT DEFAULT '',
      ip_address TEXT DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (admin_id) REFERENCES administrators(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      setting_key TEXT NOT NULL UNIQUE,
      setting_value TEXT DEFAULT '',
      key TEXT NOT NULL UNIQUE,
      value TEXT DEFAULT '',
      category TEXT DEFAULT 'general',
      is_public INTEGER NOT NULL DEFAULT 0,
      description TEXT DEFAULT '',
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS backups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      filename TEXT NOT NULL,
      size_bytes INTEGER DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'completed',
      admin_id INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (admin_id) REFERENCES administrators(id) ON DELETE SET NULL
    );
  `);

  // Add customer preference columns to databases created by earlier builds.
  const customerColumns = d.prepare('PRAGMA table_info(customers)').all().map(column => column.name);
  const migrations = [
    ['password_hash', "ALTER TABLE customers ADD COLUMN password_hash TEXT DEFAULT ''"],
    ['notification_monthly', 'ALTER TABLE customers ADD COLUMN notification_monthly INTEGER NOT NULL DEFAULT 1'],
    ['notification_offers', 'ALTER TABLE customers ADD COLUMN notification_offers INTEGER NOT NULL DEFAULT 1'],
    ['notification_orders', 'ALTER TABLE customers ADD COLUMN notification_orders INTEGER NOT NULL DEFAULT 1']
  ];
  migrations.forEach(([column, sql]) => {
    if (!customerColumns.includes(column)) d.exec(sql);
  });

  // Create indexes
  const indexes = [
    'CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email)',
    'CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone)',
    'CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku)',
    'CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id)',
    'CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active, deleted)',
    'CREATE INDEX IF NOT EXISTS idx_orders_order_id ON orders(order_id)',
    'CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id)',
    'CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status)',
    'CREATE INDEX IF NOT EXISTS idx_orders_payment ON orders(payment_status)',
    'CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at)',
    'CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id)',
    'CREATE INDEX IF NOT EXISTS idx_order_items_product ON order_items(product_id)',
    'CREATE INDEX IF NOT EXISTS idx_offers_status ON offers(status)',
    'CREATE INDEX IF NOT EXISTS idx_offers_dates ON offers(start_date, end_date)',
    'CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status)',
    'CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type)',
    'CREATE INDEX IF NOT EXISTS idx_activity_logs_admin ON activity_logs(admin_id)',
    'CREATE INDEX IF NOT EXISTS idx_activity_logs_created ON activity_logs(created_at)',
    'CREATE INDEX IF NOT EXISTS idx_inventory_logs_product ON inventory_logs(product_id)',
    'CREATE INDEX IF NOT EXISTS idx_settings_key ON settings(key)'
  ];
  indexes.forEach(sql => d.exec(sql));

  // Insert default settings if empty
  const settingsCount = d.prepare('SELECT COUNT(*) as c FROM settings').get();
  if (settingsCount.c === 0) {
    const insertSetting = d.prepare('INSERT INTO settings (setting_key, setting_value, key, value, category, is_public) VALUES (?, ?, ?, ?, ?, ?)');
    const defaults = [
      ['store_name', 'Aataki', 'store_name', 'Aataki', 'store', 1],
      ['store_tagline', 'Fresh Atta Ground Only After You Order', 'store_tagline', 'Fresh Atta Ground Only After You Order', 'store', 1],
      ['currency', 'INR', 'currency', 'INR', 'store', 1],
      ['currency_symbol', '₹', 'currency_symbol', '₹', 'store', 1],
      ['low_stock_threshold', '10', 'low_stock_threshold', '10', 'inventory', 0],
      ['order_auto_confirm', 'false', 'order_auto_confirm', 'false', 'orders', 0],
      ['smtp_host', '', 'smtp_host', '', 'email', 0],
      ['smtp_port', '587', 'smtp_port', '587', 'email', 0],
      ['smtp_secure', 'false', 'smtp_secure', 'false', 'email', 0],
      ['smtp_user', '', 'smtp_user', '', 'email', 0],
      ['smtp_pass', '', 'smtp_pass', '', 'email', 0],
      ['smtp_from', 'Aataki <noreply@aataki.com>', 'smtp_from', 'Aataki <noreply@aataki.com>', 'email', 0],
      ['notification_retry_max', '3', 'notification_retry_max', '3', 'notifications', 0],
      ['notification_retry_delay_minutes', '5', 'notification_retry_delay_minutes', '5', 'notifications', 0],
      ['max_upload_size_mb', '5', 'max_upload_size_mb', '5', 'security', 0],
      ['session_timeout_minutes', '480', 'session_timeout_minutes', '480', 'security', 0],
      ['backup_retention_days', '30', 'backup_retention_days', '30', 'backup', 0]
    ];
    const insertMany = d.transaction((items) => {
      for (const [sk, sv, k, v, cat, pub] of items) {
        insertSetting.run(sk, sv, k, v, cat, pub);
      }
    });
    insertMany(defaults);
  }
}

function logActivity(adminId, adminName, action, entityType, entityId, details, ipAddress) {
  const d = getDb();
  // Keep older route call sites compatible with the full logging signature.
  if (arguments.length === 5) {
    details = entityId;
    entityId = entityType;
    entityType = action;
    action = adminName;
    adminName = '';
  }
  d.prepare(`
    INSERT INTO activity_logs (admin_id, admin_name, action, entity_type, entity_id, details, ip_address)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(adminId || null, adminName || '', action, entityType || '', String(entityId || ''), details || '', ipAddress || '');
}

function getSetting(key) {
  const d = getDb();
  const row = d.prepare('SELECT setting_value as value FROM settings WHERE setting_key = ?').get(key);
  return row ? row.value : null;
}

function setSetting(key, value, category) {
  const d = getDb();
  const existing = d.prepare('SELECT id FROM settings WHERE setting_key = ?').get(key);
  if (existing) {
    d.prepare("UPDATE settings SET setting_value = ?, value = ?, updated_at = datetime('now') WHERE setting_key = ?").run(value, value, key);
  } else {
    d.prepare('INSERT INTO settings (setting_key, setting_value, key, value, category, is_public) VALUES (?, ?, ?, ?, ?, ?)').run(key, value, key, value, category || 'general', 0);
  }
}

module.exports = { getDb, logActivity, getSetting, setSetting, DB_PATH };