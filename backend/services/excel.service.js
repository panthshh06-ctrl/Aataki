// server/services/excel.service.js
const ExcelJS = require('exceljs');

const schemas = {
    users: {
        table: 'users',
        exclude: ['password_hash', 'reset_token', 'reset_token_expiry', 'remember_token'],
        columns: [
            { header: 'ID', key: 'id', width: 10 },
            { header: 'Username', key: 'username', width: 20 },
            { header: 'Email', key: 'email', width: 30 },
            { header: 'Role', key: 'role', width: 15 },
            { header: 'First Name', key: 'first_name', width: 20 },
            { header: 'Last Name', key: 'last_name', width: 20 },
            { header: 'Phone', key: 'phone', width: 15 },
            { header: 'Status', key: 'status', width: 15 },
            { header: 'Created At', key: 'created_at', width: 20, style: { numFmt: 'yyyy-mm-dd hh:mm:ss' } },
            { header: 'Updated At', key: 'updated_at', width: 20, style: { numFmt: 'yyyy-mm-dd hh:mm:ss' } }
        ]
    },
    products: {
        table: 'products',
        columns: [
            { header: 'ID', key: 'id', width: 10 },
            { header: 'Name', key: 'name', width: 30 },
            { header: 'SKU', key: 'sku', width: 20 },
            { header: 'Category ID', key: 'category_id', width: 15 },
            { header: 'Price', key: 'price', width: 15, style: { numFmt: '₹#,##0.00' } },
            { header: 'Stock', key: 'stock', width: 15 },
            { header: 'Status', key: 'status', width: 15 },
            { header: 'Created At', key: 'created_at', width: 20, style: { numFmt: 'yyyy-mm-dd hh:mm:ss' } }
        ]
    },
    orders: {
        table: 'orders',
        columns: [
            { header: 'ID', key: 'id', width: 10 },
            { header: 'User ID', key: 'user_id', width: 15 },
            { header: 'Total Amount', key: 'total_amount', width: 15, style: { numFmt: '₹#,##0.00' } },
            { header: 'Status', key: 'status', width: 15 },
            { header: 'Payment Status', key: 'payment_status', width: 15 },
            { header: 'Shipping Address', key: 'shipping_address', width: 40 },
            { header: 'Created At', key: 'created_at', width: 20, style: { numFmt: 'yyyy-mm-dd hh:mm:ss' } }
        ]
    },
    order_items: {
        table: 'order_items',
        columns: [
            { header: 'ID', key: 'id', width: 10 },
            { header: 'Order ID', key: 'order_id', width: 15 },
            { header: 'Product ID', key: 'product_id', width: 15 },
            { header: 'Quantity', key: 'quantity', width: 15 },
            { header: 'Price', key: 'price', width: 15, style: { numFmt: '₹#,##0.00' } },
            { header: 'Created At', key: 'created_at', width: 20, style: { numFmt: 'yyyy-mm-dd hh:mm:ss' } }
        ]
    },
    offers: {
        table: 'offers',
        columns: [
            { header: 'ID', key: 'id', width: 10 },
            { header: 'Title', key: 'title', width: 30 },
            { header: 'Code', key: 'code', width: 20 },
            { header: 'Discount Type', key: 'discount_type', width: 15 },
            { header: 'Discount Value', key: 'discount_value', width: 15 },
            { header: 'Start Date', key: 'start_date', width: 20, style: { numFmt: 'yyyy-mm-dd hh:mm:ss' } },
            { header: 'End Date', key: 'end_date', width: 20, style: { numFmt: 'yyyy-mm-dd hh:mm:ss' } },
            { header: 'Status', key: 'status', width: 15 },
            { header: 'Created At', key: 'created_at', width: 20, style: { numFmt: 'yyyy-mm-dd hh:mm:ss' } }
        ]
    },
    monthly_posts: {
        table: 'monthly_posts',
        columns: [
            { header: 'ID', key: 'id', width: 10 },
            { header: 'Title', key: 'title', width: 30 },
            { header: 'Author ID', key: 'author_id', width: 15 },
            { header: 'Publish Date', key: 'publish_date', width: 20, style: { numFmt: 'yyyy-mm-dd hh:mm:ss' } },
            { header: 'Status', key: 'status', width: 15 },
            { header: 'Created At', key: 'created_at', width: 20, style: { numFmt: 'yyyy-mm-dd hh:mm:ss' } }
        ]
    },
    notifications: {
        table: 'notifications',
        columns: [
            { header: 'ID', key: 'id', width: 10 },
            { header: 'Type', key: 'type', width: 15 },
            { header: 'Recipient ID', key: 'recipient_id', width: 15 },
            { header: 'Recipient Email', key: 'recipient_email', width: 30 },
            { header: 'Title', key: 'title', width: 30 },
            { header: 'Status', key: 'status', width: 15 },
            { header: 'Created At', key: 'created_at', width: 20, style: { numFmt: 'yyyy-mm-dd hh:mm:ss' } }
        ]
    },
    inventory: {
        table: 'inventory_logs',
        columns: [
            { header: 'ID', key: 'id', width: 10 },
            { header: 'Product ID', key: 'product_id', width: 15 },
            { header: 'Change', key: 'quantity_change', width: 15 },
            { header: 'Reason', key: 'reason', width: 30 },
            { header: 'Admin ID', key: 'admin_id', width: 15 },
            { header: 'Created At', key: 'created_at', width: 20, style: { numFmt: 'yyyy-mm-dd hh:mm:ss' } }
        ]
    },
    activity_logs: {
        table: 'activity_logs',
        columns: [
            { header: 'ID', key: 'id', width: 10 },
            { header: 'User ID', key: 'user_id', width: 15 },
            { header: 'Action', key: 'action', width: 30 },
            { header: 'Entity Type', key: 'entity_type', width: 20 },
            { header: 'Entity ID', key: 'entity_id', width: 15 },
            { header: 'IP Address', key: 'ip_address', width: 20 },
            { header: 'Created At', key: 'created_at', width: 20, style: { numFmt: 'yyyy-mm-dd hh:mm:ss' } }
        ]
    }
};

