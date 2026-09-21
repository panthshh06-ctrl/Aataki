'use strict';
const express = require('express');
const bcrypt = require('bcryptjs');
const { getDb, logActivity } = require('../../database/database');
const { requireAuth } = require('../../middleware/auth');

const router = express.Router();

const loginAttempts = new Map();

const rateLimit = (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    const windowMs = 15 * 60 * 1000;
    
    if (!loginAttempts.has(ip)) {
        loginAttempts.set(ip, { count: 1, firstAttempt: now });
        return next();
    }
    
    const record = loginAttempts.get(ip);
    if (now - record.firstAttempt > windowMs) {
        loginAttempts.set(ip, { count: 1, firstAttempt: now });
        return next();
    }
    
    if (record.count >= 5) {
        return res.status(429).json({ error: 'Too many login attempts, please try again later' });
    }
    
    record.count += 1;
    next();
};

router.post('/login', rateLimit, (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
        
        const db = getDb();
        const admin = db.prepare('SELECT * FROM administrators WHERE email = ? AND is_active = 1').get(email);
        
        if (!admin || !bcrypt.compareSync(password, admin.password_hash)) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        req.session.admin = admin; // FIXED: unified session key
        req.session.role = admin.role;
        req.session.adminId = admin.id;
        
        const ip = req.ip || req.connection.remoteAddress;
        loginAttempts.delete(ip);
        
        logActivity(admin.id, 'LOGIN', 'administrators', admin.id, 'Admin logged in');
        
        const { password_hash, ...adminData } = admin;
        res.json({ data: adminData });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/logout', requireAuth, (req, res) => {
    try {
        const adminId = req.session.admin?.id;
        logActivity(adminId, 'LOGOUT', 'administrators', adminId, 'Admin logged out');
        req.session.destroy();
        res.json({ data: { success: true } });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.get('/me', requireAuth, (req, res) => {
    try {
        const db = getDb();
        const admin = db.prepare('SELECT id, name, email, role, is_active, created_at FROM administrators WHERE id = ?').get(req.session.admin?.id);
        
        if (!admin) return res.status(404).json({ error: 'Admin not found' });
        res.json({ data: admin });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;