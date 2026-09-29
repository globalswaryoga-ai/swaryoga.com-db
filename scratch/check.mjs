import { createClient } from '@libsql/client';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const client = createClient({ url: process.env.BUNNY_DATABASE_URL.trim(), authToken: process.env.BUNNY_DATABASE_AUTH_TOKEN.trim() });
client.execute("SELECT * FROM social_media_accounts_sql WHERE platform = 'youtube'").then(r => {
  console.log('Found YouTube Accounts:', r.rows.map(row => ({
    platform: row.platform,
    account_name: row.account_name,
    is_connected: row.is_connected,
    updated_at: row.updated_at
  })));
});