async function exportEntity(type, db) {
    const schema = schemas[type];
    if (!schema) {
        throw new Error(`Unsupported entity type: ${type}`);
    }

    const workbook = new ExcelJS.Workbook();
    const sheetName = type.charAt(0).toUpperCase() + type.slice(1);
    const sheet = workbook.addWorksheet(sheetName);

    sheet.columns = schema.columns;

    let query = `SELECT * FROM ${schema.table}`;
    const data = db.prepare(query).all();

    data.forEach(row => {
        const rowData = {};
        schema.columns.forEach(col => {
            rowData[col.key] = row[col.key];
        });
        sheet.addRow(rowData);
    });

    sheet.autoFilter = {
        from: { row: 1, column: 1 },
        to: { row: 1, column: schema.columns.length }
    };
    sheet.views = [
        { state: 'frozen', xSplit: 0, ySplit: 1 }
    ];

    return workbook;
}

async function exportAll(db) {
    const workbook = new ExcelJS.Workbook();

    for (const type of Object.keys(schemas)) {
        const schema = schemas[type];
        const sheetName = type.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('_');
        const sheet = workbook.addWorksheet(sheetName);

        sheet.columns = schema.columns;

        let query = `SELECT * FROM ${schema.table}`;
        try {
            const data = db.prepare(query).all();
            data.forEach(row => {
                const rowData = {};
                schema.columns.forEach(col => {
                    rowData[col.key] = row[col.key];
                });
                sheet.addRow(rowData);
            });
        } catch(err) {
            console.error(`Error exporting ${type}: ${err.message}`);
        }

        sheet.autoFilter = {
            from: { row: 1, column: 1 },
            to: { row: 1, column: schema.columns.length }
        };
        sheet.views = [
            { state: 'frozen', xSplit: 0, ySplit: 1 }
        ];
    }

    return workbook;
}

