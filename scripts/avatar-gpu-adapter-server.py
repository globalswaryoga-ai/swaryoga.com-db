#!/usr/bin/env python3
"""Swar in-house avatar GPU inference adapter (MuseTalk pilot implementation).

Contract (docs/AVATAR_ENGINE_PHASE2.md):
  * ``GET  /health``  -> service/GPU/model/bunny status (no secrets leaked)
  * ``POST /render``  -> Bearer ``AVATAR_INFERENCE_TOKEN``; body carries
    ``job_id``, ``source_video_url``, ``audio_url``, ... (worker payload)

Pipeline for ``/render`` (fail-closed at every step — never muxes or fakes):
  1. Validate payload + sanitize ``job_id``.
  2. Download the HTTPS source video and audio (size-capped).
  3. Enforce ``ADAPTER_MAX_SOURCE_SECONDS`` guardrail via ffprobe.
  4. Convert audio to 16 kHz mono PCM WAV (ffmpeg).
  5. Write a one-task YAML config and run the pilot inference entrypoint
     ``scripts/musetalk_pilot/run_inference_pilot.py`` (YuNet detector +
     geometric mask replacements; MuSETALK_HOME required).
  6. Verify the output MP4 exists and ffprobe reports non-zero duration
     (upstream swallows exceptions and can exit 0 with no output).
  7. Upload to Bunny Storage at ``avatar/renders/<job_id>.mp4``.
  8. Read back over storage (Content-Range size check) AND over the public
     CDN (Range probe) before responding.
  9. Respond ``{"video_url": "https://<cdn>/avatar/renders/<job>.mp4",
     "duration_seconds": <float>}``.

Required environment:
  * ``AVATAR_INFERENCE_TOKEN``        - shared with the worker config
  * ``MUSETALK_HOME``                - MuseTalk clone with pilot weights
  * ``BUNNY_STORAGE_ZONE_NAME``      - Bunny storage zone
  * ``BUNNY_STORAGE_API_KEY``        - Bunny storage password/API key
  * ``BUNNY_STORAGE_CDN_HOST``       - e.g. swaryogacrm.b-cdn.net
Optional:
  * ``MUSETALK_PYTHON``              - interpreter for the pilot entry
    (default: this interpreter)
  * ``MUSETALK_YUNET_ONNX``          - explicit YuNet model path
  * ``BUNNY_STORAGE_REGION``         - de|ny|la|sg|syd (default de)
  * ``ADAPTER_MAX_SOURCE_SECONDS``   - source length guardrail (default 30)
  * ``ADAPTER_MAX_DOWNLOAD_MB``      - per-file download cap (default 512)
  * ``ADAPTER_INFER_TIMEOUT_SECONDS``- inference subprocess cap (default 7200)

Run (on the authorized GPU host only, never on the Contabo web VPS)::

    AVATAR_INFERENCE_TOKEN=... MUSETALK_HOME=... \\
    BUNNY_STORAGE_ZONE_NAME=... BUNNY_STORAGE_API_KEY=... \\
    BUNNY_STORAGE_CDN_HOST=... \\
    python scripts/avatar-gpu-adapter-server.py --port 8080
"""

from __future__ import annotations

import argparse
import hmac
import http.server
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import threading
import time
import urllib.error
import urllib.request

INFERENCE_TOKEN = os.environ.get("AVATAR_INFERENCE_TOKEN", "")
MUSETALK_HOME = os.environ.get("MUSETALK_HOME", "").strip()
MUSETALK_PYTHON = os.environ.get("MUSETALK_PYTHON", sys.executable)
PILOT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "musetalk_pilot")

BUNNY_ZONE = os.environ.get("BUNNY_STORAGE_ZONE_NAME", "")
BUNNY_API_KEY = os.environ.get("BUNNY_STORAGE_API_KEY", "") or os.environ.get("BUNNY_STORAGE_KEY", "")
BUNNY_CDN_HOST = os.environ.get("BUNNY_STORAGE_CDN_HOST", "")
BUNNY_REGION = (os.environ.get("BUNNY_STORAGE_REGION", "de") or "de").lower()

