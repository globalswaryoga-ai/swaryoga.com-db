const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const fs = require('fs');
const path = require('path');

function getNextBaseUrl() {
  const raw =
    process.env.NEXT_BASE_URL ||
    process.env.APP_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    'http://localhost:3001';
  return String(raw).replace(/\/+$/, '');
}

async function postInboundToCrm({ from, body, timestamp, waMessageId }) {
  const secret = process.env.WHATSAPP_WEB_BRIDGE_SECRET;
  if (!secret) {
    console.log('⚠️ WHATSAPP_WEB_BRIDGE_SECRET not set; inbound messages will not be saved to CRM');
    return;
  }

  const url = `${getNextBaseUrl()}/api/admin/crm/whatsapp/inbound`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-WhatsApp-Bridge-Secret': secret,
      },
      body: JSON.stringify({ from, body, timestamp, waMessageId }),
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      console.error(`❌ Failed to post inbound to CRM (${res.status}): ${txt.slice(0, 300)}`);
    }
  } catch (e) {
    console.error('❌ Failed to post inbound to CRM:', e.message);
  }
}

// Create Express app
const app = express();

// CORS (needed because Next dev server runs on a different port, e.g. 3000-3010)
// Allow explicit origins via env, otherwise allow any localhost origin.
const allowedOrigins = (process.env.WHATSAPP_WEB_ALLOWED_ORIGINS || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

app.use((req, res, next) => {
  const origin = req.headers.origin;

  let allowOrigin = '';
  if (origin) {
    const isLocalhost = /^https?:\/\/localhost(?::\d+)?$/i.test(origin);
    if (allowedOrigins.length > 0) {
      if (allowedOrigins.includes(origin)) allowOrigin = origin;
    } else if (isLocalhost) {
      // Default: permissive for local dev across ports (safe enough for localhost only)
      allowOrigin = origin;
    }
  }

  if (allowOrigin) {
    res.setHeader('Access-Control-Allow-Origin', allowOrigin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  next();
});

app.use(express.json());

// Create HTTP server for WebSocket
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// WhatsApp client
let client = null;
let currentQR = null;
let isAuthenticated = false;
let clientConnecting = false;

// Connected WebSocket clients
const connectedClients = new Set();

// Function to clear stale WhatsApp sessions
function clearStaleSessions() {
  try {
    const authDir = path.join(process.cwd(), '.wwebjs_auth');
    if (fs.existsSync(authDir)) {
      const files = fs.readdirSync(authDir);
      console.log(`Found ${files.length} existing sessions in ${authDir}`);
      // Note: Don't auto-delete, just log. User can manually clear if needed.
    }
  } catch (err) {
    console.log('Session directory check: ' + err.message);
  }
}

// Initialize WhatsApp client
function initializeClient() {
  if (client) {
    console.log('⚠️ Client already exists, destroying old instance...');
    client.destroy().catch(err => console.error('Error destroying client:', err));
    client = null;
  }

  const clientId = process.env.WHATSAPP_CLIENT_ID || 'crm-whatsapp-session';

  console.log('🔧 Creating new WhatsApp client with clientId:', clientId);
  
  client = new Client({
    authStrategy: new LocalAuth({ clientId }),
    puppeteer: {
      headless: 'new', // Use new headless mode for better compatibility
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-gpu',
        '--disable-dev-shm-usage',
        '--disable-software-rasterizer',
        '--disable-extensions',
        '--disable-plugins',
        '--disable-default-apps',
        '--disable-sync',
        '--no-first-run',
      ],
      timeout: 60000, // 60 second timeout for browser launch
    },
  });

  // QR Event - Send to all connected WebSocket clients
  let qrRetryCount = 0;
  const maxQrRetries = 5;
  let lastQrTime = 0;

  client.on('qr', (qr) => {
    const now = Date.now();
    
    console.log(`\n📱 QR Event fired at ${new Date().toLocaleTimeString()}`);
    console.log(`   QR Type: ${typeof qr}`);
    console.log(`   QR Length: ${qr ? qr.length : 'null'}`);
    console.log(`   QR Preview: ${qr ? qr.substring(0, 50) + '...' : 'null'}`);
    
    // Validate QR string
    if (!qr || typeof qr !== 'string' || qr.trim() === '') {
      qrRetryCount++;
      const timeSinceLastQr = now - lastQrTime;
      
      console.error(`\n❌ Invalid QR - Attempt ${qrRetryCount}/${maxQrRetries}`);
      console.error(`   Received: ${typeof qr}`);
      console.error(`   Value: "${qr}"`);
      console.error(`   Time since last QR: ${timeSinceLastQr}ms`);
      
      if (qrRetryCount >= maxQrRetries) {
        console.error('\n❌ Max QR retries reached. Starting recovery sequence...');
        
        broadcastMessage({
          type: 'error',
          error: 'WhatsApp Web is not responding. Clearing session and restarting...',
          action: 'reset',
          retryCount: qrRetryCount,
          timestamp: new Date().toISOString(),
        });
        
        // Force disconnect
        if (client) {
          client.destroy().catch(err => console.error('Destroy error:', err.message));
          client = null;
        }
        
        qrRetryCount = 0;
        isAuthenticated = false;
        clientConnecting = false;
        currentQR = null;
        
        // Attempt recovery after longer delay
        setTimeout(() => {
          console.log('\n🔄 Recovery attempt: Reinitializing WhatsApp client...');
          initializeClient();
        }, 8000);
      }
      
      return;
    }

    // ✅ Valid QR received
    qrRetryCount = 0;
    lastQrTime = now;
    currentQR = qr;
    isAuthenticated = false;
    clientConnecting = true;

    console.log('\n✅ VALID QR CODE RECEIVED');
    console.log(`   Length: ${qr.length} characters`);
    console.log(`   Timestamp: ${new Date().toLocaleTimeString()}`);

    // Convert QR string to PNG image
    const qrOptions = {
      type: 'image/png',
      width: 400, // Larger size for better scanning
      margin: 2,
      errorCorrectionLevel: 'H',
      color: { 
        dark: '#000000', 
        light: '#FFFFFF' 
      },
      scale: 4, // 4x scale for better quality
    };

    qrcode.toDataURL(qr, qrOptions, (err, url) => {
      if (err) {
        console.error('❌ QR PNG generation failed:', err.message);
        console.error(`   Input length: ${qr.length}`);
        console.error(`   Input preview: ${qr.substring(0, 50)}...`);
        
        broadcastMessage({
          type: 'error',
          error: 'Failed to convert QR to image: ' + err.message,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Validate generated URL
      if (!url || typeof url !== 'string' || url.length === 0) {
        console.error('❌ QR data URL is invalid');
        console.error(`   Type: ${typeof url}`);
        console.error(`   Length: ${url ? url.length : 'null'}`);
        
        broadcastMessage({
          type: 'error',
          error: 'Generated QR image is invalid',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      if (!url.startsWith('data:image')) {
        console.error('❌ QR data URL has wrong format');
        console.error(`   Starts with: ${url.substring(0, 30)}`);
        
        broadcastMessage({
          type: 'error',
          error: 'QR image format is invalid',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // ✅ Successfully generated QR image
      console.log('✅ QR image generated successfully');
      console.log(`   Size: ${Math.round(url.length / 1024)}KB`);
      console.log(`   Format: ${url.substring(5, 30)}`);
      
      broadcastMessage({
        type: 'qr',
        data: url,
        expiresIn: 120, // 2 minute expiry
        generatedAt: new Date().toISOString(),
        instruction: 'Open WhatsApp on your phone > Linked Devices > Link a Device > Scan this QR',
      });
    });
  });

  // Ready Event - Successfully authenticated
  client.on('ready', () => {
    console.log('\n🎉 WhatsApp successfully authenticated and ready!');
    console.log(`   Timestamp: ${new Date().toLocaleTimeString()}`);
    isAuthenticated = true;
    currentQR = null;
    clientConnecting = false;

    broadcastMessage({
      type: 'authenticated',
      status: 'connected',
      message: 'WhatsApp Web connected successfully',
      timestamp: new Date().toISOString(),
    });
  });

  // Authentication Failure
  client.on('auth_failure', (msg) => {
    console.error('\n❌ WhatsApp Authentication Failed');
    console.error(`   Reason: ${msg}`);
    console.error(`   Timestamp: ${new Date().toLocaleTimeString()}`);
    isAuthenticated = false;
    clientConnecting = false;
    currentQR = null;

    broadcastMessage({
      type: 'error',
      error: 'Authentication failed: ' + (msg || 'Unknown reason'),
      action: 'retry',
      timestamp: new Date().toISOString(),
    });
  });

  // Disconnected Event
  client.on('disconnected', (reason) => {
    console.log('\n⚠️ WhatsApp Disconnected');
    console.log(`   Reason: ${reason}`);
    console.log(`   Timestamp: ${new Date().toLocaleTimeString()}`);
    isAuthenticated = false;
    currentQR = null;
    clientConnecting = false;

    // Preserve client reference for potential reconnection
    // Don't set to null immediately
    
    broadcastMessage({
      type: 'disconnected',
      reason: reason || 'Unknown',
      message: 'WhatsApp disconnected. You may need to re-authenticate.',
      timestamp: new Date().toISOString(),
    });
  });

  // Error Event
  client.on('error', (err) => {
    console.error('\n❌ WhatsApp Client Error');
    console.error(`   Message: ${err.message}`);
    console.error(`   Type: ${err.name}`);
    console.error(`   Timestamp: ${new Date().toLocaleTimeString()}`);
    
    broadcastMessage({
      type: 'error',
      error: 'WhatsApp client error: ' + err.message,
      errorType: err.name,
      timestamp: new Date().toISOString(),
    });
  });

  // Message received
  client.on('message', (msg) => {
    console.log('📨 Message received:', msg.from, '-', msg.body);

    broadcastMessage({
      type: 'message_received',
      from: msg.from,
      body: msg.body,
      timestamp: msg.timestamp,
    });

    // Save inbound messages into CRM so they show up from today onward.
    // Note: msg.from includes the WhatsApp suffix (e.g. 9198...@c.us). We'll pass it through;
    // the ingestion endpoint normalizes.
    postInboundToCrm({
      from: msg.from,
      body: msg.body,
      timestamp: msg.timestamp,
      waMessageId: msg.id ? (msg.id._serialized || msg.id.id || null) : null,
    });
  });

  // Initialize client and start listening for WhatsApp
  console.log('\n🚀 Starting WhatsApp Web Client Initialization');
  console.log(`   Client ID: ${clientId}`);
  console.log(`   Session Directory: .wwebjs_auth/`);
  console.log(`   Browser: Puppeteer with headless=new`);
  console.log(`   Timeout: 60 seconds`);
  console.log(`   Timestamp: ${new Date().toLocaleTimeString()}\n`);
  
  clearStaleSessions();
  
  // Start initialization
  client.initialize().catch((err) => {
    console.error('\n❌ Client initialization failed:');
    console.error(`   Error: ${err.message}`);
    console.error(`   Stack: ${err.stack}`);
    
    broadcastMessage({
      type: 'error',
      error: 'Failed to initialize WhatsApp: ' + err.message,
      critical: true,
      timestamp: new Date().toISOString(),
    });
    
    client = null;
  });
}

// Broadcast message to all connected WebSocket clients
function broadcastMessage(message) {
  connectedClients.forEach((ws) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  });
}

function getConnectedAccountInfo() {
  try {
    if (!client) return null;
    // whatsapp-web.js exposes basic info after auth
    const info = client.info;
    if (!info) return null;

    const wid = info.wid;
    const user = wid && typeof wid === 'object' ? wid.user : undefined;
    const server = wid && typeof wid === 'object' ? wid.server : undefined;
    const phone = user && server ? `${user}@${server}` : user || null;

    return {
      pushname: info.pushname || null,
      wid: wid ? (typeof wid === 'string' ? wid : (wid._serialized || null)) : null,
      phone,
      platform: info.platform || null,
    };
  } catch (e) {
    return null;
  }
}

// WebSocket connection handler
wss.on('connection', (ws) => {
  console.log(`\n📲 WebSocket client connected`);
  console.log(`   Total clients: ${connectedClients.size + 1}`);
  console.log(`   Client authenticated status: ${isAuthenticated}`);
  console.log(`   Client connecting status: ${clientConnecting}`);
  console.log(`   Has current QR: ${!!currentQR}`);
  
  connectedClients.add(ws);

  // Send current status immediately
  const statusMsg = {
    type: 'status',
    authenticated: isAuthenticated,
    connecting: clientConnecting,
    hasQR: !!currentQR,
    clientInitialized: !!client,
    account: isAuthenticated ? getConnectedAccountInfo() : null,
    message: isAuthenticated ? '✅ Already authenticated' : clientConnecting ? '⏳ Initializing...' : '🔄 Ready for QR scan',
    timestamp: new Date().toISOString(),
  };
  
  console.log(`   Sending status:`, statusMsg.message);
  ws.send(JSON.stringify(statusMsg));

  // If WhatsApp is already connected, immediately notify
  if (isAuthenticated) {
    console.log('   → Sending authenticated status');
    ws.send(JSON.stringify({
      type: 'authenticated',
      status: 'already_connected',
      timestamp: new Date().toISOString(),
    }));
  }
  
  // If QR exists, send it immediately
  if (currentQR && !isAuthenticated && client) {
    console.log('   → Generating and sending existing QR...');
    const qrOptions = {
      type: 'image/png',
      width: 400,
      margin: 2,
      errorCorrectionLevel: 'H',
      color: { dark: '#000000', light: '#FFFFFF' },
      scale: 4,
    };
    
    qrcode.toDataURL(currentQR, qrOptions, (err, url) => {
      if (!err && url) {
        console.log('   → QR sent to new WebSocket client');
        ws.send(JSON.stringify({
          type: 'qr',
          data: url,
          source: 'cached',
          timestamp: new Date().toISOString(),
        }));
      } else if (err) {
        console.error('   → Failed to send cached QR:', err.message);
      }
    });
  } else if (!client) {
    console.log('   → Client not yet initialized, waiting for QR event...');
  }

  // Handle incoming messages
  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data);
      console.log(`\n📥 WebSocket message received:`, msg.type);
      
      if (msg.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong', timestamp: new Date().toISOString() }));
      } else if (msg.type === 'init') {
        // Initialize WhatsApp client so it can emit a QR.
        // (Without this, clients will connect and only see status updates.)
        if (!client) {
          console.log('🚀 Initializing WhatsApp client (requested via WebSocket init)');
          try {
            initializeClient();
          } catch (err) {
            console.error('❌ Failed to initialize client:', err.message);
            ws.send(JSON.stringify({
              type: 'error',
              error: 'Failed to initialize WhatsApp client: ' + err.message,
              timestamp: new Date().toISOString(),
            }));
          }
        } else {
          console.log('ℹ️ WhatsApp client already initialized');
        }
      } else if (msg.type === 'disconnect') {
        console.log('🧹 Disconnect requested via WebSocket');
        try {
          if (client) {
            client.destroy();
            client = null;
          }
          isAuthenticated = false;
          currentQR = null;
          clientConnecting = false;

          broadcastMessage({
            type: 'disconnected',
            reason: 'User requested disconnect',
            timestamp: new Date().toISOString(),
          });

          ws.send(JSON.stringify({
            type: 'disconnected_ack',
            success: true,
            timestamp: new Date().toISOString(),
          }));
        } catch (err) {
          ws.send(JSON.stringify({
            type: 'error',
            error: 'Failed to disconnect: ' + (err?.message || String(err)),
            timestamp: new Date().toISOString(),
          }));
        }
      }
    } catch (err) {
      console.error('Failed to parse WebSocket message:', err.message);
    }
  });

  // Handle client disconnect
  ws.on('close', () => {
    console.log(`\n📴 WebSocket client disconnected`);
    connectedClients.delete(ws);
    console.log(`   Remaining clients: ${connectedClients.size}`);
  });

  // Handle errors
  ws.on('error', (err) => {
    console.error('❌ WebSocket error:', err.message);
  });
});

// Broadcast message to all connected WebSocket clients
function broadcastMessage(message) {
  if (connectedClients.size === 0) {
    console.log('📢 Broadcasting but no clients connected:', message.type);
    return;
  }
  
  let successCount = 0;
  connectedClients.forEach((ws) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
      successCount++;
    }
  });
  
  if (successCount > 0) {
    console.log(`   ✅ Broadcasted to ${successCount} client(s)`);
  }
}

// REST API Endpoints

// Get current status
app.get('/api/status', (req, res) => {
  res.json({
    authenticated: isAuthenticated,
    connecting: clientConnecting,
    hasQR: !!currentQR,
    connectedClients: connectedClients.size,
    account: isAuthenticated ? getConnectedAccountInfo() : null,
    timestamp: new Date().toISOString(),
  });
});

// Initialize client (REST)
app.post('/api/init', (req, res) => {
  try {
    if (!client) {
      initializeClient();
      return res.json({ success: true, message: 'Client initializing' });
    }
    res.json({ success: false, message: 'Client already initialized' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Disconnect client (REST)
app.post('/api/disconnect', (req, res) => {
  try {
    if (client) {
      client.destroy();
      client = null;
      isAuthenticated = false;
      currentQR = null;
      clientConnecting = false;
      
      broadcastMessage({
        type: 'disconnected',
        reason: 'User requested disconnect',
        timestamp: new Date().toISOString(),
      });

      return res.json({ success: true, message: 'Client disconnected' });
    }
    res.json({ success: false, message: 'No client to disconnect' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Send message
app.post('/api/send', async (req, res) => {
  const { phone, message } = req.body || {};

  if (!phone || !message) {
    return res.status(400).json({ success: false, error: 'phone and message required' });
  }

  if (!isAuthenticated) {
    return res.status(400).json({ success: false, error: 'WhatsApp not authenticated' });
  }

  try {
    if (!client) {
      return res.status(400).json({ success: false, error: 'Client not initialized' });
    }

    // Format phone number to WhatsApp format
    let chatId = phone.replace(/\D/g, '');
    if (!chatId.startsWith('+')) {
      chatId = '+' + chatId;
    }
    chatId = chatId + '@c.us';

    await client.sendMessage(chatId, message);
    res.json({ success: true, message: 'Message sent' });
  } catch (err) {
    console.error('Send message error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ ok: true, authenticated: isAuthenticated });
});

// Start server
const PORT = process.env.WHATSAPP_WEB_PORT || 3333;
server.listen(PORT, () => {
  console.log(`\n${'='.repeat(70)}`);
  console.log('🚀 WhatsApp Web Bridge Server Started Successfully');
  console.log(`${'='.repeat(70)}`);
  console.log(`\n📡 Server Configuration:`);
  console.log(`   Port: ${PORT}`);
  console.log(`   WebSocket URL: ws://localhost:${PORT}`);
  console.log(`   HTTP Base URL: http://localhost:${PORT}`);
  console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`   Time: ${new Date().toLocaleTimeString()}`);
  console.log(`\n📋 REST API Endpoints:`);
  console.log(`   GET  /health - Health check`);
  console.log(`   GET  /api/status - Get WhatsApp connection status`);
  console.log(`   POST /api/init - Initialize WhatsApp client`);
  console.log(`   POST /api/disconnect - Disconnect WhatsApp client`);
  console.log(`   POST /api/send - Send WhatsApp message (requires auth)`);
  console.log(`\n🔗 WebSocket Connection:`);
  console.log(`   URL: ws://localhost:${PORT}`);
  console.log(`   Receive Messages:`);
  console.log(`      {type: 'qr', data: '<base64-image>'} - QR code for scanning`);
  console.log(`      {type: 'authenticated'} - Successfully authenticated`);
  console.log(`      {type: 'error', error: '<message>'} - Error occurred`);
  console.log(`   Send Messages:`);
  console.log(`      {type: 'init'} - Request QR initialization`);
  console.log(`      {type: 'disconnect'} - Request disconnect`);
  console.log(`      {type: 'ping'} - Ping/keep-alive`);
  console.log(`\n💾 Session Information:`);
  console.log(`   Directory: ${path.resolve('.wwebjs_auth')}`);
  console.log(`   Persistence: Enabled (Saves session for faster re-auth)`);
  console.log(`\n📱 WhatsApp Web Library:`);
  console.log(`   Package: whatsapp-web.js`);
  console.log(`   Browser: Puppeteer (headless mode)`);
  console.log(`   QR Code: Auto-generated on first connection`);
  console.log(`\n${'='.repeat(70)}\n`);
});

module.exports = app;
