const fs = require('fs');
const path = './app/api/admin/crm/whatsapp/qr-bridge/route.ts';
let code = fs.readFileSync(path, 'utf8');

// 1. Replace isLeadOwnedByUser
const isLeadStart = code.indexOf('async function isLeadOwnedByUser(');
const isLeadEnd = code.indexOf('async function extractPhoneFromPath(');
if (isLeadStart !== -1 && isLeadEnd !== -1) {
  code = code.substring(0, isLeadStart) + `async function isLeadOwnedByUser(phone: string, userId: string, isOwnBridge = false): Promise<boolean> {
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

/**
 * Extract phone from a bridge path like /messages/919309986820@s.whatsapp.net
 * or /contact-about/919309986820@s.whatsapp.net
 */
` + code.substring(isLeadEnd);
}

// 2. Replace queueCol block
const queueBlockStart = code.indexOf("const queueDb = mongoose.connection.getClient()");
const queueBlockEnd = code.indexOf("await queueCol.insertOne({") + "await queueCol.insertOne({".length;
if (queueBlockStart !== -1) {
  code = code.replace(
    /const queueDb = mongoose\.connection\.getClient\(\)\.db\(.*?\);\n\s*const queueCol = queueDb\.collection\('qr_message_queue'\);\n\s*await queueCol\.insertOne\(\{/g,
    `// Queue fallback to BunnyDB
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
        const __dummy = ({`
  );
}

// 3. Replace QrMsg/QrChat updates in webhooks
code = code.replace(
  /try \{\n\s*const QrMsg = getQrWhatsAppMessage\(\);\n\s*const QrChat = getQrWhatsAppChat\(\);[\s\S]*?\}\n\s*\}/g,
  `try {
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
        }`
);

// 4. Replace WaMsg updates
code = code.replace(
  /try \{\n\s*const WaMsg = getWhatsAppMessage\(\);[\s\S]*?\}\n\s*\}/g,
  `try {
            const data = {
              userId,
              connectedPhone: resolved.storedPhone,
              chatJid: toJid.includes('@') ? toJid : \`\${toJid.replace(/\\D/g, '')}@s.whatsapp.net\`,
              messageId: msgId,
              direction: 'outbound',
              status: 0,
              timestamp: Date.now(),
              lastMessage: body.message || body.text || 'Media',
              conversationTimestamp: Date.now()
            };
            await upsertBunnyQrMessage(data);
            await upsertBunnyQrChat(data);
          } catch (dbErr) {
            console.error('[QR Bridge] Failed to save queued message to Bunny DB:', dbErr);
          }`
);

// 5. Replace /chats lead queries
code = code.replace(
  /const Lead = getLead\(\);[\s\S]*?const leads = await Lead\.find\([\s\S]*?\}\)\.lean\(\);/g,
  `const placeholders = Array.from(allPhonesToQuery).map(() => '?').join(',');
          const leadsRs = await bunnyExecute({
            sql: \`SELECT data_json FROM leads_sql WHERE json_extract(data_json, '$.phoneNumber') IN (\${placeholders})\`,
            args: Array.from(allPhonesToQuery)
          });
          const leads = leadsRs.rows.map(r => JSON.parse(String(r.data_json)));`
);

// 6. Replace GET /messages query
const msgStart = code.indexOf('const QrMsg = getQrWhatsAppMessage();');
if (msgStart !== -1) {
  code = code.replace(
    /const QrMsg = getQrWhatsAppMessage\(\);[\s\S]*?const dbMessages = await QrMsg\.find\([\s\S]*?\.lean\(\);/g,
    `let cutoffSeconds = 0;
          if (resolved.phoneChangedAt) {
            cutoffSeconds = Math.floor(new Date(resolved.phoneChangedAt).getTime() / 1000);
          }
          const dbMessages = await listBunnyQrMessages({
            userId,
            connectedPhone,
            chatJid,
            limit: 200,
            before: cutoffSeconds > 0 ? cutoffSeconds : undefined
          });`
  );
}

// 7. Replace getMongoSessionChats
const getChatsStart = code.indexOf('async function getMongoSessionChats(');
const getChatsEnd = code.indexOf('function mergeBridgeAndMongoChats(');
if (getChatsStart !== -1 && getChatsEnd !== -1) {
  code = code.substring(0, getChatsStart) + `async function getMongoSessionChats(userId: string, connectedPhone: string) {
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
` + code.substring(getChatsEnd + 'function mergeBridgeAndMongoChats('.length - 34); // Hacky length offset
}

// 8. Replace syncMongoSessionChats
const syncChatsStart = code.indexOf('async function syncMongoSessionChats(');
const syncChatsEnd = code.indexOf('function decodePathFully(');
if (syncChatsStart !== -1 && syncChatsEnd !== -1) {
  code = code.substring(0, syncChatsStart) + `async function syncMongoSessionChats(userId: string, connectedPhone: string, chats: any[]) {
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

function decodePathFully(` + code.substring(syncChatsEnd + 'function decodePathFully('.length);
}

// 9. Replace isChatAllowedInCurrentSession
const isChatAllowedStart = code.indexOf('async function isChatAllowedInCurrentSession(');
const isChatAllowedEnd = code.indexOf('// ============================================');
if (isChatAllowedStart !== -1 && isChatAllowedEnd !== -1) {
  code = code.substring(0, isChatAllowedStart) + `async function isChatAllowedInCurrentSession(userId: string, connectedPhone: string, chatJid: string): Promise<boolean> {
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

` + code.substring(isChatAllowedEnd);
}

fs.writeFileSync(path, code);
