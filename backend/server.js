'use strict';
// require('dotenv')?.config?.(); // optional .env support

const path = require('path');
const fs = require('fs');
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
    fs.readFileSync(envPath, 'utf8').split(/\r?\n/).forEach(line => {
        const match = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/i);
        if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
    });
}
const express = require('express');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { randomUUID } = require('crypto');

const { getDb, logActivity } = require('./database/database');
const notificationService = require('./services/notification.service');

const app = express();
const PORT = Number(process.env.PORT || 3000);
const isProd = process.env.NODE_ENV === 'production';
const sessionSecret = process.env.SESSION_SECRET || 'aataki-secure-session-fallback-secret';

// ---------------------------------------------------------------------------
// Security middleware
// ---------------------------------------------------------------------------
app.disable('x-powered-by');
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net', 'https://fonts.googleapis.com', 'https://cdnjs.cloudflare.com'],
            scriptSrcAttr: ["'unsafe-inline'"],
            styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com', 'https://cdnjs.cloudflare.com'],
            fontSrc: ["'self'", 'https://fonts.gstatic.com', 'https://cdnjs.cloudflare.com'],
            imgSrc: ["'self'", 'data:', 'blob:'],
            connectSrc: ["'self'"]
        }
    },
    crossOriginResourcePolicy: { policy: 'same-site' }
}));

// Parse JSON bodies (with size limit)
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// ---------------------------------------------------------------------------
// Sessions (SQLite-backed)
// ---------------------------------------------------------------------------
app.use(session({
    name: 'aataki_admin_sid',
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        secure: isProd,
        sameSite: 'lax',
        maxAge: 8 * 60 * 60 * 1000 // 8 hours
    }
}));

// Rate limiting
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 500,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later' }
});

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many authentication attempts, please try again later' }
});

// ---------------------------------------------------------------------------
// Static assets
// ---------------------------------------------------------------------------
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

app.use('/uploads', express.static(uploadsDir, { maxAge: '7d' }));
app.use(express.static(path.join(__dirname, '..', 'frontend', 'public'), { maxAge: isProd ? '1d' : 0 }));
app.use('/admin', express.static(path.join(__dirname, '..', 'frontend', 'admin'), { maxAge: 0 }));

// ---------------------------------------------------------------------------
// Public customer API
// ---------------------------------------------------------------------------
app.get('/api/products', (req, res) => {
    const db = getDb();
    const params = [];
    let where = 'p.deleted = 0 AND p.is_active = 1';
    if (req.query.search) {
        where += ' AND (p.name LIKE ? OR p.description LIKE ? OR p.sku LIKE ?)';
        const term = `%${String(req.query.search).trim()}%`;
        params.push(term, term, term);
    }
    const products = db.prepare(`
        SELECT p.id, p.name, p.description, p.sku, p.price, p.original_price,
               p.discount, p.stock_quantity, p.image_url, p.category_id,
               c.name AS category_name
        FROM products p LEFT JOIN categories c ON c.id = p.category_id
        WHERE ${where} ORDER BY p.name
    `).all(...params);
    res.json({ data: products });
});

