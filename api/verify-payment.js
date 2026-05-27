const crypto = require('crypto');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, product_name, amount, customer_phone } = req.body;
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature)
      return res.status(400).json({ error: 'Missing required fields' });

    const generated = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (generated !== razorpay_signature)
      return res.status(400).json({ error: 'Signature mismatch. Payment not verified.' });

    const ownerPhone = process.env.OWNER_WHATSAPP || '919999999999';
    const msg = encodeURIComponent(
      `🥭 *New Flying Mangoes Order!*\n\n` +
      `*Product:* ${product_name}\n` +
      `*Amount:* ₹${(amount / 100).toLocaleString('en-IN')}\n` +
      `*Payment ID:* ${razorpay_payment_id}\n` +
      `*Order ID:* ${razorpay_order_id}\n` +
      (customer_phone ? `*Customer:* ${customer_phone}\n` : '') +
      `\n✅ Payment verified & confirmed.`
    );

    return res.json({ success: true, payment_id: razorpay_payment_id, whatsapp_url: `https://wa.me/${ownerPhone}?text=${msg}` });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Verification failed', details: err.message });
  }
};
