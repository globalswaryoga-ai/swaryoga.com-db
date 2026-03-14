#!/usr/bin/env node
require('dotenv').config({ path: '.env.local' });

const { MongoClient } = require('mongodb');

const SUPER_ADMIN_IDS = new Set(['admin', 'admincrm']);
const AUTH_COLLECTION = 'baileys_auth_state';
const CRM_DB_NAME = process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm';

function normalizePhone(value) {
  return String(value || '').replace(/\D/g, '');
}

function escapeRegex(input) {
  return String(input || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function main() {
  if (!process.env.MONGODB_URI_MAIN) {
    throw new Error('MONGODB_URI_MAIN is required');
  }

  const apply = process.argv.includes('--apply');
  const client = await MongoClient.connect(process.env.MONGODB_URI_MAIN);
  const db = client.db(CRM_DB_NAME);

  try {
    const settings = await db.collection('crm_user_settings').find(
      { qrConnectedPhoneNumber: { $exists: true, $ne: '' } },
      { projection: { userId: 1, qrConnectedPhoneNumber: 1, permanentTenantId: 1, updatedAt: 1 } }
    ).toArray();

    const byPhone = new Map();
    for (const row of settings) {
      const phone = normalizePhone(row.qrConnectedPhoneNumber);
      if (!phone) continue;
      if (!byPhone.has(phone)) byPhone.set(phone, []);
      byPhone.get(phone).push(row);
    }

    let groups = 0;
    for (const [phone, rows] of byPhone.entries()) {
      if (rows.length < 2) continue;
      groups += 1;

      const ordered = [...rows].sort((a, b) => {
        const aScore = SUPER_ADMIN_IDS.has(a.userId) ? 1 : 0;
        const bScore = SUPER_ADMIN_IDS.has(b.userId) ? 1 : 0;
        if (aScore !== bScore) return bScore - aScore;
        return new Date(a.updatedAt || 0).getTime() - new Date(b.updatedAt || 0).getTime();
      });

      const keeper = ordered[0];
      const contaminated = ordered.slice(1);

      console.log(`\nPHONE ${phone}`);
      console.log(`  keep  -> ${keeper.userId} (tenant=${keeper.permanentTenantId || '-'})`);

      for (const row of contaminated) {
        console.log(`  reset -> ${row.userId} (tenant=${row.permanentTenantId || '-'})`);
        if (!apply) continue;

        await db.collection('crm_user_settings').updateOne(
          { userId: row.userId },
          { $unset: { qrConnectedPhoneNumber: 1, qrPhoneChangedAt: 1 } }
        );

        const [chatResult, msgResult, authResult] = await Promise.all([
          db.collection('qr_whatsapp_chats').deleteMany({ userId: row.userId, connectedPhone: phone }),
          db.collection('qr_whatsapp_messages').deleteMany({ userId: row.userId, connectedPhone: phone }),
          db.collection(AUTH_COLLECTION).deleteMany({ key: { $regex: `^${escapeRegex(row.userId)}:` } }),
        ]);

        console.log(`           deleted chats=${chatResult.deletedCount || 0}, messages=${msgResult.deletedCount || 0}, authDocs=${authResult.deletedCount || 0}`);
      }
    }

    if (!groups) {
      console.log('No duplicate qrConnectedPhoneNumber contamination found.');
    } else if (!apply) {
      console.log('\nDry run only. Re-run with --apply to clean contaminated QR state.');
    }
  } finally {
    await client.close();
  }
}

main().catch((error) => {
  console.error('repair-qr-session-contamination failed:', error);
  process.exit(1);
});