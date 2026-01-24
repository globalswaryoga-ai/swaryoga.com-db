#!/usr/bin/env node
/**
 * Test the CRM Conversations API
 * This should return all conversations with messages
 */

const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI_MAIN;
const DB_NAME = process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm';

async function main() {
  console.log('\n📱 TEST CRM CONVERSATIONS AGGREGATION\n');
  console.log('='.repeat(60));
  
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db(DB_NAME);
  
  const messagesCollection = db.collection('whatsapp_messages');
  
  // Simulate the conversations API aggregation
  const pipeline = [
    // Default provider filter (meta + legacy)
    {
      $match: {
        $or: [
          { provider: { $in: ['meta', 'whatsapp_web_bridge', 'whatsapp_qr'] } },
          { provider: { $exists: false } },
          { provider: null },
        ],
      },
    },
    // Add normalized timestamp
    {
      $addFields: {
        _messageTime: {
          $ifNull: ['$updatedAt', { $ifNull: ['$sentAt', { $ifNull: ['$createdAt', new Date(0)] }] }],
        },
      },
    },
    // Sort by most recent
    { $sort: { _messageTime: -1 } },
    // Group by phone number
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
              { 
                $and: [
                  { $eq: ['$direction', 'inbound'] }, 
                  { $ne: ['$status', 'read'] },
                ] 
              },
              1,
              0,
            ],
          },
        },
        totalMessages: { $sum: 1 },
      },
    },
    // Join with leads
    {
      $lookup: {
        from: 'leads',
        localField: 'phoneNumber',
        foreignField: 'phoneNumber',
        as: 'lead',
      },
    },
    { $unwind: { path: '$lead', preserveNullAndEmptyArrays: true } },
    // Project useful fields
    {
      $project: {
        _id: 1,
        phoneNumber: 1,
        leadId: 1,
        leadName: { $ifNull: ['$lead.name', 'Unknown'] },
        leadStatus: { $ifNull: ['$lead.status', 'unknown'] },
        lastMessageAt: 1,
        lastMessageContent: { $substr: ['$lastMessageContent', 0, 50] },
        lastDirection: 1,
        unreadCount: 1,
        totalMessages: 1,
      },
    },
    // Sort by recent activity
    { $sort: { lastMessageAt: -1 } },
    // Limit for testing
    { $limit: 20 },
  ];
  
  const conversations = await messagesCollection.aggregate(pipeline).toArray();
  
  console.log(`\nFound ${conversations.length} conversations:\n`);
  
  for (const conv of conversations) {
    const unreadBadge = conv.unreadCount > 0 ? ` [${conv.unreadCount} unread]` : '';
    const direction = conv.lastDirection === 'inbound' ? '⬅️' : '➡️';
    const date = new Date(conv.lastMessageAt).toLocaleDateString('en-IN');
    console.log(`${direction} ${conv.phoneNumber} | ${conv.leadName} | ${date}${unreadBadge}`);
    console.log(`   Last: "${conv.lastMessageContent}..." (${conv.totalMessages} msgs)`);
    console.log('');
  }
  
  await client.close();
  console.log('='.repeat(60));
  console.log('Done!');
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
