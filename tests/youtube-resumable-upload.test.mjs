import test from 'node:test';
import assert from 'node:assert/strict';
import { ytUpload } from '../scripts/youtubeResumableUpload.mjs';

test('YouTube resumable upload sends an explicit complete byte range', async () => {
  const calls = [];
  const fetchImpl = async (url, options = {}) => {
    calls.push({ url, options });
    if (calls.length === 1) {
      return new Response(null, { status: 200, headers: { location: 'https://upload.youtube.test/session' } });
    }
    if (calls.length === 2) {
      return new Response(new Uint8Array([1, 2, 3, 4]), { status: 200, headers: { 'content-type': 'video/mp4' } });
    }
    return new Response(JSON.stringify({ id: 'uploaded-video-id' }), { status: 201 });
  };

  const id = await ytUpload('access-token', 'https://zoom.test/recording', 4, 'Workshop', 'Recording', fetchImpl);

  assert.equal(id, 'uploaded-video-id');
  assert.equal(calls[0].options.headers['X-Upload-Content-Length'], '4');
  assert.equal(calls[2].options.headers['Content-Length'], '4');
  assert.equal(calls[2].options.headers['Content-Range'], 'bytes 0-3/4');
  assert.equal(calls[2].options.headers['Content-Type'], 'video/mp4');
  assert.equal(calls[2].options.duplex, 'half');
});

test('YouTube upload initialization errors remain explicit', async () => {
  const fetchImpl = async () => new Response('quota exceeded', { status: 403 });
  await assert.rejects(
    ytUpload('access-token', 'https://zoom.test/recording', 4, 'Workshop', 'Recording', fetchImpl),
    /yt init 403 quota exceeded/,
  );
});
