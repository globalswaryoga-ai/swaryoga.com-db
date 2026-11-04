import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });
import { bunnyExecute } from '../lib/bunnyDatabase';

function detectLanguageFromContent(text: string): 'mr' | 'hi' | 'en' {
  if (!text || text.trim().length === 0) return 'mr';
  const clean = text.replace(/\[\d+:\d+[-–]\d+:\d+\]/g, '').replace(/Minute\s+\d+:\d+[-–]\d+:\d+/gi, '');

  // Latin characters dominance -> English
  const latinMatches = clean.match(/[a-zA-Z]/g) || [];
  const devanagariMatches = clean.match(/[\u0900-\u097F]/g) || [];
  if (latinMatches.length > devanagariMatches.length * 1.5) {
    return 'en';
  }

  // Devanagari: distinguish Marathi vs Hindi by core function words
  const marathiMarkers = [
    /\bआहे\b/g, /\bआहेत\b/g, /\bनाही\b/g, /\bआपण\b/g, /\bआपलं\b/g, /\bकरूया\b/g, /\bकरावे\b/g,
    /\bपाहिजे\b/g, /\bबघितला\b/g, /\bबघा\b/g, /\bदिवस\b/g, /\bपाणी\b/g, /\bनाकपुडी\b/g,
    /\bजेव्हा\b/g, /\bतेव्हा\b/g, /\bमध्ये\b/g, /\bकरून\b/g, /\bहोतो\b/g, /\bहोते\b/g,
    /\bशिकलो\b/g, /\bजाऊया\b/g, /\bघेऊन\b/g, /\bठेवा\b/g, /\bघ्या\b/g, /\bटाका\b/g,
    /\bडोळे\b/g, /\bहात\b/g, /\bश्वासाकडे\b/g
  ];

  const hindiMarkers = [
    /\bहै\b/g, /\bहैं\b/g, /\bनहीं\b/g, /\bहम\b/g, /\bहमे\b/g, /\bहमें\b/g, /\bकरेंगे\b/g,
    /\bकरना\b/g, /\bचाहिए\b/g, /\bदेखा\b/g, /\bदेखिए\b/g, /\bदिन\b/g, /\bपानी\b/g,
    /\bजब\b/g, /\bतब\b/g, /\bमें\b/g, /\bकरके\b/g, /\bहोता\b/g, /\bहोती\b/g,
    /\bसकते\b/g, /\bसकता\b/g, /\bरखना\b/g, /\bलीजिए\b/g, /\bडालिए\b/g, /\bआंखें\b/g
  ];

  let mrScore = 0;
  for (const m of marathiMarkers) {
    const found = clean.match(m);
    if (found) mrScore += found.length;
  }

  let hiScore = 0;
  for (const h of hindiMarkers) {
    const found = clean.match(h);
    if (found) hiScore += found.length;
  }

  return mrScore >= hiScore ? 'mr' : 'hi';
}

async function main() {
  const sources = await bunnyExecute('SELECT id, title, topic, language, LENGTH(content) as len, content FROM mohan_rag_sources_sql');
  console.log(`Auditing ${sources.rows?.length} sources for language alignment...`);

  let mismatches = 0;
  for (const s of sources.rows || []) {
    const currentLang = String(s.language || 'mr').toLowerCase();
    const detected = detectLanguageFromContent(String(s.content || ''));
    if (currentLang !== detected && currentLang !== 'auto') {
      mismatches++;
      console.log(`[MISMATCH] "${s.title}" (ID: ${s.id})`);
      console.log(`  Current: ${currentLang} -> Detected: ${detected}`);
      console.log(`  Topic: ${s.topic}`);
    }
  }
  console.log(`Total mismatches found: ${mismatches}`);
}

main().catch(console.error);

