const express = require('express');
const { getDb, logActivity } = require('../../database/database');
const { requireAuth, requirePermission } = require('../../middleware/auth');
const exceljs = require('exceljs');
const multer = require('multer');
const crypto = require('crypto');

const router = express.Router();
router.use(requireAuth);
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });
const pendingImports = new Map();

router.get('/export/:type', requirePermission('excel_export'), async (req, res) => {
    try {
        const { type } = req.params;
        const db = getDb();
        const workbook = new exceljs.Workbook();
        
        const exportData = (sheetName, query, columns, removeFields = []) => {
            const sheet = workbook.addWorksheet(sheetName);
            sheet.columns = columns.map(c => ({ header: c, key: c, width: 20 }));
            sheet.getRow(1).font = { bold: true };
            sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: columns.length } };
            sheet.views = [{ state: 'frozen', ySplit: 1 }];
            
            const data = db.prepare(query).all();
            data.forEach(row => {
                removeFields.forEach(f => delete row[f]);
                sheet.addRow(row);
            });
        };
        
        const validTypes = ['users', 'products', 'categories', 'orders', 'order-items', 'offers', 'monthly-posts', 'notifications', 'inventory', 'activity-logs', 'everything'];
        if (!validTypes.includes(type)) return res.status(400).json({ error: 'Invalid export type' });
        if (type === 'products' || type === 'everything') {
            exportData('Products', 'SELECT * FROM products WHERE deleted = 0', ['id', 'name', 'sku', 'price', 'stock_quantity', 'category_id', 'is_active', 'created_at']);
        }
        if (type === 'users' || type === 'everything') {
            exportData('Users', 'SELECT * FROM customers', ['id', 'name', 'email', 'phone', 'is_active', 'created_at', 'last_login'], ['password_hash']);
        }
        if (type === 'orders' || type === 'everything') {
            exportData('Orders', 'SELECT * FROM orders', ['id', 'customer_id', 'total_amount', 'status', 'payment_status', 'created_at']);
        }
        if (type === 'categories' || type === 'everything') exportData('Categories', 'SELECT id, name, description, slug, is_active, created_at FROM categories', ['id', 'name', 'description', 'slug', 'is_active', 'created_at']);
        if (type === 'order-items' || type === 'everything') exportData('Order Items', 'SELECT id, order_id, product_id, product_name, quantity, unit_price, subtotal FROM order_items', ['id', 'order_id', 'product_id', 'product_name', 'quantity', 'unit_price', 'subtotal']);
        if (type === 'offers' || type === 'everything') {
            exportData('Offers', 'SELECT * FROM offers', ['id', 'name', 'discount_type', 'discount_value', 'status', 'start_date', 'end_date']);
        }
        if (type === 'monthly-posts' || type === 'everything') exportData('Monthly Posts', 'SELECT id, title, content, image_url, publish_date, expiration_date, target_month, status, author_id, created_at FROM monthly_posts', ['id', 'title', 'content', 'image_url', 'publish_date', 'expiration_date', 'target_month', 'status', 'author_id', 'created_at']);
        if (type === 'notifications' || type === 'everything') exportData('Notifications', 'SELECT id, type, recipient_id, recipient_email, title, message, status, failure_reason, retry_count, sent_at, created_at FROM notifications', ['id', 'type', 'recipient_id', 'recipient_email', 'title', 'message', 'status', 'failure_reason', 'retry_count', 'sent_at', 'created_at']);
        if (type === 'inventory' || type === 'everything') exportData('Inventory', 'SELECT id, name, sku, stock_quantity, category_id, price, is_active, updated_at FROM products WHERE deleted = 0', ['id', 'name', 'sku', 'stock_quantity', 'category_id', 'price', 'is_active', 'updated_at']);
        if (type === 'activity-logs' || type === 'everything') exportData('Activity Logs', 'SELECT id, admin_id, admin_name, action, entity_type, entity_id, details, ip_address, created_at FROM activity_logs', ['id', 'admin_id', 'admin_name', 'action', 'entity_type', 'entity_id', 'details', 'ip_address', 'created_at']);
        
        logActivity(req.session.adminId, 'EXPORT', type, 0, `Exported ${type}`);
        
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=${type}-export-${Date.now()}.xlsx`);
        
        await workbook.xlsx.write(res);
        res.end();
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

function normalizeRow(row) {
    return Object.fromEntries(Object.entries(row).map(([key, value]) => [String(key).trim().toLowerCase().replace(/\s+/g, '_'), value]));
}

function validateRows(type, rows) {
    const supported = ['products', 'categories', 'offers', 'inventory'];
    if (!supported.includes(type)) throw new Error('Import supports products, categories, offers, and inventory');
    if (!rows.length || rows.length > 500) throw new Error('Workbook must contain between 1 and 500 data rows');
    const required = {
        products: ['name', 'price'],
        categories: ['name'],
        offers: ['name', 'discount_type', 'discount_value'],
        inventory: ['stock_quantity']
    }[type];
    rows.forEach((row, index) => {
        for (const field of required) if (row[field] === undefined || row[field] === '') throw new Error(`Row ${index + 2}: ${field} is required`);
        if (type === 'products' && (!Number.isFinite(Number(row.price)) || Number(row.price) <= 0)) throw new Error(`Row ${index + 2}: price must be positive`);
        if (type === 'inventory' && (!Number.isInteger(Number(row.stock_quantity)) || Number(row.stock_quantity) < 0)) throw new Error(`Row ${index + 2}: stock_quantity must be a non-negative integer`);
        if (type === 'offers' && !['percentage', 'fixed'].includes(String(row.discount_type))) throw new Error(`Row ${index + 2}: invalid discount_type`);
    });
}

router.post('/import/:type(products|categories|offers|inventory)', requirePermission('excel_import'), upload.single('file'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'An .xlsx file is required' });
        const workbook = new exceljs.Workbook();
        await workbook.xlsx.load(req.file.buffer);
        const sheet = workbook.worksheets[0];
        if (!sheet) return res.status(400).json({ error: 'Workbook has no worksheets' });
        const headers = sheet.getRow(1).values.slice(1).map(value => String(value || '').trim().toLowerCase().replace(/\s+/g, '_'));
        const rows = [];
        sheet.eachRow((row, rowNumber) => {
            if (rowNumber === 1) return;
            const values = row.values.slice(1);
            if (values.some(value => value !== null && value !== undefined && value !== '')) rows.push(normalizeRow(Object.fromEntries(headers.map((header, index) => [header, values[index]]))));
        });
        validateRows(req.params.type, rows);
        const token = crypto.randomUUID();
        pendingImports.set(token, { type: req.params.type, rows, adminId: req.session.admin.id, expires: Date.now() + 15 * 60 * 1000 });
        res.json({ data: { token, type: req.params.type, count: rows.length, preview: rows.slice(0, 10) } });
    } catch (error) {
        res.status(400).json({ error: error.message || 'Invalid workbook' });
    }
});

router.post('/import/confirm', requirePermission('excel_import'), (req, res) => {
    try {
        const pending = pendingImports.get(req.body?.token);
        if (!pending || pending.expires < Date.now() || pending.adminId !== req.session.admin.id) return res.status(400).json({ error: 'Import preview expired' });
        const db = getDb();
        const result = db.transaction(() => {
            let count = 0;
            for (const row of pending.rows) {
                if (pending.type === 'categories') {
                    const slug = row.slug || String(row.name).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
                    db.prepare('INSERT INTO categories (name, description, slug, is_active) VALUES (?, ?, ?, 1) ON CONFLICT(name) DO UPDATE SET description = excluded.description, slug = excluded.slug, updated_at = CURRENT_TIMESTAMP').run(row.name, row.description || '', slug);
                } else if (pending.type === 'products') {
                    db.prepare(`INSERT INTO products (name, description, sku, price, original_price, stock_quantity, category_id, is_active)
                        VALUES (?, ?, ?, ?, ?, ?, ?, 1)
                        ON CONFLICT(sku) DO UPDATE SET name = excluded.name, description = excluded.description, price = excluded.price, original_price = excluded.original_price, category_id = excluded.category_id, updated_at = CURRENT_TIMESTAMP`)
                        .run(row.name, row.description || '', row.sku || null, Number(row.price), Number(row.original_price || row.price), Number(row.stock_quantity || 0), row.category_id || null);
                } else if (pending.type === 'offers') {
                    db.prepare(`INSERT INTO offers (name, title, description, discount_type, discount_value, min_order_amount, start_date, end_date, status)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
                        .run(row.name, row.title || row.name, row.description || '', row.discount_type, Number(row.discount_value), Number(row.min_order_amount || 0), row.start_date || null, row.end_date || null, row.status || 'draft');
                } else {
                    const product = db.prepare('SELECT id, stock_quantity FROM products WHERE id = ? OR sku = ?').get(row.product_id || 0, row.sku || '');
                    if (!product) throw new Error(`Inventory product not found for row ${count + 2}`);
                    const newStock = Number(row.stock_quantity);
                    db.prepare('UPDATE products SET stock_quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(newStock, product.id);
                    db.prepare(`INSERT INTO inventory_logs (product_id, previous_stock, previous_qty, new_stock, new_qty, quantity_change, difference, reason, admin_id)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
                        .run(product.id, product.stock_quantity, product.stock_quantity, newStock, newStock, newStock - product.stock_quantity, newStock - product.stock_quantity, 'Excel import', req.session.admin.id);
                }
                count += 1;
            }
            return count;
        })();
        pendingImports.delete(req.body.token);
        logActivity(req.session.admin.id, 'IMPORT', pending.type, 0, `Imported ${result} rows`);
        res.json({ data: { success: true, count: result } });
    } catch (error) {
        res.status(400).json({ error: error.message || 'Import failed; no changes were saved' });
    }
});

module.exports = router;
