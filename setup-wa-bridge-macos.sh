#!/bin/bash
set -e

echo "🚀 WhatsApp Bridge Setup for macOS"
echo "===================================="

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 1. Check Node.js
echo -e "${BLUE}1. Checking Node.js...${NC}"
if ! command -v node &> /dev/null; then
    echo -e "${RED}Node.js not found. Install from https://nodejs.org/${NC}"
    exit 1
fi
NODE_VERSION=$(node -v)
echo -e "${GREEN}✓ Node.js ${NODE_VERSION}${NC}"

# 2. Install Chromium (required for WhatsApp Web)
echo -e "${BLUE}2. Installing Chromium via Homebrew...${NC}"
if ! command -v brew &> /dev/null; then
    echo -e "${YELLOW}Installing Homebrew first...${NC}"
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
fi

if ! command -v chromium &> /dev/null; then
    echo -e "${YELLOW}Installing chromium...${NC}"
    brew install chromium
else
    echo -e "${GREEN}✓ Chromium already installed${NC}"
fi

# 3. Create wa-bridge directory if not exists
echo -e "${BLUE}3. Setting up wa-bridge directory...${NC}"
BRIDGE_DIR="./deploy/wa-bridge"
mkdir -p "$BRIDGE_DIR"
cd "$BRIDGE_DIR"

# 4. Initialize npm if not already done
if [ ! -f "package.json" ]; then
    echo -e "${YELLOW}Initializing npm project...${NC}"
    npm init -y
fi

# 5. Install dependencies
echo -e "${BLUE}4. Installing wa-bridge dependencies...${NC}"
npm install --save whatsapp-web.js qrcode cors express dotenv

# 6. Create bridge server file
echo -e "${BLUE}5. Creating bridge server (server.js)...${NC}"
cat > server.js << 'EOF'
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
      executablePath: '/opt/homebrew/bin/chromium', // macOS Homebrew path
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

  client.initialize();
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
app.listen(PORT, () => {
  console.log(`🌐 WhatsApp Bridge running on http://localhost:${PORT}`);
  console.log(`📱 Bridge Secret: ${BRIDGE_SECRET}`);
  initializeClient();
});

process.on('SIGINT', () => {
  console.log('\nShutting down...');
  if (client) {
    client.destroy();
  }
  process.exit(0);
});
EOF

# 7. Create .env file
echo -e "${BLUE}6. Creating .env file...${NC}"
cat > .env << EOF
PORT=3333
WHATSAPP_BRIDGE_SECRET=swar-bridge-secret-2024
NODE_ENV=development
EOF

# 8. Create start script
echo -e "${BLUE}7. Creating start script...${NC}"
cat > start.sh << 'EOF'
#!/bin/bash
export WHATSAPP_BRIDGE_SECRET=${WHATSAPP_BRIDGE_SECRET:-swar-bridge-secret-2024}
export PORT=${PORT:-3333}
node server.js
EOF
chmod +x start.sh

echo -e "${GREEN}✓ wa-bridge setup complete!${NC}"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo "1. Start the bridge locally:"
echo "   cd deploy/wa-bridge && npm start"
echo ""
echo "2. Or use PM2 for background operation:"
echo "   npm install -g pm2"
echo "   pm2 start start.sh --name wa-bridge"
echo "   pm2 save"
echo ""
echo "3. Check bridge status:"
echo "   curl -H 'x-bridge-secret: swar-bridge-secret-2024' http://localhost:3333/status"
echo ""
echo "4. To tunnel to EC2 (from your Mac):"
echo "   ssh -R 3333:localhost:3333 -i /path/to/ec2-key.pem ubuntu@your-ec2-ip"
echo ""
