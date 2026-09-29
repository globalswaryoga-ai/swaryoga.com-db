import { createClient } from '@libsql/client';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const client = createClient({ url: process.env.BUNNY_DATABASE_URL.trim(), authToken: process.env.BUNNY_DATABASE_AUTH_TOKEN.trim() });
client.execute("SELECT * FROM social_media_accounts_sql WHERE is_connected = 1").then(r => {
  console.log('Connected Social Accounts:', r.rows.map(row => ({
    platform: row.platform,
    account_name: row.account_name,
    account_handle: row.account_handle,
    is_connected: row.is_connected,
    updated_at: row.updated_at
  })));
});
