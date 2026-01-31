/**
 * WhatsApp Bridge Server using @whiskeysockets/baileys@6.7.9
 * Based on competitor's working blue button implementation
 * Port: 3333
 */

const makeWASocket = require('@whiskeysockets/baileys').default;
const { DisconnectReason, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const express = require('express');
const cors = require('cors');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

let sock = null;
let connectionStatus = 'disconnected';
let currentQR = null;

// Session directory (multi-file auth like competitor uses)
const AUTH_DIR = './auth_session';

async function startWhatsApp() {
  console.log('[WhatsApp] Starting connection...');
  
  // Use multi-file auth state (exactly like competitor)
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);

  sock = makeWASocket({
    auth: state,
    printQRInTerminal: true,
    browser: ['SwarYoga CRM', 'Chrome', '1.0.0'],
    syncFullHistory: false
  });

  // Save session on credential update
  sock.ev.on('creds.update', saveCreds);

  // Connection status handler
  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      currentQR = qr;
      connectionStatus = 'qr_ready';
      console.log('\n[WhatsApp] QR Code ready - scan with phone:\n');
      qrcode.generate(qr, { small: true });
    }

    if (connection === 'close') {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
      
      console.log('[WhatsApp] Connection closed. Code:', statusCode);
      connectionStatus = 'disconnected';
      currentQR = null;

      if (shouldReconnect) {
        console.log('[WhatsApp] Reconnecting in 5 seconds...');
        setTimeout(() => startWhatsApp(), 5000);
      } else {
        console.log('[WhatsApp] Logged out - delete auth_session folder to reconnect');
      }
    }

    if (connection === 'open') {
      console.log('[WhatsApp] Connected successfully!');
      connectionStatus = 'connected';
      currentQR = null;
    }
  });

  // Incoming messages handler
  sock.ev.on('messages.upsert', async (msg) => {
    const m = msg.messages[0];
    if (!m.message || m.key.fromMe) return;

    const text =
      m.message.conversation ||
      m.message.extendedTextMessage?.text ||
      m.message?.imageMessage?.caption ||
      '';

    console.log('[WhatsApp] Message from:', m.key.remoteJid);
    console.log('[WhatsApp] Text:', text);

    // TODO: Store in DB or forward to webhook
  });

  return sock;
}

// Helper: Format JID
function formatJID(phone) {
  const clean = phone.toString().replace(/[^0-9]/g, '');
  return clean + '@s.whatsapp.net';
}

// ============ API ROUTES ============

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    whatsapp: connectionStatus,
    hasQR: !!currentQR,
    timestamp: new Date().toISOString()
  });
});

// Get status
app.get('/status', (req, res) => {
  res.json({
    connected: connectionStatus === 'connected',
    status: connectionStatus,
    sessionExists: fs.existsSync(AUTH_DIR),
    qrAvailable: !!currentQR
  });
});

// Send text message
app.post('/send', async (req, res) => {
  const { mobile, message, to, text } = req.body;
  const phone = mobile || to;
  const msg = message || text;

  if (!phone || !msg) {
    return res.status(400).json({ success: false, error: 'mobile and message required' });
  }

  if (!sock || connectionStatus !== 'connected') {
    return res.status(503).json({ success: false, error: 'WhatsApp not connected' });
  }

  try {
    const jid = formatJID(phone);
    const result = await sock.sendMessage(jid, { text: msg });
    console.log('[API] Text sent to:', jid);
    res.json({ success: true, id: result.key.id });
  } catch (err) {
    console.error('[API] Send error:', err.message);
    res.json({ success: false, error: err.message });
  }
});

// ============ BLUE BUTTONS API ============

