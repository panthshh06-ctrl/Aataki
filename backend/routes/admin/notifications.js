const express = require('express');
const { getDb, logActivity } = require('../../database/database');
const { requireAuth, requireRole } = require('../../middleware/auth');

const router = express.Router();
router.use(requireAuth);

router.get('/', (req, res) => {
    try {
        const { type, status, search, page = 1, limit = 50 } = req.query;
        const db = getDb();
        
        let query = 'FROM notifications WHERE 1=1';
        const params = [];
        
        if (type) { query += ' AND type = ?'; params.push(type); }
        if (status) { query += ' AND status = ?'; params.push(status); }
        if (search) { query += ' AND (title LIKE ? OR message LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
        
        const total = db.prepare(`SELECT COUNT(*) as count ${query}`).get(...params).count;
        
        query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));
        
        const notifications = db.prepare(`SELECT * ${query}`).all(...params);
        
        res.json({ data: notifications, total, page: parseInt(page), limit: parseInt(limit) });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.get('/stats', (req, res) => {
    try {
        const db = getDb();
        const stats = db.prepare('SELECT status, COUNT(*) as count FROM notifications GROUP BY status').all();
        
        const result = { PENDING: 0, SENT: 0, FAILED: 0, CANCELLED: 0 };
        stats.forEach(s => { result[s.status] = s.count; });
        
        res.json({ data: result });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/:id/retry', requireRole(['ADMIN', 'SUPER_ADMIN']), (req, res) => {
    try {
        const { id } = req.params;
        const db = getDb();
        
        const notification = db.prepare("SELECT * FROM notifications WHERE id = ?").get(id);
        if (!notification) return res.status(404).json({ error: 'Notification not found' });
        
        if (notification.status !== 'FAILED') {
            return res.status(400).json({ error: 'Only failed notifications can be retried' });
        }
        
        db.prepare("UPDATE notifications SET status = 'PENDING', retry_count = retry_count + 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(id);
        logActivity(req.session.adminId, 'UPDATE', 'notifications', id, `Retried notification ${id}`);
        
        const updated = db.prepare('SELECT * FROM notifications WHERE id = ?').get(id);
        res.json({ data: updated });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/:id/cancel', requireRole(['ADMIN', 'SUPER_ADMIN']), (req, res) => {
    try {
        const { id } = req.params;
        const db = getDb();
        
        const notification = db.prepare("SELECT * FROM notifications WHERE id = ?").get(id);
        if (!notification) return res.status(404).json({ error: 'Notification not found' });
        
        if (notification.status !== 'PENDING') {
            return res.status(400).json({ error: 'Only pending notifications can be cancelled' });
        }
        
        db.prepare("UPDATE notifications SET status = 'CANCELLED', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(id);
        logActivity(req.session.adminId, 'UPDATE', 'notifications', id, `Cancelled notification ${id}`);
        
        const updated = db.prepare('SELECT * FROM notifications WHERE id = ?').get(id);
        res.json({ data: updated });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