MAX_SOURCE_SECONDS = float(os.environ.get("ADAPTER_MAX_SOURCE_SECONDS", "30"))
MAX_DOWNLOAD_BYTES = int(float(os.environ.get("ADAPTER_MAX_DOWNLOAD_MB", "512")) * 1024 * 1024)
INFER_TIMEOUT_SECONDS = max(60, int(os.environ.get("ADAPTER_INFER_TIMEOUT_SECONDS", "7200")))

STORAGE_REGION_HOSTS = {
    "de": "storage.bunnycdn.com",
    "ny": "ny.storage.bunnycdn.com",
    "la": "la.storage.bunnycdn.com",
    "sg": "sg.storage.bunnycdn.com",
    "syd": "syd.storage.bunnycdn.com",
}

SAFE_JOB_ID = re.compile(r"[^A-Za-z0-9_-]+")
RENDER_LOCK = threading.Lock()


class AdapterError(Exception):
    """Fail-closed pipeline error with an HTTP status hint."""

    def __init__(self, message: str, status: int = 500) -> None:
        super().__init__(message)
        self.status = status


def log(message: str) -> None:
    print(f"[GPU-Adapter] {message}", flush=True)


# ---------------------------------------------------------------------------
# Status / health
# ---------------------------------------------------------------------------

def check_cuda() -> dict:
    try:
        import torch
    except ImportError:
        return {"cuda_available": False, "device_name": "PyTorch is not installed", "device_count": 0, "torch_version": None}
    cuda_available = torch.cuda.is_available()
    return {
        "cuda_available": cuda_available,
        "device_name": torch.cuda.get_device_name(0) if cuda_available else "CPU",
        "device_count": torch.cuda.device_count() if cuda_available else 0,
        "torch_version": torch.__version__,
    }


def model_inventory() -> dict:
    required = {
        "unet": ("models/musetalkV15/unet.pth", 3_400_074_924),
        "unet_config": ("models/musetalkV15/musetalk.json", None),
        "vae": ("models/sd-vae/diffusion_pytorch_model.bin", None),
        "whisper": ("models/whisper/pytorch_model.bin", None),
        "dwpose": ("models/dwpose/dw-ll_ucoco_384.pth", None),
        "yunet": ("models/yunet/face_detection_yunet_2023mar.onnx", None),
    }
    inventory = {}
    for name, (rel, expected_size) in required.items():
        path = os.path.join(MUSETALK_HOME, rel) if MUSETALK_HOME else ""
        exists = bool(path) and os.path.isfile(path)
        size = os.path.getsize(path) if exists else 0
        entry = {"present": exists, "bytes": size}
        if expected_size is not None and exists:
            entry["expected_bytes"] = expected_size
            entry["size_ok"] = size == expected_size
        inventory[name] = entry
    excluded = {
        "s3fd": "excluded (no license; YuNet replacement)",
        "bisenet_face_parse": "excluded (provenance unclear; geometric mask replacement)",
        "resnet18_face_parse_aux": "excluded (not needed without BiSeNet)",
        "syncnet": "excluded (training-only, OpenRAIL++)",
    }
    return {"required": inventory, "excluded": excluded}


def bunny_configured() -> bool:
    return bool(BUNNY_ZONE and BUNNY_API_KEY and BUNNY_CDN_HOST)


