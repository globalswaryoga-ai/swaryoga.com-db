import test from 'node:test';
import assert from 'node:assert/strict';
import { recordingComplete, finalizeRecording } from '../scripts/zoomRecordingArtifacts.mjs';

test('cleanup requires both YouTube views and Bunny Speaker plus MP3', () => {
  const result = { youtubeUrls: { speaker: 's', gallery: 'g' }, bunny: { speaker: 's', audio: 'a' } };
  assert.equal(recordingComplete(result), true);
  for (const key of ['speaker', 'gallery']) {
    assert.equal(recordingComplete({ ...result, youtubeUrls: { ...result.youtubeUrls, [key]: null } }), false);
  }
  for (const key of ['speaker', 'audio']) {
    assert.equal(recordingComplete({ ...result, bunny: { ...result.bunny, [key]: null } }), false);
  }
});

test('old two-video Bunny policy is insufficient for MP3 cleanup', () => {
  assert.equal(recordingComplete({ youtubeUrls: { speaker: 's', gallery: 'g' }, bunny: { speaker: 's', gallery: 'g' } }), false);
});

test('SQL failure prevents Zoom cleanup even after successful uploads', async () => {
  let deleted = false;
  const complete = { youtubeUrls: { speaker: 's', gallery: 'g' }, bunny: { speaker: 's', audio: 'a' } };
  await assert.rejects(finalizeRecording(complete, async () => { throw new Error('SQL unavailable'); }, async () => { deleted = true; }), /SQL unavailable/);
  assert.equal(deleted, false);
  const calls = [];
  await finalizeRecording(complete, async () => { calls.push('persist'); }, async () => { calls.push('cleanup'); });
  assert.deepEqual(calls, ['persist', 'cleanup']);
});
