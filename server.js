
const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.post('/api/order', (req, res) => {
    const { customer, items, totalAmount } = req.body;
    const orderId = `ORD-${Math.floor(Math.random() * 1000000)}`;
    
    console.log('\n====================================');
    console.log(`💳 PAYMENT RECEIVED & ORDER PLACED`);
    console.log(`====================================`);
    console.log(`Order ID: ${orderId}`);
    console.log(`Total Paid: ₹${totalAmount}`);
    console.log(`\n--- Customer Details ---`);
    console.log(`Name:    ${customer.name}`);
    console.log(`Phone:   ${customer.phone}`);
    console.log(`Address: ${customer.address}`);
    console.log(`\n--- Order Items ---`);
    items.forEach(item => {
        console.log(`- ${item.name} (${item.qty}kg) = ₹${item.price * item.qty}`);
    });
    console.log('====================================\n');

    res.status(200).json({ success: true, orderId: orderId, message: 'Payment processed successfully' });
});

app.listen(PORT, () => console.log(`Server running smoothly on http://localhost:${PORT}`));
