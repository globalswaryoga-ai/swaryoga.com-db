const rows = new Map<string, Record<string, unknown>>();

jest.mock('@/lib/bunnyDatabase', () => ({
  bunnyBatch: jest.fn().mockResolvedValue([]),
  bunnyExecute: jest.fn(),
}));

jest.mock('@/lib/avatarEngine/inhouseAudioService', () => ({
  InhouseAudioService: {
    synthesizeSpeech: jest.fn().mockResolvedValue({
      audioUrl: 'https://swaryogacrm.b-cdn.net/audio/preview.mp3',
      durationSeconds: 4.2,
    }),
  },
  INHOUSE_NEURAL_VOICES: [{ id: 'hi-IN-MadhurNeural', langCode: 'hi' }],
}));

jest.mock('@/lib/avatarEngine/faceIdentityService', () => ({
  getAvatarProfileById: jest.fn(),
}));

jest.mock('@/lib/avatarEngine/consentService', () => ({
  verifyAvatarConsent: jest.fn(),
}));

import { bunnyExecute } from '@/lib/bunnyDatabase';
import { InhouseAudioService } from '@/lib/avatarEngine/inhouseAudioService';
import { verifyAvatarConsent } from '@/lib/avatarEngine/consentService';
import { getAvatarProfileById } from '@/lib/avatarEngine/faceIdentityService';
import { InhouseRenderQueue } from '@/lib/avatarEngine/inhouseRenderQueue';

const profile = {
  id: 'profile-1',
  userId: 'admincrm',
  name: 'Approved avatar',
  gender: 'male' as const,
  ageGroup: 'adult' as const,
  defaultClothing: 'Kurta',
  defaultHair: 'Natural',
  frontalFaceUrl: 'https://swaryogacrm.b-cdn.net/avatar/source.jpg',
  qualityScore: 0.9,
  consentRecordId: 'consent-1',
  createdAt: new Date().toISOString(),
};

function fakeExecute(statement: { sql: string; args?: unknown[] } | string) {
  const sql = typeof statement === 'string' ? statement : statement.sql;
  const args = typeof statement === 'string' ? [] : statement.args || [];

  if (sql.startsWith('INSERT INTO studio_inhouse_render_jobs_sql')) {
    const [id, avatarName, avatarProfileId, sourceImageUrl, script, voiceId, language, speechSpeed,
      speechPitchHz, backgroundId,
      clothingId, posture, ownerUserId, createdAt, updatedAt] = args;
    rows.set(String(id), {
      id, avatar_name: avatarName, avatar_profile_id: avatarProfileId, source_image_url: sourceImageUrl,
      owner_user_id: ownerUserId,
      script_text: script, voice_id: voiceId, language, speech_speed: speechSpeed,
      speech_pitch_hz: speechPitchHz, background_id: backgroundId,
      clothing_id: clothingId, posture, status: 'synthesizing_speech', progress_percent: 10,
      created_at: createdAt, updated_at: updatedAt,
    });
    return Promise.resolve({ rows: [], rowsAffected: 1 });
  }

  if (sql.includes("SET status = 'ready_for_worker'")) {
    const row = rows.get(String(args[3]));
    if (row) Object.assign(row, {
      status: 'ready_for_worker', progress_percent: 40, audio_url: args[0],
      duration_seconds: args[1], updated_at: args[2],
    });
    return Promise.resolve({ rows: [], rowsAffected: row ? 1 : 0 });
  }

  if (sql.includes("SET status = 'rendering_video'")) {
    const row = [...rows.values()].find((candidate) =>
      candidate.status === 'ready_for_worker' ||
      (candidate.status === 'rendering_video' && String(candidate.lease_expires_at || '') < String(args[4]))
    );
    if (row) Object.assign(row, {
      status: 'rendering_video', progress_percent: 50, worker_id: args[0],
      claim_token: args[1], lease_expires_at: args[2], updated_at: args[3],
    });
    return Promise.resolve({ rows: [], rowsAffected: row ? 1 : 0 });
  }

  if (sql.includes("SET status = 'completed'")) {
    const row = rows.get(String(args[3]));
    if (!row || row.status !== 'rendering_video' || row.claim_token !== args[4]) {
      return Promise.resolve({ rows: [], rowsAffected: 0 });
    }
    Object.assign(row, {
      status: 'completed', progress_percent: 100, video_url: args[0],
      duration_seconds: args[1] || row.duration_seconds, claim_token: null,
    });
    return Promise.resolve({ rows: [], rowsAffected: 1 });
  }

  if (sql.includes('WHERE worker_id = ? AND claim_token = ?')) {
    const row = [...rows.values()].find((candidate) =>
      candidate.worker_id === args[0] && candidate.claim_token === args[1]
    );
    return Promise.resolve({ rows: row ? [row] : [], rowsAffected: row ? 1 : 0 });
  }

  if (sql.includes('WHERE id = ?')) {
    const row = rows.get(String(args[0]));
    return Promise.resolve({ rows: row ? [row] : [], rowsAffected: row ? 1 : 0 });
  }

  return Promise.resolve({ rows: [], rowsAffected: 0 });
}

