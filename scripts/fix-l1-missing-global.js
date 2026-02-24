require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

(async () => {
  await mongoose.connect(process.env.MONGODB_URI_MAIN);
  const col = mongoose.connection.db.collection('communitymembers');
  
  const l1Members = await col.find({ communityId: 'swar-yoga-l1' }).toArray();
  let added = 0;
  for (const m of l1Members) {
    const inGlobal = await col.findOne({ communityId: 'global', mobile: m.mobile });
    if (!inGlobal) {
      await col.insertOne({
        name: m.name, email: m.email || null, mobile: m.mobile,
        countryCode: m.countryCode || '+91', country: m.country || '',
        userId: m.userId, communityId: 'global', communityName: 'Global Community',
        status: 'active', approved: true, joinedAt: m.joinedAt || new Date(),
        chatEnabled: true,
        chatPermissions: { canSend: true, allowText: true, allowLinks: true, allowImages: true, allowVideos: true, allowDocuments: true },
        messageCount: 0, reactions: 0, metadata: {}, createdAt: new Date(), updatedAt: new Date(),
      });
      console.log('Added to global:', m.name, m.mobile);
      added++;
    }
  }
  console.log('Total added to global:', added);
  await mongoose.disconnect();
})();
