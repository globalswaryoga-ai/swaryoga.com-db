import bpy
import os
import sys

# Append scripts dir to path to load build_scene
sys.path.append("/var/www/swaryoga/scripts")
from blender_water_30s_master import build_scene

def render_proofs():
    build_scene()
    scene = bpy.context.scene

    out_dir = "/var/www/swaryoga/public/workflow-proof/30s-water"
    os.makedirs(out_dir, exist_ok=True)

    # 1. Render 7 Timeline Milestones at 1080p (1920x1080)
    milestones = {
        0: 1,      # 0s: Environment & seated character established
        5: 125,    # 5s: Reaching for copper jug
        10: 250,   # 10s: Pouring water into crystal glass
        15: 375,   # 15s: Water filled, hand lifting glass
        20: 500,   # 20s: Mindful drinking action at lips
        25: 625,   # 25s: Lowering glass back to teak table
        30: 750    # 30s: Glass settled, calm resting posture
    }

    print("=== Rendering 7 Timeline Milestone Frames at 1080p ===")
    scene.render.resolution_x = 1920
    scene.render.resolution_y = 1080
    scene.render.image_settings.file_format = "PNG"

    for sec, frame in milestones.items():
        scene.frame_set(frame)
        out_path = os.path.join(out_dir, f"milestone_{sec:02d}s_frame_{frame:04d}.png")
        scene.render.filepath = out_path
        print(f"Rendering {sec}s (Frame {frame}) -> {out_path}...")
        bpy.ops.render.render(write_still=True)
        print(f"✓ Saved {out_path}")

    # 2. Render 4K Ultra-HD Test Frame (3840x2160) at frame 250 (Water Pouring Peak)
    print("=== Rendering 4K Ultra-HD Test Frame (3840x2160) ===")
    scene.render.resolution_x = 3840
    scene.render.resolution_y = 2160
    scene.frame_set(250)
    out_4k_path = os.path.join(out_dir, "4k_test_frame_3840x2160.png")
    scene.render.filepath = out_4k_path
    print(f"Rendering 4K UHD frame -> {out_4k_path}...")
    bpy.ops.render.render(write_still=True)
    print(f"✓ Saved 4K Test Frame: {out_4k_path}")

    print("=== ALL PROOFS RENDERED SUCCESSFULLY ===")

if __name__ == "__main__":
    render_proofs()
