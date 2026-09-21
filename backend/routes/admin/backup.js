const express = require('express');
const { DB_PATH, logActivity } = require('../../database/database');
const { requireAuth, requireRole } = require('../../middleware/auth');
const fs = require('fs');
const path = require('path');

const router = express.Router();
router.use(requireAuth);

router.post('/', requireRole(['SUPER_ADMIN']), (req, res) => {
    try {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupName = `backup-${timestamp}.sqlite`;
        const backupDir = path.join(path.dirname(DB_PATH), 'backups');
        
        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir, { recursive: true });
        }
        
        const backupPath = path.join(backupDir, backupName);
        fs.copyFileSync(DB_PATH, backupPath);
        
        logActivity(req.session.adminId, 'CREATE', 'backups', 0, `Created backup ${backupName}`);
        
        res.json({ data: { filename: backupName, size: fs.statSync(backupPath).size, created_at: new Date() } });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.get('/', requireRole(['SUPER_ADMIN']), (req, res) => {
    try {
        const backupDir = path.join(path.dirname(DB_PATH), 'backups');
        if (!fs.existsSync(backupDir)) {
            return res.json({ data: [] });
        }
        
        const files = fs.readdirSync(backupDir)
            .filter(f => f.endsWith('.sqlite'))
            .map(f => {
                const stat = fs.statSync(path.join(backupDir, f));
                return {
                    filename: f,
                    size: stat.size,
                    created_at: stat.mtime
                };
            })
            .sort((a, b) => b.created_at - a.created_at);
            
        res.json({ data: files });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
