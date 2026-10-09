import { config } from 'dotenv';
config({ path: '.env.local' });
import { bunnyExecute } from './lib/bunnyDatabase';

async function main() {
  const result = await bunnyExecute({
    sql: `SELECT document_id, data_json, created_at FROM leads_sql WHERE data_json LIKE '%"facebook_ads"%' OR data_json LIKE '%"meta_instant_form"%' OR data_json LIKE '%"meta_leadgen"%' ORDER BY created_at DESC LIMIT 5`,
    args: []
  });
  
  if (result.rows.length === 0) {
    console.log("No Facebook/Instagram leads found in the database yet.");
  } else {
    console.log(`Found ${result.rows.length} recent Facebook/Instagram leads:`);
    result.rows.forEach(row => {
      const data = JSON.parse(row.data_json);
      console.log(`- Name: ${data.name} | Phone: ${data.phoneNumber} | Source: ${data.source} | Created: ${row.created_at}`);
    });
  }
}
main().catch(console.error);
