try { require('dotenv').config(); } catch(e) {}

const express = require('express');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

app.post('/api/create-order', async (req, res) => {
  try {
    const { amount, currency = 'INR', receipt, product_name } = req.body;
    if (!amount || amount < 100) return res.status(400).json({ error: 'Amount must be at least 100 paise' });
    const order = await razorpay.orders.create({
      amount: Math.round(amount), currency,
      receipt: receipt || `receipt_${Date.now()}`,
      notes: { product: product_name || 'Flying Mangoes' },
    });
    return res.json({ order_id: order.id, amount: order.amount, currency: order.currency, key_id: process.env.RAZORPAY_KEY_ID });
  } catch (err) {
    console.error('Create order error:', err);
    return res.status(500).json({ error: 'Failed to create order', details: err.message });
  }
});

app.post('/api/verify-payment', (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, product_name, amount, customer_phone } = req.body;
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature)
      return res.status(400).json({ error: 'Missing required fields' });

    const generated = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (generated !== razorpay_signature)
      return res.status(400).json({ error: 'Signature mismatch' });

    const ownerPhone = process.env.OWNER_WHATSAPP || '919999999999';
    const msg = encodeURIComponent(
      `🥭 *New Flying Mangoes Order!*\n\n*Product:* ${product_name}\n*Amount:* ₹${(amount/100).toLocaleString('en-IN')}\n*Payment ID:* ${razorpay_payment_id}\n*Order ID:* ${razorpay_order_id}\n${customer_phone ? `*Customer:* ${customer_phone}\n` : ''}\n✅ Payment verified & confirmed.`
    );
    return res.json({ success: true, payment_id: razorpay_payment_id, whatsapp_url: `https://wa.me/${ownerPhone}?text=${msg}` });
  } catch (err) {
    return res.status(500).json({ error: 'Verification failed', details: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🥭 Flying Mangoes running on port ${PORT}`));
