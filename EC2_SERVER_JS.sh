cat > /tmp/server_js_content.txt << 'EOF'
const express = require('express');
const qrcode = require('qrcode');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { Client, LocalAuth } = require('whatsapp-web.js');

const app = express();
const PORT = process.env.PORT || 3333;
const BRIDGE_SECRET = process.env.WHATSAPP_BRIDGE_SECRET || 'swar-bridge-secret-2024';
const SESSION_DIR = path.join(__dirname, '.wwebjs_auth');

function getChromePath() {
  const possiblePaths = [
    process.env.CHROME_PATH,
    '/usr/bin/google-chrome',
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
  ];
  for (const p of possiblePaths) {
    if (p && fs.existsSync(p)) {
      console.log(`✓ Using Chrome at: ${p}`);
      return p;
    }
  }
  console.warn('⚠ Chrome not found, Puppeteer will download it');
  return undefined;
}

app.use(cors({ origin: '*', allowedHeaders: ['Content-Type', 'x-bridge-secret'] }));
app.use(express.json());

const authMiddleware = (req, res, next) => {
  const secret = req.headers['x-bridge-secret'];
  if (!secret || secret !== BRIDGE_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

let client = null;
let qrCode = null;
let sessionReady = false;
let chats = [];

function initializeClient() {
  console.log('Initializing WhatsApp client...');
  client = new Client({
    authStrategy: new LocalAuth({ clientId: 'swar-yoga-qr', dataPath: SESSION_DIR }),
    puppeteer: {
      headless: true,
      executablePath: getChromePath(),
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
    }
  });

  client.on('qr', (qr) => {
    console.log('New QR code received');
    qrcode.toDataURL(qr, (err, url) => {
      if (err) console.error('QR error:', err);
      else qrCode = url;
    });
  });

  client.on('authenticated', () => {
    console.log('✓ Authenticated');
    sessionReady = true;
  });

  client.on('ready', () => {
    console.log('✓ WhatsApp ready');
    sessionReady = true;
  });

  client.on('disconnected', () => {
    console.log('Disconnected');
    sessionReady = false;
    qrCode = null;
  });

  client.on('error', (err) => {
    console.error('Client error:', err);
  });

  client.initialize().catch((err) => {
    console.error('Init error:', err);
    sessionReady = false;
  });
}

app.get('/status', authMiddleware, (req, res) => {
  res.json({
    status: sessionReady ? 'connected' : (qrCode ? 'qr' : 'disconnected'),
    hasQr: !!qrCode,
    sessionReady,
    qr: qrCode || null
  });
});

app.get('/qr', authMiddleware, (req, res) => {
  if (!qrCode) {
    return res.status(400).json({ ok: false, message: 'QR not available yet' });
  }
  res.json({ ok: true, qr: qrCode });
});

app.get('/health', (req, res) => {
  res.json({ ok: true, port: PORT });
});

app.listen(PORT, () => {
  console.log(`🌐 WhatsApp Bridge running on port ${PORT}`);
  console.log(`📱 Bridge Secret: ${BRIDGE_SECRET}`);
  initializeClient();
});

process.on('SIGINT', () => {
  console.log('Shutting down...');
  if (client) client.destroy().catch(() => {});
  process.exit(0);
});
EOF

cat /tmp/server_js_content.txt
