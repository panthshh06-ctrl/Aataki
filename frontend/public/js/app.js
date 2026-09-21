
let products = [];

let cart = [];
let cartTotalAmount = 0;

// === CURSOR ANIMATION LOGIC ===
let lastWheatTime = 0;
const WHEAT_SPAWN_RATE = 70; // Generate a wheat grain every 70ms while moving cursor

document.addEventListener('mousemove', (e) => {
    const now = Date.now();
    if (now - lastWheatTime > WHEAT_SPAWN_RATE) {
        createWheatTrail(e.pageX, e.pageY);
        lastWheatTime = now;
    }
});

function createWheatTrail(x, y) {
    const wheat = document.createElement('div');
    wheat.classList.add('wheat-trail');
    
    // Position exactly at cursor
    wheat.style.left = `${x}px`;
    wheat.style.top = `${y}px`;
    
    // Add a randomized initial rotation via CSS variable for variety
    const randomRotation = Math.floor(Math.random() * 360);
    wheat.style.setProperty('--rot', `${randomRotation}deg`);
    
    document.body.appendChild(wheat);

    // Remove the element from DOM after animation completes (1.2 seconds)
    setTimeout(() => {
        wheat.remove();
    }, 1200);
}
// ==============================

function renderProducts() {
    const productList = document.getElementById('product-list');
    productList.innerHTML = '';
    products.forEach(product => {
        let badgeHtml = product.badge ? `<div class="badge">${product.badge}</div>` : '';
        let oldPriceHtml = product.oldPrice ? `<span class="price-old">&#8377;${product.oldPrice}</span>` : '';
        
        productList.innerHTML += `
            <div class="card">
                <div class="card-img-container">
                    ${badgeHtml}
                    <img src="${product.image}" alt="${product.name}" class="product-image">
                </div>
                <div class="card-content">
                    <h3>${product.name}</h3>
                    <p>${product.description || ''}</p>
                    <div class="price-block">
                        <span class="price-current">&#8377;${product.price}</span>
                        <span class="price-unit">/ kg</span>
                        ${oldPriceHtml}
                    </div>
                    <div class="product-actions">
                        <button class="add-btn" data-action="add-to-cart" data-product-id="${product.id}" type="button">Add to Order</button>
                        <button class="buy-btn" data-action="buy-now" data-product-id="${product.id}" type="button">Buy Now</button>
                    </div>
                </div>
            </div>
        `;
    });
}

async function loadProducts() {
    const productList = document.getElementById('product-list');
    try {
        const response = await fetch('/api/products');
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || 'Products could not be loaded');
        products = (payload.data || []).map(product => ({
            ...product,
            desc: product.description,
            oldPrice: product.original_price,
            image: product.image_url || 'assets/image_68e37c.jpg',
            badge: product.discount > 0 ? `${product.discount}% OFF` : ''
        }));
        renderProducts();
    } catch (error) {
        productList.innerHTML = `<p class="empty-cart">${error.message}</p>`;
        console.error(error);
    }
}

function addToCart(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    const existingItem = cart.find(item => item.id === productId);
    if (existingItem) existingItem.qty += 1;
    else cart.push({ ...product, qty: 1 });
    updateCartUI();
    const sidebar = document.getElementById('checkout-sidebar');
    if(!sidebar.classList.contains('active')) toggleCheckout(true);
}

function changeQty(productId, amount) {
    const item = cart.find(item => item.id === productId);
    if (item) {
        item.qty += amount;
        if (item.qty <= 0) removeItem(productId);
        else updateCartUI();
    }
}

function removeItem(productId) {
    cart = cart.filter(item => item.id !== productId);
    updateCartUI();
}

function updateCartUI() {
    const cartItemsContainer = document.getElementById('cart-items');
    const cartTotal = document.getElementById('cart-total');
    const cartCount = document.getElementById('cart-count');
    const checkoutBtn = document.getElementById('checkout-btn');
    const payAmountBtn = document.getElementById('pay-amount');

    cartItemsContainer.innerHTML = '';
    cartTotalAmount = 0; 
    let totalItems = 0;

    if (cart.length === 0) {
        cartItemsContainer.innerHTML = '<p class="empty-cart">Your cart is empty.</p>';
        checkoutBtn.disabled = true;
        checkoutBtn.innerText = "Proceed to Payment";
    } else {
        checkoutBtn.disabled = false;
        cart.forEach(item => {
            let itemTotal = item.price * item.qty;
            cartTotalAmount += itemTotal; 
            totalItems += item.qty;
            cartItemsContainer.innerHTML += `
                <div class="cart-item">
                    <div class="item-info">
                        <h4>${item.name}</h4>
                        <span class="item-price">&#8377;${itemTotal}</span> <span style="color:#6b7280; font-size:13px;">(&#8377;${item.price}/kg)</span>
                    </div>
                    <div class="modification-controls">
                        <div class="qty-controls">
                            <button class="qty-btn" data-action="change-qty" data-product-id="${item.id}" data-amount="-1" type="button">-</button>
                            <span>${item.qty} kg</span>
                            <button class="qty-btn" data-action="change-qty" data-product-id="${item.id}" data-amount="1" type="button">+</button>
                        </div>
                        <button class="remove-btn" data-action="remove-item" data-product-id="${item.id}" type="button">Remove</button>
                    </div>
                </div>
            `;
        });
        checkoutBtn.innerHTML = `Proceed to Payment (&#8377;${cartTotalAmount})`;
    }
    cartTotal.innerHTML = `&#8377;${cartTotalAmount}`;
    cartCount.innerText = totalItems;
    payAmountBtn.innerHTML = `&#8377;${cartTotalAmount}`;
}

