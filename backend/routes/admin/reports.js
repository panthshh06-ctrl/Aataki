const express = require('express');
const { getDb, logActivity } = require('../../database/database');
const { requireAuth } = require('../../middleware/auth');

const router = express.Router();
router.use(requireAuth);

router.get('/:type', (req, res) => {
    try {
        const { type } = req.params;
        const { start_date, end_date } = req.query;
        const db = getDb();
        
        let dateCondition = '';
        const params = [];
        if (start_date) { dateCondition += ' AND created_at >= ?'; params.push(start_date); }
        if (end_date) { dateCondition += ' AND created_at <= ?'; params.push(end_date); }
        
        if (type === 'sales') {
            const data = db.prepare(`SELECT date(created_at) as date, SUM(total_amount) as revenue, COUNT(*) as orders FROM orders WHERE lower(payment_status) = 'paid' ${dateCondition} GROUP BY date(created_at) ORDER BY date DESC`).all(...params);
            
            const summary = db.prepare(`SELECT SUM(total_amount) as total_revenue, COUNT(*) as total_orders FROM orders WHERE lower(payment_status) = 'paid' ${dateCondition}`).get(...params);
            
            return res.json({ data: { rows: data, summary } });
        }
        
        if (type === 'customers') {
            const summary = db.prepare(`SELECT COUNT(*) as total_customers FROM customers WHERE 1=1 ${dateCondition}`).get(...params);
            return res.json({ data: { summary } });
        }
        
        res.status(400).json({ error: 'Report type not supported' });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
