const { Client, LocalAuth, MessageMedia, Buttons } = require('whatsapp-web.js');
const express = require('express');
const http = require('http');
const path = require('path');
const fs = require('fs');
const { Server } = require('socket.io');
const qrcode = require('qrcode');
const cors = require('cors');
const AWS = require('aws-sdk');
const mongoose = require('mongoose');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

// Configure AWS S3
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || 'us-east-1'
});

// Configure MongoDB
const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/whatsapp-bridge';
mongoose.connect(mongoUri, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).catch(err => console.error('MongoDB connection error:', err));

// Configure multer for file uploads (temporary storage)
const upload = multer({ storage: multer.memoryStorage() });

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.WHATSAPP_WEB_ALLOWED_ORIGINS ? process.env.WHATSAPP_WEB_ALLOWED_ORIGINS.split(',') : '*',
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

// Keep bridge responses snappy even with large payloads.
app.disable('x-powered-by');

const parsePort = (value, fallback) => {
  const n = Number.parseInt(String(value ?? ''), 10);
  if (Number.isFinite(n) && n >= 0 && n <= 65535) return n;
  return fallback;
};

// If set to 0, the OS will choose a free ephemeral port.
const BRIDGE_PORT = parsePort(process.env.WHATSAPP_WEB_PORT, 3333);
const CLIENT_ID = process.env.WHATSAPP_CLIENT_ID || 'crm-whatsapp-session';
const BRIDGE_SECRET = process.env.WHATSAPP_WEB_BRIDGE_SECRET || 'swar-bridge-secret-2024';

// Middleware for basic protection
const authenticate = (req, res, next) => {
  const secret = req.headers['x-bridge-secret'];
  if (BRIDGE_SECRET && secret !== BRIDGE_SECRET) {
    return res.status(401).json({ error: 'Unauthorized bridge access' });
  }
  next();
};

const bytesToMB = (bytes) => Math.round((bytes / 1024 / 1024) * 100) / 100;
const bytesToGB = (bytes) => Math.round((bytes / 1024 / 1024 / 1024) * 100) / 100;

const getDiskFreeBytes = () => {
  // Linux: fs.statfsSync is available in Node 18+
  try {
    const stat = fs.statfsSync('/');
    return stat.bavail * stat.bsize;
  } catch {
    return null;
  }
};

const MIN_DISK_FREE_BYTES = 700 * 1024 * 1024; // ~700MB (Chromium profiles/tmp need breathing room)

// If set to "0" we only warn (do not exit). Useful on very small instances where you still
// want the bridge to come up and at least serve status/qr.
const DISK_GUARD_STRICT = String(process.env.WHATSAPP_WEB_STRICT_DISK_GUARD ?? '1') !== '0';

const tryResolveSnapChromium = () => {
  // /snap/bin/chromium-browser is a wrapper; Puppeteer wants the underlying binary path.
  try {
    const { execSync } = require('child_process');
    const out = execSync('/snap/bin/chromium-browser --print-path', {
      stdio: ['ignore', 'pipe', 'ignore'],
      encoding: 'utf8',
    }).trim();
    if (out && fs.existsSync(out)) return out;
  } catch {
    // ignore
  }
  return null;
};

// Returns a usable executable path or undefined.
// Preference order:
// 1) Explicit env var
// 2) Puppeteer cache (latest version)
// 3) System chrome/chromium paths
const getBrowserExecutablePath = () => {
  const envPath = process.env.PUPPETEER_EXECUTABLE_PATH;
  if (envPath && fs.existsSync(envPath)) return envPath;

  const homeDir = require('os').homedir();
  const chromeCacheDir = path.join(homeDir, '.cache', 'puppeteer', 'chrome');
  try {
    if (fs.existsSync(chromeCacheDir)) {
      const versions = fs
        .readdirSync(chromeCacheDir)
        .filter((v) => v && !v.startsWith('.'))
        .sort()
        .reverse();

      for (const version of versions) {
        const candidate = path.join(chromeCacheDir, version, 'chrome-linux64', 'chrome');
        if (fs.existsSync(candidate)) {
          try {
            fs.accessSync(candidate, fs.constants.X_OK);
            return candidate;
          } catch {
            // Exists but not executable; keep searching.
          }
        }
      }
    }
  } catch (e) {
    console.error('Error searching browser cache:', e.message);
  }

  const systemCandidates = [
    '/usr/bin/google-chrome-stable',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
    '/snap/bin/chromium',
    '/snap/bin/chromium-browser',
  ];

  // Snap wrapper needs special handling on Ubuntu.
  if (fs.existsSync('/snap/bin/chromium-browser')) {
    const resolved = tryResolveSnapChromium();
    if (resolved) return resolved;
  }

  for (const p of systemCandidates) {
    if (fs.existsSync(p)) return p;
  }

  return undefined;
};

