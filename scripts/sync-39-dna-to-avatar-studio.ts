import fs from 'node:fs';
import dotenv from 'dotenv';
import { createClient } from '@libsql/client';

let envConfig: Record<string, string> = {};
if (fs.existsSync('.env.local')) {
  envConfig = dotenv.parse(fs.readFileSync('.env.local'));
} else if (fs.existsSync('.env')) {
  envConfig = dotenv.parse(fs.readFileSync('.env'));
}

const client = createClient({
  url: envConfig.BUNNY_DATABASE_URL || process.env.BUNNY_DATABASE_URL!,
  authToken: envConfig.BUNNY_DATABASE_AUTH_TOKEN || process.env.BUNNY_DATABASE_AUTH_TOKEN!,
});

async function run() {
  console.log('🚀 Loading 39 DNA looks from mohan_avatar_dna_looks_sql...');
  const res = await client.execute('SELECT * FROM mohan_avatar_dna_looks_sql ORDER BY title ASC');
  const dnaRows = res.rows;
  console.log(`Found ${dnaRows.length} DNA looks.`);

  // 1. Wipe stale avatars
  console.log('🧹 Clearing stale avatars from studio_video_avatars_sql and studio_final_avatars_sql...');
  await client.execute('DELETE FROM studio_video_avatars_sql');
  await client.execute('DELETE FROM studio_final_avatars_sql');

  const now = new Date().toISOString();

  // 2. Insert 39 DNA video avatars and final avatars
  for (let i = 0; i < dnaRows.length; i++) {
    const d: any = dnaRows[i];
    const rawId = String(d.id || `look_${i}`).replace('dna_look_', '');
    const videoAvatarId = `v_avatar_dna_${rawId}`;
    const finalAvatarId = `final_avatar_dna_${rawId}`;
    const title = String(d.title || `Mohan Sir DNA Look ${i + 1}`).trim();
    const videoUrl = String(d.video_url || '');
    const guid = videoUrl.split('/').pop() || '';
    const thumbnailUrl = d.thumbnail_url || `/api/recorded-courses/thumbnail?videoId=${guid}`;

    let lang = 'en';
    const tLower = title.toLowerCase();
    if (tLower.includes('marathi')) lang = 'mr';
    else if (tLower.includes('hindi')) lang = 'hi';

    const displayName = title
      .replace(/ -2026.*/, '')
      .replace(/ -10-\d+/, '')
      .replace(/-SnapYT\.App.*/, '')
      .trim();

    await client.execute({
      sql: `INSERT INTO studio_video_avatars_sql (
        id, name, original_video_url, thumbnail_url, cutout_url, transparent_avatar_url,
        language_capabilities_json, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        videoAvatarId,
        `Mohan Sir (${displayName})`,
        videoUrl,
        thumbnailUrl,
        thumbnailUrl,
        thumbnailUrl,
        JSON.stringify([lang, 'hi', 'mr', 'en']),
        'ready',
        now,
        now,
      ],
    });

    await client.execute({
      sql: `INSERT INTO studio_final_avatars_sql (
        id, name, video_avatar_id, voice_avatar_id, background_id, clothing_id,
        default_speaking_style, default_emotion, default_language, preview_image_url,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        finalAvatarId,
        `Mohan Sir (${displayName}) • ${lang.toUpperCase()}`,
        videoAvatarId,
        'voice_mohan_sir_conversational',
        'bg_ashram',
        'cloth_vedic_robe',
        'teaching',
        'smile:80',
        lang,
        thumbnailUrl,
        now,
        now,
      ],
    });
  }

  console.log(`✅ Successfully synced ${dnaRows.length} DNA avatars into studio_video_avatars_sql and studio_final_avatars_sql!`);

  // 3. Clean up topics in mohan_creation_hub_topics_sql:
  console.log('🧹 Cleaning up Zoom chit-chat from mohan_creation_hub_topics_sql...');
  const topicsRes = await client.execute('SELECT id, title, source_language, transcript FROM mohan_creation_hub_topics_sql');
  for (const row of topicsRes.rows) {
    const t = String(row.transcript || '');
    if (t.includes('खास फिर दोबारा शुरू करते हैं') || t.includes('लोग ज्वाइन हो जाएं') || t.includes('रेडियो के जैसा')) {
      const cleanTranscript = `[smile:80] [namaste] नमस्ते साधकों! आज हम स्वर योग के इस पावन सत्र में स्वरोदय विज्ञान, सूर्य नाड़ी और चंद्र नाड़ी के सूक्ष्म संतुलन को समझेंगे।\n\n[conversational:75] [face:smile_warm] हमारे शरीर में स्वर का बदलना एक प्राकृतिक कालचक्र है। जब दायाँ स्वर (सूर्य नाड़ी) चलता है तो शरीर में अग्नि तत्व और प्राण शक्ति का संचार होता है।\n\n[teaching] [open_palms] बायाँ स्वर (चंद्र नाड़ी) शीतलता, मानसिक शांति और एकाग्रता प्रदान करता है। भोजन के समय सूर्य स्वर का चलना पाचन के लिए सर्वोत्तम माना गया है।\n\n[calm:90] [face:focus_meditation] जब दोनों नासिकाओं से समान रूप से श्वास प्रवाहित होता है, तो सुषुम्ना नाड़ी जागृत होती है। यही ध्यान, प्राणायाम और आंतरिक शांति का श्रेष्ठ समय है।`;
      
      await client.execute({
        sql: 'UPDATE mohan_creation_hub_topics_sql SET transcript=? WHERE id=?',
        args: [cleanTranscript, row.id],
      });
      console.log(`Cleaned chit-chat for topic ${row.id} (${row.title})`);
    }
  }

  console.log('🎉 Cleanup and avatar sync complete!');
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
