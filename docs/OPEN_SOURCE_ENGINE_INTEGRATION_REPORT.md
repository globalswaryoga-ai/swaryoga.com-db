# Open-Source Avatar Engine Integration Report

## Executive summary

Seven upstream projects were shallow-cloned for source and license inspection. The copies are isolated under [`research/open-source-avatar-engines/`](../research/open-source-avatar-engines/); each clone is pinned to the commit recorded below. No project installer, dependency installation, model download, or inference command was run. No production application code, database, credentials, or Blender assets were changed.

**No project passed an inference test in this environment.** The current machine is macOS/Apple Silicon with Python 3.15.2, Node.js 25.2.1, and Blender 5.2.3; it has no NVIDIA GPU, CUDA toolkit, or `nvidia-smi`. The existing render queue and worker protocol are the right integration boundary; the current GPU adapter remains a protocol scaffold that returns HTTP 501. No remote GPU session or external worker was tested.

**Recommendation:** do not import any complete app or switch the production queue. After approval, evaluate MuseTalk as a separately hosted lip-sync adapter, subject to a checkpoint/dependency/data rights review and an actual GPU acceptance test. Consider MMPose only for a specifically selected pose-estimation/retargeting need. Do not use PoseCap’s SMPL/SMPL-X/FLAME assets in commercial work without a separate commercial license. The other systems are better treated as architecture references or optional future experiments than as replacements for the existing Bunny-backed workflow.

This is a technical source review, not legal advice. A permissive repository license does not automatically clear its downloaded checkpoints, training data, face detectors, or dependent models for commercial use.

## Existing Swar Yoga integration boundary

- The current web app is Next.js App Router; render jobs and consent checks are in [`lib/avatarEngine/inhouseRenderQueue.ts`](../lib/avatarEngine/inhouseRenderQueue.ts), and the worker is [`scripts/inhouse-avatar-worker.py`](../scripts/inhouse-avatar-worker.py).
- The adapter in [`scripts/avatar-gpu-adapter-server.py`](../scripts/avatar-gpu-adapter-server.py) deliberately returns HTTP 501. A render must not be reported complete until real inference produces and uploads an MP4.
- Existing storage and database remain Bunny SQL/Storage. The Contabo VPS is not a suitable location for neural GPU inference.
- This review proposes adapters to the current queue, not adoption of another project's database, authentication, deployment scripts, or frontend.

## Repository inventory and method

All repositories were cloned with shallow history from their stated GitHub origins. The recorded revision is the checked-out `HEAD`; upstream may change after this review. License and hardware statements below are attributed to the cloned source unless otherwise noted.

| Project | Isolated copy | Reviewed revision |
|---|---|---|
| AvatarAI | [`avatarai/`](../research/open-source-avatar-engines/avatarai/) | `0dee976c229b2b6d274f8d04784d7e5be964d7b6` |
| Mynah | [`mynah/`](../research/open-source-avatar-engines/mynah/) | `9f91446343f893218e1380292815437437a22380` |
| MuseTalk | [`musetalk/`](../research/open-source-avatar-engines/musetalk/) | `0a89dec45a0192b824e3cf4daf96c239440c5ed8` |
| LivePortrait | [`liveportrait/`](../research/open-source-avatar-engines/liveportrait/) | `9b294b3d0536135442ea73cb01e6cb3ca7029dd3` |
| PoseCap | [`posecap/`](../research/open-source-avatar-engines/posecap/) | `626701bd6315727e791cdc9c1353830b9492d6ee` |
| MMPose | [`mmpose/`](../research/open-source-avatar-engines/mmpose/) | `759b39c13fea6ba094afc1fa932f51dc1b11cbf9` |
| LiveTalking | [`livetalking/`](../research/open-source-avatar-engines/livetalking/) | `c7269433a2b6ecebcd9342445d2ecc882c98b0da` |

The clones contain source and documentation, not the avatar checkpoints needed for inference. Mynah includes its documented Smart Turn ONNX model, which is not an avatar-generation weight. No large-file/model fetch or `git lfs pull` was performed. No tests were run: doing so would require project-specific environments, dependencies, and in some cases GPU weights that have not been approved.

## Project evaluations

### 1. AvatarAI — evaluate further; do not import wholesale

