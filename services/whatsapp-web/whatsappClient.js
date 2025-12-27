const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

const clientId = process.env.WHATSAPP_CLIENT_ID || 'crm-whatsapp-session';

const client = new Client({
  authStrategy: new LocalAuth({
    clientId,
  }),
  puppeteer: {
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  },
});

client.on('qr', (qr) => {
  // IMPORTANT: QR must be scanned in WhatsApp Mobile -> Linked devices
  // For WhatsApp Business app: Linked devices is still supported.
  console.log('\nScan this QR using WhatsApp app (Linked Devices -> Link a device)');
  qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
  console.log('WhatsApp connected successfully');
});

client.on('auth_failure', () => {
  console.log('WhatsApp auth failed');
});

client.on('disconnected', (reason) => {
  console.log('WhatsApp disconnected:', reason);
});

client.initialize();

module.exports = client;
