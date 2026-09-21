const API_BASE = '/api/admin';

function initTheme() {
    const isDark = localStorage.getItem('aataki_admin_theme') === 'dark';
    if (isDark) document.body.classList.add('dark');
}

function toggleTheme() {
    document.body.classList.toggle('dark');
    const isDark = document.body.classList.contains('dark');
    localStorage.setItem('aataki_admin_theme', isDark ? 'dark' : 'light');
}

async function api(method, endpoint, body = null) {
    const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`;
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
            throw new Error(data.error || data.message || `HTTP Error: ${response.status}`);
        }
        
        return data;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

async function checkAuth() {
    if (window.location.pathname.endsWith('login.html')) return;
    try {
        const user = await api('GET', '/me');
        if (user) {
            const nameEl = document.getElementById('admin-name');
            if (nameEl) nameEl.textContent = user.data?.name || user.name || 'Admin';
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

function initSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (!sidebar) return;

    const navItems = [
        { path: 'index.html', icon: 'fa-home', label: 'Dashboard' },
        { path: 'products.html', icon: 'fa-box', label: 'Products' },
        { path: 'categories.html', icon: 'fa-tags', label: 'Categories' },
        { path: 'orders.html', icon: 'fa-shopping-cart', label: 'Orders' },
        { path: 'customers.html', icon: 'fa-users', label: 'Customers' },
        { path: 'offers.html', icon: 'fa-ticket-alt', label: 'Offers' },
        { path: 'monthly-posts.html', icon: 'fa-newspaper', label: 'Monthly Posts' },
        { path: 'notifications.html', icon: 'fa-bell', label: 'Notifications' },
        { path: 'messages.html', icon: 'fa-envelope', label: 'Messages' },
        { path: 'inventory.html', icon: 'fa-warehouse', label: 'Inventory' },
        { path: 'excel.html', icon: 'fa-file-excel', label: 'Excel Import/Export' },
        { path: 'reports.html', icon: 'fa-chart-bar', label: 'Reports' },
        { path: 'administrators.html', icon: 'fa-user-shield', label: 'Administrators' },
        { path: 'settings.html', icon: 'fa-cog', label: 'Settings' },
        { path: 'activity-logs.html', icon: 'fa-history', label: 'Activity Logs' }
    ];

    const currentPath = window.location.pathname.split('/').pop() || 'index.html';
    
    let navHTML = '<nav class="sidebar-nav">';
    navItems.forEach(item => {
        const isActive = currentPath === item.path ? 'active' : '';
        navHTML += `
            <a href="/admin/${item.path}" class="nav-item ${isActive}">
                <i class="fas ${item.icon}"></i> ${item.label}
            </a>
        `;
    });
    navHTML += '</nav>';
    
    const header = sidebar.querySelector('.sidebar-header');
    if(header) header.insertAdjacentHTML('afterend', navHTML);
}

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) sidebar.classList.toggle('open');
}

function showToast(message, type = 'info', duration = 3000) {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    const icons = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        warning: 'fa-exclamation-triangle',
        info: 'fa-info-circle'
    };
    
    const titles = { success: 'Success', error: 'Error', warning: 'Warning', info: 'Info' };

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <i class="fas ${icons[type]} toast-icon"></i>
        <div class="toast-content">
            <div class="toast-title">${titles[type]}</div>
            <div class="toast-message">${message}</div>
        </div>
        <button class="toast-close" onclick="this.parentElement.remove()"><i class="fas fa-times"></i></button>
    `;

    container.appendChild(toast);
    setTimeout(() => {
        toast.classList.add('hiding');
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

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
            <div id="${id}" class="modal-overlay">
                <div class="modal">
                    <div class="modal-header">
                        <h3 class="modal-title" id="${id}-title"></h3>
                        <button class="modal-close" onclick="closeModal('${id}')"><i class="fas fa-times"></i></button>
                    </div>
                    <div class="modal-body" id="${id}-message"></div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" onclick="closeModal('${id}')">Cancel</button>
                        <button class="btn btn-danger" id="${id}-confirm">Confirm</button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', html);
        modal = document.getElementById(id);
    }
    
    document.getElementById(`${id}-title`).textContent = title;
    document.getElementById(`${id}-message`).textContent = message;
    
    const confirmBtn = document.getElementById(`${id}-confirm`);
    confirmBtn.onclick = () => {
        onConfirm();
        closeModal(id);
    };
    
    openModal(id);
}

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

function timeAgo(dateStr) {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    const seconds = Math.floor((new Date() - date) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + " years ago";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + " months ago";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + " days ago";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + " hours ago";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + " minutes ago";
    return Math.floor(seconds) + " seconds ago";
}

function renderPagination(containerId, currentPage, totalPages, onPageChangeName) {
    const container = document.getElementById(containerId);
    if (!container || totalPages <= 1) {
        if(container) container.innerHTML = '';
        return;
    }

    let html = '<div class="pagination">';
    html += `<button class="page-btn" ${currentPage === 1 ? 'disabled' : ''} onclick="${onPageChangeName}(1)"><i class="fas fa-angle-double-left"></i></button>`;
    html += `<button class="page-btn" ${currentPage === 1 ? 'disabled' : ''} onclick="${onPageChangeName}(${currentPage - 1})"><i class="fas fa-angle-left"></i></button>`;
    
    for(let i=1; i<=totalPages; i++) {
        if(i === 1 || i === totalPages || (i >= currentPage - 2 && i <= currentPage + 2)) {
            html += `<button class="page-btn ${i === currentPage ? 'active' : ''}" onclick="${onPageChangeName}(${i})">${i}</button>`;
        } else if (i === currentPage - 3 || i === currentPage + 3) {
            html += `<span style="padding: 0 0.5rem">...</span>`;
        }
    }

    html += `<button class="page-btn" ${currentPage === totalPages ? 'disabled' : ''} onclick="${onPageChangeName}(${currentPage + 1})"><i class="fas fa-angle-right"></i></button>`;
    html += `<button class="page-btn" ${currentPage === totalPages ? 'disabled' : ''} onclick="${onPageChangeName}(${totalPages})"><i class="fas fa-angle-double-right"></i></button>`;
    html += '</div>';
    
    container.innerHTML = html;
}

function renderLoading(cols) {
    return `<tr><td colspan="${cols}"><div class="skeleton skeleton-text"></div><div class="skeleton skeleton-text"></div></td></tr>`;
}

function renderEmptyState(cols, message) {
    return `<tr><td colspan="${cols}"><div class="empty-state"><i class="fas fa-folder-open"></i><p>${message}</p></div></td></tr>`;
}

function initAdmin() {
    initTheme();
    checkAuth();
    initSidebar();
}

if (!window.location.pathname.endsWith('login.html')) {
    document.addEventListener('DOMContentLoaded', initAdmin);
}
