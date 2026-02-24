require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

(async () => {
  await mongoose.connect(process.env.MONGODB_URI_MAIN);
  const col = mongoose.connection.db.collection('communitymembers');
  
  // Get swar-yoga-l1 members' mobiles
  const l1Members = await col.find({ communityId: 'swar-yoga-l1' }).toArray();
  const l1Mobiles = new Set(l1Members.map(m => m.mobile));
  
  // Get global members
  const globalMembers = await col.find({ communityId: 'global' }).sort({ joinedAt: -1 }).toArray();
  
  console.log(`Global members: ${globalMembers.length}`);
  console.log(`swar-yoga-l1 members: ${l1Members.length}`);
  
  // Find global members NOT in swar-yoga-l1
  const notInL1 = globalMembers.filter(m => !l1Mobiles.has(m.mobile));
  console.log(`\nGlobal members NOT in swar-yoga-l1: ${notInL1.length}`);
  
  // Show recent global joins (last 30 or so)
  console.log('\nRecent 30 global members:');
  globalMembers.slice(0, 30).forEach(m => {
    const inL1 = l1Mobiles.has(m.mobile) ? '✅ in L1' : '❌ NOT in L1';
    console.log(`  ${m.name.padEnd(25)} ${m.mobile.padEnd(15)} ${m.joinedAt?.toISOString?.().slice(0,10) || '?'} ${inL1}`);
  });
  
  await mongoose.disconnect();
})();
