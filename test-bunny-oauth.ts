import { upsertBunnySocialAccount } from './lib/bunnySocialInboxRepository';
import { encryptCredential } from './lib/encryption';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function test() {
  try {
    console.log('Testing Bunny DB write...');
    console.log('Encrypted:', encryptCredential('test-token'));
    await upsertBunnySocialAccount({
      scopeType: 'super_admin',
      scopeKey: 'super_admin',
      platform: 'youtube',
      accountId: 'test_account_id',
      accountName: 'Test Account',
      accessToken: encryptCredential('test_access'),
      isConnected: true,
    });
    console.log('Write success!');
  } catch (e) {
    console.error('ERROR:', e);
  }
}
test();
