import { loadEnvConfig } from '@next/env';
loadEnvConfig(process.cwd());
import { bunnyExecute } from './lib/bunnyDatabase';

async function run() {
  const res = await bunnyExecute("SELECT form_data, email, mobile, COUNT(*) as c FROM form_submissions WHERE form_id = '18NZAYl-2pLr3arpopo0hTxVi2Jyd8iKUY6YApscnhv0' GROUP BY form_data, email, mobile HAVING c > 1");
  console.log(res.rows);
}
run();
