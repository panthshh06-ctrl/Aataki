'use strict';
const path = require('path');
const { v4: uuidv4 } = require('uuid');

function generateOrderId() {
  return 'ORD-' + Math.floor(100000 + Math.random() * 900000);
}

function generateSku(prefix) {
  const p = (prefix || 'SKU').toUpperCase().substring(0, 3);
  return p + '-' + Math.floor(1000 + Math.random() * 9000);
}

function slugify(text) {
  return text.toString().toLowerCase().trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

function sanitize(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/[<>]/g, '').trim();
}

function paginate(query, params, page, limit) {
  page = Math.max(1, parseInt(page) || 1);
  limit = Math.min(100, Math.max(1, parseInt(limit) || 25));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

function parseDate(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

function formatCurrency(amount) {
  return '₹' + Number(amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function safeFilename(originalName) {
  const ext = path.extname(originalName).toLowerCase();
  return uuidv4() + ext;
}

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const ALLOWED_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
const ALLOWED_EXCEL_TYPES = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel'
];
const ALLOWED_EXCEL_EXTENSIONS = ['.xlsx', '.xls'];

function validateImageFile(file) {
  if (!file) return { valid: false, error: 'No file provided' };
  const ext = path.extname(file.originalname).toLowerCase();
  if (!ALLOWED_IMAGE_EXTENSIONS.includes(ext)) {
    return { valid: false, error: 'Invalid image extension. Allowed: ' + ALLOWED_IMAGE_EXTENSIONS.join(', ') };
  }
  if (!ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
    return { valid: false, error: 'Invalid image type. Allowed: JPEG, PNG, GIF, WebP' };
  }
  if (file.size > 5 * 1024 * 1024) {
    return { valid: false, error: 'File too large. Maximum 5MB.' };
  }
  return { valid: true };
}

function validateExcelFile(file) {
  if (!file) return { valid: false, error: 'No file provided' };
  const ext = path.extname(file.originalname).toLowerCase();
  if (!ALLOWED_EXCEL_EXTENSIONS.includes(ext)) {
    return { valid: false, error: 'Invalid file extension. Allowed: .xlsx' };
  }
  if (file.size > 10 * 1024 * 1024) {
    return { valid: false, error: 'File too large. Maximum 10MB.' };
  }
  return { valid: true };
}

module.exports = {
  generateOrderId, generateSku, slugify, sanitize, paginate, parseDate,
  formatCurrency, safeFilename, validateImageFile, validateExcelFile,
  ALLOWED_IMAGE_TYPES, ALLOWED_IMAGE_EXTENSIONS
};