app.get('/api/products/:id', (req, res) => {
    const product = getDb().prepare(`
        SELECT p.*, c.name AS category_name
        FROM products p LEFT JOIN categories c ON c.id = p.category_id
        WHERE p.id = ? AND p.deleted = 0 AND p.is_active = 1
    `).get(req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json({ data: product });
});

app.get('/api/offers', (_req, res) => {
    const offers = getDb().prepare(`
        SELECT id, name, title, description, discount_type, discount_value,
               min_order_amount, promo_code, start_date, end_date, image_url
        FROM offers
        WHERE status = 'active'
          AND (start_date IS NULL OR start_date <= datetime('now'))
          AND (end_date IS NULL OR end_date >= datetime('now'))
        ORDER BY end_date IS NULL, end_date
    `).all();
    res.json({ data: offers });
});

app.get('/api/monthly-posts', (_req, res) => {
    const posts = getDb().prepare(`
        SELECT id, title, content, image_url, publish_date, target_month
        FROM monthly_posts
        WHERE status = 'published' AND (publish_date IS NULL OR publish_date <= datetime('now'))
        ORDER BY publish_date DESC, created_at DESC
    `).all();
    res.json({ data: posts });
});

app.post('/api/contact', (req, res) => {
    const { name, email, phone = '', message } = req.body || {};
    if (!name || !email || !message || String(message).trim().length < 10) {
        return res.status(400).json({ error: 'Name, email, and a message of at least 10 characters are required' });
    }
    const result = getDb().prepare(`
        INSERT INTO contact_messages (name, email, phone, message)
        VALUES (?, ?, ?, ?)
    `).run(String(name).trim(), String(email).trim().toLowerCase(), String(phone).trim(), String(message).trim());
    res.status(201).json({ success: true, id: Number(result.lastInsertRowid), message: 'Your message has been received.' });
});

app.post('/api/register', (req, res) => {
    try {
        const { name, email, password, phone = '', address = '' } = req.body || {};
        if (!name || !email || !password || password.length < 6) {
            return res.status(400).json({ error: 'Name, email and a password of at least 6 characters are required' });
        }
        const db = getDb();
        const normalizedEmail = String(email).trim().toLowerCase();
        if (db.prepare('SELECT id FROM customers WHERE email = ?').get(normalizedEmail)) {
            return res.status(409).json({ error: 'Email is already registered' });
        }
        const bcrypt = require('bcryptjs');
        const result = db.prepare(`
            INSERT INTO customers (name, email, password_hash, phone, address)
            VALUES (?, ?, ?, ?, ?)
        `).run(String(name).trim(), normalizedEmail, bcrypt.hashSync(password, 12), phone, address);
        req.session.customer = { id: Number(result.lastInsertRowid), email: normalizedEmail };
        res.status(201).json({ data: { id: Number(result.lastInsertRowid), name, email: normalizedEmail } });
    } catch (error) {
        res.status(500).json({ error: 'Registration failed' });
    }
});

app.post('/api/login', (req, res) => {
    const { email, password } = req.body || {};
    const customer = getDb().prepare('SELECT * FROM customers WHERE email = ? AND is_active = 1').get(String(email || '').trim().toLowerCase());
    const bcrypt = require('bcryptjs');
    if (!customer || !customer.password_hash || !bcrypt.compareSync(password || '', customer.password_hash)) {
        return res.status(401).json({ error: 'Invalid credentials' });
    }
    req.session.customer = { id: customer.id, email: customer.email };
    res.json({ data: { id: customer.id, name: customer.name, email: customer.email } });
});

app.get('/api/account', (req, res) => {
    if (!req.session.customer) return res.status(401).json({ error: 'Authentication required' });
    const customer = getDb().prepare(`
        SELECT id, name, email, phone, address, notification_email, notification_website,
               notification_monthly, notification_offers, notification_orders
        FROM customers WHERE id = ?
    `).get(req.session.customer.id);
    if (!customer) return res.status(401).json({ error: 'Authentication required' });
    res.json({ data: customer });
});

app.put('/api/account/notifications', (req, res) => {
    if (!req.session.customer) return res.status(401).json({ error: 'Authentication required' });
    const allowed = ['notification_email', 'notification_website', 'notification_monthly', 'notification_offers', 'notification_orders'];
    const updates = allowed.filter(key => typeof req.body?.[key] === 'boolean');
    if (!updates.length) return res.status(400).json({ error: 'No notification settings supplied' });
    const db = getDb();
    const values = updates.map(key => req.body[key] ? 1 : 0);
    const set = updates.map(key => `${key} = ?`).join(', ');
    db.prepare(`UPDATE customers SET ${set}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(...values, req.session.customer.id);
    res.json({ data: db.prepare('SELECT notification_email, notification_website, notification_monthly, notification_offers, notification_orders FROM customers WHERE id = ?').get(req.session.customer.id) });
});

app.post('/api/order', (req, res) => {
    try {
        const { customer = {}, items } = req.body || {};
        if (!customer.name || !customer.phone || !customer.address || !Array.isArray(items) || !items.length) {
            return res.status(400).json({ error: 'Customer details and at least one item are required' });
        }
        const db = getDb();
        const createOrder = db.transaction(() => {
            let customerId = req.session.customer?.id || null;
            if (!customerId) {
                const email = String(customer.email || '').trim().toLowerCase();
                const existing = db.prepare('SELECT id FROM customers WHERE phone = ? OR (email <> \'\' AND email = ?) LIMIT 1').get(customer.phone, email);
                if (existing) {
                    customerId = existing.id;
                    db.prepare(`UPDATE customers SET name = ?, email = CASE WHEN ? <> '' THEN ? ELSE email END,
                        phone = ?, address = ?, updated_at = CURRENT_TIMESTAMP, last_activity = CURRENT_TIMESTAMP WHERE id = ?`)
                        .run(customer.name, email, email, customer.phone, customer.address, customerId);
                } else {
                    customerId = Number(db.prepare('INSERT INTO customers (name, email, phone, address) VALUES (?, ?, ?, ?)').run(customer.name, email, customer.phone, customer.address).lastInsertRowid);
                }
            }
            const verifiedItems = [];
            for (const item of items) {
                const productId = Number(item.id);
                const quantity = Number(item.qty);
                if (!Number.isInteger(productId) || !Number.isInteger(quantity) || quantity < 1 || quantity > 100) throw new Error('Invalid item quantity');
                const product = db.prepare('SELECT id, name, price, stock_quantity FROM products WHERE id = ? AND deleted = 0 AND is_active = 1').get(productId);
                if (!product) throw new Error('Invalid product');
                if (product.stock_quantity < quantity) throw new Error(`${product.name} is out of stock`);
                verifiedItems.push({ ...product, quantity, subtotal: product.price * quantity });
            }
            const subtotal = verifiedItems.reduce((sum, item) => sum + item.subtotal, 0);
            const offers = db.prepare(`SELECT * FROM offers WHERE status = 'active' AND (start_date IS NULL OR start_date <= datetime('now')) AND (end_date IS NULL OR end_date >= datetime('now'))`).all();
            const offer = offers.find(item => subtotal >= Number(item.min_order_amount || 0));
            const discount = offer ? (offer.discount_type === 'percentage' ? subtotal * Number(offer.discount_value) / 100 : Number(offer.discount_value)) : 0;
            const total = Math.max(0, subtotal - discount);
            const orderId = `ORD-${randomUUID().slice(0, 8).toUpperCase()}`;
            const order = db.prepare(`INSERT INTO orders (order_id, customer_id, subtotal, discount, total_amount, payment_status, status, shipping_name, shipping_phone, shipping_address)
                VALUES (?, ?, ?, ?, ?, 'paid', 'confirmed', ?, ?, ?)`).run(orderId, customerId, subtotal, discount, total, customer.name, customer.phone, customer.address);
            for (const item of verifiedItems) {
                db.prepare(`INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price, price, subtotal) VALUES (?, ?, ?, ?, ?, ?, ?)`)
                    .run(order.lastInsertRowid, item.id, item.name, item.quantity, item.price, item.price, item.subtotal);
                db.prepare('UPDATE products SET stock_quantity = stock_quantity - ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(item.quantity, item.id);
            }
            const preferences = db.prepare('SELECT email, notification_email, notification_website, notification_orders FROM customers WHERE id = ?').get(customerId);
            if (preferences?.notification_orders !== 0 && preferences?.notification_website !== 0) {
                notificationService.queueNotification('ORDER', customerId, preferences.email, 'Order confirmed', `Your Aataki order ${orderId} has been confirmed.`);
            }
            return { orderId, total, discount };
        });
        const orderResult = createOrder();
        res.status(201).json({ success: true, ...orderResult });
    } catch (error) {
        res.status(400).json({ error: error.message || 'Could not place order' });
    }
});

// ---------------------------------------------------------------------------
// Admin API routes (all under /api/admin)
// ---------------------------------------------------------------------------
const adminRouter = express.Router();

// Auth routes get stricter rate limiting only on login
adminRouter.use('/login', authLimiter);
adminRouter.use('/logout', authLimiter);

adminRouter.use('/', require('./routes/admin/auth'));
adminRouter.use('/dashboard', require('./routes/admin/dashboard'));
adminRouter.use('/products', require('./routes/admin/products'));
adminRouter.use('/categories', require('./routes/admin/categories'));
adminRouter.use('/orders', require('./routes/admin/orders'));
adminRouter.use('/customers', require('./routes/admin/customers'));
adminRouter.use('/offers', require('./routes/admin/offers'));
adminRouter.use('/monthly-posts', require('./routes/admin/monthly-posts'));
adminRouter.use('/notifications', require('./routes/admin/notifications'));
adminRouter.use('/messages', require('./routes/admin/contact-messages'));
adminRouter.use('/inventory', require('./routes/admin/inventory'));
adminRouter.use('/excel', require('./routes/admin/excel'));
adminRouter.use('/reports', require('./routes/admin/reports'));
adminRouter.use('/administrators', require('./routes/admin/administrators'));
adminRouter.use('/settings', require('./routes/admin/settings'));
adminRouter.use('/activity-logs', require('./routes/admin/activity-logs'));
adminRouter.use('/backup', require('./routes/admin/backup'));

app.use('/api/admin', apiLimiter, adminRouter);

// ---------------------------------------------------------------------------
// Health / info
// ---------------------------------------------------------------------------
app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
});

// ---------------------------------------------------------------------------
// 404 + error handlers
// ---------------------------------------------------------------------------
app.use('/api', (_req, res) => res.status(404).json({ error: 'Not found' }));

// Central error handler — do not leak stack traces
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
    console.error('[Server Error]', err.message);
    res.status(err.status || 500).json({ error: 'Internal server error' });
});

// ---------------------------------------------------------------------------
// Startup
// ---------------------------------------------------------------------------
function start() {
    // Ensure DB exists
    getDb();

    // Seed a default super admin in dev if none exist
    seedDefaultAdmin();

    // Start scheduler
    const scheduler = require('./services/scheduler.service');
    scheduler.startScheduler();

    listenOnPort(PORT);
}

function listenOnPort(port) {
    const server = app.listen(port, () => {
        const activePort = server.address().port;
        console.log(`Aataki server running at http://localhost:${activePort}`);
        console.log(`Admin panel: http://localhost:${activePort}/admin/`);
    });

    server.once('error', error => {
        if (error.code === 'EADDRINUSE' && port < PORT + 10) {
            const nextPort = port + 1;
            console.warn(`[Server] Port ${port} is already in use; retrying on ${nextPort}.`);
            listenOnPort(nextPort);
            return;
        }
        console.error(`[Server] Could not listen on port ${port}: ${error.message}`);
        process.exitCode = 1;
    });
}

function seedDefaultAdmin() {
    try {
        const db = getDb();
        const bcrypt = require('bcryptjs');
        const existing = db.prepare('SELECT COUNT(*) as c FROM administrators').get();
        if (existing.c === 0) {
            const email = process.env.ADMIN_EMAIL || 'admin@aataki.com';
            const password = process.env.ADMIN_PASSWORD || 'Admin@123';
            const hash = bcrypt.hashSync(password, 10);
            db.prepare('INSERT INTO administrators (name, email, password_hash, role, is_active) VALUES (?, ?, ?, ?, 1)')
                .run('Super Admin', email, hash, 'SUPER_ADMIN');
            console.log(`[Seed] Default SUPER_ADMIN created: ${email}`);
            logActivity(null, 'System', 'SEED', 'administrators', 0, 'Seeded default super admin');
        }
    } catch (err) {
        console.error('[Seed] Failed:', err.message);
    }
}

start();

module.exports = app; // for testability
