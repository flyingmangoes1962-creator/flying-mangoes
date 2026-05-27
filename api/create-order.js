const Razorpay = require('razorpay');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { amount, currency = 'INR', receipt, product_name } = req.body;
    if (!amount || amount < 100) return res.status(400).json({ error: 'Amount must be at least 100 paise' });

    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

    const order = await razorpay.orders.create({
      amount: Math.round(amount),
      currency,
      receipt: receipt || `receipt_${Date.now()}`,
      notes: { product: product_name || 'Flying Mangoes' },
    });

    return res.json({ order_id: order.id, amount: order.amount, currency: order.currency, key_id: process.env.RAZORPAY_KEY_ID });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to create order', details: err.message });
  }
};
