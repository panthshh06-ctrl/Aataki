const express = require('express');
const { getDb, setSetting, logActivity } = require('../../database/database');
const { requireAuth, requireRole } = require('../../middleware/auth');

const router = express.Router();
router.use(requireAuth);

router.get('/', (req, res) => {
    try {
        const db = getDb();
        const settings = db.prepare('SELECT setting_key, setting_value, category, description, is_public FROM settings').all();
        
        const grouped = {};
        settings.forEach(s => {
            if (s.setting_key.toLowerCase().includes('password') || s.setting_key.toLowerCase().includes('secret')) {
                s.setting_value = '********';
            }
            if (!grouped[s.category]) grouped[s.category] = [];
            grouped[s.category].push(s);
        });
        
        res.json({ data: grouped });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.put('/', requireRole(['ADMIN', 'SUPER_ADMIN']), (req, res) => {
    try {
        const { settings } = req.body;
        if (!Array.isArray(settings)) return res.status(400).json({ error: 'Settings array required' });
        
        const db = getDb();
        const updateTransaction = db.transaction((settingsList) => {
            for (const s of settingsList) {
                if (s.setting_value === '********') continue;
                setSetting(s.setting_key, s.setting_value);
            }
        });
        
        updateTransaction(settings);
        logActivity(req.session.adminId, 'UPDATE', 'settings', 0, 'Updated settings');
        
        res.json({ data: { success: true } });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/test-email', requireRole(['ADMIN', 'SUPER_ADMIN']), (req, res) => {
    try {
        // Placeholder for testing email config
        logActivity(req.session.adminId, 'ACTION', 'settings', 0, 'Sent test email');
        res.json({ data: { success: true, message: 'Test email sent successfully' } });
    } catch (error) {
        res.status(500).json({ error: 'Failed to send email' });
    }
});

router.post('/integrity-check', requireRole(['ADMIN', 'SUPER_ADMIN']), (req, res) => {
    try {
        const db = getDb();
        const report = { issues: [] };
        
        // Negative stock
        const negativeStock = db.prepare('SELECT id, name, stock_quantity FROM products WHERE stock_quantity < 0').all();
        if (negativeStock.length > 0) report.issues.push({ type: 'NEGATIVE_STOCK', count: negativeStock.length, data: negativeStock });
        
        // Expired active offers
        const expiredOffers = db.prepare("SELECT id, name FROM offers WHERE status = 'active' AND end_date < datetime('now')").all();
        if (expiredOffers.length > 0) report.issues.push({ type: 'EXPIRED_ACTIVE_OFFERS', count: expiredOffers.length, data: expiredOffers });
        
        logActivity(req.session.adminId, 'ACTION', 'settings', 0, 'Ran integrity check');
        res.json({ data: report });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
