const fs = require('fs');
const path = './app/api/admin/crm/whatsapp/qr-bridge/route.ts';
let code = fs.readFileSync(path, 'utf8');

// Remove Mongoose imports
code = code.replace(/import mongoose from 'mongoose';\n/, '');
code = code.replace(/import \{ getLead, getQrWhatsAppChat, getQrWhatsAppMessage, getWhatsAppMessage \} from '@\/lib\/schemas\/enterpriseSchemas';\n/, '');
if (!code.includes('import { bunnyExecute }')) {
  code = code.replace(/import \{ NextRequest, NextResponse \} from 'next\/server';\n/, 
    "import { NextRequest, NextResponse } from 'next/server';\nimport { bunnyExecute } from '@/lib/bunnyDatabase';\nimport { upsertBunnyQrChat, upsertBunnyQrMessage, listBunnyQrChats } from '@/lib/bunnyQrRepository';\n");
}

// 1. isLeadOwnedByUser
const isLeadRegex = /async function isLeadOwnedByUser[\s\S]*?\} catch \(err\) \{[\s\S]*?return false; \/\/ Fail-safe: block on error for shared bridge\n  \}\n\}/;
code = code.replace(isLeadRegex, `async function isLeadOwnedByUser(phone: string, userId: string, isOwnBridge = false): Promise<boolean> {
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
}`);

// 2. getMongoSessionChats
const getMongoRegex = /async function getMongoSessionChats[\s\S]*?\} catch \(err\) \{\n    console\.error\('\[QR Bridge Proxy\] Failed to load Mongo session chats:', err\);\n    return \[\];\n  \}\n\}/;
code = code.replace(getMongoRegex, `async function getMongoSessionChats(userId: string, connectedPhone: string) {
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
const syncMongoRegex = /async function syncMongoSessionChats[\s\S]*?\} catch \(err\) \{\n    console\.error\('\[QR Bridge Proxy\] Failed to sync Mongo session chats:', err\);\n  \}\n\}/;
code = code.replace(syncMongoRegex, `async function syncMongoSessionChats(userId: string, connectedPhone: string, chats: any[]) {
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
}`);

// 4. isChatAllowedInCurrentSession
const isChatAllowedRegex = /async function isChatAllowedInCurrentSession[\s\S]*?\} catch \(err\) \{\n    console\.error\('\[QR Bridge Proxy\] Failed to verify current-session chat access:', err\);\n    return false;\n  \}\n\}/;
code = code.replace(isChatAllowedRegex, `async function isChatAllowedInCurrentSession(userId: string, connectedPhone: string, chatJid: string): Promise<boolean> {
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
}`);

// Replace queueCol usage
const queueDbRegex = /const queueDb = mongoose\.connection\.getClient\(\)\.db\(.*?\);\n\s*const queueCol = queueDb\.collection\('qr_message_queue'\);/g;
code = code.replace(queueDbRegex, `// Queue fallback to BunnyDB
        const queueDb = null;
        const queueCol = {
          insertOne: async (data: any) => {
            await bunnyExecute({
              sql: 'INSERT INTO qr_message_queue_sql (user_id, data_json, created_at) VALUES (?, ?, CURRENT_TIMESTAMP)',
              args: [data.userId, JSON.stringify(data)]
            });
          }
        };`);

// Replace /chats lead query block inside GET / POST response
const chatsLeadQueryRegex1 = /const Lead = getLead\(\);[\s\S]*?const leads = await Promise\.race\(\[[\s\S]*?\}\) as any;/g;
code = code.replace(chatsLeadQueryRegex1, `const placeholders = Array.from(allPhonesToQuery).map(() => '?').join(',');
          const leadsRs = await bunnyExecute({
            sql: \`SELECT data_json FROM leads_sql WHERE json_extract(data_json, '$.phoneNumber') IN (\${placeholders})\`,
            args: Array.from(allPhonesToQuery)
          });
          const leads = leadsRs.rows.map(r => JSON.parse(String(r.data_json)));`);

// Replace /chats lead query block inside the older GET response (wait, it might be same)
const chatsLeadQueryRegex2 = /const Lead = getLead\(\);[\s\S]*?const leads = await Lead\.find\([\s\S]*?\}\)\.lean\(\);/g;
code = code.replace(chatsLeadQueryRegex2, `const placeholders = Array.from(allPhonesToQuery).map(() => '?').join(',');
          const leadsRs = await bunnyExecute({
            sql: \`SELECT data_json FROM leads_sql WHERE json_extract(data_json, '$.phoneNumber') IN (\${placeholders})\`,
            args: Array.from(allPhonesToQuery)
          });
          const leads = leadsRs.rows.map(r => JSON.parse(String(r.data_json)));`);

// Replace QrMsg.updateOne and QrChat.updateOne inside POST /send and others
const webhookMsgUpdateRegex = /const WaMsg = getWhatsAppMessage\(\);[\s\S]*?new Promise\(\(_, r\) => setTimeout\(\(\) => r\(new Error\('Mongo timeout'\)\), 2000\)\)\n\s*\]\);/g;
// actually, since they were single calls, let's just globally replace QrMsg/QrChat/WaMsg
code = code.replace(/try {\n\s*const WaMsg = getWhatsAppMessage\(\);[\s\S]*?await Promise\.race\(\[\n\s*WaMsg\.updateOne\([\s\S]*?Mongo timeout'\)\), 2000\)\)\n\s*\]\);\n\s*\}/g, 
  `try {\n          const data = {\n            userId,\n            connectedPhone: resolved.storedPhone,\n            chatJid: targetPhone + '@s.whatsapp.net',\n            messageId: msgId,\n            direction: 'outbound',\n            status: 0,\n            timestamp: Date.now(),\n            lastMessage: body.message || body.text || 'Media',\n            conversationTimestamp: Date.now()\n          };\n          await upsertBunnyQrMessage(data);\n          await upsertBunnyQrChat(data);\n        }`);

fs.writeFileSync(path, code);
