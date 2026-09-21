'use strict';
const { getDb } = require('./database');
const bcrypt = require('bcryptjs');

function seedDatabase() {
    const db = getDb();
    console.log('[Seed] Seeding database...');

    // 1. Create Default Admin if none exists
    const adminCount = db.prepare('SELECT COUNT(*) as c FROM administrators').get().c;
    if (adminCount === 0) {
        const hash = bcrypt.hashSync('Admin@123', 10);
        db.prepare(`
            INSERT INTO administrators (name, email, password_hash, role, is_active)
            VALUES (?, ?, ?, ?, ?)
        `).run('Super Admin', 'admin@aataki.com', hash, 'SUPER_ADMIN', 1);
        db.prepare(`
            INSERT INTO administrators (name, email, password_hash, role, is_active)
            VALUES (?, ?, ?, ?, ?)
        `).run('Store Manager', 'manager@aataki.com', hash, 'ADMIN', 1);
        db.prepare(`
            INSERT INTO administrators (name, email, password_hash, role, is_active)
            VALUES (?, ?, ?, ?, ?)
        `).run('Support Staff', 'staff@aataki.com', hash, 'STAFF', 1);
        console.log('[Seed] Created default administrators (admin@aataki.com, manager@aataki.com, staff@aataki.com / Admin@123)');
    }

    // 2. Create Categories
    const catCount = db.prepare('SELECT COUNT(*) as c FROM categories').get().c;
    if (catCount === 0) {
        const insertCat = db.prepare('INSERT INTO categories (name, slug, description, is_active) VALUES (?, ?, ?, 1)');
        const categories = [
            ['Whole Wheat Atta', 'whole-wheat-atta', 'Freshly ground 100% whole wheat atta'],
            ['Multigrain Atta', 'multigrain-atta', 'Healthy mix of grains, millets and wheat'],
            ['Organic Millets', 'organic-millets', 'Nutritious chemical-free organic millets'],
            ['Speciality Flour', 'speciality-flour', 'Custom flours for special recipes']
        ];
        categories.forEach(c => insertCat.run(c[0], c[1], c[2]));
        console.log('[Seed] Created categories.');
    }

    // 3. Create Products
    const prodCount = db.prepare('SELECT COUNT(*) as c FROM products').get().c;
    if (prodCount === 0) {
        const insertProd = db.prepare(`
            INSERT INTO products (name, description, sku, category_id, price, original_price, discount, stock_quantity, image_url, is_active)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
        `);
        const products = [
            ['Aataki Sharbati Atta 5kg', 'Premium Sehore Sharbati wheat, stone ground.', 'ATT-SHARB-05', 1, 350, 400, 12.5, 50, '/assets/image_68e37c.jpg'],
            ['Aataki Sharbati Atta 10kg', 'Premium Sehore Sharbati wheat, stone ground family pack.', 'ATT-SHARB-10', 1, 680, 780, 12.8, 30, '/assets/image_68e37c.jpg'],
            ['Aataki Multigrain Health Atta 5kg', 'Wheat, oats, soy, chana, and ragi blend.', 'ATT-MULTI-05', 2, 420, 480, 12.5, 40, '/assets/image_68e37c.jpg'],
            ['Aataki Organic Bajra Flour 1kg', 'Freshly milled organic pearl millet flour.', 'MFL-BAJ-01', 3, 90, 110, 18.1, 25, '/assets/image_68e37c.jpg'],
            ['Aataki Organic Jowar Flour 1kg', 'Nutritious gluten-free sorghum flour.', 'MFL-JOW-01', 3, 95, 115, 17.3, 15, '/assets/image_68e37c.jpg'],
            ['Aataki Low Stock Special Atta 1kg', 'Test low stock product.', 'ATT-LOW-01', 1, 80, 90, 11.1, 3, '/assets/image_68e37c.jpg']
        ];
        products.forEach(p => insertProd.run(p[0], p[1], p[2], p[3], p[4], p[5], p[6], p[7], p[8]));
        console.log('[Seed] Created products.');
    }

    // 4. Create Customers
    const custCount = db.prepare('SELECT COUNT(*) as c FROM customers').get().c;
    if (custCount === 0) {
        const insertCust = db.prepare('INSERT INTO customers (name, email, phone, address, is_active) VALUES (?, ?, ?, ?, 1)');
        for (let i = 1; i <= 20; i++) {
            insertCust.run(`Customer ${i}`, `customer${i}@example.com`, `98765432${String(i).padStart(2, '0')}`, `Address line ${i}, City`);
        }
        console.log('[Seed] Created 20 customers.');
    }

    // 5. Create Orders & Order Items
    const orderCount = db.prepare('SELECT COUNT(*) as c FROM orders').get().c;
    if (orderCount === 0) {
        const insertOrder = db.prepare(`
            INSERT INTO orders (order_id, customer_id, subtotal, shipping_cost, total_amount, payment_status, status, shipping_name, shipping_phone, shipping_address, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', '-' || ? || ' days'))
        `);
        const insertItem = db.prepare(`
            INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price, price, subtotal)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `);

        for (let i = 1; i <= 30; i++) {
            const orderId = 'ORD-' + Math.floor(100000 + Math.random() * 900000);
            const custId = (i % 20) + 1;
            const subtotal = 350 * (i % 3 + 1);
            const shipping = 50;
            const total = subtotal + shipping;
            const statusList = ['pending', 'confirmed', 'processing', 'shipped', 'delivered'];
            const orderStatus = statusList[i % statusList.length];
            const paymentStatus = i % 5 === 0 ? 'pending' : 'paid';
            const daysAgo = 30 - i;

            const res = insertOrder.run(orderId, custId, subtotal, shipping, total, paymentStatus, orderStatus, `Customer ${custId}`, `98765432${String(custId).padStart(2, '0')}`, 'Sample Address', daysAgo);
            const dbOrderId = res.lastInsertRowid;

            insertItem.run(dbOrderId, 1, 'Aataki Sharbati Atta 5kg', i % 3 + 1, 350, 350, 350 * (i % 3 + 1));
        }
        console.log('[Seed] Created 30 orders with items.');
    }

    // 6. Create Offers
    const offerCount = db.prepare('SELECT COUNT(*) as c FROM offers').get().c;
    if (offerCount === 0) {
        const insertOffer = db.prepare(`
            INSERT INTO offers (name, title, description, discount_type, discount_value, promo_code, start_date, end_date, status)
            VALUES (?, ?, ?, ?, ?, ?, datetime('now', '-5 days'), datetime('now', '+25 days'), ?)
        `);
        insertOffer.run('September Special', 'September Special Offer', 'Get 15% off on all Sharbati Atta', 'percentage', 15, 'SEP15', 'active');
        insertOffer.run('Festival Dhamaka', 'Festival Dhamaka', 'Flat ₹100 off on orders above ₹500', 'fixed', 100, 'FEST100', 'scheduled');
        console.log('[Seed] Created offers.');
    }

    // 7. Create Monthly Posts
    const postCount = db.prepare('SELECT COUNT(*) as c FROM monthly_posts').get().c;
    if (postCount === 0) {
        const insertPost = db.prepare(`
            INSERT INTO monthly_posts (title, content, status, target_month, publish_date)
            VALUES (?, ?, ?, ?, datetime('now'))
        `);
        insertPost.run('September 2026 Fresh Harvest', 'Welcome to September! Our new batch of Sehore Sharbati wheat has arrived.', 'published', 'September 2026');
        console.log('[Seed] Created monthly posts.');
    }

    console.log('[Seed] Database seeding completed successfully.');
}

if (require.main === module) {
    seedDatabase();
}

module.exports = { seedDatabase };
