import { loadEnvConfig } from '@next/env';
loadEnvConfig(process.cwd());
import { bunnyExecute } from './lib/bunnyDatabase';

async function run() {
  try {
    await bunnyExecute("CREATE UNIQUE INDEX IF NOT EXISTS idx_form_submissions_unique_form_data ON form_submissions(form_id, form_data) WHERE form_data IS NOT NULL AND form_data != '';");
    console.log("Unique index created successfully!");
  } catch (err) {
    console.error(err);
  }
}
run();
