const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

async function main() {
  await mongoose.connect(process.env.MONGODB_URI_MAIN);
  const db = mongoose.connection.db;
  
  // Check actual createdAt dates
  const users = await db.collection('users').find({ isAdmin: { $ne: true } })
    .project({ name: 1, createdAt: 1 }).sort({ createdAt: 1 }).limit(5).toArray();
  console.log('Earliest users:');
  for (const u of users) console.log(`  ${u.name} — ${u.createdAt}`);
  
  const latest = await db.collection('users').find({ isAdmin: { $ne: true } })
    .project({ name: 1, createdAt: 1 }).sort({ createdAt: -1 }).limit(5).toArray();
  console.log('\nLatest users:');
  for (const u of latest) console.log(`  ${u.name} — ${u.createdAt}`);
  
  // Count by year
  const byYear = await db.collection('users').aggregate([
    { $match: { isAdmin: { $ne: true } } },
    { $group: { _id: { $year: '$createdAt' }, count: { $sum: 1 } } },
    { $sort: { _id: 1 } }
  ]).toArray();
  console.log('\nUsers by year:', byYear);
  
  await mongoose.disconnect();
}
main().catch(console.error);
