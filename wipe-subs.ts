import { loadEnvConfig } from '@next/env';
loadEnvConfig(process.cwd());
import { bunnyExecute } from './lib/bunnyDatabase';

async function run() {
  await bunnyExecute(`DELETE FROM form_submissions WHERE form_id = '18NZAYl-2pLr3arpopo0hTxVi2Jyd8iKUY6YApscnhv0'`);
  await bunnyExecute(`UPDATE enquiry_forms SET submission_count = 0 WHERE form_id = '18NZAYl-2pLr3arpopo0hTxVi2Jyd8iKUY6YApscnhv0'`);
  console.log('Wiped submissions');
}
run();
