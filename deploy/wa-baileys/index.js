/**
 * Swar Yoga WhatsApp Bridge — Baileys Edition
 * 
 * A lightweight WhatsApp Web bridge using Baileys library.
 * Stores auth state in MongoDB, provides HTTP API for CRM integration.
 * 
 * Endpoints:
 *   GET  /status           — connection status
 *   GET  /qr               — QR code as base64 image
 *   POST /send             — send text/media message
 *   GET  /messages/:jid    — get recent messages for a chat
 *   GET  /chats            — list all chats
 *   GET  /health           — basic health check
 * 
 * Incoming messages are forwarded to the CRM webhook at:
 *   POST {WEBHOOK_URL}/api/whatsapp/qr/webhook
 */

// ═══ GLOBAL CRASH HANDLERS — prevent process from dying ═══
process.on('uncaughtException', (err) => {
  console.error('[CRASH-GUARD] Uncaught exception:', err.message);
  console.error(err.stack);
});
process.on('unhandledRejection', (reason) => {
  console.error('[CRASH-GUARD] Unhandled rejection:', reason);
});

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  downloadMediaMessage,
  initAuthCreds
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const QRCode = require('qrcode');
const { MongoClient } = require('mongodb');
const fs = require('fs');
const mime = require('mime-types');

// ── Config ──────────────────────────────────────────────────────────────
const PORT = parseInt(process.env.PORT || '3333', 10);
const BRIDGE_SECRET = (process.env.BRIDGE_SECRET || process.env.WHATSAPP_BRIDGE_SECRET || 'swar-bridge-secret-2024').trim();
const WEBHOOK_URL = (process.env.WEBHOOK_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://swaryoga.com').trim().replace(/\/$/, '');
const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGODB_URI_MAIN || '';
const AUTH_COLLECTION = 'baileys_auth_state';
const AUTH_DB_NAME = process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm';
const AUTH_DIR = path.join(__dirname, '.auth');

// ── Logging ─────────────────────────────────────────────────────────────
const logger = pino({ level: process.env.LOG_LEVEL || 'warn' });

// ── State ───────────────────────────────────────────────────────────────
let sock = null;
let qrCode = null;           // Latest QR code string
let qrBase64 = null;         // QR as base64 PNG
let connectionState = 'disconnected'; // 'disconnected' | 'connecting' | 'connected'
let retryCount = 0;
const MAX_RETRIES = 50;         // Allow many retries for QR scanning
let phoneInfo = null;         // Connected phone info
let lastQrTime = 0;           // Track when last QR was generated
let mongoClient = null;
let lastConnectedTime = 0;     // Track last successful connection time
let connectionStabilizedTime = 0; // Time when connection became stable (after 30s of no disconnect)
let lastDisconnectTime = 0;    // Track last disconnect time
let keepaliveTimer = null;     // Periodic connection health check
const KEEP_ALIVE_INTERVAL = 60000; // Check connection every 60 seconds
const STABILIZATION_THRESHOLD = 30000; // Connection is stable after 30 seconds

// ── Guards against common crash patterns ──
let isStarting = false;          // Prevent concurrent startSocket() calls
let intentionalDisconnect = false; // true when user clicks Disconnect
let reconnectTimer = null;       // Track pending reconnect setTimeout
let saveCreds = null;            // Persist across reconnects

function clearReconnectTimer() {
  if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }
}

function clearKeepaliveTimer() {
  if (keepaliveTimer) { clearInterval(keepaliveTimer); keepaliveTimer = null; }
}

function startKeepalive() {
  clearKeepaliveTimer();
  keepaliveTimer = setInterval(() => {
    if (connectionState === 'connected' && sock) {
      // Check if connection is still alive
      const timeSinceLastMsg = Date.now() - (sock?.lastMessageTime || Date.now());
      const timeSinceConnect = Date.now() - lastConnectedTime;
      if (timeSinceConnect > STABILIZATION_THRESHOLD && timeSinceLastMsg < 300000) {
        // Connection is stable and no recent disconnect signals
        if (!connectionStabilizedTime) {
          connectionStabilizedTime = Date.now();
          console.log('[KEEP-ALIVE] Connection stabilized ✓');
        }
      }
    }
  }, KEEP_ALIVE_INTERVAL);
}

// Simple in-memory chat & message tracking (replaces removed makeInMemoryStore)
const chatMap = new Map();     // jid -> { id, name, unreadCount, lastMessageTime, isGroup, lastMessage }
const messageMap = new Map();  // jid -> [{ id, from, fromMe, text, type, timestamp }]  (last 100 per chat)
const MAX_MSGS_PER_CHAT = 100;
const rawMessageCache = new Map(); // messageId -> raw WAMessage proto object (for on-demand media download)
const MAX_RAW_CACHE = 500;        // Limit raw message cache size
const groupSubjectCache = new Map(); // groupJid -> group subject/name
const groupMembersCache = new Map(); // groupJid -> Set of participant JIDs (built from messages)
const contactsCache = new Map();     // jid -> { name, notify, lid, jid } from Baileys contacts events
const lidToPhoneMap = new Map();     // lidJid (e.g. '123@lid' or '123@s.whatsapp.net') -> phoneJid (e.g. '919075358557@s.whatsapp.net')
const phoneToLidMap = new Map();     // phoneJid -> lidJid (reverse)
const statusStore = [];              // Recent status/story updates from contacts (max 50)
const MAX_STATUS_STORE = 50;

// Helper: detect if a JID's numeric part is a WhatsApp LID (internal ID, not a phone number)
// LID numbers are typically 14-16 digits, while real phone numbers are 10-13 digits
function isLidNumber(jid) {
  if (!jid) return false;
  const num = jid.split('@')[0];
  return /^\d{14,}$/.test(num);
}

// Helper: store a LID ↔ Phone mapping (bidirectional)
function storeLidPhoneMapping(lidJid, phoneJid) {
  if (!lidJid || !phoneJid) return;
  // Normalize: ensure both have proper suffixes
  const lidNorm = lidJid.includes('@') ? lidJid : `${lidJid}@lid`;
  const phoneNorm = phoneJid.includes('@') ? phoneJid : `${phoneJid}@s.whatsapp.net`;
  const phoneNum = phoneNorm.split('@')[0];
  // Only store if phone is a real phone number (not another LID)
  if (/^\d{14,}$/.test(phoneNum)) return; // skip if phone is also an LID number
  lidToPhoneMap.set(lidNorm, phoneNorm);
  phoneToLidMap.set(phoneNorm, lidNorm);
  // Also map the LID number with @s.whatsapp.net suffix (common in Baileys LID mode)
  const lidNum = lidNorm.split('@')[0];
  const lidAsPhone = `${lidNum}@s.whatsapp.net`;
  lidToPhoneMap.set(lidAsPhone, phoneNorm);
  console.log(`[LID-MAP] ${lidNum} → ${phoneNum}`);
}

// Helper: resolve a JID to a phone number if it's an LID
function resolveToPhone(jid) {
  if (!jid) return jid;
  const resolved = lidToPhoneMap.get(jid);
  if (resolved) return resolved.split('@')[0];
  // Try with @lid suffix
  const num = jid.split('@')[0];
  const asLid = `${num}@lid`;
  const resolved2 = lidToPhoneMap.get(asLid);
  if (resolved2) return resolved2.split('@')[0];
  return null; // not resolved
}

// Helper: get group subject/name (cached)
async function getGroupSubject(jid) {
  if (groupSubjectCache.has(jid)) return groupSubjectCache.get(jid);
  try {
    if (sock) {
      const metadata = await sock.groupMetadata(jid);
      if (metadata?.subject) {
        groupSubjectCache.set(jid, metadata.subject);
        return metadata.subject;
      }
    }
  } catch (e) {
    // Silently handle privacy / not-in-group errors
  }
  return null;
}

// Helper: prefetch all group names on connect
async function prefetchGroupNames() {
  try {
    if (!sock) return;
    const groups = await sock.groupFetchAllParticipating();
    let count = 0;
    for (const [jid, meta] of Object.entries(groups)) {
      if (meta.subject) {
        groupSubjectCache.set(jid, meta.subject);
        // Seed group members cache from participants data
        if (meta.participants && meta.participants.length > 0) {
          if (!groupMembersCache.has(jid)) {
            groupMembersCache.set(jid, new Set());
          }
          const membersSet = groupMembersCache.get(jid);
          for (const p of meta.participants) {
            // Add the best available ID (prefer phone JID over LID)
            const bestId = p.jid || p.id;
            if (bestId) membersSet.add(bestId);
          }
        }
        // Also add to chatMap if not already there
        if (!chatMap.has(jid)) {
          chatMap.set(jid, {
            id: jid,
            name: meta.subject,
            isGroup: true,
            unreadCount: 0,
            lastMessageTime: null,
            lastMessage: '',
          });
        } else {
          // Update name if we have a better one
          const existing = chatMap.get(jid);
          existing.name = meta.subject;
          existing.isGroup = true;
        }
        count++;
      }
    }
    console.log(`[GROUPS] Prefetched ${count} group names`);
  } catch (e) {
    console.error('[GROUPS] Failed to prefetch group names:', e.message);
  }
}

