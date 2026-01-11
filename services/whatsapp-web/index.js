const { Client, LocalAuth, MessageMedia, Buttons } = require('whatsapp-web.js');
const express = require('express');
const http = require('http');
const path = require('path');
const fs = require('fs');
const { Server } = require('socket.io');
const qrcode = require('qrcode');
const cors = require('cors');
require('dotenv').config();

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

const BRIDGE_PORT = process.env.WHATSAPP_WEB_PORT || 3333;
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
  ];
  for (const p of systemCandidates) {
    if (fs.existsSync(p)) return p;
  }

  return undefined;
};

let qrCodeData = null;
let clientStatus = 'disconnected'; // disconnected, qr, connecting, connected

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

client.on('qr', (qr) => {
  console.log('QR RECEIVED', qr);
  qrCodeData = qr;
  clientStatus = 'qr';
  io.emit('qr', qr);
});

client.on('ready', () => {
  console.log('CLIENT READY');
  qrCodeData = null;
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
  io.emit('status', 'auth_failure');
});

client.on('disconnected', (reason) => {
  console.log('CLIENT DISCONNECTED', reason);
  clientStatus = 'disconnected';
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
client.on('message', async (msg) => {
  console.log('MESSAGE RECEIVED', msg.body);
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
  res.json({ status: clientStatus, hasQr: !!qrCodeData });
});

app.get('/qr', async (req, res) => {
  if (!qrCodeData) {
    return res.status(404).json({ error: 'QR code not available' });
  }
  try {
    const qrImage = await qrcode.toDataURL(qrCodeData);
    res.json({ qr: qrImage, raw: qrCodeData });
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate QR image' });
  }
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
    const filtered = chats
      .slice(0, 100) // Increase limit slightly
      .map(c => ({
        id: {
            _serialized: c.id._serialized,
            user: c.id.user,
            server: c.id.server
        },
        name: c.name,
        isGroup: c.isGroup,
        unreadCount: c.unreadCount,
        timestamp: c.timestamp,
        lastMessage: c.lastMessage ? {
          body: c.lastMessage.body,
          fromMe: c.lastMessage.fromMe
        } : null
      }));
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
    const formatted = messages.map(m => ({
        id: m.id._serialized,
        body: m.body,
        fromMe: m.fromMe,
        timestamp: m.timestamp,
        type: m.type,
        hasMedia: m.hasMedia,
        ack: m.ack,
        // we omit mediaData here to keep response small/fast
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

server.listen(BRIDGE_PORT, () => {
  console.log(`WhatsApp Bridge listening on port ${BRIDGE_PORT}`);
});

