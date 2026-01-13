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
      // Try multiple possible Chrome/Chromium paths
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
    console.log('⚠ WhatsApp disconnected - attempting to reconnect...');
    sessionReady = false;
    qrCode = null;
    // Auto-reconnect after 5 seconds
    setTimeout(() => {
      console.log('Attempting to reconnect...');
      try {
        client.initialize().catch(err => {
          console.error('Reconnection failed:', err);
        });
      } catch (err) {
        console.error('Error during reconnection:', err);
      }
    }, 5000);
  });

  client.on('message', (msg) => {
    console.log('New message:', msg.body.substring(0, 50));
    loadChats();
  });

  client.on('error', (err) => {
    console.error('⚠ WhatsApp client error:', err.message);
    sessionReady = false;
    // Don't disconnect on error - keep trying
  });

  client.on('auth_failure', (err) => {
    console.error('⚠ WhatsApp authentication failed:', err);
    sessionReady = false;
    qrCode = null;
    // Keep client alive for QR code generation
  });

  client.initialize().catch((err) => {
    console.error('Failed to initialize WhatsApp client:', err.message);
    sessionReady = false;
    // Attempt to reinitialize after delay
    setTimeout(() => {
      console.log('Attempting to reinitialize client...');
      try {
        client.initialize();
      } catch (e) {
        console.error('Reinitialization error:', e);
      }
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
    const chat = chats.find(c => c.id._serialized === chatId);
    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' });
    }
    const messages = await chat.fetchMessages({ limit: 50 });
    
    // Format messages with media support
    const formattedMessages = await Promise.all(messages.map(async (msg) => {
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
      
      // If message has media, try to download and get URL
      if (msg.hasMedia) {
        try {
          const media = await msg.downloadMedia();
          if (media) {
            // Convert media to data URL for display
            formatted.mediaUrl = `data:${media.mimetype};base64,${media.data}`;
            formatted.mediaMimetype = media.mimetype;
            formatted.mediaFilename = media.filename;
          }
        } catch (mediaErr) {
          console.warn(`[messages] Failed to download media for message ${msg.id._serialized}:`, mediaErr.message);
          // Don't fail the whole request, just mark that media failed
          formatted.mediaError = 'Failed to download media';
        }
      }
      
      return formatted;
    }));
    
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

// POST /send - Send message
app.post('/send', authMiddleware, async (req, res) => {
  try {
    const { chatId, message, to, media, caption } = req.body;
    
    // Support both chatId and to parameters
    const targetChatId = chatId || to;
    const messageText = message || caption || '';
    
    if (!targetChatId) {
      return res.status(400).json({ error: 'Missing chatId or to parameter' });
    }
    
    console.log(`[send] Sending ${media ? 'media' : 'text'} message to ${targetChatId}`);
    if (media) {
      console.log(`[send] Media URL: ${media}`);
    }
    if (messageText) {
      console.log(`[send] Message: "${messageText.substring(0, 50)}..."`);
    }
    
    // Try to find chat in loaded chats
    let chat = chats.find(c => c.id._serialized === targetChatId);
    if (!chat) {
      console.warn(`[send] Chat not found in loaded chats. Will try to send to number directly. Available chats: ${chats.length}`);
      
      // Try to send to the number directly
      if (!client || !sessionReady) {
        console.error('[send] Client not ready');
        return res.status(503).json({ error: 'WhatsApp client not connected' });
      }
      
      try {
        const { MessageMedia } = require('whatsapp-web.js');
        
        if (media) {
          // Download media from URL and send
          console.log(`[send] Downloading media from: ${media}`);
          const mediaData = await MessageMedia.fromUrl(media);
          const sentMessage = await client.sendMessage(targetChatId, mediaData, { caption: messageText });
          console.log(`[send] Media message sent successfully: ${sentMessage.id._serialized}`);
        } else if (messageText) {
          const sentMessage = await client.sendMessage(targetChatId, messageText);
          console.log(`[send] Text message sent successfully: ${sentMessage.id._serialized}`);
        } else {
          return res.status(400).json({ error: 'No message or media provided' });
        }
        
        return res.json({ 
          success: true, 
          message: 'Message sent'
        });
      } catch (sendErr) {
        console.error('[send] Failed to send via client:', sendErr.message);
        return res.status(400).json({ 
          error: sendErr.message,
          details: 'Failed to send message. Chat may not exist.'
        });
      }
    }
    
    // Check if client is ready
    if (!client || !sessionReady) {
      console.error('[send] Client not ready');
      return res.status(503).json({ error: 'WhatsApp client not connected' });
    }
    
    // Send the message with error handling
    try {
      if (media) {
        // Send media message
        const { MessageMedia } = require('whatsapp-web.js');
        
        console.log(`[send] Downloading media from: ${media}`);
        const mediaData = await MessageMedia.fromUrl(media);
        const sentMessage = await chat.sendMessage(mediaData, { caption: messageText });
        console.log(`[send] Media message sent successfully: ${sentMessage.id._serialized}`);
        
        res.json({ 
          success: true, 
          message: 'Media message sent',
          messageId: sentMessage.id._serialized
        });
      } else if (messageText) {
        // Send text message
        const sentMessage = await chat.sendMessage(messageText);
        console.log(`[send] Text message sent successfully: ${sentMessage.id._serialized}`);
        
        res.json({ 
          success: true, 
          message: 'Message sent',
          messageId: sentMessage.id._serialized
        });
      } else {
        return res.status(400).json({ error: 'No message or media provided' });
      }
    } catch (sendErr) {
      console.error('[send] Failed to send message:', sendErr.message);
      // Return 503 if it's a connection issue, 400 for other errors
      const statusCode = sendErr.message.includes('disconnect') ? 503 : 400;
      res.status(statusCode).json({ 
        error: sendErr.message,
        details: 'Failed to send message. Please try again.'
      });
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
      const statusCode = sendErr.message.includes('disconnect') ? 503 : 400;
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

// Health check
app.get('/health', (req, res) => {
  res.json({ ok: true, port: PORT });
});

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
