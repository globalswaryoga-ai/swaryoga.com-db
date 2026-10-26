import bpy
import os
import sys
import subprocess
import time

sys.path.append("/var/www/swaryoga/scripts")
from blender_water_30s_master_v2 import build_complete_scene

def run_production_pipeline():
    t_start = time.time()
    print("=== STARTING SWAR YOGA 30-SECOND WATER DRINKING PRODUCTION PIPELINE V2 ===")

    # 1. Build Master Scene
    build_complete_scene()
    scene = bpy.context.scene

    out_dir = "/var/www/swaryoga/public/workflow-proof/30s-water-v2"
    os.makedirs(out_dir, exist_ok=True)
    frames_dir = "/tmp/water_v2_frames"
    os.makedirs(frames_dir, exist_ok=True)

    # 2. Render 7 Timeline Milestone Proof Frames at 1080p
    milestones = {
        0: 1,      # 0s: Establishing shot
        5: 125,    # 5s: Reaching for jug
        10: 250,   # 10s: Pouring water into crystal glass
        15: 375,   # 15s: Lifting filled glass
        20: 500,   # 20s: Drinking action at lips
        25: 625,   # 25s: Returning glass to table
        30: 750    # 30s: Settled in relaxed mindful posture
    }

    print("=== Step 1: Rendering 7 Timeline Milestone Proof Frames (1080p) ===")
    scene.render.resolution_x = 1920
    scene.render.resolution_y = 1080
    scene.cycles.samples = 8
    scene.cycles.use_denoising = False
    scene.render.image_settings.file_format = "PNG"

    for sec, frame in milestones.items():
        scene.frame_set(frame)
        out_path = os.path.join(out_dir, f"milestone_{sec:02d}s_frame_{frame:04d}.png")
        scene.render.filepath = out_path
        print(f"Rendering {sec}s (Frame {frame}) -> {out_path}...")
        bpy.ops.render.render(write_still=True)
        print(f"✓ Saved {out_path}")

    # 3. Render 4K Test Frame (3840x2160) at Frame 250 (Water Pouring Peak)
    print("=== Step 2: Rendering 4K Ultra-HD Test Frame (3840x2160) ===")
    scene.render.resolution_x = 3840
    scene.render.resolution_y = 2160
    scene.frame_set(250)
    out_4k_path = os.path.join(out_dir, "4k_test_frame_3840x2160.png")
    scene.render.filepath = out_4k_path
    print(f"Rendering 4K UHD frame -> {out_4k_path}...")
    bpy.ops.render.render(write_still=True)
    print(f"✓ Saved 4K Test Frame: {out_4k_path}")

    # Reset resolution to 1080p for animation
    scene.render.resolution_x = 1920
    scene.render.resolution_y = 1080
    scene.render.fps = 25
    scene.frame_start = 1
    scene.frame_end = 750

    # 4. Render All 750 Frames (Cycles 2-samples for optimal video playback)
    print("=== Step 3: Rendering Full 750 Animation Frames (1080p @ 25 FPS) ===")
    scene.cycles.samples = 2
    scene.render.filepath = os.path.join(frames_dir, "frame_")
    t_anim_start = time.time()
    bpy.ops.render.render(animation=True)
    print(f"✓ All 750 frames rendered in {time.time() - t_anim_start:.2f} seconds.")

    # 5. Generate Vedic 432 Hz Ambient Meditation Audio
    audio_path = "/tmp/ambient_meditation_30s.aac"
    audio_cmd = [
        "ffmpeg", "-y", "-f", "lavfi",
        "-i", "sine=frequency=108:sample_rate=48000,volume=0.3[s1];sine=frequency=216:sample_rate=48000,volume=0.2[s2];sine=frequency=432:sample_rate=48000,volume=0.25[s3];anoisesrc=d=30:c=pink:r=48000:a=0.015[pink];[s1][s2][s3][pink]amix=inputs=4:duration=first,afade=t=in:ss=0:d=2,afade=t=out:st=27:d=3",
        "-t", "30", "-c:a", "aac", "-b:a", "192k", audio_path
    ]
    subprocess.run(audio_cmd, check=True)
    print("✓ Ambient Vedic meditation audio generated.")

    # 6. Encode H.264 Master MP4
    mp4_path = os.path.join(out_dir, "swar_water_drinking_30s_v2.mp4")
    encode_cmd = [
        "ffmpeg", "-y",
        "-framerate", "25",
        "-i", os.path.join(frames_dir, "frame_%04d.png"),
        "-i", audio_path,
        "-c:v", "libx264",
        "-pix_fmt", "yuv420p",
        "-preset", "medium",
        "-crf", "20",
        "-c:a", "copy",
        "-shortest",
        "-movflags", "+faststart",
        mp4_path
    ]
    print(f"Encoding Master MP4: {mp4_path}...")
    subprocess.run(encode_cmd, check=True)
    print("✓ Master MP4 encoded successfully.")

    # 7. Upload to Bunny Storage CDN
    print("=== Step 4: Uploading Deliverables to Bunny Storage CDN ===")
    api_key = "e9e4333a-5bde-4f1f-acbd5c838aad-92c3-4f2d"
    bunny_zone = "swaryogadb"

    def upload_file(local_path, remote_name, mime_type):
        url = f"https://storage.bunnycdn.com/{bunny_zone}/workflow-proof/30s-water-v2/{remote_name}"
        curl_cmd = [
            "curl", "-s", "-w", "%{http_code}",
            "-X", "PUT", url,
            "-H", f"AccessKey: {api_key}",
            "-H", f"Content-Type: {mime_type}",
            "--data-binary", f"@{local_path}"
        ]
        res = subprocess.run(curl_cmd, capture_output=True, text=True)
        print(f"Uploaded {remote_name} -> HTTP {res.stdout.strip()}")

    # Upload Milestones
    for sec, frame in milestones.items():
        fname = f"milestone_{sec:02d}s_frame_{frame:04d}.png"
        fpath = os.path.join(out_dir, fname)
        upload_file(fpath, fname, "image/png")

    # Upload 4K Frame
    upload_file(out_4k_path, "4k_test_frame_3840x2160.png", "image/png")

    # Upload Master MP4
    upload_file(mp4_path, "swar_water_drinking_30s_v2.mp4", "video/mp4")

    # 8. FFprobe Verification
    print("=== FFPROBE MASTER MP4 TECHNICAL VERIFICATION ===")
    probe_cmd = ["ffprobe", "-hide_banner", mp4_path]
    subprocess.run(probe_cmd)

    total_time = time.time() - t_start
    print(f"=== PIPELINE COMPLETED SUCCESSFULLY IN {total_time:.2f} SECONDS ===")

if __name__ == "__main__":
    run_production_pipeline()
