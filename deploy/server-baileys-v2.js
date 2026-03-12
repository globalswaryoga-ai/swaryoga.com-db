/**
 * Swar Yoga WhatsApp Bridge — Baileys (Lightweight)
 * No Chromium needed. ~50MB total vs ~400MB for whatsapp-web.js
 * 
 * v2 — Full history sync, reconnect debounce, persistent chat list
 * Endpoints match frontend bridgeCall() expectations.
 */

const express = require('express');
const cors = require('cors');
const qrcode = require('qrcode');
const fs = require('fs');
const path = require('path');
const pino = require('pino');
const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  delay,
  getContentType,
  proto,
  jidNormalizedUser,
} = require('@whiskeysockets/baileys');

// ── Config ──────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3333;
const BRIDGE_SECRET = process.env.WHATSAPP_BRIDGE_SECRET || 'swar-bridge-secret-2024';
const AUTH_DIR = path.join(__dirname, 'auth_state');
const LOG_DIR = path.join(__dirname, 'logs');
const STORE_FILE = path.join(__dirname, 'chat_store.json');
const MAX_STORED_MESSAGES = 100; // per chat

// Ensure dirs
[AUTH_DIR, LOG_DIR].forEach(d => fs.mkdirSync(d, { recursive: true }));

const logger = pino({ level: 'warn' });

// ── State ───────────────────────────────────────────────────────────
let sock = null;
let qrCode = null;
let connected = false;
let connecting = false;
let chatList = [];
let messageStore = {};   // jid → messages[]
let chatMetadata = {};   // jid → { name, unreadCount, conversationTimestamp }
let contactStore = {};   // jid → { name, notify }
let presenceMap = {};    // jid → { lastKnownPresence, lastSeen }
let chatSummaries = {};  // jid → { body, timestamp, fromMe } (persisted last messages)
let reconnectAttempt = 0;
let historySyncDone = false;

// ── Disk Persistence (chat metadata survives restarts) ──────────────
function saveStore() {
  try {
    // Merge existing chatSummaries with fresh ones from messageStore
    const mergedSummaries = { ...chatSummaries };
    for (const jid of Object.keys(messageStore)) {
      const msgs = messageStore[jid] || [];
      // Find last message with actual text (skip protocol/system msgs)
      let lastTextMsg = null;
      for (let i = msgs.length - 1; i >= 0; i--) {
        const body = extractMessageText(msgs[i]);
        if (body) { lastTextMsg = msgs[i]; break; }
      }
      const lastMsg = lastTextMsg || msgs[msgs.length - 1];
      if (lastMsg) {
        mergedSummaries[jid] = {
          body: extractMessageText(lastMsg),
          timestamp: toNumber(lastMsg.messageTimestamp) || 0,
          fromMe: lastMsg.key?.fromMe || false,
        };
      }
    }
    const data = {
      chatMetadata,
      contactStore,
      chatSummaries: mergedSummaries,
    };
    fs.writeFileSync(STORE_FILE, JSON.stringify(data, null, 0));
  } catch (err) {
    console.error('saveStore error:', err.message);
  }
}

function loadStore() {
  try {
    if (fs.existsSync(STORE_FILE)) {
      const data = JSON.parse(fs.readFileSync(STORE_FILE, 'utf8'));
      chatMetadata = data.chatMetadata || {};
      contactStore = data.contactStore || {};
      chatSummaries = data.chatSummaries || {};
      // Normalize any Baileys Long timestamps from disk
      for (const jid of Object.keys(chatSummaries)) {
        if (chatSummaries[jid].timestamp && typeof chatSummaries[jid].timestamp === 'object') {
          chatSummaries[jid].timestamp = chatSummaries[jid].timestamp.low || 0;
        }
      }
      console.log(`💾 Loaded store: ${Object.keys(chatMetadata).length} chats, ${Object.keys(contactStore).length} contacts, ${Object.keys(chatSummaries).length} summaries`);
      // Rebuild chatList from saved metadata
      rebuildChatList();
    }
  } catch (err) {
    console.error('loadStore error:', err.message);
  }
}

// Save store periodically (every 30s) and on new messages
let saveTimer = null;
function scheduleSave() {
  if (saveTimer) return;
  saveTimer = setTimeout(() => {
    saveStore();
    saveTimer = null;
  }, 5000); // Debounce: save 5s after last change
}

// ── Express Setup ───────────────────────────────────────────────────
const app = express();
app.use(cors({ origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], credentials: true, allowedHeaders: ['Content-Type', 'x-bridge-secret'] }));
app.use(express.json({ limit: '10mb' }));

// Auth middleware
const auth = (req, res, next) => {
  const secret = req.headers['x-bridge-secret'];
  if (!secret || secret !== BRIDGE_SECRET) return res.status(401).json({ error: 'Unauthorized bridge access' });
  next();
};

