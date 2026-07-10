/**
 * Swar Yoga WhatsApp Bridge — Multi-User Baileys Edition
 * 
 * Supports up to 1000 independent WhatsApp sessions per bridge instance.
 * Each session is isolated by a production session key (preferably the 7-digit
 * permanentTenantId sent via x-session-key / x-tenant-id), while the CRM app
 * user stays available separately in x-user-id for auditing and webhooks.
 * Auth state per user stored in MongoDB with userId prefix.
 * 
 * Endpoints — all require x-bridge-secret header.
 * Session isolation prefers x-session-key (or x-tenant-id), while x-user-id
 * remains the CRM owner identity for logs and webhook routing:
 *   GET  /health           — bridge health (no session needed)
 *   GET  /sessions         — list active sessions (admin)
 *   GET  /status           — user's connection status (auto-starts session)
 *   GET  /qr               — user's QR code (auto-starts session)
 *   POST /send             — send text/media message
 *   GET  /messages/:jid    — get messages for a chat
 *   GET  /chats            — list all chats
 *   POST /disconnect       — disconnect (preserve auth)
 *   POST /logout           — logout + clear auth
 *   POST /reconnect        — reconnect existing session
 *   ... and more (groups, reactions, media, etc.)
 */

// ═══ GLOBAL CRASH HANDLERS ═══
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
const MAX_SESSIONS = 1000;
const SESSION_IDLE_TIMEOUT = 24 * 60 * 60 * 1000; // 24h — cleanup idle sessions
const SESSION_CLEANUP_INTERVAL = 60 * 60 * 1000;  // Check every 1h
const MAX_RETRIES = 50;
const KEEP_ALIVE_INTERVAL = 60000;
const STABILIZATION_THRESHOLD = 30000;
const MAX_MSGS_PER_CHAT = 100;
const MAX_RAW_CACHE = 500;
const MAX_STATUS_STORE = 50;
const ENABLE_DB_CHAT_HYDRATION = process.env.WHATSAPP_BRIDGE_ENABLE_DB_HYDRATION === 'true';

// ── Logging ─────────────────────────────────────────────────────────────
const logger = pino({ level: process.env.LOG_LEVEL || 'warn' });

// ── MongoDB Singleton ───────────────────────────────────────────────────
let mongoClient = null;
async function getMongoClient() {
  if (mongoClient) return mongoClient;
  if (!MONGODB_URI) return null;
  mongoClient = new MongoClient(MONGODB_URI, { maxPoolSize: 10, serverSelectionTimeoutMS: 10000 });
  await mongoClient.connect();
  console.log('[MONGO] Connected (singleton)');
  return mongoClient;
}

// ═══════════════════════════════════════════════════════════════════════
// SESSION CLASS — each CRM user gets one
// ═══════════════════════════════════════════════════════════════════════
class UserSession {
  constructor(sessionKey, ownerUserId = sessionKey, tenantId = null) {
    this.userId = sessionKey;
    this.sessionKey = sessionKey;
    this.ownerUserId = ownerUserId || sessionKey;
    this.tenantId = tenantId || null;
    this.sock = null;
    this.qrCode = null;
    this.qrBase64 = null;
    this.connectionState = 'disconnected';
    this.retryCount = 0;
    this.phoneInfo = null;
    this.lastQrTime = 0;
    this.lastConnectedTime = 0;
    this.connectionStabilizedTime = 0;
    this.lastDisconnectTime = 0;
    this.keepaliveTimer = null;
    this.chatSyncDebounceTimer = null;
    this.chatSyncInterval = null;
    this.isStarting = false;
    this.intentionalDisconnect = false;
    this.reconnectTimer = null;
    this.saveCreds = null;

    // Per-user in-memory data
    this.chatMap = new Map();
    this.messageMap = new Map();
    this.rawMessageCache = new Map();
    this.sentMessageCache = new Map(); // id -> message proto, for getMessage() retry recovery
    this.groupSubjectCache = new Map();
    this.groupMembersCache = new Map();
    this.contactsCache = new Map();
    this.lidToPhoneMap = new Map();
    this.phoneToLidMap = new Map();
    this.statusStore = [];
    this.presenceMap = new Map();

    this.lastActivityTime = Date.now();
    this.createdAt = Date.now();
  }

  clearReconnectTimer() {
    if (this.reconnectTimer) { clearTimeout(this.reconnectTimer); this.reconnectTimer = null; }
  }

  clearKeepaliveTimer() {
    if (this.keepaliveTimer) { clearInterval(this.keepaliveTimer); this.keepaliveTimer = null; }
  }

  clearChatSyncTimers() {
    if (this.chatSyncDebounceTimer) { clearTimeout(this.chatSyncDebounceTimer); this.chatSyncDebounceTimer = null; }
    if (this.chatSyncInterval) { clearInterval(this.chatSyncInterval); this.chatSyncInterval = null; }
  }

  startKeepalive() {
    this.clearKeepaliveTimer();
    const self = this;
    this.keepaliveTimer = setInterval(() => {
      if (self.connectionState === 'connected' && self.sock) {
        const timeSinceConnect = Date.now() - self.lastConnectedTime;
        if (timeSinceConnect > STABILIZATION_THRESHOLD) {
          if (!self.connectionStabilizedTime) {
            self.connectionStabilizedTime = Date.now();
            console.log(`[${self.userId}] Connection stabilized ✓`);
          }
        }
      }
    }, KEEP_ALIVE_INTERVAL);
  }

  touch() {
    this.lastActivityTime = Date.now();
  }

  /** Gracefully tear down this session's socket */
  async destroy() {
    this.clearReconnectTimer();
    this.clearKeepaliveTimer();
    this.clearChatSyncTimers();
    this.intentionalDisconnect = true;
    if (this.sock) {
      try { this.sock.ev.removeAllListeners(); this.sock.end(undefined); } catch {}
      this.sock = null;
    }
    this.connectionState = 'disconnected';
    this.phoneInfo = null;
    this.qrCode = null;
    this.qrBase64 = null;
    this.isStarting = false;
  }
}

function clearSessionRuntimeData(session) {
  session.chatMap.clear();
  session.messageMap.clear();
  session.rawMessageCache.clear();
  session.groupSubjectCache.clear();
  session.groupMembersCache.clear();
  session.contactsCache.clear();
  session.lidToPhoneMap.clear();
  session.phoneToLidMap.clear();
  session.statusStore = [];
  session.presenceMap.clear();
}

// ── Sessions Map ────────────────────────────────────────────────────────
const sessions = new Map(); // sessionKey -> UserSession

function getOrCreateSession(sessionKey, ownerUserId = sessionKey, tenantId = null) {
  if (sessions.has(sessionKey)) {
    const s = sessions.get(sessionKey);
    if (ownerUserId) s.ownerUserId = ownerUserId;
    if (tenantId) s.tenantId = tenantId;
    s.touch();
    return s;
  }
  // Evict oldest idle session if at capacity
  if (sessions.size >= MAX_SESSIONS) {
    let oldestKey = null, oldestTime = Infinity;
    for (const [k, s] of sessions) {
      if (s.connectionState !== 'connected' && s.lastActivityTime < oldestTime) {
        oldestTime = s.lastActivityTime;
        oldestKey = k;
      }
    }
    if (oldestKey) {
      console.log(`[SESSIONS] Evicting idle session: ${oldestKey}`);
      const old = sessions.get(oldestKey);
      old.destroy();
      sessions.delete(oldestKey);
    }
  }
  const session = new UserSession(sessionKey, ownerUserId, tenantId);
  sessions.set(sessionKey, session);
  console.log(`[SESSIONS] Created session ${sessionKey} for owner ${ownerUserId} (total: ${sessions.size})`);
  return session;
}

// ── Periodic Session Cleanup ────────────────────────────────────────────
setInterval(() => {
  const now = Date.now();
  for (const [userId, session] of sessions) {
    // Don't clean up connected sessions, only idle disconnected ones
    if (session.connectionState !== 'connected' && (now - session.lastActivityTime) > SESSION_IDLE_TIMEOUT) {
      console.log(`[CLEANUP] Removing idle session: ${userId} (idle ${Math.round((now - session.lastActivityTime) / 3600000)}h)`);
      session.destroy();
      sessions.delete(userId);
    }
  }
}, SESSION_CLEANUP_INTERVAL);

// ═══════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS (take session as first param where needed)
// ═══════════════════════════════════════════════════════════════════════

function isLidNumber(jid) {
  if (!jid) return false;
  const num = jid.split('@')[0];
  return /^\d{14,}$/.test(num);
}

function storeLidPhoneMapping(session, lidJid, phoneJid) {
  if (!lidJid || !phoneJid) return;
  const lidNorm = lidJid.includes('@') ? lidJid : `${lidJid}@lid`;
  const phoneNorm = phoneJid.includes('@') ? phoneJid : `${phoneJid}@s.whatsapp.net`;
  const phoneNum = phoneNorm.split('@')[0];
  if (/^\d{14,}$/.test(phoneNum)) return;
  session.lidToPhoneMap.set(lidNorm, phoneNorm);
  session.phoneToLidMap.set(phoneNorm, lidNorm);
  const lidNum = lidNorm.split('@')[0];
  const lidAsPhone = `${lidNum}@s.whatsapp.net`;
  session.lidToPhoneMap.set(lidAsPhone, phoneNorm);
}

function resolveToPhone(session, jid) {
  if (!jid) return jid;
  const resolved = session.lidToPhoneMap.get(jid);
  if (resolved) return resolved.split('@')[0];
  const num = jid.split('@')[0];
  const asLid = `${num}@lid`;
  const resolved2 = session.lidToPhoneMap.get(asLid);
  if (resolved2) return resolved2.split('@')[0];
  return null;
}

function getChatAliasJids(session, jid) {
  if (!jid) return [];

  const aliases = new Set();
  const normalized = jid.includes('@') ? jid : `${jid}@s.whatsapp.net`;
  aliases.add(normalized);

  if (normalized.endsWith('@g.us')) {
    return Array.from(aliases);
  }

  if (normalized.endsWith('@lid') || isLidNumber(normalized)) {
    const phoneNum = resolveToPhone(session, normalized);
    if (phoneNum) aliases.add(`${phoneNum}@s.whatsapp.net`);
  } else {
    const phoneJid = normalized.endsWith('@s.whatsapp.net') ? normalized : `${normalized.split('@')[0]}@s.whatsapp.net`;
    aliases.add(phoneJid);

    const directLid = session.phoneToLidMap.get(phoneJid);
    if (directLid) aliases.add(directLid.includes('@') ? directLid : `${directLid}@lid`);

    for (const [lid, phone] of session.lidToPhoneMap.entries()) {
      if (phone === phoneJid) aliases.add(lid.includes('@') ? lid : `${lid}@lid`);
    }
  }

  return Array.from(aliases);
}

function getMergedMessagesForJid(session, jid, limit = 50) {
  const aliases = getChatAliasJids(session, jid);
  const byId = new Map();

  for (const aliasJid of aliases) {
    const chatMsgs = session.messageMap.get(aliasJid) || [];
    for (const msg of chatMsgs) {
      const existing = byId.get(msg.id);
      if (!existing) {
        byId.set(msg.id, { ...msg });
        continue;
      }

      byId.set(msg.id, {
        ...existing,
        ...msg,
        status: Math.max(existing.status ?? 0, msg.status ?? 0),
        mediaUrl: existing.mediaUrl || msg.mediaUrl || null,
        reactions: { ...(existing.reactions || {}), ...(msg.reactions || {}) },
      });
    }
  }

  return Array.from(byId.values())
    .sort((a, b) => Number(a.timestamp || 0) - Number(b.timestamp || 0))
    .slice(-limit);
}

function isUsefulChatName(name) {
  const value = String(name || '').trim();
  if (!value) return false;
  if (/^\d+$/.test(value)) return false;
  if (/^\d{14,}$/.test(value)) return false;
  if (value.includes('@')) return false;
  if (/^(unknown\s+)?contact$/i.test(value)) return false;
  if (/^contact\s+\d+$/i.test(value)) return false;
  return true;
}