function validateImport(type, workbook) {
    const sheet = workbook.worksheets[0];
    if (!sheet) {
        throw new Error('Workbook is empty');
    }

    let result = {
        total: 0,
        valid: 0,
        invalid: 0,
        duplicates: 0,
        validRows: [],
        invalidRows: [],
        errors: []
    };

    if (sheet.rowCount <= 1) {
        return result;
    }

    const headers = sheet.getRow(1).values.map(v => (v || '').toString().toLowerCase().trim());
    result.total = sheet.rowCount - 1;

    let seenKeys = new Set();

    sheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return;

        let rowData = {};
        row.eachCell((cell, colNumber) => {
            const header = headers[colNumber];
            if (header) {
                rowData[header] = cell.value;
            }
        });

        let isValid = true;
        let rowErrors = [];

        if (type === 'products') {
            if (!rowData.name) {
                isValid = false;
                rowErrors.push({ row: rowNumber, field: 'name', value: null, problem: 'Name is required', suggestion: 'Provide a product name' });
            }
            if (!rowData.price || isNaN(parseFloat(rowData.price)) || parseFloat(rowData.price) <= 0) {
                isValid = false;
                rowErrors.push({ row: rowNumber, field: 'price', value: rowData.price, problem: 'Invalid price', suggestion: 'Price must be greater than 0' });
            }
            if (rowData.stock === undefined || isNaN(parseInt(rowData.stock, 10)) || parseInt(rowData.stock, 10) < 0) {
                isValid = false;
                rowErrors.push({ row: rowNumber, field: 'stock', value: rowData.stock, problem: 'Invalid stock', suggestion: 'Stock must be 0 or greater' });
            }
            if (rowData.sku) {
                if (seenKeys.has(rowData.sku)) {
                    isValid = false;
                    result.duplicates++;
                    rowErrors.push({ row: rowNumber, field: 'sku', value: rowData.sku, problem: 'Duplicate SKU in file', suggestion: 'Ensure SKUs are unique' });
                } else {
                    seenKeys.add(rowData.sku);
                }
            }
        } else if (type === 'categories') {
            if (!rowData.name) {
                isValid = false;
                rowErrors.push({ row: rowNumber, field: 'name', value: null, problem: 'Name is required', suggestion: 'Provide a category name' });
            }
            if (rowData.name) {
                if (seenKeys.has(rowData.name)) {
                    isValid = false;
                    result.duplicates++;
                    rowErrors.push({ row: rowNumber, field: 'name', value: rowData.name, problem: 'Duplicate Category in file', suggestion: 'Ensure Categories are unique' });
                } else {
                    seenKeys.add(rowData.name);
                }
            }
        } else if (type === 'offers') {
            if (!rowData.title) {
                isValid = false;
                rowErrors.push({ row: rowNumber, field: 'title', value: null, problem: 'Title is required', suggestion: 'Provide an offer title' });
            }
            if (!['percentage', 'fixed'].includes((rowData.discount_type || '').toLowerCase())) {
                isValid = false;
                rowErrors.push({ row: rowNumber, field: 'discount_type', value: rowData.discount_type, problem: 'Invalid discount type', suggestion: 'Must be percentage or fixed' });
            }
            if (!rowData.start_date || !rowData.end_date) {
                isValid = false;
                rowErrors.push({ row: rowNumber, field: 'dates', value: null, problem: 'Start or end date missing', suggestion: 'Provide valid dates' });
            }
        } else if (type === 'inventory') {
            if (!rowData.product_id && !rowData.sku) {
                isValid = false;
                rowErrors.push({ row: rowNumber, field: 'identifier', value: null, problem: 'Product ID or SKU required', suggestion: 'Provide either Product ID or SKU' });
            }
            if (rowData.quantity === undefined || isNaN(parseInt(rowData.quantity, 10)) || parseInt(rowData.quantity, 10) < 0) {
                isValid = false;
                rowErrors.push({ row: rowNumber, field: 'quantity', value: rowData.quantity, problem: 'Invalid quantity', suggestion: 'Quantity must be 0 or greater' });
            }
        }

        if (isValid) {
            result.valid++;
            result.validRows.push(rowData);
        } else {
            result.invalid++;
            result.invalidRows.push(rowData);
            result.errors.push(...rowErrors);
        }
    });

    return result;
}

