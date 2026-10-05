import { bunnyExecute, cleanMongoJson } from './lib/bunnyDatabase';

async function run() {
  const accountRes = await bunnyExecute({
    sql: "SELECT * FROM broadcast_runs_sql ORDER BY created_at DESC LIMIT 5"
  });
  
  if (accountRes.rows.length > 0) {
    for (const row of accountRes.rows) {
      console.log('Run ID:', row.document_id);
      console.log('Mode:', row.mode);
      console.log('Status:', row.status);
      const dataJson = JSON.parse(String(row.data_json || '{}'));
      console.log('Stats:', dataJson.stats);
      console.log('Targets length:', dataJson.target ? (dataJson.target.leadIds ? dataJson.target.leadIds.length : 'no leadIds') : 'no target');
      console.log('Created at:', row.created_at);
      console.log('-------------------------');
    }
  } else {
    console.log('No runs found in SQL');
  }
}
run();
