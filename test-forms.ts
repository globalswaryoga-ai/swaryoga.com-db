import { bunnyExecute, cleanMongoJson } from './lib/bunnyDatabase';

async function run() {
  const accountRes = await bunnyExecute({
    sql: "SELECT document_id, document_json FROM mongo_documents WHERE collection_name = 'workshops'"
  });
  
  for (const row of accountRes.rows) {
    const parsed = cleanMongoJson(JSON.parse(String(row.document_json || '{}')));
    console.log(parsed._id, '->', parsed.name, '(', parsed.language, ')');
  }
}
run();