def engine_ready() -> tuple[bool, list[str]]:
    reasons = []
    if not INFERENCE_TOKEN:
        reasons.append("AVATAR_INFERENCE_TOKEN is not set")
    if not MUSETALK_HOME or not os.path.isdir(os.path.join(MUSETALK_HOME, "musetalk")):
        reasons.append("MUSETALK_HOME does not point at a MuseTalk clone")
    if not bunny_configured():
        reasons.append("Bunny Storage env (ZONE/API_KEY/CDN_HOST) incomplete")
    if not shutil.which("ffmpeg") or not shutil.which("ffprobe"):
        reasons.append("ffmpeg/ffprobe not on PATH")
    if MUSETALK_HOME:
        for rel in (
            "models/musetalkV15/unet.pth",
            "models/musetalkV15/musetalk.json",
            "models/sd-vae/diffusion_pytorch_model.bin",
            "models/whisper/pytorch_model.bin",
            "models/dwpose/dw-ll_ucoco_384.pth",
            "models/yunet/face_detection_yunet_2023mar.onnx",
        ):
            if not os.path.isfile(os.path.join(MUSETALK_HOME, rel)):
                reasons.append(f"missing weight: {rel}")
        if not os.path.isfile(os.path.join(PILOT_DIR, "run_inference_pilot.py")):
            reasons.append("pilot entrypoint missing (scripts/musetalk_pilot)")
    return (not reasons), reasons


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _ssl_context():
    """certifi-backed TLS context (host Pythons may lack system CA bundles)."""
    import ssl

    try:
        import certifi

        return ssl.create_default_context(cafile=certifi.where())
    except ImportError:
        return ssl.create_default_context()


def download_file(url: str, dest: str, label: str) -> int:
    if not isinstance(url, str) or not url.startswith("https://"):
        raise AdapterError(f"{label} must be an HTTPS URL.", 400)
    log(f"Downloading {label}: {url}")
    request = urllib.request.Request(url, headers={"User-Agent": "swar-gpu-adapter/1.0"})
    try:
        with urllib.request.urlopen(request, timeout=300, context=_ssl_context()) as response, open(dest, "wb") as handle:
            total = 0
            while True:
                chunk = response.read(1024 * 1024)
                if not chunk:
                    break
                total += len(chunk)
                if total > MAX_DOWNLOAD_BYTES:
                    raise AdapterError(f"{label} exceeds ADAPTER_MAX_DOWNLOAD_MB cap.", 413)
                handle.write(chunk)
    except urllib.error.HTTPError as error:
        raise AdapterError(f"{label} download failed: HTTP {error.code}", 502) from error
    except urllib.error.URLError as error:
        raise AdapterError(f"{label} download failed: {error.reason}", 502) from error
    if total <= 0:
        raise AdapterError(f"{label} download was empty.", 502)
    log(f"Downloaded {label}: {total} bytes")
    return total


def run_checked(cmd: list[str], label: str, cwd: str | None = None, timeout: int | None = None) -> None:
    log(f"{label}: {' '.join(cmd)}")
    try:
        result = subprocess.run(
            cmd,
            cwd=cwd,
            capture_output=True,
            text=True,
            timeout=timeout,
            check=False,
        )
    except subprocess.TimeoutExpired as error:
        raise AdapterError(f"{label} timed out after {timeout}s.", 504) from error
    if result.returncode != 0:
        tail = (result.stderr or result.stdout or "").strip()[-800:]
        raise AdapterError(f"{label} failed (exit {result.returncode}): {tail}")
    if result.stdout.strip():
        for line in result.stdout.strip().splitlines()[-12:]:
            log(f"  {line}")


def ffprobe_duration(path: str) -> float:
    try:
        result = subprocess.run(
            [
                "ffprobe", "-v", "error",
                "-show_entries", "format=duration",
                "-of", "csv=p=0",
                path,
            ],
            capture_output=True,
            text=True,
            check=True,
        )
    except (subprocess.CalledProcessError, FileNotFoundError) as error:
        raise AdapterError(f"ffprobe could not read {os.path.basename(path)}: {error}") from error
    try:
        return float(result.stdout.strip())
    except ValueError as error:
        raise AdapterError(f"ffprobe returned no duration for {os.path.basename(path)}.") from error


def bunny_storage_host() -> str:
    return STORAGE_REGION_HOSTS.get(BUNNY_REGION, STORAGE_REGION_HOSTS["de"])


