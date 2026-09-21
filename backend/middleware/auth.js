'use strict';

// Role hierarchy for permission checks
const ROLE_PERMISSIONS = {
  SUPER_ADMIN: [
    'dashboard', 'products', 'categories', 'orders', 'customers', 'offers',
    'monthly_posts', 'notifications', 'inventory', 'excel_export', 'excel_import',
    'reports', 'administrators', 'settings', 'activity_logs', 'backup',
    'delete_users', 'delete_products', 'manage_admins', 'change_permissions',
    'export_restricted', 'sensitive_config'
  ],
  ADMIN: [
    'dashboard', 'products', 'categories', 'orders', 'customers', 'offers',
    'monthly_posts', 'notifications', 'inventory', 'excel_export', 'excel_import',
    'reports', 'activity_logs', 'delete_products'
  ],
  STAFF: [
    'dashboard', 'products', 'orders', 'customers', 'inventory',
    'update_order_status'
  ]
};

// Staff restrictions (explicitly cannot do)
const STAFF_RESTRICTED = [
  'delete_users', 'delete_products', 'manage_admins', 'change_permissions',
  'export_restricted', 'sensitive_config', 'administrators', 'settings',
  'backup', 'excel_import'
];

function requireAuth(req, res, next) {
  if (!req.session || !req.session.admin) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  // Attach admin info to request
  req.admin = req.session.admin;
  next();
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.session || !req.session.admin) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    const adminRole = req.session.admin.role;
    const allowedRoles = roles.flat();
    if (!allowedRoles.includes(adminRole)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    req.admin = req.session.admin;
    req.session.adminId = req.session.admin.id;
    next();
  };
}

function requirePermission(permission) {
  return (req, res, next) => {
    if (!req.session || !req.session.admin) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    const adminRole = req.session.admin.role;
    const perms = ROLE_PERMISSIONS[adminRole] || [];
    if (!perms.includes(permission)) {
      return res.status(403).json({ error: 'Insufficient permissions for this action' });
    }
    req.admin = req.session.admin;
    next();
  };
}

function getClientIp(req) {
  return req.headers['x-forwarded-for'] || req.connection?.remoteAddress || req.ip || '';
}

module.exports = { requireAuth, requireRole, requirePermission, getClientIp, ROLE_PERMISSIONS, STAFF_RESTRICTED };