// ── Baileys Connection ──────────────────────────────────────────────
async function startSocket() {
  if (connecting) return;
  connecting = true;
  qrCode = null;

  try {
    const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
    const { version } = await fetchLatestBaileysVersion();

    sock = makeWASocket({
      version,
      auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, logger) },
      logger,
      printQRInTerminal: true,
      generateHighQualityLinkPreview: false,
      syncFullHistory: true,  // ← Enable full history sync
      markOnlineOnConnect: true,
      defaultQueryTimeoutMs: 60000,
    });

    // ─ Events ─
    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async ({ connection, lastDisconnect, qr }) => {
      if (qr) {
        qrCode = await qrcode.toDataURL(qr);
        console.log('📱 QR code ready — scan with WhatsApp');
      }
      if (connection === 'open') {
        connected = true;
        connecting = false;
        qrCode = null;
        reconnectAttempt = 0; // Reset on successful connection
        historySyncDone = false;
        console.log('✅ WhatsApp connected');
        rebuildChatList();
      }
      if (connection === 'close') {
        connected = false;
        connecting = false;
        const code = lastDisconnect?.error?.output?.statusCode;
        const shouldReconnect = code !== DisconnectReason.loggedOut;
        console.log(`❌ Disconnected (code ${code}). Reconnect: ${shouldReconnect}`);

        if (shouldReconnect) {
          reconnectAttempt++;
          // Debounce: longer delay for conflict (440) errors, exponential backoff
          const baseDelay = (code === 440 || code === 515) ? 15000 : 3000;
          const waitMs = Math.min(baseDelay * Math.pow(1.5, reconnectAttempt - 1), 120000);
          console.log(`⏳ Reconnect attempt ${reconnectAttempt} in ${Math.round(waitMs/1000)}s...`);
          await delay(waitMs);
          startSocket();
        } else {
          // Logged out — clear session
          console.log('🗑 Session logged out — clearing auth state');
          try { fs.rmSync(AUTH_DIR, { recursive: true, force: true }); } catch {}
          fs.mkdirSync(AUTH_DIR, { recursive: true });
          sock = null;
          qrCode = null;
          chatList = [];
          messageStore = {};
          chatMetadata = {};
          contactStore = {};
          // Clear saved store
          try { fs.unlinkSync(STORE_FILE); } catch {}
          // Restart to get new QR
          await delay(2000);
          startSocket();
        }
      }
    });

    // ── History Sync (fires once on connection with all chats + messages) ──
    sock.ev.on('messaging-history.set', ({ chats, contacts, messages, isLatest, progress }) => {
      const chatCount = chats?.length || 0;
      const msgCount = messages?.length || 0;
      const contactCount = contacts?.length || 0;
      console.log(`📥 History sync: ${chatCount} chats, ${msgCount} messages, ${contactCount} contacts (isLatest: ${isLatest}, progress: ${progress})`);

      // Store contacts
      if (contacts) {
        for (const c of contacts) {
          if (c.id) {
            contactStore[c.id] = {
              name: c.name || c.notify || contactStore[c.id]?.name,
              notify: c.notify || contactStore[c.id]?.notify,
            };
          }
        }
      }

      // Store chat metadata
      if (chats) {
        for (const chat of chats) {
          if (!chat.id || chat.id === 'status@broadcast') continue;
          chatMetadata[chat.id] = {
            name: chat.name || contactStore[chat.id]?.name || contactStore[chat.id]?.notify || chatMetadata[chat.id]?.name || chat.id.replace(/@.*/, ''),
            unreadCount: chat.unreadCount ?? chatMetadata[chat.id]?.unreadCount ?? 0,
            conversationTimestamp: toNumber(chat.conversationTimestamp) || chatMetadata[chat.id]?.conversationTimestamp || 0,
            pinned: chat.pinned || chatMetadata[chat.id]?.pinned || 0,
            archived: chat.archived || false,
            muteExpiration: chat.muteExpiration || 0,
          };
        }
      }

      // Store messages + update chatSummaries
      if (messages) {
        for (const msg of messages) {
          const jid = msg.key?.remoteJid;
          if (!jid || jid === 'status@broadcast') continue;
          if (!messageStore[jid]) messageStore[jid] = [];
          const exists = messageStore[jid].find(x => x.key?.id === msg.key?.id);
          if (!exists) {
            messageStore[jid].push(msg);
            if (messageStore[jid].length > MAX_STORED_MESSAGES) {
              messageStore[jid] = messageStore[jid].slice(-MAX_STORED_MESSAGES);
            }
          }
          // Update chatSummaries with latest message for this chat
          const msgTs = toNumber(msg.messageTimestamp) || 0;
          const existingSummary = chatSummaries[jid];
          if (!existingSummary || msgTs >= (existingSummary.timestamp || 0)) {
            chatSummaries[jid] = {
              body: extractMessageText(msg),
              timestamp: msgTs,
              fromMe: msg.key?.fromMe || false,
            };
          }
        }
      }

      if (isLatest) {
        historySyncDone = true;
        console.log(`✅ History sync complete — ${Object.keys(chatMetadata).length} total chats`);
      }

      rebuildChatList();
      scheduleSave();
    });

    // ── Live message events ──
    sock.ev.on('messages.upsert', ({ messages: msgs, type }) => {
      for (const m of msgs) {
        const jid = m.key.remoteJid;
        if (!jid || jid === 'status@broadcast') continue;
        if (!messageStore[jid]) messageStore[jid] = [];
        // Avoid duplicates
        const exists = messageStore[jid].find(x => x.key?.id === m.key?.id);
        if (!exists) {
          messageStore[jid].push(m);
          if (messageStore[jid].length > MAX_STORED_MESSAGES) {
            messageStore[jid] = messageStore[jid].slice(-MAX_STORED_MESSAGES);
          }
        }
        // Update chatSummaries (persists last message text across restarts)
        const ts = toNumber(m.messageTimestamp) || Math.floor(Date.now() / 1000);
        const msgText = extractMessageText(m);
        chatSummaries[jid] = {
          body: msgText,
          timestamp: ts,
          fromMe: m.key?.fromMe || false,
        };
        if (!chatMetadata[jid]) {
          chatMetadata[jid] = {
            name: m.pushName || contactStore[jid]?.name || jid.replace(/@.*/, ''),
            unreadCount: m.key.fromMe ? 0 : 1,
            conversationTimestamp: ts,
          };
        } else {
          chatMetadata[jid].conversationTimestamp = ts;
          if (!m.key.fromMe) {
            chatMetadata[jid].unreadCount = (chatMetadata[jid].unreadCount || 0) + 1;
          }
          // Update name from pushName if we don't have one
          if (m.pushName && (!chatMetadata[jid].name || chatMetadata[jid].name === jid.replace(/@.*/, ''))) {
            chatMetadata[jid].name = m.pushName;
          }
        }
      }
      // Refresh chat list on new messages
      rebuildChatList();
      scheduleSave();
    });

    sock.ev.on('messages.update', (updates) => {
      for (const { key, update } of updates) {
        const jid = key.remoteJid;
        if (!jid || !messageStore[jid]) continue;
        const idx = messageStore[jid].findIndex(m => m.key?.id === key.id);
        if (idx >= 0) {
          messageStore[jid][idx] = { ...messageStore[jid][idx], ...update };
        }
      }
    });

    sock.ev.on('chats.upsert', (chats) => {
      for (const chat of chats) {
        if (!chat.id || chat.id === 'status@broadcast') continue;
        chatMetadata[chat.id] = {
          ...chatMetadata[chat.id],
          name: chat.name || contactStore[chat.id]?.name || chatMetadata[chat.id]?.name || chat.id.replace(/@.*/, ''),
          unreadCount: chat.unreadCount ?? chatMetadata[chat.id]?.unreadCount ?? 0,
          conversationTimestamp: toNumber(chat.conversationTimestamp) || chatMetadata[chat.id]?.conversationTimestamp || 0,
        };
      }
      rebuildChatList();
      scheduleSave();
    });

    sock.ev.on('chats.update', (updates) => {
      for (const update of updates) {
        if (!update.id) continue;
        if (chatMetadata[update.id]) {
          if (update.unreadCount !== undefined) chatMetadata[update.id].unreadCount = update.unreadCount;
          if (update.conversationTimestamp) chatMetadata[update.id].conversationTimestamp = toNumber(update.conversationTimestamp);
          if (update.name) chatMetadata[update.id].name = update.name;
          if (update.archived !== undefined) chatMetadata[update.id].archived = update.archived;
          if (update.pinned !== undefined) chatMetadata[update.id].pinned = update.pinned;
        }
      }
      rebuildChatList();
      scheduleSave();
    });

    sock.ev.on('chats.delete', (ids) => {
      for (const id of ids) {
        delete chatMetadata[id];
        delete messageStore[id];
      }
      rebuildChatList();
      scheduleSave();
    });

    sock.ev.on('contacts.update', (updates) => {
      for (const c of updates) {
        if (c.id) {
          contactStore[c.id] = {
            ...contactStore[c.id],
            name: c.name || contactStore[c.id]?.name,
            notify: c.notify || contactStore[c.id]?.notify,
          };
          // Update chat name if we have one
          if (chatMetadata[c.id] && (c.name || c.notify)) {
            chatMetadata[c.id].name = c.name || c.notify;
          }
        }
      }
      rebuildChatList();
    });

    sock.ev.on('contacts.upsert', (contacts) => {
      for (const c of contacts) {
        if (c.id) {
          contactStore[c.id] = {
            name: c.name || c.notify || contactStore[c.id]?.name,
            notify: c.notify || contactStore[c.id]?.notify,
          };
          if (chatMetadata[c.id]) {
            chatMetadata[c.id].name = c.name || c.notify || chatMetadata[c.id].name;
          }
        }
      }
    });

    sock.ev.on('presence.update', ({ id, presences }) => {
      presenceMap[id] = presences;
    });

  } catch (err) {
    console.error('Socket init error:', err.message);
    connecting = false;
    await delay(5000);
    startSocket();
  }
}

