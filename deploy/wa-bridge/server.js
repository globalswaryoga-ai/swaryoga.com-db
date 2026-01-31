const express = require('express');
const qrcode = require('qrcode');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { Client, LocalAuth, MessageMedia, Buttons, List } = require('whatsapp-web.js');
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
  const { to, chatId, message, url, media, type, buttons, footer } = req.body;
  const target = chatId || to;
  if (!target) return res.status(400).json({ error: 'Missing recipient' });
  
  // If buttons are provided, use the buttons endpoint logic
  if (type === 'buttons' || (buttons && Array.isArray(buttons) && buttons.length > 0)) {
    if (!sessionReady || !client) {
      return res.status(503).json({ error: 'WhatsApp not connected', status: clientStatus });
    }
    
    try {
      const formattedTo = target.includes('@') ? target : `${target}@c.us`;
      const buttonList = buttons.slice(0, 3).map((btn, idx) => ({
        id: `btn_${idx}_${Date.now()}`,
        body: typeof btn === 'string' ? btn : (btn.text || btn.body || btn.title || `Button ${idx + 1}`)
      }));
      
      const buttonMessage = new Buttons(
        message || '',
        buttonList,
        undefined,
        footer || 'Swar Yoga'
      );
      
      console.log(`[send-buttons] Sending to ${formattedTo}`);
      const result = await client.sendMessage(formattedTo, buttonMessage);
      
      return res.json({ 
        success: true, 
        messageId: result?.id?._serialized,
        status: 'sent',
        type: 'buttons'
      });
    } catch (err) {
      console.error('[send-buttons] Failed, trying text fallback:', err.message);
      // Fall through to text fallback
      const buttonTexts = buttons.map((b, i) => `${i + 1}. ${typeof b === 'string' ? b : b.text || b.body}`).join('\n');
      const fallbackMessage = `${message || ''}\n\n📲 Reply with number:\n${buttonTexts}`;
      messageQueue.push({ chatId: target, message: fallbackMessage, media: url || media });
      res.json({ success: true, message: 'Queued as text (buttons fallback)' });
      processMessageQueue();
      return;
    }
  }
  
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

/**
 * BLUE BUTTONS - Interactive Message with Buttons
 * Sends a message with clickable blue buttons (up to 3 buttons)
 * 
 * POST /send-buttons
 * Body: {
 *   to: "919876543210",
 *   body: "Choose an option:",
 *   buttons: ["Option 1", "Option 2", "Option 3"],  // Max 3 buttons
 *   footer: "Swar Yoga",  // Optional footer text
 *   title: "Menu"  // Optional title/header
 * }
 */
app.post('/send-buttons', authMiddleware, async (req, res) => {
  if (!sessionReady || !client) {
    return res.status(503).json({ error: 'WhatsApp not connected', status: clientStatus });
  }

  const { to, chatId, body, message, buttons, footer, title, header } = req.body;
  const target = to || chatId;
  const messageBody = body || message || '';
  const footerText = footer || 'Swar Yoga';
  const headerText = title || header || '';

  if (!target) {
    return res.status(400).json({ error: 'Missing recipient (to or chatId)' });
  }

  if (!buttons || !Array.isArray(buttons) || buttons.length === 0) {
    return res.status(400).json({ error: 'Missing or empty buttons array' });
  }

  if (buttons.length > 3) {
    return res.status(400).json({ error: 'Maximum 3 buttons allowed' });
  }

  try {
    const formattedTo = target.includes('@') ? target : `${target}@c.us`;
    
    // Format buttons for whatsapp-web.js
    const buttonList = buttons.slice(0, 3).map((btn, idx) => ({
      id: `btn_${idx}_${Date.now()}`,
      body: typeof btn === 'string' ? btn : (btn.text || btn.body || btn.title || `Button ${idx + 1}`)
    }));

    // Create Buttons message
    const buttonMessage = new Buttons(
      messageBody,           // Body text
      buttonList,            // Buttons array
      headerText || undefined, // Title (optional)
      footerText             // Footer
    );

    console.log(`[buttons] Sending to ${formattedTo}:`, { body: messageBody, buttons: buttonList });
    
    const result = await client.sendMessage(formattedTo, buttonMessage);
    
    console.log('[buttons] Message sent:', result?.id?._serialized || 'unknown');
    
    res.json({ 
      success: true, 
      messageId: result?.id?._serialized,
      status: 'sent'
    });
  } catch (err) {
    console.error('[buttons] Error:', err.message);
    
    // If buttons fail, try sending as plain text with button text appended
    try {
      const formattedTo = target.includes('@') ? target : `${target}@c.us`;
      const buttonTexts = buttons.map((b, i) => `${i + 1}. ${typeof b === 'string' ? b : b.text || b.body}`).join('\n');
      const fallbackMessage = `${messageBody}\n\n📲 Reply with number:\n${buttonTexts}`;
      
      const result = await client.sendMessage(formattedTo, fallbackMessage);
      console.log('[buttons] Sent as text fallback');
      
      res.json({ 
        success: true, 
        messageId: result?.id?._serialized,
        status: 'sent_as_text',
        note: 'Buttons not supported, sent as text'
      });
    } catch (fallbackErr) {
      res.status(500).json({ 
        error: 'Failed to send button message', 
        details: err.message,
        fallbackError: fallbackErr.message
      });
    }
  }
});

