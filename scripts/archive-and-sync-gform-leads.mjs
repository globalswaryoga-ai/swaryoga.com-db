import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });
import { bunnyExecute } from '../lib/bunnyDatabase.ts';

const forms = [
  { name: 'Hindi', formId: '1x9gGYGX1U0C32M6i9i1XewJ6EwwELxaLQm68AEeuQXk', target: 179 },
  { name: 'Marathi', formId: '1MmdQkKm7FTNwfA-MrfV8VVzt9n3PXSYTiuWozPGAZD8', target: 149 },
  { name: 'English', formId: '18NZAYl-2pLr3arpopo0hTxVi2Jyd8iKUY6YApscnhv0', target: 159 }
];

async function main() {
  console.log('[Archive & Sync] Starting...');

  // 1. Ensure backup table exists and is populated
  await bunnyExecute({
    sql: `CREATE TABLE IF NOT EXISTS form_submissions_archived_batches (
      id TEXT PRIMARY KEY,
      form_id TEXT,
      name TEXT,
      mobile TEXT,
      email TEXT,
      gender TEXT,
      city TEXT,
      answers TEXT,
      payment_status TEXT,
      amount REAL,
      currency TEXT,
      created_at TEXT,
      form_data TEXT,
      source TEXT,
      raw_answers TEXT,
      lead_id TEXT,
      archived_at TEXT
    )`
  });

  const now = new Date().toISOString();

  for (const f of forms) {
    const res = await bunnyExecute({
      sql: 'SELECT * FROM form_submissions WHERE form_id = ? ORDER BY created_at ASC',
      args: [f.formId]
    });

    const total = res.rows.length;
    const toArchiveCount = total - f.target;
    if (toArchiveCount <= 0) {
      console.log(`[${f.name}] Already matches target ${f.target} (${total} rows). Skipping.`);
      continue;
    }

    const archiveRows = res.rows.slice(0, toArchiveCount);
    console.log(`[${f.name}] Archiving oldest ${archiveRows.length} rows...`);

    for (const r of archiveRows) {
      // Insert into archive table
      await bunnyExecute({
        sql: `INSERT OR REPLACE INTO form_submissions_archived_batches (
          id, form_id, name, mobile, email, gender, city, answers,
          payment_status, amount, currency, created_at, form_data, source, raw_answers, lead_id, archived_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          r.id, r.form_id, r.name, r.mobile, r.email, r.gender, r.city, r.answers,
          r.payment_status, r.amount, r.currency, r.created_at, r.form_data, r.source, r.raw_answers, r.lead_id, now
        ]
      });

      // Remove from active form_submissions table
      await bunnyExecute({
        sql: 'DELETE FROM form_submissions WHERE id = ?',
        args: [r.id]
      });
    }

    // Update google_form_sync_status
    await bunnyExecute({
      sql: `UPDATE google_form_sync_status 
            SET saved_count = ?, response_count = ?, status = 'success', last_success_at = ?, last_error = '' 
            WHERE form_id = ?`,
      args: [f.target, f.target, now, f.formId]
    });

    console.log(`[${f.name}] Done! Remaining active rows in form_submissions: ${total - archiveRows.length}`);
  }

  // 2. Final verification
  console.log('\n=== Final Counts in form_submissions ===');
  for (const f of forms) {
    const check = await bunnyExecute({
      sql: 'SELECT COUNT(*) as cnt FROM form_submissions WHERE form_id = ?',
      args: [f.formId]
    });
    console.log(`${f.name} (${f.formId}): ${check.rows[0].cnt} (Expected: ${f.target})`);
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
