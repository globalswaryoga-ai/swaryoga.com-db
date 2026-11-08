import { bunnyExecute } from '../lib/bunnyDatabase';
import { ALL_34_PROFESSIONS } from '../lib/avatarStudio/avatarMasterCatalog';

async function syncAll34Videos() {
  console.log('Syncing all 34 Profession 30s Videos to Bunny Edge SQL & Module 8...');
  const now = new Date().toISOString();

  for (const prof of ALL_34_PROFESSIONS) {
    const outputId = `out_real_${prof.id}_30s`;
    const title = `Mohan Sir – ${prof.nameHi} (${prof.nameEn})`;
    const videoUrl = `/avatar-studio/videos/mohan_real_${prof.id}_30s.mp4`;
    const thumbUrl = `/avatar-studio/master-clone/mohan_${prof.id}_1080p.jpg`;

    // 1. Insert into avatar_generation_outputs_sql
    await bunnyExecute({
      sql: `INSERT OR REPLACE INTO avatar_generation_outputs_sql
            (id, job_id, title, profession_id, profession_name, language, duration_seconds, resolution, video_url, thumbnail_url, ai_model, voice_type, is_module8_synced, created_at)
            VALUES (?, ?, ?, ?, ?, 'hi', 30, '1080p', ?, ?, 'MOHAN_SIR_MASTER_IDENTITY (Universal Face Clone)', 'mohan_authentic_baritone', 1, ?)`,
      args: [
        outputId,
        `job_real_${prof.id}_30s`,
        title,
        prof.id,
        prof.nameEn,
        videoUrl,
        thumbUrl,
        now,
      ],
    });

    // 2. Insert into studio_video_avatars_sql (Module 8)
    await bunnyExecute({
      sql: `INSERT OR REPLACE INTO studio_video_avatars_sql
            (id, name, original_video_url, thumbnail_url, cutout_url, transparent_avatar_url, status, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, 'ready', ?, ?)`,
      args: [
        outputId,
        title,
        videoUrl,
        thumbUrl,
        thumbUrl,
        thumbUrl,
        now,
        now,
      ],
    });

    console.log(`✓ Synced: ${prof.nameHi} (${prof.nameEn}) -> ${videoUrl}`);
  }

  console.log('\n✅ All 34 profession videos successfully registered in Library & Module 8!');
}

syncAll34Videos().catch(console.error);