// ── Load old chats from CRM database ────────────────────────────────────
/**
 * On bridge startup / reconnect, hydrate chatMap and messageMap from
 * the CRM's whatsapp_messages collection so old conversations appear
 * immediately without waiting for new real-time events.
 */
async function loadChatsFromDB() {
  if (!MONGODB_URI) {
    console.log('[DB-LOAD] No MongoDB — skipping chat hydration');
    return;
  }
  try {
    const client = await getMongoClient();
    if (!client) return;
    const db = client.db(AUTH_DB_NAME);
    const col = db.collection('whatsapp_messages');

    // Fetch recent QR-bridge messages (last 90 days, capped at 2000)
    const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const docs = await col
      .find({
        provider: { $in: ['whatsapp_web_bridge', 'whatsapp_qr', null] },
        sentAt: { $gte: cutoff },
      })
      .sort({ sentAt: 1 })
      .limit(2000)
      .toArray();

    let chatCount = 0;
    let msgCount = 0;

    for (const doc of docs) {
      const phone = (doc.phoneNumber || '').replace(/\D/g, '');
      if (!phone || phone.length < 10) continue;
      const jid = `${phone}@s.whatsapp.net`;
      const isFromMe = doc.direction === 'outbound';
      const ts = doc.sentAt ? new Date(doc.sentAt).toISOString() : new Date().toISOString();

      // Build chat entry (last-writer-wins, sorted ascending so final entry = latest)
      if (!chatMap.has(jid)) chatCount++;
      chatMap.set(jid, {
        id: jid,
        name: doc.senderDisplayName || phone,
        isGroup: false,
        unreadCount: 0,
        lastMessageTime: ts,
      });

      // Build message entry
      const msgEntry = {
        id: doc.waMessageId || String(doc._id),
        from: phone,
        fromMe: isFromMe,
        text: doc.messageContent || (doc.media?.kind ? `[${doc.media.kind}]` : ''),
        type: doc.media?.kind || doc.messageType || 'text',
        timestamp: doc.sentAt ? Math.floor(new Date(doc.sentAt).getTime() / 1000) : 0,
        status: doc.status,
        hasMedia: doc.hasMedia || !!doc.media?.url,
        mediaUrl: doc.media?.url || null,
        mediaMimetype: doc.media?.mimeType || null,
        mediaFileName: doc.media?.fileName || null,
      };
      if (!messageMap.has(jid)) messageMap.set(jid, []);
      const arr = messageMap.get(jid);
      arr.push(msgEntry);
      if (arr.length > MAX_MSGS_PER_CHAT) arr.shift();
      msgCount++;
    }

    console.log(`[DB-LOAD] ✅ Hydrated ${chatCount} chats, ${msgCount} messages from DB`);
  } catch (err) {
    console.error('[DB-LOAD] Failed to load chats from DB:', err.message);
  }
}

// ── Resolve LID contacts using known phone numbers from CRM DB ──────
async function resolveLidsFromDB() {
  if (!MONGODB_URI || !sock || connectionState !== 'connected') return;
  
  // Find LID chats that need phone number resolution
  const unresolvedLids = [];
  for (const [jid, chat] of chatMap.entries()) {
    if ((jid.endsWith('@lid') || isLidNumber(jid)) && !chat.isGroup && !lidToPhoneMap.has(jid)) {
      unresolvedLids.push(jid);
    }
  }
  
  if (unresolvedLids.length === 0) {
    console.log('[LID-RESOLVE-DB] No unresolved LID contacts');
    return;
  }
  
  console.log(`[LID-RESOLVE-DB] Found ${unresolvedLids.length} unresolved LID contacts, querying DB...`);
  
  try {
    const client = await getMongoClient();
    if (!client) return;
    const db = client.db(AUTH_DB_NAME);
    
    // Get unique phone numbers from CRM messages
    const col = db.collection('whatsapp_messages');
    const phoneNumbers = await col.distinct('phoneNumber', {
      provider: { $in: ['whatsapp_web_bridge', 'whatsapp_qr', null] },
    });
    
    // Filter to valid phone numbers
    const validPhones = phoneNumbers
      .map(p => (p || '').replace(/\D/g, ''))
      .filter(p => p.length >= 10 && p.length <= 13 && !/^\d{14,}$/.test(p));
    
    console.log(`[LID-RESOLVE-DB] Found ${validPhones.length} unique phone numbers in DB`);
    
    if (validPhones.length === 0) return;
    
    // Query WhatsApp in batches of 20 to get LID for each phone
    const batchSize = 20;
    let resolved = 0;
    for (let i = 0; i < validPhones.length; i += batchSize) {
      const batch = validPhones.slice(i, i + batchSize);
      try {
        // onWhatsApp returns [{ jid, exists, lid }] for each phone
        const results = await sock.onWhatsApp(...batch.map(p => `+${p}`));
        
        for (const r of results) {
          if (r.exists && r.jid && r.lid) {
            storeLidPhoneMapping(r.lid, r.jid);
            resolved++;
          }
        }
      } catch (e) {
        console.error(`[LID-RESOLVE-DB] Batch query error:`, e.message);
      }
      
      // Small delay between batches to avoid rate limiting
      if (i + batchSize < validPhones.length) {
        await new Promise(r => setTimeout(r, 500));
      }
    }
    
    console.log(`[LID-RESOLVE-DB] ✅ Resolved ${resolved} phone→LID mappings (total map: ${lidToPhoneMap.size})`);
    
    // Now update chatMap with resolved phone numbers
    let updated = 0;
    for (const [jid, chat] of chatMap.entries()) {
      if ((jid.endsWith('@lid') || isLidNumber(jid)) && !chat.isGroup) {
        const phoneNum = resolveToPhone(jid);
        if (phoneNum) {
          chat.resolvedPhone = phoneNum;
          if (/^\d{14,}$/.test(chat.name)) {
            chat.name = phoneNum;
          }
          updated++;
        }
      }
    }
    
    console.log(`[LID-RESOLVE-DB] ✅ Updated ${updated} chat entries with phone numbers`);
    
  } catch (err) {
    console.error('[LID-RESOLVE-DB] Error:', err.message);
  }
}

// ── Express App ─────────────────────────────────────────────────────────
const app = express();
app.use(express.json({ limit: '50mb' }));

