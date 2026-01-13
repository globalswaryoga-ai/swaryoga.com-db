const express = require('express');
const qrcode = require('qrcode');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { Client, LocalAuth } = require('whatsapp-web.js');

const app = express();
const PORT = process.env.PORT || 3333;
const BRIDGE_SECRET = process.env.WHATSAPP_BRIDGE_SECRET || 'swar-bridge-secret-2024';

// Session data directory
const SESSION_DIR = path.join(__dirname, '.wwebjs_auth');

// Helper: Find Chrome executable
function getChromePath() {
  const possiblePaths = [
    process.env.CHROME_PATH,
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/opt/homebrew/bin/chromium',
    '/usr/bin/chromium-browser',
    '/usr/bin/google-chrome',
    '/snap/bin/chromium'
  ];
  
  for (const p of possiblePaths) {
    if (p && fs.existsSync(p)) {
      console.log(`✓ Using Chrome at: ${p}`);
      return p;
    }
  }
  
  console.warn('⚠ No Chrome/Chromium found. Puppeteer will attempt to download one.');
  return undefined;
}

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'x-bridge-secret']
}));
app.use(express.json());

// Authentication middleware
const authMiddleware = (req, res, next) => {
  const secret = req.headers['x-bridge-secret'];
  if (!secret || secret !== BRIDGE_SECRET) {
    return res.status(401).json({ error: 'Unauthorized bridge access' });
  }
  next();
};

// Global state
let client = null;
let qrCode = null;
let chats = [];
let sessionReady = false;

// Initialize WhatsApp client
function initializeClient() {
  console.log('Initializing WhatsApp client...');
  
  client = new Client({
    authStrategy: new LocalAuth({
      clientId: 'swar-yoga-qr',
      dataPath: SESSION_DIR
    }),
    puppeteer: {
      headless: true,
      // Try multiple possible Chrome/Chromium paths
      executablePath: getChromePath(),
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu'
      ]
    }
  });

  client.on('qr', (qr) => {
    console.log('New QR code received');
    qrcode.toDataURL(qr, (err, url) => {
      if (err) {
        console.error('QR generation error:', err);
        return;
      }
      qrCode = url;
    });
  });

  client.on('authenticated', () => {
    console.log('✓ Authenticated with WhatsApp');
    sessionReady = true;
  });

  client.on('ready', () => {
    console.log('✓ WhatsApp client ready');
    sessionReady = true;
    loadChats();
  });

  client.on('disconnected', () => {
    console.log('WhatsApp disconnected');
    sessionReady = false;
    qrCode = null;
  });

  client.on('message', (msg) => {
    console.log('New message:', msg.body.substring(0, 50));
    loadChats();
  });

  client.on('error', (err) => {
    console.error('WhatsApp client error:', err);
    sessionReady = false;
  });

  client.on('auth_failure', (err) => {
    console.error('WhatsApp authentication failed:', err);
    sessionReady = false;
    qrCode = null;
  });

  client.initialize().catch((err) => {
    console.error('Failed to initialize WhatsApp client:', err);
    sessionReady = false;
    // Attempt to reinitialize after delay
    setTimeout(() => {
      console.log('Attempting to reinitialize client...');
      initializeClient();
    }, 5000);
  });
}

async function loadChats() {
  try {
    chats = await client.getChats();
    console.log(`Loaded ${chats.length} chats`);
  } catch (err) {
    console.error('Error loading chats:', err);
  }
}

// Routes

// GET /status - Bridge status
app.get('/status', authMiddleware, (req, res) => {
  res.json({
    status: sessionReady ? 'connected' : (qrCode ? 'qr' : 'disconnected'),
    hasQr: !!qrCode,
    sessionReady,
    qr: qrCode || null,
    chatCount: chats.length
  });
});

// GET /qr - Get QR code
app.get('/qr', authMiddleware, (req, res) => {
  if (!qrCode) {
    return res.status(400).json({
      ok: false,
      status: 'disconnected',
      hasQr: false,
      message: 'QR is not available yet. Wait a few seconds or restart the bridge.'
    });
  }
  res.json({
    ok: true,
    qr: qrCode,
    hasQr: true
  });
});

// POST /connect - Reconnect
app.post('/connect', authMiddleware, (req, res) => {
  if (sessionReady) {
    return res.json({
      message: 'Already connected',
      status: 'connected'
    });
  }
  res.json({
    message: 'Initializing connection...',
    status: 'connecting'
  });
});

// POST /disconnect - Disconnect
app.post('/disconnect', authMiddleware, (req, res) => {
  if (client) {
    client.logout();
    sessionReady = false;
    qrCode = null;
    chats = [];
  }
  res.json({
    message: 'Disconnected',
    status: 'disconnected'
  });
});

// GET /chats - List chats
app.get('/chats', authMiddleware, (req, res) => {
  const formattedChats = chats.map(chat => ({
    id: chat.id._serialized,
    name: chat.name || chat.contact?.pushname || 'Unknown',
    lastMessage: chat.lastMessage ? {
      body: chat.lastMessage.body,
      timestamp: chat.lastMessage.timestamp
    } : null,
    unreadCount: chat.unreadCount
  }));
  res.json({ chats: formattedChats });
});

// GET /messages/:chatId - Get messages
app.get('/messages/:chatId', authMiddleware, async (req, res) => {
  try {
    const { chatId } = req.params;
    const chat = chats.find(c => c.id._serialized === chatId);
    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' });
    }
    const messages = await chat.fetchMessages({ limit: 50 });
    const formattedMessages = messages.map(msg => ({
      id: msg.id._serialized,
      body: msg.body,
      fromMe: msg.fromMe,
      timestamp: msg.timestamp,
      author: msg.author || msg.from
    }));
    res.json({ messages: formattedMessages });
  } catch (err) {
    console.error('Error fetching messages:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /send - Send message
app.post('/send', authMiddleware, async (req, res) => {
  try {
    const { chatId, message } = req.body;
    if (!chatId || !message) {
      return res.status(400).json({ error: 'Missing chatId or message' });
    }
    const chat = chats.find(c => c.id._serialized === chatId);
    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' });
    }
    await chat.sendMessage(message);
    res.json({ success: true, message: 'Message sent' });
  } catch (err) {
    console.error('Error sending message:', err);
    res.status(500).json({ error: err.message });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ ok: true, port: PORT });
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`🌐 WhatsApp Bridge running on http://localhost:${PORT}`);
  console.log(`📱 Bridge Secret: ${BRIDGE_SECRET}`);
  initializeClient();
});

// Handle server errors
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use`);
    process.exit(1);
  } else {
    console.error('Server error:', err);
  }
});

process.on('SIGINT', () => {
  console.log('\nShutting down gracefully...');
  if (client) {
    client.destroy().catch(err => {
      console.error('Error destroying client:', err);
    });
  }
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\nTerminating gracefully...');
  if (client) {
    client.destroy().catch(err => {
      console.error('Error destroying client:', err);
    });
  }
  process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
  console.error('Stack trace:', err.stack);
  if (client) {
    client.destroy().catch(() => {
      process.exit(1);
    });
  } else {
    process.exit(1);
  }
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled rejection at:', promise);
  console.error('Reason:', reason);
  // Don't exit on unhandled rejections, just log them
});
