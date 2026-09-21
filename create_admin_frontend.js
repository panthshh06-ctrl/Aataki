const fs = require('fs');
const path = require('path');

const projectRoot = 'd:\\ebec\\aataki_interactive_cursor';
const adminDir = path.join(projectRoot, 'frontend', 'admin');

// Ensure directories exist
const dirs = [
    adminDir,
    path.join(adminDir, 'css'),
    path.join(adminDir, 'js'),
    path.join(adminDir, 'js', 'pages')
];

dirs.forEach(d => {
    if (!fs.existsSync(d)) {
        fs.mkdirSync(d, { recursive: true });
    }
});

const cssContent = `
:root {
    --primary: #223c2a;
    --primary-light: #2c4d36;
    --accent: #c29a5b;
    --accent-hover: #d4a964;
    --bg-color: #f7f4ea;
    --surface-color: #ffffff;
    --text-dark: #1f3325;
    --text-gray: #6b7280;
    --border-color: #e5e7eb;
    --danger: #ef4444;
    --success: #10b981;
    --warning: #f59e0b;
    --info: #3b82f6;
    --sidebar-width: 260px;
    --font-heading: 'Playfair Display', serif;
    --font-body: 'Inter', sans-serif;
    --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
    --shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
    --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1);
}

.dark {
    --primary: #1a2d20;
    --primary-light: #223c2a;
    --bg-color: #111827;
    --surface-color: #1f2937;
    --text-dark: #f9fafb;
    --text-gray: #9ca3af;
    --border-color: #374151;
}

* { box-sizing: border-box; margin: 0; padding: 0; }

body {
    font-family: var(--font-body);
    background-color: var(--bg-color);
    color: var(--text-dark);
    line-height: 1.5;
    transition: background-color 0.3s, color 0.3s;
}

h1, h2, h3, h4, h5, h6 { font-family: var(--font-heading); color: var(--primary); }
.dark h1, .dark h2, .dark h3, .dark h4, .dark h5, .dark h6 { color: var(--accent); }

a { text-decoration: none; color: var(--accent); }
a:hover { color: var(--accent-hover); }

/* Layout */
.admin-layout { display: flex; min-height: 100vh; }

.sidebar {
    width: var(--sidebar-width);
    background-color: var(--surface-color);
    border-right: 1px solid var(--border-color);
    display: flex;
    flex-direction: column;
    position: fixed;
    height: 100vh;
    z-index: 100;
    transition: transform 0.3s ease;
}

.sidebar-header {
    padding: 1.5rem;
    border-bottom: 1px solid var(--border-color);
    display: flex;
    justify-content: space-between;
    align-items: center;
}
.sidebar-header h2 { font-size: 1.5rem; margin: 0; }
.close-sidebar { display: none; background: none; border: none; font-size: 1.25rem; color: var(--text-gray); cursor: pointer; }

.sidebar-nav { padding: 1rem 0; overflow-y: auto; flex: 1; }
.nav-item {
    display: flex;
    align-items: center;
    padding: 0.75rem 1.5rem;
    color: var(--text-dark);
    transition: all 0.2s;
    font-weight: 500;
}
.nav-item i { width: 1.5rem; margin-right: 0.75rem; color: var(--text-gray); }
.nav-item:hover { background-color: var(--bg-color); color: var(--accent); }
.nav-item:hover i { color: var(--accent); }
.nav-item.active { background-color: var(--primary); color: white; border-left: 4px solid var(--accent); }
.nav-item.active i { color: white; }

.main-content {
    flex: 1;
    margin-left: var(--sidebar-width);
    display: flex;
    flex-direction: column;
    min-height: 100vh;
}

.topbar {
    height: 64px;
    background-color: var(--surface-color);
    border-bottom: 1px solid var(--border-color);
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0 1.5rem;
    position: sticky;
    top: 0;
    z-index: 90;
}

.topbar-left, .topbar-right { display: flex; align-items: center; gap: 1rem; }
.menu-toggle { display: none; background: none; border: none; font-size: 1.25rem; color: var(--text-dark); cursor: pointer; }
.breadcrumbs { font-size: 0.875rem; color: var(--text-gray); }

.icon-btn { background: none; border: none; color: var(--text-gray); font-size: 1.25rem; cursor: pointer; padding: 0.5rem; border-radius: 0.25rem; }
.icon-btn:hover { background-color: var(--bg-color); color: var(--primary); }
.dark .icon-btn:hover { color: var(--accent); }

.admin-profile { display: flex; align-items: center; gap: 0.75rem; font-weight: 500; }

.page-content { padding: 1.5rem; flex: 1; overflow-x: hidden; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
.page-title { font-size: 1.75rem; margin: 0; }

/* Cards */
.card {
    background-color: var(--surface-color);
    border-radius: 0.5rem;
    box-shadow: var(--shadow);
    padding: 1.5rem;
    margin-bottom: 1.5rem;
    border: 1px solid var(--border-color);
}

.stat-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 1.5rem; margin-bottom: 1.5rem; }
.stat-card { display: flex; align-items: center; padding: 1.5rem; }
.stat-icon {
    width: 48px; height: 48px; border-radius: 50%; display: flex; align-items: center; justify-content: center;
    font-size: 1.5rem; background-color: rgba(34, 60, 42, 0.1); color: var(--primary); margin-right: 1rem;
}
.dark .stat-icon { background-color: rgba(194, 154, 91, 0.1); color: var(--accent); }
.stat-details h3 { font-size: 0.875rem; color: var(--text-gray); font-family: var(--font-body); margin-bottom: 0.25rem; }
.stat-details p { font-size: 1.5rem; font-weight: 700; color: var(--text-dark); margin: 0; }

/* Tables */
.table-responsive { overflow-x: auto; margin-bottom: 1rem; }
table { width: 100%; border-collapse: collapse; text-align: left; }
th { background-color: var(--bg-color); padding: 0.75rem 1rem; font-weight: 600; color: var(--text-gray); font-size: 0.875rem; border-bottom: 1px solid var(--border-color); white-space: nowrap; }
td { padding: 1rem; border-bottom: 1px solid var(--border-color); vertical-align: middle; }
tbody tr:hover { background-color: rgba(0,0,0,0.02); }
.dark tbody tr:hover { background-color: rgba(255,255,255,0.02); }

/* Buttons */
.btn {
    display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem;
    padding: 0.5rem 1rem; font-weight: 500; border-radius: 0.375rem; border: 1px solid transparent;
    cursor: pointer; transition: all 0.2s; font-family: inherit; font-size: 0.875rem;
}
.btn-primary { background-color: var(--primary); color: white; }
.btn-primary:hover { background-color: var(--primary-light); }
.btn-secondary { background-color: var(--surface-color); color: var(--text-dark); border-color: var(--border-color); }
.btn-secondary:hover { background-color: var(--bg-color); }
.btn-danger { background-color: var(--danger); color: white; }
.btn-danger:hover { background-color: #dc2626; }
.btn-accent { background-color: var(--accent); color: white; }
.btn-accent:hover { background-color: var(--accent-hover); }

/* Forms */
.form-group { margin-bottom: 1rem; }
.form-group label { display: block; margin-bottom: 0.5rem; font-weight: 500; font-size: 0.875rem; }
.form-control {
    width: 100%; padding: 0.5rem 0.75rem; border: 1px solid var(--border-color); border-radius: 0.375rem;
    background-color: var(--surface-color); color: var(--text-dark); font-family: inherit; font-size: 0.875rem;
    transition: border-color 0.2s;
}
.form-control:focus { outline: none; border-color: var(--accent); box-shadow: 0 0 0 2px rgba(194, 154, 91, 0.2); }
textarea.form-control { resize: vertical; min-height: 100px; }
.checkbox-label { display: flex; align-items: center; gap: 0.5rem; cursor: pointer; font-size: 0.875rem; }

/* Filter Bar */
.filter-bar { display: flex; gap: 1rem; flex-wrap: wrap; margin-bottom: 1.5rem; align-items: center; background: var(--surface-color); padding: 1rem; border-radius: 0.5rem; border: 1px solid var(--border-color); }
.search-input { position: relative; flex: 1; min-width: 250px; }
.search-input i { position: absolute; left: 0.75rem; top: 50%; transform: translateY(-50%); color: var(--text-gray); }
.search-input input { padding-left: 2.25rem; width: 100%; }

/* Badges / Status */
.badge { padding: 0.25rem 0.625rem; border-radius: 9999px; font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.025em; }
.badge-success { background-color: rgba(16, 185, 129, 0.1); color: var(--success); }
.badge-warning { background-color: rgba(245, 158, 11, 0.1); color: var(--warning); }
.badge-danger { background-color: rgba(239, 68, 68, 0.1); color: var(--danger); }
.badge-info { background-color: rgba(59, 130, 246, 0.1); color: var(--info); }
.badge-secondary { background-color: var(--border-color); color: var(--text-dark); }

/* Modals */
.modal-overlay {
    position: fixed; top: 0; left: 0; right: 0; bottom: 0;
    background-color: rgba(0,0,0,0.5); z-index: 1000;
    display: none; align-items: center; justify-content: center;
    padding: 1rem;
}
.modal-overlay.active { display: flex; animation: fadeIn 0.2s ease-out; }
.modal {
    background-color: var(--surface-color); border-radius: 0.5rem; width: 100%; max-width: 500px;
    box-shadow: var(--shadow-lg); display: flex; flex-direction: column; max-height: 90vh;
}
.modal-lg { max-width: 800px; }
.modal-header { padding: 1.25rem 1.5rem; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center; }
.modal-title { margin: 0; font-size: 1.25rem; }
.modal-close { background: none; border: none; font-size: 1.25rem; color: var(--text-gray); cursor: pointer; }
.modal-body { padding: 1.5rem; overflow-y: auto; }
.modal-footer { padding: 1.25rem 1.5rem; border-top: 1px solid var(--border-color); display: flex; justify-content: flex-end; gap: 0.75rem; }

/* Toasts */
.toast-container { position: fixed; top: 1.5rem; right: 1.5rem; z-index: 1100; display: flex; flex-direction: column; gap: 0.75rem; }
.toast {
    min-width: 300px; padding: 1rem 1.25rem; border-radius: 0.375rem; background-color: var(--surface-color);
    box-shadow: var(--shadow-lg); display: flex; align-items: flex-start; gap: 0.75rem;
    border-left: 4px solid; animation: slideIn 0.3s ease-out forwards;
}
.toast.hiding { animation: fadeOut 0.3s ease-in forwards; }
.toast-icon { font-size: 1.25rem; }
.toast-content { flex: 1; }
.toast-title { font-weight: 600; margin-bottom: 0.25rem; font-size: 0.875rem; }
.toast-message { font-size: 0.875rem; color: var(--text-gray); }
.toast-close { background: none; border: none; color: var(--text-gray); cursor: pointer; }
.toast.success { border-color: var(--success); }
.toast.success .toast-icon { color: var(--success); }
.toast.error { border-color: var(--danger); }
.toast.error .toast-icon { color: var(--danger); }
.toast.warning { border-color: var(--warning); }
.toast.warning .toast-icon { color: var(--warning); }
.toast.info { border-color: var(--info); }
.toast.info .toast-icon { color: var(--info); }

/* Pagination */
.pagination { display: flex; justify-content: center; align-items: center; gap: 0.5rem; margin-top: 1.5rem; }
.page-btn {
    width: 36px; height: 36px; display: flex; align-items: center; justify-content: center;
    border: 1px solid var(--border-color); background-color: var(--surface-color); color: var(--text-dark);
    border-radius: 0.375rem; cursor: pointer; transition: all 0.2s;
}
.page-btn:hover:not(:disabled) { background-color: var(--bg-color); color: var(--accent); }
.page-btn.active { background-color: var(--primary); color: white; border-color: var(--primary); }
.page-btn:disabled { opacity: 0.5; cursor: not-allowed; }

/* Skeletons */
.skeleton { background: linear-gradient(90deg, var(--border-color) 25%, var(--bg-color) 50%, var(--border-color) 75%); background-size: 200% 100%; animation: skeletonLoading 1.5s infinite; border-radius: 0.25rem; }
.skeleton-text { height: 1rem; margin-bottom: 0.5rem; width: 100%; }
.skeleton-title { height: 1.5rem; margin-bottom: 1rem; width: 50%; }
.skeleton-avatar { width: 40px; height: 40px; border-radius: 50%; }

/* Empty State */
.empty-state { padding: 3rem 1.5rem; text-align: center; color: var(--text-gray); }
.empty-state i { font-size: 3rem; margin-bottom: 1rem; opacity: 0.5; }
.empty-state p { font-size: 1.125rem; margin-bottom: 1.5rem; }

/* File Upload */
.dropzone {
    border: 2px dashed var(--border-color); border-radius: 0.5rem; padding: 2rem; text-align: center;
    cursor: pointer; transition: all 0.2s; background-color: var(--bg-color);
}
.dropzone:hover, .dropzone.dragover { border-color: var(--accent); background-color: rgba(194, 154, 91, 0.05); }
.dropzone i { font-size: 2.5rem; color: var(--text-gray); margin-bottom: 1rem; }
.dropzone p { margin: 0; color: var(--text-dark); }
.dropzone-input { display: none; }

/* Login Page */
.login-page { display: flex; min-height: 100vh; align-items: center; justify-content: center; background-color: var(--bg-color); }
.login-card { width: 100%; max-width: 400px; padding: 2.5rem 2rem; text-align: center; }
.login-logo { margin-bottom: 2rem; }
.login-logo h1 { font-size: 2rem; color: var(--primary); letter-spacing: 2px; text-transform: uppercase; }
.dark .login-logo h1 { color: var(--accent); }

/* Animations */
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
@keyframes fadeOut { from { opacity: 1; } to { opacity: 0; } }
@keyframes skeletonLoading { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

/* Responsive */
@media (max-width: 1024px) {
    .stat-grid { grid-template-columns: repeat(2, 1fr); }
}

@media (max-width: 768px) {
    .sidebar { transform: translateX(-100%); }
    .sidebar.open { transform: translateX(0); }
    .main-content { margin-left: 0; }
    .menu-toggle, .close-sidebar { display: block; }
    .stat-grid { grid-template-columns: 1fr; }
    .filter-bar { flex-direction: column; align-items: stretch; }
    .modal { margin: 1rem; max-height: calc(100vh - 2rem); }
}
`;

