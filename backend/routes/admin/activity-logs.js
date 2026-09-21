const express = require('express');
const { getDb } = require('../../database/database');
const { requireAuth } = require('../../middleware/auth');

const router = express.Router();
router.use(requireAuth);

router.get('/', (req, res) => {
    try {
        const { admin_id, action, entity_type, start_date, end_date, page = 1, limit = 50 } = req.query;
        const db = getDb();
        
        let where = 'WHERE 1=1';
        const params = [];
        
        if (admin_id) {
            where += ' AND al.admin_id = ?';
            params.push(admin_id);
        }
        if (action) {
            where += ' AND al.action = ?';
            params.push(action);
        }
        if (entity_type) {
            where += ' AND al.entity_type = ?';
            params.push(entity_type);
        }
        if (start_date) {
            where += ' AND al.created_at >= ?';
            params.push(start_date);
        }
        if (end_date) {
            where += ' AND al.created_at <= ?';
            params.push(end_date);
        }
        
        const countWhere = where.replace(/al\./g, '');
        const total = db.prepare(`SELECT COUNT(*) as count FROM activity_logs ${countWhere}`).get(...params).count;
        
        const query = `
            SELECT al.*, a.name as admin_name 
            FROM activity_logs al
            LEFT JOIN administrators a ON al.admin_id = a.id
            ${where}
            ORDER BY al.created_at DESC LIMIT ? OFFSET ?
        `;
        params.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));
        
        const logs = db.prepare(query).all(...params);
        
        res.json({ data: logs, total, page: parseInt(page), limit: parseInt(limit) });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
