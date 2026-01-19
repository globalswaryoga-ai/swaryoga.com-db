const express = require('express');
const qrcode = require('qrcode');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { Client, LocalAuth } = require('whatsapp-web.js');

const app = express();
const PORT = process.env.PORT || 3333;
const BRIDGE_SECRET = process.env.WHATSAPP_BRIDGE_SECRET || 'swar-bridge-secret-2024';

// Configure multer for file uploads
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB limit
  }
});

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

// Session data directory - use /tmp for fresh start on each run
const SESSION_DIR = process.env.SESSION_DIR || '/tmp/.wwebjs_auth';
const CLIENT_ID = process.env.CLIENT_ID || 'swar-bridge-session';

// Helper: Find Chrome executable
function getChromePath() {
  const possiblePaths = [
    process.env.CHROME_PATH,
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium-browser',
    '/snap/bin/chromium'
  ];
  
  for (const p of possiblePaths) {
    if (p && fs.existsSync(p)) {
      console.log(`✓ Using Chrome at: ${p}`);
      return p;
    }
  }
  return undefined;
}

// Global state
let client = null;
let qrCode = null;
let chats = [];
let sessionReady = false;
let isRecovering = false;
let crashCount = 0;
let lastCrashTime = 0;

// Message queue system to prevent browser overload
let messageQueue = [];
let isProcessingQueue = false;

async function processMessageQueue() {
  if (isProcessingQueue || messageQueue.length === 0 || !sessionReady || !client) {
    return;
  }
  
  isProcessingQueue = true;
  
  while (messageQueue.length > 0 && sessionReady && client) {
    const msg = messageQueue.shift();
    
    try {
      console.log(`[queue] Processing: sending to ${msg.chatId}, message length: ${msg.message.length}`);
      
      let chat = chats.find(c => c.id._serialized === msg.chatId);
      
      if (chat) {
        if (msg.media) {
          const { MessageMedia } = require('whatsapp-web.js');
          const mediaData = await MessageMedia.fromUrl(msg.media);
          await chat.sendMessage(mediaData, { caption: msg.message });
        } else {
          await chat.sendMessage(msg.message);
        }
        console.log(`[queue] ✅ Sent successfully`);
      } else {
        // Try direct send
        if (msg.media) {
          const { MessageMedia } = require('whatsapp-web.js');
          const mediaData = await MessageMedia.fromUrl(msg.media);
          await client.sendMessage(msg.chatId, mediaData, { caption: msg.message });
        } else {
          await client.sendMessage(msg.chatId, msg.message);
        }
        console.log(`[queue] ✅ Sent directly`);
      }
      
      // Delay between messages to avoid overwhelming the browser
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (err) {
      console.error(`[queue] ❌ Failed: ${err.message}`);
      // Don't retry on failure, just skip
    }
  }
  
  isProcessingQueue = false;
}

// Initialize WhatsApp client
function initializeClient() {
  console.log(`📱 Initializing WhatsApp client (ID: ${CLIENT_ID})...`);
  console.log(`📂 Session Dir: ${SESSION_DIR}`);
  
  // Remove lock file if it exists
  const lockPath = path.join(SESSION_DIR, `session-${CLIENT_ID}`, '.puppeteer-lock');
  try {
    if (fs.existsSync(lockPath)) {
      fs.unlinkSync(lockPath);
      console.log('🔓 Removed stale lock file');
    }
  } catch (e) {
    console.log('Note: Could not remove lock file:', e.message);
  }
  
  if (client) {
    try {
      client.destroy();
      client = null;
    } catch (e) {}
  }
  
  // Handle too many crashes
  const now = Date.now();
  if (crashCount > 3 && (now - lastCrashTime) < 60000) {
    console.error('❌ Too many crashes in short time - waiting 30s before retry');
    setTimeout(() => {
      crashCount = 0;
      initializeClient();
    }, 30000);
    return;
  }

  client = new Client({
    authStrategy: new LocalAuth({
      clientId: CLIENT_ID,
      dataPath: SESSION_DIR
    }),
    puppeteer: {
      headless: true,
      executablePath: getChromePath(),
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--no-first-run',
        '--no-zygote',
        // Removed --single-process to avoid potential issues
      ],
      // Increase timeouts for initialization
      handleSIGINT: false,
      handleSIGTERM: false,
      handleSIGHUP: false
    }
  });

  client.on('qr', (qr) => {
    console.log('✅ QR code received');
    qrcode.toDataURL(qr, (err, url) => {
      if (!err) {
        qrCode = url;
        console.log(`✅ QR set (len: ${qrCode.length})`);
      }
    });
  });

  client.on('ready', () => {
    console.log('✓ WhatsApp client ready');
    sessionReady = true;
    qrCode = null;
    crashCount = 0; // Reset crash counter on successful connection
    loadChats();
    startHeartbeat();
  });

  client.on('disconnected', () => {
    console.log('⚠ WhatsApp disconnected');
    sessionReady = false;
    qrCode = null;
    lastCrashTime = Date.now();
    crashCount++;
    console.log(`Crash count: ${crashCount}, last crash: ${new Date(lastCrashTime).toISOString()}`);
    // Don't exit immediately, let it attempt reconnect
  });

  console.log('🚀 Calling client.initialize()...');
  
  // Add timeout to prevent hanging indefinitely
  const initTimeout = setTimeout(() => {
    console.error('❌ Initialization timeout - no ready event after 60s');
    if (client) {
      try {
        client.destroy();
      } catch (e) {}
    }
    client = null;
    sessionReady = false;
    console.log('⏳ Restarting client...');
    setTimeout(() => initializeClient(), 5000);
  }, 60000); // 60 second timeout

  // Clear timeout on ready
  const originalOn = client.on.bind(client);
  client.on = function(event, handler) {
    if (event === 'ready') {
      const wrappedHandler = () => {
        clearTimeout(initTimeout);
        handler();
      };
      return originalOn(event, wrappedHandler);
    }
    return originalOn(event, handler);
  };

  client.initialize().catch((err) => {
    clearTimeout(initTimeout);
    console.error('❌ Initialization error:', err.message);
    console.error('❌ Stack:', err.stack);
    // If it's a lock error, wait 30s before exiting to prevent PM2 spam
    if (err.message.includes('already running')) {
       console.log('⏳ Lock detected, waiting 30s before exit...');
       setTimeout(() => process.exit(1), 30000);
    } else {
       console.log('⏳ Restarting after error...');
       setTimeout(() => initializeClient(), 5000);
    }
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
    chatCount: chats.length,
    queueSize: messageQueue.length,
    isProcessingQueue: isProcessingQueue
  });
});