/**
 * INTERACTIVE LIST - List Message with Sections
 * Sends a message with a clickable list (shows as "See Options" button)
 * 
 * POST /send-list
 * Body: {
 *   to: "919876543210",
 *   body: "Choose from the list:",
 *   buttonText: "See Options",
 *   sections: [
 *     {
 *       title: "Section 1",
 *       rows: [
 *         { id: "opt1", title: "Option 1", description: "Description" },
 *         { id: "opt2", title: "Option 2" }
 *       ]
 *     }
 *   ],
 *   footer: "Swar Yoga",
 *   title: "Menu"
 * }
 */
app.post('/send-list', authMiddleware, async (req, res) => {
  if (!sessionReady || !client) {
    return res.status(503).json({ error: 'WhatsApp not connected', status: clientStatus });
  }

  const { to, chatId, body, message, buttonText, sections, footer, title } = req.body;
  const target = to || chatId;
  const messageBody = body || message || 'Please select an option:';
  const listButtonText = buttonText || 'See Options';
  const footerText = footer || 'Swar Yoga';
  const headerText = title || '';

  if (!target) {
    return res.status(400).json({ error: 'Missing recipient' });
  }

  if (!sections || !Array.isArray(sections) || sections.length === 0) {
    return res.status(400).json({ error: 'Missing or empty sections array' });
  }

  try {
    const formattedTo = target.includes('@') ? target : `${target}@c.us`;
    
    // Create List message
    const listMessage = new List(
      messageBody,      // Body
      listButtonText,   // Button text
      sections,         // Sections with rows
      headerText || undefined, // Title
      footerText        // Footer
    );

    console.log(`[list] Sending to ${formattedTo}`);
    
    const result = await client.sendMessage(formattedTo, listMessage);
    
    res.json({ 
      success: true, 
      messageId: result?.id?._serialized,
      status: 'sent'
    });
  } catch (err) {
    console.error('[list] Error:', err.message);
    res.status(500).json({ error: 'Failed to send list message', details: err.message });
  }
});