// Auth middleware
function authCheck(req, res, next) {
  const secret = req.headers['x-bridge-secret'] || req.headers['x-qr-chat-secret'] || '';
  if (BRIDGE_SECRET && secret !== BRIDGE_SECRET) {
    // Allow health and status without auth for monitoring
    if (req.path === '/health') return next();
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}
app.use(authCheck);

// ── MongoDB Auth State ──────────────────────────────────────────────────
/**
 * Custom auth state backed by MongoDB.
 * Falls back to file-based auth if MongoDB is not configured.
 */
// Singleton MongoDB connection (never re-create on reconnect)
async function getMongoClient() {
  if (mongoClient) return mongoClient;
  if (!MONGODB_URI) return null;
  mongoClient = new MongoClient(MONGODB_URI, { maxPoolSize: 5, serverSelectionTimeoutMS: 10000 });
  await mongoClient.connect();
  console.log('[MONGO] Connected (singleton)');
  return mongoClient;
}

async function useMongoDBAuthState() {
  const client = await getMongoClient();
  if (!client) {
    console.log('[AUTH] No MongoDB — using file-based auth');
    if (!fs.existsSync(AUTH_DIR)) fs.mkdirSync(AUTH_DIR, { recursive: true });
    return useMultiFileAuthState(AUTH_DIR);
  }

  console.log('[AUTH] Using MongoDB-backed auth state');
  const db = client.db(AUTH_DB_NAME);
  const collection = db.collection(AUTH_COLLECTION);

  // Ensure index
  await collection.createIndex({ key: 1 }, { unique: true }).catch(() => {});

  /**
   * MongoDB stores Buffer values as BSON Binary objects.
   * Baileys crypto functions expect Node.js Buffer instances.
   * This recursively converts all Binary → Buffer in the returned data.
   */
  function convertBinaryToBuffer(obj) {
    if (!obj || typeof obj !== 'object') return obj;
    // BSON Binary has a .buffer property (or ._bsontype === 'Binary')
    if (obj._bsontype === 'Binary' || (obj.constructor && obj.constructor.name === 'Binary')) {
      return Buffer.from(obj.buffer || obj.value(true));
    }
    if (Buffer.isBuffer(obj) || obj instanceof Uint8Array) return obj;
    if (Array.isArray(obj)) return obj.map(convertBinaryToBuffer);
    const result = {};
    for (const [k, v] of Object.entries(obj)) {
      result[k] = convertBinaryToBuffer(v);
    }
    return result;
  }

  const readData = async (key) => {
    const doc = await collection.findOne({ key });
    if (!doc?.value) return null;
    return convertBinaryToBuffer(doc.value);
  };

  const writeData = async (key, value) => {
    await collection.updateOne(
      { key },
      { $set: { key, value, updatedAt: new Date() } },
      { upsert: true }
    );
  };

  const removeData = async (key) => {
    await collection.deleteOne({ key });
  };

  // Load creds — use initAuthCreds() when no stored creds exist (Baileys v6 requirement)
  const creds = await readData('creds') || initAuthCreds();

  return {
    state: {
      creds: creds,
      keys: {
        get: async (type, ids) => {
          const result = {};
          for (const id of ids) {
            const val = await readData(`${type}-${id}`);
            if (val) result[id] = val;
          }
          return result;
        },
        set: async (data) => {
          for (const [type, entries] of Object.entries(data)) {
            for (const [id, value] of Object.entries(entries)) {
              if (value) {
                await writeData(`${type}-${id}`, value);
              } else {
                await removeData(`${type}-${id}`);
              }
            }
          }
        }
      }
    },
    saveCreds: async () => {
      if (sock?.authState?.creds) {
        await writeData('creds', sock.authState.creds);
      }
    }
  };
}

// ── Baileys Socket ──────────────────────────────────────────────────────
async function startSocket() {
  // Prevent concurrent calls
  if (isStarting) {
    console.log('[BAILEYS] startSocket() already running — skipping');
    return;
  }
  isStarting = true;

  try {
  // Clean up old socket safely
  if (sock) {
    try { sock.ev.removeAllListeners(); sock.end(undefined); } catch {}
    sock = null;
  }

  const { state, saveCreds: _saveCreds } = await useMongoDBAuthState();
  saveCreds = _saveCreds;
  const { version } = await fetchLatestBaileysVersion();

  console.log(`[BAILEYS] Starting v${version.join('.')}`);

  sock = makeWASocket({
    version,
    logger,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger),
    },
    generateHighQualityLinkPreview: false,
    syncFullHistory: false,
    // Disable aggressive history syncing to prevent frequent disconnects
    // History sync can cause connection instability; rely on real-time message events instead
    shouldSyncHistoryMessage: () => false,
    // Connection stability settings
    markOnlineThrottleMs: 15000,
    // Disable message read receipts to reduce network overhead
  });

  // ── Connection Updates ───────────────────
  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      qrCode = qr;
      qrBase64 = await QRCode.toDataURL(qr);
      connectionState = 'connecting';
      lastQrTime = Date.now();
      retryCount = 0; // Reset retries when a new QR is generated
      console.log('[QR] New QR code generated — scan in WhatsApp app');
    }

    if (connection === 'open') {
      connectionState = 'connected';
      lastConnectedTime = Date.now();
      connectionStabilizedTime = 0; // Reset stabilization timer on each connect
      qrCode = null;
      qrBase64 = null;
      retryCount = 0;
      intentionalDisconnect = false;
      phoneInfo = sock ? sock.user : null;
      console.log('[CONNECTED] WhatsApp connected as:', sock.user?.id, sock.user?.name);
      
      // Start keepalive timer
      startKeepalive();

      // Hydrate in-memory maps from CRM database so old chats show up
      if (chatMap.size === 0) {
        loadChatsFromDB().catch(e => console.error('[DB-LOAD] Error:', e.message));
      }

      // NOTE: Disabled group prefetching and LID resolution on connect to avoid rate limiting
      // These operations cause WhatsApp to rate-limit the connection with 429/503/440 errors
      // Groups and contacts will be resolved on-demand as messages come in
      // prefetchGroupNames().catch(e => console.error('[GROUPS] Prefetch error:', e.message));
      // setTimeout(() => {
      //   resolveLidsFromDB().catch(e => console.error('[LID-RESOLVE-DB] Error:', e.message));
      // }, 5000);
    }

    if (connection === 'close') {
      lastDisconnectTime = Date.now();
      clearKeepaliveTimer();
      connectionStabilizedTime = 0; // Reset stabilization on disconnect
      const hadRecentQR = lastQrTime && (Date.now() - lastQrTime < 120000);
      if (!hadRecentQR) connectionState = 'disconnected';
      phoneInfo = null;
      const statusCode = lastDisconnect?.error?.output?.statusCode || lastDisconnect?.error?.statusCode;
      const reason = lastDisconnect?.error?.message || 'unknown';

      console.log(`[DISCONNECTED] Status: ${statusCode} (${reason}), intentional: ${intentionalDisconnect}`);

      // If user clicked Disconnect — do NOT auto-reconnect
      if (intentionalDisconnect) {
        console.log('[DISCONNECTED] Intentional — not reconnecting');
        return;
      }

      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

      if (shouldReconnect) {
        const isQrTimeout = statusCode === 408 || statusCode === 515 || hadRecentQR;
        const isConnectionConflict = statusCode === 440 || statusCode === 428; // Session replaced, connection closed
        const isRateLimited = statusCode === 429 || statusCode === 503; // Rate limit, service unavailable
        const isConnectionDrop = statusCode === 401 || statusCode === 403 || statusCode === 404; // Auth issues
        
        // Increment retry count only for non-QR issues
        if (!isQrTimeout) {
          retryCount++;
        } else {
          retryCount = 0; // Reset on QR timeout
        }
        
        if (retryCount > MAX_RETRIES) {
          console.log('[RECONNECT] Max retries reached — stopping');
          connectionState = 'disconnected';
          return;
        }
        
        // Smart delay calculation with exponential backoff
        // Give WhatsApp time to recover from rate limiting and session conflicts
        let delay;
        if (isQrTimeout) {
          delay = 2000; // QR timeouts: 2 second retry
        } else if (isConnectionConflict) {
          delay = Math.min(10000 + retryCount * 5000, 120000); // Conflict: start at 10s, grow slowly, cap at 2min
          console.log(`[RECONNECT] Session conflict detected — waiting ${delay}ms for WhatsApp to stabilize`);
        } else if (isRateLimited) {
          delay = Math.min(15000 + retryCount * 5000, 120000); // Rate limit: start at 15s, cap at 2min
          console.log(`[RECONNECT] Rate limited — waiting ${delay}ms before retry`);
        } else if (isConnectionDrop) {
          delay = 5000; // Connection drops: 5 second retry
        } else {
          // Standard exponential: 1s → 2s → 4s → 8s → 16s → 32s → 60s (capped)
          delay = Math.min(1000 * Math.pow(2, Math.min(retryCount - 1, 5)), 60000);
        }
        
        console.log(`[RECONNECT] ${isQrTimeout ? 'QR refresh' : isConnectionConflict ? 'Conflict' : isRateLimited ? 'Rate-limit' : isConnectionDrop ? 'Connection drop' : `Attempt ${retryCount}/${MAX_RETRIES}`} in ${delay}ms`);
        clearReconnectTimer();
        reconnectTimer = setTimeout(() => { isStarting = false; startSocket(); }, delay);
      } else if (statusCode === DisconnectReason.loggedOut) {
        console.log('[LOGGED OUT] Session expired — clearing auth and reconnecting');
        try {
          const client = await getMongoClient();
          if (client) {
            await client.db(AUTH_DB_NAME).collection(AUTH_COLLECTION).deleteMany({});
            console.log('[AUTH] Cleared MongoDB auth state');
          } else if (fs.existsSync(AUTH_DIR)) {
            fs.rmSync(AUTH_DIR, { recursive: true, force: true });
          }
        } catch (e) { console.error('[AUTH] Clear failed:', e.message); }
        retryCount = 0;
        clearReconnectTimer();
        // Longer delay for logout scenario to let WhatsApp session fully expire
        reconnectTimer = setTimeout(() => { isStarting = false; startSocket(); }, 5000);
      }
    }
  });

  // ── Credentials Update ───────────────────
  sock.ev.on('creds.update', async () => {
    try { if (saveCreds) await saveCreds(); } catch (e) { console.error('[CREDS] Save failed:', e.message); }
  });

  // ── Group Participants Update (add/remove/promote/demote) ────────────
  sock.ev.on('group-participants.update', ({ id, participants, action }) => {
    console.log(`[GROUP] Participants ${action} in ${id}: ${participants.length} members`);
    if (!groupMembersCache.has(id)) {
      groupMembersCache.set(id, new Set());
    }
    const members = groupMembersCache.get(id);
    if (action === 'add') {
      for (const p of participants) members.add(p);
    } else if (action === 'remove') {
      for (const p of participants) members.delete(p);
    }
    // promote/demote: participants are still members, just update isn't needed for cache
  });

  // ── Contacts Updates (resolve LID contacts to real names) ─────────
  sock.ev.on('contacts.upsert', (contacts) => {
    for (const c of contacts) {
      const existing = contactsCache.get(c.id) || {};
      contactsCache.set(c.id, {
        ...existing,
        name: c.name || existing.name,
        notify: c.notify || existing.notify,
        lid: c.lid || existing.lid,
        jid: c.jid || existing.jid,
        verifiedName: c.verifiedName || existing.verifiedName,
      });
      console.log(`[CONTACT] Upsert ${c.id}: name=${c.name||''} notify=${c.notify||''} lid=${c.lid||''} jid=${c.jid||""}`);
      // Build LID ↔ Phone mapping from contacts data
      // contacts.upsert from app-state sync provides: id=phoneJid, lid=lidJid
      if (c.lid && c.id && !isLidNumber(c.id)) {
        storeLidPhoneMapping(c.lid, c.id);
      }
      if (c.jid && c.lid) {
        storeLidPhoneMapping(c.lid, c.jid);
      }
      // If id is an LID and jid is a phone, map them
      if (c.jid && isLidNumber(c.id)) {
        storeLidPhoneMapping(c.id, c.jid);
      }
      // Update chatMap name if this contact is an LID-like number showing a raw numeric name
      if (chatMap.has(c.id)) {
        const chat = chatMap.get(c.id);
        const displayName = c.notify || c.name || c.verifiedName;
        if (displayName && /^\d{14,}$/.test(chat.name)) {
          chat.name = displayName;
        }
      }
    }
  });

  sock.ev.on('contacts.update', (contacts) => {
    for (const c of contacts) {
      const existing = contactsCache.get(c.id) || {};
      contactsCache.set(c.id, {
        ...existing,
        ...(c.name && { name: c.name }),
        ...(c.notify && { notify: c.notify }),
        ...(c.lid && { lid: c.lid }),
        ...(c.jid && { jid: c.jid }),
        ...(c.verifiedName && { verifiedName: c.verifiedName }),
      });
      // Build LID ↔ Phone mapping
      if (c.lid && c.id && !isLidNumber(c.id)) {
        storeLidPhoneMapping(c.lid, c.id);
      }
      // Update chatMap name if this contact is showing a raw numeric name
      if (chatMap.has(c.id)) {
        const chat = chatMap.get(c.id);
        const displayName = c.notify || c.name || c.verifiedName || existing.notify || existing.name;
        if (displayName && /^\d{14,}$/.test(chat.name)) {
          chat.name = displayName;
        }
      }
    }
  });

  // ── History Sync (contacts with LID ↔ Phone mappings) ─────────
  sock.ev.on('messaging-history.set', ({ contacts, chats, messages, syncType }) => {
    console.log(`[HISTORY] Received sync type=${syncType}: ${contacts?.length||0} contacts, ${chats?.length||0} chats, ${messages?.length||0} messages`);
    
    // Process contacts for LID ↔ Phone mapping
    if (contacts && contacts.length > 0) {
      for (const c of contacts) {
        // Store in contactsCache
        if (c.id) {
          const existing = contactsCache.get(c.id) || {};
          contactsCache.set(c.id, {
            ...existing,
            name: c.name || existing.name,
            notify: c.notify || existing.notify,
            lid: c.lid || existing.lid,
            jid: c.jid || existing.jid,
            verifiedName: c.verifiedName || existing.verifiedName,
          });
        }
        // Build LID ↔ Phone mapping
        // History sync provides: id=chatJid, lid=lidJid, jid=phoneJid (if user)
        if (c.lid && c.id && !isLidNumber(c.id)) {
          storeLidPhoneMapping(c.lid, c.id);
        }
        if (c.lid && c.jid) {
          storeLidPhoneMapping(c.lid, c.jid);
        }
        if (c.jid && c.id && isLidNumber(c.id)) {
          storeLidPhoneMapping(c.id, c.jid);
        }
      }
    }
    
    console.log(`[HISTORY] LID→Phone map now has ${lidToPhoneMap.size} entries`);
    
    // Update chatMap names for resolved LID contacts
    for (const [jid, chat] of chatMap.entries()) {
      if (isLidNumber(jid) && /^\d{14,}$/.test(chat.name)) {
        const phoneNum = resolveToPhone(jid);
        if (phoneNum) {
          chat.name = phoneNum;
          chat.resolvedPhone = phoneNum;
          console.log(`[HISTORY] Resolved chat ${jid} → ${phoneNum}`);
        }
      }
    }
  });

  // ── Phone Number Share (LID → Phone mapping from protocol messages) ──
  sock.ev.on('chats.phoneNumberShare', ({ lid, jid }) => {
    console.log(`[PHONE-SHARE] ${lid} → ${jid}`);
    if (lid && jid) {
      storeLidPhoneMapping(lid, jid);
      // Update chatMap if this LID is a known chat
      if (chatMap.has(lid)) {
        const chat = chatMap.get(lid);
        const phoneNum = jid.split('@')[0];
        if (/^\d{14,}$/.test(chat.name)) {
          chat.name = phoneNum;
        }
        chat.resolvedPhone = phoneNum;
      }
    }
  });

  // ── Incoming Messages ────────────────────
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;

    for (const msg of messages) {
      try {
      // Capture status broadcasts for preview
      if (msg.key.remoteJid === 'status@broadcast') {
        try {
          const senderJid = msg.key.participant || msg.key.remoteJid;
          const senderPhone = senderJid.replace('@s.whatsapp.net', '').replace('@lid', '');
          const contact = contactsCache.get(senderJid);
          const statusEntry = {
            id: msg.key.id,
            senderJid,
            senderPhone,
            senderName: contact?.notify || contact?.name || senderPhone,
            timestamp: msg.messageTimestamp ? (typeof msg.messageTimestamp === 'number' ? msg.messageTimestamp : Number(msg.messageTimestamp)) : Math.floor(Date.now() / 1000),
            type: msg.message?.imageMessage ? 'image' : msg.message?.videoMessage ? 'video' : msg.message?.extendedTextMessage ? 'text' : 'unknown',
            text: msg.message?.extendedTextMessage?.text || msg.message?.imageMessage?.caption || msg.message?.videoMessage?.caption || '',
            hasMedia: !!(msg.message?.imageMessage || msg.message?.videoMessage),
            mediaMessageId: msg.key.id,
          };
          statusStore.unshift(statusEntry);
          if (statusStore.length > MAX_STATUS_STORE) statusStore.length = MAX_STATUS_STORE;
          // Also cache raw message for media download
          if (statusEntry.hasMedia) {
            rawMessageCache.set(msg.key.id, msg);
            if (rawMessageCache.size > MAX_RAW_CACHE) {
              const oldest = rawMessageCache.keys().next().value;
              rawMessageCache.delete(oldest);
            }
          }
        } catch (e) { console.error('[STATUS] Error capturing status:', e.message); }
        continue;
      }

      const from = msg.key.remoteJid;

      // ── Extract senderPn (phone number JID) from EVERY message ──
      // This must happen before any other skip/continue to capture all LID mappings
      const senderPn = msg.key.senderPn;        // e.g. '919075358557@s.whatsapp.net'
      const senderLid = msg.key.senderLid;      // e.g. '258038028099636@lid'
      const participantPn = msg.key.participantPn; // for group messages
      
      if (senderPn && from && (from.endsWith('@lid') || isLidNumber(from))) {
        storeLidPhoneMapping(from, senderPn);
      }
      if (senderPn && senderLid) {
        storeLidPhoneMapping(senderLid, senderPn);
      }
      if (participantPn && msg.key.participant) {
        storeLidPhoneMapping(msg.key.participant, participantPn);
      }

      // Skip protocol messages (read receipts, key distribution, etc.)
      if (msg.message?.protocolMessage || msg.message?.senderKeyDistributionMessage) continue;

      // Detect self-sent messages: Baileys may report fromMe=false for messages
      // sent from the phone while bridge was offline, but participant matches our own JID/LID
      let isFromMe = msg.key.fromMe;
      if (!isFromMe && sock?.user?.id) {
        const myPhone = sock.user.id.split(':')[0];  // e.g. '919309986820'
        const myLid = sock.user.lid;                  // e.g. '123456@lid'
        const participant = msg.key.participant || '';
        const participantPhone = participant.split('@')[0].split(':')[0];
        // Match participant against our own phone or LID
        if (participantPhone === myPhone) {
          isFromMe = true;
        } else if (myLid && participant === myLid) {
          isFromMe = true;
        } else if (senderPn && senderPn.split('@')[0] === myPhone) {
          isFromMe = true;
        }
      }
      const messageId = msg.key.id;

      // Unwrap container message types (viewOnce, ephemeral, edited, etc.)
      let innerMessage = msg.message;
      if (innerMessage?.viewOnceMessage) innerMessage = innerMessage.viewOnceMessage.message;
      if (innerMessage?.viewOnceMessageV2) innerMessage = innerMessage.viewOnceMessageV2.message;
      if (innerMessage?.viewOnceMessageV2Extension) innerMessage = innerMessage.viewOnceMessageV2Extension.message;
      if (innerMessage?.ephemeralMessage) innerMessage = innerMessage.ephemeralMessage.message;
      if (innerMessage?.editedMessage?.message) innerMessage = innerMessage.editedMessage.message;
      if (innerMessage?.documentWithCaptionMessage?.message) innerMessage = innerMessage.documentWithCaptionMessage.message;

      // Extract message text from unwrapped message
      const text = innerMessage?.conversation
        || innerMessage?.extendedTextMessage?.text
        || innerMessage?.imageMessage?.caption
        || innerMessage?.videoMessage?.caption
        || innerMessage?.documentMessage?.caption
        || innerMessage?.buttonsResponseMessage?.selectedDisplayText
        || innerMessage?.listResponseMessage?.title
        || innerMessage?.templateButtonReplyMessage?.selectedDisplayText
        || '';

      // Detect media from unwrapped message
      let mediaInfo = null;
      if (innerMessage?.imageMessage) {
        mediaInfo = { kind: 'image', mimetype: innerMessage.imageMessage.mimetype };
      } else if (innerMessage?.videoMessage) {
        mediaInfo = { kind: 'video', mimetype: innerMessage.videoMessage.mimetype };
      } else if (innerMessage?.audioMessage) {
        mediaInfo = { kind: 'audio', mimetype: innerMessage.audioMessage.mimetype };
      } else if (innerMessage?.documentMessage) {
        mediaInfo = {
          kind: 'document',
          mimetype: innerMessage.documentMessage.mimetype,
          filename: innerMessage.documentMessage.fileName,
        };
      } else if (innerMessage?.stickerMessage) {
        mediaInfo = { kind: 'sticker', mimetype: innerMessage.stickerMessage.mimetype };
      } else if (innerMessage?.contactMessage) {
        mediaInfo = { kind: 'contact' };
      } else if (innerMessage?.locationMessage) {
        mediaInfo = { kind: 'location' };
      } else if (innerMessage?.liveLocationMessage) {
        mediaInfo = { kind: 'live_location' };
      }

      // If no text and no media detected, skip (reaction, read receipt, etc.)
      if (!text && !mediaInfo) {
        console.log(`[MSG] Skipping unhandled message type from ${from}: ${Object.keys(innerMessage || {}).join(', ')}`);
        continue;
      }

      // Cache raw message proto for on-demand media download later
      if (mediaInfo && msg.message) {
        rawMessageCache.set(messageId, msg);
        // Evict oldest entries if cache is full
        if (rawMessageCache.size > MAX_RAW_CACHE) {
          const oldest = rawMessageCache.keys().next().value;
          rawMessageCache.delete(oldest);
        }
      }

      // Download media if present
      let mediaBase64 = null;
      if (mediaInfo && msg.message) {
        try {
          const buffer = await downloadMediaMessage(msg, 'buffer', {}, {
            logger,
            reuploadRequest: sock.updateMediaMessage,
          });
          if (buffer) {
            mediaBase64 = buffer.toString('base64');
          }
        } catch (e) {
          console.error('[MEDIA] Failed to download:', e.message);
        }
      }

      // Build webhook payload (matches normalizeQRIncomingMessages format)
      // Use resolved phone number instead of LID for 'from' field
      const webhookFrom = (senderPn ? senderPn.replace('@s.whatsapp.net', '') : null)
        || (resolveToPhone(from))
        || from?.replace('@s.whatsapp.net', '').replace('@lid', '')
        || '';
      const webhookPayload = {
        from: webhookFrom,
        to: isFromMe ? webhookFrom : sock.user?.id?.split(':')[0],
        text: text,
        body: text,
        messageId: messageId,
        timestamp: msg.messageTimestamp,
        fromMe: isFromMe,
        hasMedia: !!mediaInfo,
        type: mediaInfo?.kind || 'text',
        // Include original JID for reference
        originalJid: from,
      };

      // Add media data (top-level fields for webhook compatibility)
      if (mediaInfo) {
        webhookPayload.media = {
          ...mediaInfo,
          data: mediaBase64,
        };
        webhookPayload.hasMedia = true;
        // Top-level fields that the QR webhook expects
        webhookPayload.mediaBase64 = mediaBase64;
        webhookPayload.mediaMimeType = mediaInfo.mimetype;
      }

      console.log(`[MSG] ${isFromMe ? '→' : '←'} ${from}: ${text?.substring(0, 60) || `[${mediaInfo?.kind || 'no-text'}]`}`);

      // Track in memory for /chats and /messages endpoints
      const ts = typeof msg.messageTimestamp === 'number'
        ? (msg.messageTimestamp < 10000000000 ? msg.messageTimestamp * 1000 : msg.messageTimestamp)
        : Date.now();
      const isGroup = from?.endsWith('@g.us');
      const isLid = from?.endsWith('@lid') || (!isGroup && isLidNumber(from));

      // Track group members from message senders (builds up over time)
      if (isGroup && msg.key?.participant) {
        if (!groupMembersCache.has(from)) {
          groupMembersCache.set(from, new Set());
        }
        groupMembersCache.get(from).add(msg.key.participant);
      }

      // Determine chat display name
      let chatDisplayName = msg.pushName || from?.split('@')[0];
      if (isGroup) {
        // For groups, use cached group subject or fetch it
        const cached = groupSubjectCache.get(from);
        if (cached) {
          chatDisplayName = cached;
        } else {
          // Fire-and-forget to fetch group name for next time
          getGroupSubject(from).then(subject => {
            if (subject && chatMap.has(from)) {
              chatMap.get(from).name = subject;
            }
          });
          // Use existing name if we have one, else fallback
          const existing = chatMap.get(from);
          if (existing?.name && !existing.name.includes('@') && !/^\d{10,}$/.test(existing.name)) {
            chatDisplayName = existing.name;
          }
        }
      } else if (isLid) {
        // LID contacts are individual contacts with internal IDs (14+ digit numbers)
        // First try to resolve phone number from senderPn or lidToPhoneMap
        const resolvedPhoneNum = resolveToPhone(from);
        const cachedContact = contactsCache.get(from);
        const existingChat = chatMap.get(from);
        chatDisplayName = msg.pushName
          || cachedContact?.notify
          || cachedContact?.name
          || cachedContact?.verifiedName
          || (existingChat?.name && !/^\d{14,}$/.test(existingChat.name) ? existingChat.name : null)
          || resolvedPhoneNum
          || (msg.key?.participant?.split('@')[0])
          || from?.split('@')[0];
        // Also update contactsCache with pushName for future lookups
        if (msg.pushName) {
          const existing = contactsCache.get(from) || {};
          contactsCache.set(from, { ...existing, notify: msg.pushName });
        }
      }

      // Determine resolved phone for this chat
      const chatResolvedPhone = resolveToPhone(from);
      
      chatMap.set(from, {
        id: from,
        name: chatDisplayName,
        isGroup: isGroup || false,
        isLid: isLid || false,
        ...(chatResolvedPhone && { resolvedPhone: chatResolvedPhone }),
        unreadCount: (chatMap.get(from)?.unreadCount || 0) + (isFromMe ? 0 : 1),
        lastMessageTime: new Date(ts).toISOString(),
        lastMessage: '',  // will be set below after displayText
      });
      // Build display text: prefer actual text, then describe the media type
      const displayText = text
        || (mediaInfo?.kind === 'contact' ? '📇 Contact card'
          : mediaInfo?.kind === 'location' ? '📍 Location'
          : mediaInfo?.kind === 'live_location' ? '📍 Live location'
          : mediaInfo?.kind === 'sticker' ? '🏷️ Sticker'
          : mediaInfo?.kind ? `[${mediaInfo.kind}]`
          : '');

      // Update lastMessage on chatMap
      if (chatMap.has(from)) {
        const chatEntry = chatMap.get(from);
        const senderPrefix = (isGroup || isLid) && !isFromMe ? `${msg.pushName || msg.key?.participant?.split('@')[0] || ''}: ` : '';
        chatEntry.lastMessage = senderPrefix + (displayText || '').substring(0, 80);
      }

      const msgEntry = {
        id: messageId,
        from: from?.replace('@s.whatsapp.net', ''),
        fromMe: isFromMe,
        text: displayText,
        type: mediaInfo?.kind || 'text',
        timestamp: msg.messageTimestamp,
        status: msg.status,
        participant: isGroup ? (msg.key?.participant || '') : undefined,
        pushName: msg.pushName || '',
        hasMedia: !!mediaInfo,
        mediaMimetype: mediaInfo?.mimetype || null,
        mediaFileName: mediaInfo?.filename || null,
        mediaUrl: null, // Will be populated after webhook upload
      };
      if (!messageMap.has(from)) messageMap.set(from, []);
      const chatMsgs = messageMap.get(from);
      // De-duplicate: if message already exists (e.g., from /send handler), update it
      // but preserve the existing mediaUrl (CDN URL set by /send handler)
      const existingIdx = chatMsgs.findIndex(m => m.id === messageId);
      if (existingIdx !== -1) {
        const existing = chatMsgs[existingIdx];
        // Preserve existing mediaUrl if it was already set (from /send cdnUrl)
        msgEntry.mediaUrl = existing.mediaUrl || msgEntry.mediaUrl;
        chatMsgs[existingIdx] = msgEntry;
        console.log(`[MSG] Updated existing message ${messageId} (mediaUrl: ${msgEntry.mediaUrl || 'none'})`);
      } else {
        chatMsgs.push(msgEntry);
        if (chatMsgs.length > MAX_MSGS_PER_CHAT) chatMsgs.shift();
      }

      // Forward to CRM webhook and capture the saved media URL
      forwardToWebhook(webhookPayload).then(mediaUrl => {
        if (mediaUrl) {
          // Update the in-memory msgEntry with the Bunny CDN URL
          msgEntry.mediaUrl = mediaUrl;
          console.log(`[MSG] Media URL stored for ${messageId}: ${mediaUrl}`);
        }
      });
      } catch (e) { console.error('[MSG] Error handling message:', e.message); }
    }
  });

  } catch (err) {
    console.error('[BAILEYS] startSocket error:', err.message);
    if (!intentionalDisconnect) {
      retryCount++;
      const delay = Math.min(retryCount * 3000, 30000);
      console.log(`[BAILEYS] Will retry in ${delay}ms`);
      clearReconnectTimer();
      reconnectTimer = setTimeout(() => { isStarting = false; startSocket(); }, delay);
    }
  } finally {
    isStarting = false;
  }
}

