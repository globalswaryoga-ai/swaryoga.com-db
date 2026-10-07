import { loadEnvConfig } from '@next/env';
loadEnvConfig(process.cwd());
import { bunnyExecute } from './lib/bunnyDatabase';

async function run() {
  await bunnyExecute(`
    UPDATE enquiry_forms 
    SET submission_count = (
      SELECT COUNT(*) FROM form_submissions WHERE form_id = enquiry_forms.form_id
    )
  `);
  console.log('Fixed counts');
}
run();
