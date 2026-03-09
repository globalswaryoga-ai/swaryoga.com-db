/**
 * Backfill Legacy WhatsApp Messages
 * 
 * Tags all messages in whatsapp_messages that don't have bridgeUserId/ownerId
 * with 'admincrm' (the super admin), since they were created by the admin's session.
 * 
 * This ensures legacy data only shows for the admin, not for new users.
 * 
 * Usage: node scripts/backfill-message-owners.js
 */
const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

async function backfill() {
  await mongoose.connect(process.env.MONGODB_URI_MAIN);
  const crm = mongoose.connection.useDb('swaryoga_admin_crm');

  const col = crm.collection('whatsapp_messages');
  
  // Count legacy messages (without bridgeUserId or ownerId)
  const legacyCount = await col.countDocuments({
    $or: [
      { bridgeUserId: { $exists: false } },
      { ownerId: { $exists: false } },
    ]
  });

  console.log(`Found ${legacyCount} legacy messages without owner tags`);
  
  if (legacyCount === 0) {
    console.log('Nothing to backfill');
    await mongoose.disconnect();
    return;
  }

  // Tag them all with admincrm (the super admin who owned them)
  const result = await col.updateMany(
    {
      $or: [
        { bridgeUserId: { $exists: false } },
        { ownerId: { $exists: false } },
      ]
    },
    {
      $set: {
        bridgeUserId: 'admincrm',
        ownerId: 'admincrm',
      }
    }
  );

  console.log(`Updated ${result.modifiedCount} messages with bridgeUserId/ownerId = 'admincrm'`);
  
  // Verify
  const remainingLegacy = await col.countDocuments({
    bridgeUserId: { $exists: false }
  });
  console.log(`Remaining untagged messages: ${remainingLegacy}`);
  
  const totalByOwner = await col.aggregate([
    { $group: { _id: '$bridgeUserId', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]).toArray();
  console.log('\nMessages by owner:');
  totalByOwner.forEach(g => console.log(`  ${g._id || '(none)'}: ${g.count}`));

  await mongoose.disconnect();
}

backfill().catch(e => { console.error(e); process.exit(1); });
