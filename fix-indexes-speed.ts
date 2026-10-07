import { loadEnvConfig } from '@next/env';
loadEnvConfig(process.cwd());
import { bunnyExecute } from './lib/bunnyDatabase';

async function run() {
  try {
    await bunnyExecute("CREATE INDEX IF NOT EXISTS idx_meta_messages_coalesce ON meta_messages_sql(phone_number, COALESCE(sent_at, created_at) DESC);");
    console.log("Index 1 created");
    await bunnyExecute("CREATE INDEX IF NOT EXISTS idx_meta_messages_provider_phone_coalesce ON meta_messages_sql(provider, phone_number, COALESCE(sent_at, created_at) DESC);");
    console.log("Index 2 created");
    
    // An index specifically for the unread query
    await bunnyExecute("CREATE INDEX IF NOT EXISTS idx_meta_messages_unread ON meta_messages_sql(provider, phone_number, direction, status);");
    console.log("Index 3 created");
  } catch (err) {
    console.error(err);
  }
}
run();
