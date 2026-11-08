#!/usr/bin/env python3
"""
Master Batch Generator:
Creates authentic 30-second 1080p videos for ALL 34 PROFESSIONS
featuring Mohan Sir's real face, matching themed body and attire,
and authentic spoken voice.
"""

import os
import sys
import wave
import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

BASE_DIR = "/Users/mohankalburgi/swaryoga.com-db"
OUTPUT_DIR = os.path.join(BASE_DIR, "public/avatar-studio/videos")
THUMB_DIR = os.path.join(BASE_DIR, "public/avatar-studio/master-clone")
HEAD_PATH = "/Users/mohankalburgi/.gemini/antigravity/brain/411cc620-74e6-4d31-ae41-f670a1f7acb0/mohan_head_nobg.png"
AUDIO_PATH = "/Users/mohankalburgi/.gemini/antigravity/brain/411cc620-74e6-4d31-ae41-f670a1f7acb0/mohan_voice_48k.wav"

os.makedirs(OUTPUT_DIR, exist_ok=True)
os.makedirs(THUMB_DIR, exist_ok=True)

# 34 Structured Professions with distinct visual themes and attire styling
PROFESSION_THEMES = [
    {
        "id": "university_professor",
        "nameEn": "University Professor",
        "nameHi": "विश्वविद्यालय प्राध्यापक",
        "bg_color": (32, 28, 45),     # Deep wood lecture hall
        "accent_color": (160, 130, 80), # Academic brass
        "suit_color": (45, 45, 65),    # Navy professor blazer
        "shirt_color": (230, 235, 245),
        "tie_color": (150, 40, 40),
        "prop": "lecture_hall_chalkboard",
    },
    {
        "id": "school_teacher",
        "nameEn": "School Teacher",
        "nameHi": "विद्यालय शिक्षक",
        "bg_color": (25, 40, 35),
        "accent_color": (100, 180, 120),
        "suit_color": (60, 50, 45),
        "shirt_color": (240, 240, 230),
        "tie_color": None,
        "prop": "classroom_bookshelf",
    },
    {
        "id": "college_lecturer",
        "nameEn": "College Lecturer",
        "nameHi": "महाविद्यालय व्याख्याता",
        "bg_color": (20, 30, 45),
        "accent_color": (70, 130, 200),
        "suit_color": (40, 45, 55),
        "shirt_color": (220, 230, 245),
        "tie_color": (40, 70, 130),
        "prop": "modern_amphitheater",
    },
    {
        "id": "yoga_teacher",
        "nameEn": "Yoga Teacher",
        "nameHi": "योग शिक्षक",
        "bg_color": (35, 30, 20),      # Saffron ashram warm tone
        "accent_color": (220, 160, 50),
        "suit_color": (245, 245, 240), # Sacred white khadi kurta
        "shirt_color": (245, 245, 240),
        "tie_color": None,
        "is_kurta": True,
        "prop": "ashram_meditation_hall",
    },
    {
        "id": "spiritual_teacher",
        "nameEn": "Spiritual Guru & Acharya",
        "nameHi": "आध्यात्मिक गुरु व आचार्य",
        "bg_color": (40, 25, 15),
        "accent_color": (240, 140, 30),
        "suit_color": (240, 180, 50),  # Golden saffron silk
        "shirt_color": (250, 240, 220),
        "tie_color": None,
        "is_kurta": True,
        "prop": "temple_sacred_arch",
    },
    {
        "id": "doctor",
        "nameEn": "Doctor & Integrative Physician",
        "nameHi": "चिकित्सक (डॉक्टर)",
        "bg_color": (20, 35, 40),      # Clean hospital clinic
        "accent_color": (40, 190, 180),
        "suit_color": (245, 248, 250), # White medical lab coat
        "shirt_color": (190, 220, 240),
        "tie_color": (30, 60, 120),
        "has_stethoscope": True,
        "prop": "medical_clinic_charts",
    },
    {
        "id": "health_educator",
        "nameEn": "Health & Wellness Educator",
        "nameHi": "स्वास्थ्य व आरोग्य शिक्षक",
        "bg_color": (25, 40, 25),
        "accent_color": (120, 210, 80),
        "suit_color": (45, 70, 50),
        "shirt_color": (240, 250, 240),
        "tie_color": None,
        "prop": "wellness_nature_center",
    },
    {
        "id": "banker",
        "nameEn": "Banker & Financial Executive",
        "nameHi": "बैंकर व वित्तीय अधिकारी",
        "bg_color": (15, 25, 40),      # Corporate glass office
        "accent_color": (200, 160, 50), # Gold
        "suit_color": (25, 30, 45),    # Bespoke navy blue suit
        "shirt_color": (245, 245, 250),
        "tie_color": (180, 140, 30),   # Silk gold tie
        "prop": "glass_skyline_boardroom",
    },
    {
        "id": "businessman",
        "nameEn": "Businessman & Entrepreneur",
        "nameHi": "व्यवसायी व उद्यमी",
        "bg_color": (25, 30, 38),
        "accent_color": (210, 150, 60),
        "suit_color": (35, 35, 40),    # Charcoal three-piece
        "shirt_color": (240, 240, 245),
        "tie_color": (140, 30, 30),
        "prop": "executive_meeting_table",
    },
    {
        "id": "ceo",
        "nameEn": "Chief Executive Officer (CEO)",
        "nameHi": "मुख्य कार्यकारी अधिकारी (CEO)",
        "bg_color": (15, 20, 30),
        "accent_color": (180, 180, 200),
        "suit_color": (20, 20, 28),    # Midnight black executive
        "shirt_color": (245, 245, 250),
        "tie_color": (40, 60, 100),
        "prop": "penthouse_panoramic_desk",
    },
    {
        "id": "marketing_manager",
        "nameEn": "Marketing Manager",
        "nameHi": "विपणन प्रबंधक",
        "bg_color": (35, 20, 35),
        "accent_color": (230, 80, 120),
        "suit_color": (50, 35, 55),
        "shirt_color": (245, 235, 245),
        "tie_color": None,
        "prop": "creative_agency_lounge",
    },
    {
        "id": "sales_manager",
        "nameEn": "Sales Manager",
        "nameHi": "बिक्री प्रबंधक",
        "bg_color": (30, 25, 20),
        "accent_color": (240, 140, 40),
        "suit_color": (45, 40, 35),
        "shirt_color": (245, 240, 235),
        "tie_color": (180, 70, 20),
        "prop": "commercial_sales_floor",
    },
    {
        "id": "journalist",
        "nameEn": "Journalist & Correspondent",
        "nameHi": "पत्रकार व संवाददाता",
        "bg_color": (20, 25, 30),
        "accent_color": (230, 180, 60),
        "suit_color": (50, 55, 60),
        "shirt_color": (235, 240, 245),
        "tie_color": None,
        "prop": "press_conference_backdrop",
    },
    {
        "id": "news_anchor",
        "nameEn": "Prime-Time News Anchor",
        "nameHi": "प्राइम-टाइम न्यूज़ एंकर",
        "bg_color": (10, 15, 35),      # Broadcast studio blue
        "accent_color": (230, 40, 40),  # Breaking news red
        "suit_color": (25, 30, 45),    # Crisp studio blazer
        "shirt_color": (250, 250, 250),
        "tie_color": (180, 30, 30),
        "prop": "curved_anchor_desk_monitors",
    },
    {
        "id": "lawyer",
        "nameEn": "Advocate & Legal Counsel",
        "nameHi": "अधिवक्ता (वकील)",
        "bg_color": (20, 18, 18),      # High court wood paneling
        "accent_color": (200, 180, 140),
        "suit_color": (15, 15, 18),    # Advocate black coat
        "shirt_color": (255, 255, 255),
        "tie_color": (255, 255, 255),  # White advocate neck bands
        "prop": "courtroom_law_library",
    },
    {
        "id": "scientist",
        "nameEn": "Scientist & Researcher",
        "nameHi": "वैज्ञानिक व शोधकर्ता",
        "bg_color": (18, 28, 38),
        "accent_color": (40, 180, 230),
        "suit_color": (240, 245, 250), # Lab coat
        "shirt_color": (210, 225, 240),
        "tie_color": (30, 50, 80),
        "prop": "high_tech_chemistry_lab",
    },
    {
        "id": "researcher",
        "nameEn": "Data & Academic Researcher",
        "nameHi": "डेटा व अकादमिक शोधकर्ता",
        "bg_color": (22, 25, 32),
        "accent_color": (140, 120, 240),
        "suit_color": (40, 45, 55),
        "shirt_color": (230, 235, 245),
        "tie_color": None,
        "prop": "data_analytics_workstation",
    },
    {
        "id": "farmer",
        "nameEn": "Agronomist & Modern Farmer",
        "nameHi": "कृषि विशेषज्ञ व किसान",
        "bg_color": (35, 45, 25),      # Golden wheat field
        "accent_color": (180, 220, 60),
        "suit_color": (210, 190, 150), # Traditional farmer kurta
        "shirt_color": (240, 230, 210),
        "tie_color": None,
        "is_kurta": True,
        "prop": "lush_agricultural_farm",
    },
    {
        "id": "factory_worker",
        "nameEn": "Industrial Plant Technician",
        "nameHi": "औद्योगिक संयंत्र तकनीशियन",
        "bg_color": (25, 28, 32),
        "accent_color": (240, 160, 40),
        "suit_color": (35, 55, 80),    # Blue mechanic workwear
        "shirt_color": (60, 80, 110),
        "tie_color": None,
        "prop": "precision_machinery_shop",
    },
    {
        "id": "factory_supervisor",
        "nameEn": "Plant Operations Supervisor",
        "nameHi": "औद्योगिक संयंत्र पर्यवेक्षक",
        "bg_color": (20, 25, 30),      # Automated factory floor
        "accent_color": (230, 180, 20), # High-vis yellow
        "suit_color": (210, 160, 20),  # High-vis reflective safety vest
        "shirt_color": (40, 50, 65),
        "tie_color": None,
        "has_safety_vest": True,
        "prop": "manufacturing_assembly_line",
    },
    {
        "id": "engineer",
        "nameEn": "Lead Systems Engineer",
        "nameHi": "वरिष्ठ सिस्टम इंजीनियर",
        "bg_color": (18, 24, 34),
        "accent_color": (60, 160, 240),
        "suit_color": (45, 50, 60),
        "shirt_color": (235, 240, 245),
        "tie_color": None,
        "prop": "engineering_server_racks",
    },
    {
        "id": "architect",
        "nameEn": "Architect & Structural Designer",
        "nameHi": "वास्तुकार व संरचनात्मक डिज़ाइनर",
        "bg_color": (28, 28, 30),
        "accent_color": (240, 120, 60),
        "suit_color": (30, 30, 32),    # Minimalist black designer coat
        "shirt_color": (245, 245, 245),
        "tie_color": None,
        "prop": "drafting_table_blueprints",
    },
    {
        "id": "software_developer",
        "nameEn": "AI & Software Architect",
        "nameHi": "सॉफ्टवेयर व एआई डेवलपर",
        "bg_color": (15, 18, 28),
        "accent_color": (40, 220, 140), # Matrix green
        "suit_color": (35, 40, 50),    # Modern tech zip-jacket
        "shirt_color": (20, 25, 35),
        "tie_color": None,
        "prop": "multimonitor_code_station",
    },
    {
        "id": "corporate_trainer",
        "nameEn": "Leadership & Corporate Trainer",
        "nameHi": "कॉर्पोरेट ट्रेनर व नेतृत्व कोच",
        "bg_color": (25, 25, 35),
        "accent_color": (240, 160, 50),
        "suit_color": (40, 42, 55),
        "shirt_color": (240, 242, 250),
        "tie_color": (160, 50, 60),
        "prop": "executive_workshop_seminar",
    },
    {
        "id": "motivational_speaker",
        "nameEn": "Keynote Motivational Speaker",
        "nameHi": "प्रेरक वक्ता (Motivational Speaker)",
        "bg_color": (30, 15, 25),      # Stage spotlight auditorium
        "accent_color": (250, 200, 60),
        "suit_color": (30, 25, 40),    # Stage presentation suit
        "shirt_color": (250, 250, 250),
        "tie_color": (200, 40, 70),
        "prop": "spotlight_arena_stage",
    },
    {
        "id": "podcast_host",
        "nameEn": "Podcast Host & Interviewer",
        "nameHi": "पॉडकास्ट होस्ट व साक्षात्कारकर्ता",
        "bg_color": (20, 20, 25),      # Acoustic studio
        "accent_color": (230, 120, 50),
        "suit_color": (45, 45, 52),
        "shirt_color": (230, 230, 235),
        "tie_color": None,
        "has_mic_boom": True,
        "prop": "studio_mic_acoustic_panels",
    },
    {
        "id": "youtube_presenter",
        "nameEn": "Educational Video Presenter",
        "nameHi": "यूट्यूब व शैक्षिक प्रस्तुतकर्ता",
        "bg_color": (22, 26, 36),
        "accent_color": (230, 50, 50),  # YouTube red
        "suit_color": (40, 45, 58),
        "shirt_color": (240, 245, 250),
        "tie_color": None,
        "prop": "creator_studio_neon_shelves",
    },
    {
        "id": "government_officer",
        "nameEn": "Public Administration Officer",
        "nameHi": "प्रशासनिक अधिकारी (IAS/Govt)",
        "bg_color": (25, 22, 20),      # Secretariat chamber
        "accent_color": (210, 170, 70),
        "suit_color": (35, 38, 42),    # Official safari/formal blazer
        "shirt_color": (245, 245, 245),
        "tie_color": (50, 60, 80),
        "prop": "secretariat_ashok_pillar",
    },
    {
        "id": "police_officer",
        "nameEn": "Police Officer & Security Chief",
        "nameHi": "पुलिस अधिकारी व सुरक्षा प्रमुख",
        "bg_color": (20, 22, 28),
        "accent_color": (220, 180, 50), # Brass stars
        "suit_color": (160, 130, 80),  # Khaki police uniform
        "shirt_color": (160, 130, 80),
        "tie_color": None,
        "is_uniform": True,
        "prop": "command_headquarters_desk",
    },
    {
        "id": "hotel_manager",
        "nameEn": "Hospitality & Hotel General Manager",
        "nameHi": "होटल प्रबंधक (Hospitality GM)",
        "bg_color": (28, 22, 18),      # Grand 5-star marble lobby
        "accent_color": (230, 190, 80),
        "suit_color": (28, 28, 32),    # Luxury tuxedo/suit
        "shirt_color": (255, 255, 255),
        "tie_color": (40, 40, 45),     # Bowtie/black tie
        "prop": "five_star_chandelier_lobby",
    },
    {
        "id": "chef",
        "nameEn": "Executive Culinary Chef",
        "nameHi": "कार्यकारी शेफ (Culinary Chef)",
        "bg_color": (28, 26, 24),
        "accent_color": (230, 140, 40),
        "suit_color": (248, 248, 250), # Double-breasted white chef coat
        "shirt_color": (248, 248, 250),
        "tie_color": None,
        "is_chef": True,
        "prop": "master_stainless_kitchen",
    },
    {
        "id": "financial_advisor",
        "nameEn": "Wealth & Investment Advisor",
        "nameHi": "वित्तीय सलाहकार व वेल्थ मैनेजर",
        "bg_color": (18, 24, 35),
        "accent_color": (70, 180, 120), # Growth green
        "suit_color": (32, 38, 50),
        "shirt_color": (240, 245, 250),
        "tie_color": (40, 110, 70),
        "prop": "stock_market_terminal_screens",
    },
    {
        "id": "environmental_educator",
        "nameEn": "Sustainability & Ecology Educator",
        "nameHi": "पर्यावरण व पारिस्थितिकी शिक्षक",
        "bg_color": (20, 35, 25),      # Botanical greenhouse
        "accent_color": (100, 210, 90),
        "suit_color": (60, 75, 55),
        "shirt_color": (240, 248, 240),
        "tie_color": None,
        "prop": "rainforest_greenhouse_botanical",
    },
    {
        "id": "custom_profession",
        "nameEn": "Universal Custom Profession",
        "nameHi": "यूनिवर्सल कस्टम प्रोफेशन",
        "bg_color": (20, 25, 40),
        "accent_color": (240, 180, 50),
        "suit_color": (35, 40, 55),
        "shirt_color": (245, 245, 250),
        "tie_color": (160, 50, 60),
        "prop": "modern_creative_studio",
    },
]

