
// Message forwarding to CRM webhook
require('dotenv').config();
const axios = require('axios');

client.on('message_create', async (msg) => {
  console.log(`[MSG] ${msg.fromMe ? 'OUT' : 'IN'}: ${msg.body?.substring(0, 50) || '(media)'}`);
  
  // Forward to CRM webhook if configured
  const baseUrl = process.env.NEXT_BASE_URL;
  if (baseUrl) {
    try {
      await axios.post(`${baseUrl}/api/whatsapp/qr/webhook`, {
        messageId: msg.id._serialized,
        from: msg.from,
        to: msg.to,
        body: msg.body,
        timestamp: msg.timestamp,
        fromMe: msg.fromMe,
        type: msg.type,
        hasMedia: msg.hasMedia,
      }, {
        headers: {
          'Content-Type': 'application/json',
          'x-qr-chat-secret': process.env.WHATSAPP_WEB_BRIDGE_SECRET || 'swar-bridge-secret-2024'
        },
        timeout: 10000
      });
      console.log('[MSG] Forwarded to CRM');
    } catch (err) {
      console.error('[MSG] Forward failed:', err.message);
    }
  }
});
