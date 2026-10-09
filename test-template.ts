import { config } from 'dotenv';
config({ path: '.env.local' });
import { bunnyExecute } from './lib/bunnyDatabase';

async function main() {
  const result = await bunnyExecute({
    sql: "SELECT data_json FROM whatsapp_templates_sql WHERE data_json LIKE '%marathi_level_1_informetion%' LIMIT 1",
    args: []
  });
  console.log(JSON.stringify(result.rows.map(r => JSON.parse(r.data_json)), null, 2));
}
main().catch(console.error);
