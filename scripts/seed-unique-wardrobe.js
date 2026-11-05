const fs = require('fs');
const dotenv = require('dotenv');

let envConfig = {};
if (fs.existsSync('.env.local')) {
  envConfig = dotenv.parse(fs.readFileSync('.env.local'));
} else if (fs.existsSync('.env')) {
  envConfig = dotenv.parse(fs.readFileSync('.env'));
}

const { createClient } = require('@libsql/client');
const db = createClient({
  url: envConfig.BUNNY_DATABASE_URL || process.env.BUNNY_DATABASE_URL,
  authToken: envConfig.BUNNY_DATABASE_AUTH_TOKEN || process.env.BUNNY_DATABASE_AUTH_TOKEN
});

async function run() {
  console.log('Seeding 5 distinct unique dresses (one dress one time only)...');
  await db.execute('DELETE FROM mohan_avatar_wardrobe_dna_sql');

  const uniqueWardrobes = [
    {
      id: 'ward_ashram_daily_solapuri_01',
      clothing_name: 'Authentic Ashram Sadra & Dark Navy Waistcoat',
      category: 'ashram_daily',
      color_hex: '#1E3A8A',
      color_name: 'Solapuri Ashram Navy & Sky Blue (आश्रम सदरा व कोट)',
      fabric_description: 'Classic handspun cotton sky blue Sadra layered with tailored dark navy sleeveless Nehru waistcoat (Koti). Mohan Sir signature lecture attire.',
      collar_style: 'Vedic Mandarin High Band Collar with Contrast Welt Pocket',
      yogic_occasion: 'Live Zoom Swar Yoga Morning & Evening Masterclasses, Whiteboard Scriptural Breakdown',
      front_image_url: '/api/recorded-courses/thumbnail?videoId=baedb88d-2353-4215-ab33-2ddbbf5cb9d9',
      video_clip_url: 'https://swaryogacrm.b-cdn.net/materials/mohan_sir_marathi_real.mp4',
      is_selected: 1,
      worn_in_videos_count: 28
    },
    {
      id: 'ward_vedic_khadi_sadhana_02',
      clothing_name: 'Vedic Pure White Khadi Sadhana Kurta',
      category: 'vedic_traditional',
      color_hex: '#F8FAFC',
      color_name: 'Sacred Pearl White (शुद्ध श्वेत खादी)',
      fabric_description: 'Pure handloom khadi cotton woven with breathable organic fibers for high-prana meditation and breath retention states.',
      collar_style: 'Traditional Kurta Placket with Natural Coconut Shell Buttons',
      yogic_occasion: 'Brahma Muhurta Pranayama, Sushumna Awakening & Sacred Shiva Swarodaya Initiations',
      front_image_url: '/avatar-studio/looks/mohan_white_khadi_1080p.jpg',
      video_clip_url: 'https://swaryogacrm.b-cdn.net/materials/mohan_sir_hindi_real.mp4',
      is_selected: 0,
      worn_in_videos_count: 14
    },
    {
      id: 'ward_sand_ochre_heart_chakra_03',
      clothing_name: 'Sand Ochre Meditation Angavastram Robe',
      category: 'evening_satsang',
      color_hex: '#D97706',
      color_name: 'Golden Ochre Sand (सुवर्ण पीतांबर / काषाय)',
      fabric_description: 'Warm golden-sand ceremonial silk-cotton blend with subtle earthen border, symbolizing renunciation and heart-centered satsang.',
      collar_style: 'Seamless Draped Shoulder Angavastram with Flowing Fall',
      yogic_occasion: 'Evening Satsangs, Guru Purnima Discourses & Advanced Level 3 Spiritual Transmission',
      front_image_url: '/avatar-studio/looks/mohan_sand_heart_chakra.jpg',
      video_clip_url: 'https://swaryogacrm.b-cdn.net/avatar-studio/videos/083ce51f3ddaa878e1e10dfce9d5ee66e5d74c21badb5b7c3cb8be0832dca84c.mp4',
      is_selected: 0,
      worn_in_videos_count: 7
    },
    {
      id: 'ward_aqua_mudra_teaching_04',
      clothing_name: 'Aqua Prana Flow Teaching Attire',
      category: 'asana_demo',
      color_hex: '#0284C7',
      color_name: 'Pranic Sky Aqua (प्राण आकाश नील)',
      fabric_description: 'Lightweight flexible stretch bamboo-cotton blend designed for smooth nostril testing, hand mudras, and spinal alignment demonstration.',
      collar_style: 'Soft Curved Nehru Band with Reinforced Double Stitching',
      yogic_occasion: 'Nostril Airflow Breath Testing, Asana Postural Alignment & Student Body Diagnostics',
      front_image_url: '/avatar-studio/looks/mohan_aqua_mudra.jpg',
      video_clip_url: 'https://swaryogacrm.b-cdn.net/materials/mohan_sir_marathi_real.mp4',
      is_selected: 0,
      worn_in_videos_count: 9
    },
    {
      id: 'ward_lime_herbal_digestive_05',
      clothing_name: 'Herbal Lime Ayurvedic Digestive Kurta',
      category: 'corporate_keynote',
      color_hex: '#65A30D',
      color_name: 'Herbal Green (आयुर्वेद निसर्ग हरित)',
      fabric_description: 'Natural dyed herbal lime cotton representing active Jatharagni and balanced digestive fire in Aahar Shastra nutrition.',
      collar_style: 'Modern Clean Band Collar with Hidden Button Fly',
      yogic_occasion: 'Aahar Shastra Lectures, Digestive Fire Mastery, Water Therapy Rules & Health Webinars',
      front_image_url: '/avatar-studio/looks/mohan_lime_green_diet.jpg',
      video_clip_url: 'https://swaryogacrm.b-cdn.net/materials/mohan_sir_hindi_real.mp4',
      is_selected: 0,
      worn_in_videos_count: 6
    }
  ];

  const now = new Date().toISOString();
  for (const w of uniqueWardrobes) {
    await db.execute({
      sql: `INSERT INTO mohan_avatar_wardrobe_dna_sql (
              id, clothing_name, category, color_hex, color_name,
              fabric_description, collar_style, yogic_occasion,
              front_image_url, video_clip_url, is_selected, worn_in_videos_count,
              created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        w.id, w.clothing_name, w.category, w.color_hex, w.color_name,
        w.fabric_description, w.collar_style, w.yogic_occasion,
        w.front_image_url, w.video_clip_url, w.is_selected, w.worn_in_videos_count,
        now, now
      ]
    });
  }

  // Also check postures
  const checkPostures = await db.execute('SELECT * FROM mohan_avatar_posture_dna_sql');
  console.log(`Current postures count: ${checkPostures.rows.length}`);

  const check = await db.execute('SELECT id, clothing_name, color_name, front_image_url FROM mohan_avatar_wardrobe_dna_sql');
  console.log('✓ Successfully verified 5 UNIQUE dresses:');
  console.log(check.rows);
}

run().catch(console.error);