// ── Helper: Convert Baileys timestamp (can be Long object) to number ──
function toNumber(ts) {
  if (!ts) return 0;
  if (typeof ts === 'number') return ts;
  if (typeof ts === 'object' && ts.low !== undefined) {
    // Long object from protobuf
    return ts.low;
  }
  return Number(ts) || 0;
}

// ── Rebuild chat list from metadata + messageStore ──────────────────
function rebuildChatList() {
  try {
    // Merge chatMetadata JIDs + messageStore JIDs
    const allJids = new Set([...Object.keys(chatMetadata), ...Object.keys(messageStore)]);
    const list = [];

    for (const jid of allJids) {
      if (jid === 'status@broadcast') continue;

      const msgs = messageStore[jid] || [];
      const lastMsg = msgs[msgs.length - 1];
      const meta = chatMetadata[jid] || {};
      const contact = contactStore[jid] || {};
      const isGroup = jid.endsWith('@g.us');

      // Name priority: contact name > chat metadata > push name > raw JID
      let name = contact.name || contact.notify || meta.name || jid.replace(/@.*/, '');

      // Try to get contact name from Baileys store
      try {
        if (sock?.store?.contacts?.[jid]) {
          const c = sock.store.contacts[jid];
          name = c.name || c.notify || name;
        }
      } catch {}

      const lastMsgText = lastMsg ? extractMessageText(lastMsg) : '';
      const lastMsgTs = lastMsg ? (toNumber(lastMsg.messageTimestamp) || Math.floor(Date.now() / 1000)) : 0;
      const summary = chatSummaries[jid]; // persisted last message

      list.push({
        id: jid,
        name,
        isGroup,
        lastMessage: lastMsg ? {
          body: lastMsgText,
          timestamp: lastMsgTs,
          fromMe: lastMsg.key?.fromMe || false,
        } : (summary ? {
          body: summary.body || '',
          timestamp: toNumber(summary.timestamp) || toNumber(meta.conversationTimestamp) || 0,
          fromMe: summary.fromMe || false,
        } : (meta.conversationTimestamp ? {
          body: '',
          timestamp: toNumber(meta.conversationTimestamp),
          fromMe: false,
        } : null)),
        unreadCount: meta.unreadCount || 0,
        conversationTimestamp: toNumber(meta.conversationTimestamp) || lastMsgTs || 0,
      });
    }

    // Sort by conversation timestamp (newest first), pinned chats on top
    list.sort((a, b) => {
      const metaA = chatMetadata[a.id] || {};
      const metaB = chatMetadata[b.id] || {};
      // Pinned chats first
      if (metaA.pinned && !metaB.pinned) return -1;
      if (!metaA.pinned && metaB.pinned) return 1;
      return (b.conversationTimestamp || 0) - (a.conversationTimestamp || 0);
    });

    chatList = list;
  } catch (err) {
    console.error('rebuildChatList error:', err.message);
  }
}

