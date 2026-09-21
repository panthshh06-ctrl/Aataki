'use strict';
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
const { getDb } = require('./database/database');

function runSeed() {
    const db = getDb();
    console.log('[Seed] Starting database seed...');

    // Clear existing dev data (keep only if production?)
    if (process.env.NODE_ENV !== 'production') {
        console.log('[Seed] Clearing existing development data...');
        db.exec(`
            DELETE FROM activity_logs;
            DELETE FROM backups;
            DELETE FROM settings;
            DELETE FROM inventory_logs;
            DELETE FROM notifications;
            DELETE FROM monthly_posts;
            DELETE FROM offers;
            DELETE FROM order_items;
            DELETE FROM orders;
            DELETE FROM products;
            DELETE FROM categories;
            DELETE FROM customers;
            DELETE FROM administrators;
        `);
        // Reset autoincrement counters
        db.exec(`
            DELETE FROM sqlite_sequence WHERE name IN (
                'administrators', 'customers', 'categories', 'products', 
                'orders', 'order_items', 'offers', 'monthly_posts', 
                'notifications', 'inventory_logs', 'activity_logs', 'settings', 'backups'
            );
        `);
    }

    // 1. Settings (must come first for foreign key usage if any)
    const settings = [
        ['store_name', 'Aataki', 'store'],
        ['store_tagline', 'Fresh Atta Ground Only After You Order', 'store'],
        ['currency', 'INR', 'store'],
        ['currency_symbol', '₹', 'store'],
        ['low_stock_threshold', '10', 'inventory'],
        ['order_auto_confirm', 'false', 'orders'],
        ['smtp_host', '', 'email'],
        ['smtp_port', '587', 'email'],
        ['smtp_secure', 'false', 'email'],
        ['smtp_user', '', 'email'],
        ['smtp_pass', '', 'email'],
        ['smtp_from', 'Aataki <noreply@aataki.com>', 'email'],
        ['notification_retry_max', '3', 'notifications'],
        ['notification_retry_delay_minutes', '5', 'notifications'],
        ['max_upload_size_mb', '5', 'security'],
        ['session_timeout_minutes', '480', 'security'],
        ['backup_retention_days', '30', 'backup']
    ];
    const insertSetting = db.prepare('INSERT INTO settings (setting_key, setting_value, key, value, category, is_public) VALUES (?, ?, ?, ?, ?, 0)');
    settings.forEach(([key, value, category]) => insertSetting.run(key, value, key, value, category));
    console.log(`[Seed] Inserted ${settings.length} settings`);

    // 2. Administrators
    const admins = [
        {
            name: 'Super Admin',
            email: process.env.ADMIN_EMAIL || 'admin@aataki.com',
            password_hash: bcrypt.hashSync(process.env.ADMIN_PASSWORD || 'Admin@123', 10),
            role: 'SUPER_ADMIN',
            is_active: 1
        },
        {
            name: 'Store Manager',
            email: 'manager@aataki.com',
            password_hash: bcrypt.hashSync('Manager@123', 10),
            role: 'ADMIN',
            is_active: 1
        },
        {
            name: 'Support Staff',
            email: 'staff@aataki.com',
            password_hash: bcrypt.hashSync('Staff@123', 10),
            role: 'STAFF',
            is_active: 1
        }
    ];
    const insertAdmin = db.prepare(`
        INSERT INTO administrators (name, email, password_hash, role, is_active) 
        VALUES (?, ?, ?, ?, ?)
    `);
    admins.forEach(a => insertAdmin.run(a.name, a.email, a.password_hash, a.role, a.is_active));
    console.log(`[Seed] Inserted ${admins.length} administrators`);

    // 3. Categories
    const categories = [
        { name: 'Wheat Atta', description: 'Premium quality wheat flour' },
        { name: 'Multigrain Atta', description: 'Blend of wheat, oats, barley' },
        { name: 'Gluten Free', description: 'Jowar, bajra, ragi flour' },
        { name: 'Spices', description: 'Ground spices and masalas' },
        { name: 'Oil & Ghee', description: 'Cooking oils and clarified butter' }
    ];
    const insertCategory = db.prepare(`
        INSERT INTO categories (name, description, slug)
        VALUES (?, ?, ?)
    `);
    categories.forEach(c => insertCategory.run(c.name, c.description, c.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')));
    console.log(`[Seed] Inserted ${categories.length} categories`);

    // Get category IDs for product seeding
    const categoryMap = {};
    const catRows = db.prepare('SELECT id, name FROM categories').all();
    catRows.forEach(r => { categoryMap[r.name] = r.id; });

    // 4. Customers (Users)
    const customers = [
        {
            name: 'Rahul Sharma',
            email: 'rahul.sharma@email.com',
            phone: '9876543210',
            address: '123, Green Park, New Delhi',
            is_active: 1,
            notification_email: 1,
            notification_website: 1
        },
        {
            name: 'Priya Patel',
            email: 'priya.patel@email.com',
            phone: '8765432109',
            address: '456, MG Road, Bangalore',
            is_active: 1,
            notification_email: 1,
            notification_website: 0
        },
        {
            name: 'Amit Kumar',
            email: 'amit.kumar@email.com',
            phone: '7654321098',
            address: '789, Jubilee Hills, Hyderabad',
            is_active: 1,
            notification_email: 0,
            notification_website: 1
        },
        {
            name: 'Neha Singh',
            email: 'neha.singh@email.com',
            phone: '6543210987',
            address: '321, Salt Lake, Kolkata',
            is_active: 0,
            notification_email: 1,
            notification_website: 1
        },
        {
            name: 'Vikram Reddy',
            email: 'vikram.reddy@email.com',
            phone: '5432109876',
            address: '654, Banjara Hills, Hyderabad',
            is_active: 1,
            notification_email: 1,
            notification_website: 1
        }
    ];
    const insertCustomer = db.prepare(`
        INSERT INTO customers (name, email, phone, address, is_active, notification_email, notification_website)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    customers.forEach(c => 
        insertCustomer.run(c.name, c.email, c.phone, c.address, c.is_active, c.notification_email, c.notification_website)
    );
    console.log(`[Seed] Inserted ${customers.length} customers`);

    // Get customer IDs
    const customerRows = db.prepare('SELECT id, name FROM customers WHERE is_active = 1').all();
    const customerMap = {};
    customerRows.forEach(r => { customerMap[r.name] = r.id; });

    // 5. Products
    const products = [
        {
            name: 'Premium Wheat Atta 5kg',
            sku: 'WHEAT-ATTA-5KG',
            category_id: categoryMap['Wheat Atta'],
            price: 275.00,
            original_price: 320.00,
            discount: 14.06,
            stock_quantity: 150,
            image_url: '/uploads/wheat-atta-5kg.jpg',
            is_active: 1
        },
        {
            name: 'Multigrain Atta 1kg',
            sku: 'MULTI-ATTA-1KG',
            category_id: categoryMap['Multigrain Atta'],
            price: 85.00,
            original_price: 100.00,
            discount: 15.00,
            stock_quantity: 89,
            image_url: '/uploads/multi-atta-1kg.jpg',
            is_active: 1
        },
        {
            name: 'Jowar Atta 500g',
            sku: 'JOWAR-ATTA-500G',
            category_id: categoryMap['Gluten Free'],
            price: 95.00,
            original_price: 110.00,
            discount: 13.64,
            stock_quantity: 42,
            image_url: '/uploads/jowar-atta-500g.jpg',
            is_active: 1
        },
        {
            name: 'Turmeric Powder 200g',
            sku: 'TURMERIC-200G',
            category_id: categoryMap['Spices'],
            price: 120.00,
            original_price: 140.00,
            discount: 14.29,
            stock_quantity: 200,
            image_url: '/uploads/turmeric-200g.jpg',
            is_active: 1
        },
        {
            name: 'Pure Ghee 1L',
            sku: 'GHEE-1L',
            category_id: categoryMap['Oil & Ghee'],
            price: 580.00,
            original_price: 650.00,
            discount: 10.77,
            stock_quantity: 67,
            image_url: '/uploads/ghee-1l.jpg',
            is_active: 1
        },
        {
            name: 'Organic Wheat Atta 10kg',
            sku: 'ORG-WHEAT-10KG',
            category_id: categoryMap['Wheat Atta'],
            price: 520.00,
            original_price: 600.00,
            discount: 13.33,
            stock_quantity: 23,
            image_url: '/uploads/org-wheat-10kg.jpg',
            is_active: 1
        }
    ];
    const insertProduct = db.prepare(`
        INSERT INTO products (name, sku, category_id, price, original_price, discount, stock_quantity, image_url, is_active)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    products.forEach(p => 
        insertProduct.run(p.name, p.sku, p.category_id, p.price, p.original_price, p.discount, p.stock_quantity, p.image_url, p.is_active)
    );
    console.log(`[Seed] Inserted ${products.length} products`);

    // 6. Orders (last 30 days)
    const ordersData = [
        {
            customer_name: 'Rahul Sharma',
            subtotal: 825.00,
            discount: 0,
            tax: 148.50,
            shipping_cost: 50.00,
            total_amount: 1023.50,
            payment_status: 'paid',
            order_status: 'delivered',
            shipping_name: 'Rahul Sharma',
            shipping_phone: '9876543210',
            shipping_address: '123, Green Park, New Delhi',
            days_ago: 2
        },
        {
            customer_name: 'Priya Patel',
            subtotal: 420.00,
            discount: 50.00,
            tax: 66.60,
            shipping_cost: 0,
            total_amount: 436.60,
            payment_status: 'paid',
            order_status: 'delivered',
            shipping_name: 'Priya Patel',
            shipping_phone: '8765432109',
            shipping_address: '456, MG Road, Bangalore',
            days_ago: 5
        },
        {
            customer_name: 'Amit Kumar',
            subtotal: 1200.00,
            discount: 100.00,
            tax: 198.00,
            shipping_cost: 100.00,
            total_amount: 1398.00,
            payment_status: 'paid',
            order_status: 'shipped',
            shipping_name: 'Amit Kumar',
            shipping_phone: '7654321098',
            shipping_address: '789, Jubilee Hills, Hyderabad',
            days_ago: 1
        },
        {
            customer_name: 'Neha Singh',
            subtotal: 350.00,
            discount: 0,
            tax: 63.00,
            shipping_cost: 40.00,
            total_amount: 453.00,
            payment_status: 'failed',
            order_status: 'cancelled',
            shipping_name: 'Neha Singh',
            shipping_phone: '6543210987',
            shipping_address: '321, Salt Lake, Kolkata',
            days_ago: 3
        },
        {
            customer_name: 'Vikram Reddy',
            subtotal: 950.00,
            discount: 50.00,
            tax: 162.00,
            shipping_cost: 80.00,
            total_amount: 1142.00,
            payment_status: 'paid',
            order_status: 'processing',
            shipping_name: 'Vikram Reddy',
            shipping_phone: '5432109876',
            shipping_address: '654, Banjara Hills, Hyderabad',
            days_ago: 0
        }
    ];
    const insertOrder = db.prepare(`
        INSERT INTO orders (customer_id, order_id, subtotal, discount, tax, shipping_cost, total_amount, payment_status, status,
                           shipping_name, shipping_phone, shipping_address, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const insertOrderItem = db.prepare(`
        INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price, subtotal)
        VALUES (?, ?, ?, ?, ?, ?)
    `);

    let orderIdCounter = 1000;
    ordersData.forEach(o => {
        const customerId = customerMap[o.customer_name];
        const orderId = `ORD-${++orderIdCounter}`;
        const orderDate = new Date();
        orderDate.setDate(orderDate.getDate() - o.days_ago);
        const isoDate = orderDate.toISOString().slice(0, 19).replace('T', ' ');

        const orderResult = insertOrder.run(
            customerId, orderId, o.subtotal, o.discount, o.tax, o.shipping_cost, o.total_amount,
            o.payment_status, o.order_status, o.shipping_name, o.shipping_phone, o.shipping_address, 'Seed order'
        );

        // Add 2-3 random items per order
        const productIds = Object.keys(categoryMap).map(name => db.prepare('SELECT id FROM products WHERE name LIKE ? LIMIT 1').get(`%${name}%`).id);
        const numItems = 2 + Math.floor(Math.random() * 2); // 2-3 items
        let runningSubtotal = 0;
        for (let i = 0; i < numItems; i++) {
            const pid = productIds[Math.floor(Math.random() * productIds.length)];
            const product = db.prepare('SELECT name, price FROM products WHERE id = ?').get(pid);
            const qty = 1 + Math.floor(Math.random() * 3); // 1-3 kg/packets
            const unitPrice = product.price;
            const itemSubtotal = qty * unitPrice;
            runningSubtotal += itemSubtotal;
            insertOrderItem.run(orderId, pid, product.name, qty, unitPrice, itemSubtotal);
        }
        // Adjust order subtotal to match items (simplified)
        db.prepare('UPDATE orders SET subtotal = ? WHERE order_id = ?').run(runningSubtotal, orderId);
    });
    console.log(`[Seed] Inserted ${ordersData.length} orders with items`);

    // 7. Offers
    const offers = [
        {
            title: 'Festive Season Special',
            description: 'Flat 20% off on all atta varieties',
            discount_type: 'percentage',
            discount_value: 20,
            promo_code: 'FESTIVE20',
            start_date: '2026-09-01',
            end_date: '2026-10-31',
            applicable_products: '[]',
            applicable_categories: '["Wheat Atta","Multigrain Atta","Gluten Free"]',
            image_url: '/uploads/offer-festive.jpg',
            status: 'active',
            notify_on_activate: 1,
            notify_email: 1,
            notify_website: 1
        },
        {
            title: 'New Customer Welcome',
            description: '₹50 off on first order above ₹500',
            discount_type: 'fixed',
            discount_value: 50,
            promo_code: 'WELCOME50',
            start_date: '2026-09-07',
            end_date: '2026-12-31',
            applicable_products: '[]',
            applicable_categories: '[]',
            image_url: '',
            status: 'active',
            notify_on_activate: 0,
            notify_email: 1,
            notify_website: 0
        },
        {
            title: 'Clearance Sale',
            description: 'Up to 50% off on slow-moving stock',
            discount_type: 'percentage',
            discount_value: 0, // will be set per product in real scenario
            promo_code: 'CLEARANCE',
            start_date: '2026-08-01',
            end_date: '2026-08-31',
            applicable_products: '[]',
            applicable_categories: '[]',
            image_url: '',
            status: 'expired',
            notify_on_activate: 0,
            notify_email: 0,
            notify_website: 0
        }
    ];
    const insertOffer = db.prepare(`
        INSERT INTO offers (name, title, description, discount_type, discount_value, promo_code, start_date, end_date,
                           applicable_products, applicable_categories, image_url, status, notify_on_activate, notify_email, notify_website)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    offers.forEach(o => 
        insertOffer.run(o.title, o.title, o.description, o.discount_type, o.discount_value, o.promo_code, o.start_date, o.end_date,
                       o.applicable_products, o.applicable_categories, o.image_url, o.status, o.notify_on_activate, o.notify_email, o.notify_website)
    );
    console.log(`[Seed] Inserted ${offers.length} offers`);

    // 8. Monthly Posts
    const posts = [
        {
            title: 'September Special: Fresh Harvest Atta',
            content: 'This month we bring you freshly harvested wheat stone-ground to perfection. Limited stock available!',
            image_url: '/uploads/post-sept-special.jpg',
            publish_date: '2026-09-01',
            expiration_date: '2026-09-30',
            status: 'published',
            author_id: 1 // Super Admin
        },
        {
            title: 'Festival Season Prep: Stock Up Early',
            content: 'Avoid last-minute rush. Stock your pantry with our premium atta and spices now.',
            image_url: '/uploads/post-festival-prep.jpg',
            publish_date: '2026-10-01',
            expiration_date: '2026-10-31',
            status: 'scheduled',
            author_id: 2 // Manager
        }
    ];
    const insertPost = db.prepare(`
        INSERT INTO monthly_posts (title, content, image_url, publish_date, expiration_date, status, author_id)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    posts.forEach(p => 
        insertPost.run(p.title, p.content, p.image_url, p.publish_date, p.expiration_date, p.status, p.author_id)
    );
    console.log(`[Seed] Inserted ${posts.length} monthly posts`);

    // 9. Notifications (mix of pending, sent, failed)
    const notifications = [
        {
            type: 'OFFER',
            recipient_email: 'rahul.sharma@email.com',
            title: 'Festive Season Special is Live!',
            message: 'Enjoy 20% off on all atta varieties with code FESTIVE20',
            status: 'SENT',
            sent_at: '2026-09-02 10:30:00'
        },
        {
            type: 'ORDER',
            recipient_email: 'amit.kumar@email.com',
            title: 'Order ORD-1003 Shipped',
            message: 'Your order has been shipped and will arrive in 2-3 days.',
            status: 'SENT',
            sent_at: '2026-09-06 15:45:00'
        },
        {
            type: 'MONTHLY_POST',
            recipient_email: 'neha.singh@email.com',
            title: 'New Post: September Special',
            message: 'Check out our latest monthly post about fresh harvest atta.',
            status: 'PENDING'
        },
        {
            type: 'SYSTEM',
            recipient_email: 'staff@aataki.com',
            title: 'System Maintenance Scheduled',
            message: 'Server maintenance planned for September 15, 2026 from 2AM-4AM IST.',
            status: 'FAILED',
            failure_reason: 'SMTP authentication failed',
            retry_count: 2
        }
    ];
    const insertNotification = db.prepare(`
        INSERT INTO notifications (type, recipient_email, title, message, status, sent_at, failure_reason, retry_count)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    notifications.forEach(n => 
        insertNotification.run(n.type, n.recipient_email, n.title, n.message, n.status, n.sent_at || null, n.failure_reason || null, n.retry_count || 0)
    );
    console.log(`[Seed] Inserted ${notifications.length} notifications`);

    // 10. Inventory Logs (adjustments)
    const inventoryLogs = [
        {
            product_id: 1, // Wheat Atta
            previous_qty: 200,
            new_qty: 150,
            difference: -50,
            reason: 'Sold to customers',
            admin_id: 1
        },
        {
            product_id: 2, // Multigrain Atta
            previous_qty: 120,
            new_qty: 89,
            difference: -31,
            reason: 'Sold to customers',
            admin_id: 1
        },
        {
            product_id: 3, // Jowar Atta
            previous_qty: 50,
            new_qty: 42,
            difference: -8,
            reason: 'Sold to customers',
            admin_id: 2
        }
    ];
    const insertInventoryLog = db.prepare(`
        INSERT INTO inventory_logs (product_id, previous_stock, previous_qty, new_stock, new_qty, quantity_change, difference, reason, admin_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    inventoryLogs.forEach(l => 
        insertInventoryLog.run(l.product_id, l.previous_qty, l.previous_qty, l.new_qty, l.new_qty, l.difference, l.difference, l.reason, l.admin_id)
    );
    console.log(`[Seed] Inserted ${inventoryLogs.length} inventory log entries`);

    console.log('[Seed] Database seeding completed successfully!');
}

if (require.main === module) {
    runSeed();
}

module.exports = { runSeed };