async function getGroupSubject(session, jid) {
  if (session.groupSubjectCache.has(jid)) return session.groupSubjectCache.get(jid);
  try {
    if (session.sock) {
      const metadata = await session.sock.groupMetadata(jid);
      if (metadata?.subject) {
        session.groupSubjectCache.set(jid, metadata.subject);
        return metadata.subject;
      }
    }
  } catch (e) {}
  return null;
}

async function prefetchGroupNames(session) {
  try {
    if (!session.sock) return;
    const groups = await session.sock.groupFetchAllParticipating();
    let count = 0;
    for (const [jid, meta] of Object.entries(groups)) {
      if (meta.subject) {
        session.groupSubjectCache.set(jid, meta.subject);
        if (meta.participants && meta.participants.length > 0) {
          if (!session.groupMembersCache.has(jid)) session.groupMembersCache.set(jid, new Set());
          const membersSet = session.groupMembersCache.get(jid);
          for (const p of meta.participants) {
            const bestId = p.jid || p.id;
            if (bestId) membersSet.add(bestId);
          }
        }
        if (session.chatMap.has(jid)) {
          const existing = session.chatMap.get(jid);
          existing.name = meta.subject;
          existing.isGroup = true;
        }
        count++;
      }
    }
    console.log(`[${session.userId}] Prefetched ${count} group names`);
  } catch (e) {
    console.error(`[${session.userId}] Failed to prefetch group names:`, e.message);
  }
}

async function loadChatsFromDB(session) {
  if (!MONGODB_URI) return;
  try {
    const client = await getMongoClient();
    if (!client) return;
    const db = client.db(AUTH_DB_NAME);
    const col = db.collection('whatsapp_messages');
    const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

    // Try to load only this user's messages if ownerId field exists
    const filter = {
      provider: { $in: ['whatsapp_web_bridge', 'whatsapp_qr', null] },
      sentAt: { $gte: cutoff },
    };
    // Only load messages that belong to this specific user
    // CRITICAL: Do NOT include legacy untagged messages for non-admin users
    // as that would leak the super admin's chat data to other users.
    if (session.ownerUserId !== 'default') {
      filter.$or = [
        { bridgeUserId: session.ownerUserId },
        { ownerId: session.ownerUserId },
      ];
    }

    const docs = await col.find(filter).sort({ sentAt: 1 }).limit(2000).toArray();
    let chatCount = 0, msgCount = 0;

    for (const doc of docs) {
      const phone = (doc.phoneNumber || '').replace(/\D/g, '');
      if (!phone || phone.length < 10) continue;
      const jid = `${phone}@s.whatsapp.net`;
      const isFromMe = doc.direction === 'outbound';
      const ts = doc.sentAt ? new Date(doc.sentAt).toISOString() : new Date().toISOString();
      if (!session.chatMap.has(jid)) chatCount++;
      session.chatMap.set(jid, { id: jid, name: doc.senderDisplayName || phone, isGroup: false, unreadCount: 0, lastMessageTime: ts });
      const msgEntry = {
        id: doc.waMessageId || String(doc._id),
        from: phone, fromMe: isFromMe,
        text: doc.messageContent || (doc.media?.kind ? `[${doc.media.kind}]` : ''),
        type: doc.media?.kind || doc.messageType || 'text',
        timestamp: doc.sentAt ? Math.floor(new Date(doc.sentAt).getTime() / 1000) : 0,
        status: doc.status, hasMedia: doc.hasMedia || !!doc.media?.url,
        mediaUrl: doc.media?.url || null, mediaMimetype: doc.media?.mimeType || null, mediaFileName: doc.media?.fileName || null,
      };
      if (!session.messageMap.has(jid)) session.messageMap.set(jid, []);
      const arr = session.messageMap.get(jid);
      arr.push(msgEntry);
      if (arr.length > MAX_MSGS_PER_CHAT) arr.shift();
      msgCount++;
    }
    console.log(`[${session.userId}] Hydrated ${chatCount} chats, ${msgCount} messages from DB`);
  } catch (err) {
    console.error(`[${session.userId}] Failed to load chats:`, err.message);
  }
}

// ── Webhook Forwarding ──────────────────────────────────────────────────
async function forwardToWebhook(session, payload) {
  const url = `${WEBHOOK_URL}/api/whatsapp/qr/webhook`;
  // Tag payload with the bridge user so CRM can route it
  payload.bridgeUserId = session.ownerUserId || session.userId;
  payload.bridgeSessionId = session.sessionKey || session.userId;
  payload.bridgeTenantId = session.tenantId || null;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-qr-chat-secret': BRIDGE_SECRET,
        'x-bridge-secret': BRIDGE_SECRET,
        'x-user-id': session.ownerUserId || session.userId || '',
        'x-session-key': session.sessionKey || session.userId || '',
        'x-tenant-id': session.tenantId || '',
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error(`[${session.userId}][WEBHOOK] Failed (${res.status}):`, data);
      return null;
    }
    return data?.mediaUrl || data?.data?.mediaUrl || null;
  } catch (e) {
    console.error(`[${session.userId}][WEBHOOK] Error:`, e.message);
    return null;
  }
}

// Persist the in-memory chatMap to qr_whatsapp_chats so the inbox sidebar
// shows the full chat list (including history-synced chats) even after a
// bridge restart wipes chatMap. See /api/admin/crm/whatsapp/qr/sync.
async function syncChatsToDb(session) {
  try {
    const connectedPhone = session.sock?.user?.id?.split(':')[0];
    if (!connectedPhone) return;
    const chats = Array.from(session.chatMap.values())
      .filter(c => c.id && c.id !== 'status@broadcast')
      .map(c => ({
        chatJid: c.id,
        name: c.name || '',
        isGroup: !!c.isGroup,
        lastMessage: typeof c.lastMessage === 'string' ? c.lastMessage : '',
        lastMessageTime: c.lastMessageTime || null,
        unreadCount: c.unreadCount || 0,
        pinned: !!c.pinned,
        archived: !!c.archived,
      }));
    if (chats.length === 0) return;

    const res = await fetch(`${WEBHOOK_URL}/api/admin/crm/whatsapp/qr/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-bridge-secret': BRIDGE_SECRET,
      },
      body: JSON.stringify({
        action: 'sync_chats',
        userId: session.ownerUserId || session.userId,
        connectedPhone,
        chats,
      }),
      signal: AbortSignal.timeout(20000),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      console.log(`[${session.userId}] Chat sync: ${chats.length} chats (upserted=${data.chats?.upserted ?? 0}, modified=${data.chats?.modified ?? 0})`);
    } else {
      console.error(`[${session.userId}] Chat sync failed (${res.status}):`, data);
    }
  } catch (e) {
    console.error(`[${session.userId}] Chat sync error:`, e.message);
  }
}

async function fetchMediaBuffer(url) {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Failed to fetch media: ${resp.status}`);
  return Buffer.from(await resp.arrayBuffer());
}

// ═══════════════════════════════════════════════════════════════════════
// MONGODB AUTH STATE — per user (keys prefixed with userId)
// ═══════════════════════════════════════════════════════════════════════
async function useMongoDBAuthState(sessionKey, ownerUserId = sessionKey) {
  const client = await getMongoClient();
  if (!client) {
    console.log(`[${ownerUserId}][AUTH] No MongoDB — using file-based auth for session ${sessionKey}`);
    const authDir = path.join(__dirname, '.auth', sessionKey);
    if (!fs.existsSync(authDir)) fs.mkdirSync(authDir, { recursive: true });
    return useMultiFileAuthState(authDir);
  }

  console.log(`[${ownerUserId}][AUTH] Using MongoDB-backed auth state for session ${sessionKey}`);
  const db = client.db(AUTH_DB_NAME);
  const collection = db.collection(AUTH_COLLECTION);
  await collection.createIndex({ key: 1 }, { unique: true }).catch(() => {});

  const keyPrefix = `${sessionKey}:`;
  const legacyKeyPrefix = ownerUserId && ownerUserId !== sessionKey ? `${ownerUserId}:` : null;

  function convertBinaryToBuffer(obj) {
    if (!obj || typeof obj !== 'object') return obj;
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
    let doc = await collection.findOne({ key: `${keyPrefix}${key}` });
    if (!doc?.value && legacyKeyPrefix) {
      const legacyDoc = await collection.findOne({ key: `${legacyKeyPrefix}${key}` });
      if (legacyDoc?.value) {
        await collection.updateOne(
          { key: `${keyPrefix}${key}` },
          {
            $set: {
              key: `${keyPrefix}${key}`,
              value: legacyDoc.value,
              updatedAt: new Date(),
              migratedFrom: `${legacyKeyPrefix}${key}`,
            },
          },
          { upsert: true }
        ).catch(() => {});
        doc = legacyDoc;
      }
    }
    if (!doc?.value) return null;
    return convertBinaryToBuffer(doc.value);
  };

  const writeData = async (key, value) => {
    await collection.updateOne(
      { key: `${keyPrefix}${key}` },
      { $set: { key: `${keyPrefix}${key}`, value, updatedAt: new Date() } },
      { upsert: true }
    );
  };

  const removeData = async (key) => {
    await collection.deleteOne({ key: `${keyPrefix}${key}` });
  };

  const creds = await readData('creds') || initAuthCreds();

  return {
    state: {
      creds,
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
              if (value) await writeData(`${type}-${id}`, value);
              else await removeData(`${type}-${id}`);
            }
          }
        }
      }
    },
    saveCreds: async () => {
      // Baileys mutates the `creds` object supplied in `state`. Persist that
      // exact live object on every creds.update so a PM2/VPS restart can resume
      // the linked device without asking for another QR scan.
      await writeData('creds', creds);
    }
  };
}

