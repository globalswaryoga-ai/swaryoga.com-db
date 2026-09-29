import { createClient } from '@libsql/client';

const url = "libsql://01M2B0JYBZ55FW4532MSWV322A-swaryoga-db.lite.bunnydb.net/";
const authToken = "eyJ0eXAiOiJKV1QiLCJhbGciOiJFZERTQSJ9.eyJwIjp7InJvIjpudWxsLCJydyI6eyJucyI6WyJzd2FyeW9nYS1kYiJdLCJ0YWdzIjpudWxsfSwicm9hIjpudWxsLCJyd2EiOm51bGwsImRkbCI6bnVsbH0sImlhdCI6MTc4OTIyMzYwMX0.9A7XcDsf5afxfdhT6JavXlO7xPHoMK7cBXX3EGHHPfUdDEWvWjGhEbcFJ1y0GKXzr9osVT74HFl9pV2rj0x8BQ";

const client = createClient({ url, authToken });

async function main() {
  const targetId = "3302db1a-2682-44e3-b685-94a81380b183";
  const newName = "Swar Yoga Form Follow-up Flow";

  const rows = await client.execute({ sql: "SELECT * FROM chatbot_flows_sql WHERE document_id = ?", args: [targetId] });
  if (rows.rows.length === 0) {
    console.log("Flow not found!");
    return;
  }

  const row = rows.rows[0];
  const data = JSON.parse(String(row.data_json));
  data.name = newName;
  data.enabled = true;

  await client.execute({
    sql: "UPDATE chatbot_flows_sql SET name = ?, enabled = 1, data_json = ?, updated_at = ? WHERE document_id = ?",
    args: [newName, JSON.stringify(data), new Date().toISOString(), targetId]
  });

  console.log(`Successfully recovered and renamed flow "${targetId}" to "${newName}"!`);
}

main().catch(console.error);
