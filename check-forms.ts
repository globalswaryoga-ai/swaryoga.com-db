import { loadEnvConfig } from '@next/env';
loadEnvConfig(process.cwd());
import { bunnyExecute } from './lib/bunnyDatabase';

async function run() {
  const res = await bunnyExecute(`SELECT form_id, workshop_name, submission_count FROM enquiry_forms`);
  console.log(res.rows);
}
run();
