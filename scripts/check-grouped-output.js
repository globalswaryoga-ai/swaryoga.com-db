const jwt = require('jsonwebtoken');
const http = require('http');
require('dotenv').config({ path: '.env.local' });

const secret = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const token = jwt.sign({ userId: 'test', isAdmin: true }, secret, { expiresIn: '1h' });

function fetch(type) {
  return new Promise((resolve, reject) => {
    const req = http.get(`http://localhost:3000/api/tally/reports?type=${type}&fy=2023-24`, {
      headers: { Authorization: `Bearer ${token}` }
    }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve(JSON.parse(data)));
    });
    req.on('error', reject);
  });
}

(async () => {
  // Check P&L grouped output
  const pl = await fetch('profit-loss');
  const d = pl.data;
  console.log('=== P&L GROUPED OUTPUT ===\n');

  if (d.incomeByGroup) {
    console.log('INCOME BY GROUP:');
    for (const [group, items] of Object.entries(d.incomeByGroup)) {
      const total = items.reduce((s, i) => s + i.amount, 0);
      console.log(`  ${group} (${items.length} ledgers, total: ${total})`);
      for (const item of items) {
        console.log(`    - ${item.ledgerName}: ${item.amount}`);
      }
    }
  } else {
    console.log('  NO incomeByGroup returned!');
  }

  if (d.expensesByGroup) {
    console.log('\nEXPENSES BY GROUP:');
    for (const [group, items] of Object.entries(d.expensesByGroup)) {
      const total = items.reduce((s, i) => s + i.amount, 0);
      console.log(`  ${group} (${items.length} ledgers, total: ${total})`);
      for (const item of items) {
        console.log(`    - ${item.ledgerName}: ${item.amount}`);
      }
    }
  } else {
    console.log('  NO expensesByGroup returned!');
  }

  // Check BS grouped output
  const bs = await fetch('balance-sheet');
  const b = bs.data;
  console.log('\n=== BS GROUPED OUTPUT ===\n');

  if (b.assetsByGroup) {
    console.log('ASSETS BY GROUP:');
    for (const [group, items] of Object.entries(b.assetsByGroup)) {
      console.log(`  ${group} (${items.length} ledgers)`);
      for (const item of items) console.log(`    - ${item.ledgerName}: ${item.amount}`);
    }
  }

  if (b.liabilitiesByGroup) {
    console.log('\nLIABILITIES BY GROUP:');
    for (const [group, items] of Object.entries(b.liabilitiesByGroup)) {
      console.log(`  ${group} (${items.length} ledgers)`);
      for (const item of items) console.log(`    - ${item.ledgerName}: ${item.amount}`);
    }
  }

  if (b.capitalBySubGroup) {
    console.log('\nCAPITAL BY GROUP:');
    for (const [group, items] of Object.entries(b.capitalBySubGroup)) {
      console.log(`  ${group} (${items.length} ledgers)`);
      for (const item of items) console.log(`    - ${item.ledgerName}: ${item.amount}`);
    }
  }
})();
