#!/usr/bin/env python3
"""Download ONLY the pilot-approved MuseTalk weights and record SHA-256 hashes.

Approved for the isolated pilot (docs/MUSETALK_GPU_ACCEPTANCE_REPORT.md):
  * MuseTalk 1.5 UNet + config     (TMElyralab/MuseTalk @ pinned revision)
  * SD VAE ft-mse                  (stabilityai/sd-vae-ft-mse)
  * Whisper tiny                   (openai/whisper-tiny)
  * DWPose                         (yzd-v/DWPose)
  * YuNet face detector            (OpenCV Zoo, MIT) — replaces S3FD

EXCLUDED, never downloaded by this script (no established license/provenance):
  * S3FD detector checkpoint       (blocked; replaced by YuNet)
  * BiSeNet face-parse 79999_iter  (blocked; replaced by geometric mask)
  * resnet18 face-parse auxiliary  (only needed with BiSeNet)
  * LatentSync SyncNet             (training-only; not on the inference path)

Every downloaded file is SHA-256 hashed; results are printed and written to
``<models_dir>/pilot_weights_manifest.json``. The MuseTalk UNet is verified
against the upstream LFS metadata hash recorded in Phase 2. The revision is
pinned: the candidate HF revision ``2bcb936e2fddb4d86db4c62fd45b387d0c061571``
(see docs/AVATAR_ENGINE_PHASE2.md).

Usage::

    python scripts/musetalk_pilot/download_pilot_weights.py \
        --models-dir /path/to/MuseTalk/models \
        [--hf-revision <sha>] [--skip-yunet] [--yunet-url <url>]
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import shutil
import sys
import time
import urllib.request
from datetime import datetime, timezone

DEFAULT_HF_REVISION = "2bcb936e2fddb4d86db4c62fd45b387d0c061571"
# Upstream LFS metadata for musetalkV15/unet.pth (3,400,074,924 bytes).
EXPECTED_UNET_SHA256 = "7ebf6c98c181e20838e4c0054e96e944ac60d5d692cc01db42839fe11b787007"
EXPECTED_UNET_SIZE = 3_400_074_924

YUNET_URL = (
    "https://github.com/opencv/opencv_zoo/raw/main/models/"
    "face_detection_yunet/face_detection_yunet_2023mar.onnx"
)

# repo_id, filename (path inside repo), destination subdir under models-dir
HF_FILES = [
    ("TMElyralab/MuseTalk", "musetalkV15/unet.pth", ""),
    ("TMElyralab/MuseTalk", "musetalkV15/musetalk.json", ""),
    ("stabilityai/sd-vae-ft-mse", "config.json", "sd-vae"),
    ("stabilityai/sd-vae-ft-mse", "diffusion_pytorch_model.bin", "sd-vae"),
    ("openai/whisper-tiny", "config.json", "whisper"),
    ("openai/whisper-tiny", "pytorch_model.bin", "whisper"),
    ("openai/whisper-tiny", "preprocessor_config.json", "whisper"),
    ("yzd-v/DWPose", "dw-ll_ucoco_384.pth", "dwpose"),
]

EXCLUDED_ARTIFACTS = [
    "S3FD s3fd-619a316812.pth (no license identifier; replaced by YuNet)",
    "BiSeNet face-parse 79999_iter.pth (provenance unclear; replaced by geometric mask)",
    "resnet18-5c106cde.pth (face-parse auxiliary; not needed without BiSeNet)",
    "LatentSync latentsync_syncnet.pt (OpenRAIL++; training-only, not on inference path)",
]


def sha256_file(path: str) -> str:
    digest = hashlib.sha256()
    with open(path, "rb") as handle:
        for chunk in iter(lambda: handle.read(8 * 1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _ssl_context():
    """certifi-backed context when available (macOS framework Python lacks system CAs)."""
    import ssl

    try:
        import certifi

        return ssl.create_default_context(cafile=certifi.where())
    except ImportError:
        return ssl.create_default_context()


def hf_download_with_retries(hf_hub_download, *, attempts: int = 4, **kwargs):
    """hf_hub_download with exponential backoff (flaky networks stall mid-LFS)."""
    last_error = None
    for attempt in range(1, attempts + 1):
        try:
            return hf_hub_download(**kwargs)
        except Exception as error:  # noqa: BLE001 - retry then surface
            last_error = error
            print(f"  [weights] attempt {attempt}/{attempts} failed: {error}")
            if attempt < attempts:
                time.sleep(5 * attempt)
    raise last_error  # type: ignore[misc]


def download_yunet(dest_path: str, url: str, attempts: int = 3) -> None:
    os.makedirs(os.path.dirname(dest_path), exist_ok=True)
    if os.path.isfile(dest_path) and os.path.getsize(dest_path) > 0:
        print(f"[weights] YuNet already present: {dest_path}")
        return
    print(f"[weights] Downloading YuNet: {url}")
    tmp = dest_path + ".part"
    last_error = None
    for attempt in range(1, attempts + 1):
        try:
            request = urllib.request.Request(url, headers={"User-Agent": "swar-pilot-weights/1.0"})
            with urllib.request.urlopen(request, timeout=120, context=_ssl_context()) as response, open(tmp, "wb") as handle:
                shutil.copyfileobj(response, handle)
            os.replace(tmp, dest_path)
            return
        except Exception as error:  # noqa: BLE001 - retry then surface
            last_error = error
            print(f"[weights] YuNet attempt {attempt}/{attempts} failed: {error}")
            time.sleep(3 * attempt)
    raise RuntimeError(f"YuNet download failed after {attempts} attempts: {last_error}")


def main() -> int:
    parser = argparse.ArgumentParser(description="Download pilot-approved MuseTalk weights only")
    parser.add_argument("--models-dir", required=True, help="Target models directory (e.g. <MuseTalk>/models)")
    parser.add_argument("--hf-revision", default=DEFAULT_HF_REVISION)
    parser.add_argument("--skip-yunet", action="store_true")
    parser.add_argument("--yunet-url", default=YUNET_URL)
    parser.add_argument("--manifest", default=None, help="Manifest path (default: <models-dir>/pilot_weights_manifest.json)")
    args = parser.parse_args()

    try:
        from huggingface_hub import hf_hub_download
    except ImportError:
        print("[weights] ERROR: huggingface_hub is required. pip install -U 'huggingface_hub[cli]'", file=sys.stderr)
        return 2

    # Slow links: give the hub client more time for etag/redirect phases.
    os.environ.setdefault("HF_HUB_ETAG_TIMEOUT", "60")
    os.environ.setdefault("HF_HUB_DOWNLOAD_TIMEOUT", "120")

    models_dir = os.path.abspath(args.models_dir)
    os.makedirs(models_dir, exist_ok=True)
    manifest_path = args.manifest or os.path.join(models_dir, "pilot_weights_manifest.json")

    print(f"[weights] HF revision pin: {args.hf_revision}")
    print(f"[weights] Excluded artifacts (never downloaded):")
    for item in EXCLUDED_ARTIFACTS:
        print(f"  - {item}")

    files_record = []
    failures = []

    for repo_id, filename, subdir in HF_FILES:
        try:
            print(f"[weights] Fetching {repo_id}:{filename} @ {args.hf_revision[:12]}...")
            local_path = hf_download_with_retries(
                hf_hub_download,
                repo_id=repo_id,
                filename=filename,
                revision=args.hf_revision if repo_id == "TMElyralab/MuseTalk" else None,
                local_dir=models_dir,
            )
            # hf local_dir places files repo-relative (flat for repo-root files).
            # Move into MuseTalk's runtime subdir IMMEDIATELY so same-named files
            # can't collide (sd-vae/config.json vs whisper/config.json).
            actual = local_path
            if subdir:
                dest = os.path.join(models_dir, subdir, os.path.basename(filename))
                if os.path.abspath(actual) != os.path.abspath(dest):
                    os.makedirs(os.path.dirname(dest), exist_ok=True)
                    if os.path.isfile(dest) and os.path.isfile(actual) and sha256_file(dest) == sha256_file(actual):
                        os.remove(actual)  # identical copy already in place
                    else:
                        shutil.move(actual, dest)
                    actual = dest
            if not os.path.isfile(actual):
                raise FileNotFoundError(f"Downloaded file not found at {actual}")
            digest = sha256_file(actual)
            size = os.path.getsize(actual)
            files_record.append(
                {"repo": repo_id, "file": filename, "revision": args.hf_revision if repo_id == "TMElyralab/MuseTalk" else "main",
                 "path": os.path.relpath(actual, models_dir), "sha256": digest, "bytes": size}
            )
            print(f"  sha256={digest} ({size} bytes)")
            if repo_id == "TMElyralab/MuseTalk" and filename.endswith("unet.pth"):
                if digest != EXPECTED_UNET_SHA256 or size != EXPECTED_UNET_SIZE:
                    failures.append(
                        f"unet.pth hash/size mismatch: got {digest} ({size} bytes), "
                        f"expected {EXPECTED_UNET_SHA256} ({EXPECTED_UNET_SIZE} bytes)"
                    )
                else:
                    print("  [weights] unet.pth VERIFIED against upstream LFS metadata hash.")
        except Exception as error:  # noqa: BLE001 - report and continue
            failures.append(f"{repo_id}:{filename} -> {error}")

    if not args.skip_yunet:
        yunet_path = os.path.join(models_dir, "yunet", "face_detection_yunet_2023mar.onnx")
        try:
            download_yunet(yunet_path, args.yunet_url)
            digest = sha256_file(yunet_path)
            size = os.path.getsize(yunet_path)
            files_record.append(
                {"repo": "opencv/opencv_zoo", "file": "face_detection_yunet_2023mar.onnx",
                 "revision": "main (record hash; pin via --yunet-url to an immutable mirror)",
                 "path": os.path.relpath(yunet_path, models_dir), "sha256": digest, "bytes": size,
                 "license": "MIT (OpenCV Zoo models/face_detection_yunet)"}
            )
            print(f"[weights] YuNet sha256={digest} ({size} bytes)")
        except Exception as error:  # noqa: BLE001
            failures.append(f"YuNet -> {error}")

    manifest = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "hf_revision_pinned": args.hf_revision,
        "expected_unet_sha256": EXPECTED_UNET_SHA256,
        "excluded_artifacts": EXCLUDED_ARTIFACTS,
        "files": files_record,
        "failures": failures,
        "status": "complete" if not failures else "incomplete",
    }
    with open(manifest_path, "w", encoding="utf-8") as handle:
        json.dump(manifest, handle, indent=2)
    print(f"[weights] Manifest written: {manifest_path}")

    if failures:
        print("[weights] FAILURES:", file=sys.stderr)
        for item in failures:
            print(f"  - {item}", file=sys.stderr)
        return 1
    print("[weights] All pilot-approved weights downloaded and recorded.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