// ── Webhook Forwarding ──────────────────────────────────────────────────
// Returns the saved media URL from the webhook response (if any)
async function forwardToWebhook(payload) {
  const url = `${WEBHOOK_URL}/api/whatsapp/qr/webhook`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-qr-chat-secret': BRIDGE_SECRET,
        'x-bridge-secret': BRIDGE_SECRET,
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error(`[WEBHOOK] Failed (${res.status}):`, data);
      return null;
    } else {
      console.log(`[WEBHOOK] ✅ Forwarded message to CRM`);
      // Return the media URL if the webhook saved media
      // apiSuccess wraps in { success, data: { mediaUrl } }
      return data?.mediaUrl || data?.data?.mediaUrl || null;
    }
  } catch (e) {
    console.error(`[WEBHOOK] Error forwarding:`, e.message);
    return null;
  }
}

// ── API Endpoints ───────────────────────────────────────────────────────

// Health check (no auth required)
app.get('/health', (req, res) => {
  res.json({
    ok: true,
    status: connectionState,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// Connection status
app.get('/status', (req, res) => {
  const timeSinceLastConnect = lastConnectedTime > 0 ? Date.now() - lastConnectedTime : null;
  const isStable = connectionStabilizedTime > 0;
  
  res.json({
    connected: connectionState === 'connected',
    status: connectionState,
    phone: phoneInfo ? {
      id: phoneInfo.id?.split(':')[0],
      name: phoneInfo.name,
    } : null,
    qrAvailable: !!qrBase64,
    retryCount,
    uptime: process.uptime(),
    connectionInfo: {
      timeSinceLastConnect: timeSinceLastConnect,
      isStabilized: isStable,
      lastDisconnectTime,
    },
  });
});

// Get QR code
app.get('/qr', (req, res) => {
  if (connectionState === 'connected') {
    return res.json({ connected: true, message: 'Already connected', qr: null });
  }
  if (!qrBase64) {
    return res.json({ connected: false, qr: null, message: 'QR not yet generated. Waiting...' });
  }
  res.json({
    connected: false,
    qr: qrBase64,
    qrString: qrCode,
    message: 'Scan this QR code with WhatsApp',
  });
});

// Send message
app.post('/send', async (req, res) => {
  if (connectionState !== 'connected') {
    return res.status(503).json({ error: 'WhatsApp not connected', status: connectionState });
  }

  const { to, message, type, media, caption } = req.body;
  if (!to) {
    return res.status(400).json({ error: 'Missing "to" field' });
  }

  // Format JID — support group JIDs (@g.us) and individual (@s.whatsapp.net)
  const toStr = String(to);
  let jid;
  if (toStr.includes('@g.us') || toStr.includes('@lid') || toStr.includes('@s.whatsapp.net')) {
    // Group/LID/already-qualified JID — use as-is
    jid = toStr;
  } else if (toStr.includes('@')) {
    jid = toStr;
  } else {
    const phone = toStr.replace(/[^0-9]/g, '');
    jid = `${phone}@s.whatsapp.net`;
  }

  try {
    let result;

    if (type === 'media' && media) {
      // Media message — expect URL or base64
      const mediaBuffer = media.startsWith('data:')
        ? Buffer.from(media.split(',')[1], 'base64')
        : media.startsWith('http')
          ? await fetchMediaBuffer(media)
          : Buffer.from(media, 'base64');

      // Detect media type from URL or mime
      const mimeType = req.body.mimetype || mime.lookup(media) || 'application/octet-stream';
      const isImage = mimeType.startsWith('image/');
      const isVideo = mimeType.startsWith('video/');
      const isAudio = mimeType.startsWith('audio/');

      if (isImage) {
        result = await sock.sendMessage(jid, {
          image: mediaBuffer,
          caption: caption || message || '',
          mimetype: mimeType,
        });
      } else if (isVideo) {
        result = await sock.sendMessage(jid, {
          video: mediaBuffer,
          caption: caption || message || '',
          mimetype: mimeType,
        });
      } else if (isAudio) {
        result = await sock.sendMessage(jid, {
          audio: mediaBuffer,
          mimetype: mimeType,
          ptt: mimeType.includes('ogg'), // voice note for ogg
        });
      } else {
        result = await sock.sendMessage(jid, {
          document: mediaBuffer,
          mimetype: mimeType,
          fileName: req.body.fileName || 'file',
          caption: caption || message || '',
        });
      }

      console.log(`[SEND] ✅ Media sent to ${jid}`);
    } else {
      // Text message
      result = await sock.sendMessage(jid, { text: message || '' });
      console.log(`[SEND] ✅ Text sent to ${jid}: ${(message || '').substring(0, 50)}`);
    }

    // Store outbound message in memory for /messages endpoint
    const sentMsgId = result?.key?.id;
    const sentJid = jid;
    if (sentMsgId) {
      const outboundEntry = {
        id: sentMsgId,
        from: sock.user?.id?.split(':')[0] || '',
        fromMe: true,
        text: (type === 'media') ? (caption || message || `[${req.body.mimetype?.startsWith('image') ? 'image' : req.body.mimetype?.startsWith('video') ? 'video' : 'document'}]`) : (message || ''),
        type: (type === 'media') ? (req.body.mimetype?.startsWith('image') ? 'image' : req.body.mimetype?.startsWith('video') ? 'video' : req.body.mimetype?.startsWith('audio') ? 'audio' : 'document') : 'text',
        timestamp: Math.floor(Date.now() / 1000),
        status: result?.status,
        hasMedia: type === 'media',
        mediaMimetype: type === 'media' ? (req.body.mimetype || null) : null,
        mediaUrl: req.body.cdnUrl || null,
      };
      if (!messageMap.has(sentJid)) messageMap.set(sentJid, []);
      const chatMsgs = messageMap.get(sentJid);
      // Avoid duplicate if Baileys already added it via messages.upsert
      if (!chatMsgs.find(m => m.id === sentMsgId)) {
        chatMsgs.push(outboundEntry);
        if (chatMsgs.length > MAX_MSGS_PER_CHAT) chatMsgs.shift();
      } else {
        // Update existing entry with mediaUrl
        const existing = chatMsgs.find(m => m.id === sentMsgId);
        if (existing && req.body.cdnUrl) {
          existing.mediaUrl = req.body.cdnUrl;
          existing.hasMedia = true;
        }
      }
    }

    res.json({
      success: true,
      id: sentMsgId,
      messageId: sentMsgId,
      key: result?.key,
      status: result?.status,
    });
  } catch (e) {
    console.error(`[SEND] ❌ Error:`, e.message);
    res.status(500).json({ error: e.message });
  }
});

// Get profile picture URL for a JID
app.get('/profile-pic/:jid', async (req, res) => {
  try {
    // Only fetch if fully connected (not connecting/reconnecting)
    if (!sock || connectionState !== 'connected') {
      return res.json({ url: null, error: 'not_connected' });
    }
    
    let jid = req.params.jid;
    if (!jid.includes('@')) jid = `${jid}@s.whatsapp.net`;
    
    // Add 5-second timeout to prevent hanging on WhatsApp API calls
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('profilePictureUrl timeout')), 5000)
    );
    
    try {
      const url = await Promise.race([
        sock.profilePictureUrl(jid, 'image'),
        timeoutPromise
      ]);
      res.json({ url: url || null });
    } catch (err) {
      // No profile picture, privacy restricted, or timeout
      console.log(`[PROFILE-PIC] Failed for ${jid}: ${err.message}`);
      res.json({ url: null, error: err.message });
    }
  } catch (e) {
    console.error('[PROFILE-PIC] Unexpected error:', e.message);
    res.json({ url: null, error: e.message });
  }
});

// Get group info (participants, description, etc.)
app.get('/group-info/:jid', async (req, res) => {
  try {
    if (!sock || connectionState !== 'connected') {
      return res.status(503).json({ error: 'Not connected' });
    }
    const jid = req.params.jid;
    if (!jid.endsWith('@g.us')) {
      return res.status(400).json({ error: 'Not a group JID' });
    }
    
    // Get group metadata (Baileys LID mode returns limited participant lists)
    const metadata = await sock.groupMetadata(jid);
    let participants = metadata.participants || [];
    let serverSize = metadata.size || participants.length;
    
    // Map participants — each has id (LID), jid (phone), lid fields from Baileys
    const mappedParticipants = participants.map(p => ({
      id: p.jid || p.id,  // prefer phone-number JID over LID
      lid: p.lid || (p.id?.endsWith('@lid') ? p.id : undefined),
      admin: p.admin || null,
    }));

    // Merge tracked members discovered from incoming messages over time
    const cachedMembers = groupMembersCache.get(jid);
    if (cachedMembers && cachedMembers.size > 0) {
      const existingIds = new Set(mappedParticipants.map(p => p.id));
      const existingLids = new Set(mappedParticipants.map(p => p.lid).filter(Boolean));
      for (const memberId of cachedMembers) {
        if (!existingIds.has(memberId) && !existingLids.has(memberId)) {
          mappedParticipants.push({
            id: memberId,
            lid: memberId.endsWith('@lid') ? memberId : undefined,
            admin: null,
          });
        }
      }
    }

    // Best available size = max of server-reported size vs known participants
    const actualSize = Math.max(serverSize, mappedParticipants.length);
    
    res.json({
      id: metadata.id,
      subject: metadata.subject,
      subjectOwner: metadata.subjectOwner,
      subjectTime: metadata.subjectTime,
      desc: metadata.desc || '',
      descOwner: metadata.descOwner,
      creation: metadata.creation,
      owner: metadata.owner,
      size: actualSize,
      participants: mappedParticipants,
    });
  } catch (e) {
    console.error('[GROUP-INFO] Error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ── LID Resolution Functions ────────────────────────────────────────
// Batch resolve LID JIDs to phone numbers using Baileys' onWhatsApp-like queries
let lastBatchResolveTime = 0;
async function batchResolveLids(lidJids) {
  // Rate limit: max once per 30 seconds
  const now = Date.now();
  if (now - lastBatchResolveTime < 30000) return;
  lastBatchResolveTime = now;
  
  if (!sock || connectionState !== 'connected') return;
  
  const unresolved = lidJids.filter(jid => !lidToPhoneMap.has(jid));
  if (unresolved.length === 0) return;
  
  console.log(`[LID-RESOLVE] Attempting to resolve ${unresolved.length} LID contacts...`);
  
  try {
    // Try to use Baileys' internal USyncQuery with LID JIDs
    // Import USyncQuery and USyncUser from Baileys
    const { USyncQuery } = require('@whiskeysockets/baileys/lib/WAUSync/index.js');
    const { USyncUser } = require('@whiskeysockets/baileys/lib/WAUSync/USyncUser.js');
    
    // Process in batches of 10
    for (let i = 0; i < unresolved.length; i += 10) {
      const batch = unresolved.slice(i, i + 10);
      try {
        const query = new USyncQuery()
          .withContext('interactive')
          .withContactProtocol()
          .withLIDProtocol();
        
        for (const jid of batch) {
          // Try with @lid suffix for LID queries
          const num = jid.split('@')[0];
          const lidJid = `${num}@lid`;
          const user = new USyncUser();
          user.withId(lidJid);
          query.withUser(user);
        }
        
        const result = await sock.executeUSyncQuery(query);
        if (result && result.list) {
          for (const item of result.list) {
            // The response 'id' is the JID from the server (might be phone JID)
            const responseJid = item.id;
            const responseLid = item.lid; // from LID protocol parser
            
            if (responseJid && responseLid) {
              // If responseJid is a phone number JID, we have our mapping
              const phoneNum = responseJid.split('@')[0];
              if (!isLidNumber(responseJid) && /^\d{10,13}$/.test(phoneNum)) {
                storeLidPhoneMapping(responseLid, responseJid);
              }
            }
            // Also check: if the query was with an LID, the server might return
            // the phone JID in the response id field
            if (responseJid && !isLidNumber(responseJid)) {
              // Find which LID this response corresponds to
              for (const jid of batch) {
                const num = jid.split('@')[0];
                if (responseLid && responseLid.includes(num)) {
                  storeLidPhoneMapping(jid, responseJid);
                }
              }
            }
          }
        }
      } catch (e) {
        console.error(`[LID-RESOLVE] Batch query error:`, e.message);
      }
    }
    
    console.log(`[LID-RESOLVE] Map now has ${lidToPhoneMap.size} entries`);
  } catch (e) {
    console.error('[LID-RESOLVE] Error:', e.message);
  }
}

// Endpoint to get LID resolution status and trigger resolution
app.get('/lid-map', (req, res) => {
  const map = {};
  for (const [lid, phone] of lidToPhoneMap.entries()) {
    map[lid] = phone;
  }
  res.json({ 
    entries: lidToPhoneMap.size, 
    map,
    contactsCacheSize: contactsCache.size,
  });
});

// Mark chat as read — reset unreadCount in chatMap
app.post('/read/:jid', async (req, res) => {
  try {
    const jid = req.params.jid.includes('@') ? req.params.jid : `${req.params.jid}@s.whatsapp.net`;
    const chat = chatMap.get(jid);
    if (chat) {
      chat.unreadCount = 0;
      chatMap.set(jid, chat);
    }
    // Also try to mark as read on WhatsApp via Baileys
    if (sock && connectionState === 'connected') {
      try {
        await sock.readMessages([{ remoteJid: jid, id: undefined }]);
      } catch (e) {
        // readMessages may fail for some JIDs — ignore silently
      }
    }
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Get chats list
app.get('/chats', async (req, res) => {
  // If we have unresolved LIDs, try batch resolution in background
  const unresolvedLids = [];
  const allChats = Array.from(chatMap.values());
  for (const chat of allChats) {
    if (!chat.isGroup && (chat.id.endsWith('@lid') || isLidNumber(chat.id)) && !lidToPhoneMap.has(chat.id)) {
      unresolvedLids.push(chat.id);
    }
  }
  if (unresolvedLids.length > 0 && sock && connectionState === 'connected') {
    // Fire-and-forget batch resolution
    batchResolveLids(unresolvedLids.slice(0, 50)).catch(e => 
      console.error('[LID-RESOLVE] Batch error:', e.message)
    );
  }
  try {
    // Resolve any remaining unresolved group/contact names before serving
    const chats = Array.from(chatMap.values());
    for (const chat of chats) {
      if (chat.isGroup && (/^\d+$/.test(chat.name) || chat.name.includes('@'))) {
        // Group name is still just a number or JID — try to resolve
        const subject = groupSubjectCache.get(chat.id);
        if (subject) {
          chat.name = subject;
        }
      } else if (!chat.isGroup && (chat.id.endsWith('@lid') || isLidNumber(chat.id))) {
        // LID contact — try to resolve to phone number
        chat.isLid = true;
        const phoneNum = resolveToPhone(chat.id);
        if (phoneNum) {
          chat.resolvedPhone = phoneNum;
          // If name is still a raw LID number, replace with phone
          if (/^\d{14,}$/.test(chat.name)) {
            chat.name = phoneNum;
          }
        } else if (/^\d{14,}$/.test(chat.name)) {
          // No phone resolved — try contactsCache
          const cached = contactsCache.get(chat.id);
          if (cached) {
            chat.name = cached.notify || cached.name || cached.verifiedName || chat.name;
          }
        }
      }
    }
    const result = chats.sort((a, b) => {
        const ta = a.lastMessageTime ? new Date(a.lastMessageTime).getTime() : 0;
        const tb = b.lastMessageTime ? new Date(b.lastMessageTime).getTime() : 0;
        return tb - ta;
      });
    res.json({ chats: result, connected: connectionState === 'connected' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Get messages for a chat
app.get('/messages/:jid', async (req, res) => {
  try {
    const jid = req.params.jid.includes('@')
      ? req.params.jid
      : `${req.params.jid}@s.whatsapp.net`;

    const limit = parseInt(req.query.limit || '50', 10);
    const msgs = messageMap.get(jid) || [];
    res.json({ messages: msgs.slice(-limit) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Disconnect — close socket but keep auth (can reconnect without QR)
app.post('/disconnect', async (req, res) => {
  try {
    intentionalDisconnect = true;
    clearReconnectTimer();
    if (sock) {
      try { sock.ev.removeAllListeners(); sock.end(undefined); } catch {}
      sock = null;
    }
    connectionState = 'disconnected';
    phoneInfo = null;
    qrCode = null;
    qrBase64 = null;
    isStarting = false;
    res.json({ ok: true, message: 'Disconnected. Auth preserved — use Reconnect to resume.' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Logout — clear auth state entirely (must scan QR again)
app.post('/logout', async (req, res) => {
  try {
    intentionalDisconnect = true;
    clearReconnectTimer();
    if (sock) {
      try { await sock.logout(); } catch (e) { console.log('[LOGOUT] sock.logout() failed:', e.message); }
      try { sock.ev.removeAllListeners(); sock.end(undefined); } catch {}
      sock = null;
    }
    // Clear auth from DB
    try {
      const client = await getMongoClient();
      if (client) {
        await client.db(AUTH_DB_NAME).collection(AUTH_COLLECTION).deleteMany({});
        console.log('[AUTH] Cleared MongoDB auth');
      } else if (fs.existsSync(AUTH_DIR)) {
        fs.rmSync(AUTH_DIR, { recursive: true, force: true });
      }
    } catch (e) { console.error('[AUTH] Clear failed:', e.message); }
    connectionState = 'disconnected';
    phoneInfo = null;
    qrCode = null;
    qrBase64 = null;
    isStarting = false;
    res.json({ ok: true, message: 'Logged out. Scan QR to reconnect.' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Reconnect
app.post('/reconnect', async (req, res) => {
  try {
    intentionalDisconnect = false;
    clearReconnectTimer();
    connectionState = 'connecting';
    retryCount = 0;
    if (sock) {
      try { sock.ev.removeAllListeners(); sock.end(undefined); } catch {}
      sock = null;
    }
    isStarting = false;
    setTimeout(startSocket, 500);
    res.json({ ok: true, message: 'Reconnecting...' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Download media from a message
app.get('/media/:messageId', async (req, res) => {
  try {
    const messageId = req.params.messageId;
    const msg = rawMessageCache.get(messageId);
    
    if (!msg || !msg.message) {
      return res.status(404).json({ error: 'Message not found or has no media' });
    }

    // Download the media buffer
    let buffer;
    try {
      buffer = await downloadMediaMessage(msg, 'buffer', {}, {
        logger,
        reuploadRequest: sock?.updateMediaMessage,
      });
    } catch (e) {
      console.error('[MEDIA DOWNLOAD] Failed:', e.message);
      return res.status(500).json({ error: 'Failed to download media: ' + e.message });
    }

    if (!buffer) {
      return res.status(404).json({ error: 'Media buffer is empty' });
    }

    // Detect MIME type from message
    const innerMessage = msg.message?.viewOnceMessage?.message || msg.message?.ephemeralMessage?.message || msg.message;
    let mimetype = 'application/octet-stream';
    let filename = `media_${messageId}`;

    if (innerMessage?.imageMessage) {
      mimetype = innerMessage.imageMessage.mimetype || 'image/jpeg';
      filename = `image_${messageId}.${mime.extension(mimetype) || 'jpg'}`;
    } else if (innerMessage?.videoMessage) {
      mimetype = innerMessage.videoMessage.mimetype || 'video/mp4';
      filename = `video_${messageId}.${mime.extension(mimetype) || 'mp4'}`;
    } else if (innerMessage?.audioMessage) {
      mimetype = innerMessage.audioMessage.mimetype || 'audio/ogg';
      filename = `audio_${messageId}.${mime.extension(mimetype) || 'ogg'}`;
    } else if (innerMessage?.documentMessage) {
      mimetype = innerMessage.documentMessage.mimetype || 'application/octet-stream';
      filename = innerMessage.documentMessage.fileName || `document_${messageId}`;
    } else if (innerMessage?.stickerMessage) {
      mimetype = innerMessage.stickerMessage.mimetype || 'image/webp';
      filename = `sticker_${messageId}.${mime.extension(mimetype) || 'webp'}`;
    }

    res.setHeader('Content-Type', mimetype);
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    res.setHeader('Content-Length', buffer.length);
    res.setHeader('Cache-Control', 'public, max-age=86400');

    res.send(buffer);
  } catch (e) {
    console.error('[MEDIA] Download error:', e.message);
    res.status(500).json({ error: 'Failed to download media' });
  }
});

// ── Group Admin Endpoints ────────────────────────────────────────────────

// Update group description
app.post('/group-update-desc/:jid', async (req, res) => {
  try {
    if (!sock || connectionState !== 'connected') return res.status(503).json({ error: 'Not connected' });
    const jid = req.params.jid;
    if (!jid.endsWith('@g.us')) return res.status(400).json({ error: 'Not a group JID' });
    const { description } = req.body || {};
    if (typeof description !== 'string') return res.status(400).json({ error: 'description required' });
    await sock.groupUpdateDescription(jid, description);
    res.json({ success: true });
  } catch (e) {
    console.error('[GROUP-DESC] Error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// Update group subject (name)
app.post('/group-update-subject/:jid', async (req, res) => {
  try {
    if (!sock || connectionState !== 'connected') return res.status(503).json({ error: 'Not connected' });
    const jid = req.params.jid;
    if (!jid.endsWith('@g.us')) return res.status(400).json({ error: 'Not a group JID' });
    const { subject } = req.body || {};
    if (!subject?.trim()) return res.status(400).json({ error: 'subject required' });
    await sock.groupUpdateSubject(jid, subject.trim());
    res.json({ success: true });
  } catch (e) {
    console.error('[GROUP-SUBJECT] Error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// Get group invite link
app.get('/group-invite/:jid', async (req, res) => {
  try {
    if (!sock || connectionState !== 'connected') return res.status(503).json({ error: 'Not connected' });
    const jid = req.params.jid;
    if (!jid.endsWith('@g.us')) return res.status(400).json({ error: 'Not a group JID' });
    const code = await sock.groupInviteCode(jid);
    res.json({ code, link: `https://chat.whatsapp.com/${code}` });
  } catch (e) {
    console.error('[GROUP-INVITE] Error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// Revoke group invite link
app.post('/group-revoke-invite/:jid', async (req, res) => {
  try {
    if (!sock || connectionState !== 'connected') return res.status(503).json({ error: 'Not connected' });
    const jid = req.params.jid;
    if (!jid.endsWith('@g.us')) return res.status(400).json({ error: 'Not a group JID' });
    const code = await sock.groupRevokeInvite(jid);
    res.json({ code, link: `https://chat.whatsapp.com/${code}` });
  } catch (e) {
    console.error('[GROUP-REVOKE] Error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// Update group settings (announce = only admins can send, not_announce = everyone)
app.post('/group-settings/:jid', async (req, res) => {
  try {
    if (!sock || connectionState !== 'connected') return res.status(503).json({ error: 'Not connected' });
    const jid = req.params.jid;
    if (!jid.endsWith('@g.us')) return res.status(400).json({ error: 'Not a group JID' });
    const { setting } = req.body || {};
    // setting: 'announcement' (only admins send), 'not_announcement' (all members send),
    //          'locked' (only admins edit info), 'unlocked' (members edit info)
    if (!setting) return res.status(400).json({ error: 'setting required' });
    await sock.groupSettingUpdate(jid, setting);
    res.json({ success: true, setting });
  } catch (e) {
    console.error('[GROUP-SETTINGS] Error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// Promote/demote/remove participants
app.post('/group-participants/:jid', async (req, res) => {
  try {
    if (!sock || connectionState !== 'connected') return res.status(503).json({ error: 'Not connected' });
    const jid = req.params.jid;
    if (!jid.endsWith('@g.us')) return res.status(400).json({ error: 'Not a group JID' });
    const { action, participants } = req.body || {};
    if (!action || !participants?.length) return res.status(400).json({ error: 'action and participants[] required' });
    // action: 'promote', 'demote', 'remove'
    switch (action) {
      case 'promote': await sock.groupParticipantsUpdate(jid, participants, 'promote'); break;
      case 'demote': await sock.groupParticipantsUpdate(jid, participants, 'demote'); break;
      case 'remove': await sock.groupParticipantsUpdate(jid, participants, 'remove'); break;
      default: return res.status(400).json({ error: 'Invalid action. Use promote/demote/remove' });
    }
    res.json({ success: true, action, participants });
  } catch (e) {
    console.error('[GROUP-PARTICIPANTS] Error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ── Status/Stories ──────────────────────────────────────────────────────
app.get('/statuses', (req, res) => {
  try {
    // Group statuses by sender
    const grouped = {};
    for (const s of statusStore) {
      if (!grouped[s.senderJid]) {
        grouped[s.senderJid] = {
          senderJid: s.senderJid,
          senderPhone: s.senderPhone,
          senderName: s.senderName,
          statuses: [],
        };
      }
      grouped[s.senderJid].statuses.push(s);
    }
    res.json({ statuses: Object.values(grouped), total: statusStore.length });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Helpers ─────────────────────────────────────────────────────────────
async function fetchMediaBuffer(url) {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Failed to fetch media: ${resp.status}`);
  return Buffer.from(await resp.arrayBuffer());
}

// ── Start ───────────────────────────────────────────────────────────────
const server = app.listen(PORT, () => {
  console.log(`\n╔══════════════════════════════════════════════════╗`);
  console.log(`║  Swar Yoga WhatsApp Bridge (Baileys)             ║`);
  console.log(`║  Port: ${PORT}                                    ║`);
  console.log(`║  Webhook: ${WEBHOOK_URL.substring(0, 38).padEnd(38)}║`);
  console.log(`╚══════════════════════════════════════════════════╝\n`);

  // Pre-load old chats from DB so they are available immediately
  loadChatsFromDB().then(() => {
    // Start WhatsApp connection
    return startSocket();
  }).catch(err => {
    console.error('[FATAL] Failed to start:', err);
    process.exit(1);
  });
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`[FATAL] Port ${PORT} is already in use. Kill the other process first:\n  lsof -ti:${PORT} | xargs kill -9`);
    process.exit(1);
  }
  throw err;
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n[SHUTDOWN] SIGINT received');
  clearReconnectTimer();
  clearKeepaliveTimer();
  if (sock) try { sock.ev.removeAllListeners(); sock.end(undefined); } catch {}
  if (mongoClient) try { await mongoClient.close(); } catch {}
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n[SHUTDOWN] SIGTERM received');
  clearReconnectTimer();
  clearKeepaliveTimer();
  if (sock) try { sock.ev.removeAllListeners(); sock.end(undefined); } catch {}
  if (mongoClient) try { await mongoClient.close(); } catch {}
  process.exit(0);
});
