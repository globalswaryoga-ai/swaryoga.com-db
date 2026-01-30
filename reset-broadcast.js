require('dotenv').config({ path: '.env.local' });
const { MongoClient } = require('mongodb');

(async () => {
  const client = new MongoClient(process.env.MONGODB_URI_MAIN);
  await client.connect();
  const db = client.db('swaryoga_admin_crm');
  
  // Get the broadcast run
  const run = await db.collection('broadcast_runs').findOne({ name: /30.*6:13/ });
  console.log('Run ID:', run._id);
  console.log('Current stats:', run.stats);
  
  // Reset all messages to pending
  const resetResult = await db.collection('broadcast_run_messages').updateMany(
    { runId: run._id },
    { 
      $set: { 
        status: 'pending', 
        failureReason: null, 
        sentAt: null,
        deliveredAt: null,
        readAt: null,
        waMessageId: null,
        updatedAt: new Date()
      } 
    }
  );
  console.log('Reset messages:', resetResult.modifiedCount);
  
  // Set scheduled time to tomorrow 7:00 AM IST (1:30 AM UTC)
  const tomorrow7am = new Date();
  tomorrow7am.setDate(tomorrow7am.getDate() + 1);
  tomorrow7am.setUTCHours(1, 30, 0, 0); // 1:30 AM UTC = 7:00 AM IST
  
  // Update run status and stats
  await db.collection('broadcast_runs').updateOne(
    { _id: run._id },
    {
      $set: {
        status: 'scheduled',
        scheduledAt: tomorrow7am,
        'stats.pending': 138,
        'stats.sent': 0,
        'stats.delivered': 0,
        'stats.read': 0,
        'stats.failed': 0,
        'stats.skipped': 0,
        updatedAt: new Date()
      },
      $unset: { startedAt: 1, completedAt: 1 }
    }
  );
  console.log('Updated run - scheduled for:', tomorrow7am.toISOString(), '(7 AM IST)');
  
  // Verify
  const updated = await db.collection('broadcast_runs').findOne({ _id: run._id });
  console.log('\nUpdated stats:', updated.stats);
  console.log('New status:', updated.status);
  console.log('Scheduled at:', updated.scheduledAt);
  
  await client.close();
  console.log('\n✅ Done! All 138 messages reset to pending and scheduled for tomorrow 7 AM IST');
})();