function toggleCheckout(forceOpen = false) {
    closeAllModals(); 
    const sidebar = document.getElementById('checkout-sidebar');
    const backdrop = document.getElementById('backdrop');
    if (forceOpen === true) {
        sidebar.classList.add('active'); backdrop.classList.add('active');
    } else {
        sidebar.classList.toggle('active'); 
        if (sidebar.classList.contains('active')) backdrop.classList.add('active');
        else backdrop.classList.remove('active');
    }
}

function openPaymentModal() {
    if (cart.length === 0) return;
    document.getElementById('checkout-sidebar').classList.remove('active');
    document.getElementById('backdrop').classList.add('active');
    document.getElementById('payment-modal').classList.add('active');
}

function closeAllModals() {
    document.getElementById('backdrop').classList.remove('active');
    document.getElementById('checkout-sidebar').classList.remove('active');
    document.getElementById('payment-modal').classList.remove('active');
    document.getElementById('success-modal').classList.remove('active');
}

function submitPayment(e) {
    e.preventDefault(); 
    const btn = document.getElementById('pay-btn');
    btn.innerText = "Processing Payment...";
    btn.classList.add('processing');

    const orderData = {
        customer: {
            name: document.getElementById('cust-name').value,
            phone: document.getElementById('cust-phone').value,
            email: document.getElementById('cust-email').value,
            address: document.getElementById('cust-address').value
        },
        items: cart,
        totalAmount: cartTotalAmount
    };

    setTimeout(() => {
        fetch('/api/order', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(orderData) })
        .then(res => res.json())
        .then(data => {
            if(data.success) {
                document.getElementById('payment-modal').classList.remove('active');
                document.getElementById('success-modal').classList.add('active');
                document.getElementById('display-order-id').innerText = data.orderId;
                cart = [];
                updateCartUI();
                document.getElementById('payment-form').reset();
            }
        })
        .catch(err => {
            console.error(err);
            alert("Payment failed. Please try again.");
        })
        .finally(() => {
            btn.innerHTML = `Pay <span id="pay-amount">&#8377;${cartTotalAmount}</span>`;
            btn.classList.remove('processing');
        });
    }, 2000); 
}

document.addEventListener('click', event => {
    const actionElement = event.target.closest('[data-action]');
    if (actionElement) {
        const productId = Number(actionElement.dataset.productId);
        if (actionElement.dataset.action === 'add-to-cart') addToCart(productId);
        if (actionElement.dataset.action === 'buy-now') { addToCart(productId); openPaymentModal(); }
        if (actionElement.dataset.action === 'change-qty') changeQty(productId, Number(actionElement.dataset.amount));
        if (actionElement.dataset.action === 'remove-item') removeItem(productId);
    }
});

document.getElementById('cart-open-button').addEventListener('click', () => toggleCheckout());
document.getElementById('cart-close-button').addEventListener('click', () => toggleCheckout());
document.getElementById('checkout-btn').addEventListener('click', openPaymentModal);
document.getElementById('backdrop').addEventListener('click', closeAllModals);
document.getElementById('payment-close-button').addEventListener('click', closeAllModals);
document.getElementById('success-close-button').addEventListener('click', closeAllModals);
document.getElementById('payment-form').addEventListener('submit', submitPayment);
document.getElementById('contact-form').addEventListener('submit', async event => {
    event.preventDefault();
    const form = event.currentTarget;
    const button = form.querySelector('button[type="submit"]');
    const status = document.getElementById('contact-status');
    button.disabled = true;
    status.textContent = 'Sending...';
    try {
        const response = await fetch('/api/contact', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: document.getElementById('contact-name').value,
                email: document.getElementById('contact-email').value,
                phone: document.getElementById('contact-phone').value,
                message: document.getElementById('contact-message').value
            })
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Could not send message');
        status.textContent = result.message;
        form.reset();
    } catch (error) {
        status.textContent = error.message;
    } finally {
        button.disabled = false;
    }
});

document.querySelectorAll('.faq-question').forEach(question => {
    question.addEventListener('click', () => {
        const item = question.closest('.faq-item');
        const expanded = question.getAttribute('aria-expanded') === 'true';
        document.querySelectorAll('.faq-question').forEach(other => {
            other.setAttribute('aria-expanded', 'false');
            other.closest('.faq-item').classList.remove('open');
        });
        if (!expanded) {
            question.setAttribute('aria-expanded', 'true');
            item.classList.add('open');
        }
    });
});

updateCartUI();
loadProducts();
