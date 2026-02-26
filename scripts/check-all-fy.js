const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

(async () => {
  const client = new MongoClient(process.env.MONGODB_URI_MAIN);
  await client.connect();
  const db = client.db('swaryoga_admin_crm');
  const all = await db.collection('tally_manual_balances').find({}).toArray();
  
  console.log('Total records:', all.length);
  const fys = [...new Set(all.map(a => a.financialYear))];
  console.log('FYs found:', fys);
  
  for (const fy of fys) {
    const count = all.filter(a => a.financialYear === fy).length;
    console.log('  ' + fy + ': ' + count + ' accounts');
  }
  
  const fy2425 = all.filter(a => a.financialYear === '2024-25');
  console.log('\n=== FY 2024-25 ACCOUNTS ===');
  for (const b of fy2425.sort((a,b) => (a.parentGroup||'').localeCompare(b.parentGroup||''))) {
    console.log(b.parentGroup + ' | ' + b.ledgerName + ' | ' + b.drCr + ' | Rs.' + b.amount);
  }
  
  console.log('\n=== Cash/Class/90000 related (all FYs) ===');
  for (const b of all) {
    const name = (b.ledgerName || '').toLowerCase();
    if (name.includes('cash') || name.includes('class') || b.amount === 90000) {
      console.log(b.financialYear + ' | ' + b.ledgerName + ' | ' + b.drCr + ' | ' + b.parentGroup + ' | Rs.' + b.amount);
    }
  }
  
  await client.close();
})();
