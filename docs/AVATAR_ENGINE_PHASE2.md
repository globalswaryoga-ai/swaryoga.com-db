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
- `scripts/avatar-gpu-adapter-server.py` now implements the full render pipeline (download source video/audio → 16 kHz WAV conversion → pilot MuseTalk inference via `scripts/musetalk_pilot/run_inference_pilot.py` → Bunny Storage upload → storage and CDN read-back verification) and responds with the contract `video_url`/`duration_seconds` JSON. It fails closed at every step: missing weights/config return 503, inference that produces no output returns 500, and read-back mismatch returns 502. It never muxes or fakes a render. The pilot inference path uses the user-approved replacements only (YuNet face detector instead of S3FD; landmark-derived geometric mask instead of the BiSeNet face-parse checkpoint) and downloads only approved weights via `scripts/musetalk_pilot/download_pilot_weights.py` with SHA-256 recording. No GPU run has been executed yet — acceptance still requires an actual run on an authorized GPU session (see `colab/MuseTalk_GPU_Acceptance_Pilot.ipynb`).
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

Run the worker on an external GPU host, not the Contabo web VPS. It exits with an explicit configuration error if required worker or inference credentials are absent. Worker/API and inference connectivity should use HTTPS. The adapter still refuses any render that cannot be proven as neural inference: it verifies the inference output file exists with non-zero duration and reads the uploaded object back from Bunny storage and CDN before responding, so a mux demo can never complete a job.

## Not yet production-complete

- The adapter implementation and pilot tooling exist in-repo (`scripts/avatar-gpu-adapter-server.py`, `scripts/musetalk_pilot/`, `colab/MuseTalk_GPU_Acceptance_Pilot.ipynb`) and have been verified locally: `engine_ready` passes with the full weight set, and a 1-second CPU end-to-end inference produced a valid lip-synced mp4 through the approved replacements only (YuNet → DWPose → geometric jaw mask → UNet → SD-VAE → mux). No **GPU** inference run has been verified: no external GPU session is connected, and worker/inference endpoint and token settings are absent from process and `.env.local` configuration. Until a GPU pilot run passes with recorded evidence, jobs must continue to fail explicitly rather than be marked completed with a still-image mux.
- MuseTalk 1.5 remains a candidate only. Upstream code and model card identify MIT; the model card says its checkpoint may be used commercially and documents Python >=3.10/CUDA 11.7, with a 30+ fps claim on an NVIDIA V100. These are upstream statements, not independent legal clearance or measured runtime results. The cited pipeline includes S3FD without a license identifier in its upstream license inventory and was trained on HDTF plus a private dataset; associated rights/provenance still require review.
- Candidate Hugging Face revision: `2bcb936e2fddb4d86db4c62fd45b387d0c061571`. The MuseTalk 1.5 `unet.pth` LFS metadata advertises SHA-256 `7ebf6c98c181e20838e4c0054e96e944ac60d5d692cc01db42839fe11b787007` (3,400,074,924 bytes). All nine pilot-approved weights are downloaded on the dev machine and recorded in `pilot_weights_manifest.json` (`status: complete`); the `unet.pth` digest matches the expected hash. The weight store lives under the gitignored `research/` tree — Colab re-downloads via `download_pilot_weights.py`, which retries and re-verifies the same hashes.
- This environment has no PyTorch/CUDA device and no connected Colab/Kaggle or external GPU session. Worker/inference endpoint and token settings are absent from process and `.env.local` configuration; no authenticated HTTPS inference endpoint or remote GPU secret store was verified. No Bunny upload/read-back has occurred (no storage key in `.env.local`).
- The pilot source pair is selected and URL-verified: `avatar-twins/twin_1_video.mp4` (10.000 s, face clear at t=1 s and t=5 s) + `voice-clones/generated/mohan_voice_1794091814116_4zsq5.mp3` (9.792 s), both returning HTTP 200 on swaryoga.com, pre-filled in notebook cell 7. No GPU render of this pair has run yet; GPU model/VRAM/utilization and inference time are unknown, and there is no output URL or acceptance log.
- A read-only repository/history scan found hardcoded Meta Graph credentials in tracked `.claude/settings.json` and reachable Git history, including commit `7f80b353df762a823f3f55d8afbbd55673ccc37c`. Eight credential-bearing command permissions were removed from the current file without reproducing values. Provider-side revoke/rotation has not been performed, and historical copies remain. Do not rewrite shared Git history without repository-owner approval and coordination.
- The Colab notebook (`colab/MuseTalk_GPU_Acceptance_Pilot.ipynb`) is written, hardened for Python 3.12 (mmcv-lite wheel, `mmpose --no-deps`, `compat_stubs` for mmdet/xtcocotools/mmcv.ops, no torch downgrade), and pushed, but has not been executed. Running it requires the operator's Colab session with four Secrets (`BUNNY_STORAGE_ZONE_NAME`, `BUNNY_STORAGE_API_KEY`, `BUNNY_STORAGE_CDN_HOST`, `AVATAR_INFERENCE_TOKEN`) and network access to swaryoga.com/Hugging Face.
- The current source-video UI accepts a Bunny-hosted MP4 URL but does not itself verify the clip's continuity, identity, authorization, frame quality, or duration. These require human review and inference-time QA.
- Selecting a workshop source in the Video Library marks it as reference media for the existing handoff; it does not train a look-specific model or generate a workshop avatar. The configured GPU adapter implements the render pipeline and passes local readiness/fail-closed checks, but has not yet completed a job on a real GPU (no GPU session or Bunny credentials configured in this environment).
- Voice cloning, model training, phoneme alignment, face restoration during rendering, automated quality scoring, C2PA provenance, and signed output watermarking remain future work.
- Before production inference, resolve S3FD and training-data rights, obtain an authorized GPU session and secure credentials, and provide approved continuous footage. Then implement and test the adapter against a pinned model revision before any completion claim.

Model references:
- MuseTalk code: https://github.com/TMElyralab/MuseTalk
- MuseTalk weights/model card: https://huggingface.co/TMElyralab/MuseTalk
- MuseTalk dependency license inventory: https://huggingface.co/TMElyralab/MuseTalk/blob/main/LICENSE.txt
- MuseTalk S3FD implementation: https://github.com/yxlijun/S3FD.pytorch

## MuseTalk GPU acceptance pilot

The 10-second GPU acceptance pilot is documented in [MUSETALK_GPU_ACCEPTANCE_REPORT.md](./MUSETALK_GPU_ACCEPTANCE_REPORT.md) and remains **BLOCKED** pending a GPU run. The user approved YuNet in place of S3FD and an experimental landmark-derived geometric mask in place of the unclear face-parsing checkpoint for this isolated pilot only; both are **implemented** (`scripts/musetalk_pilot/face_detection.py`, `scripts/musetalk_pilot/geometric_face_parsing.py`) with an approved-weights-only downloader (`scripts/musetalk_pilot/download_pilot_weights.py`), import-compat shims (`scripts/musetalk_pilot/compat_stubs.py`), and an end-to-end Colab pilot notebook (`colab/MuseTalk_GPU_Acceptance_Pilot.ipynb`). Both replacements have now passed a **local CPU end-to-end smoke** (1 s clip → valid 1920×1080 h264+aac mp4 with audio-driven mouth motion, identity preserved), and all pilot weights are hash-verified, but neither replacement has been **tested on a GPU** yet. No authorized NVIDIA GPU session or Bunny upload/read-back has occurred. A pre-existing local MP4 candidate has container metadata only and is not accepted as proof of MuseTalk inference.
