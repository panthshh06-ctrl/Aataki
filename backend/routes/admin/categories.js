const express = require('express');
const { getDb, logActivity } = require('../../database/database');
const { requireAuth, requireRole } = require('../../middleware/auth');
const fs = require('fs');

const router = express.Router();
router.use(requireAuth);

router.get('/', (req, res) => {
    try {
        const db = getDb();
        const categories = db.prepare(`
            SELECT c.*, COUNT(p.id) as product_count
            FROM categories c
            LEFT JOIN products p ON c.id = p.category_id AND p.deleted = 0
            GROUP BY c.id
        `).all();
        res.json({ data: categories });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/', requireRole(['ADMIN', 'SUPER_ADMIN']), (req, res) => {
    try {
        const { name, description } = req.body;
        if (!name) return res.status(400).json({ error: 'Name is required' });
        
        const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
        
        const db = getDb();
        const result = db.prepare(`INSERT INTO categories (name, slug, description) VALUES (?, ?, ?)`).run(name, slug, description || null);
        
        logActivity(req.session.adminId, 'CREATE', 'categories', result.lastInsertRowid, 'Created new category');
        
        const category = db.prepare('SELECT * FROM categories WHERE id = ?').get(result.lastInsertRowid);
        res.json({ data: category });
    } catch (error) {
        if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
            return res.status(400).json({ error: 'Category with this name or slug already exists' });
        }
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.put('/:id', requireRole(['ADMIN', 'SUPER_ADMIN']), (req, res) => {
    try {
        const { id } = req.params;
        const { name, description } = req.body;
        
        const db = getDb();
        let query = 'UPDATE categories SET ';
        const params = [];
        if (name) {
            const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
            query += 'name = ?, slug = ?, ';
            params.push(name, slug);
        }
        if (description !== undefined) {
            query += 'description = ?, ';
            params.push(description);
        }
        
        query += 'updated_at = CURRENT_TIMESTAMP WHERE id = ?';
        params.push(id);
        
        db.prepare(query).run(...params);
        logActivity(req.session.adminId, 'UPDATE', 'categories', id, 'Updated category');
        
        const category = db.prepare('SELECT * FROM categories WHERE id = ?').get(id);
        res.json({ data: category });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.delete('/:id', requireRole(['ADMIN', 'SUPER_ADMIN']), (req, res) => {
    try {
        const { id } = req.params;
        const { reassignToId } = req.body;
        const db = getDb();
        
        const productCount = db.prepare('SELECT COUNT(*) as count FROM products WHERE category_id = ? AND deleted = 0').get(id).count;
        
        if (productCount > 0) {
            if (!reassignToId) {
                return res.status(400).json({ error: 'Category has active products. Provide reassignToId to reassign them.' });
            }
            db.prepare('UPDATE products SET category_id = ? WHERE category_id = ?').run(reassignToId, id);
        }
        
        db.prepare('DELETE FROM categories WHERE id = ?').run(id);
        logActivity(req.session.adminId, 'DELETE', 'categories', id, 'Deleted category');
        
        res.json({ data: { success: true } });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
