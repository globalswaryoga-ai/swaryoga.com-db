import { listBunnySocialAccounts } from './lib/bunnySocialInboxRepository';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
async function check() {
  const accounts = await listBunnySocialAccounts({ scopeType: 'super_admin', scopeKey: 'super_admin', connectedOnly: false });
  console.log("YouTube Accounts:", accounts.filter(a => a.platform === 'youtube'));
}
check();
