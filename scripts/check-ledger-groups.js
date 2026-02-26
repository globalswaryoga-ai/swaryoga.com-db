const m = require('mongoose');
require('dotenv').config({ path: '.env.local' });

(async () => {
  await m.connect(process.env.MONGODB_URI_MAIN);
  const db = m.connection.useDb('swaryoga_admin_crm');

  const ledgers = await db.collection('acc_ledgers').find({ financialYear: '2024-25' }).toArray();
  console.log('FY 2024-25 Ledgers:', ledgers.length);

  const byGroup = {};
  ledgers.forEach(l => {
    const g = l.group || 'NONE';
    byGroup[g] = byGroup[g] || [];
    byGroup[g].push(l.name);
  });

  for (const [group, names] of Object.entries(byGroup)) {
    console.log('\n=== GROUP:', group, '===');
    names.forEach(n => console.log(' -', n));
  }

  await m.disconnect();
})();
