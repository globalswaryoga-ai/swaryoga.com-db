const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

async function check() {
  await mongoose.connect(process.env.MONGODB_URI_MAIN, { dbName: 'swaryoga_admin_crm' });
  const col = mongoose.connection.collection('tally_manual_balances');

  // Check FY 2024-25 capital & loan entries
  const entries = await col.find({ fy: '2024-25' }).toArray();
  
  console.log('=== ALL FY 2024-25 ENTRIES ===');
  for (const e of entries) {
    const cat = e.category || '';
    const sub = e.sub_category || '';
    console.log(`  ${e.particular} | ₹${e.closing_balance} | ${e.balance_type} | cat=${cat} | sub=${sub}`);
  }

  console.log('\n=== CAPITAL & LOAN ENTRIES ===');
  const capitalEntries = entries.filter(e => 
    (e.category || '').match(/capital|loans|reserves/i) || 
    (e.sub_category || '').match(/capital|loans|share/i) ||
    (e.particular || '').match(/capital|loan|share|invest/i)
  );
  for (const e of capitalEntries) {
    console.log(`  ${e.particular} | ₹${e.closing_balance} | ${e.balance_type} | cat=${e.category} | sub=${e.sub_category}`);
  }

  // Also check FY 2023-24 for comparison
  console.log('\n=== FY 2023-24 CAPITAL ENTRIES ===');
  const prev = await col.find({ fy: '2023-24' }).toArray();
  const prevCapital = prev.filter(e => 
    (e.category || '').match(/capital|loans|reserves/i) || 
    (e.sub_category || '').match(/capital|loans|share/i)
  );
  for (const e of prevCapital) {
    console.log(`  ${e.particular} | ₹${e.closing_balance} | ${e.balance_type} | cat=${e.category} | sub=${e.sub_category}`);
  }

  await mongoose.disconnect();
}
check();
