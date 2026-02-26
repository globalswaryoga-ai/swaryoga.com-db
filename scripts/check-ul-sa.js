const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

(async () => {
  const c = new MongoClient(process.env.MONGODB_URI_MAIN);
  await c.connect();
  const col = c.db('swaryoga_admin_crm').collection('tally_manual_balances');
  
  const sa = await col.find({ ledgerName: /Sundry Advance/i, financialYear: '2024-25' }).toArray();
  console.log('=== Sundry Advances entries ===');
  sa.forEach(e => console.log(e.ledgerName, ':', e.amount, e.drCr, e.category, e.parentGroup));
  
  const ul = await col.find({ parentGroup: 'Unsecured Loans', financialYear: '2024-25' }).toArray();
  console.log('\n=== Unsecured Loans ===');
  ul.forEach(e => console.log(e.ledgerName, ':', e.amount, e.drCr, e.category));
  
  console.log('\n=== BS QUICK CHECK ===');
  const all = await col.find({ financialYear: '2024-25' }).toArray();
  const assets = all.filter(e => e.category === 'asset');
  const liabs = all.filter(e => e.category === 'liability');
  let ta = 0; assets.forEach(e => ta += e.amount);
  let lCr = 0, lDr = 0;
  liabs.forEach(e => { if(e.drCr === 'Cr') lCr += e.amount; else lDr += e.amount; });
  console.log('Assets:', ta);
  console.log('Liab Cr:', lCr, '| Liab Dr:', lDr, '| Net:', lCr - lDr);
  console.log('Diff:', ta - (lCr - lDr));
  
  await c.close();
})();
