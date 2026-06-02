const express = require('express');
const qrcode = require('qrcode');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');

const app = express();
const PORT = process.env.PORT || 3333;
const BRIDGE_SECRET = process.env.WHATSAPP_BRIDGE_SECRET || 'swar-bridge-secret-2024';
const SESSION_DIR = process.env.SESSION_DIR || '/tmp/.wwebjs_auth';
const CLIENT_ID = process.env.CLIENT_ID || 'swar-bridge-session';

app.use(cors());
app.use(express.json({ limit: '50mb' }));

const authMiddleware = (req, res, next) => {
  const secret = req.headers['x-bridge-secret'];
  if (!secret || secret !== BRIDGE_SECRET) return res.status(401).json({ error: 'Unauthorized' });
  next();
};

let client = null;
let qrCode = null;
let sessionReady = false;
let messageQueue = [];
let isProcessingQueue = false;
let lastHealthyHeartbeat = Date.now();

// --- Connection management (prevents reconnect storms / self-conflict bans) ---
// Running two clients on the same LocalAuth session makes WhatsApp see a
// CONFLICT and kick the session ("logged in then suddenly logged out"); doing
// it repeatedly risks a ban. These guards ensure exactly ONE client at a time
// and back off instead of hammering reconnects.
let initInProgress = false;          // single-flight guard for initializeClient()
let reconnectTimer = null;           // pending scheduled reconnect
let reconnectAttempts = 0;           // for exponential backoff
let consecutiveStateFails = 0;       // heartbeat tolerance counter
let lastDisconnectReason = null;
const MAX_RECONNECT_DELAY_MS = 5 * 60 * 1000; // cap backoff at 5 minutes

function scheduleReconnect(reason) {
  lastDisconnectReason = reason;
  if (initInProgress) return;        // a fresh client is already coming up
  if (reconnectTimer) return;        // reconnect already queued — don't stack
  reconnectAttempts += 1;
  const base = Math.min(5000 * 2 ** (reconnectAttempts - 1), MAX_RECONNECT_DELAY_MS);
  const delay = base + Math.floor(Math.random() * 2000); // jitter avoids sync storms
  console.log(`[conn] reconnect #${reconnectAttempts} in ${Math.round(delay / 1000)}s (reason=${reason})`);
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    initializeClient();
  }, delay);
}

function getChromePath() {
  const paths = ['/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium-browser', '/snap/bin/chromium'];
  for (const p of paths) { if (fs.existsSync(p)) return p; }
  return undefined;
}

async function processMessageQueue() {
  if (isProcessingQueue) return;
  if (messageQueue.length === 0 || !sessionReady || !client) return;
  
  isProcessingQueue = true;
  console.log(`[queue] Processing ${messageQueue.length} messages...`);
  
  while (messageQueue.length > 0 && sessionReady && client) {
    const msg = messageQueue[0];
    try {
      // Guard: check if client is still valid
      if (!client) {
        console.error('[queue] ❌ Client became null, aborting queue processing');
        isProcessingQueue = false;
        return;
      }

      let targetJid = typeof msg.chatId === 'string' ? msg.chatId : (msg.chatId?._serialized || msg.chatId?.id || msg.chatId || '');
      targetJid = targetJid.trim().replace(/\s+/g, '');

      // Normalize JID
      if (!targetJid.includes('@c.us') && !targetJid.includes('@g.us')) {
        const pureNumber = targetJid.split('@')[0];
        try {
          const idInfo = await client.getNumberId(pureNumber);
          if (idInfo) {
            targetJid = idInfo._serialized;
          } else if (!targetJid.includes('@')) {
            targetJid = `${pureNumber}@c.us`;
          }
        } catch (e) {
          if (!targetJid.includes('@')) targetJid = `${pureNumber}@c.us`;
        }
      }

      console.log(`[queue] Attempting send to ${targetJid}`);
      
      // REMOVED: getChatById() prefetch causes 'markedUnread' crashes
      // Send directly without prefetching to avoid WhatsApp Web library issues

      // Wrap message send with timeout to prevent hanging
      const sendPromise = (async () => {
        if (msg.media) {
          console.log(`[queue] Sending media+text to ${targetJid}`);
          const mediaData = await MessageMedia.fromUrl(msg.media);
          await client.sendMessage(targetJid, mediaData, { caption: msg.message || '' });
        } else {
          console.log(`[queue] Sending text to ${targetJid}`);
          await client.sendMessage(targetJid, msg.message || '');
        }
      })();

      const timeoutMs = 20000; // 20 second timeout per message
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Send timeout (20s)')), timeoutMs);
      });

      await Promise.race([sendPromise, timeoutPromise]);
      
      console.log(`[queue] ✅ Success: ${targetJid}`);
      messageQueue.shift();
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (err) {
      console.error(`[queue] ❌ Error for ${msg.chatId}: ${err.message}`);
      
      if (err.message.includes('detached') || err.message.includes('not connected') || err.message.includes('timeout') || !client) {
        console.log('[queue] Client issue detected, scheduling reconnect...');
        scheduleReconnect('queue_client_issue');
        isProcessingQueue = false;
        return;
      }
      
      msg.retries = (msg.retries || 0) + 1;
      if (msg.retries >= 3) {
        console.error(`[queue] Max retries reached for ${msg.chatId}, skipping`);
        messageQueue.shift();
      } else {
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    }
  }
  isProcessingQueue = false;
}