const jsContent = `
const API_BASE = '/api/admin';

// Initialize Theme
function initTheme() {
    const isDark = localStorage.getItem('aataki_admin_theme') === 'dark';
    if (isDark) document.body.classList.add('dark');
}

function toggleTheme() {
    document.body.classList.toggle('dark');
    const isDark = document.body.classList.contains('dark');
    localStorage.setItem('aataki_admin_theme', isDark ? 'dark' : 'light');
}

// API Helper
async function api(method, endpoint, body = null) {
    const url = endpoint.startsWith('http') ? endpoint : `\${API_BASE}\${endpoint}`;
    const headers = {
        'Accept': 'application/json'
    };
    
    if (body && !(body instanceof FormData)) {
        headers['Content-Type'] = 'application/json';
        body = JSON.stringify(body);
    }

    try {
        const response = await fetch(url, { method, headers, body });
        
        if (response.status === 401) {
            window.location.href = '/admin/login.html';
            return null;
        }

        const data = await response.json().catch(() => ({}));
        
        if (!response.ok) {
            throw new Error(data.message || `HTTP Error: \${response.status}`);
        }
        
        return data;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

// Auth Check
async function checkAuth() {
    if (window.location.pathname.endsWith('login.html')) return;
    try {
        const user = await api('GET', '/me');
        if (user) {
            const nameEl = document.getElementById('admin-name');
            if (nameEl) nameEl.textContent = user.name || 'Admin';
        }
    } catch (e) {
        window.location.href = '/admin/login.html';
    }
}

async function logout() {
    try {
        await api('POST', '/logout');
    } catch (e) {}
    window.location.href = '/admin/login.html';
}

// Sidebar Setup
function initSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (!sidebar) return;

    const navItems = [
        { path: 'index.html', icon: 'fa-home', label: 'Dashboard' },
        { path: 'orders.html', icon: 'fa-shopping-cart', label: 'Orders' },
        { path: 'products.html', icon: 'fa-box', label: 'Products' },
        { path: 'categories.html', icon: 'fa-tags', label: 'Categories' },
        { path: 'inventory.html', icon: 'fa-warehouse', label: 'Inventory' },
        { path: 'customers.html', icon: 'fa-users', label: 'Customers' },
        { path: 'offers.html', icon: 'fa-ticket-alt', label: 'Offers' },
        { path: 'monthly-posts.html', icon: 'fa-newspaper', label: 'Monthly Posts' },
        { path: 'notifications.html', icon: 'fa-bell', label: 'Notifications' },
        { path: 'excel.html', icon: 'fa-file-excel', label: 'Excel Import/Export' },
        { path: 'reports.html', icon: 'fa-chart-bar', label: 'Reports' },
        { path: 'administrators.html', icon: 'fa-user-shield', label: 'Administrators' },
        { path: 'activity-logs.html', icon: 'fa-history', label: 'Activity Logs' },
        { path: 'settings.html', icon: 'fa-cog', label: 'Settings' }
    ];

    const currentPath = window.location.pathname.split('/').pop() || 'index.html';
    
    let navHTML = '<nav class="sidebar-nav">';
    navItems.forEach(item => {
        const isActive = currentPath === item.path ? 'active' : '';
        navHTML += `
            <a href="/admin/\${item.path}" class="nav-item \${isActive}">
                <i class="fas \${item.icon}"></i> \${item.label}
            </a>
        `;
    });
    navHTML += '</nav>';
    
    // Inject nav
    const header = sidebar.querySelector('.sidebar-header');
    if(header) {
        header.insertAdjacentHTML('afterend', navHTML);
    }
}

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) sidebar.classList.toggle('open');
}

// Toasts
function showToast(message, type = 'info', duration = 3000) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const icons = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        warning: 'fa-exclamation-triangle',
        info: 'fa-info-circle'
    };
    
    const titles = { success: 'Success', error: 'Error', warning: 'Warning', info: 'Info' };

    const toast = document.createElement('div');
    toast.className = `toast \${type}`;
    toast.innerHTML = `
        <i class="fas \${icons[type]} toast-icon"></i>
        <div class="toast-content">
            <div class="toast-title">\${titles[type]}</div>
            <div class="toast-message">\${message}</div>
        </div>
        <button class="toast-close" onclick="this.parentElement.remove()"><i class="fas fa-times"></i></button>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('hiding');
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