// ═══════════════════════════════════════════════════════════════════════
// START SOCKET — per user session
// ═══════════════════════════════════════════════════════════════════════
async function startSocket(sessionKey, ownerUserId = sessionKey, tenantId = null) {
  const session = getOrCreateSession(sessionKey, ownerUserId, tenantId);

  if (session.isStarting) {
    console.log(`[${session.ownerUserId}] startSocket() already running for session ${session.sessionKey} — skipping`);
    return;
  }
  session.isStarting = true;

  try {
    // Clean up old socket
    if (session.sock) {
      try { session.sock.ev.removeAllListeners(); session.sock.end(undefined); } catch {}
      session.sock = null;
    }

    const { state, saveCreds } = await useMongoDBAuthState(session.sessionKey, session.ownerUserId);
    const { version } = await fetchLatestBaileysVersion();

    console.log(`[${session.ownerUserId}] Starting Baileys v${version.join('.')} for session ${session.sessionKey}`);

    const sock = makeWASocket({
      version,
      logger,
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, logger),
      },
      generateHighQualityLinkPreview: false,
      // Enable history sync so chats/messages from before this bridge process
      // started are processed by `messaging-history.set` and populate chatMap
      // (previously false, which silently dropped all historical chats/messages
      // on every reconnect — the root cause of "old chats not showing").
      syncFullHistory: true,
      shouldSyncHistoryMessage: () => true,
      markOnlineThrottleMs: 15000,
      // Resend message content when a recipient's device asks for a retry
      // (otherwise their WhatsApp is stuck on "Waiting for this message").
      getMessage: async (key) => {
        try {
          const id = key?.id;
          if (!id) return undefined;
          const cached = session.sentMessageCache.get(id);
          if (cached) return cached;
          const raw = session.rawMessageCache.get(id);
          if (raw?.message) return raw.message;
          return undefined;
        } catch { return undefined; }
      },
    });

    session.sock = sock;

    // Keep the auth-store callback returned for this exact state instance.
    // makeWASocket does not expose `sock.authState`; reading it silently skipped
    // every credential write and caused logout after bridge restarts.
    session.saveCreds = saveCreds;

    // ── Connection Updates ───────────────────
    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        session.qrCode = qr;
        session.qrBase64 = await QRCode.toDataURL(qr);
        session.connectionState = 'connecting';
        session.lastQrTime = Date.now();
        session.retryCount = 0;
        console.log(`[${session.ownerUserId}] New QR code generated for session ${session.sessionKey} — scan in WhatsApp app`);
      }

      if (connection === 'open') {
        session.connectionState = 'connected';
        session.lastConnectedTime = Date.now();
        session.connectionStabilizedTime = 0;
        session.qrCode = null;
        session.qrBase64 = null;
        session.retryCount = 0;
        session.intentionalDisconnect = false;
        session.phoneInfo = sock.user || null;
        // Flush the final paired identity before reporting the session ready.
        // creds.update normally does this too; this extra write closes the small
        // restart window immediately after a successful QR scan.
        try { await saveCreds(); } catch (e) { console.error(`[${session.ownerUserId}] Initial creds save failed:`, e.message); }
        console.log(`[${session.ownerUserId}] Connected session ${session.sessionKey} as: ${sock.user?.id} ${sock.user?.name || ''}`);

        session.startKeepalive();

        // Periodically persist chatMap to qr_whatsapp_chats so the sidebar
        // (DB-merged) reflects live chat updates even if the bridge restarts
        // before history sync completes again.
        session.clearChatSyncTimers();
        session.chatSyncInterval = setInterval(() => {
          syncChatsToDb(session).catch(e => console.error(`[${session.userId}] Chat sync error:`, e.message));
        }, 10 * 60 * 1000);

        if (ENABLE_DB_CHAT_HYDRATION && session.chatMap.size === 0) {
          loadChatsFromDB(session).catch(e => console.error(`[${session.ownerUserId}] DB-LOAD error:`, e.message));
        }

        setTimeout(() => {
          if (session.connectionState === 'connected') {
            prefetchGroupNames(session).catch(e => console.error(`[${session.ownerUserId}] Groups prefetch error:`, e.message));
          }
        }, 30000);
      }

      if (connection === 'close') {
        session.lastDisconnectTime = Date.now();
        session.clearKeepaliveTimer();
        session.clearChatSyncTimers();
        session.connectionStabilizedTime = 0;
        const hadRecentQR = session.lastQrTime && (Date.now() - session.lastQrTime < 120000);
        if (!hadRecentQR) session.connectionState = 'disconnected';
        session.phoneInfo = null;
        // A closed Baileys socket is not reusable. Leaving this reference set
        // prevents /qr from starting a replacement and strands the scanner in
        // logged_out/disconnected forever.
        if (session.sock === sock) session.sock = null;
        const statusCode = lastDisconnect?.error?.output?.statusCode || lastDisconnect?.error?.statusCode;
        const reason = lastDisconnect?.error?.message || 'unknown';

        console.log(`[${session.ownerUserId}] Disconnected session ${session.sessionKey}: ${statusCode} (${reason})`);

        if (session.intentionalDisconnect) {
          console.log(`[${session.ownerUserId}] Intentional disconnect — not reconnecting session ${session.sessionKey}`);
          return;
        }

        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

        if (shouldReconnect) {
          const isQrTimeout = statusCode === 408 || statusCode === 515 || hadRecentQR;
          const isConnectionConflict = statusCode === 440 || statusCode === 428;
          const isRateLimited = statusCode === 429 || statusCode === 503;
          const isConnectionDrop = statusCode === 401 || statusCode === 403 || statusCode === 404;

          if (!isQrTimeout) session.retryCount++;
          else session.retryCount = 0;

          if (session.retryCount > MAX_RETRIES) {
            console.log(`[${session.ownerUserId}] Max retries reached for session ${session.sessionKey} — stopping`);
            session.connectionState = 'disconnected';
            return;
          }

          let delay;
          if (isQrTimeout) delay = 2000;
          else if (isConnectionConflict) delay = Math.min(10000 + session.retryCount * 5000, 120000);
          else if (isRateLimited) delay = Math.min(15000 + session.retryCount * 5000, 120000);
          else if (isConnectionDrop) delay = 5000;
          else delay = Math.min(1000 * Math.pow(2, Math.min(session.retryCount - 1, 5)), 60000);

          console.log(`[${session.ownerUserId}] Reconnect session ${session.sessionKey} in ${delay}ms`);
          session.clearReconnectTimer();
          session.reconnectTimer = setTimeout(() => { session.isStarting = false; startSocket(session.sessionKey, session.ownerUserId, session.tenantId); }, delay);
        } else if (statusCode === DisconnectReason.loggedOut) {
          console.log(`[${session.ownerUserId}] Logged out session ${session.sessionKey} — clearing auth`);
          try {
            const client = await getMongoClient();
            if (client) {
              const authPrefixes = [session.sessionKey];
              if (session.ownerUserId && session.ownerUserId !== session.sessionKey) authPrefixes.push(session.ownerUserId);
              await client.db(AUTH_DB_NAME).collection(AUTH_COLLECTION).deleteMany({
                key: { $regex: `^(${authPrefixes.map(escapeRegex).join('|')}):` },
              });
              console.log(`[${session.ownerUserId}] Cleared MongoDB auth for session ${session.sessionKey}`);
            }
          } catch (e) { console.error(`[${session.ownerUserId}] Auth clear failed:`, e.message); }
          session.retryCount = 0;
          session.clearReconnectTimer();
          session.isStarting = false;
          // FIX: do NOT auto-reconnect after a forced logout (401). Auto-restarting
          // regenerates a QR and hammers reconnects -> "suddenly logged out" loop + ban.
          // Tenant must re-scan QR from the UI (/start, /reconnect, /qr).
          session.connectionState = 'logged_out';
          console.log('[' + session.ownerUserId + '] Session ' + session.sessionKey + ' logged out — awaiting manual QR re-scan (no auto-reconnect).');
        }
      }
    });

    // ── Credentials Update ───────────────────
    sock.ev.on('creds.update', async () => {
      try { if (session.saveCreds) await session.saveCreds(); } catch (e) { console.error(`[${session.ownerUserId}] Creds save failed:`, e.message); }
    });

    // ── Group Participants ────────────
    sock.ev.on('group-participants.update', ({ id, participants, action }) => {
      if (!session.groupMembersCache.has(id)) session.groupMembersCache.set(id, new Set());
      const members = session.groupMembersCache.get(id);
      if (action === 'add') for (const p of participants) members.add(p);
      else if (action === 'remove') for (const p of participants) members.delete(p);
    });

    // ── Contacts ─────────
    sock.ev.on('contacts.upsert', (contacts) => {
      for (const c of contacts) {
        const existing = session.contactsCache.get(c.id) || {};
        session.contactsCache.set(c.id, {
          ...existing,
          name: c.name || existing.name, notify: c.notify || existing.notify,
          lid: c.lid || existing.lid, jid: c.jid || existing.jid,
          verifiedName: c.verifiedName || existing.verifiedName,
        });
        if (c.lid && c.id && !isLidNumber(c.id)) storeLidPhoneMapping(session, c.lid, c.id);
        if (c.jid && c.lid) storeLidPhoneMapping(session, c.lid, c.jid);
        if (c.jid && isLidNumber(c.id)) storeLidPhoneMapping(session, c.id, c.jid);
        if (session.chatMap.has(c.id)) {
          const chat = session.chatMap.get(c.id);
          const displayName = c.notify || c.name || c.verifiedName;
          if (displayName && /^\d{14,}$/.test(chat.name)) chat.name = displayName;
        }
      }
    });

    sock.ev.on('contacts.update', (contacts) => {
      for (const c of contacts) {
        const existing = session.contactsCache.get(c.id) || {};
        session.contactsCache.set(c.id, {
          ...existing,
          ...(c.name && { name: c.name }), ...(c.notify && { notify: c.notify }),
          ...(c.lid && { lid: c.lid }), ...(c.jid && { jid: c.jid }),
          ...(c.verifiedName && { verifiedName: c.verifiedName }),
        });
        if (c.lid && c.id && !isLidNumber(c.id)) storeLidPhoneMapping(session, c.lid, c.id);
        if (session.chatMap.has(c.id)) {
          const chat = session.chatMap.get(c.id);
          const displayName = c.notify || c.name || c.verifiedName || existing.notify || existing.name;
          if (displayName && /^\d{14,}$/.test(chat.name)) chat.name = displayName;
        }
      }
    });

    // ── History Sync ─────────
    sock.ev.on('messaging-history.set', ({ contacts, chats, messages, syncType }) => {
      if (contacts && contacts.length > 0) {
        for (const c of contacts) {
          if (c.id) {
            const existing = session.contactsCache.get(c.id) || {};
            session.contactsCache.set(c.id, {
              ...existing,
              name: c.name || existing.name, notify: c.notify || existing.notify,
              lid: c.lid || existing.lid, jid: c.jid || existing.jid,
              verifiedName: c.verifiedName || existing.verifiedName,
            });
          }
          if (c.lid && c.id && !isLidNumber(c.id)) storeLidPhoneMapping(session, c.lid, c.id);
          if (c.lid && c.jid) storeLidPhoneMapping(session, c.lid, c.jid);
          if (c.jid && c.id && isLidNumber(c.id)) storeLidPhoneMapping(session, c.id, c.jid);
        }
      }

      // ── Populate chatMap from synced chats (groups + individuals) ──
      // WhatsApp sends full chat list during history sync — use it to fill chatMap
      // so groups and older conversations appear even if no new messages arrive.
      if (chats && chats.length > 0) {
        let chatsSynced = 0;
        for (const chat of chats) {
          const jid = chat.id;
          if (!jid || jid === 'status@broadcast') continue;
          // Don't overwrite existing chatMap entries that have richer data from live messages
          if (session.chatMap.has(jid)) continue;
          const isGroup = jid.endsWith('@g.us');
          const ts = chat.conversationTimestamp
            ? new Date((typeof chat.conversationTimestamp === 'number' ? chat.conversationTimestamp : Number(chat.conversationTimestamp)) * 1000).toISOString()
            : null;
          const displayName = chat.name || (isGroup ? session.groupSubjectCache.get(jid) : null) || jid.split('@')[0];
          session.chatMap.set(jid, {
            id: jid,
            name: displayName,
            isGroup,
            isLid: jid.endsWith('@lid') || (!isGroup && isLidNumber(jid)),
            unreadCount: chat.unreadCount || 0,
            lastMessageTime: ts,
            lastMessage: '',
            pinned: chat.pinned || false,
            archived: chat.archived || false,
          });
          chatsSynced++;
        }
        if (chatsSynced > 0) console.log(`[${session.userId}] History sync: ${chatsSynced} chats added to chatMap (syncType=${syncType})`);
      }

      // ── Populate chatMap from synced messages ──
      // History sync also sends recent messages — use them to enrich chatMap entries
      // with last message preview and timestamp.
      if (messages && messages.length > 0) {
        let msgsSynced = 0;
        for (const msg of messages) {
          try {
            const jid = msg.key?.remoteJid;
            if (!jid || jid === 'status@broadcast') continue;
            if (msg.message?.protocolMessage || msg.message?.senderKeyDistributionMessage) continue;

            const isGroup = jid.endsWith('@g.us');
            const ts = typeof msg.messageTimestamp === 'number'
              ? (msg.messageTimestamp < 10000000000 ? msg.messageTimestamp * 1000 : msg.messageTimestamp)
              : Date.now();

            // Extract text preview
            const inner = msg.message?.viewOnceMessage?.message
              || msg.message?.viewOnceMessageV2?.message
              || msg.message?.ephemeralMessage?.message
              || msg.message;
            const text = inner?.conversation
              || inner?.extendedTextMessage?.text
              || inner?.imageMessage?.caption
              || inner?.videoMessage?.caption
              || '';

            const preview = text ? text.substring(0, 80) : (
              inner?.imageMessage ? '[image]'
              : inner?.videoMessage ? '[video]'
              : inner?.audioMessage ? '[audio]'
              : inner?.documentMessage ? '[document]'
              : inner?.stickerMessage ? '[sticker]'
              : ''
            );

            // Create or update chatMap entry
            const existing = session.chatMap.get(jid);
            const tsIso = new Date(ts).toISOString();
            if (existing) {
              // Only update if this message is newer
              const existingTs = existing.lastMessageTime ? new Date(existing.lastMessageTime).getTime() : 0;
              if (ts > existingTs) {
                existing.lastMessageTime = tsIso;
                if (preview) existing.lastMessage = preview;
              }
            } else {
              const displayName = msg.pushName
                || (isGroup ? session.groupSubjectCache.get(jid) : null)
                || jid.split('@')[0];
              session.chatMap.set(jid, {
                id: jid,
                name: displayName,
                isGroup,
                isLid: jid.endsWith('@lid') || (!isGroup && isLidNumber(jid)),
                unreadCount: msg.key?.fromMe ? 0 : 1,
                lastMessageTime: tsIso,
                lastMessage: preview,
              });
            }
            msgsSynced++;
          } catch (e) {
            // Skip individual message parse errors during history sync
          }
        }
        if (msgsSynced > 0) console.log(`[${session.userId}] History sync: ${msgsSynced} messages processed for chatMap enrichment`);
      }

      // Update chatMap names for resolved LID contacts
      for (const [jid, chat] of session.chatMap.entries()) {
        if (isLidNumber(jid) && /^\d{14,}$/.test(chat.name)) {
          const phoneNum = resolveToPhone(session, jid);
          if (phoneNum) { chat.name = phoneNum; chat.resolvedPhone = phoneNum; }
        }
      }

      // History sync can fire multiple events (initial/recent/on-demand) — debounce
      // the DB persistence so we sync once after the burst settles.
      if (session.chatSyncDebounceTimer) clearTimeout(session.chatSyncDebounceTimer);
      session.chatSyncDebounceTimer = setTimeout(() => {
        session.chatSyncDebounceTimer = null;
        syncChatsToDb(session).catch(e => console.error(`[${session.userId}] Chat sync error:`, e.message));
      }, 5000);
    });

    // ── Phone Number Share ──
    sock.ev.on('chats.phoneNumberShare', ({ lid, jid }) => {
      if (lid && jid) {
        storeLidPhoneMapping(session, lid, jid);
        if (session.chatMap.has(lid)) {
          const chat = session.chatMap.get(lid);
          const phoneNum = jid.split('@')[0];
          if (/^\d{14,}$/.test(chat.name)) chat.name = phoneNum;
          chat.resolvedPhone = phoneNum;
        }
      }
    });

    // ── Message Status Updates (delivery receipts: sent→delivered→read) ──
    sock.ev.on('messages.update', (updates) => {
      for (const { key, update } of updates) {
        if (!key?.remoteJid || key.remoteJid === 'status@broadcast') continue;
        if (update.status === undefined) continue;

        const aliases = getChatAliasJids(session, key.remoteJid);
        for (const aliasJid of aliases) {
          const chatMsgs = session.messageMap.get(aliasJid);
          if (!chatMsgs) continue;
          const msgIdx = chatMsgs.findIndex(m => m.id === key.id);
          if (msgIdx !== -1) {
            chatMsgs[msgIdx].status = Math.max(chatMsgs[msgIdx].status ?? 0, update.status ?? 0);
          }
        }

        // Persist delivery/read receipts so ticks survive a bridge restart / PC off.
        // Without this the DB status stayed at 2 (single grey tick) forever.
        // status 0 = ERROR (send failed) is also forwarded so "failed" shows up.
        if (typeof update.status === 'number' && (update.status === 0 || update.status >= 2) && key.id) {
          forwardToWebhook(session, {
            type: 'status_update',
            messageId: key.id,
            status: update.status,
            connectedPhone: session.phoneInfo?.id?.split(':')[0] || '',
          });
        }
      }
    });

    // ── Presence Updates (online/offline/typing/last seen) ──
    if (!session.presenceMap) session.presenceMap = new Map();
    sock.ev.on('presence.update', ({ id, presences }) => {
      if (!presences) return;
      for (const [participant, info] of Object.entries(presences)) {
        const presenceValue = {
          lastKnownPresence: info.lastKnownPresence,
          lastSeen: info.lastSeen || null,
          updatedAt: Date.now(),
        };
        if (id.endsWith('@g.us')) {
          session.presenceMap.set(`${id}:${participant}`, presenceValue);
        } else {
          for (const alias of getChatAliasJids(session, id)) {
            session.presenceMap.set(alias, presenceValue);
          }
        }
      }
    });

    // ── Incoming Messages ────────────────────
    sock.ev.on('messages.upsert', async ({ messages: msgs, type }) => {
      if (type !== 'notify') return;

      for (const msg of msgs) {
        try {
          // Status broadcasts
          if (msg.key.remoteJid === 'status@broadcast') {
            try {
              const senderJid = msg.key.participant || msg.key.remoteJid;
              const senderPhone = senderJid.replace('@s.whatsapp.net', '').replace('@lid', '');
              const contact = session.contactsCache.get(senderJid);
              const statusEntry = {
                id: msg.key.id, senderJid, senderPhone,
                senderName: contact?.notify || contact?.name || senderPhone,
                timestamp: msg.messageTimestamp ? (typeof msg.messageTimestamp === 'number' ? msg.messageTimestamp : Number(msg.messageTimestamp)) : Math.floor(Date.now() / 1000),
                type: msg.message?.imageMessage ? 'image' : msg.message?.videoMessage ? 'video' : msg.message?.extendedTextMessage ? 'text' : 'unknown',
                text: msg.message?.extendedTextMessage?.text || msg.message?.imageMessage?.caption || msg.message?.videoMessage?.caption || '',
                hasMedia: !!(msg.message?.imageMessage || msg.message?.videoMessage),
                mediaMessageId: msg.key.id,
              };
              session.statusStore.unshift(statusEntry);
              if (session.statusStore.length > MAX_STATUS_STORE) session.statusStore.length = MAX_STATUS_STORE;
              if (statusEntry.hasMedia) {
                session.rawMessageCache.set(msg.key.id, msg);
                if (session.rawMessageCache.size > MAX_RAW_CACHE) {
                  const oldest = session.rawMessageCache.keys().next().value;
                  session.rawMessageCache.delete(oldest);
                }
              }
            } catch (e) {}
            continue;
          }

          const from = msg.key.remoteJid;

          // LID mapping from message keys
          const senderPn = msg.key.senderPn;
          const senderLid = msg.key.senderLid;
          const participantPn = msg.key.participantPn;
          if (senderPn && from && (from.endsWith('@lid') || isLidNumber(from))) storeLidPhoneMapping(session, from, senderPn);
          if (senderPn && senderLid) storeLidPhoneMapping(session, senderLid, senderPn);
          if (participantPn && msg.key.participant) storeLidPhoneMapping(session, msg.key.participant, participantPn);

          if (msg.message?.protocolMessage || msg.message?.senderKeyDistributionMessage) continue;

          // Detect self-sent
          let isFromMe = msg.key.fromMe;
          if (!isFromMe && sock?.user?.id) {
            const myPhone = sock.user.id.split(':')[0];
            const myLid = sock.user.lid;
            const participant = msg.key.participant || '';
            const participantPhone = participant.split('@')[0].split(':')[0];
            if (participantPhone === myPhone) isFromMe = true;
            else if (myLid && participant === myLid) isFromMe = true;
            else if (senderPn && senderPn.split('@')[0] === myPhone) isFromMe = true;
          }
          const messageId = msg.key.id;

          // Unwrap container message types
          let innerMessage = msg.message;
          if (innerMessage?.viewOnceMessage) innerMessage = innerMessage.viewOnceMessage.message;
          if (innerMessage?.viewOnceMessageV2) innerMessage = innerMessage.viewOnceMessageV2.message;
          if (innerMessage?.viewOnceMessageV2Extension) innerMessage = innerMessage.viewOnceMessageV2Extension.message;
          if (innerMessage?.ephemeralMessage) innerMessage = innerMessage.ephemeralMessage.message;
          if (innerMessage?.editedMessage?.message) innerMessage = innerMessage.editedMessage.message;
          if (innerMessage?.documentWithCaptionMessage?.message) innerMessage = innerMessage.documentWithCaptionMessage.message;

          const text = innerMessage?.conversation
            || innerMessage?.extendedTextMessage?.text
            || innerMessage?.imageMessage?.caption
            || innerMessage?.videoMessage?.caption
            || innerMessage?.documentMessage?.caption
            || innerMessage?.buttonsResponseMessage?.selectedDisplayText
            || innerMessage?.listResponseMessage?.title
            || innerMessage?.templateButtonReplyMessage?.selectedDisplayText
            || '';

          let mediaInfo = null;
          if (innerMessage?.imageMessage) mediaInfo = { kind: 'image', mimetype: innerMessage.imageMessage.mimetype };
          else if (innerMessage?.videoMessage) mediaInfo = { kind: 'video', mimetype: innerMessage.videoMessage.mimetype };
          else if (innerMessage?.audioMessage) mediaInfo = { kind: 'audio', mimetype: innerMessage.audioMessage.mimetype };
          else if (innerMessage?.documentMessage) mediaInfo = { kind: 'document', mimetype: innerMessage.documentMessage.mimetype, filename: innerMessage.documentMessage.fileName };
          else if (innerMessage?.stickerMessage) mediaInfo = { kind: 'sticker', mimetype: innerMessage.stickerMessage.mimetype };
          else if (innerMessage?.contactMessage) mediaInfo = { kind: 'contact' };
          else if (innerMessage?.locationMessage) mediaInfo = { kind: 'location' };
          else if (innerMessage?.liveLocationMessage) mediaInfo = { kind: 'live_location' };

          // Handle reactions
          if (innerMessage?.reactionMessage) {
            const reactKey = innerMessage.reactionMessage.key;
            const reactEmoji = innerMessage.reactionMessage.text || '';
            if (reactKey?.id) {
              const targetJid = reactKey.remoteJid || from;
              const targetMsgs = session.messageMap.get(targetJid);
              if (targetMsgs) {
                const targetMsg = targetMsgs.find(m => m.id === reactKey.id);
                if (targetMsg) {
                  if (!targetMsg.reactions) targetMsg.reactions = {};
                  const reactorJid = msg.key?.participant || from;
                  if (reactEmoji) targetMsg.reactions[reactorJid] = reactEmoji;
                  else delete targetMsg.reactions[reactorJid];
                }
              }
            }
            continue;
          }

          if (!text && !mediaInfo) continue;

          // Extract quoted message
          const contextInfo = innerMessage?.extendedTextMessage?.contextInfo
            || innerMessage?.imageMessage?.contextInfo
            || innerMessage?.videoMessage?.contextInfo
            || innerMessage?.documentMessage?.contextInfo
            || innerMessage?.audioMessage?.contextInfo;
          let quotedInfo = null;
          if (contextInfo?.quotedMessage) {
            const qm = contextInfo.quotedMessage;
            const quotedText = qm.conversation || qm.extendedTextMessage?.text
              || (qm.imageMessage ? '[Image]' : '') || (qm.videoMessage ? '[Video]' : '')
              || (qm.documentMessage ? '[Document]' : '') || (qm.audioMessage ? '[Audio]' : '') || '[Message]';
            quotedInfo = { id: contextInfo.stanzaId, participant: contextInfo.participant || '', text: quotedText.substring(0, 200) };
          }

          // Cache raw message for media download
          if (mediaInfo && msg.message) {
            session.rawMessageCache.set(messageId, msg);
            if (session.rawMessageCache.size > MAX_RAW_CACHE) {
              const oldest = session.rawMessageCache.keys().next().value;
              session.rawMessageCache.delete(oldest);
            }
          }

          // Download media
          let mediaBase64 = null;
          if (mediaInfo && msg.message) {
            try {
              const buffer = await downloadMediaMessage(msg, 'buffer', {}, { logger, reuploadRequest: sock.updateMediaMessage });
              if (buffer) mediaBase64 = buffer.toString('base64');
            } catch (e) { console.error(`[${session.ownerUserId}] Media download failed:`, e.message); }
          }

          // Build webhook payload
          const webhookFrom = (senderPn ? senderPn.replace('@s.whatsapp.net', '') : null)
            || resolveToPhone(session, from)
            || from?.replace('@s.whatsapp.net', '').replace('@lid', '') || '';
          const webhookPayload = {
            from: webhookFrom,
            to: isFromMe ? webhookFrom : sock.user?.id?.split(':')[0],
            text, body: text, messageId, timestamp: msg.messageTimestamp,
            fromMe: isFromMe, hasMedia: !!mediaInfo, type: mediaInfo?.kind || 'text',
            originalJid: from,
            participant: msg.key?.participant || '',
            pushName: msg.pushName || '',
          };
          if (mediaInfo) {
            webhookPayload.media = { ...mediaInfo, data: mediaBase64 };
            webhookPayload.hasMedia = true;
            webhookPayload.mediaBase64 = mediaBase64;
            webhookPayload.mediaMimeType = mediaInfo.mimetype;
          }

          console.log(`[${session.ownerUserId}] ${isFromMe ? '→' : '←'} ${from}: ${text?.substring(0, 60) || `[${mediaInfo?.kind || 'no-text'}]`}`);

          // Track in memory
          const ts = typeof msg.messageTimestamp === 'number'
            ? (msg.messageTimestamp < 10000000000 ? msg.messageTimestamp * 1000 : msg.messageTimestamp)
            : Date.now();
          const isGroup = from?.endsWith('@g.us');
          const isLid = from?.endsWith('@lid') || (!isGroup && isLidNumber(from));

          if (isGroup && msg.key?.participant) {
            if (!session.groupMembersCache.has(from)) session.groupMembersCache.set(from, new Set());
            session.groupMembersCache.get(from).add(msg.key.participant);
          }

          // Chat display name
          let chatDisplayName = msg.pushName || from?.split('@')[0];
          if (isGroup) {
            const cached = session.groupSubjectCache.get(from);
            if (cached) chatDisplayName = cached;
            else {
              getGroupSubject(session, from).then(subject => {
                if (subject && session.chatMap.has(from)) session.chatMap.get(from).name = subject;
              });
              const existing = session.chatMap.get(from);
              if (existing?.name && !existing.name.includes('@') && !/^\d{10,}$/.test(existing.name)) chatDisplayName = existing.name;
            }
          } else if (isLid) {
            const resolvedPhoneNum = resolveToPhone(session, from);
            const cachedContact = session.contactsCache.get(from);
            const existingChat = session.chatMap.get(from);
            chatDisplayName = msg.pushName || cachedContact?.notify || cachedContact?.name || cachedContact?.verifiedName
              || (existingChat?.name && !/^\d{14,}$/.test(existingChat.name) ? existingChat.name : null)
              || resolvedPhoneNum || (msg.key?.participant?.split('@')[0]) || from?.split('@')[0];
            if (msg.pushName) {
              const existing = session.contactsCache.get(from) || {};
              session.contactsCache.set(from, { ...existing, notify: msg.pushName });
            }
          }

          const chatResolvedPhone = resolveToPhone(session, from);
          session.chatMap.set(from, {
            id: from, name: chatDisplayName, isGroup: isGroup || false, isLid: isLid || false,
            ...(chatResolvedPhone && { resolvedPhone: chatResolvedPhone }),
            unreadCount: (session.chatMap.get(from)?.unreadCount || 0) + (isFromMe ? 0 : 1),
            lastMessageTime: new Date(ts).toISOString(), lastMessage: '',
          });

          const displayText = text
            || (mediaInfo?.kind === 'contact' ? '📇 Contact card' : mediaInfo?.kind === 'location' ? '📍 Location'
              : mediaInfo?.kind === 'live_location' ? '📍 Live location' : mediaInfo?.kind === 'sticker' ? '🏷️ Sticker'
              : mediaInfo?.kind ? `[${mediaInfo.kind}]` : '');

          if (session.chatMap.has(from)) {
            const chatEntry = session.chatMap.get(from);
            const senderPrefix = (isGroup || isLid) && !isFromMe ? `${msg.pushName || msg.key?.participant?.split('@')[0] || ''}: ` : '';
            chatEntry.lastMessage = senderPrefix + (displayText || '').substring(0, 80);
          }

          const msgEntry = {
            id: messageId, from: from?.replace('@s.whatsapp.net', ''), fromMe: isFromMe,
            text: displayText, type: mediaInfo?.kind || 'text', timestamp: msg.messageTimestamp,
            status: msg.status, participant: isGroup ? (msg.key?.participant || '') : undefined,
            pushName: msg.pushName || '', hasMedia: !!mediaInfo,
            mediaMimetype: mediaInfo?.mimetype || null, mediaFileName: mediaInfo?.filename || null,
            mediaUrl: null, ...(quotedInfo && { quoted: quotedInfo }), reactions: {},
          };
          if (!session.messageMap.has(from)) session.messageMap.set(from, []);
          const chatMsgs = session.messageMap.get(from);
          const existingIdx = chatMsgs.findIndex(m => m.id === messageId);
          if (existingIdx !== -1) {
            const existing = chatMsgs[existingIdx];
            msgEntry.mediaUrl = existing.mediaUrl || msgEntry.mediaUrl;
            chatMsgs[existingIdx] = msgEntry;
          } else {
            chatMsgs.push(msgEntry);
            if (chatMsgs.length > MAX_MSGS_PER_CHAT) chatMsgs.shift();
          }

          forwardToWebhook(session, webhookPayload).then(mediaUrl => {
            if (mediaUrl) msgEntry.mediaUrl = mediaUrl;
          });
        } catch (e) { console.error(`[${session.ownerUserId}] Message error:`, e.message); }
      }
    });

  } catch (err) {
    console.error(`[${session.ownerUserId}] startSocket error for session ${session.sessionKey}:`, err.message);
    if (!session.intentionalDisconnect) {
      session.retryCount++;
      const delay = Math.min(session.retryCount * 3000, 30000);
      session.clearReconnectTimer();
      session.reconnectTimer = setTimeout(() => { session.isStarting = false; startSocket(session.sessionKey, session.ownerUserId, session.tenantId); }, delay);
    }
  } finally {
    session.isStarting = false;
  }
}