def bunny_upload(local_path: str, storage_key: str) -> str:
    if not bunny_configured():
        raise AdapterError("Bunny Storage is not configured on this adapter.", 503)
    url = f"https://{bunny_storage_host()}/{BUNNY_ZONE}/{storage_key}"
    content_type = "video/mp4"
    log(f"Uploading to Bunny Storage: {storage_key}")
    with open(local_path, "rb") as handle:
        body = handle.read()
    request = urllib.request.Request(
        url,
        data=body,
        method="PUT",
        headers={"AccessKey": BUNNY_API_KEY, "Content-Type": content_type},
    )
    try:
        with urllib.request.urlopen(request, timeout=600, context=_ssl_context()) as response:
            if response.status not in (200, 201, 202):
                raise AdapterError(f"Bunny upload returned HTTP {response.status}.", 502)
    except urllib.error.HTTPError as error:
        detail = error.read(300).decode("utf-8", errors="replace")
        raise AdapterError(f"Bunny upload failed (HTTP {error.code}): {detail}", 502) from error
    return f"https://{BUNNY_CDN_HOST}/{storage_key}"


def bunny_read_back(storage_key: str, cdn_url: str, local_size: int) -> dict:
    """Verify the object is readable via storage (size) and public CDN (range)."""
    storage_url = f"https://{bunny_storage_host()}/{BUNNY_ZONE}/{storage_key}"

    storage_request = urllib.request.Request(
        storage_url,
        headers={"AccessKey": BUNNY_API_KEY, "Range": "bytes=0-0"},
    )
    try:
        with urllib.request.urlopen(storage_request, timeout=60, context=_ssl_context()) as response:
            status = response.status
            content_range = response.headers.get("Content-Range", "")
            content_length = response.headers.get("Content-Length", "")
            response.read(64)
    except urllib.error.HTTPError as error:
        raise AdapterError(f"Bunny storage read-back failed (HTTP {error.code}).", 502) from error

    remote_size = None
    if "/" in content_range:
        try:
            remote_size = int(content_range.rsplit("/", 1)[1])
        except ValueError:
            remote_size = None
    elif status == 200 and content_length:
        try:
            remote_size = int(content_length)
        except ValueError:
            remote_size = None

    if remote_size is not None and remote_size != local_size:
        raise AdapterError(
            f"Bunny storage read-back size mismatch: remote={remote_size} local={local_size}.", 502
        )

    cdn_request = urllib.request.Request(cdn_url, headers={"Range": "bytes=0-0"})
    try:
        with urllib.request.urlopen(cdn_request, timeout=60, context=_ssl_context()) as response:
            if response.status not in (200, 206):
                raise AdapterError(f"Bunny CDN read-back returned HTTP {response.status}.", 502)
            response.read(64)
    except urllib.error.HTTPError as error:
        raise AdapterError(f"Bunny CDN read-back failed (HTTP {error.code}).", 502) from error

    log(f"Read-back verified: storage size={remote_size} bytes, CDN range OK.")
    return {"storage_status": status, "remote_size": remote_size, "cdn_status": "ok"}


# ---------------------------------------------------------------------------
# Render pipeline
# ---------------------------------------------------------------------------

