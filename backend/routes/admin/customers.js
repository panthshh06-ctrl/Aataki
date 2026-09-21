const express = require('express');
const { getDb, logActivity } = require('../../database/database');
const { requireAuth } = require('../../middleware/auth');

const router = express.Router();
router.use(requireAuth);

router.get('/', (req, res) => {
    try {
        const { search, page = 1, limit = 50 } = req.query;
        const db = getDb();
        
        let query = 'FROM customers WHERE 1=1';
        const params = [];
        
        if (search) {
            query += ' AND (name LIKE ? OR email LIKE ? OR phone LIKE ?)';
            params.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }
        
        const total = db.prepare(`SELECT COUNT(*) as count ${query}`).get(...params).count;
        
        query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));
        
        const customers = db.prepare(`
            SELECT id, name, email, phone, is_active, created_at,
                   (SELECT COUNT(*) FROM orders WHERE customer_id = customers.id) as order_count,
                   (SELECT COALESCE(SUM(total_amount), 0) FROM orders WHERE customer_id = customers.id AND payment_status = 'paid') as total_spent
            ${query}
        `).all(...params);
        
        res.json({ data: customers, total, page: parseInt(page), limit: parseInt(limit) });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.get('/:id', (req, res) => {
    try {
        const { id } = req.params;
        const db = getDb();
        
        const customer = db.prepare(`
            SELECT id, name, email, phone, is_active, created_at, last_login,
                   notification_email, notification_website, notification_monthly,
                   notification_offers, notification_orders
            FROM customers WHERE id = ?
        `).get(id);
        
        if (!customer) return res.status(404).json({ error: 'Customer not found' });
        
        const orderStats = db.prepare(`
            SELECT COUNT(*) as total_orders, COALESCE(SUM(total_amount), 0) as total_spent, COALESCE(AVG(total_amount), 0) as avg_order_value
            FROM orders WHERE customer_id = ? AND payment_status = 'paid'
        `).get(id);
        
        const recentOrders = db.prepare('SELECT * FROM orders WHERE customer_id = ? ORDER BY created_at DESC LIMIT 5').all(id);
        
        res.json({ data: { ...customer, stats: orderStats, recent_orders: recentOrders } });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.put('/:id', (req, res) => {
    try {
        const { id } = req.params;
        const { is_active } = req.body;
        const db = getDb();
        
        if (is_active !== undefined) {
            db.prepare('UPDATE customers SET is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(is_active ? 1 : 0, id);
            logActivity(req.session.adminId, 'UPDATE', 'customers', id, `Updated customer active status to ${is_active}`);
        }
        
        const customer = db.prepare('SELECT id, name, email, phone, is_active, created_at FROM customers WHERE id = ?').get(id);
        res.json({ data: customer });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
