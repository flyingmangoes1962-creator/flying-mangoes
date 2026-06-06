const Razorpay = require('razorpay');

// Max order value: ₹5,000 (500000 paise)
const MAX_AMOUNT_PAISE = 500000;

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Check env vars first — return JSON error instead of crashing
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    console.error('[create-order] Missing RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET');
    return res.status(500).json({ error: 'Payment service not configured. Please contact support.' });
  }

  try {
    const { amount, currency = 'INR', receipt, product_name } = req.body;

    // Validate amount
    const amt = Math.round(Number(amount));
    if (!amt || amt < 100) {
      return res.status(400).json({ error: 'Amount must be at least ₹1 (100 paise)' });
    }
    if (amt > MAX_AMOUNT_PAISE) {
      return res.status(400).json({ error: 'Amount exceeds maximum allowed value' });
    }

    // Instantiate inside handler so errors are caught by try/catch below
    const razorpay = new Razorpay({
      key_id:     process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

    const order = await razorpay.orders.create({
      amount:   amt,
      currency,
      receipt:  receipt || `rcpt_${Date.now()}`,
      notes:    { product: product_name || 'Flying Mangoes' },
    });

    return res.json({
      order_id: order.id,
      amount:   order.amount,
      currency: order.currency,
      key_id:   process.env.RAZORPAY_KEY_ID,
    });
  } catch (err) {
    console.error('[create-order]', err);
    return res.status(500).json({ error: 'Could not create order. Please try again.' });
  }
};