- **What it does:** A web application for conversational talking avatars: FastAPI backend, a Next.js 16 frontend, WebSockets, LLM/TTS/STT, and a persistent MuseTalk worker. It is an application/platform rather than a single avatar model. See its [README](../research/open-source-avatar-engines/avatarai/README.md).
- **Files and models:** The checked-in structure includes `backend/app/`, `frontend/`, `backend/models/MuseTalk/`, `scripts/setup_musetalk.sh`, Docker Compose, and AWS Terraform. Its documented setup downloads about 9 GB of MuseTalk assets; optional Chatterbox TTS requires a separate environment because the pinned Torch/Transformers stacks conflict. It also documents Whisper, optional GFPGAN, and an optional LiveAvatar engine.
- **License and commercial caveats:** The repository's own code declares MIT in [`LICENSE`](../research/open-source-avatar-engines/avatarai/LICENSE). That does not grant rights to every model/weight fetched by its setup scripts. MuseTalk needs the separate review below; the cloned README does not constitute a complete third-party model/data license bill of materials. Chatterbox and LiveAvatar require their own exact code, checkpoint, and data-term review before use.
- **Hardware and compatibility:** The README recommends NVIDIA A10G 24 GB or L4 24 GB for its stated ~30 FPS MuseTalk target; it lists 16–24 GB for the MuseTalk engine. These are upstream claims, not reproduced measurements. The app expects Docker, PostgreSQL, Redis, S3/CloudFront-oriented storage, Python 3.10+, and Next.js 16. That frontend/database/storage/deployment stack conflicts with the existing Next.js 14 and Bunny SQL/Storage design.
- **Installation and tests:** Source-only clone. No install or tests run; no avatar model weights fetched.
- **Integration complexity:** High for the whole platform; medium for isolating its MuseTalk persistent-worker idea behind the existing HTTPS adapter. Importing the whole app would duplicate auth, queue, storage, frontend, and operations.
- **Disposition:** **Evaluate further as a code/architecture reference only.** Do not merge the app. A component-level MuseTalk trial is more direct and smaller.

### 2. Mynah — evaluate further for realtime streaming, not the batch renderer

- **What it does:** Go-based WebRTC streaming core with gRPC avatar/TTS/ASR/LLM worker contracts, control plane, admin console, channel publishing, and selectable avatar engines. See its [README](../research/open-source-avatar-engines/mynah/README.md).
- **Files and models:** The clone includes `cored`, Python worker wrappers, Compose files, and [`LICENSING.md`](../research/open-source-avatar-engines/mynah/LICENSING.md). The default FlashHead engine is fetched separately; MuseTalk 1.5 is another option. The source also contains an ONNX Smart Turn model. Optional paths include wav2lipLS, HuBERT, LivePortrait, and Qwen3-TTS/SenseVoice; each artifact must be evaluated independently.
- **License and commercial caveats:** Mynah's own code and wrappers declare Apache-2.0. Its licensing inventory says FlashHead code/weights are Apache-2.0, with a specific LTX-Video VAE terms caveat for the lite variant. Its optional LivePortrait path must avoid InsightFace's non-commercial detector weights (the inventory suggests `flag_do_crop=False` or a separately licensed crop). Its published wav2lipLS weights are described by Mynah as commercial-use granted, but any retraining depends on training-data rights. These are upstream assertions, not independent legal clearance. Verify all exact weight versions and transitive licenses before use.
- **Hardware and compatibility:** Mynah documents NVIDIA GPUs, 6 GB for its light wav2lipLS profile, 12 GB for MuseTalk or FlashHead, and 24 GB to run both; the README also calls the default FlashHead deployment “4090-class,” so capacity claims need a pinned configuration and measured test. CPU-only networking/control components can be remote from the avatar worker. The current local environment cannot run the GPU path.
- **Installation and tests:** Source-only clone; no setup wizard, Compose, model script, or test run. No avatar weights fetched.
- **Integration complexity:** High if adopting the realtime product (Go core, gRPC, WebRTC, control plane); medium if using only a compatible, independently deployed engine. It does not natively replace the current Bunny-backed offline job/lease protocol.
- **Disposition:** **Evaluate further only if realtime interactive streaming becomes a requirement.** For current queued MP4 rendering, keep the existing queue and consider only an engine adapter.

### 3. MuseTalk — leading lip-sync candidate, blocked pending rights and GPU validation

