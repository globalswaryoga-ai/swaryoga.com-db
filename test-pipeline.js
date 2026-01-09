const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

async function testPipeline() {
    try {
        const uri = process.env.MONGODB_URI_MAIN;
        await mongoose.connect(uri, { dbName: 'swaryoga_admin_crm' });
        
        const WhatsAppMessage = mongoose.connection.collection('whatsapp_messages');
        
        const pipeline = [
            { 
              $match: { 
                provider: { $in: ['meta', 'whatsapp_web_bridge'] }
              } 
            },
            { $sort: { sentAt: -1 } },
            {
              $group: {
                _id: '$leadId',
                lastMessageAt: { $first: '$sentAt' },
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
                          { $ne: ['$isRead', true] }
                        ] 
                      },
                      1,
                      0,
                    ],
                  },
                },
              },
            },
            {
              $lookup: {
                from: 'leads',
                localField: '_id',
                foreignField: '_id',
                as: 'lead',
              },
            },
            { $unwind: { path: '$lead', preserveNullAndEmptyArrays: true } },
            { $sort: { lastMessageAt: -1 } },
            { $limit: 5 }
        ];

        const results = await WhatsAppMessage.aggregate(pipeline).toArray();
        console.log('Pipeline Results:');
        results.forEach((r, i) => {
            console.log(`\n[${i+1}] Phone: ${r.phoneNumber}, LeadId: ${r._id}`);
            console.log(`    Last Message: ${r.lastMessageContent} (${r.lastDirection})`);
            console.log(`    Last Message At: ${r.lastMessageAt}`);
            console.log(`    Lead Found: ${!!r.lead}`);
            if (r.lead) {
                console.log(`    Lead Status: ${r.lead.status}, AssignedTo: ${r.lead.assignedToUserId}`);
            }
        });

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

testPipeline();
