#!/usr/bin/env python3
"""Poll Bunny-backed render jobs and forward them to a dedicated GPU inference adapter."""

import json
import os
import socket
import sys
import threading
import time
import urllib.error
import urllib.request

API_BASE_URL = os.environ.get("SWAR_API_BASE_URL", "https://swaryoga.com").rstrip("/")
WORKER_TOKEN = os.environ.get("AVATAR_WORKER_TOKEN", "")
INFERENCE_URL = os.environ.get("AVATAR_INFERENCE_URL", "")
INFERENCE_TOKEN = os.environ.get("AVATAR_INFERENCE_TOKEN", "")
POLL_INTERVAL_SECONDS = max(3, int(os.environ.get("AVATAR_WORKER_POLL_SECONDS", "10")))
INFERENCE_TIMEOUT_SECONDS = max(60, int(os.environ.get("AVATAR_INFERENCE_TIMEOUT_SECONDS", "7200")))
WORKER_ID = os.environ.get("AVATAR_WORKER_ID", socket.gethostname())
WORKER_ENDPOINT = f"{API_BASE_URL}/api/avatar/inhouse/worker"


def log(message):
    print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] [AvatarGPUWorker] {message}", flush=True)


def request_json(url, payload, token, timeout=30):
    body = json.dumps(payload).encode("utf-8")
    request = urllib.request.Request(
        url,
        data=body,
        method="POST",
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        },
    )
    with urllib.request.urlopen(request, timeout=timeout) as response:
        data = response.read(2_000_001)
        if len(data) > 2_000_000:
            raise RuntimeError("API response exceeded the 2 MB limit.")
        return json.loads(data.decode("utf-8"))


class LeaseHeartbeat(threading.Thread):
    def __init__(self, job_id, claim_token):
        super().__init__(daemon=True)
        self.job_id = job_id
        self.claim_token = claim_token
        self.stop_event = threading.Event()
        self.claim_lost = threading.Event()

    def run(self):
        while not self.stop_event.wait(180):
            try:
                result = request_json(
                    WORKER_ENDPOINT,
                    {"action": "heartbeat", "jobId": self.job_id, "claimToken": self.claim_token},
                    WORKER_TOKEN,
                )
                if not result.get("success"):
                    self.claim_lost.set()
                    log(f"Claim lease was lost for job {self.job_id}.")
                    return
            except Exception as error:
                log(f"Heartbeat failed for {self.job_id}: {error}")


def render_with_gpu_adapter(job):
    if not INFERENCE_URL:
        raise RuntimeError("AVATAR_INFERENCE_URL is not configured on this GPU worker.")
    if not INFERENCE_TOKEN:
        raise RuntimeError("AVATAR_INFERENCE_TOKEN is not configured on this GPU worker.")

    payload = {
        "job_id": job["id"],
        "avatar_profile_id": job["avatarProfileId"],
        "source_image_url": job["sourceImageUrl"],
        "audio_url": job["audioUrl"],
        "script": job["script"],
        "voice_id": job["voiceId"],
        "language": job["language"],
        "speech_speed": job["speechSpeed"],
        "speech_pitch_hz": job["speechPitchHz"],
        "background_id": job["backgroundId"],
        "clothing_id": job["clothingId"],
        "posture": job["posture"],
        "output_requirement": {
            "format": "mp4",
            "storage": "Bunny CDN",
            "https_required": True,
        },
    }
    return request_json(
        INFERENCE_URL,
        payload,
        INFERENCE_TOKEN,
        timeout=INFERENCE_TIMEOUT_SECONDS,
    )


def process_claim(claim):
    job = claim["job"]
    job_id = job["id"]
    claim_token = claim["claimToken"]
    heartbeat = LeaseHeartbeat(job_id, claim_token)
    heartbeat.start()

    try:
        log(f"Rendering job {job_id} with profile {job['avatarProfileId']}.")
        output = render_with_gpu_adapter(job)
        if heartbeat.claim_lost.is_set():
            return

        video_url = output.get("video_url") or output.get("output_video_url")
        if not isinstance(video_url, str) or not video_url.startswith("https://"):
            raise RuntimeError("GPU adapter response must include an HTTPS Bunny CDN video_url.")

        request_json(
            WORKER_ENDPOINT,
            {
                "action": "complete",
                "jobId": job_id,
                "claimToken": claim_token,
                "videoUrl": video_url,
                "durationSeconds": output.get("duration_seconds"),
            },
            WORKER_TOKEN,
        )
        log(f"Completed job {job_id}.")
    except Exception as error:
        message = str(error)[:1000]
        log(f"Job {job_id} failed: {message}")
        try:
            request_json(
                WORKER_ENDPOINT,
                {
                    "action": "fail",
                    "jobId": job_id,
                    "claimToken": claim_token,
                    "errorMessage": message,
                },
                WORKER_TOKEN,
            )
        except Exception as report_error:
            log(f"Could not persist failure for {job_id}: {report_error}")
    finally:
        heartbeat.stop_event.set()
        heartbeat.join(timeout=2)


def main():
    if not WORKER_TOKEN:
        log("AVATAR_WORKER_TOKEN is required.")
        sys.exit(2)
    if not INFERENCE_URL or not INFERENCE_TOKEN:
        log("AVATAR_INFERENCE_URL and AVATAR_INFERENCE_TOKEN are required.")
        sys.exit(2)
    if not INFERENCE_URL.startswith("https://"):
        log("AVATAR_INFERENCE_URL must use HTTPS.")
        sys.exit(2)
    if not API_BASE_URL.startswith("https://"):
        log("SWAR_API_BASE_URL must use HTTPS.")
        sys.exit(2)

    log(f"Worker {WORKER_ID} polling {API_BASE_URL}.")
    while True:
        try:
            response = request_json(
                WORKER_ENDPOINT,
                {"action": "claim", "workerId": WORKER_ID},
                WORKER_TOKEN,
            )
            claim = response.get("claim")
            if claim:
                process_claim(claim)
            else:
                time.sleep(POLL_INTERVAL_SECONDS)
        except KeyboardInterrupt:
            log("Worker stopped.")
            return
        except urllib.error.HTTPError as error:
            details = error.read(500).decode("utf-8", errors="replace")
            log(f"API returned HTTP {error.code}: {details}")
            time.sleep(POLL_INTERVAL_SECONDS)
        except Exception as error:
            log(f"Polling failed: {error}")
            time.sleep(POLL_INTERVAL_SECONDS)


if __name__ == "__main__":
    main()
