import { bunnyExecute } from './lib/bunnyDatabase.ts';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  try {
    console.log('--- social_media_accounts_sql ---');
    const res1 = await bunnyExecute({ sql: "SELECT * FROM social_media_accounts_sql WHERE platform = 'youtube'" });
    console.log(res1.rows);
  } catch (e) {
    console.log('Error querying social_media_accounts_sql:', e.message);
  }

  try {
    console.log('\n--- mongo_documents (socialmediaaccounts) ---');
    const res2 = await bunnyExecute({ sql: "SELECT document_json FROM mongo_documents WHERE collection_name = 'socialmediaaccounts'" });
    console.log(res2.rows.map(r => JSON.parse(r.document_json).email));
  } catch (e) {
    console.log('Error querying mongo_documents:', e.message);
  }
}
run();
