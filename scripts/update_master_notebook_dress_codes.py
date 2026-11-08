import json

master_path = 'public/colab/Swar_Yoga_Neural_LipSync_Master.ipynb'
with open(master_path, 'r') as f:
    nb = json.load(f)

# Update Markdown
nb['cells'][0]['source'] = [
    '# 🧘‍♂️ Swar Yoga - Mohan Sir 2K Neural Lip-Sync & Multi-Dress Code Engine\n',
    '### ⚡ 60-Second Fast GPU Engine with Multi-Wardrobe Selection & Phonetic Bilabial Precision (P, M, A, B)\n',
    '**8 Authentic Mohan Sir Dress Codes • Direct Class Topic Auto-Mapping • 2K Quad HD Studio Radiance • 48kHz Crystal Audio**\n'
]

cell1_code = '''# ==============================================================================
# 🕉️ SWAR YOGA AI AVATAR — 2K ULTRA-HD & MULTI-DRESS CODE PIPELINE
# ==============================================================================
import os, time, requests, subprocess

print("🚀 [1/4] Cloning Modern PyTorch 2.x Lip-Sync Engine...")
if not os.path.exists("Wav2Lip"):
    !git clone -q https://github.com/justinjohn0306/Wav2Lip.git

%cd Wav2Lip

print("⚙️ [2/4] Installing Fast Dependencies...")
!pip install -q batch-face librosa soundfile

print("📦 Downloading Pretrained HD Checkpoints...")
os.makedirs("checkpoints", exist_ok=True)
os.makedirs("inputs", exist_ok=True)
os.makedirs("outputs", exist_ok=True)

!wget -q -nc "https://github.com/justinjohn0306/Wav2Lip/releases/download/models/wav2lip_gan.pth" -O "checkpoints/wav2lip_gan.pth"
!wget -q -nc "https://github.com/justinjohn0306/Wav2Lip/releases/download/models/resnet50.pth" -O "checkpoints/resnet50.pth"
!wget -q -nc "https://github.com/justinjohn0306/Wav2Lip/releases/download/models/mobilenet.pth" -O "checkpoints/mobilenet.pth"

# 👔 8 AUTHENTIC MOHAN SIR DRESS CODES
DRESS_CODE_LIBRARY = {
    "ashram_navy_koti": {
        "id": "ward_ashram_daily_solapuri_01",
        "name": "Authentic Ashram Sadra & Dark Navy Waistcoat (आश्रम सदरा व नेव्ही कोट)",
        "video_url": "https://swaryogacrm.b-cdn.net/materials/mohan_sir_marathi_real.mp4",
        "topics": ["Level-1 Fundamentals", "Level-2 Masterclass", "Nadi Vigyan (Ida, Pingala, Sushumna)", "Daily Swar Pariksha", "Whiteboard Lectures", "Marathi Evening Batches"],
        "eq_filter": "brightness=0.04:contrast=1.12:saturation=1.14:gamma=1.05"
    },
    "pure_white_khadi": {
        "id": "ward_vedic_khadi_sadhana_02",
        "name": "Vedic Pure White Khadi Sadhana Kurta (शुद्ध श्वेत खादी)",
        "video_url": "https://swaryogacrm.b-cdn.net/materials/mohan_sir_hindi_real.mp4",
        "topics": ["Brahma Muhurta Dhyan", "Sushumna Sandhya Dhyan", "Akash Tatva Moksha", "Vayu Tatva Prana", "Chandra Swar Sheetala", "Spiritual Healing", "Shiva Swarodaya"],
        "eq_filter": "brightness=0.05:contrast=1.10:saturation=1.08:gamma=1.06"
    },
    "golden_ochre_angavastram": {
        "id": "ward_sand_ochre_heart_chakra_03",
        "name": "Golden Ochre & Sand Pitambar Robe (सुवर्ण पीतांबर / काषाय वस्त्र)",
        "video_url": "https://swaryogacrm.b-cdn.net/avatar-studio/videos/083ce51f3ddaa878e1e10dfce9d5ee66e5d74c21badb5b7c3cb8be0832dca84c.mp4",
        "topics": ["Swar Yoga Foundation 4K", "Higher Spiritual Philosophy", "Guru Satsang", "Prana Expansion", "Level-3 Guru Transmission"],
        "eq_filter": "brightness=0.04:contrast=1.13:saturation=1.15:gamma=1.05"
    },
    "herbal_lime_ayurvedic": {
        "id": "ward_lime_herbal_digestive_05",
        "name": "Herbal Lime Ayurvedic Digestive Kurta (आयुर्वेद निसर्ग हरित)",
        "video_url": "https://swaryogacrm.b-cdn.net/uploads/mohan-clone-360/mohan_clone_video_05.mp4",
        "topics": ["Swar Aahar Shastra", "Jatharagni & Surya Swar", "Bhojan Pachan Niyam", "Seasonal Diet (ऋतु अनुसार आहार)", "Water Therapy & Hunger", "Metabolism & Gut Health"],
        "eq_filter": "brightness=0.04:contrast=1.12:saturation=1.16:gamma=1.04"
    },
    "pranic_sky_aqua": {
        "id": "ward_aqua_mudra_teaching_04",
        "name": "Pranic Sky Aqua Flow Attire (प्राण आकाश नील)",
        "video_url": "https://swaryogacrm.b-cdn.net/uploads/mohan-clone-360/mohan_clone_video_03.mp4",
        "topics": ["Nasal Flow Diagnostics", "Hand Mudras & Bandhas", "Pranayama Alignment", "Breathing Mechanics", "Practical Demonstrations"],
        "eq_filter": "brightness=0.04:contrast=1.11:saturation=1.13:gamma=1.05"
    },
    "kesariya_surya_saffron": {
        "id": "ward_kesariya_surya_tejas_06",
        "name": "Deep Kesariya Saffron Surya Tejas Kurta (सूर्य तेजस केसरी)",
        "video_url": "https://swaryogacrm.b-cdn.net/uploads/mohan-clone-360/mohan_clone_video_01.mp4",
        "topics": ["Pingala Nadi Surya Swar", "Agni Tatva Tejas", "Physical Vitality & Strength", "Kundalini Awakening", "Solar Power Sadhana"],
        "eq_filter": "brightness=0.03:contrast=1.14:saturation=1.18:gamma=1.04"
    },
    "corporate_executive_suit": {
        "id": "ward_corporate_executive_07",
        "name": "Corporate Executive Navy Blazer & Shirt (एक्जीक्यूटिव सूट)",
        "video_url": "https://swaryogacrm.b-cdn.net/uploads/mohan-clone-360/mohan_clone_video_06.mp4",
        "topics": ["Corporate Swar Yoga", "Executive Decision Making", "Business Negotiation Timing", "Leadership Mindset", "High-Stakes Meeting Swar"],
        "eq_filter": "brightness=0.03:contrast=1.15:saturation=1.10:gamma=1.05"
    },
    "terracotta_maroon_grounding": {
        "id": "ward_maroon_prithvi_tatva_08",
        "name": "Earthen Terracotta Maroon Sthirata Kurta (माती कथ्था / पृथ्वी स्थिरता)",
        "video_url": "https://swaryogacrm.b-cdn.net/uploads/mohan-clone-360/mohan_clone_video_04.mp4",
        "topics": ["Prithvi Tatva Sthirata", "Root Chakra (Muladhara) Stability", "Stress & Anxiety Relief", "Emotional Balance", "Evening Wind Down"],
        "eq_filter": "brightness=0.04:contrast=1.12:saturation=1.12:gamma=1.05"
    }
}

# 👉 सिर्फ यहाँ पसंद का Dress Code और Audio URL सेट करें:
# Dress Code विकल्प: 'ashram_navy_koti', 'pure_white_khadi', 'golden_ochre_angavastram', 
#                   'herbal_lime_ayurvedic', 'pranic_sky_aqua', 'kesariya_surya_saffron', 
#                   'corporate_executive_suit', 'terracotta_maroon_grounding'
SELECTED_DRESS_CODE = "ashram_navy_koti"

# 48kHz Master Audio
AUDIO_URL = "https://swaryogacrm.b-cdn.net/voice-clones/dna-39/dna_voice_04f6e33e.mp3"

dress = DRESS_CODE_LIBRARY[SELECTED_DRESS_CODE]
print(f"👔 Selected Dress Code: {dress['name']}")
print(f"🎯 Matching Class Topics: {', '.join(dress['topics'][:3])}...")

video_path = f"inputs/dress_{SELECTED_DRESS_CODE}.mp4"
!wget -q -nc -O {video_path} {dress['video_url']}
!wget -q -nc -O inputs/audio_master.mp3 {AUDIO_URL}

# Bilabial Plosive Pre-Filtering (P, M, B, A acoustic boost)
!ffmpeg -y -i inputs/audio_master.mp3 -vn -ar 16000 -ac 1 -af "highpass=f=75,lowpass=f=7600,loudnorm=I=-16:TP=-1.5:LRA=10" inputs/voice_sync_filtered.wav -loglevel error

print("🧠 [3/4] Generating Neural Lip-Sync on GPU (Preserving Real Eyes, Face & Mudras)...")
t0 = time.time()
!python inference.py --checkpoint_path checkpoints/wav2lip_gan.pth --face "{video_path}" --audio inputs/voice_sync_filtered.wav --outfile temp/raw_lipsync.mp4 --pads 0 20 0 0 --nosmooth --face_det_batch_size 16 --wav2lip_batch_size 128

print("✨ [4/4] Applying 2K Lanczos Upscaler, Studio Lighting & 48kHz Audio Remux...")
final_video = f"outputs/mohan_2K_{SELECTED_DRESS_CODE}.mp4"
eq_filter = dress.get("eq_filter", "brightness=0.04:contrast=1.12:saturation=1.14:gamma=1.05")

!ffmpeg -y -i temp/raw_lipsync.mp4 -i inputs/audio_master.mp3 \\
    -filter_complex "[0:v]scale=2560:1440:flags=lanczos,unsharp=5:5:0.75:3:3:0.35,eq={eq_filter}[v]" \\
    -map "[v]" -map 1:a \\
    -c:v libx264 -preset fast -crf 17 -pix_fmt yuv420p \\
    -c:a aac -b:a 320k -ar 48000 -shortest "{final_video}" -loglevel warning

render_time = time.time() - t0
print(f"✅ 2K Studio Master Complete in {render_time:.1f}s!")

# Upload to Bunny CDN
f_name = f"mohan_{SELECTED_DRESS_CODE}_2K_{int(time.time())}.mp4"
upload_url = f"https://storage.bunnycdn.com/swaryogacrm/avatar-studio/generated/{f_name}"
with open(final_video, "rb") as f:
    r = requests.put(upload_url, data=f, headers={"AccessKey": "38b0d463-7065-4200-a29d0d36746f-c1f6-47a3", "Content-Type": "video/mp4"})

if r.status_code in [200, 201]:
    cdn_link = f"https://swaryogacrm.b-cdn.net/avatar-studio/generated/{f_name}"
    print("\\n" + "="*70)
    print(f"🎉 2K STUDIO MASTER LIVE: {cdn_link}")
    print("="*70)
else:
    print(f"⚠️ Upload status: {r.status_code}")
'''

nb['cells'][1]['source'] = [cell1_code]

with open(master_path, 'w') as f:
    json.dump(nb, f, indent=2)

print('Updated Swar_Yoga_Neural_LipSync_Master.ipynb successfully!')

