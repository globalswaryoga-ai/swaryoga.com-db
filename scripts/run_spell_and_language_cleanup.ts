import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });
import { runFullSourceRecheckAndCleanup } from '../lib/mohanRag/verbatimSpellAndLanguageWorker';

async function main() {
  console.log('🚀 [Worker] Starting Word-to-Word Verbatim Spell & Language Recheck...');
  const res = await runFullSourceRecheckAndCleanup();
  console.log('\n=============================================');
  console.log(`✅ Total Sources Audited: ${res.totalAudited}`);
  console.log(`🔄 Languages Normalized: ${res.languageChanges}`);
  console.log(`🧹 Hallucinations Purged: ${res.hallucinationsPurged}`);
  console.log(`✍️ Spelling & Matra Fixes: ${res.spellingCorrected}`);
  console.log('=============================================\n');

  const modified = res.results.filter(r => r.status === 'fixed');
  console.log(`Updated ${modified.length} sources in database:`);
  for (const m of modified.slice(0, 20)) {
    console.log(`  - [${m.newLanguage}] "${m.title}" (Fixes: ${m.spellingFixesCount}, Hallucinations: ${m.hallucinationsRemoved})`);
  }
}

main().catch(console.error);

