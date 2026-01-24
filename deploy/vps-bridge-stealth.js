const express = require('express');
const qrcode = require('qrcode');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const axios = require('axios');

// Stealth mode to bypass WhatsApp detection
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

const app = express();
const PORT = process.env.PORT || 3333;

const SESSION_DIR = './.wwebjs_auth_production';
const DATA_PATH = path.resolve(SESSION_DIR);

if (!fs.existsSync(DATA_PATH)) fs.mkdirSync(DATA_PATH, { recursive: true });

async function getMediaFromUrl(url) {
  try {
    const response = await axios.get(url, { responseType: 'arraybuffer', timeout: 15000 });
    return new MessageMedia(response.headers['content-type'], Buffer.from(response.data, 'binary').toString('base64'));
  } catch (err) { return null; }
}

app.use(cors());
app.use(express.json({ limit: '50mb' }));

let client = null, qrCodeData = null, status = 'initializing';

async function bootstrap() {
  console.log('--- PROD BRIDGE WITH STEALTH STARTING ---');
  
  client = new Client({
    authStrategy: new LocalAuth({ clientId: 'swar-prod', dataPath: DATA_PATH }),
    puppeteer: {
      headless: true,
      executablePath: puppeteer.executablePath(),
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
        '--disable-extensions',
        '--disable-background-networking',
        '--disable-sync',
        '--disable-translate',
        '--hide-scrollbars',
        '--metrics-recording-only',
        '--mute-audio',
        '--no-default-browser-check',
        '--safebrowsing-disable-auto-update'
      ]
    }
  });

  client.on('qr', qr => { qrCodeData = qr; status = 'qr_ready'; console.log('[qr] New QR Received.'); });
  client.on('ready', () => { status = 'connected'; qrCodeData = null; console.log('[ready] CONNECTED!'); });
  client.on('authenticated', () => console.log('[auth] Authenticated Successfully.'));
  client.on('disconnected', () => { console.log('Disconnected. Restarting...'); process.exit(1); });

  try { await client.initialize(); } catch (e) { console.error('FATAL:', e.message); process.exit(1); }
}

app.get('/qr', (req, res) => {
  if (qrCodeData) {
    qrcode.toDataURL(qrCodeData, (err, url) => {
      res.send(`<html><body style="background:#111;color:#fff;text-align:center;padding:50px;font-family:sans-serif;">
                <div style="background:#fff;color:#000;display:inline-block;padding:30px;border-radius:20px;box-shadow:0 10px 40px rgba(0,0,0,0.5);">
                <h2>Swar Yoga Bridge</h2>
                <img src="${url}" style="width:300px;"><p>Scan to connect</p>
                </div></body></html>`);
    });
  } else if (status === 'connected') res.send('<h1>Connected</h1>');
  else res.send('<h1>Initializing... Refresh in 5s</h1>');
});

app.get('/status', (req, res) => res.json({ status, connected: status === 'connected' }));

app.post('/send', async (req, res) => {
  const { to, chatId, message, url } = req.body;
  const target = (chatId || to || '').includes('@') ? (chatId || to) : `${chatId || to}@c.us`;
  if (status !== 'connected') return res.status(503).json({ error: 'Bridge not ready' });
  try {
    let content = message, options = {};
    if (url) { const m = await getMediaFromUrl(url); if (m) { content = m; options.caption = message; } }
    await client.sendMessage(target, content, options);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.listen(PORT, () => { console.log(`Production Bridge on ${PORT}`); bootstrap(); });
