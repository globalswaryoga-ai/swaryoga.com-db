const client = require('./whatsappClient');

function normalizeToChatId(phone) {
  const digits = String(phone || '').replace(/\D/g, '');
  if (!digits) return null;

  // whatsapp-web.js expects international format without +, then '@c.us'
  // e.g. 919876543210@c.us
  return `${digits}@c.us`;
}

async function sendWhatsappMessage(phone, message) {
  const chatId = normalizeToChatId(phone);
  if (!chatId) throw new Error('Invalid phone');

  const text = String(message || '').trim();
  if (!text) throw new Error('Message is required');

  await client.sendMessage(chatId, text);
  return true;
}

module.exports = sendWhatsappMessage;
