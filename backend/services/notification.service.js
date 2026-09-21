// server/services/notification.service.js
const nodemailer = require('nodemailer');
const { getDb, logActivity, getSetting } = require('../database/database');

function getSmtpTransport() {
    try {
        const host = process.env.SMTP_HOST || getSetting('smtp_host');
        const port = process.env.SMTP_PORT || getSetting('smtp_port');
        const user = process.env.SMTP_USER || getSetting('smtp_user');
        const pass = process.env.SMTP_PASSWORD || getSetting('smtp_pass');

        if (!host || !port || !user || !pass) {
            return null;
        }

        return nodemailer.createTransport({
            host,
            port: parseInt(port, 10),
            secure: String(port) === '465',
            auth: {
                user,
                pass
            }
        });
    } catch (error) {
        console.error('Error creating SMTP transport:', error);
        return null;
    }
}

async function sendEmail(to, subject, html) {
    try {
        const transport = getSmtpTransport();
        if (!transport) {
            throw new Error('SMTP not configured');
        }

        const from = process.env.EMAIL_FROM || getSetting('smtp_from') || 'noreply@aataki.com';
        
        const info = await transport.sendMail({
            from,
            to,
            subject,
            html
        });
        
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('Error sending email:', error);
        return { success: false, error: error.message };
    }
}

function queueNotification(type, recipientId, recipientEmail, title, message) {
    try {
        const db = getDb();
        const stmt = db.prepare(`
            INSERT INTO notifications (type, recipient_id, recipient_email, title, message, status, retry_count, created_at)
            VALUES (?, ?, ?, ?, ?, 'PENDING', 0, datetime('now'))
        `);
        const result = stmt.run(type, recipientId, recipientEmail, title, message);
        return result.lastInsertRowid;
    } catch (error) {
        console.error('Error queuing notification:', error);
        return null;
    }
}

async function processNotification(notificationId) {
    const db = getDb();
    try {
        const notification = db.prepare('SELECT * FROM notifications WHERE id = ?').get(notificationId);
        if (!notification) return false;

        const preferenceColumn = {
            ORDER: 'notification_orders',
            OFFER: 'notification_offers',
            MONTHLY_POST: 'notification_monthly'
        }[notification.type];
        if (preferenceColumn && notification.recipient_id) {
            const customer = db.prepare(`SELECT notification_email FROM customers WHERE id = ? AND ${preferenceColumn} = 1`).get(notification.recipient_id);
            if (!customer || customer.notification_email !== 1) {
                db.prepare("UPDATE notifications SET status = 'CANCELLED', updated_at = datetime('now') WHERE id = ?").run(notificationId);
                return false;
            }
        }

        const result = await sendEmail(notification.recipient_email, notification.title, notification.message);

        if (result.success) {
            db.prepare(`
                UPDATE notifications 
                SET status = 'SENT', sent_at = datetime('now')
                WHERE id = ?
            `).run(notificationId);
            return true;
        } else {
            db.prepare(`
                UPDATE notifications 
                SET status = 'FAILED', failure_reason = ?, updated_at = datetime('now')
                WHERE id = ?
            `).run(result.error || 'Unknown error', notificationId);
            return false;
        }
    } catch (error) {
        console.error(`Error processing notification ${notificationId}:`, error);
        try {
            db.prepare(`
                UPDATE notifications 
                SET status = 'FAILED', failure_reason = ?, updated_at = datetime('now')
                WHERE id = ?
            `).run(error.message, notificationId);
        } catch (dbError) {
            console.error('Database error while updating notification failure:', dbError);
        }
        return false;
    }
}

async function retryNotification(notificationId) {
    const db = getDb();
    try {
        const notification = db.prepare('SELECT * FROM notifications WHERE id = ?').get(notificationId);
        if (!notification) return false;

        if (notification.status !== 'FAILED') {
            return false;
        }

        const maxRetries = 3;
        if (notification.retry_count >= maxRetries) {
            return false;
        }

        db.prepare('UPDATE notifications SET retry_count = retry_count + 1 WHERE id = ?').run(notificationId);
        return await processNotification(notificationId);
    } catch (error) {
        console.error(`Error retrying notification ${notificationId}:`, error);
        return false;
    }
}

async function processAllPending() {
    const db = getDb();
    try {
        const pending = db.prepare('SELECT id FROM notifications WHERE status = ?').all('PENDING');
        for (const notif of pending) {
            await processNotification(notif.id);
        }
    } catch (error) {
        console.error('Error processing all pending notifications:', error);
    }
}

function preventDuplicate(type, recipientId, title) {
    const db = getDb();
    try {
        const stmt = db.prepare(`
            SELECT id FROM notifications 
            WHERE type = ? AND recipient_id = ? AND title = ?
            AND created_at >= datetime('now', '-1 day')
            LIMIT 1
        `);
        const existing = stmt.get(type, recipientId, title);
        return !!existing;
    } catch (error) {
        console.error('Error checking duplicate notification:', error);
        return false;
    }
}

module.exports = {
    sendEmail,
    queueNotification,
    processNotification,
    retryNotification,
    processAllPending,
    preventDuplicate,
    getSmtpTransport
};
