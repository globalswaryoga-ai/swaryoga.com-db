const fs = require('fs');
const path = './app/api/admin/crm/whatsapp/qr-bridge/route.ts';
let code = fs.readFileSync(path, 'utf8');

function replaceBlock(startStr, endStr, replacement) {
  const startIdx = code.indexOf(startStr);
  if (startIdx === -1) {
    console.error('Could not find start: ' + startStr.substring(0, 30));
    return;
  }
  const endIdx = code.indexOf(endStr, startIdx);
  if (endIdx === -1) {
    console.error('Could not find end: ' + endStr.substring(0, 30));
    return;
  }
  code = code.substring(0, startIdx) + replacement + code.substring(endIdx);
  console.log('Replaced block starting with: ' + startStr.substring(0, 30));
}

// 1. isLeadOwnedByUser
replaceBlock(
  'async function isLeadOwnedByUser(phone: string, userId: string, isOwnBridge = false): Promise<boolean> {',
  'async function extractPhoneFromPath(',
  `async function isLeadOwnedByUser(phone: string, userId: string, isOwnBridge = false): Promise<boolean> {
  if (!phone || phone.includes('-')) return true; // Group chats allowed
  if (phone.length < 10) return true; // Too short to be a real phone, let it pass
  
  try {
    const phonesToCheck = [phone];
    if (phone.startsWith('91') && phone.length === 12) {
      phonesToCheck.push(phone.substring(2));
    } else if (phone.length === 10) {
      phonesToCheck.push('91' + phone);
    }
    
    const placeholders = phonesToCheck.map(() => '?').join(',');
    const rs = await bunnyExecute({
      sql: \`SELECT data_json FROM leads_sql WHERE json_extract(data_json, '$.phoneNumber') IN (\${placeholders})\`,
      args: phonesToCheck
    });
    
    let lead = null;
    if (rs.rows.length > 0) {
      lead = JSON.parse(String(rs.rows[0].data_json || '{}'));
    }
    
    if (!lead) {
      if (isOwnBridge) {
        return true;
      }
      return false;
    }
    return lead.assignedToUserId === userId || lead.createdByUserId === userId;
  } catch (err) {
    if (isOwnBridge) return true;
    return false;
  }
}

`
);

// 2. getMongoSessionChats
replaceBlock(
  'async function getMongoSessionChats(userId: string, connectedPhone: string) {',
  'function mergeBridgeAndMongoChats(',
  `async function getMongoSessionChats(userId: string, connectedPhone: string) {
  if (!userId || !connectedPhone) return [];
  try {
    const docs = await listBunnyQrChats({ userId, connectedPhone, limit: 1000 });
    return docs.map((chat: any) => ({
      id: chat.chatJid,
      name: chat.name || chat.chatJid,
      isGroup: !!chat.isGroup,
      lastMessage: chat.lastMessage || '',
      lastMessageTime: chat.lastMessageTime ? new Date(chat.lastMessageTime).toISOString() : null,
      unreadCount: Number(chat.unreadCount || 0),
      conversationTimestamp: Number(chat.conversationTimestamp || 0),
      profilePicUrl: chat.profilePicUrl || '',
      pinned: !!chat.pinned,
      archived: !!chat.archived,
      metadata: chat.metadata || {},
    }));
  } catch (err) {
    console.error('[QR Bridge Proxy] Failed to load Bunny session chats:', err);
    return [];
  }
}

/**
 * Merge live bridge chats with the connectedPhone-scoped Mongo snapshot.
`
);

