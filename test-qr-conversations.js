require('dotenv').config({ path: '.env.local' });
const { MongoClient } = require('mongodb');

const uri = process.env.MONGODB_URI_MAIN;

(async () => {
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db('swaryoga_admin_crm');
  
  // Replicate the conversations API pipeline for QR
  const pipeline = [
    // Match QR messages
    { $match: { provider: { $in: ['whatsapp_qr', 'whatsapp_web_bridge'] } } },
    
    // Add normalized time
    {
      $addFields: {
        _messageTime: {
          $ifNull: ['$updatedAt', { $ifNull: ['$sentAt', { $ifNull: ['$createdAt', new Date(0)] }] }]
        }
      }
    },
    
    // Sort by most recent
    { $sort: { _messageTime: -1 } },
    
    // Group by phoneNumber
    {
      $group: {
        _id: '$phoneNumber',
        leadId: { $first: '$leadId' },
        lastMessageAt: { $first: '$_messageTime' },
        lastMessageContent: { $first: '$messageContent' },
        lastDirection: { $first: '$direction' },
        lastStatus: { $first: '$status' },
        phoneNumber: { $first: '$phoneNumber' },
        unreadCount: {
          $sum: {
            $cond: [
              { $and: [
                { $eq: ['$direction', 'inbound'] },
                { $ne: ['$status', 'read'] },
                { $ne: ['$isRead', true] }
              ]},
              1, 0
            ]
          }
        }
      }
    },
    
    // Sort grouped results
    { $sort: { lastMessageAt: -1 } },
    
    // Limit
    { $limit: 20 }
  ];
  
  const conversations = await db.collection('whatsapp_messages').aggregate(pipeline).toArray();
  
  console.log('QR Conversations found:', conversations.length);
  console.log('\nConversations:');
  conversations.forEach(c => {
    console.log(`- ${c.phoneNumber} | ${c.lastDirection} | ${c.lastMessageContent?.substring(0,30)} | unread: ${c.unreadCount}`);
  });
  
  await client.close();
})();
