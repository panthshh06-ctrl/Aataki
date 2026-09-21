// server/services/scheduler.service.js
const fs = require('fs');
const path = require('path');
const { getDb } = require('../database/database');
const notificationService = require('./notification.service');

function expireOffers() {
    try {
        const db = getDb();
        const result = db.prepare(`
            UPDATE offers 
            SET status = 'expired', updated_at = datetime('now')
            WHERE end_date < datetime('now') AND status = 'active'
        `).run();
        if (result.changes > 0) {
            console.log(`[Scheduler] Expired ${result.changes} offers.`);
        }
    } catch (error) {
        console.error('[Scheduler] Error expiring offers:', error);
    }
}

function processScheduledPosts() {
    try {
        const db = getDb();
        const posts = db.prepare(`SELECT * FROM monthly_posts WHERE publish_date <= datetime('now') AND status = 'scheduled'`).all();
        const result = db.prepare(`
            UPDATE monthly_posts 
            SET status = 'published', updated_at = datetime('now')
            WHERE publish_date <= datetime('now') AND status = 'scheduled'
        `).run();
        if (result.changes > 0) {
            console.log(`[Scheduler] Published ${result.changes} scheduled posts.`);
            const customers = db.prepare(`SELECT id, email FROM customers WHERE is_active = 1 AND notification_monthly = 1`).all();
            for (const post of posts) {
                for (const customer of customers) {
                    const title = `Monthly post: ${post.title}`;
                    if (!notificationService.preventDuplicate('MONTHLY_POST', customer.id, title)) {
                        notificationService.queueNotification('MONTHLY_POST', customer.id, customer.email, title, post.content || post.title);
                    }
                }
            }
        }
    } catch (error) {
        console.error('[Scheduler] Error publishing scheduled posts:', error);
    }
}

function processScheduledOffers() {
    try {
        const db = getDb();
        const offers = db.prepare(`SELECT * FROM offers WHERE start_date <= datetime('now') AND status = 'scheduled'`).all();
        const result = db.prepare(`
            UPDATE offers 
            SET status = 'active', updated_at = datetime('now')
            WHERE start_date <= datetime('now') AND status = 'scheduled'
        `).run();
        if (result.changes > 0) {
            console.log(`[Scheduler] Activated ${result.changes} scheduled offers.`);
            const customers = db.prepare(`SELECT id, email FROM customers WHERE is_active = 1 AND notification_offers = 1`).all();
            for (const offer of offers) {
                const discount = offer.discount_type === 'percentage' ? `${offer.discount_value}% off` : `₹${offer.discount_value} off`;
                const validity = offer.end_date ? `Valid until ${offer.end_date}.` : 'Limited-time offer.';
                for (const customer of customers) {
                    const title = `Offer active: ${offer.name}`;
                    if (!notificationService.preventDuplicate('OFFER', customer.id, title)) {
                        notificationService.queueNotification('OFFER', customer.id, customer.email, title, `${discount}. ${offer.description || ''} ${validity}`.trim());
                    }
                }
            }
        }
    } catch (error) {
        console.error('[Scheduler] Error activating scheduled offers:', error);
    }
}

async function processNotifications() {
    try {
        await notificationService.processAllPending();
    } catch (error) {
        console.error('[Scheduler] Error processing pending notifications:', error);
    }
}

function cleanupExpiredSessions() {
    try {
        // Placeholder log, actual session cleanup handled by express-session store
        console.log('[Scheduler] session cleanup handled by express-session store');
    } catch (error) {
        console.error('[Scheduler] Error in cleanupExpiredSessions:', error);
    }
}

function cleanupTempFiles() {
    try {
        const tempDir = path.join(__dirname, '..', '..', 'uploads', 'temp');
        if (fs.existsSync(tempDir)) {
            const files = fs.readdirSync(tempDir);
            const now = Date.now();
            let deletedCount = 0;
            
            for (const file of files) {
                const filePath = path.join(tempDir, file);
                const stats = fs.statSync(filePath);
                
                // delete if older than 1 hour
                if (now - stats.mtimeMs > 60 * 60 * 1000) {
                    fs.unlinkSync(filePath);
                    deletedCount++;
                }
            }
            if (deletedCount > 0) {
                console.log(`[Scheduler] Deleted ${deletedCount} temp files.`);
            }
        }
    } catch (error) {
        console.error('[Scheduler] Error cleaning up temp files:', error);
    }
}

function startScheduler() {
    console.log('[Scheduler] Starting background tasks...');
    
    // Every 5 minutes (300000 ms)
    setInterval(() => {
        expireOffers();
        processScheduledPosts();
        processScheduledOffers();
    }, 5 * 60 * 1000);
    
    // Every 15 minutes (900000 ms)
    setInterval(() => {
        processNotifications();
        cleanupExpiredSessions();
    }, 15 * 60 * 1000);
    
    // Every hour (3600000 ms)
    setInterval(() => {
        cleanupTempFiles();
    }, 60 * 60 * 1000);
}

module.exports = {
    startScheduler
};
