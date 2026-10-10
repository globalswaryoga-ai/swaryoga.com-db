const { bunnyExecute } = require('./lib/bunnyDatabase.js');
async function run() {
  try {
    const res = await bunnyExecute({ sql: "SELECT metadata FROM workshops_sql LIMIT 1" });
    const metadata = JSON.parse(res[0].metadata);
    console.log("AI-9B Config:", JSON.stringify(metadata.ai9BConfig, null, 2));
  } catch(e) { console.error(e); }
}
run();
