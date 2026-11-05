const fs = require('fs');
const dotenv = require('dotenv');

let envConfig = {};
if (fs.existsSync('.env.local')) {
  envConfig = dotenv.parse(fs.readFileSync('.env.local'));
} else if (fs.existsSync('.env')) {
  envConfig = dotenv.parse(fs.readFileSync('.env'));
}

const { createClient } = require('@libsql/client');
const db = createClient({
  url: envConfig.BUNNY_DATABASE_URL || process.env.BUNNY_DATABASE_URL,
  authToken: envConfig.BUNNY_DATABASE_AUTH_TOKEN || process.env.BUNNY_DATABASE_AUTH_TOKEN
});

async function run() {
  const all = await db.execute('SELECT id, module_id, title, topic, language, source_type, original_file_url, source_reference, LENGTH(content) as len, substr(content, 1, 100) as p FROM mohan_rag_sources_sql');
  
  const dummyOrPdf = [];
  const realRich = [];

  for (const r of all.rows) {
    const isVideo = r.source_type === 'bunny_stream' || r.source_type === 'youtube' || r.source_type === 'mp4' || (r.original_file_url && r.original_file_url.includes('.mp4')) || (r.source_reference && r.source_reference.includes('.mp4'));
    const len = Number(r.len || 0);
    const plain = String(r.p || '');

    const isPdfOutline = isVideo && (
      len < 900 ||
      (plain.includes('मार्गदर्शक') && len < 3500) ||
      (plain.includes('दिवस') && len < 3500) ||
      plain.includes('Title: Marker') ||
      plain.includes('Video Duration:')
    );

    if (isPdfOutline) {
      dummyOrPdf.push(r);
    } else {
      realRich.push(r);
    }
  }

  console.log(`TOTAL SOURCES: ${all.rows.length}`);
  console.log(`REAL RICH SPOKEN TRANSCRIPTS: ${realRich.length}`);
  console.log(`DUMMY / BRIEF PDF OUTLINES: ${dummyOrPdf.length}`);
  
  console.log('\n--- DUMMY / PDF OUTLINE SOURCES BREAKDOWN ---');
  for (const r of dummyOrPdf) {
    console.log(`- [${r.language}] (${r.source_type}, len: ${r.len}) "${r.title}" | module: ${r.module_id} | topic: ${r.topic}`);
  }

  console.log('\n--- REAL RICH SOURCES SAMPLE (TOP 10) ---');
  for (const r of realRich.slice(0, 10)) {
    console.log(`- [${r.language}] (${r.source_type}, len: ${r.len}) "${r.title}" | module: ${r.module_id} | topic: ${r.topic}`);
  }
}

run().catch(console.error);
