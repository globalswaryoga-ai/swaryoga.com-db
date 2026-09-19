const fs = require('fs');
const path = './app/api/admin/crm/whatsapp/qr-bridge/route.ts';
let code = fs.readFileSync(path, 'utf8');

// Replace QrMsg/QrChat inside /send webhook block
const webhookBlockRegex = /try \{\n\s*const QrMsg = getQrWhatsAppMessage\(\);\n\s*const QrChat = getQrWhatsAppChat\(\);[\s\S]*?\}\n\s*\}/g;
code = code.replace(webhookBlockRegex, `try {
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
        }`);

// Replace WaMsg update block
const waMsgBlockRegex = /try \{\n\s*const WaMsg = getWhatsAppMessage\(\);[\s\S]*?\}\n\s*\}/g;
code = code.replace(waMsgBlockRegex, `try {
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
          }`);

// Replace the GET chats lead filtering blocks
const getChatsLeadRegex = /const Lead = getLead\(\);[\s\S]*?const leads = await Promise\.race\(\[[\s\S]*?\}\) as any;/g;
code = code.replace(getChatsLeadRegex, `const placeholders = Array.from(allPhonesToQuery).map(() => '?').join(',');
          const leadsRs = await bunnyExecute({
            sql: \`SELECT data_json FROM leads_sql WHERE json_extract(data_json, '$.phoneNumber') IN (\${placeholders})\`,
            args: Array.from(allPhonesToQuery)
          });
          const leads = leadsRs.rows.map(r => JSON.parse(String(r.data_json)));`);
          
const getChatsLeadRegex2 = /const Lead = getLead\(\);[\s\S]*?const leads = await Promise\.race\(\[[\s\S]*?\}\) as any\[\];/g;
code = code.replace(getChatsLeadRegex2, `const placeholders = Array.from(allPhonesToQuery).map(() => '?').join(',');
          const leadsRs = await bunnyExecute({
            sql: \`SELECT data_json FROM leads_sql WHERE json_extract(data_json, '$.phoneNumber') IN (\${placeholders})\`,
            args: Array.from(allPhonesToQuery)
          });
          const leads = leadsRs.rows.map(r => JSON.parse(String(r.data_json)));`);

const getChatsLeadRegex3 = /const Lead = getLead\(\);[\s\S]*?const leads = await Lead\.find\([\s\S]*?\}\)\.lean\(\);/g;
code = code.replace(getChatsLeadRegex3, `const placeholders = Array.from(allPhonesToQuery).map(() => '?').join(',');
          const leadsRs = await bunnyExecute({
            sql: \`SELECT data_json FROM leads_sql WHERE json_extract(data_json, '$.phoneNumber') IN (\${placeholders})\`,
            args: Array.from(allPhonesToQuery)
          });
          const leads = leadsRs.rows.map(r => JSON.parse(String(r.data_json)));`);

// Replace QrMsg.find inside GET /messages
const getMessagesRegex = /const QrMsg = getQrWhatsAppMessage\(\);[\s\S]*?const dbMessages = await QrMsg\.find\([\s\S]*?\.lean\(\);/g;
code = code.replace(getMessagesRegex, `const { listBunnyQrMessages } = await import('@/lib/bunnyQrRepository');
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