// Modals
function openModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.add('active');
}

function closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.remove('active');
}

function confirmDialog(title, message, onConfirm) {
    const id = 'dynamic-confirm-modal';
    let modal = document.getElementById(id);
    
    if (!modal) {
        const html = `
            <div id="\${id}" class="modal-overlay">
                <div class="modal">
                    <div class="modal-header">
                        <h3 class="modal-title" id="\${id}-title"></h3>
                        <button class="modal-close" onclick="closeModal('\${id}')"><i class="fas fa-times"></i></button>
                    </div>
                    <div class="modal-body" id="\${id}-message"></div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" onclick="closeModal('\${id}')">Cancel</button>
                        <button class="btn btn-danger" id="\${id}-confirm">Confirm</button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', html);
        modal = document.getElementById(id);
    }
    
    document.getElementById(`\${id}-title`).textContent = title;
    document.getElementById(`\${id}-message`).textContent = message;
    
    const confirmBtn = document.getElementById(`\${id}-confirm`);
    confirmBtn.onclick = () => {
        onConfirm();
        closeModal(id);
    };
    
    openModal(id);
}

// Formatting
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount || 0);
}

function formatDate(dateStr) {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-IN');
}

function formatDateTime(dateStr) {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleString('en-IN');
}

// Pagination
function renderPagination(containerId, currentPage, totalPages, onPageChange) {
    const container = document.getElementById(containerId);
    if (!container || totalPages <= 1) {
        if(container) container.innerHTML = '';
        return;
    }

    let html = '<div class="pagination">';
    html += `<button class="page-btn" \${currentPage === 1 ? 'disabled' : ''} onclick="\${onPageChange.name}(1)"><i class="fas fa-angle-double-left"></i></button>`;
    html += `<button class="page-btn" \${currentPage === 1 ? 'disabled' : ''} onclick="\${onPageChange.name}(\${currentPage - 1})"><i class="fas fa-angle-left"></i></button>`;
    
    // Simple pagination logic for demo
    for(let i=1; i<=totalPages; i++) {
        if(i === 1 || i === totalPages || (i >= currentPage - 2 && i <= currentPage + 2)) {
            html += `<button class="page-btn \${i === currentPage ? 'active' : ''}" onclick="\${onPageChange.name}(\${i})">\${i}</button>`;
        } else if (i === currentPage - 3 || i === currentPage + 3) {
            html += `<span style="padding: 0 0.5rem">...</span>`;
        }
    }

    html += `<button class="page-btn" \${currentPage === totalPages ? 'disabled' : ''} onclick="\${onPageChange.name}(\${currentPage + 1})"><i class="fas fa-angle-right"></i></button>`;
    html += `<button class="page-btn" \${currentPage === totalPages ? 'disabled' : ''} onclick="\${onPageChange.name}(\${totalPages})"><i class="fas fa-angle-double-right"></i></button>`;
    html += '</div>';
    
    container.innerHTML = html;
}

// Tables
function renderLoading(cols) {
    return `<tr><td colspan="\${cols}"><div class="skeleton skeleton-text"></div><div class="skeleton skeleton-text"></div></td></tr>`;
}

function renderEmptyState(cols, message) {
    return `<tr><td colspan="\${cols}"><div class="empty-state"><i class="fas fa-folder-open"></i><p>\${message}</p></div></td></tr>`;
}

// Setup
function initAdmin() {
    initTheme();
    checkAuth();
    initSidebar();
}

// Auto init if not login page
if (!window.location.pathname.endsWith('login.html')) {
    document.addEventListener('DOMContentLoaded', initAdmin);
}
`;

const pages = [
    { name: 'index', title: 'Dashboard', js: 'dashboard' },
    { name: 'products', title: 'Products', js: 'products' },
    { name: 'categories', title: 'Categories', js: 'categories' },
    { name: 'orders', title: 'Orders', js: 'orders' },
    { name: 'order-detail', title: 'Order Details', js: 'order-detail' },
    { name: 'customers', title: 'Customers', js: 'customers' },
    { name: 'customer-detail', title: 'Customer Details', js: 'customer-detail' },
    { name: 'offers', title: 'Offers', js: 'offers' },
    { name: 'monthly-posts', title: 'Monthly Posts', js: 'monthly-posts' },
    { name: 'notifications', title: 'Notifications', js: 'notifications' },
    { name: 'inventory', title: 'Inventory', js: 'inventory' },
    { name: 'excel', title: 'Excel Import/Export', js: 'excel' },
    { name: 'reports', title: 'Reports', js: 'reports' },
    { name: 'administrators', title: 'Administrators', js: 'administrators' },
    { name: 'activity-logs', title: 'Activity Logs', js: 'activity-logs' },
    { name: 'settings', title: 'Settings', js: 'settings' }
];

const loginHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Login | Aataki Admin</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Playfair+Display:wght@600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="/admin/css/admin.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
</head>
<body class="login-page">
    <div class="card login-card">
        <div class="login-logo">
            <h1>Aataki</h1>
            <p style="color: var(--text-gray); margin-top: 0.5rem">Admin Management System</p>
        </div>
        <form id="loginForm" onsubmit="handleLogin(event)">
            <div class="form-group" style="text-align: left;">
                <label for="email">Email Address</label>
                <input type="email" id="email" class="form-control" required placeholder="admin@aataki.com">
            </div>
            <div class="form-group" style="text-align: left;">
                <label for="password">Password</label>
                <input type="password" id="password" class="form-control" required placeholder="Enter your password">
            </div>
            <button type="submit" class="btn btn-primary" style="width: 100%; padding: 0.75rem; margin-top: 1rem; font-size: 1rem;">
                Sign In
            </button>
        </form>
    </div>
    <div id="toast-container" class="toast-container"></div>
    <script src="/admin/js/admin.js"></script>
    <script>
        initTheme();
        async function handleLogin(e) {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const btn = e.target.querySelector('button');
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Signing in...';
            btn.disabled = true;
            
            try {
                await api('POST', '/login', { email, password });
                window.location.href = '/admin/index.html';
            } catch (err) {
                showToast(err.message || 'Login failed', 'error');
                btn.innerHTML = 'Sign In';
                btn.disabled = false;
            }
        }
    </script>
</body>
</html>`;

function generatePageHtml(page) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>\${page.title} | Aataki Admin</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Playfair+Display:wght@600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="/admin/css/admin.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    \${page.name === 'index' ? '<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>' : ''}
</head>
<body>
    <div class="admin-layout">
        <aside class="sidebar" id="sidebar">
            <div class="sidebar-header">
                <h2>Aataki</h2>
                <button class="close-sidebar" onclick="toggleSidebar()"><i class="fas fa-times"></i></button>
            </div>
            <!-- Nav injected by admin.js -->
        </aside>
        
        <div class="main-content">
            <header class="topbar">
                <div class="topbar-left">
                    <button class="menu-toggle" onclick="toggleSidebar()"><i class="fas fa-bars"></i></button>
                    <div class="breadcrumbs" id="breadcrumbs">
                        <span style="color: var(--text-gray);">Admin / </span>
                        <strong style="color: var(--text-dark);">\${page.title}</strong>
                    </div>
                </div>
                <div class="topbar-right">
                    <button onclick="toggleTheme()" class="icon-btn theme-toggle"><i class="fas fa-moon"></i></button>
                    <div class="admin-profile">
                        <span id="admin-name">Loading...</span>
                        <button onclick="logout()" class="icon-btn"><i class="fas fa-sign-out-alt"></i></button>
                    </div>
                </div>
            </header>
            
            <main class="page-content">
                <div class="page-header">
                    <h1 class="page-title">\${page.title}</h1>
                    <div id="header-actions"></div>
                </div>
                <div id="page-container">
                    <!-- Content populated by page JS -->
                    <div class="card"><div class="skeleton skeleton-text" style="height: 200px"></div></div>
                </div>
            </main>
        </div>
    </div>

    <div id="toast-container" class="toast-container"></div>
    
    <script src="/admin/js/admin.js"></script>
    <script src="/admin/js/pages/\${page.js}.js"></script>
</body>
</html>`;
}

function generatePageJs(page) {
    return `// Page: \${page.title}
document.addEventListener('DOMContentLoaded', () => {
    loadData();
});

async function loadData(page = 1) {
    const container = document.getElementById('page-container');
    
    try {
        // Fetch data
        // const data = await api('GET', '/\${page.name === 'index' ? 'dashboard' : page.name}?page=' + page);
        
        container.innerHTML = `<div class="card">
            <h3>\${page.title} Content</h3>
            <p>Ready to integrate with real API endpoints.</p>
            <div class="table-responsive">
                <table>
                    <thead>
                        <tr><th>ID</th><th>Name</th><th>Status</th><th>Actions</th></tr>
                    </thead>
                    <tbody id="table-body">
                        \${renderEmptyState(4, 'No records found.')}
                    </tbody>
                </table>
            </div>
        </div>`;
        
    } catch (error) {
        showToast(error.message, 'error');
        container.innerHTML = `<div class="card"><p class="text-danger">Failed to load data.</p></div>`;
    }
}
`;
}

// Specific Dashboard JS override for Chart.js example
const dashboardJs = `
document.addEventListener('DOMContentLoaded', () => {
    loadDashboard();
});

async function loadDashboard() {
    const container = document.getElementById('page-container');
    
    try {
        container.innerHTML = `
            <div class="stat-grid">
                <div class="card stat-card"><div class="stat-icon"><i class="fas fa-rupee-sign"></i></div><div class="stat-details"><h3>Total Revenue</h3><p id="stat-revenue">...</p></div></div>
                <div class="card stat-card"><div class="stat-icon"><i class="fas fa-shopping-cart"></i></div><div class="stat-details"><h3>Total Orders</h3><p id="stat-orders">...</p></div></div>
                <div class="card stat-card"><div class="stat-icon"><i class="fas fa-users"></i></div><div class="stat-details"><h3>Total Customers</h3><p id="stat-customers">...</p></div></div>
                <div class="card stat-card"><div class="stat-icon"><i class="fas fa-box"></i></div><div class="stat-details"><h3>Total Products</h3><p id="stat-products">...</p></div></div>
            </div>
            <div class="card">
                <h3>Sales Overview</h3>
                <canvas id="salesChart" height="100"></canvas>
            </div>
        `;
        
        // Mock data fetch
        // const data = await api('GET', '/dashboard');
        
        document.getElementById('stat-revenue').textContent = formatCurrency(125000);
        document.getElementById('stat-orders').textContent = '1,254';
        document.getElementById('stat-customers').textContent = '842';
        document.getElementById('stat-products').textContent = '156';
        
        const ctx = document.getElementById('salesChart').getContext('2d');
        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
                datasets: [{
                    label: 'Revenue',
                    data: [12000, 19000, 3000, 5000, 20000, 30000],
                    backgroundColor: '#223c2a'
                }]
            }
        });
        
    } catch (error) {
        showToast('Failed to load dashboard', 'error');
    }
}
`;

// Write core files
fs.writeFileSync(path.join(adminDir, 'css', 'admin.css'), cssContent);
fs.writeFileSync(path.join(adminDir, 'js', 'admin.js'), jsContent);
fs.writeFileSync(path.join(adminDir, 'login.html'), loginHtml);

// Write page files
pages.forEach(p => {
    fs.writeFileSync(path.join(adminDir, `\${p.name}.html`), generatePageHtml(p));
    let js = generatePageJs(p);
    if (p.name === 'index') js = dashboardJs;
    fs.writeFileSync(path.join(adminDir, 'js', 'pages', `\${p.js}.js`), js);
});

console.log('Admin frontend generated successfully.');