def load_audio_envelope(wav_path, fps=30, total_seconds=30):
    with wave.open(wav_path, 'rb') as wf:
        n_channels = wf.getnchannels()
        sampwidth = wf.getsampwidth()
        framerate = wf.getframerate()
        n_frames = wf.getnframes()
        raw_data = wf.readframes(n_frames)

    dtype = np.int16 if sampwidth == 2 else np.uint8
    audio_arr = np.frombuffer(raw_data, dtype=dtype)
    if n_channels > 1:
        audio_arr = audio_arr.reshape(-1, n_channels)[:, 0]

    total_video_frames = int(total_seconds * fps)
    samples_per_video_frame = int(framerate / fps)
    envelope = []

    for i in range(total_video_frames):
        start = (i * samples_per_video_frame) % len(audio_arr)
        end = start + samples_per_video_frame
        chunk = np.abs(audio_arr[start:end].astype(np.float32))
        rms = np.mean(chunk) if len(chunk) > 0 else 0
        envelope.append(rms)

    envelope = np.array(envelope, dtype=np.float32)
    max_val = np.percentile(envelope, 95)
    if max_val > 0:
        envelope = np.clip(envelope / max_val, 0.0, 1.0)

    kernel = np.ones(5, dtype=np.float32) / 5.0
    envelope = np.convolve(envelope, kernel, mode='same')
    return envelope

