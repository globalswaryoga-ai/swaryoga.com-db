import bpy
import os
import sys
import subprocess
import time

sys.path.append("/var/www/swaryoga/scripts")
from blender_water_30s_master import build_scene

def render_full_30s_animation():
    print("=== STARTING FULL 30-SECOND WATER DRINKING PRODUCTION ACCEPTANCE RENDER ===")
    t_start = time.time()
    
    # 1. Build Master Scene
    build_scene()
    scene = bpy.context.scene

    # 2. Configure 1080p, 25 FPS, 750 Frames, Cycles Engine
    frames_dir = "/tmp/water_30s_frames"
    os.makedirs(frames_dir, exist_ok=True)

    scene.render.resolution_x = 1920
    scene.render.resolution_y = 1080
    scene.render.resolution_percentage = 100
    scene.render.fps = 25
    scene.frame_start = 1
    scene.frame_end = 750

    scene.render.engine = "CYCLES"
    scene.cycles.device = "CPU"
    scene.cycles.samples = 1
    scene.cycles.use_denoising = False
    scene.render.image_settings.file_format = "PNG"
    scene.render.filepath = os.path.join(frames_dir, "frame_")

    print(f"Rendering 750 frames (1-750) at 1920x1080 @ 25 FPS into {frames_dir}...")
    bpy.ops.render.render(animation=True)
    t_rendered = time.time()
    print(f"✓ All 750 frames rendered in {t_rendered - t_start:.2f} seconds.")

    # 3. Generate Vedic 432 Hz Ambient Meditation Soundtrack
    audio_path = "/tmp/ambient_meditation_30s.aac"
    audio_cmd = [
        "ffmpeg", "-y", "-f", "lavfi",
        "-i", "sine=frequency=108:sample_rate=48000,volume=0.3[s1];sine=frequency=216:sample_rate=48000,volume=0.2[s2];sine=frequency=432:sample_rate=48000,volume=0.25[s3];anoisesrc=d=30:c=pink:r=48000:a=0.015[pink];[s1][s2][s3][pink]amix=inputs=4:duration=first,afade=t=in:ss=0:d=2,afade=t=out:st=27:d=3",
        "-t", "30", "-c:a", "aac", "-b:a", "192k", audio_path
    ]
    subprocess.run(audio_cmd, check=True)
    print("✓ Ambient Vedic meditation audio generated.")

    # 4. Encode H.264 MP4 with AAC Audio
    out_dir = "/var/www/swaryoga/public/workflow-proof/30s-water"
    os.makedirs(out_dir, exist_ok=True)
    mp4_path = os.path.join(out_dir, "swar_water_drinking_30s_master.mp4")

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
    print(f"Encoding MP4: {mp4_path}...")
    subprocess.run(encode_cmd, check=True)
    print("✓ MP4 encoding completed successfully.")

    # 5. Upload Master MP4 to Bunny Storage CDN
    print("Uploading master MP4 to Bunny Storage CDN...")
    upload_cmd = [
        "curl", "-s", "-w", "\\nHTTP: %{http_code}\\n",
        "-X", "PUT",
        "https://storage.bunnycdn.com/swaryogadb/workflow-proof/30s-water/swar_water_drinking_30s_master.mp4",
        "-H", "AccessKey: e9e4333a-5bde-4f1f-acbd5c838aad-92c3-4f2d",
        "-H", "Content-Type: video/mp4",
        "--data-binary", f"@{mp4_path}"
    ]
    subprocess.run(upload_cmd, check=True)
    print("✓ Uploaded to Bunny CDN: https://swaryogacrm.b-cdn.net/workflow-proof/30s-water/swar_water_drinking_30s_master.mp4")

    # 6. Run FFprobe Verification
    print("=== FFPROBE VERIFICATION ===")
    probe_cmd = ["ffprobe", "-hide_banner", mp4_path]
    subprocess.run(probe_cmd)
    
    total_time = time.time() - t_start
    print(f"=== FULL 30s PIPELINE COMPLETED IN {total_time:.2f} SECONDS ===")

if __name__ == "__main__":
    render_full_30s_animation()
