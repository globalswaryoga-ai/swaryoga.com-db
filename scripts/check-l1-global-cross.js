require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

(async () => {
  await mongoose.connect(process.env.MONGODB_URI_MAIN);
  const col = mongoose.connection.db.collection('communitymembers');
  
  // Get swar-yoga-l1 members
  const l1Members = await col.find({ communityId: 'swar-yoga-l1' }).toArray();
  
  console.log('=== swar-yoga-l1 members and their global status ===');
  for (const m of l1Members) {
    // Check if they're also in global (by mobile)
    const inGlobal = await col.findOne({ communityId: 'global', mobile: m.mobile });
    // Also check with 91 prefix
    const inGlobal91 = !inGlobal ? await col.findOne({ communityId: 'global', mobile: '91' + m.mobile }) : null;
    // Also check without 91 prefix
    const mobileWithout91 = m.mobile.startsWith('91') && m.mobile.length > 10 ? m.mobile.slice(2) : null;
    const inGlobalWithout91 = !inGlobal && !inGlobal91 && mobileWithout91 ? await col.findOne({ communityId: 'global', mobile: mobileWithout91 }) : null;
    
    const globalMatch = inGlobal || inGlobal91 || inGlobalWithout91;
    console.log(`  ${m.name.padEnd(30)} mobile: ${m.mobile.padEnd(15)} → Global: ${globalMatch ? '✅ YES' : '❌ NO (mobile format mismatch?)'}`);
  }
  
  // Find recent global members (last 20 days) - these might be from L1 form
  console.log('\n=== Recent global members (last 20 days) ===');
  const cutoff = new Date('2026-02-04');
  const recentGlobal = await col.find({ communityId: 'global', joinedAt: { $gte: cutoff } }).sort({ joinedAt: -1 }).toArray();
  console.log(`Count: ${recentGlobal.length}`);
  
  for (const m of recentGlobal) {
    const inL1 = await col.findOne({ communityId: 'swar-yoga-l1', mobile: m.mobile });
    const mobile10 = m.mobile.startsWith('91') && m.mobile.length > 10 ? m.mobile.slice(2) : m.mobile;
    const inL1Alt = !inL1 ? await col.findOne({ communityId: 'swar-yoga-l1', mobile: mobile10 }) : null;
    const match = inL1 || inL1Alt;
    console.log(`  ${m.name.padEnd(30)} mobile: ${m.mobile.padEnd(15)} joined: ${m.joinedAt?.toISOString?.().slice(0,10)} → L1: ${match ? '✅' : '❌ NOT in L1'}`);
  }
  
  await mongoose.disconnect();
})();
