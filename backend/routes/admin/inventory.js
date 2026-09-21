const express = require('express');
const { getDb, logActivity, getSetting } = require('../../database/database');
const { requireAuth, requireRole } = require('../../middleware/auth');

const router = express.Router();
router.use(requireAuth);

router.get('/', (req, res) => {
    try {
        const { search, status, page = 1, limit = 50 } = req.query;
        const db = getDb();
        const threshold = parseInt(getSetting('low_stock_threshold') || '10', 10);
        
        let query = 'FROM products WHERE deleted = 0';
        const params = [];
        
        if (search) {
            query += ' AND (name LIKE ? OR sku LIKE ?)';
            params.push(`%${search}%`, `%${search}%`);
        }
        
        if (status === 'OUT_OF_STOCK') { query += ' AND stock_quantity = 0'; }
        else if (status === 'LOW_STOCK') { query += ` AND stock_quantity > 0 AND stock_quantity <= ?`; params.push(threshold); }
        else if (status === 'IN_STOCK') { query += ` AND stock_quantity > ?`; params.push(threshold); }
        
        const total = db.prepare(`SELECT COUNT(*) as count ${query}`).get(...params).count;
        
        query += ' ORDER BY name ASC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));
        
        const products = db.prepare(`SELECT id, name, sku, stock_quantity, category_id, price ${query}`).all(...params);
        
        const enriched = products.map(p => {
            let s = 'IN_STOCK';
            if (p.stock_quantity === 0) s = 'OUT_OF_STOCK';
            else if (p.stock_quantity <= threshold) s = 'LOW_STOCK';
            return { ...p, inventory_status: s };
        });
        
        res.json({ data: enriched, total, page: parseInt(page), limit: parseInt(limit) });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.put('/:id', requireRole(['ADMIN', 'SUPER_ADMIN']), (req, res) => {
    try {
        const { id } = req.params;
        const { action, amount, reason } = req.body; // action: increase, decrease, set
        if (!['increase', 'decrease', 'set'].includes(action) || amount < 0 || !reason) {
            return res.status(400).json({ error: 'Invalid input' });
        }
        
        const db = getDb();
        
        db.transaction(() => {
            const product = db.prepare('SELECT stock_quantity FROM products WHERE id = ? AND deleted = 0').get(id);
            if (!product) throw new Error('Product not found');
            
            let newStock = product.stock_quantity;
            if (action === 'set') newStock = amount;
            else if (action === 'increase') newStock += amount;
            else if (action === 'decrease') {
                newStock -= amount;
                if (newStock < 0) throw new Error('Stock cannot be negative');
            }
            
            db.prepare('UPDATE products SET stock_quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(newStock, id);
            
            db.prepare(`
                INSERT INTO inventory_logs (product_id, previous_stock, previous_qty, new_stock, new_qty, quantity_change, difference, reason, admin_id)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(id, product.stock_quantity, product.stock_quantity, newStock, newStock, newStock - product.stock_quantity, newStock - product.stock_quantity, reason, req.session.adminId);
            
            logActivity(req.session.adminId, 'UPDATE', 'inventory', id, `Updated stock for product ${id}`);
        })();
        
        const updated = db.prepare('SELECT id, name, sku, stock_quantity FROM products WHERE id = ?').get(id);
        res.json({ data: updated });
    } catch (error) {
        res.status(error.message === 'Product not found' ? 404 : 400).json({ error: error.message || 'Internal server error' });
    }
});

router.post('/bulk', requireRole(['ADMIN', 'SUPER_ADMIN']), (req, res) => {
    try {
        const { updates, reason } = req.body; // updates: [{id, action, amount}]
        if (!Array.isArray(updates) || !reason) return res.status(400).json({ error: 'Invalid input' });
        
        const db = getDb();
        
        db.transaction((updatesList) => {
            for (const update of updatesList) {
                const { id, action, amount } = update;
                if (!['increase', 'decrease', 'set'].includes(action) || amount < 0) continue;
                
                const product = db.prepare('SELECT stock_quantity FROM products WHERE id = ? AND deleted = 0').get(id);
                if (!product) continue;
                
                let newStock = product.stock_quantity;
                if (action === 'set') newStock = amount;
                else if (action === 'increase') newStock += amount;
                else if (action === 'decrease') {
                    newStock -= amount;
                    if (newStock < 0) newStock = 0;
                }
                
                db.prepare('UPDATE products SET stock_quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(newStock, id);
                db.prepare(`
                    INSERT INTO inventory_logs (product_id, previous_stock, previous_qty, new_stock, new_qty, quantity_change, difference, reason, admin_id)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                `).run(id, product.stock_quantity, product.stock_quantity, newStock, newStock, newStock - product.stock_quantity, newStock - product.stock_quantity, reason, req.session.adminId);
            }
            logActivity(req.session.adminId, 'BULK_ACTION', 'inventory', 0, `Bulk stock update for ${updatesList.length} items`);
        })(updates);
        
        res.json({ data: { success: true } });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.get('/audit-log', (req, res) => {
    try {
        const { product_id, admin_id, start_date, end_date, page = 1, limit = 50 } = req.query;
        const db = getDb();
        
        let query = 'FROM inventory_logs il LEFT JOIN products p ON il.product_id = p.id LEFT JOIN administrators a ON il.admin_id = a.id WHERE 1=1';
        const params = [];
        
        if (product_id) { query += ' AND il.product_id = ?'; params.push(product_id); }
        if (admin_id) { query += ' AND il.admin_id = ?'; params.push(admin_id); }
        if (start_date) { query += ' AND il.created_at >= ?'; params.push(start_date); }
        if (end_date) { query += ' AND il.created_at <= ?'; params.push(end_date); }
        
        const total = db.prepare(`SELECT COUNT(*) as count ${query}`).get(...params).count;
        
        query += ' ORDER BY il.created_at DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));
        
        const logs = db.prepare(`
            SELECT il.*, p.name as product_name, p.sku as product_sku, a.name as admin_name
            ${query}
        `).all(...params);
        
        res.json({ data: logs, total, page: parseInt(page), limit: parseInt(limit) });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
