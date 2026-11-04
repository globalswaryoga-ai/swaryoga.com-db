#!/usr/bin/env python3
"""
Mohan Sir Facial Expression & 52-ARKit Blendshape DNA Extraction Engine
Powered by Google MediaPipe Face Landmarker Tasks API
Streams directly from Bunny CDN & video storage without disk bottlenecks.
"""

import sys
import os
import json
import argparse
import subprocess
import tempfile
import urllib.request
from typing import Dict, List, Any, Optional

def get_model_path() -> str:
    candidates = [
        "/var/www/swaryoga/models/face_landmarker.task",
        os.path.join(os.path.dirname(os.path.abspath(__file__)), "../models/face_landmarker.task"),
        "/tmp/face_landmarker.task"
    ]
    for c in candidates:
        if os.path.exists(c):
            return os.path.abspath(c)

    target = "/tmp/face_landmarker.task"
    url = "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task"
    print(f"📥 Downloading MediaPipe face_landmarker.task to {target}...", file=sys.stderr)
    urllib.request.urlretrieve(url, target)
    return target

def get_youtube_cookies_file() -> Optional[str]:
    cookies_file = os.environ.get("YOUTUBE_COOKIES_FILE", "").strip()
    if not cookies_file:
        return None
    if not os.path.isfile(cookies_file) or not os.access(cookies_file, os.R_OK):
        raise RuntimeError("YOUTUBE_COOKIES_FILE must point to a readable authorized Netscape cookies file on the worker.")
    return cookies_file

def build_youtube_download_command(
    video_url: str,
    output_path: str,
    cookies_file: Optional[str] = None
) -> List[str]:
    command = [
        os.environ.get("YT_DLP_PATH", "yt-dlp").strip() or "yt-dlp",
        "--no-playlist",
        "--no-warnings",
    ]
    if cookies_file:
        command.extend(["--cookies", cookies_file])
    command.extend(["-f", "worst[ext=mp4]/worst", "-o", output_path, video_url])
    return command

def format_youtube_download_error(detail: str, cookies_configured: bool, exit_code: int) -> str:
    detail = detail.strip()[-1200:] or f"yt-dlp exited with code {exit_code}"
    lowered = detail.lower()
    if "sign in to confirm" in lowered or "not a bot" in lowered or "cookies" in lowered:
        if cookies_configured:
            guidance = "YouTube rejected the configured cookies. Refresh the authorized Netscape cookies file and verify its account can view this video."
        else:
            guidance = "YouTube requires an authorized session for this video. Configure YOUTUBE_COOKIES_FILE with a readable Netscape-format cookies file from an account authorized to view it."
        return f"YouTube download failed: {guidance} {detail}"
    return f"yt-dlp download failed (exit code {exit_code}): {detail}"

def download_youtube_video(video_url: str, output_path: str) -> None:
    cookies_file = get_youtube_cookies_file()
    command = build_youtube_download_command(video_url, output_path, cookies_file)
    try:
        result = subprocess.run(command, capture_output=True, text=True, timeout=600, check=False)
    except FileNotFoundError as error:
        raise RuntimeError("yt-dlp could not start. Install yt-dlp on the worker or set YT_DLP_PATH.") from error
    except subprocess.TimeoutExpired as error:
        raise RuntimeError("YouTube video download timed out after 10 minutes.") from error
    if result.returncode != 0:
        detail = result.stderr or result.stdout
        raise RuntimeError(format_youtube_download_error(detail, bool(cookies_file), result.returncode))

