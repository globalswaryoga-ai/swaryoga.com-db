const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

(async () => {
  const c = new MongoClient(process.env.MONGODB_URI_MAIN);
  await c.connect();
  const db = c.db('swaryogaDB');

  // Check posts
  const posts = await db.collection('communityposts').countDocuments({ communityId: 'swar-yoga' });
  const postsL1 = await db.collection('communityposts').countDocuments({ communityId: 'swar-yoga-l1' });
  console.log('Posts in swar-yoga:', posts);
  console.log('Posts in swar-yoga-l1:', postsL1);

  if (posts > 0) {
    const r = await db.collection('communityposts').updateMany(
      { communityId: 'swar-yoga' },
      { $set: { communityId: 'swar-yoga-l1' } }
    );
    console.log('Migrated ' + r.modifiedCount + ' posts to swar-yoga-l1');
  }

  // Check submissions in CRM DB
  const crmDb = c.db(process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm');
  const subs = await crmDb.collection('communitysubmissions').countDocuments({ communityId: 'swar-yoga' });
  console.log('Submissions in swar-yoga:', subs);
  if (subs > 0) {
    const r2 = await crmDb.collection('communitysubmissions').updateMany(
      { communityId: 'swar-yoga' },
      { $set: { communityId: 'swar-yoga-l1' } }
    );
    console.log('Migrated ' + r2.modifiedCount + ' submissions to swar-yoga-l1');
  }

  await c.close();
  console.log('Done!');
})();
