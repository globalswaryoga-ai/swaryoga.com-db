# MuseTalk GPU Acceptance Pilot Report

**Status: BLOCKED — acceptance criteria not met.**

No MuseTalk inference was run in this session. No model checkpoints were downloaded, no GPU environment was accessed, no Bunny upload/read-back occurred, and no existing render was accepted as an inference result. The user approved YuNet plus an experimental DWPose-landmark-derived mask for an isolated pilot only. The pilot remains blocked until remaining license/dependency checks are resolved and an authorized GPU session is available.

## Scope and safeguards

- Read the [open-source engine integration report](./OPEN_SOURCE_ENGINE_INTEGRATION_REPORT.md), [Avatar Engine Phase 2 documentation](./AVATAR_ENGINE_PHASE2.md), and [Avatar Engine Evidence Audit](./AVATAR_ENGINE_EVIDENCE_AUDIT.md) before this review.
- Did not modify the frontend, database schema, authentication, render queue, Blender assets, production VPS, or any GPU-worker scripts.
- Did not run MuseTalk setup/download scripts, install packages, download weights, or use the disabled Colab notebook.
- Kept existing untracked render files untouched. An MP4 with `musetalk_acceptance` in its filename exists locally, but filename and container metadata cannot prove its generation process.

## Blockers

1. **Commercial rights gate is partially resolved for the proposed pilot.** The user approved YuNet (MIT) instead of S3FD and a custom DWPose-landmark-derived mask instead of the BiSeNet face-parsing checkpoint; both are pilot-only and untested. The unclear S3FD and BiSeNet assets must be excluded. YuNet's immutable artifact revision/hash and remaining dependency/training-data provenance review are not yet recorded.
2. **No authorized NVIDIA GPU is connected.** This machine is macOS 25.6 arm64 with Python 3.15.2. `nvidia-smi` and `nvcc` are unavailable. No GPU provider/session, inference endpoint, or worker secret configuration is present in the process environment.
3. **The matched input pair is not available in this environment.** The user confirms an approved source-video/audio pair is available, but has not provided or mounted the files or their consent/provenance record here.
4. **No Bunny acceptance evidence exists.** No pilot output was uploaded, read back, or playback-checked.

## Required model/checkpoint inventory

The upstream [`download_weights.sh`](../research/open-source-avatar-engines/musetalk/download_weights.sh) follows mutable `main` branches for most artifacts; it does not pin every model revision or record SHA-256 values. The report therefore does **not** invent hashes. Asset download is intentionally stopped pending rights review. The one MuseTalk checkpoint hash below is upstream LFS metadata recorded in the prior Phase 2 audit and has not been downloaded or locally verified.

