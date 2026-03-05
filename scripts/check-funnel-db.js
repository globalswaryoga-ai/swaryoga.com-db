const { MongoClient } = require('mongodb');

(async () => {
  const client = new MongoClient('mongodb+srv://swarsakshi9_db_user:hZnGhuVUNoew0Gje@swaryogadb.dheqmu1.mongodb.net/');
  await client.connect();
  const db = client.db('swaryoga_admin_crm');
  
  // Check funnel_configs
  const fconfigs = await db.collection('funnel_configs').find({}).toArray();
  console.log('=== FUNNEL CONFIGS ===');
  console.log('Count:', fconfigs.length);
  fconfigs.forEach(c => {
    console.log('ID:', c._id, 'Name:', c.name, 'Stages:', c.stages?.length);
    if (c.stages) c.stages.forEach(s => console.log('  -', s.key, s.name, 'order:', s.order));
  });
  
  // Check crm_user_settings
  const settings = await db.collection('crm_user_settings').find({}).toArray();
  console.log('\n=== CRM_USER_SETTINGS ===');
  console.log('Count:', settings.length);
  settings.forEach(s => {
    const cfLen = s.chatFunnels ? Object.keys(s.chatFunnels).length : 0;
    const clLen = s.chatLabels ? Object.keys(s.chatLabels).length : 0;
    console.log('userId:', s.userId);
    console.log('  chatFunnels entries:', cfLen);
    console.log('  chatLabels entries:', clLen);
    console.log('  labelPresets:', s.labelPresets ? s.labelPresets.length : 0);
    if (cfLen > 0) {
      const entries = Object.entries(s.chatFunnels).slice(0, 3);
      console.log('  sample:', JSON.stringify(entries));
    }
  });
  
  await client.close();
  process.exit(0);
})().catch(e => { console.error(e.message); process.exit(1); });