function performImport(type, validRows, db, adminId) {
    let result = { inserted: 0, updated: 0, failed: 0, errors: [] };

    try {
        db.exec('BEGIN TRANSACTION');

        if (type === 'products') {
            const insertStmt = db.prepare(`
                INSERT INTO products (name, sku, category_id, price, stock, status, created_at, updated_at)
                VALUES (@name, @sku, @category_id, @price, @stock, COALESCE(@status, 'active'), datetime('now'), datetime('now'))
            `);
            const updateStmt = db.prepare(`
                UPDATE products 
                SET name = @name, category_id = @category_id, price = @price, stock = @stock, status = COALESCE(@status, status), updated_at = datetime('now')
                WHERE sku = @sku
            `);
            const checkStmt = db.prepare('SELECT id FROM products WHERE sku = ?');

            for (const row of validRows) {
                try {
                    const existing = row.sku ? checkStmt.get(row.sku) : null;
                    if (existing) {
                        updateStmt.run({
                            name: row.name, sku: row.sku, category_id: row.category_id || null, 
                            price: parseFloat(row.price), stock: parseInt(row.stock, 10), status: row.status || null
                        });
                        result.updated++;
                    } else {
                        insertStmt.run({
                            name: row.name, sku: row.sku || null, category_id: row.category_id || null, 
                            price: parseFloat(row.price), stock: parseInt(row.stock, 10), status: row.status || 'active'
                        });
                        result.inserted++;
                    }
                } catch (e) {
                    result.failed++;
                    result.errors.push({ row: JSON.stringify(row), error: e.message });
                }
            }
        } else if (type === 'categories') {
            const insertStmt = db.prepare(`
                INSERT INTO categories (name, description, created_at, updated_at)
                VALUES (@name, @description, datetime('now'), datetime('now'))
            `);
            const checkStmt = db.prepare('SELECT id FROM categories WHERE name = ?');
            
            for (const row of validRows) {
                try {
                    const existing = checkStmt.get(row.name);
                    if (!existing) {
                        insertStmt.run({ name: row.name, description: row.description || null });
                        result.inserted++;
                    } else {
                        result.failed++;
                        result.errors.push({ row: JSON.stringify(row), error: 'Category already exists' });
                    }
                } catch (e) {
                    result.failed++;
                    result.errors.push({ row: JSON.stringify(row), error: e.message });
                }
            }
        } else if (type === 'offers') {
            const insertStmt = db.prepare(`
                INSERT INTO offers (title, code, discount_type, discount_value, start_date, end_date, status, created_at, updated_at)
                VALUES (@title, @code, @discount_type, @discount_value, @start_date, @end_date, 'scheduled', datetime('now'), datetime('now'))
            `);
            for (const row of validRows) {
                try {
                    insertStmt.run({
                        title: row.title, code: row.code || null, 
                        discount_type: row.discount_type.toLowerCase(), 
                        discount_value: parseFloat(row.discount_value || 0),
                        start_date: row.start_date, end_date: row.end_date
                    });
                    result.inserted++;
                } catch (e) {
                    result.failed++;
                    result.errors.push({ row: JSON.stringify(row), error: e.message });
                }
            }
        } else if (type === 'inventory') {
            const updateStmt = db.prepare(`UPDATE products SET stock = stock + @quantity, updated_at = datetime('now') WHERE id = @product_id`);
            const logStmt = db.prepare(`
                INSERT INTO inventory_logs (product_id, quantity_change, reason, admin_id, created_at)
                VALUES (@product_id, @quantity, @reason, @admin_id, datetime('now'))
            `);
            const findSkuStmt = db.prepare('SELECT id FROM products WHERE sku = ?');

            for (const row of validRows) {
                try {
                    let productId = row.product_id;
                    if (!productId && row.sku) {
                        const prod = findSkuStmt.get(row.sku);
                        if (prod) productId = prod.id;
                    }

                    if (productId) {
                        const qty = parseInt(row.quantity, 10);
                        updateStmt.run({ quantity: qty, product_id: productId });
                        logStmt.run({
                            product_id: productId,
                            quantity: qty,
                            reason: 'Bulk Import',
                            admin_id: adminId || null
                        });
                        result.updated++;
                    } else {
                        result.failed++;
                        result.errors.push({ row: JSON.stringify(row), error: 'Product not found' });
                    }
                } catch (e) {
                    result.failed++;
                    result.errors.push({ row: JSON.stringify(row), error: e.message });
                }
            }
        }

        db.exec('COMMIT');
    } catch (error) {
        db.exec('ROLLBACK');
        console.error('Import transaction failed:', error);
        result.errors.push({ row: 'N/A', error: 'Transaction aborted: ' + error.message });
    }

    return result;
}

async function generateErrorReport(errors) {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Import Errors');

    sheet.columns = [
        { header: 'Row', key: 'row', width: 10 },
        { header: 'Field', key: 'field', width: 20 },
        { header: 'Value', key: 'value', width: 20 },
        { header: 'Problem', key: 'problem', width: 40 },
        { header: 'Suggestion', key: 'suggestion', width: 40 }
    ];

    errors.forEach(err => {
        sheet.addRow({
            row: err.row,
            field: err.field,
            value: err.value,
            problem: err.problem,
            suggestion: err.suggestion
        });
    });

    sheet.autoFilter = {
        from: { row: 1, column: 1 },
        to: { row: 1, column: 5 }
    };
    sheet.views = [
        { state: 'frozen', xSplit: 0, ySplit: 1 }
    ];

    return workbook;
}

module.exports = {
    exportEntity,
    exportAll,
    validateImport,
    performImport,
    generateErrorReport
};
