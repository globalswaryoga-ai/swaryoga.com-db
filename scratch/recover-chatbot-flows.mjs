import { createClient } from '@libsql/client';

const url = "libsql://01M2B0JYBZ55FW4532MSWV322A-swaryoga-db.lite.bunnydb.net/";
const authToken = "eyJ0eXAiOiJKV1QiLCJhbGciOiJFZERTQSJ9.eyJwIjp7InJvIjpudWxsLCJydyI6eyJucyI6WyJzd2FyeW9nYS1kYiJdLCJ0YWdzIjpudWxsfSwicm9hIjpudWxsLCJyd2EiOm51bGwsImRkbCI6bnVsbH0sImlhdCI6MTc4OTIyMzYwMX0.9A7XcDsf5afxfdhT6JavXlO7xPHoMK7cBXX3EGHHPfUdDEWvWjGhEbcFJ1y0GKXzr9osVT74HFl9pV2rj0x8BQ";

const client = createClient({ url, authToken });

async function main() {
  console.log('Checking Bunny SQL tables...');
  try {
    const tables = await client.execute("SELECT name FROM sqlite_master WHERE type='table'");
    console.log('Tables:', tables.rows.map(r => r.name));

    if (tables.rows.some(r => r.name === 'chatbot_flows_sql')) {
      const flows = await client.execute("SELECT * FROM chatbot_flows_sql");
      console.log(`Found ${flows.rows.length} chatbot flow(s) in chatbot_flows_sql:`);
      flows.rows.forEach(r => {
        console.log(`- ID: ${r.document_id}, Name: ${r.name}, Owner: ${r.created_by_user_id}, UpdatedAt: ${r.updated_at}`);
        console.log('  Data snippet:', String(r.data_json).substring(0, 200));
      });
    } else {
      console.log('chatbot_flows_sql table does not exist yet.');
    }
  } catch (err) {
    console.error('Error querying Bunny SQL:', err);
  }
}

main().catch(console.error);
