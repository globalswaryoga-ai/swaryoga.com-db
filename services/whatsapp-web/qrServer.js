const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

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
    // Avoid log spam when WhatsApp receives many broadcasts (status@broadcast etc.).
    maybeLogMissingInboundSecret();
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

// CORS (browser access from CRM UI)
// - In production: set WHATSAPP_WEB_ALLOWED_ORIGINS (https://swaryoga.com,...)
// - In local dev: if allowlist isn't set, allow localhost origins across ports.
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
    } else if ((process.env.NODE_ENV || '') !== 'production' && isLocalhost) {
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
  // Include our custom auth header so browser preflights succeed when the CRM UI calls the bridge.
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, X-Requested-With, X-WhatsApp-Bridge-Secret'
  );

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
let activeSend = null;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Avoid spamming logs when WHATSAPP_WEB_BRIDGE_SECRET isn't configured.
let lastMissingInboundSecretLogAt = 0;
function maybeLogMissingInboundSecret() {
  const now = Date.now();
  if (now - lastMissingInboundSecretLogAt < 60_000) return;
  lastMissingInboundSecretLogAt = now;
  console.log('⚠️ WHATSAPP_WEB_BRIDGE_SECRET not set; inbound messages will not be saved to CRM');
}

// Diagnostics (helps debug "QR keeps refreshing" + "couldn't link device" situations)
let qrEventCount = 0;
let lastQrAt = null;
let lastAuthFailure = null;
let lastDisconnected = null;
let lastClientError = null;
let lastReadyAt = null;

// IMPORTANT: Chromium profile lock fix
//
// Root cause: Chromium can die uncleanly and leave profile Singleton* locks behind.
// In containers, forcing a custom --user-data-dir can still hit SingletonLock errors
// depending on how Chromium resolves profile state.
//
// Robust approach:
// - Keep whatsapp-web.js LocalAuth persisted in /app/.wwebjs_auth (docker volume)
// - Do NOT pass a custom --user-data-dir
// - Instead, keep Chromium ephemeral by forcing its XDG runtime/config/cache dirs to /tmp
//   so it never tries to reuse persisted state.
//
// This avoids the "process_singleton_posix.cc ... profile appears to be in use" failure loop.
const CHROME_XDG_BASE_DIR = process.env.CHROME_XDG_BASE_DIR || '/tmp/wa-chrome-xdg';

function tryKillStrayChromiumProcesses() {
  // In rare cases, Chromium can survive a parent crash and keep a singleton lock.
  // We run a best-effort kill inside the container before starting Puppeteer.
  try {
    execSync('pkill -9 -f "(/usr/bin/chromium|chromium|chrome)" >/dev/null 2>&1 || true', {
      stdio: 'ignore',
    });
  } catch {
    // ignore
  }
}

function removeSingletonLocksInDir(dir) {
  const staleLockFiles = ['SingletonLock', 'SingletonCookie', 'SingletonSocket'];
  for (const name of staleLockFiles) {
    const p = path.join(dir, name);
    try {
      if (fs.existsSync(p)) {
        fs.unlinkSync(p);
        console.log(`🧹 Removed stale Chromium lock file: ${p}`);
      }
    } catch (e) {
      console.log(`⚠️ Failed to remove lock file ${p}: ${e?.message || e}`);
    }
  }
}

function cleanupKnownChromiumLocks() {
  // Clean locks under our /tmp ephemeral runtime dirs
  try {
    if (fs.existsSync(CHROME_XDG_BASE_DIR)) {
      // Remove only lock files, not the whole dir (it may be in use by future runs)
      removeSingletonLocksInDir(CHROME_XDG_BASE_DIR);
      for (const child of ['runtime', 'cache', 'config']) {
        removeSingletonLocksInDir(path.join(CHROME_XDG_BASE_DIR, child));
      }
    }
  } catch {
    // ignore
  }

  // Clean locks inside LocalAuth session directory as well.
  // Even though it's not the Chromium profile, some environments drop singleton locks here.
  try {
    if (fs.existsSync(LOCALAUTH_DATA_PATH)) {
      removeSingletonLocksInDir(LOCALAUTH_DATA_PATH);
      const entries = fs.readdirSync(LOCALAUTH_DATA_PATH);
      for (const entry of entries) {
        if (!entry.startsWith('session-')) continue;
        removeSingletonLocksInDir(path.join(LOCALAUTH_DATA_PATH, entry));
      }
    }
  } catch {
    // ignore
  }
}

