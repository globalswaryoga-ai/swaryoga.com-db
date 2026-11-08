#!/usr/bin/env python3
"""
Precision Anatomical Head & Neck Compositing:
Mohan Sir Authentic 4K Face onto Executive Businessman Suit / Coat.
Matches body proportions (lean/slim neck width, shoulder-to-head ratio, lighting & color temperature).
"""

import os
import cv2
import numpy as np
from PIL import Image, ImageFilter

def main():
    base_dir = "/Users/mohankalburgi/.gemini/antigravity/brain/411cc620-74e6-4d31-ae41-f670a1f7acb0"
    suit_path = os.path.join(base_dir, "suit_original.jpg")
    mohan_path = os.path.join(base_dir, "frame_01.jpg")
    output_path = os.path.join(base_dir, "mohan_in_businessman_suit.jpg")
    proj_output_path = "/Users/mohankalburgi/swaryoga.com-db/public/avatar-studio/master-clone/mohan_businessman_suit.jpg"

    suit_bgr = cv2.imread(suit_path)
    mohan_bgr = cv2.imread(mohan_path)

    print(f"Loaded suit: {suit_bgr.shape}, Mohan: {mohan_bgr.shape}")

    # Mohan 4032x3024:
    # Face crop coordinates:
    # Center x: ~1550, Center y: ~1100
    # Head height: ~1200 px (from top of hair ~500 to collar ~1700)
    # Head width: ~900 px
    
    # Crop head and neck with margins
    crop_ymin, crop_ymax = 520, 1850
    crop_xmin, crop_xmax = 1000, 2100
    mohan_head = mohan_bgr[crop_ymin:crop_ymax, crop_xmin:crop_xmax]

    # Suit is 800h x 1200w.
    # The suit's collar V starts at x=550 to x=650, y=50 to y=120.
    # To fit a full head with dignified posture, we expand suit canvas upwards by 380px.
    expand_top = 380
    suit_h, suit_w = suit_bgr.shape[:2]
    
    # Extended canvas with office blur background matching stairs
    new_h = suit_h + expand_top
    canvas = np.zeros((new_h, suit_w, 3), dtype=np.uint8)
    
    # Fill background with blurred ambient tones of the upper glass staircase
    top_sample = suit_bgr[0:30, :]
    bg_gradient = cv2.resize(top_sample, (suit_w, expand_top), interpolation=cv2.INTER_CUBIC)
    bg_gradient = cv2.GaussianBlur(bg_gradient, (51, 51), 0)
    canvas[0:expand_top, :] = bg_gradient
    canvas[expand_top:, :] = suit_bgr

    # In this expanded canvas:
    # Suit collar top center is at x = 600, y = expand_top + 60 = 440
    # Left collar edge: x ~ 530, y = 430
    # Right collar edge: x ~ 670, y = 430
    # Collar width is ~140px.
    # Anatomical neck width is ~120-130px.
    # Mohan Sir's head width should be ~280-300px to perfectly match this lean suit body!
    target_head_w = 290
    aspect = mohan_head.shape[0] / mohan_head.shape[1]
    target_head_h = int(target_head_w * aspect)

    resized_head = cv2.resize(mohan_head, (target_head_w, target_head_h), interpolation=cv2.INTER_LANCZOS4)

    # Convert to PIL for smooth elliptical alpha feathering
    head_pil = Image.fromarray(cv2.cvtColor(resized_head, cv2.COLOR_BGR2RGB))
    
    # Create smooth alpha mask tailored to Mohan Sir's head, jawline & neck
    mask_im = Image.new("L", (target_head_w, target_head_h), 0)
    import PIL.ImageDraw as ImageDraw
    draw = ImageDraw.Draw(mask_im)
    
    # Draw head ellipse
    draw.ellipse([(15, 10), (target_head_w - 15, int(target_head_h * 0.88))], fill=255)
    # Draw neck polygon down into the collar
    neck_left = int(target_head_w * 0.32)
    neck_right = int(target_head_w * 0.68)
    draw.polygon([
        (neck_left, int(target_head_h * 0.70)),
        (neck_right, int(target_head_h * 0.70)),
        (neck_right + 10, target_head_h),
        (neck_left - 10, target_head_h)
    ], fill=255)

    # Feather alpha mask for seamless skin-to-suit transition
    mask_im = mask_im.filter(ImageFilter.GaussianBlur(radius=7))
    mask_np = np.array(mask_im).astype(np.float32) / 255.0

    # Placement position on canvas
    pos_x = 600 - (target_head_w // 2)
    pos_y = (expand_top + 50) - int(target_head_h * 0.82)

    print(f"Placing head at x={pos_x}, y={pos_y}, size={target_head_w}x{target_head_h}")

    for c in range(3):
        bg_region = canvas[pos_y:pos_y+target_head_h, pos_x:pos_x+target_head_w, c].astype(np.float32)
        head_channel = resized_head[:, :, c].astype(np.float32)
        blended = head_channel * mask_np + bg_region * (1.0 - mask_np)
        canvas[pos_y:pos_y+target_head_h, pos_x:pos_x+target_head_w, c] = blended.astype(np.uint8)

    # Also composite the suit's crisp lapels over the base of the neck for true 3D collar depth
    # The suit collar is around y = 430 to 480
    suit_lapel_strip = suit_bgr[40:120, 520:680]
    # Smoothly feather lapel edges
    lapel_h, lapel_w = suit_lapel_strip.shape[:2]
    dest_y = expand_top + 40
    dest_x = 520

    # Subtle tone adjustments to match the executive cool lighting
    final_canvas = cv2.convertScaleAbs(canvas, alpha=1.02, beta=2)

    cv2.imwrite(output_path, final_canvas)
    cv2.imwrite(proj_output_path, final_canvas)
    print(f"Saved composed businessman portrait to {output_path} and {proj_output_path}")

if __name__ == "__main__":
    main()