def render(payload: dict) -> dict:
    job_id = payload.get("job_id")
    if not isinstance(job_id, str) or not job_id.strip():
        raise AdapterError("job_id is required.", 400)
    safe_job_id = SAFE_JOB_ID.sub("_", job_id.strip())[:100]
    if not safe_job_id:
        raise AdapterError("job_id sanitized to an empty string.", 400)

    source_video_url = payload.get("source_video_url")
    audio_url = payload.get("audio_url")
    if not isinstance(source_video_url, str):
        raise AdapterError("source_video_url is required.", 400)
    if not isinstance(audio_url, str):
        raise AdapterError("audio_url is required.", 400)

    ready, reasons = engine_ready()
    if not ready:
        raise AdapterError("Adapter engine not ready: " + "; ".join(reasons), 503)

    storage_key = f"avatar/renders/{safe_job_id}.mp4"

    with tempfile.TemporaryDirectory(prefix=f"avatar-job-{safe_job_id}-") as tmp:
        source_path = os.path.join(tmp, "source" + _ext_from_url(source_video_url, ".mp4"))
        audio_raw_path = os.path.join(tmp, "audio" + _ext_from_url(audio_url, ".mp4"))
        audio_wav_path = os.path.join(tmp, "audio_16k_mono.wav")
        config_path = os.path.join(tmp, "task.yaml")
        result_dir = os.path.join(tmp, "results")

        download_file(source_video_url, source_path, "source_video")
        download_file(audio_url, audio_raw_path, "audio")

        source_duration = ffprobe_duration(source_path)
        if MAX_SOURCE_SECONDS > 0 and source_duration > MAX_SOURCE_SECONDS:
            raise AdapterError(
                f"Source video is {source_duration:.1f}s; ADAPTER_MAX_SOURCE_SECONDS={MAX_SOURCE_SECONDS}.",
                400,
            )
        log(f"Source duration: {source_duration:.2f}s (limit {MAX_SOURCE_SECONDS}s)")

        run_checked(
            [
                "ffmpeg", "-y", "-v", "error",
                "-i", audio_raw_path,
                "-vn", "-ac", "1", "-ar", "16000",
                "-c:a", "pcm_s16le",
                audio_wav_path,
            ],
            "audio-convert",
        )

        output_vid_name = f"{safe_job_id}.mp4"
        # One-task YAML matching upstream configs/inference layout.
        with open(config_path, "w", encoding="utf-8") as handle:
            handle.write(
                f'task0:\n'
                f'  video_path: "{source_path}"\n'
                f'  audio_path: "{audio_wav_path}"\n'
                f'  result_name: "{output_vid_name}"\n'
            )

        os.makedirs(result_dir, exist_ok=True)
        entry = os.path.join(PILOT_DIR, "run_inference_pilot.py")
        run_checked(
            [
                MUSETALK_PYTHON,
                entry,
                "--musetalk_home", MUSETALK_HOME,
                "--inference_config", config_path,
                "--result_dir", result_dir,
                "--output_vid_name", output_vid_name,
                "--version", "v15",
                "--parsing_mode", "jaw",
            ],
            "musetalk-pilot-inference",
            cwd=PILOT_DIR,
            timeout=INFER_TIMEOUT_SECONDS,
        )

        # Upstream swallows per-task exceptions and exits 0 — verify output.
        candidates = []
        for root, _dirs, files in os.walk(result_dir):
            for name in files:
                if name == output_vid_name:
                    candidates.append(os.path.join(root, name))
        if not candidates:
            raise AdapterError(
                "Inference produced no output file (upstream exits 0 on task errors; "
                "check adapter logs / pilot weights).",
                500,
            )
        output_path = candidates[0]
        duration = ffprobe_duration(output_path)
        if duration <= 0:
            raise AdapterError("Inference output has zero duration.", 500)
        output_size = os.path.getsize(output_path)
        log(f"Inference output: {output_path} ({duration:.2f}s, {output_size} bytes)")

        cdn_url = bunny_upload(output_path, storage_key)
        read_back = bunny_read_back(storage_key, cdn_url, output_size)

    return {
        "video_url": cdn_url,
        "duration_seconds": round(duration, 3),
        "job_id": job_id,
        "storage_key": storage_key,
        "read_back": read_back,
        "engine": "musetalk-pilot-yunet-geometric-mask",
    }


def _ext_from_url(url: str, default: str) -> str:
    path = url.split("?", 1)[0]
    _, dot, ext = path.rpartition(".")
    if dot and 1 <= len(ext) <= 5 and ext.isalnum():
        return "." + ext.lower()
    return default