def extract_expressions_from_video(
    video_path_or_url: str,
    output_json_path: Optional[str] = None,
    sample_fps: float = 0.5,
    video_id: str = "video_source"
) -> Dict[str, Any]:
    if "b-cdn.net" in video_path_or_url or "mediadelivery.net" in video_path_or_url:
        os.environ["OPENCV_FFMPEG_CAPTURE_OPTIONS"] = "headers;Referer: https://player.mediadelivery.net/\r\n"

    import cv2
    import numpy as np
    import mediapipe as mp
    from mediapipe.tasks import python
    from mediapipe.tasks.python import vision

    model_path = get_model_path()
    base_options = python.BaseOptions(model_asset_path=model_path)
    options = vision.FaceLandmarkerOptions(
        base_options=base_options,
        output_face_blendshapes=True,
        output_facial_transformation_matrixes=True,
        num_faces=1,
        min_face_detection_confidence=0.4,
        min_face_presence_confidence=0.4,
        min_tracking_confidence=0.4
    )
    detector = vision.FaceLandmarker.create_from_options(options)
    print("✅ MediaPipe FaceLandmarker with 52 Blendshapes active", file=sys.stderr)

    # 1. Open Video: Attempt direct streaming first (Fastest, zero disk usage)
    print(f"🎬 Opening media stream for {video_id}", file=sys.stderr)
    cap = cv2.VideoCapture(video_path_or_url, cv2.CAP_FFMPEG)

    # If direct stream fails and it's a URL, download via curl or yt-dlp
    temp_dir = None
    if not cap.isOpened() and (video_path_or_url.startswith("http://") or video_path_or_url.startswith("https://")):
        print("⚠️ Direct stream open failed, downloading buffer...", file=sys.stderr)
        temp_dir = tempfile.mkdtemp(prefix="mohan_face_")
        local_video_path = os.path.join(temp_dir, "input.mp4")

        # Download with yt-dlp for YouTube, curl for CDN
        is_youtube = "youtube.com" in video_path_or_url or "youtu.be" in video_path_or_url
        if is_youtube:
            print("▶️ YouTube URL detected, downloading video stream via yt-dlp...", file=sys.stderr)
            try:
                download_youtube_video(video_path_or_url, local_video_path)
            except RuntimeError as yt_err:
                # Clean up temp dir before re-raising the YouTube-specific error
                if temp_dir and os.path.exists(temp_dir):
                    try:
                        import shutil
                        shutil.rmtree(temp_dir)
                    except Exception:
                        pass
                raise yt_err
        else:
            subprocess.run([
                "curl", "--fail", "--silent", "--show-error", "--location",
                "--referer", "https://player.mediadelivery.net/",
                "--output", local_video_path, video_path_or_url,
            ], check=True)
        cap = cv2.VideoCapture(local_video_path, cv2.CAP_FFMPEG)

    if not cap.isOpened():
        raise RuntimeError(f"Could not open video stream: {video_path_or_url}")

    video_fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
    duration_sec = total_frames / video_fps if video_fps > 0 else 0.0

    frame_interval = max(1, int(round(video_fps / sample_fps)))
    current_frame_idx = 0
    analyzed_records: List[Dict[str, Any]] = []

    print(f"🎬 Processing: duration={duration_sec:.1f}s, total_frames={total_frames}, interval={frame_interval}", file=sys.stderr)

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        if current_frame_idx % frame_interval == 0:
            timestamp_sec = current_frame_idx / video_fps
            timestamp_ms = int(timestamp_sec * 1000)
            mins = int(timestamp_sec // 60)
            secs = int(timestamp_sec % 60)
            ts_formatted = f"{mins:02d}:{secs:02d}"

            rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb_frame)
            detection_result = detector.detect(mp_image)

            record = {
                "timestamp_ms": timestamp_ms,
                "timestamp_sec": round(timestamp_sec, 2),
                "timestamp_formatted": ts_formatted,
                "face_detected": False,
                "primary_expression": "no_face_detected",
                "intensity": 0,
                "confidence": 0.0,
                "blendshapes": {},
                "head_pose": {"pitch": 0.0, "yaw": 0.0, "roll": 0.0}
            }

            if detection_result.face_blendshapes and len(detection_result.face_blendshapes) > 0:
                record["face_detected"] = True
                record["confidence"] = 0.98

                blendshape_categories = detection_result.face_blendshapes[0]
                shapes_dict: Dict[str, float] = {}
                for cat in blendshape_categories:
                    shapes_dict[cat.category_name] = round(cat.score, 3)

                record["blendshapes"] = shapes_dict

                smile_l = shapes_dict.get("mouthSmileLeft", 0.0)
                smile_r = shapes_dict.get("mouthSmileRight", 0.0)
                smile = (smile_l + smile_r) / 2.0

                jaw_open = shapes_dict.get("jawOpen", 0.0)
                brow_up = shapes_dict.get("browInnerUp", 0.0)
                squint = (shapes_dict.get("eyeSquintLeft", 0.0) + shapes_dict.get("eyeSquintRight", 0.0)) / 2.0
                blink = (shapes_dict.get("eyeBlinkLeft", 0.0) + shapes_dict.get("eyeBlinkRight", 0.0)) / 2.0

                if smile > 0.5 and jaw_open > 0.35:
                    record["primary_expression"] = "punchline_humor"
                    record["intensity"] = 95
                elif smile > 0.55 and squint > 0.25:
                    record["primary_expression"] = "duchenne_smile"
                    record["intensity"] = int(80 + (smile * 20))
                elif smile > 0.35:
                    record["primary_expression"] = "smile_warm"
                    record["intensity"] = int(65 + (smile * 30))
                elif blink > 0.45 or (squint > 0.3 and smile < 0.2):
                    record["primary_expression"] = "meditative_focus"
                    record["intensity"] = 92
                elif brow_up > 0.38:
                    record["primary_expression"] = "inquisitive_eyebrow"
                    record["intensity"] = int(70 + (brow_up * 25))
                elif jaw_open > 0.25 and smile < 0.3:
                    record["primary_expression"] = "teaching_authority"
                    record["intensity"] = 82
                else:
                    record["primary_expression"] = "serene_contemplation"
                    record["intensity"] = 65

            analyzed_records.append(record)

        current_frame_idx += 1

    cap.release()

    expression_counts: Dict[str, int] = {}
    for r in analyzed_records:
        if not r["face_detected"]:
            continue
        exp = r["primary_expression"]
        expression_counts[exp] = expression_counts.get(exp, 0) + 1

    result_payload = {
        "video_id": video_id,
        "source_url": video_path_or_url,
        "duration_seconds": round(duration_sec, 2),
        "total_frames_in_video": total_frames,
        "sampled_frames_count": len(analyzed_records),
        "sample_fps": sample_fps,
        "expressions_distribution": expression_counts,
        "timeline": analyzed_records
    }

    if output_json_path:
        os.makedirs(os.path.dirname(os.path.abspath(output_json_path)), exist_ok=True)
        with open(output_json_path, "w", encoding="utf-8") as f:
            json.dump(result_payload, f, indent=2, ensure_ascii=False)
        print(f"💾 Saved facial timeline JSON to: {output_json_path}", file=sys.stderr)

    if temp_dir and os.path.exists(temp_dir):
        try:
            import shutil
            shutil.rmtree(temp_dir)
        except Exception:
            pass

    return result_payload

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Extract Mohan Sir Facial Expression DNA with 52 Blendshapes")
    parser.add_argument("--video", required=True, help="Path to video or YouTube URL")
    parser.add_argument("--output", required=False, help="Path to output JSON")
    parser.add_argument("--fps", type=float, default=0.5, help="Frames per second to sample (default 0.5)")
    parser.add_argument("--video-id", default="video_source", help="Identifier for video")
    args = parser.parse_args()

    output = extract_expressions_from_video(
        video_path_or_url=args.video,
        output_json_path=args.output,
        sample_fps=args.fps,
        video_id=args.video_id
    )

    print(json.dumps({
        "success": True,
        "video_id": output["video_id"],
        "duration": output["duration_seconds"],
        "frames_sampled": output["sampled_frames_count"],
        "expressions": output["expressions_distribution"]
    }))
