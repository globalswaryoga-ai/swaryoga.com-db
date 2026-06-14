const { MongoClient, ObjectId } = require('mongodb');
const uri = 'mongodb+srv://swarsakshidb:xHdfUaezvepGGC1H@mohandb.azcq243.mongodb.net/swarsakshiDB?retryWrites=true&w=majority&appName=MohanDB';
const OWNER_IDS = ['admin', 'admincrm'];

(async () => {
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db('swaryoga_admin_crm');
  const coll = db.collection('whatsapp_messages');

  const pipeline = [
    { $match: { provider: 'meta' } },
    { $addFields: { _messageTime: { $ifNull: ['$updatedAt', { $ifNull: ['$sentAt', { $ifNull: ['$createdAt', new Date(0)] }] }] } } },
    { $sort: { _messageTime: -1 } },
    { $group: {
        _id: '$phoneNumber',
        lastMessageAt: { $first: '$_messageTime' },
        phoneNumber: { $first: '$phoneNumber' },
        provider: { $first: '$provider' },
    }},
    { $addFields: { _normalizedPhone: '$phoneNumber' } },
    { $lookup: {
        from: 'leads',
        let: { msgPhone: '$_normalizedPhone' },
        pipeline: [
          { $match: { $expr: { $eq: ['$phoneNumber', '$$msgPhone'] } } },
          { $addFields: { _ownerRank: { $cond: [{ $in: ['$createdByUserId', OWNER_IDS] }, 0, 1] } } },
          { $sort: { _ownerRank: 1, createdAt: -1 } },
          { $limit: 1 },
        ],
        as: 'lead',
    }},
    { $unwind: { path: '$lead', preserveNullAndEmptyArrays: true } },
    { $addFields: {
        lead: {
          $cond: [
            { $or: [
                { $eq: ['$lead', null] },
                { $in: ['$lead.createdByUserId', [...OWNER_IDS, null]] },
                { $in: ['$lead.assignedToUserId', [...OWNER_IDS, null]] },
            ]},
            '$lead',
            null,
          ],
        },
    }},
  ];

  const rows = await coll.aggregate(pipeline).toArray();
  console.log(`Total conversations (meta): ${rows.length}`);
  const leaked = rows.filter(r => r.lead && r.lead.name && /gandhari/i.test(r.lead.name));
  console.log(`Rows still showing 'gandhari' name: ${leaked.length}`);
  for (const r of leaked.slice(0, 10)) console.log(JSON.stringify({ phone: r.phoneNumber, leadName: r.lead?.name, leadOwner: r.lead?.createdByUserId }));

  const anyForeign = rows.filter(r => r.lead && !OWNER_IDS.includes(r.lead.createdByUserId) && !OWNER_IDS.includes(r.lead.assignedToUserId) && r.lead.createdByUserId);
  console.log(`Rows with any non-owner lead leaking through: ${anyForeign.length}`);
  for (const r of anyForeign.slice(0, 10)) console.log(JSON.stringify({ phone: r.phoneNumber, leadName: r.lead?.name, createdBy: r.lead?.createdByUserId, assignedTo: r.lead?.assignedToUserId }));

  await client.close();
})().catch(e => { console.error(e); process.exit(1); });