| Asset / role | Source and requested artifact | Version/revision | License evidence and unresolved rights | SHA-256 status |
|---|---|---|---|---|
| MuseTalk 1.5 UNet; required generator | [TMElyralab/MuseTalk](https://huggingface.co/TMElyralab/MuseTalk), `musetalkV15/unet.pth` and `musetalkV15/musetalk.json` | Prior audit candidate revision `2bcb936e2fddb4d86db4c62fd45b387d0c061571`; source download script itself does not pin it | Upstream model card says MIT and states trained model can be used commercially. This does not grant rights to the other pipeline assets or training/test data. | Upstream LFS metadata recorded previously: `7ebf6c98c181e20838e4c0054e96e944ac60d5d692cc01db42839fe11b787007`, 3,400,074,924 bytes. Not fetched or verified here. |
| SD VAE; required latent encoder/decoder | [stabilityai/sd-vae-ft-mse](https://huggingface.co/stabilityai/sd-vae-ft-mse), `config.json`, `diffusion_pytorch_model.bin` | `main`, not pinned in upstream script | Model card declares MIT. It describes training/fine-tuning using LAION-Aesthetics and an unreleased LAION-Humans subset; obtain policy/legal review of provenance and intended deployment. | Not fetched; exact file revisions and SHA-256 unavailable. |
| Whisper Tiny; required audio feature model | [openai/whisper-tiny](https://huggingface.co/openai/whisper-tiny), config, weights, preprocessor config | `main`, not pinned | MuseTalk license inventory identifies Whisper as MIT and links OpenAI Whisper. Pin and verify the exact Hugging Face artifact/license before use. | Not fetched; no artifact hash. |
| DWPose; required preprocessing/pose landmarks | [yzd-v/DWPose](https://huggingface.co/yzd-v/DWPose), `dw-ll_ucoco_384.pth` | `main`, not pinned | The model card declares Apache-2.0. Exact checkpoint revision, upstream code dependencies, and training-data terms were not independently cleared. | Not fetched; no artifact hash. |
| S3FD; default face-box detector in MuseTalk preprocessing | [yxlijun/S3FD.pytorch](https://github.com/yxlijun/S3FD.pytorch); checkpoint URL embedded in [`sfd_detector.py`](../research/open-source-avatar-engines/musetalk/musetalk/utils/face_detection/detection/sfd/sfd_detector.py) | Repository branch is not pinned by that URL; checkpoint filename `s3fd-619a316812.pth` | **BLOCKED for use:** MuseTalk's [`LICENSE`](../research/open-source-avatar-engines/musetalk/LICENSE) lists S3FD but gives no license, and the linked repository did not provide an explicit grant. YuNet is under evaluation as a replacement; no S3FD files were fetched. | Not fetched; no artifact hash. |
| Face parsing (BiSeNet); standard pipeline face mask/compositing support | [ManyOtherFunctions/face-parse-bisent](https://huggingface.co/ManyOtherFunctions/face-parse-bisent) referenced by MuseTalk's download script; `79999_iter.pth` is downloaded by Google Drive ID `154JgKpzCPW82qINcVieuPH3fZ2e0P812` | No immutable version/revision provided by the script | The checkpoint's provenance/license is not established. **Excluded from the user-approved pilot approach**; use only if separately licensed and approved. | Not fetched; no artifact hash. |
| ResNet18; face-parsing auxiliary checkpoint | [PyTorch model URL](https://download.pytorch.org/models/resnet18-5c106cde.pth), downloaded into the face-parse directory | URL filename suffix `5c106cde` is not a full SHA-256; no immutable model release metadata pinned | Architecture/runtime license and pretrained-weight/data rights need exact artifact-level confirmation; MuseTalk inventory does not separately list this checkpoint's license. | Not fetched; no full SHA-256. |
| LatentSync SyncNet; training sync loss/support | [ByteDance/LatentSync](https://huggingface.co/ByteDance/LatentSync), `latentsync_syncnet.pt` | `main`, not pinned | The model card declares **OpenRAIL++**, not MIT/Apache. Source inspection found SyncNet used in MuseTalk training/sync-loss code, but not imported by `scripts/inference.py`; it is not currently identified as required for this inference-only pilot. Exclude it from pilot downloads unless later runtime evidence proves it is needed and the license is approved. | Not fetched; no artifact hash. |

### User-approved pilot replacements (not yet implemented or tested)

- **Face detector — YuNet:** OpenCV Zoo's [YuNet model README](https://github.com/opencv/opencv_zoo/tree/main/models/face_detection_yunet) says all files in that model directory are MIT-licensed. It identifies the source model at `libfacedetection.train` revision `a61a428929148171b488f024b5d6774f93cdbc13`; the license file at that exact revision is MIT. MuseTalk's `scripts/preprocess.py` consumes the detector's face bounding box from `FaceAlignment`; DWPose supplies its separate facial keypoints. The user approved YuNet for this isolated pilot. It is not plug-and-play: coordinate conventions, multiple-face behavior, crop boundaries, immutable model revision/hash, and results on the approved source must be recorded/tested. No YuNet model or code was downloaded.
- **Face mask — DWPose-landmark-derived geometry:** MuseTalk uses `FaceParsing` in its blending path to create the face mask. The user approved testing a custom mask computed from DWPose's face landmarks instead of the unlicensed/unclear BiSeNet checkpoint. This replaces learned semantic parsing with an unvalidated geometric boundary and may cause edge seams or include/exclude the wrong facial regions. It is approved only for the isolated pilot, not production; visual boundary and flicker tests are required. No mask code or model was changed.
- **SyncNet:** It appears in training and checkpoint-download/configuration references, but source inspection found no import from the standard `scripts/inference.py` path. Its OpenRAIL++ terms do not block an inference-only pilot if it is omitted; verify the exact runtime path again before installing anything.

### Training and test data

The MuseTalk README says the checkpoint was trained using HDTF and a private dataset. It also says its Internet-collected test data is for non-commercial research purposes only. This pilot would not use those test clips as inputs, but training-data provenance and rights are not documented sufficiently here to independently establish a clean commercial chain. Obtain appropriate written clarification before treating the model as cleared for commercial production.

### Runtime dependency pins available from upstream source

The cloned MuseTalk `requirements.txt` contains pins including `diffusers==0.30.2`, `accelerate==0.28.0`, `numpy==1.23.5`, `tensorflow==2.12.0`, `opencv-python==4.9.0.80`, `transformers==4.39.2`, `huggingface_hub==0.30.2`, `librosa==0.11.0`, `einops==0.8.1`, and `gradio==5.24.0`; additional unpinned requirements include `gdown`, `requests`, `omegaconf`, `ffmpeg-python`, `moviepy`, and others. The README recommends Python 3.10 and CUDA 11.7, and shows PyTorch 2.0.1 with CUDA 11.8 wheels. These are upstream setup instructions, **not a validated compatible lockfile**. No packages were installed, dependency licenses were not fully enumerated, and the Python 3.15 local environment is not suitable evidence for this runtime.

## GPU and execution evidence

| Measure | Observed result |
|---|---|
| Authorized GPU provider/session | None connected or verified |
| Local GPU | No NVIDIA device; `nvidia-smi` unavailable |
| CUDA toolkit | `nvcc` unavailable |
| PyTorch / CUDA runtime | Not installed or verified for this pilot |
| Checkpoint loaded | No |
| Actual MuseTalk invocation | No |
| GPU utilization / peak VRAM | Not measured |
| Inference duration / FPS | Not measured |
| MuseTalk logs | None |

## Existing MP4 candidate (not accepted)

The previously untracked local file `mohan_sir_musetalk_acceptance_1080p.mp4` was inspected read-only with `ffprobe`: H.264 video, AAC audio, 1920×1080, 30 fps, 300 frames, 10.0 seconds, 3,386,470 bytes. This establishes only container metadata. No corresponding authorized source/audio record, model/checkpoint manifest, GPU logs, generation command, visual review, Bunny upload receipt, or Bunny read-back evidence was found for this acceptance task. The local file was later removed as part of the owner's retirement of the entire old local 3D prototype folder. It is **not counted as a MuseTalk acceptance result**; no Bunny copy was deleted.

## Quality, output, and Bunny acceptance

| Acceptance check | Result |
|---|---|
| Correct identity | Not assessed; no verified input/output provenance or human review |
| Lip/audio synchronization | Not assessed; no verified MuseTalk run or sync measurement |
| Face distortion, flicker, boundaries | Not assessed |
| Audio quality | Not assessed against an approved source pair |
| Duration/frame count | Candidate file metadata is 10.0 s / 300 frames; generation path is unverified |
| Actual GPU inference | **Not proven** |
| Bunny upload response | None |
| Bunny read-back and playback | None |
| Screenshots | None captured |

## Safe next steps

1. Pin the approved YuNet artifact to an immutable revision; record the exact artifact SHA-256 after authorized download. Keep S3FD and the BiSeNet face-parsing checkpoint excluded.
2. Complete artifact-level license/dependency and training-data provenance review for every component retained in the pilot (including DWPose, Whisper, VAE, and MuseTalk). ResNet18 is not needed if the BiSeNet parser is excluded. SyncNet should remain omitted unless runtime inspection shows it is needed.
3. Start or connect a manually authorized, isolated NVIDIA GPU session and confirm provider terms permit the intended processing. Keep credentials in that provider's secret manager, never in chat, notebook cells, or source control.
4. Provide the confirmed 10-second source video/audio pair and consent/provenance evidence through an approved secure path.
5. Only after steps 1–4, create a pinned isolated environment, fetch only approved immutable artifact revisions, record actual file SHA-256 values, and run inference under GPU telemetry.
6. Inspect the actual output, perform sync and visual QA, upload it to Bunny, read it back, and verify playback before considering the pilot passed.
7. Keep production integration out of scope until the pilot passes and receives explicit approval.

## Acceptance verdict

**FAIL / BLOCKED.** The existence of a 10-second MP4 candidate, repository unit tests, model registry rows, or an HTTP response cannot substitute for proven MuseTalk inference on an authorized GPU plus output inspection and Bunny read-back. The user approved YuNet and the experimental geometric mask for an isolated pilot, but neither has been downloaded, implemented, or tested. The user confirms approved inputs are available, but they are not accessible in this environment. No active GPU session, inference, Bunny upload/read-back, production integration, or queue completion was performed.

## Sources

- [MuseTalk source and README](https://github.com/TMElyralab/MuseTalk)
- [MuseTalk checkpoint/model card](https://huggingface.co/TMElyralab/MuseTalk)
- [MuseTalk upstream license inventory](https://huggingface.co/TMElyralab/MuseTalk/blob/main/LICENSE.txt)
- [MuseTalk S3FD implementation](https://github.com/yxlijun/S3FD.pytorch)
- [MuseTalk DWPose model card](https://huggingface.co/yzd-v/DWPose)
- [MuseTalk SyncNet model card](https://huggingface.co/ByteDance/LatentSync)
- [SD VAE model card](https://huggingface.co/stabilityai/sd-vae-ft-mse)
- [Whisper Tiny model card](https://huggingface.co/openai/whisper-tiny)
- [OpenCV Zoo YuNet model directory and license](https://github.com/opencv/opencv_zoo/tree/main/models/face_detection_yunet)
- [YuNet source model revision](https://github.com/ShiqiYu/libfacedetection.train/tree/a61a428929148171b488f024b5d6774f93cdbc13)
