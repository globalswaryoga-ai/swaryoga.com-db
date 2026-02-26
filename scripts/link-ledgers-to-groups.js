/**
 * Auto-connect ledgers to groups by matching ledger.subGroup to group.name
 * Sets groupId on each ledger for FY 2023-24
 */
const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

(async () => {
  const c = await MongoClient.connect(process.env.MONGODB_URI_MAIN);
  const db = c.db(process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm');
  const FY = '2023-24';

  // 1. Load all groups for this FY
  const groups = await db.collection('acc_groups').find({ financialYear: FY }).toArray();
  const groupMap = {};
  for (const g of groups) {
    groupMap[g.name] = g._id;
  }
  console.log(`Groups loaded: ${groups.length}`);
  console.log('Group names:', Object.keys(groupMap).join(', '));

  // 2. Load all ledgers for this FY
  const ledgers = await db.collection('acc_ledgers').find({ financialYear: FY, isActive: true }).toArray();
  console.log(`\nLedgers to connect: ${ledgers.length}`);

  let linked = 0;
  let alreadyLinked = 0;
  let noMatch = 0;

  for (const l of ledgers) {
    if (l.groupId) {
      alreadyLinked++;
      console.log(`  [SKIP] ${l.name} — already linked to groupId: ${l.groupId}`);
      continue;
    }

    const matchName = l.subGroup;
    if (!matchName) {
      noMatch++;
      console.log(`  [WARN] ${l.name} — no subGroup set, cannot auto-link`);
      continue;
    }

    const matchedGroupId = groupMap[matchName];
    if (!matchedGroupId) {
      noMatch++;
      console.log(`  [WARN] ${l.name} — subGroup "${matchName}" not found in acc_groups`);
      continue;
    }

    await db.collection('acc_ledgers').updateOne(
      { _id: l._id },
      { $set: { groupId: matchedGroupId } }
    );
    linked++;
    console.log(`  [OK] ${l.name} → group "${matchName}" (${matchedGroupId})`);
  }

  console.log(`\n=== RESULT ===`);
  console.log(`  Linked: ${linked}`);
  console.log(`  Already linked: ${alreadyLinked}`);
  console.log(`  No match: ${noMatch}`);
  console.log(`  Total: ${ledgers.length}`);

  // 3. Verify
  const afterCount = await db.collection('acc_ledgers').countDocuments({ financialYear: FY, isActive: true, groupId: { $exists: true, $ne: null } });
  console.log(`\nVerification: ${afterCount} / ${ledgers.length} ledgers now have groupId`);

  await c.close();
})();
