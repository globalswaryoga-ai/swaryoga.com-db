#!/usr/bin/env python3
"""
Real Video Generation Engine:
Takes a themed portrait of Mohan Sir (Face + Profession Attire/Environment),
adds natural facial micro-movements, eye blinks, breathing sway, cinematic zoom,
and audio-driven mouth viseme lip movements, and encodes into a 1080p MP4.
"""

import os
import sys
import wave
import cv2
import numpy as np
from PIL import Image

def get_audio_amplitude_envelope(wav_path, fps=30, total_seconds=None):
    with wave.open(wav_path, 'rb') as wf:
        n_channels = wf.getnchannels()
        sampwidth = wf.getsampwidth()
        framerate = wf.getframerate()
        n_frames = wf.getnframes()
        raw_data = wf.readframes(n_frames)
    
    # 16-bit mono or stereo
    if sampwidth == 2:
        dtype = np.int16
    else:
        dtype = np.uint8
    
    audio_arr = np.frombuffer(raw_data, dtype=dtype)
    if n_channels > 1:
        audio_arr = audio_arr.reshape(-1, n_channels)[:, 0]
    
    audio_duration = len(audio_arr) / framerate
    target_duration = total_seconds if total_seconds else audio_duration
    total_video_frames = int(target_duration * fps)
    
    samples_per_video_frame = int(framerate / fps)
    envelope = []
    
    for i in range(total_video_frames):
        start = i * samples_per_video_frame
        end = start + samples_per_video_frame
        if start < len(audio_arr):
            chunk = np.abs(audio_arr[start:end].astype(np.float32))
            rms = np.mean(chunk) if len(chunk) > 0 else 0
        else:
            rms = 0
        envelope.append(rms)
    
    envelope = np.array(envelope, dtype=np.float32)
    max_val = np.percentile(envelope, 95)
    if max_val > 0:
        envelope = np.clip(envelope / max_val, 0.0, 1.0)
    
    # Smooth envelope with Gaussian filter
    kernel = np.ones(5, dtype=np.float32) / 5.0
    envelope = np.convolve(envelope, kernel, mode='same')
    
    return envelope, target_duration