// 3. syncMongoSessionChats
replaceBlock(
  'async function syncMongoSessionChats(userId: string, connectedPhone: string, chats: any[]) {',
  'function decodePathFully(',
  `async function syncMongoSessionChats(userId: string, connectedPhone: string, chats: any[]) {
  if (!userId || !connectedPhone || !Array.isArray(chats)) return;
  try {
    for (const chat of chats) {
      if (!chat?.id) continue;
      const incomingTs = Number(chat.conversationTimestamp || 0);
      const incomingLastMessage = typeof chat.lastMessage === 'string' ? chat.lastMessage : (chat?.lastMessage?.body || '');
      const hasFreshPreview = incomingTs > 0 || Boolean(incomingLastMessage.trim());

      const data: any = {
        userId, connectedPhone, chatJid: chat.id,
        name: chat.name || chat.id,
        isGroup: !!chat.isGroup,
        unreadCount: Number(chat.unreadCount || 0),
        pinned: !!chat.pinned,
        archived: !!chat.archived,
        profilePicUrl: chat.profilePicUrl || '',
        metadata: chat.metadata || {}
      };
      if (hasFreshPreview) {
        data.lastMessage = incomingLastMessage;
        data.lastMessageTime = chat.lastMessageTime ? new Date(chat.lastMessageTime).toISOString() : undefined;
        data.lastMessageFromMe = !!chat.lastMessageFromMe;
        data.conversationTimestamp = incomingTs;
      }
      await upsertBunnyQrChat(data);
    }
  } catch (err) {
    console.error('[QR Bridge Proxy] Failed to sync Bunny session chats:', err);
  }
}

`
);

// 4. isChatAllowedInCurrentSession
replaceBlock(
  'async function isChatAllowedInCurrentSession(userId: string, connectedPhone: string, chatJid: string): Promise<boolean> {',
  '// ============================================',
  `async function isChatAllowedInCurrentSession(userId: string, connectedPhone: string, chatJid: string): Promise<boolean> {
  if (!userId || !connectedPhone || !chatJid) return false;
  try {
    const rs = await bunnyExecute({
      sql: 'SELECT 1 FROM qr_chats_sql WHERE user_id = ? AND connected_phone = ? AND chat_jid = ? LIMIT 1',
      args: [userId, connectedPhone, chatJid]
    });
    return rs.rows.length > 0;
  } catch (err) {
    return false;
  }
}

`
);

// 5. POST /send outbound webhook queue and logging
replaceBlock(
  "const queueDb = mongoose.connection.getClient().db(",
  "          // Save to queue — will auto-send at 5 AM",
  `        // Queue fallback to BunnyDB
        await bunnyExecute({
          sql: 'INSERT INTO qr_message_queue_sql (user_id, session_key, tenant_id, "to", message, type, url, status, send_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)',
          args: [
            userId,
            bridgeSessionId,
            resolved.tenantId || bridgeSessionId,
            body?.to || body?.chatId || body?.jid || '',
            body?.message || body?.text || body?.caption || '',
            body?.url || body?.media ? 'image' : 'text',
            body?.url || null,
            'pending',
            sendAt.toISOString()
          ]
        });
        const sendAtIST = new Date(sendAt.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
        const timeStr = \`\${String(sendAtIST.getHours()).padStart(2,'0')}:\${String(sendAtIST.getMinutes()).padStart(2,'0')} IST\`;
        console.log(\`[QR Bridge] ⏰ Message queued for \${timeStr}: \${body?.to}\`);
        return NextResponse.json({
          success: true,
          queued: true,
          sendAt: sendAt.toISOString(),
          message: \`📅 Message queued — will be sent at 5:00 AM IST (\${getCurrentISTTime()} now)\`,
        });
      } catch (qErr) {
        console.error('[QR Bridge] Failed to queue message:', qErr);
        return NextResponse.json({
          success: false,
          error: getQRTimeGuardError(),
          currentTime: getCurrentISTTime(),
        }, { status: 403 });
      }
    }

`
);

