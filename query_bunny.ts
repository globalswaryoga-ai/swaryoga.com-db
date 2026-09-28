import { bunnyExecute, cleanMongoJson } from './lib/bunnyDatabase';

async function run() {
  try {
    const res = await bunnyExecute({
        sql: "SELECT document_id as id, document_json FROM mongo_documents WHERE collection_name = 'socialmediaaccounts'",
    });
    for (const row of res.rows) {
        const parsed = cleanMongoJson(JSON.parse(String(row.document_json || '{}')));
        console.log("Parsed account:", { id: row.id, platform: parsed.platform, accountName: parsed.accountName, handle: parsed.accountHandle });
    }
  } catch (err) {
      console.error(err);
  }
}
run();
