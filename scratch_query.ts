import { bunnyExecute } from './lib/bunnyDatabase.ts';

async function main() {
  try {
    const res = await bunnyExecute(`
      SELECT *
      FROM meta_messages_sql 
      WHERE status = 'failed' AND data_json NOT LIKE '%broadcast%'
      ORDER BY created_at DESC 
      LIMIT 5
    `);
    
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (err) {
    console.error(err);
  }
}

main();
