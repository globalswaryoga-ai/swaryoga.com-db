# Avatar Engine Phase 2: Speech-to-Render Queue

## What is implemented

- The standalone Avatar Studio Video Library idempotently adds the seven user-provided Bunny workshop recordings as selectable Mohan Sir twin-look source entries on first library load. They are labeled as source recordings, not generated AI twins; the original videos are not copied, and duration, language, resolution, consent, and identity are not verified by the library.
- A Bunny SQL seed-state row prevents deleted source entries from being re-added on later refreshes. Other library rows are left unchanged.
- The library count is shown only after a successful authenticated read; missing/expired Super Admin sessions and non-JSON API failures are reported explicitly instead of showing an empty-library count or a JSON parse error.
- Bunny Stream player previews use Bunny's `iframe.mediadelivery.net/embed/{libraryId}/{videoId}` host/path; an HTTP 200 response from that URL only confirms the player page responds, not that the video is authorized or playable.
- Video requests require an existing avatar profile with a valid consent record that matches the profile owner and name.
- Avatar source images and completed render URLs must use HTTPS on the configured Bunny CDN host.
- Speech is synthesized and stored on Bunny before a render job becomes claimable.
- The final render job carries the same voice, language, speed, and pitch settings used for the speech preview.
- Render jobs persist in `studio_inhouse_render_jobs_sql`; job status does not become `completed` until an authenticated worker reports a finished Bunny video.
- The worker API supports claim, lease heartbeat, completion, and failure actions. Claims use unique tokens, and stale leases can be reclaimed without allowing an older claim to complete the job.
- Every new job requires a continuous, authorized Bunny-hosted MP4 source video in addition to the consented avatar profile image. Source-image-only jobs are rejected, and jobs without a source video are not claimable.
- `scripts/inhouse-avatar-worker.py` polls the worker API and forwards both `source_video_url` and `audio_url` to a separately hosted GPU inference adapter. The adapter must return `video_url` (and may return `duration_seconds`).
- Speech previews currently use Edge TTS. The configured voices are not voice clones, and text-derived viseme frames are approximate rather than phoneme-aligned.
- Consent is an explicit administrator declaration recorded with an integrity hash. It is not external identity verification or a legal determination.
- `scripts/avatar-gpu-adapter-server.py` is currently a health/protocol scaffold. It has no neural inference implementation and returns HTTP 501 for authenticated render requests; it cannot complete jobs.
- The legacy `scripts/run_60s_acceptance_milestone.py`, `scripts/run_acceptance_test_pipeline.py`, and `scripts/compile_and_upload_acceptance_video.py` were replaced with fail-closed notices. They only looped/muxed media and/or compiled static frames; they were not neural inference and could not establish avatar acceptance. Do not run or use their former outputs as twins.
- The selected pilot approach is to lip-sync generated workshop speech onto each corresponding authorized outfit recording. This reuses the recorded clothing; it does not synthesize or transfer a new outfit. No Colab runtime or worker/inference secrets are connected in the current environment.
- `colab/Mohan_Sir_Workshop_Twin_Pilot_Preflight.ipynb` is a new, setup-only notebook for GPU inspection and authenticated Bunny Stream source metadata/download checks. It does not install models, retrieve checkpoints, run inference, launch a worker, or upload output. The existing disabled worker notebook remains untouched.
- The legacy Colab/Kaggle avatar notebooks and generators are retired. They are not an alternate renderer or upload workflow; use only a future reviewed, authenticated GPU adapter.
- `colab/Swar_AI_Avatar_Neural_GPU_Worker.ipynb` is a disabled workspace notebook. Its credential-bearing and worker-launch cells were removed; it now fails closed instead of installing packages, downloading code, or starting a worker. It is not a renderer and must not be used to claim video generation. Rotate any credentials that were exposed before this cleanup.
- The existing sample clips inspected for this phase are not approved input footage: sampled frames show composited/promotional imagery, and continuous source motion, identity provenance, and authorization have not been established.

## GPU adapter contract

The worker sends an HTTPS JSON request to `AVATAR_INFERENCE_URL` with:

- `job_id`, `avatar_profile_id`, `source_image_url`, `source_video_url`, `audio_url`, and `script`
- `voice_id`, `language`, `background_id`, `clothing_id`, and `posture`
- `speech_speed` and `speech_pitch_hz`
- an MP4/Bunny CDN output requirement