app.get('/chats', authMiddleware, async (req, res) => {
  if (!sessionReady) return res.status(503).json({ error: 'Not connected' });
  try {
    const chats = await client.getChats();
    res.json(chats.slice(0, 10).map(c => ({ name: c.name, id: c.id._serialized })));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

/**
 * TEST PAGE - Blue Buttons Test Interface
 * Access at: http://localhost:3333/test-buttons
 */
app.get('/test-buttons', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html>
<head>
  <title>WhatsApp Blue Buttons Test</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    * { box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f0f2f5; }
    h1 { color: #075e54; text-align: center; }
    .card { background: white; border-radius: 12px; padding: 20px; margin-bottom: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    label { display: block; margin-bottom: 5px; font-weight: 600; color: #333; }
    input, textarea { width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 8px; margin-bottom: 15px; font-size: 16px; }
    button { width: 100%; padding: 14px; border: none; border-radius: 8px; cursor: pointer; font-size: 16px; font-weight: 600; }
    .btn-primary { background: #25d366; color: white; }
    .btn-primary:hover { background: #20bd5a; }
    .btn-blue { background: #0084ff; color: white; margin-top: 10px; }
    .btn-blue:hover { background: #0073e6; }
    #result { padding: 15px; border-radius: 8px; margin-top: 15px; display: none; }
    .success { background: #d4edda; color: #155724; }
    .error { background: #f8d7da; color: #721c24; }
    .info { background: #e7f3ff; padding: 12px; border-radius: 8px; margin-bottom: 15px; font-size: 14px; color: #0c5460; }
    .blue-button-preview { display: inline-block; background: #0084ff; color: white; padding: 8px 16px; border-radius: 20px; margin: 5px; font-size: 14px; }
  </style>
</head>
<body>
  <h1>🔵 Blue Buttons Test</h1>
  
  <div class="card">
    <div class="info">
      <strong>💡 Blue Buttons:</strong> Interactive buttons that appear in WhatsApp. Users can tap to reply instantly!
      <br><br>
      <strong>Preview:</strong><br>
      <span class="blue-button-preview">Yes ✓</span>
      <span class="blue-button-preview">No ✗</span>
      <span class="blue-button-preview">Maybe</span>
    </div>
    
    <label>Phone Number (with country code)</label>
    <input type="text" id="phone" placeholder="919876543210">
    
    <label>Message Body</label>
    <textarea id="message" rows="3" placeholder="Would you like to join our yoga session?">Would you like to join our yoga session tomorrow at 6 AM?</textarea>
    
    <label>Button 1</label>
    <input type="text" id="btn1" placeholder="Yes, I'll join" value="Yes, I'll join ✓">
    
    <label>Button 2</label>
    <input type="text" id="btn2" placeholder="No, thanks" value="No, thanks ✗">
    
    <label>Button 3 (Optional)</label>
    <input type="text" id="btn3" placeholder="Maybe later" value="Remind me later">
    
    <label>Footer Text</label>
    <input type="text" id="footer" placeholder="Swar Yoga" value="Swar Yoga 🙏">
    
    <button class="btn-primary" onclick="sendButtons()">📤 Send with Blue Buttons</button>
    <button class="btn-blue" onclick="sendText()">📝 Send as Plain Text</button>
    
    <div id="result"></div>
  </div>
  
  <div class="card">
    <h3>📋 API Usage</h3>
    <pre style="background:#f5f5f5;padding:10px;border-radius:5px;overflow-x:auto;font-size:12px;">
POST /send-buttons
Headers: x-bridge-secret: YOUR_SECRET

Body:
{
  "to": "919876543210",
  "body": "Your message here",
  "buttons": ["Button 1", "Button 2", "Button 3"],
  "footer": "Swar Yoga"
}
    </pre>
  </div>

  <script>
    const SECRET = '${BRIDGE_SECRET}';
    
    async function sendButtons() {
      const phone = document.getElementById('phone').value.trim();
      const message = document.getElementById('message').value.trim();
      const btn1 = document.getElementById('btn1').value.trim();
      const btn2 = document.getElementById('btn2').value.trim();
      const btn3 = document.getElementById('btn3').value.trim();
      const footer = document.getElementById('footer').value.trim();
      
      if (!phone) return showResult('Please enter phone number', false);
      if (!message) return showResult('Please enter a message', false);
      if (!btn1 && !btn2) return showResult('Please enter at least one button', false);
      
      const buttons = [btn1, btn2, btn3].filter(b => b);
      
      try {
        const res = await fetch('/send-buttons', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-bridge-secret': SECRET },
          body: JSON.stringify({ to: phone, body: message, buttons, footer })
        });
        const data = await res.json();
        showResult(data.success ? '✅ Buttons sent! ' + JSON.stringify(data) : '❌ ' + data.error, data.success);
      } catch (err) {
        showResult('❌ Error: ' + err.message, false);
      }
    }
    
    async function sendText() {
      const phone = document.getElementById('phone').value.trim();
      const message = document.getElementById('message').value.trim();
      
      if (!phone || !message) return showResult('Please enter phone and message', false);
      
      try {
        const res = await fetch('/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-bridge-secret': SECRET },
          body: JSON.stringify({ to: phone, message })
        });
        const data = await res.json();
        showResult(data.success ? '✅ Text sent!' : '❌ ' + data.error, data.success);
      } catch (err) {
        showResult('❌ Error: ' + err.message, false);
      }
    }
    
    function showResult(msg, success) {
      const el = document.getElementById('result');
      el.textContent = msg;
      el.className = success ? 'success' : 'error';
      el.style.display = 'block';
    }
  </script>
</body>
</html>
  `);
});

app.listen(PORT, () => {
  console.log(\`Bridge v2.2.0 with Blue Buttons on port \${PORT}\`);
  initializeClient();
});
