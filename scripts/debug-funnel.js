const { MongoClient } = require('mongodb');

(async () => {
  const client = new MongoClient('mongodb+srv://swarsakshi9_db_user:hZnGhuVUNoew0Gje@swaryogadb.dheqmu1.mongodb.net/');
  await client.connect();
  const db = client.db('swaryoga_admin_crm');

  // Check funnel_configs
  const configs = await db.collection('funnel_configs').find({}).toArray();
  console.log('=== FUNNEL CONFIGS ===');
  console.log('Count:', configs.length);
  if (configs.length > 0) {
    const c = configs[0];
    console.log('ID:', c._id);
    console.log('Name:', c.name);
    console.log('Active:', c.isActive);
    console.log('Stages:', c.stages?.length);
    if (c.stages) {
      c.stages.forEach((s, i) => console.log(`  ${i}: key=${s.key} name="${s.name}" order=${s.order} color=${s.color}`));
    }
  } else {
    console.log('NO FUNNEL CONFIG EXISTS - will be auto-created on first GET');
  }

  // Check sample leads
  const leads = await db.collection('leads').find({}).limit(10).project({ name: 1, funnelStage: 1, labels: 1 }).toArray();
  console.log('\n=== SAMPLE LEADS (first 10) ===');
  leads.forEach(l => console.log(`  ${l.name} | funnelStage: ${l.funnelStage || '(none)'} | labels: ${JSON.stringify(l.labels || [])}`));

  // Count leads by funnelStage
  const stages = await db.collection('leads').aggregate([
    { $group: { _id: '$funnelStage', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]).toArray();
  console.log('\n=== FUNNEL STAGE DISTRIBUTION ===');
  stages.forEach(s => console.log(`  ${s._id || '(null/empty)'}: ${s.count}`));

  // Check labels distribution
  const labelAgg = await db.collection('leads').aggregate([
    { $unwind: '$labels' },
    { $group: { _id: '$labels', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 20 }
  ]).toArray();
  console.log('\n=== LABEL DISTRIBUTION (top 20) ===');
  labelAgg.forEach(l => console.log(`  ${l._id}: ${l.count}`));

  // Total leads
  const totalLeads = await db.collection('leads').countDocuments();
  console.log('\nTotal leads:', totalLeads);

  await client.close();
})().catch(e => { console.error(e.message); process.exit(1); });