// ═══════════════════════════════════════════════════════════════════════
// EXPRESS APP + ROUTES
// ═══════════════════════════════════════════════════════════════════════
const app = express();
app.use(express.json({ limit: '50mb' }));

// Auth middleware — check bridge secret
function authCheck(req, res, next) {
  const secret = req.headers['x-bridge-secret'] || req.headers['x-qr-chat-secret'] || '';
  if (BRIDGE_SECRET && secret !== BRIDGE_SECRET) {
    if (req.path === '/health') return next();
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}
app.use(authCheck);

// Extract CRM owner userId plus production session key from headers (set by proxy)
app.use((req, res, next) => {
  req.userId = req.headers['x-user-id'] || 'default';
  req.ownerUserId = req.headers['x-owner-user-id'] || req.userId;
  req.tenantId = req.headers['x-tenant-id'] || '';
  req.sessionKey = req.headers['x-session-key'] || req.tenantId || req.userId;
  next();
});

function getSessionForRequest(req) {
  return getOrCreateSession(req.sessionKey || req.userId, req.ownerUserId, req.tenantId || null);
}

function startSessionForRequest(req) {
  return startSocket(req.sessionKey || req.userId, req.ownerUserId, req.tenantId || null);
}

function escapeRegex(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getAuthPrefixesForRequest(req) {
  const prefixes = [req.sessionKey || req.userId];
  if (req.userId && req.userId !== req.sessionKey) prefixes.push(req.userId);
  return Array.from(new Set(prefixes.filter(Boolean)));
}

// ── Health (no session needed) ──────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    ok: true,
    activeSessions: sessions.size,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// ── List active sessions (admin overview) ───────────────────────────────
app.get('/sessions', (req, res) => {
  const list = [];
  for (const [uid, s] of sessions) {
    list.push({
      userId: s.ownerUserId || uid,
      sessionKey: uid,
      tenantId: s.tenantId || null,
      status: s.connectionState,
      phone: s.phoneInfo ? { id: s.phoneInfo.id?.split(':')[0], name: s.phoneInfo.name } : null,
      chats: s.chatMap.size,
      createdAt: new Date(s.createdAt).toISOString(),
      lastActivity: new Date(s.lastActivityTime).toISOString(),
    });
  }
  res.json({ sessions: list, total: sessions.size, maxSessions: MAX_SESSIONS });
});

// ── Status (auto-starts session) ────────────────────────────────────────
app.get('/status', async (req, res) => {
  const session = getSessionForRequest(req);

  // Auto-start socket if session hasn't been started yet
  if (!session.sock && !session.isStarting && !session.intentionalDisconnect) {
    startSessionForRequest(req).catch(e => console.error(`[${req.userId}] Auto-start failed:`, e.message));
    // Give it a moment to initialize
    await new Promise(r => setTimeout(r, 1500));
  }

  res.json({
    connected: session.connectionState === 'connected',
    status: session.connectionState,
    phone: session.phoneInfo ? {
      id: session.phoneInfo.id?.split(':')[0],
      name: session.phoneInfo.name,
    } : null,
    qrAvailable: !!session.qrBase64,
    retryCount: session.retryCount,
    uptime: process.uptime(),
    connectionInfo: {
      timeSinceLastConnect: session.lastConnectedTime > 0 ? Date.now() - session.lastConnectedTime : null,
      isStabilized: session.connectionStabilizedTime > 0,
      lastDisconnectTime: session.lastDisconnectTime,
    },
  });
});

// ── QR Code (auto-starts session) ───────────────────────────────────────
app.get('/qr', async (req, res) => {
  const session = getSessionForRequest(req);

  // Visiting /qr is an explicit user request to connect/reconnect. It must be
  // able to recover from a previous logout or intentional disconnect. Never
  // restart an active `connecting` socket: Baileys refreshes QR codes on that
  // same socket, and replacing it on every UI poll causes WhatsApp to reject
  // linking with "Can't link new devices right now".
  const needsFreshSocket = !session.sock || ['logged_out', 'disconnected'].includes(session.connectionState);
  if (session.connectionState !== 'connected' && needsFreshSocket && !session.isStarting) {
    session.intentionalDisconnect = false;
    if (session.sock) {
      try { session.sock.ev.removeAllListeners(); session.sock.end(undefined); } catch {}
      session.sock = null;
    }
    startSessionForRequest(req).catch(e => console.error(`[${req.userId}] Auto-start failed:`, e.message));
    await new Promise(r => setTimeout(r, 2000));
  }

  if (session.connectionState === 'connected') {
    return res.json({ connected: true, message: 'Already connected', qr: null });
  }
  if (!session.qrBase64) {
    return res.json({ connected: false, qr: null, message: 'QR not yet generated. Waiting...' });
  }
  res.json({
    connected: false,
    qr: session.qrBase64,
    qrString: session.qrCode,
    message: 'Scan this QR code with WhatsApp',
  });
});

// ── Send Message ────────────────────────────────────────────────────────
app.post('/send', async (req, res) => {
  const session = getSessionForRequest(req);
  if (session.connectionState !== 'connected') {
    return res.status(503).json({ error: 'WhatsApp not connected', status: session.connectionState });
  }

  const { to, message, type, media, caption } = req.body;
  if (!to) return res.status(400).json({ error: 'Missing "to" field' });

  const toStr = String(to);
  let jid;
  if (toStr.includes('@g.us') || toStr.includes('@lid') || toStr.includes('@s.whatsapp.net')) jid = toStr;
  else if (toStr.includes('@')) jid = toStr;
  else jid = `${toStr.replace(/[^0-9]/g, '')}@s.whatsapp.net`;

  try {
    let result;
    if (type === 'media' && media) {
      const mediaBuffer = media.startsWith('data:')
        ? Buffer.from(media.split(',')[1], 'base64')
        : media.startsWith('http') ? await fetchMediaBuffer(media) : Buffer.from(media, 'base64');
      const mimeType = req.body.mimetype || mime.lookup(media) || 'application/octet-stream';
      const isImage = mimeType.startsWith('image/');
      const isVideo = mimeType.startsWith('video/');
      const isAudio = mimeType.startsWith('audio/');

      if (isImage) result = await session.sock.sendMessage(jid, { image: mediaBuffer, caption: caption || message || '', mimetype: mimeType });
      else if (isVideo) result = await session.sock.sendMessage(jid, { video: mediaBuffer, caption: caption || message || '', mimetype: mimeType });
      else if (isAudio) result = await session.sock.sendMessage(jid, { audio: mediaBuffer, mimetype: mimeType, ptt: mimeType.includes('ogg') });
      else result = await session.sock.sendMessage(jid, { document: mediaBuffer, mimetype: mimeType, fileName: req.body.fileName || 'file', caption: caption || message || '' });
    } else {
      result = await session.sock.sendMessage(jid, { text: message || '' });
    }

    // Store outbound in memory
    const sentMsgId = result?.key?.id;
    if (result?.key?.id && result?.message) {
      session.sentMessageCache.set(result.key.id, result.message);
      if (session.sentMessageCache.size > 1500) session.sentMessageCache.delete(session.sentMessageCache.keys().next().value);
    }
    if (sentMsgId) {
      const outboundEntry = {
        id: sentMsgId, from: session.sock.user?.id?.split(':')[0] || '', fromMe: true,
        text: (type === 'media') ? (caption || message || `[${req.body.mimetype?.startsWith('image') ? 'image' : 'document'}]`) : (message || ''),
        type: (type === 'media') ? (req.body.mimetype?.startsWith('image') ? 'image' : 'document') : 'text',
        timestamp: Math.floor(Date.now() / 1000), status: result?.status,
        hasMedia: type === 'media', mediaMimetype: type === 'media' ? (req.body.mimetype || null) : null,
        mediaUrl: req.body.cdnUrl || null,
      };
      if (!session.messageMap.has(jid)) session.messageMap.set(jid, []);
      const chatMsgs = session.messageMap.get(jid);
      if (!chatMsgs.find(m => m.id === sentMsgId)) {
        chatMsgs.push(outboundEntry);
        if (chatMsgs.length > MAX_MSGS_PER_CHAT) chatMsgs.shift();
      } else {
        const existing = chatMsgs.find(m => m.id === sentMsgId);
        if (existing && req.body.cdnUrl) { existing.mediaUrl = req.body.cdnUrl; existing.hasMedia = true; }
      }
    }

    res.json({ success: true, id: sentMsgId, messageId: sentMsgId, key: result?.key, status: result?.status });
  } catch (e) {
    console.error(`[${req.userId}] Send error:`, e.message);
    res.status(500).json({ error: e.message });
  }
});

// ── Profile Picture ─────────────────────────────────────────────────────
app.get('/profile-pic/:jid', async (req, res) => {
  const session = getSessionForRequest(req);
  if (!session.sock || session.connectionState !== 'connected') return res.json({ url: null, error: 'not_connected' });
  let jid = req.params.jid;
  if (!jid.includes('@')) jid = `${jid}@s.whatsapp.net`;
  try {
    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000));
    const url = await Promise.race([session.sock.profilePictureUrl(jid, 'image'), timeoutPromise]);
    res.json({ url: url || null });
  } catch (err) {
    res.json({ url: null, error: err.message });
  }
});