// Send buttons (the blue button feature!)
app.post('/send-buttons', async (req, res) => {
  const { mobile, to, text, title, footer, buttons } = req.body;
  const phone = mobile || to;

  if (!phone || !buttons || !Array.isArray(buttons)) {
    return res.status(400).json({ 
      success: false, 
      error: 'mobile, text, and buttons array required' 
    });
  }

  if (!sock || connectionStatus !== 'connected') {
    return res.status(503).json({ success: false, error: 'WhatsApp not connected' });
  }

  try {
    const jid = formatJID(phone);
    
    // Format buttons as Baileys expects
    const buttonList = buttons.map((btn, idx) => ({
      buttonId: btn.id || `btn_${idx}`,
      buttonText: { displayText: btn.text || btn.title || btn.displayText },
      type: 1
    }));

    const buttonMessage = {
      text: text || 'Please select:',
      footer: footer || '',
      buttons: buttonList,
      headerType: 1
    };

    console.log('[API] Sending buttons to:', jid);
    console.log('[API] Button payload:', JSON.stringify(buttonMessage, null, 2));
    
    const result = await sock.sendMessage(jid, buttonMessage);
    console.log('[API] Button message sent, ID:', result.key.id);
    
    res.json({ success: true, id: result.key.id });
  } catch (err) {
    console.error('[API] Button error:', err.message);
    res.json({ success: false, error: err.message });
  }
});

// Send list message
app.post('/send-list', async (req, res) => {
  const { mobile, to, text, title, buttonText, sections } = req.body;
  const phone = mobile || to;

  if (!phone || !sections) {
    return res.status(400).json({ 
      success: false, 
      error: 'mobile, text, buttonText, and sections required' 
    });
  }

  if (!sock || connectionStatus !== 'connected') {
    return res.status(503).json({ success: false, error: 'WhatsApp not connected' });
  }

  try {
    const jid = formatJID(phone);
    
    const listMessage = {
      text: text || 'Please select from list:',
      footer: '',
      title: title || 'Options',
      buttonText: buttonText || 'View Options',
      sections: sections
    };

    console.log('[API] Sending list to:', jid);
    const result = await sock.sendMessage(jid, listMessage);
    
    res.json({ success: true, id: result.key.id });
  } catch (err) {
    console.error('[API] List error:', err.message);
    res.json({ success: false, error: err.message });
  }
});

// Send image with caption
app.post('/send-image', async (req, res) => {
  const { mobile, to, imageUrl, imagePath, caption } = req.body;
  const phone = mobile || to;

  if (!phone || (!imageUrl && !imagePath)) {
    return res.status(400).json({ 
      success: false, 
      error: 'mobile and (imageUrl or imagePath) required' 
    });
  }

  if (!sock || connectionStatus !== 'connected') {
    return res.status(503).json({ success: false, error: 'WhatsApp not connected' });
  }

  try {
    const jid = formatJID(phone);
    
    let imageContent;
    if (imageUrl) {
      imageContent = { url: imageUrl };
    } else {
      imageContent = fs.readFileSync(imagePath);
    }

    const result = await sock.sendMessage(jid, {
      image: imageContent,
      caption: caption || ''
    });
    
    res.json({ success: true, id: result.key.id });
  } catch (err) {
    console.error('[API] Image error:', err.message);
    res.json({ success: false, error: err.message });
  }
});

// Logout and clear session
app.post('/logout', async (req, res) => {
  try {
    if (sock) {
      await sock.logout();
    }
    // Delete auth folder
    if (fs.existsSync(AUTH_DIR)) {
      fs.rmSync(AUTH_DIR, { recursive: true, force: true });
    }
    connectionStatus = 'disconnected';
    currentQR = null;
    res.json({ success: true, message: 'Logged out and session cleared' });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// Restart connection
app.post('/restart', async (req, res) => {
  try {
    connectionStatus = 'restarting';
    if (sock) {
      sock.end();
    }
    setTimeout(() => startWhatsApp(), 2000);
    res.json({ success: true, message: 'Restarting connection...' });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// ============ START SERVER ============

const PORT = process.env.PORT || 3333;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[Server] WhatsApp Bridge running on port ${PORT}`);
  console.log('[Server] Using @whiskeysockets/baileys@6.7.9');
  console.log('[Server] Starting WhatsApp connection...');
  startWhatsApp();
});