function isChromiumProfileLockError(err) {
  const msg = String(err?.message || err || '');
  return msg.includes('process_singleton_posix.cc') || msg.includes('profile appears to be in use');
}

function ensureDir(dir) {
  try {
    fs.mkdirSync(dir, { recursive: true });
  } catch (e) {
    console.log(`⚠️ Failed to create dir ${dir}: ${e?.message || e}`);
  }
}

function prepareChromeXdgDirs() {
  const runtime = path.join(CHROME_XDG_BASE_DIR, 'runtime');
  const cache = path.join(CHROME_XDG_BASE_DIR, 'cache');
  const config = path.join(CHROME_XDG_BASE_DIR, 'config');
  ensureDir(runtime);
  ensureDir(cache);
  ensureDir(config);
  return { runtime, cache, config };
}
// Ensure LocalAuth persistence location is explicit and stable.
// IMPORTANT: This is NOT the Chromium profile. It's whatsapp-web.js session storage.
const LOCALAUTH_DATA_PATH = process.env.LOCALAUTH_DATA_PATH || '/app/.wwebjs_auth';

// If whatsapp-web.js / puppeteer gets into a bad state (common symptom: "Evaluation failed: t"),
// we can recover by restarting the client. We'll do this only after repeated failures.
let sendEvalFailureCount = 0;
let lastSendEvalFailureAt = 0;

function isPuppeteerEvaluationError(message) {
  const msg = String(message || '');
  return (
    msg.includes('Evaluation failed') ||
    msg.includes('Execution context was destroyed') ||
    msg.includes('Cannot find context with specified id') ||
    msg.includes('Target closed')
  );
}

async function restartClient(reason) {
  console.warn(`[RECOVERY] Restarting WhatsApp client: ${reason}`);
  try {
    if (client) {
      await client.destroy().catch(() => undefined);
    }
  } finally {
    client = null;
    isAuthenticated = false;
    clientConnecting = false;
    currentQR = null;
  }

  // Small delay to let Chromium fully release resources
  await sleep(1200);
  try {
    initializeClient();
  } catch (e) {
    console.error('[RECOVERY] Failed to reinitialize client:', e?.message || e);
  }
}

function hasQrImage() {
  return typeof currentQR === 'string' && currentQR.startsWith('data:image');
}

function getQrPngBuffer() {
  if (!hasQrImage()) return null;
  const commaIndex = currentQR.indexOf(',');
  if (commaIndex === -1) return null;
  const base64 = currentQR.slice(commaIndex + 1);
  if (!base64) return null;
  try {
    return Buffer.from(base64, 'base64');
  } catch {
    return null;
  }
}

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

      // Clean up Chromium's singleton lock files if they exist.
      // In Docker/EC2 it's common to see Puppeteer fail with:
      // "The profile appears to be in use by another Chromium process ... Chromium has locked the profile"
      // after an unclean shutdown. Removing these lock artifacts is safe when we are sure
      // we run a single Puppeteer instance per container.
      const staleLockFiles = [
        'SingletonLock',
        'SingletonCookie',
        'SingletonSocket',
      ];
      for (const name of staleLockFiles) {
        const p = path.join(authDir, name);
        try {
          if (fs.existsSync(p)) {
            fs.unlinkSync(p);
            console.log(`🧹 Removed stale Chromium lock file: ${p}`);
          }
        } catch (e) {
          console.log(`⚠️ Failed to remove lock file ${p}: ${e?.message || e}`);
        }
      }

      // Also remove lock files inside LocalAuth's clientId directory if present.
      // Path usually: .wwebjs_auth/session-<clientId>/*
      try {
        for (const entry of files) {
          if (!entry.startsWith('session-')) continue;
          const sessionDir = path.join(authDir, entry);
          for (const name of staleLockFiles) {
            const p = path.join(sessionDir, name);
            try {
              if (fs.existsSync(p)) {
                fs.unlinkSync(p);
                console.log(`🧹 Removed stale Chromium lock file: ${p}`);
              }
            } catch (e) {
              console.log(`⚠️ Failed to remove lock file ${p}: ${e?.message || e}`);
            }
          }
        }
      } catch (e) {
        console.log(`⚠️ Failed during session lock cleanup: ${e?.message || e}`);
      }
    }
  } catch (err) {
    console.log('Session directory check: ' + err.message);
  }
}

// NOTE: We no longer manage a custom Chromium user-data-dir.
// Puppeteer will create and manage an isolated temporary profile per launch.