// ── Group Info ───────────────────────────────────────────────────────────
app.get('/group-info/:jid', async (req, res) => {
  const session = getSessionForRequest(req);
  if (!session.sock || session.connectionState !== 'connected') return res.status(503).json({ error: 'Not connected' });
  const jid = req.params.jid;
  if (!jid.endsWith('@g.us')) return res.status(400).json({ error: 'Not a group JID' });
  try {
    const metadata = await session.sock.groupMetadata(jid);
    let participants = metadata.participants || [];
    const mappedParticipants = participants.map(p => ({
      id: p.jid || p.id, lid: p.lid || (p.id?.endsWith('@lid') ? p.id : undefined), admin: p.admin || null,
    }));
    const cachedMembers = session.groupMembersCache.get(jid);
    if (cachedMembers) {
      const existingIds = new Set(mappedParticipants.map(p => p.id));
      const existingLids = new Set(mappedParticipants.map(p => p.lid).filter(Boolean));
      for (const memberId of cachedMembers) {
        if (!existingIds.has(memberId) && !existingLids.has(memberId))
          mappedParticipants.push({ id: memberId, lid: memberId.endsWith('@lid') ? memberId : undefined, admin: null });
      }
    }
    const actualSize = Math.max(metadata.size || participants.length, mappedParticipants.length);
    res.json({
      id: metadata.id, subject: metadata.subject, subjectOwner: metadata.subjectOwner,
      subjectTime: metadata.subjectTime, desc: metadata.desc || '', descOwner: metadata.descOwner,
      creation: metadata.creation, owner: metadata.owner, size: actualSize, participants: mappedParticipants,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── LID Map ──────────────────────────────────────────────────────────────
app.get('/lid-map', (req, res) => {
  const session = getSessionForRequest(req);
  const map = {};
  for (const [lid, phone] of session.lidToPhoneMap) map[lid] = phone;
  res.json({ entries: session.lidToPhoneMap.size, map, contactsCacheSize: session.contactsCache.size });
});

// ── Mark as Read ─────────────────────────────────────────────────────────
app.post('/read/:jid', async (req, res) => {
  const session = getSessionForRequest(req);
  try {
    const jid = req.params.jid.includes('@') ? req.params.jid : `${req.params.jid}@s.whatsapp.net`;
    const jidsToRead = [jid];
    if (jid.endsWith('@lid') || isLidNumber(jid)) {
      const phoneNum = resolveToPhone(session, jid);
      if (phoneNum) jidsToRead.push(`${phoneNum}@s.whatsapp.net`);
    } else {
      const phoneNum = jid.split('@')[0];
      for (const [lid, phone] of session.lidToPhoneMap) {
        if (phone === phoneNum || phone === jid) jidsToRead.push(lid.includes('@') ? lid : `${lid}@lid`);
      }
    }
    for (const readJid of jidsToRead) {
      const chat = session.chatMap.get(readJid);
      if (chat) { chat.unreadCount = 0; session.chatMap.set(readJid, chat); }
    }
    if (session.sock && session.connectionState === 'connected') {
      try { await session.sock.readMessages([{ remoteJid: jid, id: undefined }]); } catch {}
    }
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Chats List ───────────────────────────────────────────────────────────
app.get('/chats', async (req, res) => {
  const session = getSessionForRequest(req);
  try {
    const chats = Array.from(session.chatMap.values());

    // Expose current-session group names even when a group has no recent visible chat row.
    // This lets users open a known group and send a new message without reviving old chat history.
    for (const [jid, subject] of session.groupSubjectCache.entries()) {
      if (!jid || !jid.endsWith('@g.us')) continue;
      if (session.chatMap.has(jid)) continue;
      chats.push({
        id: jid,
        name: subject || jid.split('@')[0],
        isGroup: true,
        unreadCount: 0,
        lastMessageTime: null,
        lastMessage: '',
        syntheticGroup: true,
      });
    }

    for (const chat of chats) {
      if (chat.isGroup && (/^\d+$/.test(chat.name) || chat.name.includes('@'))) {
        const subject = session.groupSubjectCache.get(chat.id);
        if (subject) chat.name = subject;
      } else if (!chat.isGroup && (chat.id.endsWith('@lid') || isLidNumber(chat.id))) {
        chat.isLid = true;
        const phoneNum = resolveToPhone(session, chat.id);
        if (phoneNum) {
          chat.resolvedPhone = phoneNum;
          if (/^\d{14,}$/.test(chat.name)) chat.name = phoneNum;
        } else if (/^\d{14,}$/.test(chat.name)) {
          const cached = session.contactsCache.get(chat.id);
          if (cached) chat.name = cached.notify || cached.name || cached.verifiedName || chat.name;
        }
      }
      // Resolve contact names for regular @s.whatsapp.net chats that only show phone numbers
      if (!chat.isGroup && chat.id.endsWith('@s.whatsapp.net') && /^\d+$/.test(chat.name)) {
        const cached = session.contactsCache.get(chat.id);
        if (cached) {
          const contactName = cached.notify || cached.name || cached.verifiedName;
          if (contactName && !/^\d+$/.test(contactName)) chat.name = contactName;
        }
      }
    }

    const deduped = [];
    const byPhone = new Map();
    for (const chat of chats) {
      if (chat.isGroup) {
        deduped.push(chat);
        continue;
      }

      const resolvedPhone = chat.resolvedPhone || (chat.id.endsWith('@s.whatsapp.net') ? chat.id.split('@')[0] : null);
      if (!resolvedPhone) {
        deduped.push(chat);
        continue;
      }

      const existing = byPhone.get(resolvedPhone);
      if (!existing) {
        const preferredId = chat.id.endsWith('@s.whatsapp.net') ? chat.id : `${resolvedPhone}@s.whatsapp.net`;
        const normalizedChat = { ...chat, id: preferredId, resolvedPhone };
        byPhone.set(resolvedPhone, normalizedChat);
        deduped.push(normalizedChat);
        continue;
      }

      const existingTime = existing.lastMessageTime ? new Date(existing.lastMessageTime).getTime() : 0;
      const chatTime = chat.lastMessageTime ? new Date(chat.lastMessageTime).getTime() : 0;
      const preferredName = isUsefulChatName(chat.name) && !isUsefulChatName(existing.name)
        ? chat.name
        : existing.name;

      const merged = {
        ...existing,
        ...(chatTime > existingTime ? {
          lastMessage: chat.lastMessage,
          lastMessageTime: chat.lastMessageTime,
        } : {}),
        id: existing.id.endsWith('@s.whatsapp.net') ? existing.id : (chat.id.endsWith('@s.whatsapp.net') ? chat.id : existing.id),
        name: preferredName,
        resolvedPhone,
        unreadCount: Math.max(existing.unreadCount || 0, chat.unreadCount || 0),
        isLid: existing.isLid && chat.isLid,
      };

      byPhone.set(resolvedPhone, merged);
      const existingIdx = deduped.findIndex(c => c.id === existing.id || c.resolvedPhone === resolvedPhone);
      if (existingIdx !== -1) deduped[existingIdx] = merged;
    }

    const sorted = deduped.sort((a, b) => {
      const ta = a.lastMessageTime ? new Date(a.lastMessageTime).getTime() : 0;
      const tb = b.lastMessageTime ? new Date(b.lastMessageTime).getTime() : 0;
      return tb - ta;
    });
    res.json({ chats: sorted, connected: session.connectionState === 'connected' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Messages ─────────────────────────────────────────────────────────────
app.get('/messages/:jid', async (req, res) => {
  const session = getSessionForRequest(req);
  try {
    const jid = req.params.jid.includes('@') ? req.params.jid : `${req.params.jid}@s.whatsapp.net`;
    const limit = parseInt(req.query.limit || '50', 10);
    const msgs = getMergedMessagesForJid(session, jid, limit);
    res.json({ messages: msgs, aliases: getChatAliasJids(session, jid) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Presence (subscribe + get) ───────────────────────────────────────────
app.post('/presence/subscribe/:jid', async (req, res) => {
  const session = getSessionForRequest(req);
  try {
    if (!session.sock || session.connectionState !== 'connected') {
      return res.json({ ok: false, error: 'Not connected' });
    }
    const jidRaw = req.params.jid.includes('@') ? req.params.jid : `${req.params.jid}@s.whatsapp.net`;
    const jid = jidRaw.replace('@c.us', '@s.whatsapp.net');
    await session.sock.presenceSubscribe(jid);
    res.json({ ok: true });
  } catch (e) { res.json({ ok: false, error: e.message }); }
});

app.get('/presence/:jid', (req, res) => {
  const session = getSessionForRequest(req);
  try {
    const jidRaw = req.params.jid.includes('@') ? req.params.jid : `${req.params.jid}@s.whatsapp.net`;
    const jid = jidRaw.replace('@c.us', '@s.whatsapp.net');
    const presence = getChatAliasJids(session, jid)
      .map(alias => session.presenceMap.get(alias))
      .find(Boolean);
    res.json({
      jid,
      presence: presence?.lastKnownPresence || 'unavailable',
      lastSeen: presence?.lastSeen || null,
      updatedAt: presence?.updatedAt || null,
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Disconnect (preserve auth) ──────────────────────────────────────────
app.post('/disconnect', async (req, res) => {
  const session = getSessionForRequest(req);
  try {
    session.intentionalDisconnect = true;
    session.clearReconnectTimer();
    if (session.sock) {
      try { session.sock.ev.removeAllListeners(); session.sock.end(undefined); } catch {}
      session.sock = null;
    }
    session.connectionState = 'disconnected';
    session.phoneInfo = null;
    session.qrCode = null;
    session.qrBase64 = null;
    session.isStarting = false;
    clearSessionRuntimeData(session);
    res.json({ ok: true, message: 'Disconnected. Auth preserved — use Reconnect to resume.' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Logout (clear auth) ─────────────────────────────────────────────────
app.post('/logout', async (req, res) => {
  const session = getSessionForRequest(req);
  try {
    session.intentionalDisconnect = true;
    session.clearReconnectTimer();
    if (session.sock) {
      try { await session.sock.logout(); } catch (e) { console.log(`[${req.userId}] logout failed:`, e.message); }
      try { session.sock.ev.removeAllListeners(); session.sock.end(undefined); } catch {}
      session.sock = null;
    }
    // Clear auth from DB — only this user's keys
    try {
      const client = await getMongoClient();
      if (client) {
        const prefixes = getAuthPrefixesForRequest(req);
        await client.db(AUTH_DB_NAME).collection(AUTH_COLLECTION).deleteMany({
          key: { $regex: `^(${prefixes.map(escapeRegex).join('|')}):` },
        });
        console.log(`[${req.userId}] Cleared auth from MongoDB for prefixes: ${prefixes.join(', ')}`);
      }
    } catch (e) { console.error(`[${req.userId}] Auth clear failed:`, e.message); }
    session.connectionState = 'disconnected';
    session.phoneInfo = null;
    session.qrCode = null;
    session.qrBase64 = null;
    session.isStarting = false;
    clearSessionRuntimeData(session);
    res.json({ ok: true, message: 'Logged out. Scan QR to reconnect.' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Reconnect ────────────────────────────────────────────────────────────
app.post('/reconnect', async (req, res) => {
  const session = getSessionForRequest(req);
  try {
    session.intentionalDisconnect = false;
    session.clearReconnectTimer();
    session.connectionState = 'connecting';
    session.retryCount = 0;
    if (session.sock) {
      try { session.sock.ev.removeAllListeners(); session.sock.end(undefined); } catch {}
      session.sock = null;
    }
    clearSessionRuntimeData(session);
    session.phoneInfo = null;
    session.qrCode = null;
    session.qrBase64 = null;
    session.isStarting = false;
    setTimeout(() => startSessionForRequest(req), 500);
    res.json({ ok: true, message: 'Reconnecting...' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Media Download ───────────────────────────────────────────────────────
app.get('/media/:messageId', async (req, res) => {
  const session = getSessionForRequest(req);
  try {
    const messageId = req.params.messageId;
    const msg = session.rawMessageCache.get(messageId);
    if (!msg || !msg.message) return res.status(404).json({ error: 'Message not found or has no media' });

    let buffer;
    try {
      buffer = await downloadMediaMessage(msg, 'buffer', {}, { logger, reuploadRequest: session.sock?.updateMediaMessage });
    } catch (e) { return res.status(500).json({ error: 'Failed to download media: ' + e.message }); }
    if (!buffer) return res.status(404).json({ error: 'Media buffer is empty' });

    const innerMessage = msg.message?.viewOnceMessage?.message || msg.message?.ephemeralMessage?.message || msg.message;
    let mimetype = 'application/octet-stream';
    let filename = `media_${messageId}`;
    if (innerMessage?.imageMessage) { mimetype = innerMessage.imageMessage.mimetype || 'image/jpeg'; filename = `image_${messageId}.${mime.extension(mimetype) || 'jpg'}`; }
    else if (innerMessage?.videoMessage) { mimetype = innerMessage.videoMessage.mimetype || 'video/mp4'; filename = `video_${messageId}.${mime.extension(mimetype) || 'mp4'}`; }
    else if (innerMessage?.audioMessage) { mimetype = innerMessage.audioMessage.mimetype || 'audio/ogg'; filename = `audio_${messageId}.${mime.extension(mimetype) || 'ogg'}`; }
    else if (innerMessage?.documentMessage) { mimetype = innerMessage.documentMessage.mimetype || 'application/octet-stream'; filename = innerMessage.documentMessage.fileName || `doc_${messageId}`; }
    else if (innerMessage?.stickerMessage) { mimetype = innerMessage.stickerMessage.mimetype || 'image/webp'; filename = `sticker_${messageId}.webp`; }

    res.setHeader('Content-Type', mimetype);
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    res.setHeader('Content-Length', buffer.length);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.send(buffer);
  } catch (e) { res.status(500).json({ error: 'Failed to download media' }); }
});

// ── Group Admin Endpoints ────────────────────────────────────────────────
app.post('/group-update-desc/:jid', async (req, res) => {
  const session = getSessionForRequest(req);
  if (!session.sock || session.connectionState !== 'connected') return res.status(503).json({ error: 'Not connected' });
  const jid = req.params.jid;
  if (!jid.endsWith('@g.us')) return res.status(400).json({ error: 'Not a group JID' });
  const { description } = req.body || {};
  if (typeof description !== 'string') return res.status(400).json({ error: 'description required' });
  try { await session.sock.groupUpdateDescription(jid, description); res.json({ success: true }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/group-update-subject/:jid', async (req, res) => {
  const session = getSessionForRequest(req);
  if (!session.sock || session.connectionState !== 'connected') return res.status(503).json({ error: 'Not connected' });
  const jid = req.params.jid;
  if (!jid.endsWith('@g.us')) return res.status(400).json({ error: 'Not a group JID' });
  const { subject } = req.body || {};
  if (!subject?.trim()) return res.status(400).json({ error: 'subject required' });
  try { await session.sock.groupUpdateSubject(jid, subject.trim()); res.json({ success: true }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/group-invite/:jid', async (req, res) => {
  const session = getSessionForRequest(req);
  if (!session.sock || session.connectionState !== 'connected') return res.status(503).json({ error: 'Not connected' });
  const jid = req.params.jid;
  if (!jid.endsWith('@g.us')) return res.status(400).json({ error: 'Not a group JID' });
  try { const code = await session.sock.groupInviteCode(jid); res.json({ code, link: `https://chat.whatsapp.com/${code}` }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/group-revoke-invite/:jid', async (req, res) => {
  const session = getSessionForRequest(req);
  if (!session.sock || session.connectionState !== 'connected') return res.status(503).json({ error: 'Not connected' });
  const jid = req.params.jid;
  if (!jid.endsWith('@g.us')) return res.status(400).json({ error: 'Not a group JID' });
  try { const code = await session.sock.groupRevokeInvite(jid); res.json({ code, link: `https://chat.whatsapp.com/${code}` }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/group-settings/:jid', async (req, res) => {
  const session = getSessionForRequest(req);
  if (!session.sock || session.connectionState !== 'connected') return res.status(503).json({ error: 'Not connected' });
  const jid = req.params.jid;
  if (!jid.endsWith('@g.us')) return res.status(400).json({ error: 'Not a group JID' });
  const { setting } = req.body || {};
  if (!setting) return res.status(400).json({ error: 'setting required' });
  try { await session.sock.groupSettingUpdate(jid, setting); res.json({ success: true, setting }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

// Human-like delay: random ms between min and max
const humanDelay = (min = 2000, max = 5000) => new Promise(r => setTimeout(r, Math.floor(Math.random() * (max - min)) + min));

app.post('/group-participants/:jid', async (req, res) => {
  const session = getSessionForRequest(req);
  if (!session.sock || session.connectionState !== 'connected') return res.status(503).json({ error: 'Not connected' });
  const jid = req.params.jid;
  if (!jid.endsWith('@g.us')) return res.status(400).json({ error: 'Not a group JID' });
  const { action, participants } = req.body || {};
  if (!action || !participants?.length) return res.status(400).json({ error: 'action and participants[] required' });
  try {
    // Process in small batches with human-like delays
    const batchSize = 5;
    for (let i = 0; i < participants.length; i += batchSize) {
      const batch = participants.slice(i, i + batchSize);
      if (i > 0) await humanDelay(3000, 7000);
      switch (action) {
        case 'add': await session.sock.groupParticipantsUpdate(jid, batch, 'add'); break;
        case 'promote': await session.sock.groupParticipantsUpdate(jid, batch, 'promote'); break;
        case 'demote': await session.sock.groupParticipantsUpdate(jid, batch, 'demote'); break;
        case 'remove': await session.sock.groupParticipantsUpdate(jid, batch, 'remove'); break;
        default: return res.status(400).json({ error: 'Invalid action' });
      }
    }
    res.json({ success: true, action, participants });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/group-create', async (req, res) => {
  const session = getSessionForRequest(req);
  if (!session.sock || session.connectionState !== 'connected') return res.status(503).json({ error: 'Not connected' });
  const { subject, participants } = req.body || {};
  if (!subject) return res.status(400).json({ error: 'Group subject required' });
  if (!participants?.length) return res.status(400).json({ error: 'At least one participant required' });
  const jids = participants.map(p => p.includes('@') ? p : `${String(p).replace(/[^0-9]/g, '')}@s.whatsapp.net`);
  try {
    // Create group with first batch (max 5), add rest slowly
    const firstBatch = jids.slice(0, 5);
    const result = await session.sock.groupCreate(subject, firstBatch);
    session.chatMap.set(result.id, { id: result.id, name: subject, isGroup: true, isLid: false, unreadCount: 0, lastMessageTime: new Date().toISOString(), lastMessage: '' });
    // Add remaining members in small batches with delays
    if (jids.length > 5) {
      const remaining = jids.slice(5);
      for (let i = 0; i < remaining.length; i += 5) {
        await humanDelay(3000, 7000);
        const batch = remaining.slice(i, i + 5);
        try { await session.sock.groupParticipantsUpdate(result.id, batch, 'add'); } catch (e) {}
      }
    }
    res.json({ success: true, id: result.id, gid: result.gid, subject: result.subject });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Create Community (announcement group up to 5000 members) ──
app.post('/community-create', async (req, res) => {
  const session = getSessionForRequest(req);
  if (!session.sock || session.connectionState !== 'connected') return res.status(503).json({ error: 'Not connected' });
  const { subject, description, participants } = req.body || {};
  if (!subject) return res.status(400).json({ error: 'Community name required' });
  try {
    // Create community parent group
    const community = await session.sock.groupCreate(subject, [], { messageTimer: undefined });
    const communityJid = community.id;

    // Update description if provided
    if (description) {
      try { await session.sock.groupUpdateDescription(communityJid, description); } catch (e) { /* ignore */ }
    }

    // Make it announcement-only (only admins can send)
    try { await session.sock.groupSettingUpdate(communityJid, 'announcement'); } catch (e) { /* ignore */ }

    // Restrict group info editing to admins only
    try { await session.sock.groupSettingUpdate(communityJid, 'locked'); } catch (e) { /* ignore */ }

    // Add participants in small batches with human-like delays
    let addedCount = 0;
    if (participants?.length) {
      const jids = participants.map(p => p.includes('@') ? p : `${String(p).replace(/[^0-9]/g, '')}@s.whatsapp.net`);
      const batchSize = 5;
      for (let i = 0; i < jids.length; i += batchSize) {
        if (i > 0) await humanDelay(3000, 8000);
        const batch = jids.slice(i, i + batchSize);
        try {
          await session.sock.groupParticipantsUpdate(communityJid, batch, 'add');
          addedCount += batch.length;
        } catch (e) { /* some may fail if not on WhatsApp */ }
      }
    }

    // Generate invite link
    let inviteLink = null;
    try {
      const code = await session.sock.groupInviteCode(communityJid);
      inviteLink = `https://chat.whatsapp.com/${code}`;
    } catch (e) { /* ignore */ }

    session.chatMap.set(communityJid, { id: communityJid, name: subject, isGroup: true, isLid: false, unreadCount: 0, lastMessageTime: new Date().toISOString(), lastMessage: '' });
    res.json({ success: true, id: communityJid, subject, addedCount, inviteLink });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/group-leave/:jid', async (req, res) => {
  const session = getSessionForRequest(req);
  if (!session.sock || session.connectionState !== 'connected') return res.status(503).json({ error: 'Not connected' });
  const jid = req.params.jid;
  if (!jid.endsWith('@g.us')) return res.status(400).json({ error: 'Not a group JID' });
  try {
    await session.sock.groupLeave(jid);
    session.chatMap.delete(jid);
    session.messageMap.delete(jid);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Reply ────────────────────────────────────────────────────────────────
app.post('/reply', async (req, res) => {
  const session = getSessionForRequest(req);
  if (session.connectionState !== 'connected') return res.status(503).json({ error: 'Not connected' });
  const { to, message, quotedId, quotedParticipant } = req.body;
  if (!to || !message) return res.status(400).json({ error: 'to and message required' });
  if (!quotedId) return res.status(400).json({ error: 'quotedId required' });
  const toStr = String(to);
  const jid = toStr.includes('@') ? toStr : `${toStr.replace(/[^0-9]/g, '')}@s.whatsapp.net`;
  try {
    const quoted = { key: { remoteJid: jid, id: quotedId, ...(quotedParticipant && { participant: quotedParticipant }) } };
    const result = await session.sock.sendMessage(jid, { text: message }, { quoted });
    const sentMsgId = result?.key?.id;
    if (result?.key?.id && result?.message) {
      session.sentMessageCache.set(result.key.id, result.message);
      if (session.sentMessageCache.size > 1500) session.sentMessageCache.delete(session.sentMessageCache.keys().next().value);
    }
    if (sentMsgId) {
      const entry = { id: sentMsgId, from: session.sock.user?.id?.split(':')[0] || '', fromMe: true, text: message, type: 'text', timestamp: Math.floor(Date.now() / 1000), status: result?.status, quotedId };
      if (!session.messageMap.has(jid)) session.messageMap.set(jid, []);
      const msgs = session.messageMap.get(jid);
      if (!msgs.find(m => m.id === sentMsgId)) { msgs.push(entry); if (msgs.length > MAX_MSGS_PER_CHAT) msgs.shift(); }
    }
    res.json({ success: true, id: sentMsgId, key: result?.key });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── React ────────────────────────────────────────────────────────────────
app.post('/react', async (req, res) => {
  const session = getSessionForRequest(req);
  if (session.connectionState !== 'connected') return res.status(503).json({ error: 'Not connected' });
  const { jid, messageId, emoji, participant } = req.body;
  if (!jid || !messageId) return res.status(400).json({ error: 'jid and messageId required' });
  try {
    await session.sock.sendMessage(jid, { react: { text: emoji || '', key: { remoteJid: jid, id: messageId, ...(participant && { participant }) } } });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Delete Message ───────────────────────────────────────────────────────
app.post('/delete-message', async (req, res) => {
  const session = getSessionForRequest(req);
  if (session.connectionState !== 'connected') return res.status(503).json({ error: 'Not connected' });
  const { jid, messageId, participant, forEveryone } = req.body;
  if (!jid || !messageId) return res.status(400).json({ error: 'jid and messageId required' });
  try {
    if (forEveryone) {
      await session.sock.sendMessage(jid, { delete: { remoteJid: jid, id: messageId, ...(participant && { participant }) } });
    }
    const msgs = session.messageMap.get(jid);
    if (msgs) { const idx = msgs.findIndex(m => m.id === messageId); if (idx >= 0) msgs.splice(idx, 1); }
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Send Poll ────────────────────────────────────────────────────────────
app.post('/send-poll', async (req, res) => {
  const session = getSessionForRequest(req);
  if (!session.sock || session.connectionState !== 'connected') return res.status(503).json({ error: 'Not connected' });
  const { to, name, options, selectableCount } = req.body || {};
  if (!to || !name) return res.status(400).json({ error: 'to and name required' });
  if (!Array.isArray(options) || options.length < 2) return res.status(400).json({ error: 'At least 2 options required' });
  if (options.length > 12) return res.status(400).json({ error: 'Maximum 12 options' });
  const toStr = String(to);
  const jid = toStr.includes('@') ? toStr : `${toStr.replace(/[^0-9]/g, '')}@s.whatsapp.net`;
  try {
    const result = await session.sock.sendMessage(jid, {
      poll: {
        name: String(name).slice(0, 255),
        values: options.map(o => String(o).slice(0, 100)),
        selectableCount: Math.max(1, Math.min(parseInt(selectableCount, 10) || 1, options.length)),
      },
    });
    if (result?.key?.id && result?.message) {
      session.sentMessageCache.set(result.key.id, result.message);
      if (session.sentMessageCache.size > 1500) session.sentMessageCache.delete(session.sentMessageCache.keys().next().value);
    }
    res.json({ success: true, messageId: result?.key?.id });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Send Location ────────────────────────────────────────────────────────
app.post('/send-location', async (req, res) => {
  const session = getSessionForRequest(req);
  if (!session.sock || session.connectionState !== 'connected') return res.status(503).json({ error: 'Not connected' });
  const { to, latitude, longitude, name, address } = req.body || {};
  if (!to) return res.status(400).json({ error: 'to required' });
  const lat = Number(latitude), lng = Number(longitude);
  if (!isFinite(lat) || !isFinite(lng) || (lat === 0 && lng === 0)) return res.status(400).json({ error: 'Valid latitude and longitude required' });
  const toStr = String(to);
  const jid = toStr.includes('@') ? toStr : `${toStr.replace(/[^0-9]/g, '')}@s.whatsapp.net`;
  try {
    const result = await session.sock.sendMessage(jid, {
      location: {
        degreesLatitude: lat,
        degreesLongitude: lng,
        ...(name ? { name: String(name).slice(0, 100) } : {}),
        ...(address ? { address: String(address).slice(0, 200) } : {}),
      },
    });
    if (result?.key?.id && result?.message) {
      session.sentMessageCache.set(result.key.id, result.message);
      if (session.sentMessageCache.size > 1500) session.sentMessageCache.delete(session.sentMessageCache.keys().next().value);
    }
    res.json({ success: true, messageId: result?.key?.id });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Send Contact Card (vCard) ────────────────────────────────────────────
app.post('/send-contact', async (req, res) => {
  const session = getSessionForRequest(req);
  if (!session.sock || session.connectionState !== 'connected') return res.status(503).json({ error: 'Not connected' });
  const { to, contactName, contactPhone, organization } = req.body || {};
  if (!to || !contactName || !contactPhone) return res.status(400).json({ error: 'to, contactName and contactPhone required' });
  const toStr = String(to);
  const jid = toStr.includes('@') ? toStr : `${toStr.replace(/[^0-9]/g, '')}@s.whatsapp.net`;
  const phoneDigits = String(contactPhone).replace(/[^0-9]/g, '');
  if (!phoneDigits || phoneDigits.length < 7) return res.status(400).json({ error: 'Valid contactPhone required' });
  const safeName = String(contactName).slice(0, 100).replace(/[\r\n;]/g, ' ');
  const safeOrg = organization ? String(organization).slice(0, 100).replace(/[\r\n;]/g, ' ') : '';
  const vcard =
    'BEGIN:VCARD\n' +
    'VERSION:3.0\n' +
    `FN:${safeName}\n` +
    (safeOrg ? `ORG:${safeOrg}\n` : '') +
    `TEL;type=CELL;type=VOICE;waid=${phoneDigits}:+${phoneDigits}\n` +
    'END:VCARD';
  try {
    const result = await session.sock.sendMessage(jid, {
      contacts: { displayName: safeName, contacts: [{ displayName: safeName, vcard }] },
    });
    if (result?.key?.id && result?.message) {
      session.sentMessageCache.set(result.key.id, result.message);
      if (session.sentMessageCache.size > 1500) session.sentMessageCache.delete(session.sentMessageCache.keys().next().value);
    }
    res.json({ success: true, messageId: result?.key?.id });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Post WhatsApp Status (story) ─────────────────────────────────────────
app.post('/post-status', async (req, res) => {
  const session = getSessionForRequest(req);
  if (!session.sock || session.connectionState !== 'connected') return res.status(503).json({ error: 'Not connected' });
  const { text, imageUrl, caption, backgroundColor } = req.body || {};
  if (!text && !imageUrl) return res.status(400).json({ error: 'text or imageUrl required' });
  // A status is only visible to JIDs in statusJidList — build the audience
  // from every individual contact/chat this session knows about.
  const audience = new Set();
  for (const jid of session.contactsCache.keys()) if (typeof jid === 'string' && jid.endsWith('@s.whatsapp.net')) audience.add(jid);
  for (const jid of session.chatMap.keys()) if (typeof jid === 'string' && jid.endsWith('@s.whatsapp.net')) audience.add(jid);
  const statusJidList = Array.from(audience).slice(0, 3000);
  if (!statusJidList.length) return res.status(400).json({ error: 'No contacts to share the status with yet' });
  try {
    const content = imageUrl
      ? { image: { url: String(imageUrl) }, caption: String(caption || text || '') }
      : { text: String(text) };
    const opts = { statusJidList };
    if (!imageUrl && backgroundColor) opts.backgroundColor = String(backgroundColor);
    const result = await session.sock.sendMessage('status@broadcast', content, opts);
    res.json({ success: true, messageId: result?.key?.id, audienceSize: statusJidList.length });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Typing Indicator ─────────────────────────────────────────────────────
app.post('/typing', async (req, res) => {
  const session = getSessionForRequest(req);
  if (session.connectionState !== 'connected') return res.json({ ok: true });
  const { jid, composing } = req.body;
  if (!jid) return res.status(400).json({ error: 'jid required' });
  try { await session.sock.sendPresenceUpdate(composing ? 'composing' : 'paused', jid); } catch {}
  res.json({ ok: true });
});

// ── Contact About ────────────────────────────────────────────────────────
app.get('/contact-about/:jid', async (req, res) => {
  const session = getSessionForRequest(req);
  if (!session.sock || session.connectionState !== 'connected') return res.json({ about: '', setAt: null });
  const jid = req.params.jid.includes('@') ? req.params.jid : `${req.params.jid}@s.whatsapp.net`;
  try {
    const status = await session.sock.fetchStatus(jid);
    res.json({ about: status?.status || '', setAt: status?.setAt || null });
  } catch (e) { res.json({ about: '', setAt: null }); }
});

// ── Statuses ─────────────────────────────────────────────────────────────
app.get('/statuses', (req, res) => {
  const session = getSessionForRequest(req);
  try {
    const grouped = {};
    for (const s of session.statusStore) {
      if (!grouped[s.senderJid]) grouped[s.senderJid] = { senderJid: s.senderJid, senderPhone: s.senderPhone, senderName: s.senderName, statuses: [] };
      grouped[s.senderJid].statuses.push(s);
    }
    res.json({ statuses: Object.values(grouped), total: session.statusStore.length });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ═══════════════════════════════════════════════════════════════════════
// SERVER START
// ═══════════════════════════════════════════════════════════════════════
const server = app.listen(PORT, () => {
  console.log(`\n╔══════════════════════════════════════════════════╗`);
  console.log(`║  Swar Yoga WhatsApp Bridge (Multi-User Baileys)  ║`);
  console.log(`║  Port: ${PORT}    Max Sessions: ${MAX_SESSIONS}              ║`);
  console.log(`║  Webhook: ${WEBHOOK_URL.substring(0, 38).padEnd(38)}║`);
  console.log(`╚══════════════════════════════════════════════════╝\n`);
  console.log('[READY] Bridge ready — sessions will auto-start when users connect');
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`[FATAL] Port ${PORT} already in use. Kill it:\n  lsof -ti:${PORT} | xargs kill -9`);
    process.exit(1);
  }
  throw err;
});

// Graceful shutdown — clean up all sessions
process.on('SIGINT', async () => {
  console.log('\n[SHUTDOWN] SIGINT received');
  for (const [uid, session] of sessions) {
    console.log(`[SHUTDOWN] Cleaning up session: ${uid}`);
    session.destroy();
  }
  if (mongoClient) try { await mongoClient.close(); } catch {}
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n[SHUTDOWN] SIGTERM received');
  for (const [uid, session] of sessions) {
    session.destroy();
  }
  if (mongoClient) try { await mongoClient.close(); } catch {}
  process.exit(0);
});
