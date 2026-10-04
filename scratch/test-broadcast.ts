import { broadcastRunFindOne } from '../lib/bunnyBroadcastRepository';

async function main() {
  const db = require('../lib/bunnyDatabase');
  const runsResult = await db.bunnyExecute({ sql: 'SELECT document_id FROM broadcast_runs_sql LIMIT 1', args: [] });
  console.log('Available runs:', runsResult.rows);
  if (runsResult.rows.length > 0) {
    const id = runsResult.rows[0].document_id;
    console.log('Querying ID:', id);
    const run = await broadcastRunFindOne(id);
    console.log('Found run:', run ? 'yes' : 'no');
  }
}
main().catch(console.error);