function extractMessageText(msg) {
  if (!msg?.message) return '';
  const m = msg.message;

  // Direct conversation (simple text)
  if (m.conversation) return m.conversation;

  const type = getContentType(m);
  if (!type) return '';
  const content = m[type];

  // String type (conversation)
  if (typeof content === 'string') return content;

  // Extended text, image caption, video caption, etc.
  if (content?.text) return content.text;
  if (content?.caption) return content.caption;
  if (content?.body) return content.body;

  // Template/button messages
  if (content?.hydratedTemplate?.hydratedContentText) return content.hydratedTemplate.hydratedContentText;
  if (content?.contentText) return content.contentText;

  // Protocol messages (key distribution, etc.) — return descriptive text
  if (type === 'senderKeyDistributionMessage') return '';
  if (type === 'protocolMessage') return '';
  if (type === 'messageContextInfo') return '';

  // Media types — return type indicator
  if (type === 'imageMessage') return '📷 Photo';
  if (type === 'videoMessage') return '🎥 Video';
  if (type === 'audioMessage') return '🎵 Audio';
  if (type === 'documentMessage') return `📎 ${content?.fileName || 'Document'}`;
  if (type === 'stickerMessage') return '🏷️ Sticker';
  if (type === 'contactMessage') return `👤 ${content?.displayName || 'Contact'}`;
  if (type === 'locationMessage') return '📍 Location';

  return '';
}

