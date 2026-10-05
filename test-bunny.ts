import { bunnyExecute, cleanMongoJson } from './lib/bunnyDatabase';
async function run() {
  const accountRes = await bunnyExecute({
    sql: "SELECT document_id, document_json FROM mongo_documents WHERE collection_name = 'socialmediaaccounts'"
  });
  console.log(accountRes.rows.map(r => cleanMongoJson(JSON.parse(String(r.document_json || '{}')))));
}
run();
