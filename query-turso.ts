import { config } from 'dotenv';
config({ path: '.env.local' });
import { getBunnyDatabase } from './lib/bunnyDatabase';

async function check() {
  const db = getBunnyDatabase();
  const res = await db.execute("SELECT COUNT(*) as c FROM meta_messages_sql");
  console.log("meta_messages_sql count:", res.rows[0].c);

  const res2 = await db.execute("SELECT COUNT(*) as c FROM meta_archive_manifest_sql");
  console.log("meta_archive_manifest_sql count:", res2.rows[0].c);
  
  const res3 = await db.execute("SELECT sent_at, created_at FROM meta_messages_sql ORDER BY COALESCE(sent_at, created_at) DESC LIMIT 5");
  console.log("Recent messages:", res3.rows);
}

check().catch(console.error);
