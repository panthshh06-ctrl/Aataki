let salesChartInstance = null;

document.addEventListener('DOMContentLoaded', () => {
    loadDashboardData();
});

async function loadDashboardData() {
    const period = document.getElementById('period-selector').value;
    
    // Skeletons
    document.getElementById('recent-orders-body').innerHTML = renderLoading(4);
    document.getElementById('low-stock-body').innerHTML = renderLoading(4);
    
    try {
        const data = await api('GET', `/dashboard/all?period=${period}`);
        
        // Populate stats
        document.getElementById('stat-revenue').textContent = formatCurrency(data.stats.revenue);
        document.getElementById('stat-orders').textContent = data.stats.orders;
        document.getElementById('stat-customers').textContent = data.stats.customers;
        document.getElementById('stat-products').textContent = data.stats.products;
        document.getElementById('stat-offers').textContent = data.stats.activeOffers;
        document.getElementById('stat-low-stock').textContent = data.stats.lowStock;
        
        renderChart(data.chart);
        renderRecentOrders(data.recentOrders);
        renderLowStock(data.lowStockProducts);
        
    } catch (error) {
        showToast('Failed to load dashboard data', 'error');
        document.getElementById('recent-orders-body').innerHTML = renderEmptyState(4, 'Failed to load');
        document.getElementById('low-stock-body').innerHTML = renderEmptyState(4, 'Failed to load');
    }
}

function renderChart(chartData) {
    const ctx = document.getElementById('salesChart').getContext('2d');
    
    if (salesChartInstance) {
        salesChartInstance.destroy();
    }
    
    salesChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: chartData.labels,
            datasets: [{
                label: 'Revenue (₹)',
                data: chartData.values,
                backgroundColor: '#223c2a',
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: { beginAtZero: true }
            }
        }
    });
}

function renderRecentOrders(orders) {
    const tbody = document.getElementById('recent-orders-body');
    if (!orders || orders.length === 0) {
        tbody.innerHTML = renderEmptyState(4, 'No recent orders.');
        return;
    }
    
    tbody.innerHTML = orders.map(o => `
        <tr>
            <td>#${o.id}</td>
            <td>${o.customerName || 'Guest'}</td>
            <td>${formatCurrency(o.total)}</td>
            <td><span class="badge badge-info">${o.status}</span></td>
        </tr>
    `).join('');
}

function renderLowStock(products) {
    const tbody = document.getElementById('low-stock-body');
    if (!products || products.length === 0) {
        tbody.innerHTML = renderEmptyState(4, 'No low stock products.');
        return;
    }
    
    tbody.innerHTML = products.map(p => `
        <tr>
            <td>${p.name}</td>
            <td>${p.sku || 'N/A'}</td>
            <td style="color: var(--danger); font-weight: bold;">${p.stock}</td>
            <td><a href="/admin/inventory.html" class="btn btn-secondary btn-sm">Update</a></td>
        </tr>
    `).join('');
}
