const express = require('express');
const { getDb, logActivity } = require('../../database/database');
const { requireAuth, requireRole } = require('../../middleware/auth');

const router = express.Router();
router.use(requireAuth);

router.get('/', (req, res) => {
    try {
        const { status, page = 1, limit = 50 } = req.query;
        const db = getDb();
        
        let query = 'FROM offers WHERE 1=1';
        const params = [];
        
        if (status) {
            query += ' AND status = ?';
            params.push(status);
        }
        
        const total = db.prepare(`SELECT COUNT(*) as count ${query}`).get(...params).count;
        
        query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));
        
        const offers = db.prepare(`SELECT * ${query}`).all(...params);
        
        res.json({ data: offers, total, page: parseInt(page), limit: parseInt(limit) });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.get('/:id', (req, res) => {
    try {
        const { id } = req.params;
        const db = getDb();
        const offer = db.prepare('SELECT * FROM offers WHERE id = ?').get(id);
        if (!offer) return res.status(404).json({ error: 'Offer not found' });
        res.json({ data: offer });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/', requireRole(['ADMIN', 'SUPER_ADMIN']), (req, res) => {
    try {
        const { name, title, description, discount_type, discount_value, min_order_amount, start_date, end_date, is_global, status, notify_email, notify_sms, notify_push } = req.body;
        
        if (!name || !discount_type || discount_value === undefined) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        
        const db = getDb();
        const result = db.prepare(`
            INSERT INTO offers (name, title, description, discount_type, discount_value, min_order_amount, start_date, end_date, is_global, status, notify_email, notify_sms, notify_push)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(name, title || name, description || null, discount_type, discount_value, min_order_amount || 0, start_date || null, end_date || null, is_global ? 1 : 0, status || 'draft', notify_email ? 1 : 0, notify_sms ? 1 : 0, notify_push ? 1 : 0);
        
        logActivity(req.session.adminId, 'CREATE', 'offers', result.lastInsertRowid, `Created offer ${name}`);
        
        const offer = db.prepare('SELECT * FROM offers WHERE id = ?').get(result.lastInsertRowid);
        res.json({ data: offer });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.put('/:id', requireRole(['ADMIN', 'SUPER_ADMIN']), (req, res) => {
    try {
        const { id } = req.params;
        const { name, title, description, discount_type, discount_value, min_order_amount, start_date, end_date, is_global, status, notify_email, notify_sms, notify_push } = req.body;
        
        const db = getDb();
        let query = 'UPDATE offers SET ';
        const params = [];
        
        if (name !== undefined) { query += 'name = ?, '; params.push(name); }
        if (title !== undefined) { query += 'title = ?, '; params.push(title); }
        if (description !== undefined) { query += 'description = ?, '; params.push(description); }
        if (discount_type !== undefined) { query += 'discount_type = ?, '; params.push(discount_type); }
        if (discount_value !== undefined) { query += 'discount_value = ?, '; params.push(discount_value); }
        if (min_order_amount !== undefined) { query += 'min_order_amount = ?, '; params.push(min_order_amount); }
        if (start_date !== undefined) { query += 'start_date = ?, '; params.push(start_date); }
        if (end_date !== undefined) { query += 'end_date = ?, '; params.push(end_date); }
        if (is_global !== undefined) { query += 'is_global = ?, '; params.push(is_global ? 1 : 0); }
        if (status !== undefined) { query += 'status = ?, '; params.push(status); }
        if (notify_email !== undefined) { query += 'notify_email = ?, '; params.push(notify_email ? 1 : 0); }
        if (notify_sms !== undefined) { query += 'notify_sms = ?, '; params.push(notify_sms ? 1 : 0); }
        if (notify_push !== undefined) { query += 'notify_push = ?, '; params.push(notify_push ? 1 : 0); }
        
        query += 'updated_at = CURRENT_TIMESTAMP WHERE id = ?';
        params.push(id);
        
        db.prepare(query).run(...params);
        logActivity(req.session.adminId, 'UPDATE', 'offers', id, `Updated offer ${id}`);
        
        const offer = db.prepare('SELECT * FROM offers WHERE id = ?').get(id);
        res.json({ data: offer });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.delete('/:id', requireRole(['ADMIN', 'SUPER_ADMIN']), (req, res) => {
    try {
        const { id } = req.params;
        const db = getDb();
        db.prepare("UPDATE offers SET status = 'disabled', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(id);
        logActivity(req.session.adminId, 'DELETE', 'offers', id, `Disabled offer ${id}`);
        res.json({ data: { success: true } });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/:id/activate', requireRole(['ADMIN', 'SUPER_ADMIN']), (req, res) => {
    try {
        const { id } = req.params;
        const db = getDb();
        
        db.prepare("UPDATE offers SET status = 'active', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(id);
        logActivity(req.session.adminId, 'UPDATE', 'offers', id, `Activated offer ${id}`);
        
        // Notification queue logic placeholder
        
        const offer = db.prepare('SELECT * FROM offers WHERE id = ?').get(id);
        res.json({ data: offer });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
