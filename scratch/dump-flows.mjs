import { createClient } from '@libsql/client';

const url = "libsql://01M2B0JYBZ55FW4532MSWV322A-swaryoga-db.lite.bunnydb.net/";
const authToken = "eyJ0eXAiOiJKV1QiLCJhbGciOiJFZERTQSJ9.eyJwIjp7InJvIjpudWxsLCJydyI6eyJucyI6WyJzd2FyeW9nYS1kYiJdLCJ0YWdzIjpudWxsfSwicm9hIjpudWxsLCJyd2EiOm51bGwsImRkbCI6bnVsbH0sImlhdCI6MTc4OTIyMzYwMX0.9A7XcDsf5afxfdhT6JavXlO7xPHoMK7cBXX3EGHHPfUdDEWvWjGhEbcFJ1y0GKXzr9osVT74HFl9pV2rj0x8BQ";

const client = createClient({ url, authToken });

async function main() {
  const flows = await client.execute("SELECT * FROM chatbot_flows_sql");
  console.log(JSON.stringify(flows.rows, null, 2));
}

main().catch(console.error);
