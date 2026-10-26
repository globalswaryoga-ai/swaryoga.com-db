require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env.production' });
require('dotenv').config({ path: '.env' });

const { createClient } = require('@libsql/client');

async function main() {
  const url = process.env.BUNNY_DATABASE_URL;
  const authToken = process.env.BUNNY_DATABASE_AUTH_TOKEN;

  if (!url) {
    console.error('BUNNY_DATABASE_URL is not defined in environment');
    process.exit(1);
  }

  const client = createClient({ url, authToken });

  await client.execute(`
    CREATE TABLE IF NOT EXISTS ai_avatars_sql (
      avatar_id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      avatar_type TEXT NOT NULL,
      media_url TEXT NOT NULL,
      thumbnail_url TEXT,
      language TEXT DEFAULT 'hi',
      notes TEXT,
      created_by TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);

  const presets = [
    {
      id: 'avatar_mohan_sir_speaker_video',
      name: 'Mohan Sir (Speaker View Workshop Video)',
      type: 'video_clip',
      mediaUrl: 'https://swaryogacrm.b-cdn.net/zoom-videos/2026-10-13%20H1P12YTMTRy5J0baEAa-bQ--%20Hindi%20Oct-26%20Mor%20Swar%20Yoga%20L-1%20(speaker).mp4',
      thumbnail: 'https://swaryogacrm.b-cdn.net/mohan.jpg',
      notes: 'Authentic Zoom workshop speaker-view lecture video from Bunny Storage',
      lang: 'hi'
    },
    {
      id: 'avatar_mohan_sir_portrait',
      name: 'Mohan Sir (Master Studio Portrait)',
      type: 'face_photo',
      mediaUrl: 'https://swaryogacrm.b-cdn.net/mohan.jpg',
      thumbnail: 'https://swaryogacrm.b-cdn.net/mohan.jpg',
      notes: 'Master face photograph for GFPGAN 1080p facial restoration and lip-sync',
      lang: 'hi'
    },
    {
      id: 'avatar_mohan_sir_voice',
      name: 'Mohan Sir (Authentic Hindi Voice Sample)',
      type: 'voice_sample',
      mediaUrl: 'https://swaryogacrm.b-cdn.net/zoom-videos/2026-10-13-H1P12YTMTRy5J0baEAa-bQ---audio.mp3',
      thumbnail: 'https://swaryogacrm.b-cdn.net/mohan.jpg',
      notes: 'Original teaching voice recording from Level-1 Hindi Workshop on Bunny',
      lang: 'hi'
    }
  ];

  for (const p of presets) {
    await client.execute({
      sql: `
        INSERT INTO ai_avatars_sql (avatar_id, name, avatar_type, media_url, thumbnail_url, language, notes, created_by, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'superadmin', datetime('now'), datetime('now'))
        ON CONFLICT(avatar_id) DO UPDATE SET
          name = excluded.name,
          media_url = excluded.media_url,
          thumbnail_url = excluded.thumbnail_url,
          notes = excluded.notes,
          updated_at = datetime('now')
      `,
      args: [p.id, p.name, p.type, p.mediaUrl, p.thumbnail, p.lang, p.notes]
    });
    console.log('✅ Seeded avatar:', p.id, '-', p.name);
  }

  const check = await client.execute('SELECT avatar_id, name, avatar_type, media_url FROM ai_avatars_sql');
  console.log('Total avatars in Bunny DB:', check.rows.length);
}

main().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
