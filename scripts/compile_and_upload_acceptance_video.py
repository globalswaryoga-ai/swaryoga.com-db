import os
import subprocess
import time
import urllib.request

def compile_and_upload():
    base_dir = "/Users/mohankalburgi/swaryoga.com-db/public/avatar-studio/3d-digital-twin"
    frames_dir = os.path.join(base_dir, "renders", "frames")
    temp_video = os.path.join(base_dir, "renders", "temp_visual_1080p.mp4")
    final_video = os.path.join(base_dir, "renders", "mohan_sir_3d_acceptance_1080p.mp4")
    
    # Check frame count
    frames = [f for f in os.listdir(frames_dir) if f.endswith(".png")]
    print(f"📊 Found {len(frames)} rendered 1080p frames in {frames_dir}")
    
    # 1. Compile PNG sequence to 1080p H.264
    print("🎬 Compiling 250 frames to 1080p H.264 Video (25 FPS)...")
    cmd_compile = [
        "ffmpeg", "-y",
        "-framerate", "25",
        "-i", os.path.join(frames_dir, "frame_%04d.png"),
        "-c:v", "libx264",
        "-pix_fmt", "yuv420p",
        "-preset", "slow",
        "-crf", "18",
        temp_video
    ]
    subprocess.run(cmd_compile, check=True)
    
    # 2. Mux with Mohan Sir Authentic Crystal Clear Voice
    voice_src = "/Users/mohankalburgi/swaryoga.com-db/public/voice-clones/dna-39/dna_voice_04f6e33e.mp3"
    print("🎙️ Muxing 48kHz Crystal-Clear Studio Audio...")
    cmd_mux = [
        "ffmpeg", "-y",
        "-i", temp_video,
        "-i", voice_src,
        "-c:v", "copy",
        "-c:a", "aac",
        "-b:a", "256k",
        "-ar", "48000",
        "-shortest",
        "-movflags", "+faststart",
        final_video
    ]
    subprocess.run(cmd_mux, check=True)
    
    # 3. FFprobe inspection
    print("🔍 Inspecting Video Stream with FFprobe...")
    cmd_probe = [
        "ffprobe", "-v", "error",
        "-show_entries", "format=duration,size,bit_rate:stream=codec_name,width,height,r_frame_rate",
        "-of", "default=noprint_wrappers=1",
        final_video
    ]
    probe_res = subprocess.run(cmd_probe, capture_output=True, text=True, check=True)
    print("\n--- FFPROBE REPORT ---")
    print(probe_res.stdout)
    print("----------------------\n")
    
    # 4. Upload to Bunny CDN
    BUNNY_API_KEY = "e9e4333a-5bde-4f1f-acbd5c838aad-92c3-4f2d"
    STORAGE_ZONE = "swaryogadb"
    remote_path = "avatar-studio/3d-digital-twin/mohan_sir_3d_acceptance_1080p.mp4"
    upload_url = f"https://storage.bunnycdn.com/{STORAGE_ZONE}/{remote_path}"
    cdn_url = f"https://swaryogacrm.b-cdn.net/{remote_path}"
    
    print(f"📤 Uploading Acceptance Video to Bunny CDN: {upload_url}...")
    with open(final_video, "rb") as f:
        file_bytes = f.read()
        req = urllib.request.Request(
            upload_url,
            data=file_bytes,
            headers={
                "AccessKey": BUNNY_API_KEY,
                "Content-Type": "video/mp4"
            },
            method="PUT"
        )
        try:
            with urllib.request.urlopen(req) as resp:
                if resp.status in [200, 201]:
                    print(f"✅ Live Acceptance Video URL: {cdn_url}")
                else:
                    print(f"Upload returned status {resp.status}")
        except Exception as e:
            print(f"Upload error: {e}")

if __name__ == "__main__":
    compile_and_upload()