- **What it does:** Audio-driven mouth-region generation/compositing against a source video. It is not a 3D face reconstruction model, full-body animator, voice generator, or environment renderer. See upstream [README](../research/open-source-avatar-engines/musetalk/README.md) and [repository](https://github.com/TMElyralab/MuseTalk).
- **Files and models:** The documented pipeline needs MuseTalk v1.5 `unet.pth`/configuration plus SD VAE, Whisper Tiny, DWPose, SyncNet, face parsing, and ResNet assets; see `models/` tree and download guidance in the README. The project recommends 25 fps input and accepts video/audio paths. The cited model card/repository describes MuseTalk 1.5 as trained on HDTF plus a private dataset. No weights were downloaded or checksum-verified for this review.
- **License and commercial caveats:** The cloned source `LICENSE` is MIT, and upstream model information says the checkpoint can be used commercially. This is not a complete clearance of every submodel or dependency: the previous Phase 2 audit identified S3FD without a clear license identifier in its upstream inventory, and dataset provenance/rights are not fully established from this clone. Independently clear the exact checkpoint revision, S3FD, face-parsing, DWPose, SyncNet, VAE, Whisper and training-data terms before production.
- **Hardware and compatibility:** Upstream recommends Python 3.10 and CUDA 11.7, with PyTorch 2.0.1 examples using CUDA 11.8. The README reports 30+ fps on a Tesla V100 and also reports an RTX 3050 Ti laptop with 4 GB running an 8-second FP16 clip in about five minutes. These figures are upstream-reported, not tested here; no single VRAM number guarantees quality, concurrency, or 1080p output. Plan a dedicated NVIDIA worker, initially 16–24 GB VRAM for practical headroom, then measure against a pinned environment.
- **Installation and tests:** Source-only clone. No Python dependencies installed, model script executed, checkpoint fetched, or inference/test run.
- **Integration complexity:** Medium. It fits the current worker's `source_video_url` + `audio_url` adapter contract, but needs hardened model packaging, input/output validation, authenticated HTTPS, Bunny upload, timeout/lease handling, and actual quality tests.
- **Disposition:** **Evaluate for an isolated, approved pilot after license clearance.** It is the closest listed component to the first real neural-render milestone, but it does not satisfy the requested full 3D twin.

### 4. LivePortrait — optional head-motion/portrait-animation research; conditional on model path

- **What it does:** Animates a source portrait or portrait video using a driving video or motion template. It can transfer head pose and expression, but the reviewed inference flow is not direct audio-to-viseme lip sync. See upstream [README](../research/open-source-avatar-engines/liveportrait/README.md).
- **Files and models:** Inference uses `inference.py` and downloaded `pretrained_weights/`; animal mode additionally uses X-Pose and a compiled custom operator. The clone contains neither those inference weights nor a test output. The human path can drive an image/video with a driving clip or a precomputed motion template.
- **License and commercial caveats:** The repository license is MIT but explicitly warns that InsightFace code is MIT while its models are non-commercial research only; its README recommends replacing/removing InsightFace detection models for commercial use. The exact LivePortrait pretrained checkpoint grant should also be verified for the selected Hugging Face revision; a repo-level MIT license alone is not sufficient evidence for every artifact.
- **Hardware and compatibility:** README examples pair Torch 2.3.0 with CUDA 11.8 or 12.1 and Python 3.10. It supports Apple Silicon MPS for humans but warns it may be about 20× slower than an RTX 4090. No official minimum VRAM was established from the reviewed docs; animal mode has additional CUDA/X-Pose requirements.
- **Installation and tests:** Source-only clone; no weights, dependencies, custom operators, or inference tests run.
- **Integration complexity:** Medium/high. Could be an independent face-motion stage, but it requires a driving-motion source, commercial crop/detector path, identity/temporal QA, and blending with the current video or future 3D rig. It does not generate a textured 3D head.
- **Disposition:** **Evaluate further only for a separately scoped head-motion experiment.** Do not put the default InsightFace path or unverified checkpoints into commercial production.

### 5. PoseCap — reject for current commercial motion pipeline

- **What it does:** Early-development Blender markerless mocap: a webcam/video pose-estimation bridge drives Blender keyframes. Its current output/contract centers on SMPL-X pose parameters, not prompt-to-motion generation. See its [README](../research/open-source-avatar-engines/posecap/README.md).
- **Files and models:** Blender add-on (`addon/`), contracts/core/engine bridge, PEAR pose-estimation backend and SMPL/SMPL-X/FLAME body models. The models are not distributed in the repo; their setup guide obtains them from their rights holders.
- **License and commercial caveats:** This is a split-license project: Blender add-on GPL-3.0; contracts/core/engine Apache-2.0. More importantly, its README states MPI SMPL/SMPL-X/FLAME models are research/non-commercial and commercial use requires a separate Meshcapade license. PEAR has its own model/code terms that must be checked. The GPL add-on also creates a distribution/license compatibility review for this private product.
- **Hardware and compatibility:** Current compatibility table targets Windows 10/11, Blender 4.2+, Python 3.11. Its PEAR path documents NVIDIA/CUDA, driver R570+, qualified on RTX 3080; MediaPipe Lite offers a CPU-first path. macOS is not currently planned for the engine bridge.
- **Installation and tests:** Source-only clone; no installer, body model, PEAR model, dependencies, or tests run. The project itself labels its status early development/first installable preview.
- **Integration complexity:** High for this use: Blender add-on and rig/model assumptions differ from the current Rigify work; markerless capture is not prompt-driven animation.
- **Disposition:** **Reject as the commercial avatar/body-model dependency.** Revisit only if separately licensed compatible models are secured and there is a specific mocap capture requirement.

### 6. MMPose — optional pose-estimation toolbox; not a motion generator

- **What it does:** PyTorch toolbox for 2D/3D body, hand, face, and whole-body keypoint estimation. It provides pose detections, not prompt-to-motion generation, identity reconstruction, facial animation, or automatic retargeting. See the [README](../research/open-source-avatar-engines/mmpose/README.md).
- **Files and models:** The repo contains `configs/`, `mmpose/`, dataset/model indexes, and OpenMMLab installation requirements. A real deployment must select one config and checkpoint and fetch any needed detector, pose weights, and runtime packages; the repo does not supply a universal “MMPose model.” It may require MMEngine, MMCV, and optionally MMDetection.
- **License and commercial caveats:** The toolbox code declares Apache-2.0. The clone's [`LICENSES.md`](../research/open-source-avatar-engines/mmpose/LICENSES.md) lists EDPose files under IDEA License 1.0; avoid those unless terms are separately cleared. Model checkpoints, training datasets, and each algorithm/config need their own rights review. Apache for the toolbox is not a blanket checkpoint/data license.
- **Hardware and compatibility:** Python package metadata says Python >=3.7 and the README says main branch works with PyTorch 1.8+; these broad/older declarations do not establish compatibility with Python 3.15 or a current CUDA/Torch build. There is no single VRAM requirement; it depends on model/config/resolution and can vary from CPU-capable to GPU-intensive. Use a dedicated pinned Python environment if tested.
- **Installation and tests:** Source-only clone; no OpenMMLab packages, checkpoint, config inference, or tests run.
- **Integration complexity:** Medium/high. Can provide keypoints for a capture-to-Rigify retargeting stage, but coordinate conventions, temporal smoothing, calibration, and retargeting remain custom work. It overlaps existing face/body landmark tooling and should not be added without a measurable use case.
- **Disposition:** **Evaluate further for a narrowly defined pose-extraction task.** Do not treat it as prompt-to-motion or as a complete motion solution.

### 7. LiveTalking — evaluate as an alternative realtime streamer, not as the current renderer

- **What it does:** Python real-time avatar streaming with WebRTC/RTMP/virtual-camera transports, TTS, interruption, recording APIs, and multiple avatar engines including MuseTalk and Wav2Lip. See upstream [English README](../research/open-source-avatar-engines/livetalking/README-EN.md).
- **Files and models:** `app.py`, transport/API code, engine adapters and `requirements.txt`; the README's Wav2Lip example requires an externally obtained `wav2lip256.pth` and avatar asset archive. MuseTalk and other engine weights must also be fetched separately. No inference weights were downloaded.
- **License and commercial caveats:** Project code declares Apache-2.0. The README does not provide a complete commercial license grant for every external checkpoint. The Wav2Lip checkpoint is not approved here: classic upstream Wav2Lip weights are a known non-commercial risk, so do not download/use that checkpoint without evidence of a separate commercial grant. MuseTalk assets still require the separate audit above. A paid commercial edition is also described in the README; this does not change the checked-in source license but warrants careful separation of community and paid features.
- **Hardware and compatibility:** README says tested on Ubuntu 24.04, Python 3.12, PyTorch 2.9.1, CUDA 12.8; reports RTX 3060 or higher for Wav2Lip and RTX 3080 Ti or higher for MuseTalk. Reported rates include 42 fps on RTX 3080 Ti / MuseTalk and 72 fps on RTX 4090; these are upstream claims, not reproduced. Its networking docs expose WebRTC/RTMP transports and broad UDP port requirements that need security/network review.
- **Installation and tests:** Source-only clone; no dependencies, model downloads, service launch, or tests run.
- **Integration complexity:** High for adopting its streaming server and network stack; medium for studying individual engine adapters. It overlaps Mynah's realtime function and does not provide the current Bunny SQL claim/lease/completion integration.
- **Disposition:** **Evaluate further only if realtime streaming is prioritized.** Do not use the unverified Wav2Lip weights or replace the existing queue for offline MP4 jobs.

## Recommendation for a modular Digital Twin Studio

1. **Keep the existing product boundary:** Next.js UI → authenticated Bunny SQL queue/consent checks → external GPU worker → authenticated inference adapter → Bunny Storage → queue completion after upload verification. Do not import another project's database or control plane.
2. **First pilot:** MuseTalk 1.5 is the most targeted listed lip-sync component. Before installation, resolve the exact checkpoint and all supporting model/dependency/data terms, select a supported Python/CUDA/Torch matrix, provision a dedicated GPU, pin hashes, and pass an actual short-video acceptance test. It is not yet approved/operational in this repo.
3. **Motion:** Use the existing Blender/Rigify character as the destination rig. Evaluate MMPose only if motion capture/pose extraction is needed, then build and test explicit retargeting to that rig. None of the seven projects is a cleared prompt-to-yogic-motion generator. PoseCap is unsuitable until body-model commercial rights are secured.
4. **Face/head motion:** Consider LivePortrait only after a commercial face-detection/crop path and exact weights are approved. It can add driven portrait movement, but does not reconstruct a 3D head or replace speech lip sync.
5. **Product-level realtime option:** If two-way WebRTC interaction becomes a requirement, compare Mynah and LiveTalking in a separate architecture decision. Do not install both into the batch renderer; their streaming cores duplicate one another and the existing queue solves a different job.
6. **3D face and scenes:** None of the reviewed projects supplies a cleared, production-ready reconstruction of an authorized textured 3D face connected to the existing body, nor a full realistic 3D scene renderer. This remains a separate engineering and model/data rights task.

## Status and blockers

| Area | Finding |
|---|---|
| Source inspection | Complete for the seven shallow-cloned snapshots |
| License review | Initial source/model-document review only; not legal clearance; exact checkpoints, dependencies, datasets and third-party assets remain to be cleared |
| Installation / tests | Not run; no environment changes made |
| Local GPU | Unavailable (macOS/Apple Silicon; no NVIDIA/CUDA tooling) |
| Remote GPU / authenticated endpoint | Not tested or configured in this review |
| Production code / Bunny data | Unchanged |
| Actual rendered video | None generated or uploaded by this review |
| Production integration | **Not approved or performed**; awaiting user approval of a selected pilot |

## Primary upstream references

- [AvatarAI repository](https://github.com/PunithVT/ai-avatar-system) — [README](../research/open-source-avatar-engines/avatarai/README.md), [`LICENSE`](../research/open-source-avatar-engines/avatarai/LICENSE)
- [Mynah repository](https://github.com/honwee/mynah) — [README](../research/open-source-avatar-engines/mynah/README.md), [licensing inventory](../research/open-source-avatar-engines/mynah/LICENSING.md)
- [MuseTalk repository](https://github.com/TMElyralab/MuseTalk) — [README](../research/open-source-avatar-engines/musetalk/README.md), [`LICENSE`](../research/open-source-avatar-engines/musetalk/LICENSE), [model repository](https://huggingface.co/TMElyralab/MuseTalk)
- [LivePortrait repository](https://github.com/KlingAIResearch/LivePortrait) — [README](../research/open-source-avatar-engines/liveportrait/README.md), [`LICENSE`](../research/open-source-avatar-engines/liveportrait/LICENSE)
- [PoseCap repository](https://github.com/CorridorTech/PoseCap) — [README](../research/open-source-avatar-engines/posecap/README.md), [license split ADR](../research/open-source-avatar-engines/posecap/doc/adr/0006-license-split-gpl-addon-apache-libraries.md)
- [MMPose repository](https://github.com/open-mmlab/mmpose) — [README](../research/open-source-avatar-engines/mmpose/README.md), [special algorithm licenses](../research/open-source-avatar-engines/mmpose/LICENSES.md)
- [LiveTalking repository](https://github.com/lipku/LiveTalking) — [English README](../research/open-source-avatar-engines/livetalking/README-EN.md), [`LICENSE`](../research/open-source-avatar-engines/livetalking/LICENSE)
