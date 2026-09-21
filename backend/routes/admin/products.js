const express = require('express');
const { getDb, logActivity } = require('../../database/database');
const { requireAuth, requireRole } = require('../../middleware/auth');
const multer = require('multer');
const path = require('path');

const router = express.Router();
router.use(requireAuth);

const upload = multer({
    dest: path.join(__dirname, '../../uploads'),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (_req, file, callback) => callback(null, ['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype))
});

router.get('/', (req, res) => {
    try {
        const { search, category_id, is_active, stock_status, page = 1, limit = 50, sort = 'created_at', order = 'desc' } = req.query;
        const db = getDb();
        
        let query = 'FROM products WHERE deleted = 0';
        const params = [];
        
        if (search) {
            query += ' AND (name LIKE ? OR sku LIKE ?)';
            params.push(`%${search}%`, `%${search}%`);
        }
        if (category_id) { query += ' AND category_id = ?'; params.push(category_id); }
        if (is_active !== undefined) { query += ' AND is_active = ?'; params.push(is_active); }
        if (stock_status === 'out_of_stock') { query += ' AND stock_quantity = 0'; }
        
        const total = db.prepare(`SELECT COUNT(*) as count ${query}`).get(...params).count;
        
        const validSorts = ['name', 'price', 'stock_quantity', 'created_at'];
        const sortCol = validSorts.includes(sort) ? sort : 'created_at';
        const sortDir = order.toLowerCase() === 'asc' ? 'ASC' : 'DESC';
        
        query += ` ORDER BY ${sortCol} ${sortDir} LIMIT ? OFFSET ?`;
        params.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));
        
        const products = db.prepare(`SELECT * ${query}`).all(...params);
        
        res.json({ data: products, total, page: parseInt(page), limit: parseInt(limit) });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.get('/:id', (req, res) => {
    try {
        const { id } = req.params;
        const db = getDb();
        const product = db.prepare('SELECT * FROM products WHERE id = ? AND deleted = 0').get(id);
        if (!product) return res.status(404).json({ error: 'Product not found' });
        res.json({ data: product });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/', requireRole(['ADMIN', 'SUPER_ADMIN']), upload.single('image'), (req, res) => {
    try {
        const { name, sku, price, stock_quantity, category_id, description, is_active } = req.body;
        if (!name || price <= 0 || stock_quantity < 0 || !sku) {
            return res.status(400).json({ error: 'Invalid input. Name, SKU, price>0, stock>=0 required.' });
        }
        
        const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;
        
        const db = getDb();
        const result = db.prepare(`
            INSERT INTO products (name, sku, price, stock_quantity, category_id, description, is_active, image_url)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(name, sku, price, stock_quantity, category_id || null, description || null, is_active !== undefined ? is_active : 1, imageUrl);
        
        logActivity(req.session.adminId, 'CREATE', 'products', result.lastInsertRowid, `Created product ${sku}`);
        
        const product = db.prepare('SELECT * FROM products WHERE id = ?').get(result.lastInsertRowid);
        res.json({ data: product });
    } catch (error) {
        if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') return res.status(400).json({ error: 'SKU must be unique' });
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.put('/:id', requireRole(['ADMIN', 'SUPER_ADMIN']), upload.single('image'), (req, res) => {
    try {
        const { id } = req.params;
        const { name, sku, price, stock_quantity, category_id, description, is_active } = req.body;
        
        const db = getDb();
        let query = 'UPDATE products SET ';
        const params = [];
        
        if (name) { query += 'name = ?, '; params.push(name); }
        if (sku) { query += 'sku = ?, '; params.push(sku); }
        if (price !== undefined) { query += 'price = ?, '; params.push(price); }
        if (stock_quantity !== undefined) { query += 'stock_quantity = ?, '; params.push(stock_quantity); }
        if (category_id !== undefined) { query += 'category_id = ?, '; params.push(category_id || null); }
        if (description !== undefined) { query += 'description = ?, '; params.push(description); }
        if (is_active !== undefined) { query += 'is_active = ?, '; params.push(is_active); }
        if (req.file) { query += 'image_url = ?, '; params.push(`/uploads/${req.file.filename}`); }
        
        query += 'updated_at = CURRENT_TIMESTAMP WHERE id = ? AND deleted = 0';
        params.push(id);
        
        db.prepare(query).run(...params);
        logActivity(req.session.adminId, 'UPDATE', 'products', id, `Updated product ${id}`);
        
        const product = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
        res.json({ data: product });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.delete('/:id', requireRole(['ADMIN', 'SUPER_ADMIN']), (req, res) => {
    try {
        const { id } = req.params;
        const db = getDb();
        db.prepare('UPDATE products SET deleted = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(id);
        logActivity(req.session.adminId, 'DELETE', 'products', id, `Soft deleted product ${id}`);
        res.json({ data: { success: true } });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/bulk', requireRole(['ADMIN', 'SUPER_ADMIN']), (req, res) => {
    try {
        const { action, ids, value } = req.body;
        if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ error: 'Ids array required' });
        
        const db = getDb();
        const placeholders = ids.map(() => '?').join(',');
        
        if (action === 'activate') {
            db.prepare(`UPDATE products SET is_active = 1 WHERE id IN (${placeholders})`).run(...ids);
        } else if (action === 'deactivate') {
            db.prepare(`UPDATE products SET is_active = 0 WHERE id IN (${placeholders})`).run(...ids);
        } else if (action === 'delete') {
            if (req.session.role !== 'ADMIN' && req.session.role !== 'SUPER_ADMIN') return res.status(403).json({ error: 'Forbidden' });
            db.prepare(`UPDATE products SET deleted = 1 WHERE id IN (${placeholders})`).run(...ids);
        } else if (action === 'change-category') {
            db.prepare(`UPDATE products SET category_id = ? WHERE id IN (${placeholders})`).run(value, ...ids);
        } else if (action === 'update-stock') {
            db.prepare(`UPDATE products SET stock_quantity = stock_quantity + ? WHERE id IN (${placeholders})`).run(value, ...ids);
        } else {
            return res.status(400).json({ error: 'Invalid action' });
        }
        
        logActivity(req.session.adminId, 'BULK_ACTION', 'products', 0, `Bulk ${action} on ${ids.length} products`);
        res.json({ data: { success: true } });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
