const fs = require('fs');
const path = './app/api/admin/crm/whatsapp/qr-bridge/route.ts';
let code = fs.readFileSync(path, 'utf8');

// Replace queueCol (only replaces the first instance it finds, which is what we want)
code = code.replace(
  /const queueDb = mongoose\.connection\.getClient\(\)\.db\(.*?\);\n\s*const queueCol = queueDb\.collection\('qr_message_queue'\);\n\s*await queueCol\.insertOne\(\{/,
  `const { bunnyExecute } = await import('@/lib/bunnyDatabase');
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

// Replace POST /send QrMsg/QrChat
const postSendUpdate = /const WaMsg = getWhatsAppMessage\(\);\n\s*const QrChat = getQrWhatsAppChat\(\);[\s\S]*?\}\n\s*\}/;
code = code.replace(postSendUpdate, 
  `const { upsertBunnyQrChat, upsertBunnyQrMessage } = await import('@/lib/bunnyQrRepository');
          const rawChatJid = toJid.includes('@') ? toJid : \`\${toJid.replace(/\\D/g, '')}@s.whatsapp.net\`;
          const chatJid = normalizeJidFormat(rawChatJid);
          const nowSeconds = Math.floor(Date.now() / 1000);
          const persistedMessageId = sentMsgId || \`proxy-\${userId}-\${Date.now()}\`;
          const hasMedia = !!(body.url || body.media || body.hasMedia);
          const mediaUrl = String(body.cdnUrl || body.url || (typeof body.media === 'string' && body.media.startsWith('http') ? body.media : '') || '');
          const messageType = hasMedia ? (String(body.mimetype || '').startsWith('video/') ? 'video' : String(body.mimetype || '').startsWith('audio/') ? 'audio' : String(body.mimetype || '').startsWith('application/') ? 'document' : 'image') : 'text';
          
          const data = {
            userId, connectedPhone: resolved.storedPhone, chatJid, messageId: persistedMessageId,
            direction: 'outbound', fromMe: true, text: messageText, type: messageType,
            timestamp: nowSeconds, status: 1, hasMedia, mediaUrl, conversationTimestamp: nowSeconds
          };
          await upsertBunnyQrMessage(data);
          await upsertBunnyQrChat(data);
        } catch (dbErr) {
          console.error('[QR Bridge] Failed to save outbound message to Bunny DB:', dbErr);
        }`
);

// Replace WaMsg update 
const waMsgUpdate = /const WaMsg = getWhatsAppMessage\(\);\n\s*await WaMsg\.updateOne\([\s\S]*?\}\n\s*\}/;
code = code.replace(waMsgUpdate, 
  `const { upsertBunnyQrChat, upsertBunnyQrMessage } = await import('@/lib/bunnyQrRepository');
            const data = {
              userId, connectedPhone: resolved.storedPhone, chatJid: toJid.includes('@') ? toJid : \`\${toJid.replace(/\\D/g, '')}@s.whatsapp.net\`,
              messageId: msgId, direction: 'outbound', status: 0, timestamp: Date.now(),
              lastMessage: body.message || body.text || 'Media', conversationTimestamp: Date.now()
            };
            await upsertBunnyQrMessage(data);
            await upsertBunnyQrChat(data);
          } catch (dbErr) {
            console.error('[QR Bridge] Failed to save queued message to Bunny DB:', dbErr);
          }`
);

// Replace /chats lead queries
const leadChats = /const Lead = getLead\(\);\n\s*\/\/ Extract all phone numbers[\s\S]*?const leads = await Lead\.find\([\s\S]*?\}\)\.lean\(\);/g;
code = code.replace(leadChats, 
  `// Extract all phone numbers from chat IDs and build both formats
          const rawPhones = chats.map((c: any) => {
            const idStr = typeof c.id === 'string' ? c.id : (c.id?._serialized || '');
            return idStr.split('@')[0];
          }).filter((p: string) => p && !p.includes('-'));

          const allPhonesToQuery = new Set<string>();
          for (const phone of rawPhones) {
            allPhonesToQuery.add(phone);
            if (phone.startsWith('91') && phone.length === 12) allPhonesToQuery.add(phone.substring(2));
            else if (phone.length === 10) allPhonesToQuery.add('91' + phone);
          }

          const placeholders = Array.from(allPhonesToQuery).map(() => '?').join(',');
          const { bunnyExecute } = await import('@/lib/bunnyDatabase');
          const leadsRs = await bunnyExecute({
            sql: \`SELECT data_json FROM leads_sql WHERE json_extract(data_json, '$.phoneNumber') IN (\${placeholders})\`,
            args: Array.from(allPhonesToQuery)
          });
          const leads = leadsRs.rows.map(r => JSON.parse(String(r.data_json)));`
);

// Replace GET /messages
const getMessages = /const QrMsg = getQrWhatsAppMessage\(\);[\s\S]*?const dbMessages = await QrMsg\.find\([\s\S]*?\.lean\(\);/g;
code = code.replace(getMessages, 
  `const { listBunnyQrMessages } = await import('@/lib/bunnyQrRepository');
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
          });`
);

// Clean Mongoose imports
code = code.replace(/import mongoose from 'mongoose';\n/, "");
code = code.replace(/import \{ getLead, getQrWhatsAppChat, getQrWhatsAppMessage, getWhatsAppMessage \} from '@\/lib\/schemas\/enterpriseSchemas';\n/, "");

fs.writeFileSync(path, code);
