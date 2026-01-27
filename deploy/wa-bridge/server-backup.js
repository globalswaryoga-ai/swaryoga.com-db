const express = require('express');
const qrcode = require('qrcode');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3333;
const BRIDGE_SECRET = process.env.WHATSAPP_BRIDGE_SECRET || 'swar-bridge-secret-2024';

const SESSION_ID = 'swar-yoga-persistent';
const SESSION_DIR = './.wwebjs_auth';
const DATA_PATH = path.resolve(SESSION_DIR);

if (!fs.existsSync(DATA_PATH)) fs.mkdirSync(DATA_PATH, { recursive: true });

async function getMediaFromUrl(url) {
  try {
    const response = await axios.get(url, { responseType: 'arraybuffer', timeout: 15000 });
    return new MessageMedia(response.headers['content-type'], Buffer.from(response.data, 'binary').toString('base64'));
  } catch (err) { 
    console.error('[media]', err.message); 
    return null; 
  }
}

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Auth middleware - allow unauthenticated for /qr and /status
const authMiddleware = (req, res, next) => {
  if (['/qr', '/status'].includes(req.path)) return next();
  const secret = req.headers['x-bridge-secret'] || req.headers['x-whatsapp-web-bridge-secret'];
  if (secret !== BRIDGE_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};
app.use(authMiddleware);

let client = null, qrCodeData = null, status = 'initializing', isReady = false;
let chatCache = new Map(); // Cache chats to avoid sync issues

async function bootstrap() {
  console.log('=== SWAR YOGA BRIDGE v3.2 ===');
  console.log('Session:', SESSION_ID);
  
  client = new Client({
    authStrategy: new LocalAuth({ clientId: SESSION_ID, dataPath: DATA_PATH }),
    puppeteer: {
      headless: true,
      args: [
        '--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas', '--no-first-run', '--no-zygote',
        '--single-process', '--disable-gpu', '--disable-extensions',
        '--disable-software-rasterizer', '--disable-features=IsolateOrigins,site-per-process',
        '--disable-site-isolation-trials', '--disable-web-security',
        '--allow-running-insecure-content', '--window-size=1920,1080',
        '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      ]
    },
    webVersionCache: {
      type: 'remote',
      remotePath: 'https://raw.githubusercontent.com/nicholasrossi0530/nicholasrossi0530.github.io/refs/heads/main/nicholasrossi0530.github.io/nicholasrossi0530-wwebjs-2.2412.1-patch.js'
    }
  });

  client.on('qr', qr => { 
    qrCodeData = qr; 
    status = 'qr_ready';
    isReady = false;
    console.log('[QR] New QR at', new Date().toISOString()); 
  });
  
  client.on('ready', async () => { 
    status = 'connected'; 
    qrCodeData = null;
    console.log('[READY] WhatsApp Connected!');
    // Wait for chats to sync
    console.log('[SYNC] Waiting for chats to sync...');
    await new Promise(r => setTimeout(r, 5000));
    try {
      const chats = await client.getChats();
      console.log('[SYNC] Loaded', chats.length, 'chats');
      // Cache the chats
      chats.forEach(chat => {
        chatCache.set(chat.id._serialized, chat);
      });
    } catch (e) {
      console.log('[SYNC] Chat load skipped:', e.message);
    }
    isReady = true;
    console.log('[READY] Bridge fully ready for messages');
  });
  
  client.on('authenticated', () => console.log('[AUTH] Authenticated'));
  
  client.on('auth_failure', msg => {
    console.error('[AUTH FAILED]', msg);
    status = 'auth_failed';
    isReady = false;
  });
  
  client.on('disconnected', reason => { 
    console.log('[DISCONNECTED]', reason);
    status = 'disconnected';
    isReady = false;
    chatCache.clear();
    setTimeout(() => process.exit(1), 3000);
  });

  // Webhook URL for forwarding incoming messages to CRM
  const CRM_WEBHOOK_URL = process.env.CRM_WEBHOOK_URL || 'https://crm.swaryoga.com/api/admin/crm/whatsapp/qr/webhook';

  // Handle incoming messages - forward to CRM
  client.on('message', async msg => {
    console.log('[MSG IN] From:', msg.from, 'Body:', msg.body ? msg.body.substring(0, 50) : '(no body)');
    
    // Skip status broadcasts
    if (msg.from === 'status@broadcast') return;
    
    // Cache the chat when we receive a message
    let chat = null;
    let contactPhone = null;
    try {
      chat = await msg.getChat();
      if (chat) chatCache.set(chat.id._serialized, chat);
      
      // Try to get actual phone number from contact (for @lid format)
      if (msg.from.includes('@lid')) {
        try {
          const contact = await msg.getContact();
          if (contact && contact.number) {
            contactPhone = contact.number + '@c.us';
            console.log('[MSG IN] Resolved @lid to phone:', contactPhone);
          }
        } catch (contactErr) {
          console.log('[MSG IN] Could not resolve contact phone:', contactErr.message);
        }
      }
    } catch (e) {
      console.log('[MSG IN] Chat/contact lookup failed:', e.message);
    }
    
    // Forward to CRM webhook
    try {
      // Use resolved phone number if available, otherwise use msg.from
      const resolvedFrom = contactPhone || msg.from;
      
      const payload = {
        from: resolvedFrom,
        fromLid: msg.from.includes('@lid') ? msg.from : null, // Keep original LID for reference
        to: msg.to,
        body: msg.body || '',
        timestamp: msg.timestamp,
        type: msg.type,
        hasMedia: msg.hasMedia,
        messageId: msg.id._serialized,
        isForwarded: msg.isForwarded,
        isStatus: msg.isStatus,
        contactName: chat?.name || null,
      };
      
      const webhookRes = await axios.post(CRM_WEBHOOK_URL, payload, {
        headers: { 
          'Content-Type': 'application/json',
          'x-bridge-secret': BRIDGE_SECRET 
        },
        timeout: 10000
      });
      console.log('[WEBHOOK] Forwarded to CRM:', webhookRes.status);
    } catch (webhookErr) {
      console.error('[WEBHOOK ERROR]', webhookErr.message);
    }
  });

  try { 
    await client.initialize(); 
  } catch (e) { 
    console.error('[FATAL]', e.message); 
    process.exit(1); 
  }
}

app.get('/qr', (req, res) => {
  if (qrCodeData) {
    qrcode.toDataURL(qrCodeData, (err, url) => {
      res.send('<html><body style="background:#111;color:#fff;text-align:center;padding:50px;font-family:sans-serif;"><div style="background:#fff;color:#000;display:inline-block;padding:30px;border-radius:20px;box-shadow:0 10px 40px rgba(0,0,0,0.5);"><h2>Swar Yoga Bridge v3.2</h2><img src="' + url + '" style="width:300px;"><p>Scan to connect</p></div></body></html>');
    });
  } else if (status === 'connected') {
    res.send('<html><body style="background:#111;color:#0f0;text-align:center;padding:100px;font-size:48px;">✅ Connected!</body></html>');
  } else {
    res.send('<html><body style="background:#111;color:#fff;text-align:center;padding:100px;font-size:24px;">⏳ ' + status + '... Refresh in 5s</body></html>');
  }
});

app.get('/status', (req, res) => res.json({ status, connected: status === 'connected', ready: isReady }));

app.post('/connect', (req, res) => {
  console.log('[CONNECT] Connection request received');
  res.json({ success: true, status, message: 'Connection initiated' });
});

app.post('/send', async (req, res) => {
  const { to, chatId, message, url, caption } = req.body;
  let target = chatId || to || '';
  
  // Normalize target to proper WhatsApp format
  if (!target.includes('@')) {
    target = target.replace(/\D/g, '') + '@c.us';
  }
  
  if (status !== 'connected') {
    return res.status(503).json({ error: 'Bridge not connected', status });
  }
  
  if (!isReady) {
    console.log('[SEND] Waiting for bridge to be fully ready...');
    await new Promise(r => setTimeout(r, 3000));
    if (!isReady) {
      return res.status(503).json({ error: 'Bridge not fully initialized yet', status });
    }
  }
  
  try {
    let content = message || '';
    let options = {};
    
    if (url) { 
      console.log('[SEND] Fetching media from:', url);
      const media = await getMediaFromUrl(url); 
      if (media) { 
        content = media; 
        options.caption = caption || message || ''; 
      } else {
        console.log('[SEND] Media fetch failed, sending as text with link');
        content = (message || '') + '\n' + url;
      }
    }
    
    console.log('[SEND] Sending to:', target, 'Content length:', typeof content === 'string' ? content.length : 'media');
    
    // Use standard sendMessage - the most reliable method
    const result = await client.sendMessage(target, content, options);
    
    console.log('[SEND OK] Message ID:', result.id._serialized);
    res.json({ success: true, id: result.id._serialized, messageId: result.id._serialized });
  } catch (e) { 
    console.error('[SEND ERROR]', e.message);
    res.status(500).json({ error: e.message }); 
  }
});

app.get('/chats', async (req, res) => {
  if (status !== 'connected' || !isReady) {
    return res.status(503).json({ error: 'Bridge not ready' });
  }
  try {
    const chats = await client.getChats();
    const chatList = chats.slice(0, 50).map(c => ({
      id: c.id._serialized,
      name: c.name || c.id.user,
      isGroup: c.isGroup,
      unreadCount: c.unreadCount || 0,
      timestamp: c.timestamp
    }));
    res.json({ success: true, chats: chatList });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});


// Get messages for a specific chat - Add this before app.listen()
app.get('/messages/:chatId', async (req, res) => {
  if (status !== 'connected') {
    return res.status(503).json({ error: 'Bridge not ready' });
  }
  try {
    const chatId = req.params.chatId;
    console.log('[MESSAGES] Fetching messages for:', chatId);
    
    const chat = await client.getChatById(chatId);
    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' });
    }
    
    // Mark as read
    try {
      await chat.sendSeen();
    } catch (e) {
      console.log('[MESSAGES] sendSeen failed (non-critical):', e.message);
    }
    
    const messages = await chat.fetchMessages({ limit: 50 });
    const formatted = messages.map(m => ({
      id: m.id._serialized,
      body: m.body,
      fromMe: m.fromMe,
      timestamp: m.timestamp,
      type: m.type,
      hasMedia: m.hasMedia,
      ack: m.ack
    }));
    
    console.log('[MESSAGES] Returning', formatted.length, 'messages');
    res.json({ success: true, messages: formatted });
  } catch (e) {
    console.error('[MESSAGES ERROR]', e.message);
    res.status(500).json({ error: e.message });
  }
});
app.post('/restart', (req, res) => {
  console.log('[RESTART] Restart requested');
  res.json({ success: true, message: 'Restarting...' });
  setTimeout(() => process.exit(1), 1000);
});


// Media endpoint - Add this after /messages/:chatId endpoint
app.get('/messages/media/:msgId', async (req, res) => {
  if (status !== 'connected') {
    return res.status(503).json({ error: 'Bridge not ready' });
  }
  try {
    const msgId = req.params.msgId;
    console.log('[MEDIA] Fetching media for message:', msgId);
    
    const msg = await client.getMessageById(msgId);
    if (!msg) {
      return res.status(404).json({ error: 'Message not found' });
    }
    
    if (!msg.hasMedia) {
      return res.status(404).json({ error: 'Message has no media' });
    }
    
    const media = await msg.downloadMedia();
    if (!media) {
      return res.status(404).json({ error: 'Failed to download media' });
    }
    
    console.log('[MEDIA] Downloaded media, type:', media.mimetype, 'size:', media.data?.length || 0);
    
    res.json({
      success: true,
      mimetype: media.mimetype,
      data: media.data, // base64 encoded
      filename: media.filename || null,
      dataUrl: `data:${media.mimetype};base64,${media.data}`
    });
  } catch (e) {
    console.error('[MEDIA ERROR]', e.message);
    res.status(500).json({ error: e.message });
  }
});

app.listen(PORT, () => { 
  console.log('Bridge listening on port', PORT); 
  bootstrap(); 
});