// GET /profile - Get current user profile
app.get('/profile', authMiddleware, async (req, res) => {
  try {
    if (!client || !sessionReady) {
      return res.status(503).json({ error: 'WhatsApp not connected' });
    }
    
    const profile = {
      id: client.info?.wid?._serialized || 'unknown',
      name: client.info?.pushname || 'WhatsApp User',
      phone: client.info?.wid?.user || 'unknown',
      isConnected: sessionReady,
      status: 'connected'
    };
    
    res.json(profile);
  } catch (err) {
    console.error('[profile] Error:', err);
    res.status(500).json({ error: err.message });
  }
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

// POST /connect - Reconnect (force QR generation if disconnected)
app.post('/connect', authMiddleware, async (req, res) => {
  try {
    if (sessionReady) {
      return res.json({
        message: 'Already connected',
        status: 'connected',
        hasQr: false
      });
    }
    
    // If client exists but not ready and no QR yet, reinitialize
    if (client && !sessionReady && !qrCode) {
      console.log('🔄 [/connect] Client exists but no QR - reinitializing...');
      try {
        await client.destroy().catch(() => {});
      } catch (e) {
        console.log('⚠ Could not destroy client:', e.message);
      }
      client = null;
      qrCode = null;
      initializeClient();
    } else if (!client) {
      console.log('🔄 [/connect] No client - initializing...');
      initializeClient();
    }
    
    res.json({
      message: 'Initializing connection... QR should appear in ~3-5 seconds',
      status: 'connecting',
      hasQr: !!qrCode,
      note: 'Refresh /status endpoint after 3 seconds to get QR code'
    });
  } catch (err) {
    console.error('[/connect] Error:', err.message);
    res.status(500).json({
      error: err.message,
      status: 'error'
    });
  }
});

// POST /disconnect - Disconnect and force QR regeneration
app.post('/disconnect', authMiddleware, async (req, res) => {
  try {
    console.log('🔄 Processing disconnect request...');
    if (client) {
      try {
        await client.logout();
        console.log('✓ Client logged out');
      } catch (err) {
        console.log('⚠ Logout error (may be already disconnected):', err.message);
      }
      try {
        await client.destroy();
        console.log('✓ Client destroyed');
      } catch (err) {
        console.log('⚠ Destroy error:', err.message);
      }
    }
    
    // Reset state
    sessionReady = false;
    qrCode = null;
    chats = [];
    client = null;
    
    // Reinitialize client to generate fresh QR
    console.log('🔄 Reinitializing client for fresh QR...');
    setTimeout(() => {
      initializeClient();
    }, 1000);
    
    res.json({
      message: 'Disconnected and reinitializing',
      status: 'disconnected'
    });
  } catch (err) {
    console.error('Error during disconnect:', err);
    res.status(500).json({
      error: err.message,
      status: 'error'
    });
  }
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

// GET /contact/:contactId - Get contact details
app.get('/contact/:contactId', authMiddleware, async (req, res) => {
  try {
    const { contactId } = req.params;
    console.log(`[contact] Fetching contact: ${contactId}`);
    
    // Contact ID might be in format like "919876543210@c.us"
    // First check if it exists in any chat
    let contactInfo = null;
    
    for (const chat of chats) {
      if (chat.id._serialized === contactId) {
        contactInfo = {
          id: chat.id._serialized,
          name: chat.name || chat.contact?.pushname || 'Unknown',
          isGroup: chat.isGroup,
          lastMessage: chat.lastMessage ? {
            body: chat.lastMessage.body,
            timestamp: chat.lastMessage.timestamp
          } : null,
          unreadCount: chat.unreadCount,
          participantsCount: chat.participants ? chat.participants.length : 0
        };
        break;
      }
    }
    
    if (!contactInfo) {
      // Try to get contact from WhatsApp
      if (client && client.getContactById) {
        try {
          const contact = await client.getContactById(contactId);
          contactInfo = {
            id: contactId,
            name: contact.name || contact.pushname || 'Unknown',
            phone: contact.number,
            isGroup: false,
            profilePicUrl: contact.profilePicUrl || null
          };
        } catch (err) {
          console.log(`[contact] Could not get contact from WhatsApp: ${err.message}`);
        }
      }
    }
    
    if (!contactInfo) {
      return res.status(404).json({ error: 'Contact not found' });
    }
    
    res.json(contactInfo);
  } catch (err) {
    console.error('[contact] Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /group/:chatId - Get group details including description and invite link
app.get('/group/:chatId', authMiddleware, async (req, res) => {
  try {
    const { chatId } = req.params;
    console.log(`[group] Fetching group details: ${chatId}`);
    
    // Find the group chat
    const groupChat = chats.find(c => c.id._serialized === chatId && c.isGroup);
    
    if (!groupChat) {
      return res.status(404).json({ error: 'Group not found' });
    }
    
    // Get group metadata
    let groupInfo = {
      id: groupChat.id._serialized,
      name: groupChat.name,
      isGroup: true,
      description: null,
      inviteCode: null,
      participants: [],
      owner: null,
      createdAt: null,
      profilePicUrl: null
    };
    
    try {
      // Get full group metadata
      const groupMetadata = await groupChat.groupMetadata;
      
      if (groupMetadata) {
        groupInfo.description = groupMetadata.desc || null;
        groupInfo.owner = groupMetadata.owner ? groupMetadata.owner._serialized : null;
        groupInfo.createdAt = groupMetadata.creation ? groupMetadata.creation * 1000 : null;
        groupInfo.participants = groupMetadata.participants ? groupMetadata.participants.map((p) => ({
          id: p.id._serialized,
          isAdmin: p.isAdmin || false,
          isSuperAdmin: p.isSuperAdmin || false
        })) : [];
      }
      
      // Try to get invite code/link
      try {
        const inviteCode = await groupChat.getInviteCode();
        if (inviteCode) {
          groupInfo.inviteCode = inviteCode;
        }
      } catch (inviteErr) {
        console.warn(`[group] Could not get invite code: ${inviteErr.message}`);
      }
      
      // Try to get profile picture
      try {
        const profilePicUrl = await groupChat.getProfilePicUrl();
        if (profilePicUrl) {
          groupInfo.profilePicUrl = profilePicUrl;
        }
      } catch (picErr) {
        console.warn(`[group] Could not get profile picture: ${picErr.message}`);
      }
      
    } catch (metaErr) {
      console.warn(`[group] Could not get full metadata: ${metaErr.message}`);
    }
    
    res.json(groupInfo);
  } catch (err) {
    console.error('[group] Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /messages/:chatId - Get messages
app.get('/messages/:chatId', authMiddleware, async (req, res) => {
  try {
    const { chatId } = req.params;
    
    // Check client health
    if (!client || !sessionReady) {
      return res.status(503).json({ error: 'WhatsApp client not connected' });
    }

    // Try to get chat directly (faster than searching)
    let chat;
    try {
      chat = await client.getChatById(chatId);
    } catch (e) {
      chat = chats.find(c => c.id._serialized === chatId);
    }
    
    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' });
    }
    
    const messages = await chat.fetchMessages({ limit: 50 });
    
    // Format messages efficiently - DON'T download media here, let UI fetch it on demand
    const formattedMessages = messages.map((msg) => {
      const formatted = {
        id: msg.id._serialized,
        body: msg.body,
        fromMe: msg.fromMe,
        timestamp: msg.timestamp,
        author: msg.author || msg.from,
        hasMedia: msg.hasMedia,
        ack: msg.ack,
        type: msg.type
      };
      
      // Provide download URLs but don't download now
      if (msg.hasMedia) {
        formatted.mediaDownloadUrl = `/media?messageId=${encodeURIComponent(msg.id._serialized)}`;
        // Also provide the CRM-UI expected path
        formatted.mediaDownloadPath = `/messages/media/${encodeURIComponent(msg.id._serialized)}`;
      }
      
      return formatted;
    });
    
    res.json({ messages: formattedMessages });
  } catch (err) {
    console.error('Error fetching messages:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /media/upload - Upload media to S3
app.post('/media/upload', authMiddleware, upload.single('file'), async (req, res) => {
  try {
    console.log('[media/upload] Received file upload request');
    
    // Get file from multer
    const file = req.file;
    
    if (!file) {
      console.error('[media/upload] No file provided');
      return res.status(400).json({ error: 'No file provided' });
    }
    
    console.log(`[media/upload] Processing file: ${file.originalname} (${file.size} bytes, ${file.mimetype})`);
    
    // Check for AWS S3 credentials
    const s3AccessKey = process.env.AWS_ACCESS_KEY_ID;
    const s3SecretKey = process.env.AWS_SECRET_ACCESS_KEY;
    const s3Bucket = process.env.AWS_S3_BUCKET || 'swar-yoga-media';
    const s3Region = process.env.AWS_REGION || 'ap-south-1';
    
    if (!s3AccessKey || !s3SecretKey) {
      console.error('[media/upload] ⚠ Missing AWS credentials');
      console.error('  AWS_ACCESS_KEY_ID:', s3AccessKey ? '✓' : '✗');
      console.error('  AWS_SECRET_ACCESS_KEY:', s3SecretKey ? '✓' : '✗');
      console.error('  AWS_S3_BUCKET:', s3Bucket);
      console.error('  AWS_REGION:', s3Region);
      
      // Return error but with details for debugging
      return res.status(503).json({ 
        error: 'S3 upload not configured',
        details: {
          hasAccessKey: !!s3AccessKey,
          hasSecretKey: !!s3SecretKey,
          bucket: s3Bucket,
          region: s3Region,
          message: 'AWS credentials not found in environment variables'
        }
      });
    }
    
    // For now, generate a mock S3 URL
    // In production, this would use AWS SDK to upload to S3
    const fileKey = `whatsapp-media/${Date.now()}-${file.originalname}`;
    const s3Url = `https://${s3Bucket}.s3.${s3Region}.amazonaws.com/${fileKey}`;
    
    console.log(`[media/upload] ✓ File processed: ${fileKey}`);
    console.log(`[media/upload] ✓ S3 URL: ${s3Url}`);
    
    res.json({
      success: true,
      url: s3Url,
      key: fileKey,
      size: file.size,
      mimetype: file.mimetype,
      name: file.originalname
    });
    
  } catch (err) {
    console.error('[media/upload] Error:', err.message);
    res.status(500).json({ 
      error: err.message,
      details: 'Failed to upload media file'
    });
  }
});

// POST /send - Send message via queue
app.post('/send', authMiddleware, async (req, res) => {
  try {
    const { chatId, message, to, media, url, caption, type, buttons } = req.body;
    
    // Support both chatId and to parameters
    const targetChatId = chatId || to;
    // Support either message, caption or text body
    const messageText = message || caption || '';
    // Support both media and url (from new backend)
    const finalMedia = media || url || null;
    
    if (!targetChatId) {
      return res.status(400).json({ error: 'Missing chatId or to parameter' });
    }
    
    console.log(`[send] Queuing ${finalMedia ? 'media' : 'text'} message to ${targetChatId}`);
    
    // Check if client is ready
    if (!client || !sessionReady) {
      console.error('[send] Client not ready');
      return res.status(503).json({ error: 'WhatsApp client not connected' });
    }
    
    // Add to queue instead of sending immediately
    messageQueue.push({
      chatId: targetChatId,
      message: messageText,
      media: finalMedia,
      type: type || (finalMedia ? 'media' : 'text'),
      buttons: buttons || null,
      timestamp: Date.now()
    });
    
    console.log(`[send] ✅ Message queued. Queue size: ${messageQueue.length}`);
    
    // Return success immediately - will be processed asynchronously
    res.json({ 
      success: true, 
      message: 'Message queued for delivery',
      queueSize: messageQueue.length
    });
    
    // Try to process queue immediately if there's space
    if (!isProcessingQueue && messageQueue.length <= 5) {
      processMessageQueue().catch(e => console.error('[send] Queue error:', e.message));
    }
    
  } catch (err) {
    console.error('[send] Unexpected error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /send-to-number - Send message to a phone number (for new leads)
app.post('/send-to-number', authMiddleware, async (req, res) => {
  try {
    const { phone, message } = req.body;
    if (!phone || !message) {
      return res.status(400).json({ error: 'Missing phone or message' });
    }
    
    // Normalize phone number (remove non-digits, add country code if needed)
    let normalizedPhone = phone.replace(/\D/g, '');
    if (normalizedPhone.length === 10) {
      normalizedPhone = '91' + normalizedPhone; // India country code
    }
    const chatId = `${normalizedPhone}@c.us`;
    
    console.log(`[send-to-number] Sending message to ${phone} (${chatId}): "${message.substring(0, 50)}..."`);
    
    // Check if client is ready
    if (!client || !sessionReady) {
      console.error('[send-to-number] Client not ready');
      return res.status(503).json({ error: 'WhatsApp client not connected' });
    }
    
    try {
      // Send directly to the number (WhatsApp Web API allows this)
      const sentMessage = await client.sendMessage(chatId, message);
      console.log(`[send-to-number] Message sent successfully to ${chatId}`);
      res.json({ 
        success: true, 
        message: 'Message sent',
        messageId: sentMessage.id._serialized,
        chatId: chatId
      });
    } catch (sendErr) {
      console.error('[send-to-number] Failed to send message:', sendErr.message);
      
      // Check if it's a frame detachment issue
      if (sendErr.message.includes('detached') || sendErr.message.includes('Frame')) {
        console.warn('[send-to-number] ⚠️ Detected frame/connection issue - triggering reconnect');
        sessionReady = false;
        
        // Try to recover
        setTimeout(() => {
          if (!sessionReady && client) {
            console.log('[send-to-number] 🔄 Attempting automatic recovery...');
            try {
              client.initialize().catch(() => {
                console.error('[send-to-number] Recovery failed');
              });
            } catch (e) {
              console.error('[send-to-number] Recovery error:', e.message);
            }
          }
        }, 2000);
        
        return res.status(503).json({ 
          error: 'Connection interrupted - attempting recovery',
          details: 'WhatsApp client experienced a connection issue. Please retry in a moment.'
        });
      }
      
      const statusCode = sendErr.message.includes('disconnect') || sendErr.message.includes('not connected') ? 503 : 400;
      res.status(statusCode).json({ 
        error: sendErr.message,
        details: 'Failed to send message. Please try again.'
      });
    }
  } catch (err) {
    console.error('[send-to-number] Unexpected error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Media endpoint - download and return media from WhatsApp messages
// Supports both /media?messageId=ID and /messages/media/ID
const handleMediaDownload = async (req, res) => {
  try {
    const rawId = req.query.messageId || req.params.msgId;
    if (!rawId) return res.status(400).json({ error: 'Missing messageId' });
    
    const messageId = decodeURIComponent(String(rawId));
    console.log(`[media] Fetching media for message: ${messageId}`);

    if (!client || !sessionReady) {
      return res.status(503).json({ error: 'WhatsApp client not connected' });
    }

    try {
      // FAST SEARCH using library method
      const foundMessage = await client.getMessageById(messageId);

      if (!foundMessage) {
        console.warn(`[media] Message not found: ${messageId}`);
        return res.status(404).json({ error: 'Message not found' });
      }

      if (!foundMessage.hasMedia) {
        console.warn(`[media] Message has no media: ${messageId}`);
        return res.status(400).json({ error: 'Message has no media' });
      }

      // Download media with timeout
      console.log(`[media] Downloading media for: ${messageId}`);
      
      const timeoutMs = 25000;
      const downloadPromise = foundMessage.downloadMedia();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Media download timeout')), timeoutMs)
      );

      const media = await Promise.race([downloadPromise, timeoutPromise]);
      
      if (!media || !media.data) {
        console.error(`[media] Failed to download media or empty data: ${messageId}`);
        return res.status(404).json({ error: 'Media not available' });
      }

      // Return JSON if requested or the raw buffer
      const acceptsJson = req.headers.accept?.includes('application/json');
      if (acceptsJson) {
        return res.json({
          mimetype: media.mimetype,
          data: media.data,
          filename: media.filename || null
        });
      }

      // Default: Return raw media with appropriate content type
      res.setHeader('Content-Type', media.mimetype || 'application/octet-stream');
      res.setHeader('Content-Length', Buffer.from(media.data, 'base64').length);
      res.setHeader('Cache-Control', 'public, max-age=86400');
      
      const buffer = Buffer.from(media.data, 'base64');
      res.send(buffer);
      
      console.log(`[media] Successfully returned media for: ${messageId} (${buffer.length} bytes)`);
    } catch (fetchErr) {
      console.error(`[media] Error fetching media:`, fetchErr.message);
      return res.status(500).json({ error: 'Failed to fetch media', details: fetchErr.message });
    }
  } catch (err) {
    console.error('[media] Unexpected error:', err.message);
    res.status(500).json({ error: err.message });
  }
};

app.get('/media', authMiddleware, handleMediaDownload);
app.get('/messages/media/:msgId', authMiddleware, handleMediaDownload);

// Health check
app.get('/health', (req, res) => {
  res.json({ ok: true, port: PORT });
});

// Heartbeat mechanism - periodically check if client is alive
let heartbeatInterval = null;

function startHeartbeat() {
  if (heartbeatInterval) clearInterval(heartbeatInterval);
  
  heartbeatInterval = setInterval(() => {
    if (!sessionReady || !client) return;
    
    // Process message queue
    processMessageQueue().catch(e => console.error('Queue processing error:', e.message));
    
    // Try a simple operation to verify connection
    client.getState().then(state => {
      console.log(`💓 Heartbeat OK - state: ${state}, queue: ${messageQueue.length}`);
    }).catch(err => {
      console.warn(`⚠️ Heartbeat failed: ${err.message}`);
      if (err.message.includes('detached') || err.message.includes('not connected')) {
        console.log('Triggering reconnect...');
        sessionReady = false;
        if (client) {
          try {
            client.initialize();
          } catch (e) {
            console.error('Reconnect failed:', e.message);
          }
        }
      }
    });
  }, 10000); // Check every 10 seconds (was 30s)
}

// Stop heartbeat
function stopHeartbeat() {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
}

// Start server - bind to all interfaces (0.0.0.0) so ngrok can reach it
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🌐 WhatsApp Bridge running on http://0.0.0.0:${PORT}`);
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

// POST /log-message - Log sent message to CRM database (called by Next.js CRM)
app.post('/log-message', authMiddleware, async (req, res) => {
  try {
    const { phoneNumber, messageContent, direction, status, waMessageId, leadId } = req.body;
    
    if (!phoneNumber || !messageContent) {
      return res.status(400).json({ error: 'Missing phoneNumber or messageContent' });
    }
    
    console.log(`[log-message] Logging message to ${phoneNumber}`);
    
    // This endpoint is called by the Next.js CRM API to log sent messages
    // The actual database save happens in the CRM layer
    // This just confirms the bridge received the logging request
    
    res.json({ 
      success: true,
      message: 'Message logged',
      data: { phoneNumber, messageContent, direction, status }
    });
  } catch (err) {
    console.error('[log-message] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

process.on('SIGINT', () => {
  console.log('\n⚠ Received SIGINT - staying alive...');
  // Don't exit - keep running
});

process.on('SIGTERM', () => {
  console.log('\n⚠ Received SIGTERM - staying alive...');
  // Don't exit - keep running
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught exception:', err.message);
  console.error('Stack trace:', err.stack);
  // Don't crash - log and continue
  console.log('⚠ Keeping server alive...');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled rejection at:', promise);
  console.error('Reason:', reason);
  // Don't exit on unhandled rejections, just log them
});
