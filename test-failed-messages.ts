import { config } from 'dotenv';
config({ path: '.env.local' });
import { bunnyExecute } from './lib/bunnyDatabase';

async function main() {
  const result = await bunnyExecute({
    sql: "SELECT data_json FROM meta_messages_sql WHERE status = 'failed' ORDER BY created_at DESC LIMIT 5",
    args: []
  });
  console.log(JSON.stringify(result.rows.map(r => JSON.parse(r.data_json)), null, 2));
}
main().catch(console.error);
