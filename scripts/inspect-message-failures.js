#!/usr/bin/env node
/**
 * Inspect whatsapp_messages failures in last 24 hours and summarize by provider/direction.
 */

require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

async function main() {
  const uri = process.env.MONGODB_URI_MAIN || process.env.MONGODB_URI;
  if (!uri) throw new Error('Missing MONGODB_URI_MAIN (or MONGODB_URI)');

  await mongoose.connect(uri);
  try {
    const adminDb = mongoose.connection.useDb('swaryoga_admin_crm');
    const start = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const breakdown = await adminDb
      .collection('whatsapp_messages')
      .aggregate([
        { $match: { createdAt: { $gte: start } } },
        {
          $group: {
            _id: {
              status: '$status',
              provider: '$provider',
              direction: '$direction',
            },
            n: { $sum: 1 },
          },
        },
        { $sort: { n: -1 } },
        { $limit: 50 },
      ])
      .toArray();

    console.log('\n📊 whatsapp_messages last 24h breakdown (top 50):');
    for (const row of breakdown) {
      console.log(`- ${row.n} × status=${row._id.status ?? 'undefined'} provider=${row._id.provider ?? 'undefined'} direction=${row._id.direction ?? 'undefined'}`);
    }

    const failures = await adminDb
      .collection('whatsapp_messages')
      .find({ status: 'failed', createdAt: { $gte: start } })
      .sort({ createdAt: -1 })
      .limit(20)
      .toArray();

    console.log(`\n❌ Latest failed messages (max 20): ${failures.length}`);
    for (const m of failures) {
      console.log(`\n- ${m.createdAt?.toISOString?.() || m.createdAt} | provider=${m.provider || 'undefined'} direction=${m.direction || 'undefined'} phone=${m.phoneNumber || 'n/a'}`);
      console.log(`  content: ${(m.messageContent || '').slice(0, 120)}`);
      if (m.error || m.metaError || m.failureReason) {
        console.log(`  error: ${JSON.stringify(m.error || m.metaError || m.failureReason).slice(0, 400)}`);
      }
    }
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((err) => {
  console.error('❌ inspect-message-failures failed');
  console.error(err);
  process.exitCode = 1;
});
