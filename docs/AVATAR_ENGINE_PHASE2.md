# Avatar Engine Phase 2: Speech-to-Render Queue

## What is implemented

- Video requests require an existing avatar profile with a valid consent record that matches the profile owner and name.
- Avatar source images and completed render URLs must use HTTPS on the configured Bunny CDN host.
- Speech is synthesized and stored on Bunny before a render job becomes claimable.
- The final render job carries the same voice, language, speed, and pitch settings used for the speech preview.
- Render jobs persist in `studio_inhouse_render_jobs_sql`; job status does not become `completed` until an authenticated worker reports a finished Bunny video.
- The worker API supports claim, lease heartbeat, completion, and failure actions. Claims use unique tokens, and stale leases can be reclaimed without allowing an older claim to complete the job.
- `scripts/inhouse-avatar-worker.py` polls the worker API and forwards jobs to a separately hosted GPU inference adapter. The adapter must return `video_url` (and may return `duration_seconds`).
- Speech previews currently use Edge TTS. The configured voices are not voice clones, and text-derived viseme frames are approximate rather than phoneme-aligned.
- Consent is an explicit administrator declaration recorded with an integrity hash. It is not external identity verification or a legal determination.

## GPU adapter contract

The worker sends an HTTPS JSON request to `AVATAR_INFERENCE_URL` with:

- `job_id`, `avatar_profile_id`, `source_image_url`, `audio_url`, and `script`
- `voice_id`, `language`, `background_id`, `clothing_id`, and `posture`
- `speech_speed` and `speech_pitch_hz`
- an MP4/Bunny CDN output requirement

The inference adapter authenticates with `AVATAR_INFERENCE_TOKEN` and must finish rendering before responding with JSON:

```json
{
  "video_url": "https://<configured-bunny-cdn-host>/avatar/renders/<job>.mp4",
  "duration_seconds": 12.4
}
```

The web server separately requires `AVATAR_WORKER_TOKEN` for `/api/avatar/inhouse/worker`. These tokens must be independent, private server/worker configuration; do not put them in the browser or commit them. The GPU adapter must upload its output to Bunny before returning the URL.

## Runtime configuration

Configure these only in the relevant server environments:

- Web/API: `AVATAR_WORKER_TOKEN`, `BUNNY_STORAGE_CDN_HOST`
- GPU worker: `SWAR_API_BASE_URL`, `AVATAR_WORKER_TOKEN`, `AVATAR_WORKER_ID`, `AVATAR_INFERENCE_URL`, `AVATAR_INFERENCE_TOKEN`
- Optional worker controls: `AVATAR_WORKER_POLL_SECONDS`, `AVATAR_INFERENCE_TIMEOUT_SECONDS`

Run the worker on an external GPU host, not the Contabo web VPS. It exits with an explicit configuration error if required worker or inference credentials are absent. Worker/API and inference connectivity should use HTTPS.

## Not yet production-complete

- No GPU inference adapter, model weights, or external GPU host is configured by this change. Without those, jobs remain `ready_for_worker` and the UI does not claim that a video was generated.
- Voice cloning, model training, phoneme alignment, face restoration during rendering, automated quality scoring, C2PA provenance, and signed output watermarking remain future work.
- Before production inference, select exact model versions and verify both code and weight licenses for the intended commercial use. Obtain an authorized GPU adapter implementation and run a consented, low-resolution end-to-end render before scaling.
