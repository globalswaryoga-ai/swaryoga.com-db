import { bunnyExecute } from '@/lib/bunnyDatabase';
import { upsertBunnyQrChat, upsertBunnyQrMessage, listBunnyQrChats, listBunnyQrMessages } from '@/lib/bunnyQrRepository';

export function getLead() {
  return {
    findOne: (filter: any) => ({
      lean: async () => {
        const phones = filter?.phoneNumber?.$in || [];
        if (!phones.length) return null;
        const placeholders = phones.map(() => '?').join(',');
        const rs = await bunnyExecute({
          sql: \`SELECT data_json FROM leads_sql WHERE json_extract(data_json, '$.phoneNumber') IN (\${placeholders})\`,
          args: phones
        });
        if (rs.rows.length > 0) return JSON.parse(String(rs.rows[0].data_json || '{}'));
        return null;
      }
    }),
    find: (filter: any) => ({
      lean: async () => {
        const phones = filter?.phoneNumber?.$in || [];
        if (!phones.length) return [];
        const placeholders = phones.map(() => '?').join(',');
        const rs = await bunnyExecute({
          sql: \`SELECT data_json FROM leads_sql WHERE json_extract(data_json, '$.phoneNumber') IN (\${placeholders})\`,
          args: phones
        });
        return rs.rows.map(r => JSON.parse(String(r.data_json || '{}')));
      }
    })
  };
}

export function getQrWhatsAppChat() {
  return {
    find: (filter: any) => ({
      sort: () => ({
        limit: () => ({
          lean: async () => {
            return listBunnyQrChats({ userId: filter.userId, connectedPhone: filter.connectedPhone, limit: 1000 });
          }
        })
      })
    }),
    exists: async (filter: any) => {
      const rs = await bunnyExecute({
        sql: 'SELECT 1 FROM qr_chats_sql WHERE user_id = ? AND connected_phone = ? AND chat_jid = ? LIMIT 1',
        args: [filter.userId, filter.connectedPhone, filter.chatJid]
      });
      return rs.rows.length > 0;
    },
    updateOne: async (filter: any, update: any) => {
      const set = update.$set || {};
      const data: any = {
        userId: filter.userId, connectedPhone: filter.connectedPhone, chatJid: filter.chatJid,
        name: filter.chatJid, isGroup: filter.chatJid?.includes('g.us'),
        ...set
      };
      await upsertBunnyQrChat(data);
    },
    bulkWrite: async (ops: any[]) => {
      for (const op of ops) {
        if (op?.updateOne) {
          const filter = op.updateOne.filter;
          const set = op.updateOne.update.$set || {};
          const data: any = {
            userId: filter.userId, connectedPhone: filter.connectedPhone, chatJid: filter.chatJid,
            ...set
          };
          await upsertBunnyQrChat(data);
        }
      }
    }
  };
}

export function getQrWhatsAppMessage() {
  return {
    find: (filter: any) => ({
      sort: () => ({
        limit: (limit: number) => ({
          lean: async () => {
            return listBunnyQrMessages({ 
              userId: filter.userId, connectedPhone: filter.connectedPhone, chatJid: filter.chatJid,
              limit: limit || 200, before: filter.timestamp?.$gte
            });
          }
        })
      })
    }),
    updateOne: async (filter: any, update: any) => {
      const set = update.$set || {};
      const data: any = {
        userId: filter.userId, connectedPhone: filter.connectedPhone, chatJid: filter.chatJid, messageId: filter.messageId,
        ...set
      };
      await upsertBunnyQrMessage(data);
    }
  };
}

export function getWhatsAppMessage() {
  return getQrWhatsAppMessage();
}

export const mongoose = {
  connection: {
    getClient: () => ({
      db: () => ({
        collection: () => ({
          insertOne: async (doc: any) => {
            await bunnyExecute({
              sql: 'INSERT INTO qr_message_queue_sql (user_id, session_key, tenant_id, "to", message, type, url, status, send_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)',
              args: [
                doc.userId, doc.sessionKey, doc.tenantId, doc.to, doc.message, doc.type || 'text', doc.url || null, doc.status || 'pending', doc.sendAt
              ]
            });
          }
        })
      })
    })
  }
};
