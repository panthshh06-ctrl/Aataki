const express = require('express');
const { getDb, logActivity } = require('../../database/database');
const { requireAuth, requireRole } = require('../../middleware/auth');

const router = express.Router();
router.use(requireAuth);

router.get('/', (req, res) => {
    try {
        const { status, page = 1, limit = 50 } = req.query;
        const db = getDb();
        
        let query = 'FROM monthly_posts WHERE 1=1';
        const params = [];
        
        if (status) {
            query += ' AND status = ?';
            params.push(status);
        }
        
        const total = db.prepare(`SELECT COUNT(*) as count ${query}`).get(...params).count;
        
        query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));
        
        const posts = db.prepare(`SELECT * ${query}`).all(...params);
        
        res.json({ data: posts, total, page: parseInt(page), limit: parseInt(limit) });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.get('/:id', (req, res) => {
    try {
        const { id } = req.params;
        const db = getDb();
        const post = db.prepare('SELECT * FROM monthly_posts WHERE id = ?').get(id);
        if (!post) return res.status(404).json({ error: 'Post not found' });
        res.json({ data: post });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/', requireRole(['ADMIN', 'SUPER_ADMIN']), (req, res) => {
    try {
        const { title, content, image_url, status, target_month, publish_date } = req.body;
        if (!title || !content || !target_month) return res.status(400).json({ error: 'Missing required fields' });
        
        const db = getDb();
        const result = db.prepare(`
            INSERT INTO monthly_posts (title, content, image_url, publish_date, status, target_month, author_id)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(title, content, image_url || null, publish_date || null, status || 'draft', target_month, req.session.adminId);
        
        logActivity(req.session.adminId, 'CREATE', 'monthly_posts', result.lastInsertRowid, `Created post ${title}`);
        
        const post = db.prepare('SELECT * FROM monthly_posts WHERE id = ?').get(result.lastInsertRowid);
        res.json({ data: post });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.put('/:id', requireRole(['ADMIN', 'SUPER_ADMIN']), (req, res) => {
    try {
        const { id } = req.params;
        const { title, content, image_url, status, target_month, publish_date } = req.body;
        
        const db = getDb();
        let query = 'UPDATE monthly_posts SET ';
        const params = [];
        
        if (title !== undefined) { query += 'title = ?, '; params.push(title); }
        if (content !== undefined) { query += 'content = ?, '; params.push(content); }
        if (image_url !== undefined) { query += 'image_url = ?, '; params.push(image_url); }
        if (status !== undefined) { query += 'status = ?, '; params.push(status); }
        if (target_month !== undefined) { query += 'target_month = ?, '; params.push(target_month); }
        if (publish_date !== undefined) { query += 'publish_date = ?, '; params.push(publish_date || null); }
        
        query += 'updated_at = CURRENT_TIMESTAMP WHERE id = ?';
        params.push(id);
        
        db.prepare(query).run(...params);
        logActivity(req.session.adminId, 'UPDATE', 'monthly_posts', id, `Updated post ${id}`);
        
        const post = db.prepare('SELECT * FROM monthly_posts WHERE id = ?').get(id);
        res.json({ data: post });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.delete('/:id', requireRole(['ADMIN', 'SUPER_ADMIN']), (req, res) => {
    try {
        const { id } = req.params;
        const db = getDb();
        db.prepare('DELETE FROM monthly_posts WHERE id = ?').run(id);
        logActivity(req.session.adminId, 'DELETE', 'monthly_posts', id, `Deleted post ${id}`);
        res.json({ data: { success: true } });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/:id/publish', requireRole(['ADMIN', 'SUPER_ADMIN']), (req, res) => {
    try {
        const { id } = req.params;
        const db = getDb();
        db.prepare("UPDATE monthly_posts SET status = 'published', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(id);
        logActivity(req.session.adminId, 'UPDATE', 'monthly_posts', id, `Published post ${id}`);
        const post = db.prepare('SELECT * FROM monthly_posts WHERE id = ?').get(id);
        res.json({ data: post });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/:id/unpublish', requireRole(['ADMIN', 'SUPER_ADMIN']), (req, res) => {
    try {
        const { id } = req.params;
        const db = getDb();
        db.prepare("UPDATE monthly_posts SET status = 'draft', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(id);
        logActivity(req.session.adminId, 'UPDATE', 'monthly_posts', id, `Unpublished post ${id}`);
        const post = db.prepare('SELECT * FROM monthly_posts WHERE id = ?').get(id);
        res.json({ data: post });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