let qrCodeData = null;
let clientStatus = 'disconnected'; // disconnected, qr, connecting, connected
let lastDisconnectReason = null;
let lastDisconnectAt = null;
let lastAuthFailure = null;

const client = new Client({
  authStrategy: new LocalAuth({
    clientId: CLIENT_ID,
    dataPath: './.wwebjs_auth'
  }),
  webVersionCache: {
    type: 'remote',
    remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html',
  },
  puppeteer: {
    executablePath: getBrowserExecutablePath(),
    headless: "new",
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--disable-extensions',
      '--no-zygote',
      '--single-process',
      '--no-first-run',
    ]
  }
});

console.log('Environment Debug:');
console.log('- OS:', process.platform, process.arch);
console.log('- Node:', process.version);
console.log('- PUPPETEER_EXECUTABLE_PATH env:', process.env.PUPPETEER_EXECUTABLE_PATH || '(not set)');
console.log('- Resolved browser path:', client.options?.puppeteer?.executablePath || '(default puppeteer)');
console.log('- Free RAM (MB):', bytesToMB(require('os').freemem()));

const diskFreeBytes = getDiskFreeBytes();
if (diskFreeBytes != null) {
  console.log('- Free disk on / (GB):', bytesToGB(diskFreeBytes));
  if (diskFreeBytes < MIN_DISK_FREE_BYTES) {
    const msg =
      '\n' +
      'WARNING: Low free disk; Chromium may fail to launch or crash under load.\n' +
      `- Free: ${bytesToMB(diskFreeBytes)} MB\n` +
      `- Recommended: >= ${bytesToMB(MIN_DISK_FREE_BYTES)} MB\n` +
      'Fix: increase EBS volume (recommended 16GB+) or remove large folders like .next, node_modules, or ~/.cache/puppeteer.\n';

    if (DISK_GUARD_STRICT) {
      console.error(msg.replace('WARNING', 'FATAL'));
      process.exit(1);
    } else {
      console.warn(msg);
    }
  }
}

// Fail fast with a very clear message if the browser path is configured but missing.
// This avoids the confusing "Browser was not found at the configured executablePath" loop.
const resolvedBrowserPath = client.options?.puppeteer?.executablePath;
if (resolvedBrowserPath && !fs.existsSync(resolvedBrowserPath)) {
  console.error('\nFATAL: Configured browser path does not exist:');
  console.error(`- ${resolvedBrowserPath}`);
  console.error('This usually happens after an ENOSPC (disk full) interrupted browser install.');
  console.error('Fix: free disk space and reinstall, or install system chromium and unset PUPPETEER_EXECUTABLE_PATH.\n');
  process.exit(1);
}

// Keep a small cached QR image to avoid regenerating base64 PNG on every `/qr` call.
// (QR string changes whenever the session changes, so we reset this cache on qr/null.)
let qrImageDataUrl = null;

// QR Persistence: Save QR to file to reuse across restarts
const QR_CACHE_FILE = path.join('./.wwebjs_auth', 'last_qr.json');

const saveQRToFile = (qrString, dataUrl) => {
  try {
    fs.mkdirSync(path.dirname(QR_CACHE_FILE), { recursive: true });
    fs.writeFileSync(QR_CACHE_FILE, JSON.stringify({
      qrString,
      dataUrl,
      savedAt: new Date().toISOString()
    }, null, 2));
    console.log('✓ QR code persisted to file');
  } catch (err) {
    console.error('Error saving QR to file:', err.message);
  }
};

const loadQRFromFile = () => {
  try {
    if (fs.existsSync(QR_CACHE_FILE)) {
      const data = JSON.parse(fs.readFileSync(QR_CACHE_FILE, 'utf-8'));
      console.log('✓ Loaded QR code from file (saved at', data.savedAt, ')');
      return data;
    }
  } catch (err) {
    console.error('Error loading QR from file:', err.message);
  }
  return null;
};

app.get('/health', (req, res) => {
  res.json({
    ok: true,
    status: clientStatus,
    lastDisconnectReason,
    lastDisconnectAt,
    lastAuthFailure,
    browserPath: resolvedBrowserPath || null,
    browserExists: resolvedBrowserPath ? fs.existsSync(resolvedBrowserPath) : null,
    freeRamMB: bytesToMB(require('os').freemem()),
    freeDiskBytes: diskFreeBytes,
    s3Configured: !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY),
    s3Bucket: process.env.AWS_S3_BUCKET || 'social-media'
  });
});

