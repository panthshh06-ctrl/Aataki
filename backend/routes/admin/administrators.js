const express = require('express');
const { getDb, logActivity } = require('../../database/database');
const { requireAuth, requireRole } = require('../../middleware/auth');
const bcrypt = require('bcryptjs');

const router = express.Router();
router.use(requireAuth);
router.use(requireRole(['SUPER_ADMIN']));

router.get('/', (req, res) => {
    try {
        const db = getDb();
        const admins = db.prepare('SELECT id, name, email, role, is_active, created_at, last_login FROM administrators').all();
        res.json({ data: admins });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/', (req, res) => {
    try {
        const { name, email, password, role } = req.body;
        if (!name || !email || !password || !role) return res.status(400).json({ error: 'Missing required fields' });
        
        const hash = bcrypt.hashSync(password, 10);
        const db = getDb();
        
        const result = db.prepare('INSERT INTO administrators (name, email, password_hash, role) VALUES (?, ?, ?, ?)').run(name, email, hash, role);
        
        logActivity(req.session.adminId, 'CREATE', 'administrators', result.lastInsertRowid, `Created admin ${email}`);
        
        const newAdmin = db.prepare('SELECT id, name, email, role, is_active, created_at FROM administrators WHERE id = ?').get(result.lastInsertRowid);
        res.json({ data: newAdmin });
    } catch (error) {
        if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
            return res.status(400).json({ error: 'Email already exists' });
        }
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.put('/:id', (req, res) => {
    try {
        const { id } = req.params;
        const { name, email, role, is_active, password } = req.body;
        const db = getDb();
        
        let query = 'UPDATE administrators SET ';
        const params = [];
        if (name) { query += 'name = ?, '; params.push(name); }
        if (email) { query += 'email = ?, '; params.push(email); }
        if (role) { query += 'role = ?, '; params.push(role); }
        if (is_active !== undefined) { query += 'is_active = ?, '; params.push(is_active); }
        if (password) {
            query += 'password_hash = ?, ';
            params.push(bcrypt.hashSync(password, 10));
        }
        
        query += 'updated_at = CURRENT_TIMESTAMP WHERE id = ?';
        params.push(id);
        
        db.prepare(query).run(...params);
        logActivity(req.session.adminId, 'UPDATE', 'administrators', id, `Updated admin ${id}`);
        
        const admin = db.prepare('SELECT id, name, email, role, is_active, created_at FROM administrators WHERE id = ?').get(id);
        res.json({ data: admin });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.delete('/:id', (req, res) => {
    try {
        const { id } = req.params;
        if (id == req.session.adminId) return res.status(400).json({ error: 'Cannot delete yourself' });
        
        const db = getDb();
        db.prepare('UPDATE administrators SET is_active = 0 WHERE id = ?').run(id);
        logActivity(req.session.adminId, 'DELETE', 'administrators', id, `Deactivated admin ${id}`);
        
        res.json({ data: { success: true } });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
