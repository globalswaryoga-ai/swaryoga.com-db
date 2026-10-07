import { loadEnvConfig } from '@next/env';
loadEnvConfig(process.cwd());
import { bunnyExecute } from './lib/bunnyDatabase';

async function run() {
  const res = await bunnyExecute(`SELECT id, form_data, email FROM form_submissions WHERE form_id = '18NZAYl-2pLr3arpopo0hTxVi2Jyd8iKUY6YApscnhv0'`);
  const subs = res.rows;
  
  const seen = new Set();
  const toDelete = [];
  
  for (const s of subs) {
    const key = s.form_data || s.email;
    if (seen.has(key)) {
      toDelete.push(s.id);
    } else {
      if (key) seen.add(key);
    }
  }
  
  console.log(`Found ${toDelete.length} duplicates out of ${subs.length}`);
  
  if (toDelete.length > 0) {
    const placeholders = toDelete.map(() => '?').join(',');
    await bunnyExecute({
      sql: `DELETE FROM form_submissions WHERE id IN (${placeholders})`,
      args: toDelete
    });
    console.log('Deleted duplicates');
  }
  
  await bunnyExecute(`UPDATE enquiry_forms SET submission_count = (SELECT COUNT(*) FROM form_submissions WHERE form_id = '18NZAYl-2pLr3arpopo0hTxVi2Jyd8iKUY6YApscnhv0') WHERE form_id = '18NZAYl-2pLr3arpopo0hTxVi2Jyd8iKUY6YApscnhv0'`);
}
run();