client.on('qr', (qr) => {
  console.log('QR RECEIVED', qr);
  qrCodeData = qr;
  qrImageDataUrl = null;
  clientStatus = 'qr';
  
  // Generate and save QR image
  (async () => {
    try {
      const dataUrl = await qrcode.toDataURL(qr);
      saveQRToFile(qr, dataUrl);
      qrImageDataUrl = dataUrl;
    } catch (err) {
      console.error('Error generating QR image:', err);
    }
  })();
  
  io.emit('qr', qr);
});

client.on('ready', () => {
  console.log('CLIENT READY');
  qrCodeData = null;
  qrImageDataUrl = null;
  clientStatus = 'connected';
  io.emit('status', 'connected');
});

client.on('authenticated', () => {
  console.log('AUTHENTICATED');
  clientStatus = 'authenticated';
  io.emit('status', 'authenticated');
});

client.on('auth_failure', (msg) => {
  console.error('AUTHENTICATION FAILURE', msg);
  clientStatus = 'disconnected';
  lastAuthFailure = msg || 'auth_failure';
  qrImageDataUrl = null;
  io.emit('status', 'auth_failure');
});

client.on('disconnected', (reason) => {
  console.log('CLIENT DISCONNECTED', reason);
  clientStatus = 'disconnected';
  lastDisconnectReason = reason || 'unknown';
  lastDisconnectAt = Date.now();
  // PERSISTENCE: Keep QR code cached for reuse instead of clearing it
  // qrCodeData remains available from file on next request
  // Only clear the generated image dataUrl, not the string
  qrImageDataUrl = null;
  io.emit('status', 'disconnected');
  // Attempt to re-init after a delay
  setTimeout(startClient, 5000);
});

client.on('change_state', (state) => {
  console.log('STATE CHANGED', state);
});

// Auto-initialize if not connected
function startClient() {
  if (clientStatus === 'connecting') return; // Avoid double init
  
  if (clientStatus === 'disconnected' || clientStatus === 'qr') {
    console.log('Initializing WhatsApp Client...');
    clientStatus = 'connecting';
    client.initialize().catch(err => {
      console.error('Failed to initialize client', err);
      clientStatus = 'disconnected';
      setTimeout(startClient, 5000); 
    });
  }
}

// Initial start
startClient();

// Message handling
client.on('message_create', async (msg) => {
  // message_create fires for both inbound and outbound (sent from this phone)
  console.log(`${msg.fromMe ? 'OUTBOUND' : 'INBOUND'} MESSAGE:`, msg.body);
  
  // Forward to CRM webhook if configured
  if (process.env.NEXT_BASE_URL) {
    try {
      await fetch(`${process.env.NEXT_BASE_URL}/api/whatsapp/qr/webhook`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-qr-chat-secret': process.env.WHATSAPP_WEB_BRIDGE_SECRET
        },
        body: JSON.stringify(msg)
      });
    } catch (err) {
      console.error('Failed to forward message to CRM', err.message);
    }
  }
});

// API Routes
app.get('/status', (req, res) => {
  // Status should never be cached by proxies/browsers.
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.json({
    status: clientStatus,
    hasQr: !!qrCodeData,
    lastDisconnectReason,
    lastDisconnectAt,
    lastAuthFailure,
  });
});