async function initializeClient() {
  // Single-flight: never let two inits (or two clients) run at once. Overlapping
  // clients on the same session = WhatsApp CONFLICT = logout + ban risk.
  if (initInProgress) {
    console.log('[conn] init already in progress — skipping duplicate call');
    return;
  }
  initInProgress = true;
  console.log('📱 Starting WhatsApp Client...');

  // Fully tear down any previous client BEFORE creating a new one.
  if (client) {
    try { await client.destroy(); } catch (e) { /* ignore */ }
    client = null;
  }

  sessionReady = false;
  qrCode = null;

  try {
    client = new Client({
      authStrategy: new LocalAuth({ clientId: CLIENT_ID, dataPath: SESSION_DIR }),
      puppeteer: {
        headless: true,
        executablePath: getChromePath(),
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
      }
    });

    client.on('qr', (qr) => {
      qrcode.toDataURL(qr, (err, url) => { if (!err) qrCode = url; });
      console.log('✅ QR Code generated');
      sessionReady = false;
    });

    client.on('ready', () => {
      console.log('✓ Client is ready!');
      sessionReady = true;
      qrCode = null;
      lastHealthyHeartbeat = Date.now();
      reconnectAttempts = 0;       // success → reset backoff
      consecutiveStateFails = 0;
      processMessageQueue();
    });

    client.on('authenticated', () => { console.log('✓ Authenticated'); });

    client.on('auth_failure', (m) => {
      console.error('❌ Auth failure:', m || '');
      sessionReady = false;
      // Back off instead of instant re-init loop (loops get the number banned).
      scheduleReconnect('auth_failure');
    });

    client.on('disconnected', (reason) => {
      console.log('⚠ Disconnected. reason =', reason);
      sessionReady = false;
      // whatsapp-web.js tears the client down internally here. For a genuine
      // LOGOUT it clears the session and the next init shows a fresh QR; for
      // transient reasons (NAVIGATION/TIMEOUT) the session survives. Either way,
      // reconnect with backoff rather than a tight loop.
      scheduleReconnect(reason || 'disconnected');
    });

    await client.initialize();
  } catch (err) {
    console.error('❌ Init Error:', err && err.message ? err.message : err);
    scheduleReconnect('init_error');
  } finally {
    initInProgress = false;
  }
}

app.get('/status', authMiddleware, (req, res) => {
  res.json({
    status: sessionReady ? 'connected' : (qrCode ? 'qr' : 'initializing'),
    sessionReady,
    qr: qrCode || null,
    queueSize: messageQueue.length
  });
});

app.post('/send', authMiddleware, (req, res) => {
  const { chatId, message, to, media, url, caption, type } = req.body;
  const target = chatId || to;
  
  // Validate input
  if (!target) return res.status(400).json({ error: 'Missing target' });
  
  // Use either 'media' or 'url' for media content
  const finalMedia = media || url || null;
  // Use either 'message', 'caption' as body
  const finalMessage = message || caption || '';
  
  // Check client health
  if (!client) {
    console.error('❌ Client is null, returning 503');
    return res.status(503).json({ error: 'Client not initialized' });
  }

  if (!sessionReady) {
    console.warn(`⚠️  Session not ready (status: ${qrCode ? 'qr' : 'initializing'}), queuing message`);
    return res.status(503).json({ error: 'Session not ready, queuing message' });
  }
  
  messageQueue.push({ 
    chatId: target, 
    message: finalMessage, 
    media: finalMedia,
    type: type || (finalMedia ? 'media' : 'text')
  });
  res.json({ success: true, queueSize: messageQueue.length });
  processMessageQueue();
});

