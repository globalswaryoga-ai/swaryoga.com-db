import { bunnyExecute } from './lib/bunnyDatabase';
(async () => {
  const result = await bunnyExecute({
    sql: "SELECT document_id, phone_number, status, failure_reason FROM meta_messages_sql WHERE status = 'failed' ORDER BY created_at DESC LIMIT 5",
    args: []
  });
  console.log(result.rows);
})();