// Get current user profile info
app.get('/profile', authenticate, async (req, res) => {
  if (clientStatus !== 'connected') {
    return res.status(400).json({ error: 'Client not connected' });
  }
  try {
    const currentUser = await client.getContactById(client.info.wid._serialized);
    let profilePicture = null;
    try {
      profilePicture = await currentUser.getProfilePicUrl();
    } catch (e) {
      // Profile picture not available
    }
    res.json({
      id: currentUser.id._serialized,
      name: currentUser.name || currentUser.pushname || 'You',
      profilePicture: profilePicture || null,
      number: currentUser.number || client.info.wid._serialized
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get contact details by ID
app.get('/contact/:contactId', authenticate, async (req, res) => {
  if (clientStatus !== 'connected') {
    return res.status(400).json({ error: 'Client not connected' });
  }
  try {
    const { contactId } = req.params;
    const contact = await client.getContactById(contactId);
    
    let profilePicture = null;
    try {
      profilePicture = await contact.getProfilePicUrl();
    } catch (e) {
      // Profile picture not available
    }

    // Try to find chat to get last message time
    const chats = await client.getChats();
    const chat = chats.find(c => c.id._serialized === contactId);
    
    res.json({
      id: contact.id._serialized,
      name: contact.name || contact.pushname || 'Unknown',
      number: contact.number || contactId,
      profilePicture: profilePicture || null,
      shortName: contact.shortName || null,
      isMe: contact.isMe || false,
      isMyContact: contact.isMyContact || false,
      isBusiness: contact.isBusiness || false,
      verifiedLevel: contact.verifiedLevel || null,
      verifiedName: contact.verifiedName || null,
      lastSeen: chat ? chat.timestamp : null,
      lastMessage: chat && chat.lastMessage ? {
        body: chat.lastMessage.body,
        timestamp: chat.lastMessage.timestamp,
        fromMe: chat.lastMessage.fromMe
      } : null,
      unreadCount: chat ? chat.unreadCount : 0,
      isGroup: chat ? chat.isGroup : false,
      memberCount: chat && chat.isGroup ? (await chat.getParticipants()).length : null
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/qr', async (req, res) => {
  // QR should never be cached by proxies/browsers.
  res.setHeader('Cache-Control', 'no-store, max-age=0');

  // PERSISTENCE: Try to load from file if qrCodeData is not in memory
  if (!qrCodeData) {
    const cached = loadQRFromFile();
    if (cached) {
      qrCodeData = cached.qrString;
      qrImageDataUrl = cached.dataUrl;
    }
  }

  // If the client is already connected, returning a 404 can look like a broken route
  // in browsers/devtools. We return a 200 with a clear payload instead.
  if (!qrCodeData) {
    const hint =
      clientStatus === 'connected' || clientStatus === 'authenticated'
        ? 'Client is already connected; QR is not required.'
        : 'QR is not available yet. Wait a few seconds or restart the bridge.';

    return res.status(200).json({
      ok: false,
      status: clientStatus,
      hasQr: false,
      message: hint,
    });
  }
  try {
    // Default is JSON with data URL + raw string (backward compatible).
    // Supported formats:
    // - ?format=json (default)
    // - ?format=raw  -> text/plain raw QR string
    // - ?format=png  -> image/png bytes
    const format = String(req.query.format || 'json').toLowerCase();

    if (format === 'raw') {
      res.type('text/plain').send(qrCodeData);
      return;
    }

    if (!qrImageDataUrl) {
      qrImageDataUrl = await qrcode.toDataURL(qrCodeData);
    }

    if (format === 'png') {
      // Convert data URL to raw bytes.
      const b64 = qrImageDataUrl.split('base64,')[1] || '';
      const buf = Buffer.from(b64, 'base64');
      res.type('image/png').send(buf);
      return;
    }

    res.json({ qr: qrImageDataUrl, raw: qrCodeData });
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate QR image' });
  }
});

// Some environments/pages expect a direct image URL like `wa-qr.png`.
// Provide a deterministic, fast response:
// - If QR exists -> 200 image/png
// - If QR doesn't exist -> 200 image/svg+xml placeholder (so the request doesn't hang/retry)
app.get('/wa-qr.png', async (req, res) => {
  res.setHeader('Cache-Control', 'no-store, max-age=0');

  if (!qrCodeData) {
    res.type('image/svg+xml').send(`<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="320" height="320" viewBox="0 0 320 320">
  <rect width="320" height="320" fill="#ffffff"/>
  <rect x="8" y="8" width="304" height="304" rx="16" fill="#f9fafb" stroke="#e5e7eb"/>
  <text x="160" y="152" text-anchor="middle" font-family="system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif" font-size="16" fill="#111827">QR not available</text>
  <text x="160" y="178" text-anchor="middle" font-family="system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif" font-size="12" fill="#6b7280">Status: ${String(clientStatus || '').replace(/</g, '&lt;')}</text>
</svg>`);
    return;
  }

  try {
    if (!qrImageDataUrl) {
      qrImageDataUrl = await qrcode.toDataURL(qrCodeData);
    }
    const b64 = qrImageDataUrl.split('base64,')[1] || '';
    const buf = Buffer.from(b64, 'base64');
    res.type('image/png').send(buf);
  } catch (err) {
    res.status(500).type('text/plain').send('Failed to generate QR image');
  }
});

// Human-friendly QR page for quick scanning.
// This avoids confusion like "(canceled)" in devtools and makes it obvious when the
// client is already connected (so QR is intentionally absent).
app.get('/qr-view', (_req, res) => {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.type('text/html').send(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>WhatsApp QR</title>
    <style>
      body { font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; margin: 24px; }
      .card { max-width: 520px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; padding: 16px; }
      .muted { color: #6b7280; }
      .row { display: flex; gap: 12px; align-items: center; justify-content: space-between; }
      img { width: 320px; height: 320px; display: block; margin: 16px auto; border: 1px solid #e5e7eb; border-radius: 8px; }
      code { background: #f3f4f6; padding: 2px 6px; border-radius: 6px; }
      button { cursor: pointer; padding: 8px 12px; border-radius: 10px; border: 1px solid #e5e7eb; background: #fff; }
      button:hover { background: #f9fafb; }
    </style>
  </head>
  <body>
    <div class="card">
      <div class="row">
        <h2 style="margin:0">WhatsApp QR</h2>
        <button id="refresh">Refresh</button>
      </div>
      <p class="muted" style="margin-top:6px">This page polls <code>/status</code> and loads the QR from <code>/qr?format=png</code> if available.</p>
      <p id="status" class="muted">Loading…</p>
      <img id="qr" alt="QR code" style="display:none" />
      <p id="hint" class="muted"></p>
    </div>
    <script>
      const statusEl = document.getElementById('status');
      const hintEl = document.getElementById('hint');
      const img = document.getElementById('qr');
      const refreshBtn = document.getElementById('refresh');
      let timer;

      async function load() {
        try {
          const st = await fetch('/status', { cache: 'no-store' }).then(r => r.json());
          statusEl.textContent = 'Status: ' + st.status + ' (hasQr: ' + st.hasQr + ')';

          if (st.hasQr) {
            img.style.display = 'block';
            hintEl.textContent = 'Scan this QR in WhatsApp → Linked devices.';
            // Cache-bust so the browser doesn't show an old QR after a session reset.
            img.src = '/qr?format=png&t=' + Date.now();
          } else {
            img.style.display = 'none';
            img.removeAttribute('src');
            hintEl.textContent = st.status === 'connected' || st.status === 'authenticated'
              ? 'Already connected. No QR needed.'
              : 'QR not available yet. If this persists, try /restart or /disconnect.';
          }
        } catch (e) {
          statusEl.textContent = 'Error loading status.';
          hintEl.textContent = String(e);
        }
      }

      refreshBtn.addEventListener('click', () => load());
      load();
      timer = setInterval(load, 3000);
      window.addEventListener('beforeunload', () => clearInterval(timer));
    </script>
  </body>
</html>`);
});

app.post('/connect', authenticate, (req, res) => {
  if (clientStatus === 'connected') {
    return res.json({ message: 'Already connected', status: clientStatus });
  }
  startClient();
  res.json({ message: 'Initializing connection...', status: 'connecting' });
});

app.post('/restart', authenticate, async (req, res) => {
  console.log('RESTARTING BRIDGE...');
  try {
    await client.destroy();
  } catch (e) {}
  
  clientStatus = 'disconnected';
  qrCodeData = null;
  qrImageDataUrl = null;
  
  setTimeout(() => {
    startClient();
  }, 2000);
  
  res.json({ message: 'Restarting bridge...' });
});

app.post('/disconnect', async (req, res) => {
  try {
    await client.logout();
    res.json({ message: 'Logged out' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to logout' });
  }
});

app.post('/send', authenticate, async (req, res) => {
  const { to, message, type, url, buttons, caption } = req.body;
  console.log(`SENDING MESSAGE: to=${to}, type=${type || 'text'}`);
  
  if (!to) {
    return res.status(400).json({ error: 'Missing recipient (to)' });
  }

  try {
    const formattedTo = to.includes('@') ? to : `${to}@c.us`;
    console.log(`Sending to: ${formattedTo}`);
    
    let response;
    
    if (type === 'image' || type === 'video' || type === 'document') {
      console.log(`Media Send [${type}]: ${url || 'base64-data'}`);
      
      try {
        let media;
        if (url && url.startsWith('data:')) {
          // It's a data URI
          const parts = url.split(';base64,');
          const mimetype = parts[0].split(':')[1];
          const data = parts[1];
          media = new MessageMedia(mimetype, data, caption || 'file');
        } else if (url) {
          // It's a URL
          media = await MessageMedia.fromUrl(url, { unsafe: true });
        } else {
          return res.status(400).json({ error: `Missing ${type} URL or base64 data` });
        }

        response = await client.sendMessage(formattedTo, media, { 
          caption: caption || message,
          sendMediaAsDocument: type === 'document'
        });
      } catch (mediaErr) {
        console.error('FAILED TO PROCESS MEDIA:', mediaErr.message);
        return res.status(500).json({ error: 'Failed to process media. Ensure it is a valid URL or base64 data.' });
      }
    } else if (type === 'buttons') {
      console.log('Buttons Send');
      if (!buttons || !buttons.length) return res.status(400).json({ error: 'Missing buttons' });
      const bts = buttons.map(b => ({ body: b }));
      const msg = new Buttons(message || 'Select an option', bts, caption || 'Swar Yoga', 'Please select');
      response = await client.sendMessage(formattedTo, msg);
    } else {
      console.log(`Text Send: "${message}"`);
      if (!message) return res.status(400).json({ error: 'Missing message body' });
      response = await client.sendMessage(formattedTo, message);
    }

    console.log('MESSAGE SENT SUCCESS:', response.id._serialized);
    res.json({ success: true, messageId: response.id._serialized });
  } catch (err) {
    console.error('FINAL SEND ERROR:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/messages/presence', authenticate, async (req, res) => {
  const { phone, type } = req.body;
  if (!phone || !type) return res.status(400).json({ error: 'Missing phone or type' });

  if (clientStatus !== 'connected') {
    return res.status(400).json({ error: 'Client not connected' });
  }

  try {
    const formattedTo = phone.includes('@') ? phone : `${phone}@c.us`;
    const chat = await client.getChatById(formattedTo);
    
    // Map to WWebJS types: 'composing' | 'recording' | 'paused'
    let wwebType = 'composing';
    if (type === 'recording') wwebType = 'recording';
    if (type === 'paused') wwebType = 'paused';

    await chat.sendPresenceUpdate(wwebType);
    res.json({ success: true });
  } catch (err) {
    console.error('PRESENCE ERROR:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/chats', authenticate, async (req, res) => {
  if (clientStatus !== 'connected') {
    return res.status(400).json({ error: 'Client not connected' });
  }
  try {
    const chats = await client.getChats();
    // Return both 1-1 and groups as requested
    const filtered = await Promise.all(chats
      .slice(0, 100) // Increase limit slightly
      .map(async (c) => {
        let profilePicture = null;
        try {
          // Try to get profile picture for the chat
          profilePicture = await c.getProfilePicUrl();
        } catch (e) {
          // Profile picture not available, that's OK
        }
        
        let memberCount = null;
        if (c.isGroup) {
          try {
            const participants = await c.getParticipants();
            memberCount = participants.length;
          } catch (e) {
            // Member count not available for this group
          }
        }
        
        return {
          id: c.id._serialized,
          name: c.name,
          isGroup: c.isGroup,
          memberCount: memberCount,
          unreadCount: c.unreadCount,
          timestamp: c.timestamp,
          profilePicture: profilePicture || null,
          lastMessage: c.lastMessage ? {
            body: c.lastMessage.body,
            fromMe: c.lastMessage.fromMe
          } : null
        };
      })
    );
    res.json({ chats: filtered });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/messages/:chatId', authenticate, async (req, res) => {
  if (clientStatus !== 'connected') {
    return res.status(400).json({ error: 'Client not connected' });
  }
  try {
    const chat = await client.getChatById(req.params.chatId);
    
    // Automatically mark as read when fetching messages
    try {
      await chat.sendSeen();
    } catch (e) {
      console.log('Failed to mark as seen:', e.message);
    }

    const messages = await chat.fetchMessages({ limit: 50 });
    
    // Process messages - return metadata only, no heavy base64 here
    const formatted = await Promise.all(messages.map(async (m) => {
        let senderProfilePicture = null;
        // Try to get sender's profile picture if not from current user
        if (!m.fromMe) {
          try {
            const contact = await m.getContact();
            if (contact) {
              senderProfilePicture = await contact.getProfilePicUrl();
            }
          } catch (e) {
            // Profile picture not available
          }
        }
        return {
            id: m.id._serialized,
            body: m.body,
            fromMe: m.fromMe,
            timestamp: m.timestamp,
            type: m.type,
            hasMedia: m.hasMedia,
            ack: m.ack,
            senderProfilePicture: senderProfilePicture || null
            // we omit mediaData here to keep response small/fast
        };
    }));
    
    res.json({ messages: formatted });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/messages/media/:msgId', authenticate, async (req, res) => {
  if (clientStatus !== 'connected') {
    return res.status(400).json({ error: 'Client not connected' });
  }
  try {
    const msg = await client.getMessageById(req.params.msgId);
    if (!msg || !msg.hasMedia) {
        return res.status(404).json({ error: 'Message or media not found' });
    }

    const media = await msg.downloadMedia();
    if (!media) {
        return res.status(404).json({ error: 'Failed to download media' });
    }

    res.json({ 
        id: msg.id._serialized,
        mimetype: media.mimetype,
        filename: media.filename,
        data: media.data // base64
    });
  } catch (err) {
    console.error('MEDIA FETCH ERROR:', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// TASK 7: AWS S3 MEDIA INTEGRATION
// ============================================================================

// Upload media to S3
app.post('/media/upload', authenticate, upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file provided' });
  }

  const s3Configured = !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY);
  if (!s3Configured) {
    console.error('S3 Upload Error: AWS credentials missing in environment');
    return res.status(500).json({ 
      error: 'AWS S3 credentials not configured on bridge',
      details: {
        hasAccessKey: !!process.env.AWS_ACCESS_KEY_ID,
        hasSecretKey: !!process.env.AWS_SECRET_ACCESS_KEY,
        message: 'Please add AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY to your environment/pm2 config'
      }
    });
  }

  const fileKey = `whatsapp-media/${uuidv4()}-${req.file.originalname}`;
  const params = {
    Bucket: process.env.AWS_S3_BUCKET || 'social-media',
    Key: fileKey,
    Body: req.file.buffer,
    ContentType: req.file.mimetype,
    // Removed ACL: 'public-read' because many new buckets have Block Public Access enabled.
    // Use bucket policies or pre-signed URLs instead.
  };

  try {
    const data = await s3.upload(params).promise();
    res.json({
      success: true,
      url: data.Location,
      key: fileKey,
      size: req.file.size,
      mimetype: req.file.mimetype
    });
  } catch (err) {
    console.error('S3 Upload Error:', err);
    res.status(500).json({ 
      error: 'Failed to upload to S3', 
      details: {
        message: err.message,
        code: err.code,
        bucket: params.Bucket
      }
    });
  }
});

// Download/stream media from S3
app.get('/media/download/:fileKey', authenticate, async (req, res) => {
  const fileKey = req.params.fileKey;

  const params = {
    Bucket: process.env.AWS_S3_BUCKET || 'social-media',
    Key: fileKey
  };

  try {
    const data = await s3.getObject(params).promise();
    res.setHeader('Content-Type', data.ContentType);
    res.setHeader('Content-Disposition', `attachment; filename="${fileKey}"`);
    res.send(data.Body);
  } catch (err) {
    console.error('S3 Download Error:', err);
    res.status(500).json({ error: 'Failed to download from S3', details: err.message });
  }
});

// Delete media from S3
app.delete('/media/:fileKey', authenticate, async (req, res) => {
  const fileKey = req.params.fileKey;

  const params = {
    Bucket: process.env.AWS_S3_BUCKET || 'social-media',
    Key: fileKey
  };

  try {
    await s3.deleteObject(params).promise();
    res.json({ success: true, message: 'Media deleted from S3' });
  } catch (err) {
    console.error('S3 Delete Error:', err);
    res.status(500).json({ error: 'Failed to delete from S3', details: err.message });
  }
});

// ============================================================================
// TASK 8: MONGODB CHAT PERSISTENCE
// ============================================================================

// Define MongoDB schemas
const messageSchema = new mongoose.Schema({
  messageId: { type: String, unique: true, required: true },
  chatId: { type: String, required: true },
  body: { type: String },
  fromMe: { type: Boolean, default: false },
  sender: { type: String },
  timestamp: { type: Date, default: Date.now },
  type: { type: String },
  hasMedia: { type: Boolean, default: false },
  mediaUrl: { type: String }, // S3 URL if media was uploaded
  mediaKey: { type: String }, // S3 key for media
  ack: { type: Number }, // Message acknowledgment status
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const chatSchema = new mongoose.Schema({
  chatId: { type: String, unique: true, required: true },
  name: { type: String },
  isGroup: { type: Boolean, default: false },
  participants: [{ type: String }],
  lastMessage: { type: String },
  lastMessageTime: { type: Date },
  unreadCount: { type: Number, default: 0 },
  profilePicture: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const Message = mongoose.model('Message', messageSchema);
const Chat = mongoose.model('Chat', chatSchema);

// Sync messages to MongoDB
app.post('/db/sync/message', authenticate, async (req, res) => {
  try {
    const { messageId, chatId, body, fromMe, sender, timestamp, type, hasMedia, mediaUrl, mediaKey, ack } = req.body;

    if (!messageId || !chatId) {
      return res.status(400).json({ error: 'messageId and chatId required' });
    }

    const message = await Message.findOneAndUpdate(
      { messageId },
      {
        messageId,
        chatId,
        body,
        fromMe,
        sender,
        timestamp: new Date(timestamp * 1000),
        type,
        hasMedia,
        mediaUrl,
        mediaKey,
        ack,
        updatedAt: new Date()
      },
      { upsert: true, new: true }
    );

    res.json({ success: true, message });
  } catch (err) {
    console.error('DB Sync Message Error:', err);
    res.status(500).json({ error: 'Failed to sync message', details: err.message });
  }
});

// Sync chats to MongoDB
app.post('/db/sync/chat', authenticate, async (req, res) => {
  try {
    const { chatId, name, isGroup, participants, lastMessage, lastMessageTime, unreadCount, profilePicture } = req.body;

    if (!chatId) {
      return res.status(400).json({ error: 'chatId required' });
    }

    const chat = await Chat.findOneAndUpdate(
      { chatId },
      {
        chatId,
        name,
        isGroup,
        participants,
        lastMessage,
        lastMessageTime: lastMessageTime ? new Date(lastMessageTime * 1000) : new Date(),
        unreadCount,
        profilePicture,
        updatedAt: new Date()
      },
      { upsert: true, new: true }
    );

    res.json({ success: true, chat });
  } catch (err) {
    console.error('DB Sync Chat Error:', err);
    res.status(500).json({ error: 'Failed to sync chat', details: err.message });
  }
});

// Get messages from MongoDB
app.get('/db/messages/:chatId', authenticate, async (req, res) => {
  try {
    const { chatId } = req.params;
    const limit = parseInt(req.query.limit) || 50;
    const skip = parseInt(req.query.skip) || 0;

    const messages = await Message.find({ chatId })
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Message.countDocuments({ chatId });

    res.json({
      messages: messages.reverse(),
      total,
      limit,
      skip
    });
  } catch (err) {
    console.error('DB Get Messages Error:', err);
    res.status(500).json({ error: 'Failed to retrieve messages', details: err.message });
  }
});

// Get chats from MongoDB
app.get('/db/chats', authenticate, async (req, res) => {
  try {
    const chats = await Chat.find({})
      .sort({ lastMessageTime: -1 })
      .limit(100);

    res.json({ chats });
  } catch (err) {
    console.error('DB Get Chats Error:', err);
    res.status(500).json({ error: 'Failed to retrieve chats', details: err.message });
  }
});

// Get single chat details from MongoDB
app.get('/db/chat/:chatId', authenticate, async (req, res) => {
  try {
    const { chatId } = req.params;

    const chat = await Chat.findOne({ chatId });
    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' });
    }

    res.json({ chat });
  } catch (err) {
    console.error('DB Get Chat Error:', err);
    res.status(500).json({ error: 'Failed to retrieve chat', details: err.message });
  }
});

// Delete chat history from MongoDB
app.delete('/db/chat/:chatId', authenticate, async (req, res) => {
  try {
    const { chatId } = req.params;

    await Message.deleteMany({ chatId });
    await Chat.findOneAndDelete({ chatId });

    res.json({ success: true, message: 'Chat history deleted' });
  } catch (err) {
    console.error('DB Delete Chat Error:', err);
    res.status(500).json({ error: 'Failed to delete chat', details: err.message });
  }
});

// Clear all chat history
app.delete('/db/clear-all', authenticate, async (req, res) => {
  try {
    await Message.deleteMany({});
    await Chat.deleteMany({});

    res.json({ success: true, message: 'All chat history cleared' });
  } catch (err) {
    console.error('DB Clear All Error:', err);
    res.status(500).json({ error: 'Failed to clear all chats', details: err.message });
  }
});

// Group details and management
app.get('/group/:groupId', authenticate, async (req, res) => {
  if (clientStatus !== 'connected') {
    return res.status(400).json({ error: 'Client not connected' });
  }
  try {
    const { groupId } = req.params;
    const chat = await client.getChatById(groupId);
    
    if (!chat.isGroup) {
      return res.status(400).json({ error: 'Chat is not a group' });
    }

    const participants = await chat.getParticipants();
    let profilePicUrl = null;
    try {
      profilePicUrl = await chat.getProfilePicUrl();
    } catch (e) {
      // Not available
    }

    let inviteCode = null;
    try {
      // Only admins can get invite codes usually, but we try
      inviteCode = await chat.getInviteCode();
    } catch (e) {
      // Not an admin or feature disabled
    }

    res.json({
      id: chat.id._serialized,
      name: chat.name,
      description: chat.description,
      owner: chat.owner?._serialized || null,
      createdAt: chat.createdAt ? chat.createdAt.toISOString() : null,
      profilePicUrl,
      participants: participants.map(p => ({
        id: p.id._serialized,
        phoneNumber: p.id.user,
        isAdmin: p.isAdmin,
        isSuperAdmin: p.isSuperAdmin
      })),
      inviteCode,
      isReadOnly: chat.isReadOnly,
      infoAdminsOnly: chat.infoAdminsOnly || false,
      unreadCount: chat.unreadCount,
      timestamp: chat.timestamp
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update group settings
app.post('/group/:groupId/settings', authenticate, async (req, res) => {
  if (clientStatus !== 'connected') {
    return res.status(400).json({ error: 'Client not connected' });
  }
  try {
    const { groupId } = req.params;
    const { subject, description, settings } = req.body;
    const chat = await client.getChatById(groupId);

    if (!chat.isGroup) {
      return res.status(400).json({ error: 'Chat is not a group' });
    }

    const results = {};

    if (subject) {
      await chat.setSubject(subject);
      results.subject = 'updated';
    }

    if (description !== undefined) {
      await chat.setDescription(description);
      results.description = 'updated';
    }

    if (settings) {
      if (settings.onlyAdminsCanSendMessages !== undefined) {
        await chat.setMessagesAdminsOnly(settings.onlyAdminsCanSendMessages);
        results.messagesAdminsOnly = 'updated';
      }
      if (settings.onlyAdminsCanEditInfo !== undefined) {
        await chat.setInfoAdminsOnly(settings.onlyAdminsCanEditInfo);
        results.infoAdminsOnly = 'updated';
      }
    }

    res.json({ success: true, results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

