#!/bin/bash

# EC2 Bridge Setup Script - Paste this entire block into EC2 terminal

cd /home/ubuntu/wa-bridge

# Create package.json
cat > package.json << 'EOF'
{
  "name": "wa-bridge",
  "version": "1.0.0",
  "description": "WhatsApp Web bridge",
  "main": "index.js",
  "scripts": {
    "test": "echo \"Error: no test specified\" && exit 1"
  },
  "keywords": [],
  "author": "",
  "license": "ISC",
  "type": "commonjs",
  "dependencies": {
    "cors": "^2.8.5",
    "dotenv": "^17.2.3",
    "express": "^5.2.1",
    "qrcode": "^1.5.4",
    "whatsapp-web.js": "^1.34.4"
  }
}
EOF

echo "✓ Created package.json"

# Create .env
cat > .env << 'EOF'
PORT=3333
WHATSAPP_WEB_BRIDGE_SECRET=swar-bridge-secret-2024
WHATSAPP_WEB_ALLOWED_ORIGINS=https://crm.swaryoga.com,https://swaryoga.com,https://www.swaryoga.com
NEXT_BASE_URL=https://crm.swaryoga.com
WHATSAPP_CLIENT_ID=crm-whatsapp-session
CHROME_PATH=/usr/bin/google-chrome
EOF

echo "✓ Created .env"

# Create server.js
cat > server.js << 'EOSERVER'
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

app.get('/status', authMiddleware, (req, res) => {
  res.json({
    status: sessionReady ? 'connected' : (qrCode ? 'qr' : 'disconnected'),
    hasQr: !!qrCode,
    sessionReady,
    qr: qrCode || null,
    chatCount: chats.length
  });
});

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

app.get('/health', (req, res) => {
  res.json({ ok: true, port: PORT });
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`🌐 WhatsApp Bridge running on http://localhost:${PORT}`);
  console.log(`📱 Bridge Secret: ${BRIDGE_SECRET}`);
  initializeClient();
});

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

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled rejection at:', promise);
  console.error('Reason:', reason);
});
EOSERVER

echo "✓ Created server.js"

# Verify files
echo ""
echo "Files created:"
ls -lh

echo ""
echo "==================================="
echo "✓ Setup complete! Now run:"
echo "npm install"
echo "==================================="