function normalizeJid(phone) {
  let n = phone.replace(/\D/g, '');
  if (n.length === 10) n = '91' + n; // India
  if (!n.includes('@')) n = n + '@s.whatsapp.net';
  return n;
}

// ── Routes ──────────────────────────────────────────────────────────

// Health (no auth)
app.get('/health', (_, res) => res.json({ ok: true, port: PORT, uptime: process.uptime() }));

// GET /status
app.get('/status', auth, (_, res) => {
  res.json({
    status: connected ? 'connected' : (qrCode ? 'qr' : 'disconnected'),
    hasQr: !!qrCode,
    sessionReady: connected,
    connected,
    qr: qrCode || null,
    chatCount: chatList.length,
    historySyncDone,
    messageStoreSize: Object.keys(messageStore).length,
    phone: sock?.user?.id?.replace(/@.*/, '') || null,
  });
});

// GET /qr
app.get('/qr', auth, (_, res) => {
  if (!qrCode) return res.status(400).json({ ok: false, status: connected ? 'connected' : 'disconnected', hasQr: false, message: 'QR not available. Wait or restart bridge.' });
  res.json({ ok: true, qr: qrCode, hasQr: true });
});

// GET /profile
app.get('/profile', auth, (_, res) => {
  if (!sock || !connected) return res.status(503).json({ error: 'WhatsApp not connected' });
  const me = sock.user;
  res.json({
    id: me?.id || 'unknown',
    name: me?.name || 'WhatsApp User',
    phone: me?.id?.replace(/@.*/, '') || 'unknown',
    isConnected: connected,
    status: 'connected',
  });
});

// GET /chats
app.get('/chats', auth, (_, res) => {
  res.json({ chats: chatList });
});

