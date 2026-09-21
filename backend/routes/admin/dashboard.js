const express = require('express');
const { getDb, getSetting } = require('../../database/database');
const { requireAuth } = require('../../middleware/auth');

const router = express.Router();

router.use(requireAuth);

router.get('/all', (req, res) => {
    try {
        const db = getDb();
        const period = req.query.period || '30days';
        let dateModifier = '-30 days';
        if (period === 'today') dateModifier = 'start of day';
        else if (period === '7days') dateModifier = '-7 days';
        else if (period === '12months') dateModifier = '-12 months';
        
        const { total_revenue } = db.prepare("SELECT SUM(total_amount) as total_revenue FROM orders WHERE lower(payment_status) = 'paid'").get() || { total_revenue: 0 };
        const { total_orders } = db.prepare('SELECT COUNT(*) as total_orders FROM orders').get();
        const { total_customers } = db.prepare('SELECT COUNT(*) as total_customers FROM customers').get();
        const { total_products } = db.prepare('SELECT COUNT(*) as total_products FROM products WHERE is_active = 1 AND deleted = 0').get();
        const { active_offers } = db.prepare("SELECT COUNT(*) as active_offers FROM offers WHERE status = 'active'").get();
        
        const lowStockThreshold = parseInt(getSetting('low_stock_threshold') || '10');
        const { low_stock_count } = db.prepare('SELECT COUNT(*) as low_stock_count FROM products WHERE stock_quantity <= ? AND deleted = 0').get(lowStockThreshold);
        
        const stats = db.prepare(`
            SELECT 
                SUM(total_amount) as revenue,
                COUNT(*) as orders_count,
                AVG(total_amount) as avg_order_value
            FROM orders 
            WHERE created_at >= datetime('now', ?) AND lower(payment_status) = 'paid'
        `).get(dateModifier);

        const recentOrders = db.prepare(`
            SELECT o.id, o.total_amount as total, o.status, c.name as customerName 
            FROM orders o
            LEFT JOIN customers c ON o.customer_id = c.id
            ORDER BY o.created_at DESC
            LIMIT 10
        `).all();
        
        const lowStockProducts = db.prepare(`
            SELECT name, sku, stock_quantity as stock
            FROM products
            WHERE stock_quantity <= ? AND deleted = 0
            ORDER BY stock_quantity ASC
            LIMIT 10
        `).all(lowStockThreshold);
        
        res.json({
            stats: {
                revenue: total_revenue || 0,
                orders: total_orders,
                customers: total_customers,
                products: total_products,
                activeOffers: active_offers,
                lowStock: low_stock_count
            },
            chart: {
                labels: ['Revenue'],
                values: [stats.revenue || 0]
            },
            recentOrders,
            lowStockProducts
        });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.get('/sales', (req, res) => {
    try {
        const db = getDb();
        const { period } = req.query; // today, 7d, 30d, 12m
        let dateModifier = '-30 days';
        
        if (period === 'today') dateModifier = 'start of day';
        else if (period === '7d') dateModifier = '-7 days';
        else if (period === '12m') dateModifier = '-12 months';
        
        const stats = db.prepare(`
            SELECT 
                SUM(total_amount) as revenue,
                COUNT(*) as orders_count,
                AVG(total_amount) as avg_order_value
            FROM orders 
            WHERE created_at >= datetime('now', ?) AND lower(payment_status) = 'paid'
        `).get(dateModifier);
        
        res.json({
            data: {
                revenue: stats.revenue || 0,
                orders_count: stats.orders_count || 0,
                avg_order_value: stats.avg_order_value || 0
            }
        });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.get('/recent-orders', (req, res) => {
    try {
        const db = getDb();
        const orders = db.prepare(`
            SELECT o.*, c.name as customer_name, c.email as customer_email 
            FROM orders o
            LEFT JOIN customers c ON o.customer_id = c.id
            ORDER BY o.created_at DESC
            LIMIT 10
        `).all();
        
        res.json({ data: orders });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.get('/top-products', (req, res) => {
    try {
        const db = getDb();
        const products = db.prepare(`
            SELECT p.id, p.name, SUM(oi.quantity) as units_sold, SUM(oi.price * oi.quantity) as revenue
            FROM order_items oi
            JOIN orders o ON oi.order_id = o.id
            JOIN products p ON oi.product_id = p.id
            WHERE lower(o.payment_status) = 'paid'
            GROUP BY p.id
            ORDER BY units_sold DESC
            LIMIT 10
        `).all();
        
        const totalRevenueResult = db.prepare(`SELECT SUM(total_amount) as total FROM orders WHERE lower(payment_status) = 'paid'`).get();
        const totalRevenue = totalRevenueResult ? totalRevenueResult.total : 1; // prevent div by zero
        
        const enrichedProducts = products.map(p => ({
            ...p,
            percentage_of_total: ((p.revenue / totalRevenue) * 100).toFixed(2)
        }));
        
        res.json({ data: enrichedProducts });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.get('/low-stock', (req, res) => {
    try {
        const db = getDb();
        const threshold = Number.parseInt(getSetting('low_stock_threshold') || '10', 10);
        const products = db.prepare(`
            SELECT id, name, sku, stock_quantity, category_id, price
            FROM products
            WHERE stock_quantity <= ? AND deleted = 0
            ORDER BY stock_quantity ASC
        `).all(threshold);
        
        res.json({ data: products });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