The eventual inference adapter must authenticate with `AVATAR_INFERENCE_TOKEN`, run an approved inference pipeline, upload and verify the resulting Bunny object, and only then respond with JSON:

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

Run the worker on an external GPU host, not the Contabo web VPS. It exits with an explicit configuration error if required worker or inference credentials are absent. Worker/API and inference connectivity should use HTTPS. The current adapter returning 501 is intentional: it prevents the still-image/audio mux demo from being accepted as a neural avatar render.

## Not yet production-complete

- No production GPU inference adapter, model weights, or external GPU host has been verified. With the current scaffold, jobs fail explicitly rather than being marked completed with a still-image mux.
- MuseTalk 1.5 remains a candidate only. Upstream code and model card identify MIT; the model card says its checkpoint may be used commercially and documents Python >=3.10/CUDA 11.7, with a 30+ fps claim on an NVIDIA V100. These are upstream statements, not independent legal clearance or measured runtime results. The cited pipeline includes S3FD without a license identifier in its upstream license inventory and was trained on HDTF plus a private dataset; associated rights/provenance still require review.
- Candidate Hugging Face revision: `2bcb936e2fddb4d86db4c62fd45b387d0c061571`. The MuseTalk 1.5 `unet.pth` LFS metadata advertises SHA-256 `7ebf6c98c181e20838e4c0054e96e944ac60d5d692cc01db42839fe11b787007` (3,400,074,924 bytes). The checkpoint was not downloaded; the digest was not verified locally and the model is not installed.
- This environment has no PyTorch/CUDA device and no connected Colab/Kaggle or external GPU session. Worker/inference endpoint and token settings are absent from process and `.env.local` configuration; no authenticated HTTPS inference endpoint or remote GPU secret store was verified. The local `.env.local` has Bunny storage configuration, but no output was uploaded or read back.
- No authorized continuous source footage was supplied or approved for this run. No Hindi neural video was rendered; GPU model/VRAM/utilization and inference time are unknown, and there is no output URL or acceptance log.
- A read-only repository/history scan found hardcoded Meta Graph credentials in tracked `.claude/settings.json` and reachable Git history, including commit `7f80b353df762a823f3f55d8afbbd55673ccc37c`. Eight credential-bearing command permissions were removed from the current file without reproducing values. Provider-side revoke/rotation has not been performed, and historical copies remain. Do not rewrite shared Git history without repository-owner approval and coordination.
- The Colab notebook remains disabled and was not executed. No dependencies or model weights were installed and no GPU/API/Bunny calls were made.
- The current source-video UI accepts a Bunny-hosted MP4 URL but does not itself verify the clip's continuity, identity, authorization, frame quality, or duration. These require human review and inference-time QA.
- Selecting a workshop source in the Video Library marks it as reference media for the existing handoff; it does not train a look-specific model or generate a workshop avatar. The configured GPU adapter still returns HTTP 501.
- Voice cloning, model training, phoneme alignment, face restoration during rendering, automated quality scoring, C2PA provenance, and signed output watermarking remain future work.
- Before production inference, resolve S3FD and training-data rights, obtain an authorized GPU session and secure credentials, and provide approved continuous footage. Then implement and test the adapter against a pinned model revision before any completion claim.

Model references:
- MuseTalk code: https://github.com/TMElyralab/MuseTalk
- MuseTalk weights/model card: https://huggingface.co/TMElyralab/MuseTalk
- MuseTalk dependency license inventory: https://huggingface.co/TMElyralab/MuseTalk/blob/main/LICENSE.txt
- MuseTalk S3FD implementation: https://github.com/yxlijun/S3FD.pytorch

## MuseTalk GPU acceptance pilot

The 10-second GPU acceptance pilot is documented in [MUSETALK_GPU_ACCEPTANCE_REPORT.md](./MUSETALK_GPU_ACCEPTANCE_REPORT.md) and remains **BLOCKED**. The user approved YuNet in place of S3FD and an experimental DWPose-landmark-derived geometric mask in place of the unclear face-parsing checkpoint for this isolated pilot only; neither has been downloaded, implemented, or tested. The user confirms approved matched inputs are available, but they are not accessible in this environment. No authorized NVIDIA GPU session or Bunny upload/read-back is available. A pre-existing local MP4 candidate has container metadata only and is not accepted as proof of MuseTalk inference.