describe('InhouseRenderQueue', () => {
  beforeEach(() => {
    rows.clear();
    jest.mocked(getAvatarProfileById).mockResolvedValue(profile);
    jest.mocked(verifyAvatarConsent).mockResolvedValue(true);
    jest.mocked(bunnyExecute).mockImplementation(fakeExecute as never);
  });

  it('prepares audio and leaves the job queued for a GPU worker', async () => {
    const job = await InhouseRenderQueue.createAndPrepare({
      requesterId: 'admincrm',
      allowSharedProfile: true,
      avatarProfileId: profile.id,
      script: 'A short demonstration.',
      speed: 0.98,
      pitchHz: 2,
    });

    expect(job.status).toBe('ready_for_worker');
    expect(job.audioUrl).toContain('.mp3');
    expect(job.videoUrl).toBeUndefined();
    expect(job.speechSpeed).toBe(0.98);
    expect(job.speechPitchHz).toBe(2);
    expect(InhouseAudioService.synthesizeSpeech).toHaveBeenCalledWith(
      expect.objectContaining({ speed: 0.98, pitchHz: 2 }),
    );
    expect(verifyAvatarConsent).toHaveBeenCalledWith({
      consentId: profile.consentRecordId,
      userId: profile.userId,
      avatarName: profile.name,
    });
  });

  it('requires valid profile consent before creating a job', async () => {
    jest.mocked(verifyAvatarConsent).mockResolvedValue(false);

    await expect(InhouseRenderQueue.createAndPrepare({
      requesterId: 'admincrm',
      allowSharedProfile: true,
      avatarProfileId: profile.id,
      script: 'No consent.',
    })).rejects.toThrow('Avatar consent is invalid');

    expect(rows.size).toBe(0);
  });

  it('claims jobs and only accepts a finished video on the configured Bunny CDN', async () => {
    const queued = await InhouseRenderQueue.createAndPrepare({
      requesterId: 'admincrm',
      allowSharedProfile: true,
      avatarProfileId: profile.id,
      script: 'Render this.',
    });
    const claim = await InhouseRenderQueue.claimNextJob('gpu-worker-1');

    expect(claim?.job.id).toBe(queued.id);
    expect(claim?.job.status).toBe('rendering_video');

    if (!claim) throw new Error('Expected the GPU worker to claim the prepared job.');
    await expect(InhouseRenderQueue.completeJob({
      jobId: queued.id,
      claimToken: claim.claimToken,
      videoUrl: 'https://example.com/output.mp4',
    })).rejects.toThrow('configured Bunny CDN');

    const completed = await InhouseRenderQueue.completeJob({
      jobId: queued.id,
      claimToken: claim.claimToken,
      videoUrl: 'https://swaryogacrm.b-cdn.net/avatar/renders/output.mp4',
      durationSeconds: 4.2,
    });
    expect(completed.status).toBe('completed');
    expect(completed.videoUrl).toBe('https://swaryogacrm.b-cdn.net/avatar/renders/output.mp4');
  });
});