// Initialize WhatsApp client
function initializeClient({ attempt = 1 } = {}) {
  if (client) {
    console.log('⚠️ Client already exists, destroying old instance...');
    client.destroy().catch(err => console.error('Error destroying client:', err));
    client = null;
  }

  // Best-effort cleanup before starting Chromium.
  tryKillStrayChromiumProcesses();
  cleanupKnownChromiumLocks();

  const { runtime: xdgRuntimeDir, cache: xdgCacheDir, config: xdgConfigDir } =
    prepareChromeXdgDirs();

  // Ensure Chromium writes all runtime/config/cache state under /tmp.
  // This makes the browser completely ephemeral across container restarts.
  process.env.XDG_RUNTIME_DIR = xdgRuntimeDir;
  process.env.XDG_CACHE_HOME = xdgCacheDir;
  process.env.XDG_CONFIG_HOME = xdgConfigDir;

  const clientId = process.env.WHATSAPP_CLIENT_ID || 'crm-whatsapp-session';

  console.log('🔧 Creating new WhatsApp client with clientId:', clientId);
  console.log(`🧪 Chromium XDG (ephemeral): ${CHROME_XDG_BASE_DIR}`);
  console.log(`🧪 Chromium init attempt: ${attempt}`);
  
  client = new Client({
    // Force LocalAuth to use the persisted docker volume.
    // Without an explicit dataPath, some environments may end up mixing auth + Chromium profile
    // artifacts and triggering Chromium singleton locks.
    authStrategy: new LocalAuth({ clientId, dataPath: LOCALAUTH_DATA_PATH }),
    puppeteer: {
      // In EC2/Docker, headless "new" can be flaky across Chromium versions.
      // Prefer classic headless mode unless explicitly overridden.
      headless: process.env.PUPPETEER_HEADLESS
        ? process.env.PUPPETEER_HEADLESS !== 'false'
        : true,
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
        '--no-zygote',
  // NOTE: --single-process is known to cause instability in many container
  // environments and can interact poorly with profile locking.
        '--disable-background-networking',
        '--disable-background-timer-throttling',
        '--disable-breakpad',
        '--disable-client-side-phishing-detection',
        '--disable-component-update',
        '--disable-domain-reliability',
        '--disable-features=site-per-process,TranslateUI',
        '--disable-hang-monitor',
        '--disable-ipc-flooding-protection',
        '--disable-popup-blocking',
        '--disable-prompt-on-repost',
        '--disable-renderer-backgrounding',
        '--disable-web-security',
        '--metrics-recording-only',
        '--mute-audio',

        // Keep runtime/cache/config ephemeral (under /tmp)
        `--disk-cache-dir=${xdgCacheDir}`,
    '--no-service-autorun',
      ],
      // NOTE: LocalAuth is not compatible with puppeteer.userDataDir.
      // We still enforce an ephemeral profile using the Chromium flag above.
      timeout: 60000, // 60 second timeout for browser launch
    },
  });

  // QR Event - Send to all connected WebSocket clients
  let qrRetryCount = 0;
  const maxQrRetries = 5;
  let lastQrTime = 0;

  client.on('qr', (qr) => {
    const now = Date.now();

    qrEventCount += 1;
    lastQrAt = new Date().toISOString();
    // Any new QR implies we're not authenticated yet.
    lastReadyAt = null;

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

  // Important: keep `currentQR` reserved for the *image data URL* (not the raw QR string).
  // `/api/status` and UI consumers rely on `hasQrImage()` which checks for `data:image...`.
  // Storing the raw QR string here would incorrectly report hasQR=false.
  // Do NOT clear `currentQR` here. If we already have a cached QR image and WhatsApp fires
  // a new QR slightly later, we want to keep showing *some* QR until the new one is generated.
  // The new QR image will overwrite `currentQR` below once `qrcode.toDataURL(...)` completes.
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

      // Persist the QR image so status endpoints and late WebSocket clients can access it.
      // (Previously, if the QR fired when no WS clients were connected, the QR was only logged
      // to console and never surfaced via /api/status or WebSocket on later connections.)
      currentQR = url;
      
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

  lastReadyAt = new Date().toISOString();
  lastAuthFailure = null;
  lastDisconnected = null;
  lastClientError = null;

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

    lastAuthFailure = {
      message: msg || 'Unknown reason',
      at: new Date().toISOString(),
    };

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

    lastDisconnected = {
      reason: reason || 'Unknown',
      at: new Date().toISOString(),
    };

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
    
    lastClientError = {
      name: err.name || 'Error',
      message: err.message || String(err),
      at: new Date().toISOString(),
    };

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
  const headlessLabel = process.env.PUPPETEER_HEADLESS ? `headless=${process.env.PUPPETEER_HEADLESS}` : 'headless=true';
  console.log(`   Browser: Puppeteer (${headlessLabel})`);
  console.log(`   Timeout: 60 seconds`);
  console.log(`   Timestamp: ${new Date().toLocaleTimeString()}\n`);
  
  clearStaleSessions();
  
  // Start initialization
  client.initialize().catch((err) => {
    console.error('\n❌ Client initialization failed:');
    console.error(`   Error: ${err.message}`);
    console.error(`   Stack: ${err.stack}`);
    

    // Automatic single retry for Chromium profile-lock issues.
    if (attempt < 2 && isChromiumProfileLockError(err)) {
      console.log('🔁 Detected Chromium profile lock. Retrying once after cleanup...');
      try {
        tryKillStrayChromiumProcesses();
        cleanupKnownChromiumLocks();
      } catch {
        // ignore
      }

      setTimeout(() => {
        try {
          initializeClient({ attempt: attempt + 1 });
        } catch (e) {
          console.log('❌ Retry initialize failed:', e?.message || e);
        }
      }, 1500);
    }
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
    hasQR: hasQrImage(),
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
  if (hasQrImage() && !isAuthenticated && client) {
    // If we already stored the generated QR image (data URL), send it directly.
    if (typeof currentQR === 'string' && currentQR.startsWith('data:image')) {
      console.log('   → Sending cached QR image to new WebSocket client');
      ws.send(JSON.stringify({
        type: 'qr',
        data: currentQR,
        source: 'cached_image',
        timestamp: new Date().toISOString(),
      }));
    }
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

// Serve current QR as a PNG image (easy scanning without WebSocket)
// - 200 image/png if QR image is available
// - 404 if no QR is available (authenticated or not initialized yet)
app.get('/qr.png', (req, res) => {
  const buf = getQrPngBuffer();
  if (!buf) {
    return res.status(404).json({ error: 'QR not available' });
  }
  res.setHeader('Content-Type', 'image/png');
  // Avoid caching, QR rotates
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  return res.status(200).send(buf);
});

// Convenience JSON endpoint with the cached data URL (useful for debugging)
app.get('/api/qr', (req, res) => {
  if (!hasQrImage()) {
    return res.status(404).json({ error: 'QR not available' });
  }
  return res.json({ qr: currentQR, hasQR: true, timestamp: new Date().toISOString() });
});

// Get current status
app.get('/api/status', (req, res) => {
  res.json({
    authenticated: isAuthenticated,
    connecting: clientConnecting,
    hasQR: hasQrImage(),
    connectedClients: connectedClients.size,
    account: isAuthenticated ? getConnectedAccountInfo() : null,
    diagnostics: {
      qrEventCount,
      lastQrAt,
      lastReadyAt,
      lastAuthFailure,
      lastDisconnected,
      lastClientError,
    },
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
    return res.status(409).json({ error: 'Client already initialized' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
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
    return res.status(409).json({ error: 'No client to disconnect' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Send message with retry and fallback
app.post('/api/send', async (req, res) => {
  const { phone, message } = req.body || {};

  if (!phone || !message) {
    return res.status(400).json({ error: 'phone and message required' });
  }

  if (!isAuthenticated) {
    return res.status(401).json({ error: 'WhatsApp not authenticated' });
  }

  try {
    if (!client) {
      return res.status(400).json({ error: 'Client not initialized' });
    }

    // Prevent requests from piling up if whatsapp-web.js gets into a stalled send state.
    if (activeSend) {
      return res.status(429).json({
        error: 'Another send is already in progress',
        hint: 'Retry shortly. If this persists, POST /api/disconnect then reconnect and try again.'
      });
    }

    // Normalize phone to WhatsApp chat id. whatsapp-web.js expects: "<digits>@c.us" (no '+').
    // Example: 919075358557@c.us
    let chatId = String(phone).replace(/\D/g, '');
    if (!chatId) {
      return res.status(400).json({ error: 'Invalid phone number' });
    }
    chatId = `${chatId}@c.us`;

    // Avoid sending to self (commonly fails / is meaningless in WhatsApp Web)
    const selfWid = getConnectedAccountInfo()?.wid;
    if (selfWid && chatId === selfWid) {
      return res.status(400).json({
        error: 'Refusing to send to the logged-in WhatsApp account',
        hint: `Pick a different recipient number (self is ${selfWid})`,
      });
    }

    const messageStr = String(message);
    const preview = messageStr.replace(/\s+/g, ' ').slice(0, 80);
    console.log(`[SEND] Sending to ${chatId}: "${preview}${messageStr.length > 80 ? '…' : ''}"`);
    
    // Try sending with timeout
    const startedAt = Date.now();
    const timeoutMs = Number(process.env.SEND_TIMEOUT_MS || 15000);

    // whatsapp-web.js sometimes throws transient "Evaluation failed" right after auth or on busy sessions.
    // We do a small warmup delay and one retry to make /api/send reliable.
    async function attemptSend(attempt) {
      // Small delay helps WhatsApp Web settle (especially on EC2 / headless Chromium)
      if (attempt > 1) await sleep(800);
      return client.sendMessage(chatId, messageStr);
    }

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`Send timeout after ${timeoutMs}ms`)), timeoutMs)
    );

    // Attempt #1
    try {
      activeSend = Promise.race([attemptSend(1), timeoutPromise]);
      await activeSend;
    } catch (e) {
      const msg = e?.message || String(e);
      if (isPuppeteerEvaluationError(msg)) {
        console.warn(`[SEND] ⚠️ Transient evaluation failure, retrying once...`);
        activeSend = Promise.race([attemptSend(2), timeoutPromise]);
        await activeSend;
      } else {
        throw e;
      }
    }
    
    console.log(`[SEND] ✅ Success in ${Date.now() - startedAt}ms`);
    return res.json({ success: true, message: 'Message sent' });
    
  } catch (err) {
    const errorMsg = err?.message || String(err);
    console.error(`[SEND] ❌ Error:`, errorMsg);

    // Track repeated evaluation failures and restart client if needed.
    if (isPuppeteerEvaluationError(errorMsg)) {
      const now = Date.now();
      // If failures are far apart, treat it as a new episode.
      if (now - lastSendEvalFailureAt > 60_000) sendEvalFailureCount = 0;
      lastSendEvalFailureAt = now;
      sendEvalFailureCount += 1;

      // After 2 failures within 60s, restart the client in background.
      if (sendEvalFailureCount >= 2) {
        sendEvalFailureCount = 0;
        restartClient('Repeated puppeteer evaluation failures during send').catch(() => undefined);
      }
    }
    
    // Return 202 Accepted if bridge is unreliable
    // CRM will queue the message in MongoDB
    if (errorMsg.includes('Evaluation') || errorMsg.includes('timeout')) {
      return res.status(202).json({
        error: errorMsg,
        queued: true,
        hint: 'Bridge is authenticated but WhatsApp page is busy/unresponsive. Try again shortly; the bridge may self-recover. If it persists, restart the wa-bridge container.',
      });
    }

    return res.status(500).json({ error: errorMsg });
  } finally {
    activeSend = null;
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ ok: true, authenticated: isAuthenticated });
});

// Debug (no sensitive data): helps confirm whether the bridge thinks it currently has a QR image.
app.get('/api/debug', (req, res) => {
  res.json({
    authenticated: isAuthenticated,
    connecting: clientConnecting,
    currentQRType: currentQR == null ? null : typeof currentQR,
    currentQRIsDataUrl: typeof currentQR === 'string' ? currentQR.startsWith('data:image') : false,
    currentQRLength: typeof currentQR === 'string' ? currentQR.length : null,
    timestamp: new Date().toISOString(),
  });
});

// Start server
// Prefer explicit WHATSAPP_WEB_PORT for this service, but also accept generic PORT
// (useful on some container hosts).
const PORT = Number(process.env.WHATSAPP_WEB_PORT || process.env.PORT || 3333);

server.on('error', (err) => {
  if (err && err.code === 'EADDRINUSE') {
    console.error(`\n❌ Port ${PORT} is already in use.`);
    console.error('   Another instance of the WhatsApp bridge may already be running.');
    console.error('   Stop that process or set WHATSAPP_WEB_PORT/PORT to a different value.');
    process.exit(1);
  }
  console.error('\n❌ Server error:', err);
  process.exit(1);
});

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

  // Auto-start the WhatsApp client so we don't miss early QR events.
  // The CRM UI may connect after the client already emitted a QR; we persist the latest QR
  // and can broadcast to any connected WebSocket clients.
  try {
    if (!client) initializeClient();
  } catch (e) {
    console.error('❌ Failed to auto-initialize WhatsApp client:', e?.message || e);
  }
});

module.exports = app;
