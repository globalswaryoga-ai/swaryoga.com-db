const express = require('express');
const sendWhatsappMessage = require('../sendWhatsapp');

const router = express.Router();

// In-memory safety throttle: 1 message / 3 seconds per process.
// This is intentionally conservative to prevent accidental loops.
let lastSentAt = 0;

router.post('/send', async (req, res) => {
  const secret = process.env.WHATSAPP_WEB_BRIDGE_SECRET;
  if (secret) {
    const got = req.headers['x-api-key'];
    if (!got || String(got) !== String(secret)) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
  }

  const { phone, message } = req.body || {};

  if (!phone || !message) {
    return res.status(400).json({ success: false, error: 'phone and message required' });
  }

  const now = Date.now();
  if (now - lastSentAt < 3000) {
    return res.status(429).json({ success: false, error: 'Slow down (throttled)' });
  }

  try {
    await sendWhatsappMessage(phone, message);
    lastSentAt = now;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Send failed' });
  }
});

router.get('/health', (req, res) => {
  res.json({ ok: true });
});

module.exports = router;
