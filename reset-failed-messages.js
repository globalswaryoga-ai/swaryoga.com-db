const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

async function resetFailedMessages() {
  const uri = process.env.MONGODB_URI_MAIN || process.env.MONGODB_URI;
  await mongoose.connect(uri);
  const crmDb = mongoose.connection.useDb('swaryoga_admin_crm');
  
  const runId = new mongoose.Types.ObjectId('697ca78979200d2a6a31e10d');
  
  // Update all failed messages back to pending so they can be retried
  const result = await crmDb.collection('broadcast_run_messages').updateMany(
    { 
      runId: runId,
      status: 'failed',
    },
    { 
      $set: { status: 'pending' },
      $unset: { failureReason: 1 }
    }
  );
  
  console.log('Reset failed messages to pending:', result.modifiedCount);
  
  // Also update the run stats
  const counts = await crmDb.collection('broadcast_run_messages').aggregate([
    { $match: { runId: runId } },
    { $group: { _id: '$status', count: { $sum: 1 } } }
  ]).toArray();
  
  console.log('Updated status counts:', counts);
  
  const statusMap = {};
  counts.forEach(s => { statusMap[s._id] = s.count; });
  
  await crmDb.collection('broadcast_runs').updateOne(
    { _id: runId },
    { 
      $set: { 
        status: 'scheduled',
        'stats.pending': statusMap.pending || 0,
        'stats.sent': statusMap.sent || 0,
        'stats.failed': statusMap.failed || 0,
        lastError: 'WhatsApp disconnected - please scan QR code to reconnect'
      } 
    }
  );
  
  console.log('Run status updated to scheduled');
  
  await mongoose.disconnect();
  console.log('Done!');
}

resetFailedMessages().catch(console.error);