// GET /messages/:chatId
app.get('/messages/:chatId', auth, async (req, res) => {
  try {
    const jid = decodeURIComponent(req.params.chatId);
    let msgs = messageStore[jid] || [];

    // Ensure msgs is always an array
    if (!Array.isArray(msgs)) {
      msgs = [];
      messageStore[jid] = [];
    }

    const MEDIA_TYPES = ['imageMessage', 'videoMessage', 'audioMessage', 'documentMessage', 'stickerMessage'];

    const formatted = msgs.map(m => {
      const msgType = m.message ? (getContentType(m.message) || 'conversation') : 'conversation';
      const hasMedia = MEDIA_TYPES.includes(msgType);
      const mediaContent = hasMedia && m.message ? m.message[msgType] : null;
      const text = extractMessageText(m);

      // Try to extract quoted message info
      let quoted = null;
      let quotedId = null;
      try {
        const contextInfo = m.message?.[msgType]?.contextInfo || m.message?.extendedTextMessage?.contextInfo;
        if (contextInfo?.stanzaId) {
          quotedId = contextInfo.stanzaId;
          quoted = {
            id: contextInfo.stanzaId,
            participant: contextInfo.participant || '',
            text: contextInfo.quotedMessage?.conversation || extractMessageText({ message: contextInfo.quotedMessage }) || '',
          };
        }
      } catch {}

      return {
        id: m.key?.id || '',
        key: m.key,
        from: m.key?.participant || m.key?.remoteJid || '',
        fromMe: m.key?.fromMe || false,
        text,
        body: text,  // backward compat
        type: hasMedia ? msgType.replace('Message', '') : 'text',
        timestamp: toNumber(m.messageTimestamp) || 0,
        status: m.status || 0,
        participant: m.key?.participant || '',
        pushName: m.pushName || '',
        hasMedia,
        mediaUrl: mediaContent?.url || null,
        mediaMimetype: mediaContent?.mimetype || null,
        mediaFileName: mediaContent?.fileName || null,
        quoted,
        quotedId,
        reactions: {},
        message: m.message, // raw message for frontend media detection
      };
    });

    // Sort by timestamp (oldest first for chat view)
    formatted.sort((a, b) => a.timestamp - b.timestamp);

    res.json({ messages: formatted });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /send
app.post('/send', auth, async (req, res) => {
  try {
    if (!sock || !connected) return res.status(503).json({ error: 'WhatsApp not connected' });
    const { to, chatId, message, type, media, mimetype, filename, caption, cdnUrl } = req.body;
    const jid = to || chatId;
    if (!jid || (!message && !media)) return res.status(400).json({ error: 'Missing to/chatId or message/media' });
    const targetJid = jid.includes('@') ? jid : normalizeJid(jid);

    // Resolve actual media type from 'type' field or mimetype
    let mediaType = type;
    if (type === 'media' && mimetype) {
      if (mimetype.startsWith('image/')) mediaType = 'image';
      else if (mimetype.startsWith('video/')) mediaType = 'video';
      else if (mimetype.startsWith('audio/')) mediaType = 'audio';
      else mediaType = 'document';
    }

    const msgCaption = caption || message || '';
    let sentMsg;
    if (mediaType === 'image' && media) {
      sentMsg = await sock.sendMessage(targetJid, { image: { url: media }, caption: msgCaption });
    } else if (mediaType === 'document' && media) {
      sentMsg = await sock.sendMessage(targetJid, { document: { url: media }, mimetype: mimetype || 'application/octet-stream', fileName: filename || 'file' });
    } else if (mediaType === 'audio' && media) {
      sentMsg = await sock.sendMessage(targetJid, { audio: { url: media }, mimetype: 'audio/mpeg' });
    } else if (mediaType === 'video' && media) {
      sentMsg = await sock.sendMessage(targetJid, { video: { url: media }, caption: msgCaption });
    } else {
      sentMsg = await sock.sendMessage(targetJid, { text: message || msgCaption });
    }

    // Store sent message
    if (!messageStore[targetJid]) messageStore[targetJid] = [];
    messageStore[targetJid].push(sentMsg);

    // Update chat metadata
    const ts = Math.floor(Date.now() / 1000);
    if (!chatMetadata[targetJid]) {
      chatMetadata[targetJid] = { name: targetJid.replace(/@.*/, ''), unreadCount: 0, conversationTimestamp: ts };
    } else {
      chatMetadata[targetJid].conversationTimestamp = ts;
    }

    rebuildChatList();
    scheduleSave();

    res.json({ success: true, message: 'Message sent', messageId: sentMsg?.key?.id });
  } catch (err) {
    console.error('[send]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /send-to-number
app.post('/send-to-number', auth, async (req, res) => {
  try {
    if (!sock || !connected) return res.status(503).json({ error: 'WhatsApp not connected' });
    const { phone, message } = req.body;
    if (!phone || !message) return res.status(400).json({ error: 'Missing phone or message' });
    const jid = normalizeJid(phone);
    const sentMsg = await sock.sendMessage(jid, { text: message });

    if (!messageStore[jid]) messageStore[jid] = [];
    messageStore[jid].push(sentMsg);

    const ts = Math.floor(Date.now() / 1000);
    if (!chatMetadata[jid]) {
      chatMetadata[jid] = { name: jid.replace(/@.*/, ''), unreadCount: 0, conversationTimestamp: ts };
    } else {
      chatMetadata[jid].conversationTimestamp = ts;
    }

    rebuildChatList();
    scheduleSave();

    res.json({ success: true, message: 'Message sent', messageId: sentMsg?.key?.id, chatId: jid });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /reply
app.post('/reply', auth, async (req, res) => {
  try {
    if (!sock || !connected) return res.status(503).json({ error: 'WhatsApp not connected' });
    const { jid, to, chatId, message, quotedMessageId, quotedId, quotedParticipant } = req.body;
    const targetJid = jid || to || chatId;
    if (!targetJid || !message) return res.status(400).json({ error: 'Missing jid/to or message' });
    const resolvedJid = targetJid.includes('@') ? targetJid : normalizeJid(targetJid);
    const qid = quotedMessageId || quotedId;
    const quotedMsg = (messageStore[resolvedJid] || []).find(m => m.key?.id === qid);
    const sentMsg = await sock.sendMessage(resolvedJid, { text: message }, quotedMsg ? { quoted: quotedMsg } : undefined);

    if (!messageStore[resolvedJid]) messageStore[resolvedJid] = [];
    messageStore[resolvedJid].push(sentMsg);
    rebuildChatList();
    scheduleSave();

    res.json({ success: true, messageId: sentMsg?.key?.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /react
app.post('/react', auth, async (req, res) => {
  try {
    if (!sock || !connected) return res.status(503).json({ error: 'WhatsApp not connected' });
    const { jid, messageId, emoji, participant } = req.body;
    await sock.sendMessage(jid, { react: { text: emoji || '', key: { remoteJid: jid, id: messageId, fromMe: false, participant } } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /delete-message
app.post('/delete-message', auth, async (req, res) => {
  try {
    if (!sock || !connected) return res.status(503).json({ error: 'WhatsApp not connected' });
    const { jid, messageId, fromMe } = req.body;
    await sock.sendMessage(jid, { delete: { remoteJid: jid, id: messageId, fromMe: fromMe ?? true } });
    // Remove from store
    if (messageStore[jid]) {
      messageStore[jid] = messageStore[jid].filter(m => m.key?.id !== messageId);
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /read/:jid
app.post('/read/:jid', auth, async (req, res) => {
  try {
    if (!sock || !connected) return res.status(503).json({ error: 'WhatsApp not connected' });
    const jid = decodeURIComponent(req.params.jid);
    const msgs = messageStore[jid] || [];
    const unread = msgs.filter(m => !m.key?.fromMe).slice(-5);
    if (unread.length) {
      await sock.readMessages(unread.map(m => m.key));
    }
    // Clear unread count
    if (chatMetadata[jid]) {
      chatMetadata[jid].unreadCount = 0;
    }
    rebuildChatList();
    res.json({ success: true });
  } catch (err) {
    res.json({ success: true }); // fail silently
  }
});

// POST /typing
app.post('/typing', auth, async (req, res) => {
  try {
    if (!sock || !connected) return res.json({ success: true });
    const { jid, composing } = req.body;
    if (composing) {
      await sock.sendPresenceUpdate('composing', jid);
    } else {
      await sock.sendPresenceUpdate('paused', jid);
    }
    res.json({ success: true });
  } catch (err) {
    res.json({ success: true }); // fail silently
  }
});

// GET /presence/:jid
app.get('/presence/:jid', auth, (req, res) => {
  const jid = decodeURIComponent(req.params.jid);
  const p = presenceMap[jid] || {};
  res.json({ presences: p });
});

// POST /presence/subscribe/:jid
app.post('/presence/subscribe/:jid', auth, async (req, res) => {
  try {
    if (!sock || !connected) return res.json({ success: true });
    const jid = decodeURIComponent(req.params.jid);
    await sock.presenceSubscribe(jid);
    res.json({ success: true });
  } catch (err) {
    res.json({ success: true }); // fail silently
  }
});

// GET /profile-pic/:jid
app.get('/profile-pic/:jid', auth, async (req, res) => {
  try {
    if (!sock || !connected) return res.json({ url: null });
    const jid = decodeURIComponent(req.params.jid);
    const url = await sock.profilePictureUrl(jid, 'image').catch(() => null);
    res.json({ url });
  } catch (err) {
    res.json({ url: null });
  }
});

// GET /contact-about/:jid
app.get('/contact-about/:jid', auth, async (req, res) => {
  try {
    if (!sock || !connected) return res.json({ about: '' });
    const jid = decodeURIComponent(req.params.jid);
    const status = await sock.fetchStatus(jid).catch(() => null);
    res.json({ about: status?.status || '' });
  } catch (err) {
    res.json({ about: '' });
  }
});

// GET /statuses
app.get('/statuses', auth, (_, res) => {
  const statusMsgs = messageStore['status@broadcast'] || [];
  res.json({ statuses: statusMsgs.map(m => ({ id: m.key?.id, from: m.key?.participant, body: extractMessageText(m), timestamp: m.messageTimestamp })) });
});

// ── Group Endpoints ─────────────────────────────────────────────────

// GET /group-info/:jid
app.get('/group-info/:jid', auth, async (req, res) => {
  try {
    if (!sock || !connected) return res.status(503).json({ error: 'Not connected' });
    const jid = decodeURIComponent(req.params.jid);
    const meta = await sock.groupMetadata(jid);
    res.json({
      id: meta.id,
      subject: meta.subject,
      desc: meta.desc,
      owner: meta.owner,
      creation: meta.creation,
      participants: meta.participants,
      size: meta.size || meta.participants?.length || 0,
      restrict: meta.restrict,
      announce: meta.announce,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /group-invite/:jid
app.get('/group-invite/:jid', auth, async (req, res) => {
  try {
    if (!sock || !connected) return res.status(503).json({ error: 'Not connected' });
    const jid = decodeURIComponent(req.params.jid);
    const code = await sock.groupInviteCode(jid);
    res.json({ code, link: `https://chat.whatsapp.com/${code}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /group-revoke-invite/:jid
app.post('/group-revoke-invite/:jid', auth, async (req, res) => {
  try {
    if (!sock || !connected) return res.status(503).json({ error: 'Not connected' });
    const jid = decodeURIComponent(req.params.jid);
    const code = await sock.groupRevokeInvite(jid);
    res.json({ code, link: `https://chat.whatsapp.com/${code}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /group-create
app.post('/group-create', auth, async (req, res) => {
  try {
    if (!sock || !connected) return res.status(503).json({ error: 'Not connected' });
    const { subject, participants } = req.body;
    const jids = (participants || []).map(p => normalizeJid(p));
    const group = await sock.groupCreate(subject, jids);
    res.json({ success: true, id: group.id, gid: group.gid });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /group-participants/:jid
app.post('/group-participants/:jid', auth, async (req, res) => {
  try {
    if (!sock || !connected) return res.status(503).json({ error: 'Not connected' });
    const jid = decodeURIComponent(req.params.jid);
    const { action, participants } = req.body;
    const jids = (participants || []).map(p => p.includes('@') ? p : normalizeJid(p));
    if (action === 'add') await sock.groupParticipantsUpdate(jid, jids, 'add');
    else if (action === 'remove') await sock.groupParticipantsUpdate(jid, jids, 'remove');
    else if (action === 'promote') await sock.groupParticipantsUpdate(jid, jids, 'promote');
    else if (action === 'demote') await sock.groupParticipantsUpdate(jid, jids, 'demote');
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /group-leave/:jid
app.post('/group-leave/:jid', auth, async (req, res) => {
  try {
    if (!sock || !connected) return res.status(503).json({ error: 'Not connected' });
    const jid = decodeURIComponent(req.params.jid);
    await sock.groupLeave(jid);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /group-update-subject/:jid
app.post('/group-update-subject/:jid', auth, async (req, res) => {
  try {
    if (!sock || !connected) return res.status(503).json({ error: 'Not connected' });
    const jid = decodeURIComponent(req.params.jid);
    await sock.groupUpdateSubject(jid, req.body.subject);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /group-update-desc/:jid
app.post('/group-update-desc/:jid', auth, async (req, res) => {
  try {
    if (!sock || !connected) return res.status(503).json({ error: 'Not connected' });
    const jid = decodeURIComponent(req.params.jid);
    await sock.groupUpdateDescription(jid, req.body.description);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /group-settings/:jid
app.post('/group-settings/:jid', auth, async (req, res) => {
  try {
    if (!sock || !connected) return res.status(503).json({ error: 'Not connected' });
    const jid = decodeURIComponent(req.params.jid);
    const { setting } = req.body;
    if (setting === 'announcement') await sock.groupSettingUpdate(jid, 'announcement');
    else if (setting === 'not_announcement') await sock.groupSettingUpdate(jid, 'not_announcement');
    else if (setting === 'locked') await sock.groupSettingUpdate(jid, 'locked');
    else if (setting === 'unlocked') await sock.groupSettingUpdate(jid, 'unlocked');
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /reconnect
app.post('/reconnect', auth, async (_, res) => {
  connected = false;
  connecting = false;
  reconnectAttempt = 0;
  try { sock?.end(new Error('reconnect')); } catch {}
  sock = null;
  setTimeout(() => startSocket(), 1000);
  res.json({ success: true, message: 'Reconnecting...' });
});

// POST /disconnect
app.post('/disconnect', auth, async (_, res) => {
  connected = false;
  connecting = false;
  try { sock?.end(new Error('disconnect')); } catch {}
  sock = null;
  qrCode = null;
  chatList = [];
  saveStore(); // Save before clearing
  res.json({ success: true, message: 'Disconnected', status: 'disconnected' });
});

// POST /logout
app.post('/logout', auth, async (_, res) => {
  connected = false;
  connecting = false;
  try { await sock?.logout(); } catch {}
  try { sock?.end(new Error('logout')); } catch {}
  sock = null;
  qrCode = null;
  chatList = [];
  messageStore = {};
  chatMetadata = {};
  contactStore = {};
  // Clear auth state and store
  try { fs.rmSync(AUTH_DIR, { recursive: true, force: true }); } catch {}
  fs.mkdirSync(AUTH_DIR, { recursive: true });
  try { fs.unlinkSync(STORE_FILE); } catch {}
  // Restart for new QR
  setTimeout(() => startSocket(), 2000);
  res.json({ success: true, message: 'Logged out', status: 'disconnected' });
});

// POST /connect
app.post('/connect', auth, async (_, res) => {
  if (connected) return res.json({ message: 'Already connected', status: 'connected' });
  startSocket();
  res.json({ message: 'Initializing connection...', status: 'connecting' });
});

// ── Server Start ────────────────────────────────────────────────────
loadStore(); // Load saved chat data before starting

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🌐 Baileys Bridge v2 on http://0.0.0.0:${PORT}`);
  console.log(`🔑 Bridge Secret: ${BRIDGE_SECRET.substring(0, 8)}...`);
  console.log(`💾 Auth dir: ${AUTH_DIR}`);
  startSocket();
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') { console.error(`Port ${PORT} in use`); process.exit(1); }
  console.error('Server error:', err);
});

// Graceful shutdown — save store
process.on('SIGINT', () => { console.log('SIGINT received'); saveStore(); process.exit(0); });
process.on('SIGTERM', () => { console.log('SIGTERM received'); saveStore(); process.exit(0); });
process.on('uncaughtException', (err) => { console.error('Uncaught:', err.message); });
process.on('unhandledRejection', (r) => { console.error('Unhandled rejection:', r); });