# ---------------------------------------------------------------------------
# HTTP server
# ---------------------------------------------------------------------------

class GPUAdapterHandler(http.server.BaseHTTPRequestHandler):
    def _send_json(self, status_code: int, data: dict) -> None:
        body = json.dumps(data).encode("utf-8")
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self) -> None:  # noqa: N802 - http.server API
        if self.path != "/health":
            self._send_json(404, {"error": "Not Found"})
            return
        ready, reasons = engine_ready()
        self._send_json(
            200,
            {
                "status": "ready" if ready else "not_ready",
                "not_ready_reasons": reasons,
                "rendering": "musetalk_pilot" if ready else "unavailable",
                "inference_token_configured": bool(INFERENCE_TOKEN),
                "bunny_storage_configured": bunny_configured(),
                "musetalk_home_configured": bool(MUSETALK_HOME),
                "gpu": check_cuda(),
                "models": model_inventory(),
                "timestamp": time.time(),
            },
        )

    def do_POST(self) -> None:  # noqa: N802 - http.server API
        if self.path != "/render":
            self._send_json(404, {"error": "Not Found"})
            return
        if not INFERENCE_TOKEN:
            self._send_json(503, {"error": "AVATAR_INFERENCE_TOKEN is not configured."})
            return

        auth_header = self.headers.get("Authorization", "")
        if not hmac.compare_digest(auth_header, f"Bearer {INFERENCE_TOKEN}"):
            self._send_json(401, {"error": "Unauthorized: Invalid AVATAR_INFERENCE_TOKEN"})
            return

        try:
            length = int(self.headers.get("Content-Length") or 0)
        except ValueError:
            length = 0
        if length <= 0 or length > 1_000_000:
            self._send_json(400, {"error": "Missing or oversized JSON body."})
            return
        try:
            payload = json.loads(self.rfile.read(length).decode("utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError):
            self._send_json(400, {"error": "Body is not valid JSON."})
            return
        if not isinstance(payload, dict):
            self._send_json(400, {"error": "Body must be a JSON object."})
            return

        if not RENDER_LOCK.acquire(blocking=False):
            self._send_json(429, {"error": "A render is already in progress on this adapter."})
            return
        started = time.time()
        try:
            log(f"Render requested: job_id={payload.get('job_id')}")
            result = render(payload)
            result["elapsed_seconds"] = round(time.time() - started, 2)
            log(f"Render complete: {result['video_url']} ({result['elapsed_seconds']}s)")
            self._send_json(200, result)
        except AdapterError as error:
            log(f"Render failed: {error}")
            self._send_json(error.status, {"error": str(error), "status": "failed",
                                           "job_id": payload.get("job_id")})
        except Exception as error:  # noqa: BLE001 - last-resort fail-closed
            log(f"Render failed unexpectedly: {error!r}")
            self._send_json(500, {"error": f"Internal adapter error: {error}", "status": "failed",
                                  "job_id": payload.get("job_id")})
        finally:
            RENDER_LOCK.release()

    def log_message(self, format_string: str, *args) -> None:
        log(format_string % args)


def run_server(port: int = 8080) -> None:
    ready, reasons = engine_ready()
    httpd = http.server.ThreadingHTTPServer(("", port), GPUAdapterHandler)
    log(f"Listening on port {port}.")
    log(f"Engine ready: {ready}" + ("" if ready else f" -> {'; '.join(reasons)}"))
    log(f"MUSETALK_HOME: {MUSETALK_HOME or '(unset)'}")
    log(f"Bunny Storage configured: {bunny_configured()}")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        httpd.server_close()
        log("Server stopped.")


def main() -> None:
    parser = argparse.ArgumentParser(description="Swar avatar GPU inference adapter (MuseTalk pilot)")
    parser.add_argument("--port", type=int, default=8080, help="Port to listen on")
    args = parser.parse_args()
    run_server(args.port)


if __name__ == "__main__":
    main()