setInterval(async () => {
  if (!client || !sessionReady || initInProgress) return;
  try {
    const state = await client.getState();
    if (state === 'CONNECTED') {
      lastHealthyHeartbeat = Date.now();
      consecutiveStateFails = 0;
      return;
    }
    consecutiveStateFails += 1;
    console.warn(`[hb] state=${state} fails=${consecutiveStateFails}`);
  } catch (e) {
    consecutiveStateFails += 1;
  }
  // Only reconnect after SUSTAINED failure — a single transient getState()
  // error must never tear down a healthy, logged-in session.
  if (consecutiveStateFails >= 3 && Date.now() - lastHealthyHeartbeat > 90000) {
    console.warn('[hb] session sustained-unhealthy, scheduling reconnect');
    consecutiveStateFails = 0;
    scheduleReconnect('heartbeat');
  }
}, 30000);

// Get messages for a chat
app.get('/messages/:chatId', authMiddleware, async (req, res) => {
  try {
    const { chatId } = req.params;
    if (!chatId) return res.status(400).json({ error: 'Missing chatId' });
    
    if (!client || !sessionReady) {
      return res.status(503).json({ error: 'Client not ready' });
    }

    const chat = await client.getChatById(chatId);
    if (!chat) {
      return res.status(404).json({ error: 'Chat not found', chatId });
    }

    // Fetch messages (limit to last 50)
    const messages = await chat.fetchMessages({ limit: 50 });
    const msgData = messages.map(msg => {
      // Robust media detection: only mark as media if it's not a plain text message
      const type = msg.type || 'chat';
      const supportsMedia = ['image', 'video', 'audio', 'ptt', 'document', 'sticker'].includes(type);
      const hasMedia = supportsMedia && msg.hasMedia;

      return {
        id: msg.id._serialized,
        body: msg.body,
        from: msg.from,
        to: msg.to,
        timestamp: msg.timestamp,
        isFromMe: msg.isFromMe,
        type: type,
        hasMedia: hasMedia,
        mimetype: msg.mimetype || null,
      };
    });

    res.json({ messages: msgData, count: msgData.length });
  } catch (err) {
    console.error(`[messages] Error for ${req.params.chatId}:`, err.message);
    res.status(500).json({ error: err.message });
  }
});

// Download media for a specific message id (base64)
// Used by CRM UI: GET /messages/media/:msgId
app.get('/messages/media/:msgId', authMiddleware, async (req, res) => {
  try {
    const rawId = req.params?.msgId;
    const msgId = rawId ? decodeURIComponent(String(rawId)) : '';

    if (!msgId) return res.status(400).json({ error: 'Missing msgId' });

    if (!client || !sessionReady) {
      return res.status(503).json({ error: 'Client not ready' });
    }

    // Download can sometimes hang; protect with timeout.
    const timeoutMs = 25000;
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`Media download timeout (${timeoutMs}ms)`)), timeoutMs);
    });

    const mediaPromise = (async () => {
      const message = await client.getMessageById(msgId);
      if (!message) return null;
      if (!message.hasMedia) {
        const err = new Error('Message has no media');
        err.code = 'NO_MEDIA';
        throw err;
      }
      const media = await message.downloadMedia();
      return { message, media };
    })();

    const result = await Promise.race([mediaPromise, timeoutPromise]);
    if (!result) {
      return res.status(404).json({ error: 'Message not found', msgId });
    }

    const { media } = result;
    if (!media || !media.data) {
      return res.status(404).json({ error: 'Media not available', msgId });
    }

    return res.json({
      mimetype: media.mimetype,
      data: media.data,
      filename: media.filename || null,
    });
  } catch (err) {
    const msg = err && err.message ? err.message : 'Unknown error';
    const code = err && err.code ? err.code : null;
    if (code === 'NO_MEDIA') {
      return res.status(404).json({ error: msg });
    }
    console.error(`[messages/media] Error for ${req.params?.msgId}:`, msg);
    return res.status(500).json({ error: msg });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🌐 Bridge on ${PORT}`);
  initializeClient();
});
