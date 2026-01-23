const express = require('express');
const qrcode = require('qrcode');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const axios = require('axios');

/**
 * Robust WhatsApp Web Bridge Server
 * Version: 2.1.0
 * Fixes: Memory cycles, initialization loops, media support, watchdog conflicts.
 */

const app = express();
const PORT = process.env.PORT || 3333;

// Support both common secret env var names to prevent watchdog conflicts
const BRIDGE_SECRET = process.env.WHATSAPP_WEB_BRIDGE_SECRET || 
                        process.env.WHATSAPP_BRIDGE_SECRET || 
                        'swar-bridge-secret-2024';

const SESSION_DIR = process.env.SESSION_DIR || './.wwebjs_auth';
const CLIENT_ID = process.env.CLIENT_ID || 'swar-bridge-session';
const DATA_PATH = path.resolve(SESSION_DIR);

// Ensure session directory exists
if (!fs.existsSync(DATA_PATH)) {
  fs.mkdirSync(DATA_PATH, { recursive: true });
}

// Memory Guard
setInterval(() => {
  const memoryUsage = process.memoryUsage().heapUsed / 1024 / 1024;
  if (memoryUsage > 800) {
    console.warn(\`[system] High Memory Usage: \${memoryUsage.toFixed(2)} MB\`);
  }
}, 60000);

// Helper: Fetch media from URL and convert to MessageMedia
async function getMediaFromUrl(url) {
  try {
    const response = await axios.get(url, { 
      responseType: 'arraybuffer',
      timeout: 15000,
      headers: { 'User-Agent': 'SwarYoga-Bridge/2.0' }
    });
    const b64 = Buffer.from(response.data, 'binary').toString('base64');
    const mime = response.headers['content-type'];
    return new MessageMedia(mime, b64);
  } catch (err) {
    console.error(\`[media] Failed to fetch from \${url}: \`, err.message);
    return null;
  }
}

// Middleware
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json({ limit: '50mb' }));

// Authentication middleware
const authMiddleware = (req, res, next) => {
  const secret = req.headers['x-bridge-secret'] || req.headers['x-whatsapp-web-bridge-secret'];
  if (!secret || secret !== BRIDGE_SECRET) {
    console.warn(\`[auth] Unauthorized access attempt from \${req.ip}\`);
    return res.status(401).json({ error: 'Unauthorized bridge access' });
  }
  next();
};

let client = null;
let qrCodeData = null;
let clientStatus = 'disconnected';
let sessionReady = false;
let messageQueue = [];
let isProcessingQueue = false;
let heartbeatTimer = null;

/**
 * Initialize WhatsApp Client
 * @param {boolean} forceRefresh - If true, deletes session data
 */
async function initializeClient(forceRefresh = false) {
  if (clientStatus === 'connecting') {
    console.log('[init] Already connecting, skipping...');
    return;
  }

  // Cleanup existing client if any
  if (client) {
    try {
      await client.destroy().catch(() => {});
    } catch (e) {}
    client = null;
  }

  if (forceRefresh) {
    console.log('[init] Force refresh requested. Clearing session data...');
    try {
      if (fs.existsSync(DATA_PATH)) {
        fs.rmSync(DATA_PATH, { recursive: true, force: true });
        fs.mkdirSync(DATA_PATH, { recursive: true });
      }
    } catch (e) {
      console.error('[init] Failed to clear session:', e.message);
    }
  }

  // Remove chrome lock files specifically
  const puppeteerData = path.join(DATA_PATH, `session-${CLIENT_ID}`);
  if (fs.existsSync(puppeteerData)) {
    console.log(`[init] Cleaning locks in ${puppeteerData}`);
    const lockFiles = ['SingletonLock', 'SingletonCookie', 'SingletonSocket'];
    lockFiles.forEach(f => {
      const lockPath = path.join(puppeteerData, f);
      try {
        if (fs.existsSync(lockPath)) {
          console.log(`[init] Force-removing lock: ${f}`);
          fs.unlinkSync(lockPath);
        }
      } catch (e) {
        console.error(`[init] Could not remove ${f}:`, e.message);
      }
    });

    // Also check for 'Default' subfolder locks which some versions of chrome use
    const defaultPath = path.join(puppeteerData, 'Default');
    if (fs.existsSync(defaultPath)) {
      ['SingletonLock', 'SingletonCookie', 'SingletonSocket'].forEach(f => {
        const lp = path.join(defaultPath, f);
        try { if (fs.existsSync(lp)) fs.unlinkSync(lp); } catch (e) {}
      });
    }
  }

  // EXPERIMENTAL: If forceRefresh, we use a slightly different path to bypass persistent locks
  let finalDataPath = DATA_PATH;
  if (forceRefresh) {
    const timestamp = Date.now();
    finalDataPath = `${DATA_PATH}_${timestamp}`;
    console.log(`[init] Using fresh session path: ${finalDataPath}`);
  }

  clientStatus = 'connecting';
  sessionReady = false;
  qrCodeData = null;

  console.log('[init] Starting WhatsApp Web Client...');
  
  client = new Client({
    authStrategy: new LocalAuth({
      clientId: CLIENT_ID,
      dataPath: finalDataPath
    }),
    puppeteer: {
      headless: true,
      handleSIGINT: false,
      handleSIGTERM: false,
      handleSIGHUP: false,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-gpu'
      ],
      executablePath: fs.existsSync('/usr/bin/google-chrome') ? '/usr/bin/google-chrome' :
                      fs.existsSync('/usr/bin/chromium-browser') ? '/usr/bin/chromium-browser' : undefined
    }
  });

  client.on('qr', (qr) => {
    console.log('[qr] QR Code received');
    qrCodeData = qr;
    clientStatus = 'qr';
  });

  client.on('ready', () => {
    console.log('[ready] WhatsApp Client is ready!');
    clientStatus = 'connected';
    sessionReady = true;
    qrCodeData = null;
    startHeartbeat();
  });

  client.on('authenticated', () => {
    console.log('[auth] WhatsApp Authenticated');
    clientStatus = 'authenticated';
  });

  client.on('auth_failure', (msg) => {
    console.error('[auth] Authentication failure:', msg);
    clientStatus = 'disconnected';
    sessionReady = false;
  });

  client.on('disconnected', (reason) => {
    console.log('[disconnect] Client disconnected:', reason);
    clientStatus = 'disconnected';
    sessionReady = false;
    setTimeout(() => {
      if (clientStatus === 'disconnected') initializeClient();
    }, 10000);
  });

  try {
    await client.initialize();
  } catch (err) {
    console.error('[init] Initialization error:', err.message);
    clientStatus = 'disconnected';
  }
}

function startHeartbeat() {
  if (heartbeatTimer) clearInterval(heartbeatTimer);
  heartbeatTimer = setInterval(async () => {
    if (sessionReady && client) {
      try {
        const state = await client.getState().catch(() => 'error');
        if (state !== 'CONNECTED') {
          console.warn(\`[heartbeat] Client state: \${state}\`);
        }
      } catch (e) {
        console.error('[heartbeat] Error:', e.message);
      }
    }
  }, 60000);
}

async function processMessageQueue() {
  if (isProcessingQueue || messageQueue.length === 0 || !sessionReady) return;
  isProcessingQueue = true;
  while (messageQueue.length > 0 && sessionReady) {
    const task = messageQueue[0];
    try {
      const formattedTo = task.chatId.includes('@') ? task.chatId : \`\${task.chatId}@c.us\`;
      let content = task.message;
      let options = {};
      if (task.media) {
        const media = await getMediaFromUrl(task.media);
        if (media) {
          content = media;
          options.caption = task.message;
        }
      }
      await client.sendMessage(formattedTo, content, options);
      messageQueue.shift();
      await new Promise(r => setTimeout(r, 2000));
    } catch (err) {
      console.error(\`[queue] Failed: \`, err.message);
      if (task.retryCount > 2) messageQueue.shift();
      else {
        task.retryCount = (task.retryCount || 0) + 1;
        messageQueue.push(messageQueue.shift());
      }
      break; 
    }
  }
  isProcessingQueue = false;
}

app.get('/status', authMiddleware, (req, res) => {
  res.json({ status: clientStatus, ready: sessionReady, hasQr: !!qrCodeData, queueSize: messageQueue.length });
});

app.get('/qr', authMiddleware, async (req, res) => {
  if (qrCodeData) {
    const url = await qrcode.toDataURL(qrCodeData);
    res.send(\`<img src="\${url}" style="display:block;margin:auto;">\`);
  } else if (sessionReady) res.send('<h1>Connected</h1>');
  else res.send('<h1>Initializing... Refresh in 10s</h1>');
});

app.post('/send', authMiddleware, async (req, res) => {
  const { to, chatId, message, url, media } = req.body;
  const target = chatId || to;
  if (!target) return res.status(400).json({ error: 'Missing recipient' });
  messageQueue.push({ chatId: target, message: message || '', media: url || media });
  res.json({ success: true, message: 'Queued' });
  processMessageQueue();
});

app.post('/restart', authMiddleware, async (req, res) => {
  initializeClient(req.query.force === 'true');
  res.json({ message: 'Restarting' });
});

app.post('/disconnect', authMiddleware, async (req, res) => {
  if (client) await client.logout().catch(() => {});
  initializeClient(true);
  res.json({ message: 'Logged out' });
});

app.get('/chats', authMiddleware, async (req, res) => {
  if (!sessionReady) return res.status(503).json({ error: 'Not connected' });
  try {
    const chats = await client.getChats();
    res.json(chats.slice(0, 10).map(c => ({ name: c.name, id: c.id._serialized })));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.listen(PORT, () => {
  console.log(\`Bridge v2.1.0 on port \${PORT}\`);
  initializeClient();
});
