import { bunnyExecute } from './lib/db';

async function test() {
  const result = await bunnyExecute({ sql: "SELECT document_json FROM mongo_documents WHERE collection_name = 'communities' ORDER BY created_at DESC LIMIT 1", args: [] });
  console.log(result.rows[0].document_json);
}
test();
