const fs = require('fs');
const path = './app/api/admin/crm/whatsapp/qr-bridge/route.ts';
let code = fs.readFileSync(path, 'utf8');

// 1. Add imports at the top
code = code.replace("import mongoose from 'mongoose';", "import { bunnyExecute } from '@/lib/bunnyDatabase';\nimport { upsertBunnyQrChat, upsertBunnyQrMessage, listBunnyQrChats, listBunnyQrMessages } from '@/lib/bunnyQrRepository';");
code = code.replace("import { getLead, getQrWhatsAppChat, getQrWhatsAppMessage, getWhatsAppMessage } from '@/lib/schemas/enterpriseSchemas';", "");

// 2. getMongoSessionChats
code = code.replace(`async function getMongoSessionChats(userId: string, connectedPhone: string) {
  if (!userId || !connectedPhone) return [];

  try {
    const QrChat = getQrWhatsAppChat();
    const docs = await QrChat.find({ userId, connectedPhone })
      .sort({ conversationTimestamp: -1, lastMessageTime: -1, createdAt: -1 })
      .limit(1000)
      .lean();

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
    console.error('[QR Bridge Proxy] Failed to load Mongo session chats:', err);
    return [];
  }
}`, `async function getMongoSessionChats(userId: string, connectedPhone: string) {
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
}`);

// 3. syncMongoSessionChats
const syncMongoOld = `        const set: Record<string, any> = {
          userId,
          connectedPhone,
          chatJid: chat.id,
          name: chat.name || chat.id,
          isGroup: !!chat.isGroup,
          unreadCount: Number(chat.unreadCount || 0),
          pinned: !!chat.pinned,
          archived: !!chat.archived,
          profilePicUrl: chat.profilePicUrl || '',
          metadata: chat.metadata || {},
        };
        if (hasFreshPreview) {
          set.lastMessage = incomingLastMessage;
          set.lastMessageTime = chat.lastMessageTime ? new Date(chat.lastMessageTime) : undefined;
          set.lastMessageFromMe = !!chat.lastMessageFromMe;
          set.conversationTimestamp = incomingTs;
        }

        return {
          updateOne: {
            filter: { userId, connectedPhone, chatJid: chat.id },
            update: {
              $set: set,
              $setOnInsert: { createdAt: new Date() },
            },
            upsert: true,
          },
        };
      });

    if (ops.length > 0) {
      await QrChat.bulkWrite(ops, { ordered: false });
    }`;
const syncMongoNew = `        const data: any = {
          userId,
          connectedPhone,
          chatJid: chat.id,
          name: chat.name || chat.id,
          isGroup: !!chat.isGroup,
          unreadCount: Number(chat.unreadCount || 0),
          pinned: !!chat.pinned,
          archived: !!chat.archived,
          profilePicUrl: chat.profilePicUrl || '',
          metadata: chat.metadata || {},
        };
        if (hasFreshPreview) {
          data.lastMessage = incomingLastMessage;
          data.lastMessageTime = chat.lastMessageTime ? new Date(chat.lastMessageTime).toISOString() : undefined;
          data.lastMessageFromMe = !!chat.lastMessageFromMe;
          data.conversationTimestamp = incomingTs;
        }
        
        await upsertBunnyQrChat(data);
        return null;
      });`;
code = code.replace(syncMongoOld, syncMongoNew);
code = code.replace("const QrChat = getQrWhatsAppChat();\n", "");

// 4. isChatAllowedInCurrentSession
code = code.replace(`async function isChatAllowedInCurrentSession(userId: string, connectedPhone: string, chatJid: string): Promise<boolean> {
  if (!userId || !connectedPhone || !chatJid) return false;

  try {
    const QrChat = getQrWhatsAppChat();
    const exists = await QrChat.exists({ userId, connectedPhone, chatJid });
    return !!exists;
  } catch (err) {
    console.error('[QR Bridge Proxy] Failed to verify current-session chat access:', err);
    return false;
  }
}`, `async function isChatAllowedInCurrentSession(userId: string, connectedPhone: string, chatJid: string): Promise<boolean> {
  if (!userId || !connectedPhone || !chatJid) return false;

  try {
    const rs = await bunnyExecute({
      sql: 'SELECT 1 FROM qr_chats_sql WHERE user_id = ? AND connected_phone = ? AND chat_jid = ? LIMIT 1',
      args: [userId, connectedPhone, chatJid]
    });
    return rs.rows.length > 0;
  } catch (err) {
    console.error('[QR Bridge Proxy] Failed to verify current-session chat access:', err);
    return false;
  }
}`);

// 5. isLeadOwnedByUser
code = code.replace(`    const Lead = getLead();
    const phonesToCheck = [phone];
    if (phone.startsWith('91') && phone.length === 12) {
      phonesToCheck.push(phone.substring(2));
    } else if (phone.length === 10) {
      phonesToCheck.push('91' + phone);
    }
    
    const lead = await Lead.findOne(
      { phoneNumber: { $in: phonesToCheck } },
      { assignedToUserId: 1, createdByUserId: 1 }
    ).lean() as any;`, `    const phonesToCheck = [phone];
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
    }`);

// 6. Queue
code = code.replace(`        const queueDb = mongoose.connection.getClient().db(process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm');
        const queueCol = queueDb.collection('qr_message_queue');
        await queueCol.insertOne({
          userId,
          sessionKey: bridgeSessionId,
          tenantId: resolved.tenantId || bridgeSessionId,
          to: body?.to || body?.chatId || body?.jid || '',
          message: body?.message || body?.text || body?.caption || '',
          type: body?.url || body?.media ? 'image' : 'text', // simplification
          url: body?.url || null,
          status: 'pending',
          sendAt: sendAt.toISOString(),
          createdAt: new Date(),
        });`, `        await bunnyExecute({
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
        });`);

