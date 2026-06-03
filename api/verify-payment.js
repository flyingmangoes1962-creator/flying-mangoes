const crypto = require('crypto');

if (!process.env.RAZORPAY_KEY_SECRET) {
  console.error('[verify-payment] RAZORPAY_KEY_SECRET is not set!');
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      product_name,
      amount,
      customer_phone,
      customer_name,
      delivery_address,
      delivery_city,
      delivery_pincode,
    } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ error: 'Missing payment verification fields' });
    }

    // Build the expected signature
    const generated = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    // Use timing-safe comparison to prevent timing attacks
    const genBuf = Buffer.from(generated,           'hex');
    const sigBuf = Buffer.from(razorpay_signature,  'hex');

    // Signatures must be the same length for timingSafeEqual; if not → mismatch
    const signatureValid =
      genBuf.length === sigBuf.length &&
      crypto.timingSafeEqual(genBuf, sigBuf);

    if (!signatureValid) {
      console.warn('[verify-payment] Signature mismatch for order:', razorpay_order_id);
      return res.status(400).json({ error: 'Payment verification failed. Do not retry automatically.' });
    }

    // Build the WhatsApp message to the owner
    const ownerPhone = process.env.OWNER_WHATSAPP || '919999999999';
    const amtRupees  = amount ? `₹${(Number(amount) / 100).toLocaleString('en-IN')}` : '—';
    const addrLine   = [delivery_address, delivery_city, delivery_pincode].filter(Boolean).join(', ') || '—';

    const msg = encodeURIComponent(
      `🥭 *New Flying Mangoes Order!*\n\n` +
      `*Product:* ${product_name || '—'}\n` +
      `*Amount:* ${amtRupees}\n` +
      `*Payment ID:* ${razorpay_payment_id}\n` +
      `*Order ID:* ${razorpay_order_id}\n` +
      `*Customer:* ${customer_name || '—'}\n` +
      `*Phone:* ${customer_phone || '—'}\n` +
      `*Deliver to:* ${addrLine}\n` +
      `\n✅ Payment verified & confirmed.`
    );

    return res.json({
      success:       true,
      payment_id:    razorpay_payment_id,
      whatsapp_url:  `https://wa.me/${ownerPhone}?text=${msg}`,
    });
  } catch (err) {
    console.error('[verify-payment]', err);
    return res.status(500).json({ error: 'Verification failed. Contact support with your Payment ID.' });
  }
};