// 6. POST /send QrMsg/QrChat updates (Lines 1341-1375)
replaceBlock(
  "        // Log outbound message immediately for analytics/webhooks",
  "          if (livePhoneValidation.valid) {",
  `        // Log outbound message immediately for analytics/webhooks
        try {
          const rawChatJid = toJid.includes('@') ? toJid : \`\${toJid.replace(/\\D/g, '')}@s.whatsapp.net\`;
          const chatJid = normalizeJidFormat(rawChatJid);
          const nowSeconds = Math.floor(Date.now() / 1000);
          const persistedMessageId = sentMsgId || \`proxy-\${userId}-\${Date.now()}\`;
          const hasMedia = !!(body.url || body.media || body.hasMedia);
          const mediaUrl = String(body.cdnUrl || body.url || (typeof body.media === 'string' && body.media.startsWith('http') ? body.media : '') || '');
          const messageType = hasMedia ? (String(body.mimetype || '').startsWith('video/') ? 'video' : String(body.mimetype || '').startsWith('audio/') ? 'audio' : String(body.mimetype || '').startsWith('application/') ? 'document' : 'image') : 'text';
          
          const data = {
            userId,
            connectedPhone: resolved.storedPhone,
            chatJid,
            messageId: persistedMessageId,
            direction: 'outbound',
            fromMe: true,
            text: messageText,
            type: messageType,
            timestamp: nowSeconds,
            status: 1,
            hasMedia,
            mediaUrl,
            conversationTimestamp: nowSeconds
          };
          
          await upsertBunnyQrMessage(data);
          await upsertBunnyQrChat(data);
        } catch (dbErr) {
          console.error('[QR Bridge] Failed to save outbound message to Bunny DB:', dbErr);
        }
        
        // Also fire webhook for outbound message
        if (resolved.webhookUrl) {
          try {
            const rawChatJid = toJid.includes('@') ? toJid : \`\${toJid.replace(/\\D/g, '')}@s.whatsapp.net\`;
            const chatJid = normalizeJidFormat(rawChatJid);
            fetch(resolved.webhookUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                event: 'message_created',
                session: bridgeSessionId,
                data: {
                  id: sentMsgId || \`proxy-\${userId}-\${Date.now()}\`,
                  from: resolved.storedPhone + '@s.whatsapp.net',
                  to: chatJid,
                  author: resolved.storedPhone + '@s.whatsapp.net',
                  fromMe: true,
                  body: messageText,
                  timestamp: Math.floor(Date.now() / 1000),
                  hasMedia: !!(body.url || body.media || body.hasMedia)
                }
              })
            }).catch(() => {});
          } catch (e) {
            // Webhook errors shouldn't block the response
          }
        }
        
        // Return JSON from bridge response
        data = await res.json();
        
        // Trigger live validation to check if the session is still active
        // Only trigger this if we didn't just get a 401/403 (which already invalidated it)
`
);

// 7. GET /messages fallback (Line 1902-1925)
replaceBlock(
  "        // No messages from bridge, fallback to MongoDB cache",
  "          const filterNote = resolved.phoneChangedAt",
  `        // No messages from bridge, fallback to BunnyDB cache
        try {
          const toJid = String(body.to || body.chatId || body.jid || '').trim();
          const messageText = String(body.message || body.text || body.caption || '').trim();
          const sentMsgId = String(data?.messageId || data?.id || data?.key?.id || '').trim();
          if (toJid && (messageText || body.media || body.hasMedia)) {
            let cutoffSeconds = 0;
            if (resolved.phoneChangedAt) {
              cutoffSeconds = Math.floor(new Date(resolved.phoneChangedAt).getTime() / 1000);
            }
            const dbMessages = await listBunnyQrMessages({
              userId,
              connectedPhone,
              chatJid,
              limit: 200,
              before: cutoffSeconds > 0 ? cutoffSeconds : undefined
            });
            
`
);

// We need to also clean up the Mongoose imports
code = code.replace("import mongoose from 'mongoose';", "import { bunnyExecute } from '@/lib/bunnyDatabase';\nimport { upsertBunnyQrChat, upsertBunnyQrMessage, listBunnyQrChats, listBunnyQrMessages } from '@/lib/bunnyQrRepository';");
code = code.replace("import { getLead, getQrWhatsAppChat, getQrWhatsAppMessage, getWhatsAppMessage } from '@/lib/schemas/enterpriseSchemas';", "");

fs.writeFileSync(path, code);
