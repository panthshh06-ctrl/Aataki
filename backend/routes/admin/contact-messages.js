const express = require('express');
const { getDb, logActivity } = require('../../database/database');
const { requireAuth, requireRole } = require('../../middleware/auth');

const router = express.Router();
router.use(requireAuth);

router.get('/', (req, res) => {
    try {
        const { status, search } = req.query;
        const db = getDb();
        const params = [];
        let where = 'WHERE 1=1';
        if (status) {
            where += ' AND status = ?';
            params.push(status);
        }
        if (search) {
            where += ' AND (name LIKE ? OR email LIKE ? OR message LIKE ?)';
            const term = `%${String(search).trim()}%`;
            params.push(term, term, term);
        }
        const messages = db.prepare(`SELECT * FROM contact_messages ${where} ORDER BY created_at DESC`).all(...params);
        res.json({ data: messages });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.put('/:id/status', requireRole(['ADMIN', 'SUPER_ADMIN']), (req, res) => {
    try {
        const { status } = req.body || {};
        if (!['new', 'read', 'resolved'].includes(status)) {
            return res.status(400).json({ error: 'Invalid message status' });
        }
        const db = getDb();
        const result = db.prepare("UPDATE contact_messages SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(status, req.params.id);
        if (!result.changes) return res.status(404).json({ error: 'Message not found' });
        logActivity(req.session.adminId, 'UPDATE', 'contact_messages', req.params.id, `Updated contact message status to ${status}`);
        res.json({ data: db.prepare('SELECT * FROM contact_messages WHERE id = ?').get(req.params.id) });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
