import { config } from 'dotenv';
config({ path: '.env.local' });
import { saveBunnyLead } from './lib/bunnyLeadsRepository';

async function main() {
  const result = await saveBunnyLead({
    phoneNumber: '9999999999',
    createdByUserId: 'system',
    name: 'Test',
  });
  console.log(result._id);
  const result2 = await saveBunnyLead({
    phoneNumber: '9999999999',
    createdByUserId: 'system',
    name: 'Test 2',
  });
  console.log(result2._id);
}
main().catch(console.error);
