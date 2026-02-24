/**
 * Add recent global members (Feb 20-23, 2026) to swar-yoga-l1 community
 * These are people who filled the swar-yoga-l1 form but only ended up in global.
 * Run with --dry-run to preview, without to execute.
 */
require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

const DRY_RUN = process.argv.includes('--dry-run');

(async () => {
  await mongoose.connect(process.env.MONGODB_URI_MAIN);
  const col = mongoose.connection.db.collection('communitymembers');
  
  const cutoff = new Date('2026-02-04');
  const recentGlobal = await col.find({ communityId: 'global', joinedAt: { $gte: cutoff } }).sort({ joinedAt: -1 }).toArray();
  
  console.log(`Found ${recentGlobal.length} recent global members since ${cutoff.toISOString().slice(0,10)}`);
  
  let added = 0, skipped = 0;
  for (const m of recentGlobal) {
    // Normalize mobile: strip leading 91 if > 10 digits, also check with 91
    const mobile10 = m.mobile.startsWith('91') && m.mobile.length > 10 ? m.mobile.slice(2) : m.mobile;
    
    // Check if already in swar-yoga-l1 (by either mobile format)
    const existsExact = await col.findOne({ communityId: 'swar-yoga-l1', mobile: m.mobile });
    const exists10 = !existsExact ? await col.findOne({ communityId: 'swar-yoga-l1', mobile: mobile10 }) : null;
    
    if (existsExact || exists10) {
      console.log(`  SKIP: ${m.name} (${m.mobile}) — already in swar-yoga-l1`);
      skipped++;
      continue;
    }
    
    if (DRY_RUN) {
      console.log(`  WOULD ADD: ${m.name} (${m.mobile}) joined global ${m.joinedAt?.toISOString?.().slice(0,10)}`);
    } else {
      await col.insertOne({
        name: m.name,
        email: m.email || null,
        mobile: m.mobile,
        countryCode: m.countryCode || '+91',
        country: m.country || '',
        userId: m.userId,
        communityId: 'swar-yoga-l1',
        communityName: 'Swar Yoga L-1',
        status: 'active',
        approved: false, // Pending approval like other L1 members
        joinedAt: m.joinedAt || new Date(),
        chatEnabled: true,
        chatPermissions: { canSend: true, allowText: true, allowLinks: true, allowImages: true, allowVideos: true, allowDocuments: true },
        messageCount: 0,
        reactions: 0,
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      console.log(`  ✅ ADDED: ${m.name} (${m.mobile}) to swar-yoga-l1`);
    }
    added++;
  }
  
  console.log(`\nDone! ${DRY_RUN ? 'Would add' : 'Added'}: ${added}, Skipped: ${skipped}`);
  
  // Final count
  const l1Count = await col.countDocuments({ communityId: 'swar-yoga-l1' });
  console.log(`swar-yoga-l1 total members: ${l1Count}`);
  
  await mongoose.disconnect();
})();
