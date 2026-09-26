import re

filepath = '/Users/mohankalburgi/swaryoga.com-db/app/api/admin/crm/whatsapp/qr-bridge/route.ts'
with open(filepath, 'r') as f:
    content = f.read()

# 1. Rename functions
content = content.replace('getMongoSessionChats', 'getBunnySessionChats')
content = content.replace('syncMongoSessionChats', 'syncBunnySessionChats')
content = content.replace('mergeBridgeAndMongoChats', 'mergeBridgeAndBunnyChats')

# 2. Replace qr_mongodb_fallback
content = content.replace('qr_mongodb_fallback', 'qr_bunnydb_fallback')

# 3. Replace MONGODB FALLBACK comments
content = content.replace('MONGODB FALLBACK', 'BUNNYDB FALLBACK')
content = content.replace('MongoDB fallback', 'BunnyDB fallback')
content = content.replace('MongoDB sync', 'BunnyDB sync')
content = content.replace('MongoDB:', 'BunnyDB:')

# 4. Remove the mongoose mock at the top
mongoose_mock = """const mongoose = {
  connection: {
    getClient: () => ({
      db: (dbName?: string) => ({
        collection: (colName?: string) => ({
          insertOne: async (doc: any) => {
            await bunnyExecute({
              sql: 'INSERT INTO qr_message_queue_sql (user_id, session_key, tenant_id, "to", message, type, url, status, send_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)',
              args: [doc.userId, doc.sessionKey, doc.tenantId, doc.to, doc.message, doc.type, doc.url, doc.status, doc.sendAt]
            });
          }
        })
      })
    })
  }
};"""
content = content.replace(mongoose_mock, '')

# 5. Fix the place where mongoose mock was used (around line 1049)
old_queue_insert = """        const queueDb = mongoose.connection.getClient().db(process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm');
        const queueCol = queueDb.collection('qr_message_queue');
        await queueCol.insertOne({
          userId: resolved.ownerUserId,
          sessionKey: sessionKey,
          tenantId: sessionKey,
          to: to,
          message: message,
          type: type || 'text',
          url: url || null,
          status: 'pending',
          sendAt: sendAt
        });"""

new_queue_insert = """        await bunnyExecute({
          sql: 'INSERT INTO qr_message_queue_sql (user_id, session_key, tenant_id, "to", message, type, url, status, send_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)',
          args: [resolved.ownerUserId, sessionKey, sessionKey, to, message, type || 'text', url || null, 'pending', sendAt]
        });"""

content = content.replace(old_queue_insert, new_queue_insert)

with open(filepath, 'w') as f:
    f.write(content)

print("Cleaned up Mongo references!")
