import * as dotenv from 'dotenv';
import { resolve } from 'path';
import { bunnyExecute } from '../lib/bunnyDatabase';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

async function check() {
  const result = await bunnyExecute({ sql: "SELECT data_json, created_at FROM meta_messages_sql WHERE direction = 'inbound' ORDER BY created_at DESC LIMIT 3", args: [] });
  console.log(JSON.stringify(result.rows.map(r => ({ ...JSON.parse(String(r.data_json)), created_at: r.created_at })), null, 2));
}

check();
