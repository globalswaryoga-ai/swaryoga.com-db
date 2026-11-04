import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { generateGroundedMohanAnswer } from '../lib/mohanRag/answerService';

async function test() {
  const res = await generateGroundedMohanAnswer({
    query: 'let me know about water theraphy',
    language: 'en',
    moduleId: 'level1',
  });
  console.log('--- GENERATED ANSWER ---');
  console.log(res.answer);
  console.log('--- CITATIONS ---');
  console.log(res.citations);
}

test();