def generate_talking_video(image_path, audio_path, output_mp4_path, duration_sec=15):
    print(f"Loading portrait: {image_path}")
    base_bgr = cv2.imread(image_path)
    if base_bgr is None:
        raise ValueError(f"Could not load image: {image_path}")
    
    # Resize to exact 1920x1080
    base_bgr = cv2.resize(base_bgr, (1920, 1080), interpolation=cv2.INTER_LANCZOS4)
    h, w = base_bgr.shape[:2]
    
    # Get audio envelope
    fps = 30
    envelope, duration = get_audio_amplitude_envelope(audio_path, fps=fps, total_seconds=duration_sec)
    total_frames = len(envelope)
    print(f"Total video frames to render: {total_frames} ({duration:.1f}s at {fps} fps)")
    
    # Estimate face center and mouth region
    # For standard chest-up 1080p portrait:
    # Face center is roughly around x: 0.50*w, y: 0.35*h
    face_cx = int(w * 0.50)
    face_cy = int(h * 0.36)
    
    # Mouth region (viseme deformation zone):
    mouth_cx = face_cx
    mouth_cy = int(face_cy + h * 0.13)
    mouth_rx = int(w * 0.045)  # mouth half-width ~86px
    mouth_ry = int(h * 0.028)  # mouth half-height ~30px
    
    # Eye regions (for blinking):
    eye_lx = int(face_cx - w * 0.045)
    eye_rx = int(face_cx + w * 0.045)
    eye_y = int(face_cy - h * 0.025)
    eye_r = int(w * 0.022)
    
    temp_raw_avi = output_mp4_path + ".raw.avi"
    fourcc = cv2.VideoWriter_fourcc(*'MJPG')
    out_writer = cv2.VideoWriter(temp_raw_avi, fourcc, fps, (w, h))
    
    for f in range(total_frames):
        vol = float(envelope[f])  # 0.0 to 1.0 speech intensity
        t = f / fps
        
        frame = base_bgr.copy()
        
        # 1. Subtle breathing float (vertical sway ±2px)
        float_y = int(2.0 * np.sin(2.0 * np.pi * t * 0.28))
        float_x = int(1.0 * np.cos(2.0 * np.pi * t * 0.14))
        
        if float_y != 0 or float_x != 0:
            M = np.float32([[1, 0, float_x], [0, 1, float_y]])
            frame = cv2.warpAffine(frame, M, (w, h), borderMode=cv2.BORDER_REFLECT)
        
        # 2. Eye Blinking (Every 3.8 seconds, lasting 4 frames)
        blink_period_frames = int(3.8 * fps)
        frame_in_cycle = f % blink_period_frames
        if frame_in_cycle < 5:
            # Blink closing factor
            blink_pct = np.sin((frame_in_cycle / 5.0) * np.pi)
            for ex in [eye_lx, eye_rx]:
                ey_top = eye_y - eye_r
                ey_bot = eye_y + eye_r
                ex_l = ex - eye_r
                ex_r = ex + eye_r
                
                # Darken eye region slightly downward to simulate eyelid closing
                eye_crop = frame[ey_top:ey_bot, ex_l:ex_r].astype(np.float32)
                lid_h = int(eye_crop.shape[0] * blink_pct * 0.6)
                if lid_h > 0:
                    skin_tone = np.mean(frame[ey_top-5:ey_top, ex_l:ex_r], axis=(0,1))
                    eye_crop[:lid_h, :] = eye_crop[:lid_h, :] * 0.3 + skin_tone * 0.7
                    frame[ey_top:ey_bot, ex_l:ex_r] = eye_crop.astype(np.uint8)
        
        # 3. Dynamic Mouth Viseme Opening proportional to speech volume
        if vol > 0.08:
            open_dy = int(vol * 7.5) # 0 to 7 pixels open
            if open_dy > 0:
                y1 = max(0, mouth_cy - mouth_ry)
                y2 = min(h, mouth_cy + mouth_ry + open_dy + 4)
                x1 = max(0, mouth_cx - mouth_rx)
                x2 = min(w, mouth_cx + mouth_rx)
                
                mouth_patch = frame[y1:y2, x1:x2].copy()
                ph, pw = mouth_patch.shape[:2]
                
                # Vertical stretch downwards to create natural lower-lip motion
                map_x, map_y = np.meshgrid(np.arange(pw), np.arange(ph))
                map_x = map_x.astype(np.float32)
                map_y = map_y.astype(np.float32)
                
                # Weight by proximity to mouth center
                dist_x = np.abs(map_x - (pw / 2.0)) / (pw / 2.0)
                dist_y = np.maximum(0, (map_y - (ph * 0.45))) / (ph * 0.55)
                weight = (1.0 - np.clip(dist_x, 0, 1)) * np.clip(dist_y, 0, 1)
                
                # Displace downward
                map_y_displaced = map_y - (weight * open_dy)
                deformed = cv2.remap(mouth_patch, map_x, map_y_displaced, cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)
                
                # Blend with Gaussian feathered mask
                mask = np.zeros((ph, pw), dtype=np.float32)
                cv2.ellipse(mask, (pw // 2, int(ph * 0.55)), (pw // 2 - 4, int(ph * 0.45)), 0, 0, 360, 1.0, -1)
                mask = cv2.GaussianBlur(mask, (15, 15), 0)
                mask = np.expand_dims(mask, axis=2)
                
                frame[y1:y2, x1:x2] = (deformed * mask + frame[y1:y2, x1:x2] * (1.0 - mask)).astype(np.uint8)
        
        # 4. Slow cinematic zoom (1.00x -> 1.03x)
        zoom_factor = 1.00 + (0.03 * (f / total_frames))
        if zoom_factor > 1.001:
            cw = int(w / zoom_factor)
            ch = int(h / zoom_factor)
            cx1 = (w - cw) // 2
            cy1 = int((h - ch) * 0.35)
            cropped = frame[cy1:cy1+ch, cx1:cx1+cw]
            frame = cv2.resize(cropped, (w, h), interpolation=cv2.INTER_LINEAR)
        
        out_writer.write(frame)
    
    out_writer.release()
    print("Raw video frames rendered. Merging audio with FFmpeg...")
    
    # Merge with FFmpeg: H.264 1080p + AAC Stereo audio
    ffmpeg_cmd = (
        f'ffmpeg -y -i "{temp_raw_avi}" -i "{audio_path}" '
        f'-t {duration:.2f} '
        f'-c:v libx264 -pix_fmt yuv420p -preset fast -crf 20 '
        f'-c:a aac -b:a 192k -movflags +faststart '
        f'"{output_mp4_path}"'
    )
    res = os.system(ffmpeg_cmd)
    
    if os.path.exists(temp_raw_avi):
        os.remove(temp_raw_avi)
        
    if res == 0 and os.path.exists(output_mp4_path):
        print(f"✅ Generated real video: {output_mp4_path} ({os.path.getsize(output_mp4_path)} bytes)")
        return True
    else:
        raise RuntimeError("FFmpeg export failed.")

if __name__ == "__main__":
    img = sys.argv[1]
    aud = sys.argv[2]
    out = sys.argv[3]
    dur = float(sys.argv[4]) if len(sys.argv) > 4 else 15
    generate_talking_video(img, aud, out, dur)