// 7. POST /send QrMsg/QrChat log
code = code.replace(`        try {
          const QrMsg = getQrWhatsAppMessage();
          const QrChat = getQrWhatsAppChat();
          
          const rawChatJid = toJid.includes('@') ? toJid : \`\${toJid.replace(/\\D/g, '')}@s.whatsapp.net\`;
          const chatJid = normalizeJidFormat(rawChatJid);
          const nowSeconds = Math.floor(Date.now() / 1000);
          const persistedMessageId = sentMsgId || \`proxy-\${userId}-\${Date.now()}\`;
          
          const hasMedia = !!(body.url || body.media || body.hasMedia);
          const mediaUrl = String(body.cdnUrl || body.url || (typeof body.media === 'string' && body.media.startsWith('http') ? body.media : '') || '');
          const messageType = hasMedia ? (String(body.mimetype || '').startsWith('video/') ? 'video' : String(body.mimetype || '').startsWith('audio/') ? 'audio' : String(body.mimetype || '').startsWith('application/') ? 'document' : 'image') : 'text';

          await QrMsg.updateOne(
            { userId, connectedPhone: resolved.storedPhone, chatJid, messageId: persistedMessageId },
            {
              $set: {
                direction: 'outbound',
                fromMe: true,
                text: messageText,
                type: messageType,
                timestamp: nowSeconds,
                status: 1, // Sent
                hasMedia,
                mediaUrl,
                conversationTimestamp: nowSeconds
              },
              $setOnInsert: { createdAt: new Date() }
            },
            { upsert: true }
          );

          await QrChat.updateOne(
            { userId, connectedPhone: resolved.storedPhone, chatJid },
            {
              $set: {
                lastMessage: messageText || 'Media',
                lastMessageTime: new Date(),
                lastMessageFromMe: true,
                conversationTimestamp: nowSeconds
              }
            },
            { upsert: true }
          );
        } catch (dbErr) {`, `        try {
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
        } catch (dbErr) {`);

// 8. /chats leads fetch
code = code.replace(`        try {
          const Lead = getLead();
          // Extract all phone numbers from chat IDs and build both formats
          const rawPhones = chats.map((c: any) => {
            const idStr = typeof c.id === 'string' ? c.id : (c.id?._serialized || '');
            return idStr.split('@')[0];
          }).filter((p: string) => p && !p.includes('-')); // Skip group chats

          // Build lookup with both 91-prefixed and raw formats
          const allPhonesToQuery = new Set<string>();
          for (const phone of rawPhones) {
            allPhonesToQuery.add(phone);
            if (phone.startsWith('91') && phone.length === 12) {
              allPhonesToQuery.add(phone.substring(2));
            } else if (phone.length === 10) {
              allPhonesToQuery.add('91' + phone);
            }
          }

          const leads = await Lead.find(
            { phoneNumber: { $in: Array.from(allPhonesToQuery) } },
            { phoneNumber: 1, fullName: 1, companyName: 1, assignedToUserId: 1, createdByUserId: 1 }
          ).lean();`, `        try {
          // Extract all phone numbers from chat IDs and build both formats
          const rawPhones = chats.map((c: any) => {
            const idStr = typeof c.id === 'string' ? c.id : (c.id?._serialized || '');
            return idStr.split('@')[0];
          }).filter((p: string) => p && !p.includes('-')); // Skip group chats

          // Build lookup with both 91-prefixed and raw formats
          const allPhonesToQuery = new Set<string>();
          for (const phone of rawPhones) {
            allPhonesToQuery.add(phone);
            if (phone.startsWith('91') && phone.length === 12) {
              allPhonesToQuery.add(phone.substring(2));
            } else if (phone.length === 10) {
              allPhonesToQuery.add('91' + phone);
            }
          }

          const placeholders = Array.from(allPhonesToQuery).map(() => '?').join(',');
          const leadsRs = await bunnyExecute({
            sql: \`SELECT data_json FROM leads_sql WHERE json_extract(data_json, '$.phoneNumber') IN (\${placeholders})\`,
            args: Array.from(allPhonesToQuery)
          });
          const leads = leadsRs.rows.map(r => JSON.parse(String(r.data_json)));`);

// 9. Webhook /messages queued fallback WaMsg
code = code.replace(`          try {
            const WaMsg = getWhatsAppMessage();
            await WaMsg.updateOne(
              { userId, connectedPhone: resolved.storedPhone, chatJid: toJid.includes('@') ? toJid : \`\${toJid.replace(/\\D/g, '')}@s.whatsapp.net\`, messageId: msgId },
              {
                $set: { direction: 'outbound', status: 0, timestamp: Date.now(), lastMessage: body.message || body.text || 'Media', conversationTimestamp: Date.now() },
                $setOnInsert: { createdAt: new Date() }
              },
              { upsert: true }
            );
          } catch (dbErr) {`, `          try {
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
          } catch (dbErr) {`);

// 10. GET /messages MongoDB fallback query
code = code.replace(`        try {
          const QrMsg = getQrWhatsAppMessage();
          
          let cutoffSeconds = 0;
          if (resolved.phoneChangedAt) {
            cutoffSeconds = Math.floor(new Date(resolved.phoneChangedAt).getTime() / 1000);
          }

          // We use the same filter structure as standard CRM messages route
          const query: any = { userId, connectedPhone, chatJid };
          if (cutoffSeconds > 0) {
            query.timestamp = { $gte: cutoffSeconds };
          }

          const dbMessages = await QrMsg.find(query)
            .sort({ timestamp: -1, _id: -1 })
            .limit(200)
            .lean();`, `        try {
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
          });`);

fs.writeFileSync(path, code);