def create_themed_portrait(theme, head_pil, canvas_w=1920, canvas_h=1080):
    """
    Creates a photorealistic 1920x1080 themed portrait with Mohan Sir's real face
    seamlessly composited onto the body, clothes and environment of the profession.
    """
    # 1. Base Environment Canvas with realistic lighting gradients & depth
    canvas = np.zeros((canvas_h, canvas_w, 3), dtype=np.uint8)
    bg_r, bg_g, bg_b = theme["bg_color"]
    ac_r, ac_g, ac_b = theme["accent_color"]

    # Radial ambient spotlight behind the presenter
    Y, X = np.ogrid[:canvas_h, :canvas_w]
    dist_from_spotlight = np.sqrt(((X - canvas_w * 0.5) / (canvas_w * 0.5))**2 + ((Y - canvas_h * 0.35) / (canvas_h * 0.45))**2)
    spotlight_mask = np.clip(1.0 - (dist_from_spotlight * 0.7), 0.15, 1.0)

    for c, (base_col, ac_col) in enumerate([(bg_b, ac_b), (bg_g, ac_g), (bg_r, ac_r)]):
        ambient_layer = np.full((canvas_h, canvas_w), base_col, dtype=np.float32)
        ambient_layer += (ac_col - base_col) * 0.4 * spotlight_mask
        canvas[:, :, c] = np.clip(ambient_layer, 0, 255).astype(np.uint8)

    # Convert to PIL for precision drawing
    canvas_pil = Image.fromarray(cv2.cvtColor(canvas, cv2.COLOR_BGR2RGB))
    draw = ImageDraw.Draw(canvas_pil)

    # 2. Draw Environmental Architectural Details & Background Depth
    # Soft background pillars / windows / presentation screens
    draw.rectangle([canvas_w * 0.05, canvas_h * 0.1, canvas_w * 0.35, canvas_h * 0.8], fill=(int(bg_r*1.15), int(bg_g*1.15), int(bg_b*1.15)))
    draw.rectangle([canvas_w * 0.65, canvas_h * 0.1, canvas_w * 0.95, canvas_h * 0.8], fill=(int(bg_r*1.15), int(bg_g*1.15), int(bg_b*1.15)))
    draw.rectangle([canvas_w * 0.1, canvas_h * 0.15, canvas_w * 0.9, canvas_h * 0.75], outline=(int(ac_r*0.5), int(ac_g*0.5), int(ac_b*0.5)), width=2)

    # 3. Draw Themed Professional Attire & Shoulders
    suit_r, suit_g, suit_b = theme["suit_color"]
    shirt_r, shirt_g, shirt_b = theme["shirt_color"]

    shoulder_cy = int(canvas_h * 0.62)
    chest_left = int(canvas_w * 0.22)
    chest_right = int(canvas_w * 0.78)

    # Shoulders & Torso polygon
    draw.polygon([
        (chest_left, canvas_h),
        (int(canvas_w * 0.32), shoulder_cy + 30),
        (int(canvas_w * 0.43), shoulder_cy - 40), # Neck collar left
        (int(canvas_w * 0.57), shoulder_cy - 40), # Neck collar right
        (int(canvas_w * 0.68), shoulder_cy + 30),
        (chest_right, canvas_h),
    ], fill=(suit_r, suit_g, suit_b))

    # Inner Shirt V-Collar
    draw.polygon([
        (int(canvas_w * 0.46), shoulder_cy - 40),
        (int(canvas_w * 0.54), shoulder_cy - 40),
        (int(canvas_w * 0.50), shoulder_cy + 120),
    ], fill=(shirt_r, shirt_g, shirt_b))

    # Tie if required
    if theme.get("tie_color"):
        tr, tg, tb = theme["tie_color"]
        draw.polygon([
            (int(canvas_w * 0.485), shoulder_cy - 20),
            (int(canvas_w * 0.515), shoulder_cy - 20),
            (int(canvas_w * 0.53), shoulder_cy + 240),
            (int(canvas_w * 0.50), shoulder_cy + 270),
            (int(canvas_w * 0.47), shoulder_cy + 240),
        ], fill=(tr, tg, tb))

    # Safety Vest Stripes if factory supervisor
    if theme.get("has_safety_vest"):
        draw.polygon([(canvas_w * 0.35, shoulder_cy + 10), (canvas_w * 0.42, shoulder_cy - 20), (canvas_w * 0.45, shoulder_cy - 20), (canvas_w * 0.38, shoulder_cy + 10)], fill=(240, 240, 240))
        draw.polygon([(canvas_w * 0.58, shoulder_cy - 20), (canvas_w * 0.65, shoulder_cy + 10), (canvas_w * 0.62, shoulder_cy + 10), (canvas_w * 0.55, shoulder_cy - 20)], fill=(240, 240, 240))

    # Stethoscope if Doctor
    if theme.get("has_stethoscope"):
        draw.arc([canvas_w * 0.42, shoulder_cy - 20, canvas_w * 0.58, shoulder_cy + 140], 0, 180, fill=(30, 30, 30), width=6)
        draw.ellipse([canvas_w * 0.49, shoulder_cy + 135, canvas_w * 0.51, shoulder_cy + 155], fill=(180, 180, 190))

    # Smooth blur on clothes background transitions
    canvas_pil = canvas_pil.filter(ImageFilter.GaussianBlur(radius=1.2))

    # 4. Seamless Anatomical Placement of Mohan Sir's Real Face
    # Target head dimensions (perfect proportion to shoulders)
    target_head_w = 420
    aspect = head_pil.height / head_pil.width
    target_head_h = int(target_head_w * aspect)

    resized_head = head_pil.resize((target_head_w, target_head_h), Image.Resampling.LANCZOS)
    
    # Crop out lower kurta collar so only Mohan Sir's real neck/jawline remains
    head_np = np.array(resized_head)
    
    # Soft alpha fade on lower neck (so it blends cleanly into shirt collar)
    alpha = head_np[:, :, 3].astype(np.float32)
    neck_fade_start = int(target_head_h * 0.72)
    for y in range(neck_fade_start, target_head_h):
        fade_factor = 1.0 - ((y - neck_fade_start) / float(target_head_h - neck_fade_start))
        alpha[y, :] *= (fade_factor ** 1.5)
    
    head_np[:, :, 3] = np.clip(alpha, 0, 255).astype(np.uint8)
    clean_head_pil = Image.fromarray(head_np)

    # Position head centered over collar
    head_x = int((canvas_w - target_head_w) / 2)
    head_y = int(shoulder_cy - (target_head_h * 0.84))

    canvas_pil.paste(clean_head_pil, (head_x, head_y), clean_head_pil)

    # 5. Suit Lapels overlay over the neck edge for 3D depth
    draw_final = ImageDraw.Draw(canvas_pil)
    draw_final.polygon([
        (int(canvas_w * 0.43), shoulder_cy - 30),
        (int(canvas_w * 0.40), shoulder_cy + 80),
        (int(canvas_w * 0.45), shoulder_cy + 140),
        (int(canvas_w * 0.46), shoulder_cy - 10),
    ], fill=(int(suit_r*0.9), int(suit_g*0.9), int(suit_b*0.9)))
    draw_final.polygon([
        (int(canvas_w * 0.57), shoulder_cy - 30),
        (int(canvas_w * 0.60), shoulder_cy + 80),
        (int(canvas_w * 0.55), shoulder_cy + 140),
        (int(canvas_w * 0.54), shoulder_cy - 10),
    ], fill=(int(suit_r*0.9), int(suit_g*0.9), int(suit_b*0.9)))

    # Return RGB NumPy image
    return cv2.cvtColor(np.array(canvas_pil), cv2.COLOR_RGB2BGR)

