import { config } from 'dotenv';
config({ path: '.env.local' });
import { bunnyExecute } from './lib/bunnyDatabase';

async function run() {
  try {
    const result = await bunnyExecute({
      sql: "DELETE FROM leads_sql WHERE data_json LIKE '%meta_instant_form%' AND data_json LIKE '%\"workshopId\":null%'",
      args: []
    });
    console.log('Deleted successfully', result.rowCount);
  } catch (err) {
    console.error(err);
  }
}
run();
