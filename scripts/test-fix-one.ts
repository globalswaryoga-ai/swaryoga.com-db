import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { autoFixSingleVideoSource } from '../lib/mohanRag/aiRecheckAutoFixWorker';

async function main() {
  console.log('Testing auto-fix on a6d530f9-af7b-4820-bad2-1d6a6c42aa9e...');
  const res = await autoFixSingleVideoSource('a6d530f9-af7b-4820-bad2-1d6a6c42aa9e');
  console.log('Result:', res);
}

main().catch(console.error);
