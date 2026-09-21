const express = require('express');
const { getDb, logActivity } = require('../../database/database');
const { requireAuth } = require('../../middleware/auth');

const router = express.Router();
router.use(requireAuth);

router.get('/', (req, res) => {
    try {
        const { search, order_status, payment_status, start_date, end_date, page = 1, limit = 50 } = req.query;
        const db = getDb();
        
        let query = 'FROM orders o LEFT JOIN customers c ON o.customer_id = c.id WHERE 1=1';
        const params = [];
        
        if (search) {
            query += ' AND (o.id LIKE ? OR c.name LIKE ? OR c.email LIKE ? OR c.phone LIKE ?)';
            params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
        }
        if (order_status) { query += ' AND o.status = ?'; params.push(order_status); }
        if (payment_status) { query += ' AND o.payment_status = ?'; params.push(payment_status); }
        if (start_date) { query += ' AND o.created_at >= ?'; params.push(start_date); }
        if (end_date) { query += ' AND o.created_at <= ?'; params.push(end_date); }
        
        const total = db.prepare(`SELECT COUNT(*) as count ${query}`).get(...params).count;
        
        query += ' ORDER BY o.created_at DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));
        
        const orders = db.prepare(`SELECT o.*, c.name as customer_name, c.email as customer_email ${query}`).all(...params);
        
        res.json({ data: orders, total, page: parseInt(page), limit: parseInt(limit) });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.get('/:id', (req, res) => {
    try {
        const { id } = req.params;
        const db = getDb();
        
        const order = db.prepare(`
            SELECT o.*, c.name as customer_name, c.email as customer_email, c.phone as customer_phone
            FROM orders o LEFT JOIN customers c ON o.customer_id = c.id
            WHERE o.id = ?
        `).get(id);
        
        if (!order) return res.status(404).json({ error: 'Order not found' });
        
        const items = db.prepare(`
            SELECT oi.*, p.name as product_name, p.sku as product_sku
            FROM order_items oi LEFT JOIN products p ON oi.product_id = p.id
            WHERE oi.order_id = ?
        `).all(id);
        
        const history = db.prepare(`
            SELECT osh.*, a.name as admin_name
            FROM order_status_history osh LEFT JOIN administrators a ON osh.admin_id = a.id
            WHERE osh.order_id = ? ORDER BY osh.created_at ASC
        `).all(id);
        
        res.json({ data: { ...order, items, history } });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.put('/:id/status', (req, res) => {
    try {
        const { id } = req.params;
        const { status, notes } = req.body;
        const validStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'];
        if (!validStatuses.includes(status)) return res.status(400).json({ error: 'Invalid order status' });
        
        const db = getDb();
        
        db.transaction(() => {
            const current = db.prepare('SELECT status FROM orders WHERE id = ?').get(id);
            if (!current) throw new Error('Order not found');
            
            // Valid transitions logic could go here
            
            db.prepare('UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(status, id);
            
            db.prepare(`INSERT INTO order_status_history
                (order_id, old_status, new_status, status, notes, note, admin_id)
                VALUES (?, ?, ?, ?, ?, ?, ?)`)
                .run(id, current.status, status, status, notes || '', notes || '', req.session.adminId);
            
            logActivity(req.session.adminId, 'UPDATE', 'orders', id, `Updated order status from ${current.status} to ${status}`);
            
            // Notification logic placeholder
        })();
        
        const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
        res.json({ data: order });
    } catch (error) {
        res.status(error.message === 'Order not found' ? 404 : 500).json({ error: error.message || 'Internal server error' });
    }
});

module.exports = router;