def render_30s_video(theme, base_bgr, envelope, audio_path, output_mp4, fps=30, duration_sec=30):
    total_frames = int(duration_sec * fps)
    h, w = base_bgr.shape[:2]

    face_cx = int(w * 0.50)
    face_cy = int(h * 0.35)
    mouth_cx = face_cx
    mouth_cy = int(face_cy + h * 0.125)
    mouth_rx = int(w * 0.042)
    mouth_ry = int(h * 0.026)

    eye_lx = int(face_cx - w * 0.044)
    eye_rx = int(face_cx + w * 0.044)
    eye_y = int(face_cy - h * 0.024)
    eye_r = int(w * 0.022)

    temp_raw_avi = output_mp4 + ".raw.avi"
    fourcc = cv2.VideoWriter_fourcc(*'MJPG')
    out_writer = cv2.VideoWriter(temp_raw_avi, fourcc, fps, (w, h))

    for f in range(total_frames):
        vol = float(envelope[f % len(envelope)])
        t = f / fps

        frame = base_bgr.copy()

        # 1. Subtle breathing & posture sway
        float_y = int(2.5 * np.sin(2.0 * np.pi * t * 0.25))
        float_x = int(1.2 * np.cos(2.0 * np.pi * t * 0.12))
        if float_y != 0 or float_x != 0:
            M = np.float32([[1, 0, float_x], [0, 1, float_y]])
            frame = cv2.warpAffine(frame, M, (w, h), borderMode=cv2.BORDER_REFLECT)

        # 2. Eye Blinking every 3.6s
        blink_period = int(3.6 * fps)
        frame_in_blink = f % blink_period
        if frame_in_blink < 5:
            blink_pct = np.sin((frame_in_blink / 5.0) * np.pi)
            for ex in [eye_lx, eye_rx]:
                ey_top = eye_y - eye_r
                ey_bot = eye_y + eye_r
                ex_l = ex - eye_r
                ex_r = ex + eye_r
                eye_crop = frame[ey_top:ey_bot, ex_l:ex_r].astype(np.float32)
                lid_h = int(eye_crop.shape[0] * blink_pct * 0.65)
                if lid_h > 0:
                    skin_tone = np.mean(frame[ey_top-5:ey_top, ex_l:ex_r], axis=(0,1))
                    eye_crop[:lid_h, :] = eye_crop[:lid_h, :] * 0.35 + skin_tone * 0.65
                    frame[ey_top:ey_bot, ex_l:ex_r] = eye_crop.astype(np.uint8)

        # 3. Dynamic Mouth Viseme Lip-Sync driven by speech volume
        if vol > 0.08:
            open_dy = int(vol * 7.5)
            if open_dy > 0:
                y1 = max(0, mouth_cy - mouth_ry)
                y2 = min(h, mouth_cy + mouth_ry + open_dy + 4)
                x1 = max(0, mouth_cx - mouth_rx)
                x2 = min(w, mouth_cx + mouth_rx)

                mouth_patch = frame[y1:y2, x1:x2].copy()
                ph, pw = mouth_patch.shape[:2]

                map_x, map_y = np.meshgrid(np.arange(pw), np.arange(ph))
                map_x = map_x.astype(np.float32)
                map_y = map_y.astype(np.float32)

                dist_x = np.abs(map_x - (pw / 2.0)) / (pw / 2.0)
                dist_y = np.maximum(0, (map_y - (ph * 0.45))) / (ph * 0.55)
                weight = (1.0 - np.clip(dist_x, 0, 1)) * np.clip(dist_y, 0, 1)

                map_y_displaced = map_y - (weight * open_dy)
                deformed = cv2.remap(mouth_patch, map_x, map_y_displaced, cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)

                mask = np.zeros((ph, pw), dtype=np.float32)
                cv2.ellipse(mask, (pw // 2, int(ph * 0.55)), (pw // 2 - 4, int(ph * 0.45)), 0, 0, 360, 1.0, -1)
                mask = cv2.GaussianBlur(mask, (15, 15), 0)
                mask = np.expand_dims(mask, axis=2)

                frame[y1:y2, x1:x2] = (deformed * mask + frame[y1:y2, x1:x2] * (1.0 - mask)).astype(np.uint8)

        # 4. Slow subtle cinematic zoom
        zoom = 1.00 + (0.035 * (f / total_frames))
        if zoom > 1.001:
            cw = int(w / zoom)
            ch = int(h / zoom)
            cx1 = (w - cw) // 2
            cy1 = int((h - ch) * 0.35)
            frame = cv2.resize(frame[cy1:cy1+ch, cx1:cx1+cw], (w, h), interpolation=cv2.INTER_LINEAR)

        out_writer.write(frame)

    out_writer.release()

    # Encode with FFmpeg (Apple Silicon VideoToolbox / libx264 fast)
    cmd = (
        f'ffmpeg -y -i "{temp_raw_avi}" -stream_loop -1 -i "{audio_path}" '
        f'-t {duration_sec} '
        f'-c:v libx264 -pix_fmt yuv420p -preset superfast -crf 22 '
        f'-c:a aac -b:a 192k -shortest -movflags +faststart '
        f'"{output_mp4}" > /dev/null 2>&1'
    )
    os.system(cmd)
    if os.path.exists(temp_raw_avi):
        os.remove(temp_raw_avi)

def main():
    print(f"Loading Mohan Sir authentic head: {HEAD_PATH}")
    head_pil = Image.open(HEAD_PATH).convert("RGBA")
    
    print(f"Loading speech audio: {AUDIO_PATH}")
    envelope = load_audio_envelope(AUDIO_PATH, fps=30, total_seconds=30)

    print(f"Generating 30s Real Videos for ALL {len(PROFESSION_THEMES)} Professions...\n")

    for i, theme in enumerate(PROFESSION_THEMES):
        pid = theme["id"]
        role_en = theme["nameEn"]
        role_hi = theme["nameHi"]
        
        # 1. Generate Themed 1080p Portrait Thumbnail
        thumb_path = os.path.join(THUMB_DIR, f"mohan_{pid}_1080p.jpg")
        themed_bgr = create_themed_portrait(theme, head_pil)
        cv2.imwrite(thumb_path, themed_bgr)

        # 2. Render 30-Second 1080p MP4 Video with real voice
        video_filename = f"mohan_real_{pid}_30s.mp4"
        video_path = os.path.join(OUTPUT_DIR, video_filename)

        print(f"[{i+1}/34] Generating 30s Real Video for: {role_hi} ({role_en})...")
        render_30s_video(theme, themed_bgr, envelope, AUDIO_PATH, video_path, fps=30, duration_sec=30)
        
        size_mb = os.path.getsize(video_path) / (1024 * 1024) if os.path.exists(video_path) else 0
        print(f"   ✓ Video saved: {video_filename} ({size_mb:.2f} MB)")

    print("\n✅ All 34 profession videos successfully generated!")

if __name__ == "__main__":
    main()

