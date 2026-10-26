import { bunnyExecute, bunnyBatch } from '@/lib/bunnyDatabase';
import crypto from 'crypto';

export type MediaDestination = 'media' | 'e-learning' | 'community' | 'social-media';
export type MediaType = 'video' | 'shorts' | 'playlist' | 'post' | 'live';

export interface MultiLangTranslation {
  title: string;
  description: string;
  mediaUrl?: string;
  transcript?: string;
  caption?: string;
}

export interface BunnyMediaItem {
  id: string;
  type: MediaType;
  destinations: MediaDestination[];
  title: string;
  description: string;
  mediaUrl?: string;
  thumbnailUrl?: string;
  durationSeconds?: number;
  sourceLanguage: string;
  targetLanguages: string[];
  translations: Record<string, MultiLangTranslation>; // langCode -> translation
  playlistItems?: Array<{ title: string; videoUrl: string; duration?: number; order: number }>;
  socialChannels?: string[]; // 'youtube' | 'facebook' | 'instagram' | 'twitter'
  liveStatus?: 'upcoming' | 'live' | 'ended';
  liveScheduledAt?: string;
  category?: string;
  tags?: string[];
  viewsCount?: number;
  likesCount?: number;
  overlayStrip?: MediaOverlayStrip;
  status: 'published' | 'draft' | 'scheduled';
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MediaOverlayStrip {
  enabled: boolean;
  stripText: string;
  stripLinkText?: string;
  stripLinkUrl?: string;
  position?: 'top' | 'bottom';
  popupEnabled?: boolean;
  popupSeconds?: number;
  popupTitle?: string;
  popupMessage?: string;
  popupLinkText?: string;
  popupLinkUrl?: string;
}

export async function initBunnyMediaSchema() {
  await bunnyBatch([
    {
      sql: `CREATE TABLE IF NOT EXISTS bunny_media_items_sql (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL DEFAULT 'video',
        destinations_json TEXT NOT NULL DEFAULT '["media"]',
        title TEXT NOT NULL,
        description TEXT DEFAULT '',
        media_url TEXT,
        thumbnail_url TEXT,
        duration_seconds INTEGER DEFAULT 0,
        source_language TEXT DEFAULT 'en',
        target_languages_json TEXT NOT NULL DEFAULT '[]',
        translations_json TEXT NOT NULL DEFAULT '{}',
        playlist_items_json TEXT DEFAULT '[]',
        social_channels_json TEXT DEFAULT '[]',
        live_status TEXT DEFAULT 'upcoming',
        live_scheduled_at TEXT,
        category TEXT DEFAULT 'general',
        tags_json TEXT DEFAULT '[]',
        views_count INTEGER DEFAULT 0,
        likes_count INTEGER DEFAULT 0,
        status TEXT DEFAULT 'published',
        created_by TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )`,
      args: []
    },
    { sql: `CREATE INDEX IF NOT EXISTS idx_bunny_media_type ON bunny_media_items_sql(type)`, args: [] },
    { sql: `CREATE INDEX IF NOT EXISTS idx_bunny_media_status ON bunny_media_items_sql(status)`, args: [] },
    { sql: `CREATE INDEX IF NOT EXISTS idx_bunny_media_created ON bunny_media_items_sql(created_at DESC)`, args: [] }
  ]);

  try {
    await bunnyExecute({
      sql: `ALTER TABLE bunny_media_items_sql ADD COLUMN overlay_strip_json TEXT DEFAULT '{}'`,
      args: []
    });
  } catch {}

  try {
    const countCheck = await bunnyExecute({
      sql: `SELECT COUNT(*) as count FROM bunny_media_items_sql`,
      args: []
    });
    const totalCount = Number(countCheck.rows?.[0]?.count || 0);
    if (totalCount === 0) {
      await seedInitialMediaItems();
    }
  } catch (e) {
    console.warn('Media auto-seed check bypassed:', e);
  }
}

async function seedInitialMediaItems() {
  const now = new Date().toISOString();
  const seedItems = [
    // 1. VIDEOS (16:9 Full Masterclasses)
    {
      id: 'seed_video_swar_masterclass',
      type: 'video',
      destinations_json: '["media"]',
      title: 'Swar Yoga Complete Masterclass: Science of Shiva Swarodaya & Nostril Cycles',
      description: 'Learn the ancient Vedic science of breath cycles, Ida-Pingala nostril dominance, and how to master your destiny through breath control with Mohan Sir.',
      media_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      thumbnail_url: 'https://images.unsplash.com/photo-1545205597-3d9d02c29597?w=800&auto=format&fit=crop&q=80',
      duration_seconds: 2700,
      source_language: 'en',
      target_languages_json: '["hi","mr","kn","ne","es","fr"]',
      translations_json: JSON.stringify({
        hi: {
          title: 'स्वर योग संपूर्ण मास्टरक्लास: शिव स्वरोदय विज्ञान और नासिका चक्र',
          description: 'मोहन सर के साथ नासिका चक्र, इड़ा-पिंगला स्वर और श्वास के माध्यम से भाग्य निर्माण का प्राचीन वैदिक विज्ञान सीखें।'
        },
        mr: {
          title: 'स्वर योग संपूर्ण मास्टरक्लास: शिव स्वरोदय विज्ञान आणि श्वास चक्र',
          description: 'मोहन सरांसोबत श्वास चक्र, इडा-पिंगळा स्वर आणि श्वासाद्वारे आरोग्य व यश प्राप्तीचे प्राचीन विज्ञान शिका.'
        },
        kn: {
          title: 'ಸ್ವರ ಯೋಗ ಸಂಪೂರ್ಣ ಮಾಸ್ಟರ್‌ಕ್ಲಾಸ್: ಶಿವ ಸ್ವರೋದಯ ವಿಜ್ಞಾನ',
          description: 'ಉಸಿರಾಟದ ಚಕ್ರಗಳು, ಇಡಾ-ಪಿಂಗಳ ನಾಡಿ ಮತ್ತು ಉಸಿರಾಟದ ನಿಯಂತ್ರಣದ ಪ್ರಾಚೀನ ವೇದ ವಿಜ್ಞಾನವನ್ನು ಕಲಿಯಿರಿ.'
        }
      }),
      category: 'swar-yoga',
      tags_json: '["swaryoga","shivaswarodaya","breathing","pranayama"]',
      views_count: 145200,
      likes_count: 12400,
      status: 'published',
      created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
      updated_at: now
    },
    {
      id: 'seed_video_chandra_healing',
      type: 'video',
      destinations_json: '["media"]',
      title: 'Chandra Nadi (Ida Breath): Awakening Inner Calm, Deep Healing & Curing Insomnia',
      description: 'Detailed instructions on how to consciously switch to the left nostril (Chandra Swar) to lower heart rate, soothe the nervous system, and sleep deeply.',
      media_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      thumbnail_url: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800&auto=format&fit=crop&q=80',
      duration_seconds: 1820,
      source_language: 'en',
      target_languages_json: '["hi","mr","kn"]',
      translations_json: JSON.stringify({
        hi: {
          title: 'चंद्र नाड़ी (इड़ा स्वर): गहरा मानसिक सुकून, तनाव मुक्ति और अनिद्रा का अचूक समाधान',
          description: 'तनाव, घबराहट और अनिद्रा को दूर करने के लिए बाएं स्वर (चंद्र नाड़ी) को सक्रिय करने की प्रामाणिक विधि।'
        },
        mr: {
          title: 'चंद्र नाडी (इडा स्वर): मानसिक शांतता, तणावमुक्ती आणि निद्रानाशावर रामबाण उपाय',
          description: 'मनाला शांत करण्यासाठी आणि गाढ झोपेसाठी डावा स्वर सक्रिय करण्याची सोपी पद्धत.'
        }
      }),
      category: 'healing',
      tags_json: '["chandranadi","healing","stressrelief","sleep"]',
      views_count: 98300,
      likes_count: 8100,
      status: 'published',
      created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
      updated_at: now
    },
    {
      id: 'seed_video_surya_activation',
      type: 'video',
      destinations_json: '["media"]',
      title: 'Surya Nadi (Pingala Breath): Igniting Digestive Fire, Vitality & Physical Power',
      description: 'Master the right nostril breathing technique to activate Surya Swar for powerful metabolism, sharp focus, physical vigor, and confident actions.',
      media_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      thumbnail_url: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=800&auto=format&fit=crop&q=80',
      duration_seconds: 1540,
      source_language: 'en',
      target_languages_json: '["hi","mr"]',
      translations_json: JSON.stringify({
        hi: {
          title: 'सूर्य नाड़ी (पिंगला स्वर): जठराग्नि प्रज्वलन, शारीरिक बल और प्रचंड ऊर्जा का स्रोत',
          description: 'पाचन शक्ति बढ़ाने और शरीर में असीमित ऊर्जा जागृत करने के लिए दाएं स्वर को सक्रिय करने का गुप्त नियम।'
        }
      }),
      category: 'swar-yoga',
      tags_json: '["suryanadi","vitality","metabolism"]',
      views_count: 84200,
      likes_count: 6700,
      status: 'published',
      created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
      updated_at: now
    },
    {
      id: 'seed_video_rhythmic_cooking',
      type: 'video',
      destinations_json: '["media"]',
      title: 'Ayurvedic Rhythmic Cooking: Preparing Food Aligned with the Solar Swar',
      description: 'Ancient Ayurvedic kitchen secrets: why food cooked when the right breath (Surya Swar) is running turns into nectar and fuels cellular digestion.',
      media_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      thumbnail_url: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&auto=format&fit=crop&q=80',
      duration_seconds: 1320,
      source_language: 'en',
      target_languages_json: '["hi","mr"]',
      translations_json: JSON.stringify({
        hi: {
          title: 'आयुर्वेदिक स्वर पाककला: स्वर के अनुसार अमृत तुल्य भोजन पकाने का रहस्य',
          description: 'रसोई में भोजन बनाते समय सूर्य स्वर का महत्व और औषधीय पोषण प्राप्त करने का वैदिक विज्ञान।'
        }
      }),
      category: 'ayurveda',
      tags_json: '["ayurveda","cooking","recipes","swar"]',
      views_count: 61400,
      likes_count: 5300,
      status: 'published',
      created_at: new Date(Date.now() - 86400000 * 1).toISOString(),
      updated_at: now
    },
    {
      id: 'seed_video_morning_sadhana',
      type: 'video',
      destinations_json: '["media"]',
      title: 'Daily Morning Sadhana & Tithi Synchronization with Shiva Swarodaya',
      description: 'Start your morning with Shiva Swarodaya tithi calculations and morning breath synchronization with Mohan Sir.',
      media_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      thumbnail_url: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800&auto=format&fit=crop&q=80',
      duration_seconds: 2100,
      source_language: 'en',
      target_languages_json: '["hi","mr","kn"]',
      translations_json: JSON.stringify({
        hi: {
          title: 'दैनिक प्रातःकालीन स्वर साधना एवं तिथि अनुसार नासिका संरेखण',
          description: 'प्रतिदिन सुबह उठकर तिथि और पक्ष के अनुसार सही स्वर से दिन की शुरुआत करने का संपूर्ण अभ्यास।'
        }
      }),
      category: 'morning-sadhana',
      tags_json: '["morningsadhana","tithi","panchang","swar"]',
      views_count: 112000,
      likes_count: 9500,
      status: 'published',
      created_at: now,
      updated_at: now
    },

    // 2. SHORTS (9:16 Vertical Video Clips - Clustered 3-4 videos per topic)
    // TOPIC 1: Swar Breathing & Nostril Testing (4 Shorts)
    {
      id: 'seed_short_check_swar',
      type: 'shorts',
      destinations_json: '["media"]',
      title: 'How to Check Your Active Swar in 5 Seconds 👃',
      description: 'Instant practical demonstration of checking nostril airflow with Mohan Sir.',
      media_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      thumbnail_url: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=600&auto=format&fit=crop&q=80',
      duration_seconds: 28,
      source_language: 'en',
      target_languages_json: '["hi","mr","kn"]',
      translations_json: JSON.stringify({
        hi: {
          title: 'सिर्फ 5 सेकंड में जानें कौन सा स्वर चल रहा है 👃',
          description: 'नासिका का प्रवाह जांचने का सबसे आसान और सटीक तरीका।'
        },
        mr: {
          title: 'फक्त ५ सेकंदात ओळखा चालू असलेला स्वर 👃',
          description: 'कोणती नाकपुडी चालू आहे हे ओळखण्याची सोपी पद्धत.'
        }
      }),
      category: 'swar-yoga',
      tags_json: '["shorts","swaryoga","breathing","nostrils"]',
      views_count: 245000,
      likes_count: 21400,
      status: 'published',
      created_at: now,
      updated_at: now
    },
    {
      id: 'seed_short_switch_swar',
      type: 'shorts',
      destinations_json: '["media"]',
      title: 'How to Switch Nostril Flow at Will (Instant Swar Change) 🔄',
      description: 'Simple armpit pressure technique (Yoga Danda) to switch breath from left to right in 60 seconds.',
      media_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      thumbnail_url: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=600&auto=format&fit=crop&q=80',
      duration_seconds: 42,
      source_language: 'en',
      target_languages_json: '["hi","mr"]',
      translations_json: JSON.stringify({
        hi: {
          title: 'इच्छा अनुसार स्वर कैसे बदलें? 60 सेकंड की गुप्त तकनीक 🔄',
          description: 'बाएं से दाएं या दाएं से बाएं स्वर को तुरंत बदलने की प्रमाणित विधि।'
        }
      }),
      category: 'swar-yoga',
      tags_json: '["shorts","swaryoga","switchbreath","technique"]',
      views_count: 389000,
      likes_count: 31200,
      status: 'published',
      created_at: now,
      updated_at: now
    },
    {
      id: 'seed_short_sushumna_danger',
      type: 'shorts',
      destinations_json: '["media"]',
      title: 'When Both Nostrils Flow: Sushumna Awakening & Meditation 🧘‍♂️',
      description: 'Why worldly actions fail during Sushumna but meditation reaches the highest Samadhi.',
      media_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      thumbnail_url: 'https://images.unsplash.com/photo-1545205597-3d9d02c29597?w=600&auto=format&fit=crop&q=80',
      duration_seconds: 52,
      source_language: 'en',
      target_languages_json: '["hi","mr"]',
      translations_json: JSON.stringify({
        hi: {
          title: 'जब दोनों स्वर एक साथ चलें: सुषुम्ना नाड़ी का महा-रहस्य 🧘‍♂️',
          description: 'सुषुम्ना स्वर में संसारिक कार्य क्यों नहीं करने चाहिए और ध्यान क्यों लगाना चाहिए।'
        }
      }),
      category: 'swar-yoga',
      tags_json: '["shorts","sushumna","meditation","kundalini"]',
      views_count: 512000,
      likes_count: 48900,
      status: 'published',
      created_at: now,
      updated_at: now
    },
    {
      id: 'seed_short_two_minute_decision',
      type: 'shorts',
      destinations_json: '["media"]',
      title: '2-Minute Swar Hack Before Important Decisions ⚡',
      description: 'The Vedic rule of executing actions only when the matching breath is active.',
      media_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      thumbnail_url: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=600&auto=format&fit=crop&q=80',
      duration_seconds: 120,
      source_language: 'en',
      target_languages_json: '["hi","mr"]',
      translations_json: JSON.stringify({
        hi: {
          title: 'किसी भी जरूरी काम या फैसले से पहले 2 मिनट का स्वर नियम ⚡',
          description: 'सफलता की गारंटी: जानें किस स्वर में कौन सा कार्य करना चाहिए।'
        }
      }),
      category: 'swar-yoga',
      tags_json: '["shorts","success","decisionmaking","swaryoga"]',
      views_count: 420000,
      likes_count: 39500,
      status: 'published',
      created_at: now,
      updated_at: now
    },

    // TOPIC 2: Water & Digestive Secrets (4 Shorts)
    {
      id: 'seed_short_drink_water',
      type: 'shorts',
      destinations_json: '["media"]',
      title: 'When to Drink Water? Left vs Right Nostril Secret 💧',
      description: 'Why drinking water in Chandra Swar protects digestion and maintains fluid harmony.',
      media_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      thumbnail_url: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=600&auto=format&fit=crop&q=80',
      duration_seconds: 45,
      source_language: 'en',
      target_languages_json: '["hi","mr"]',
      translations_json: JSON.stringify({
        hi: {
          title: 'पानी कब पिएं? बायां या दायां स्वर - जानिए रहस्य 💧',
          description: 'पानी पीते समय कौन सा स्वर होना चाहिए? जानिए शिव स्वरोदय का अचूक नियम।'
        }
      }),
      category: 'ayurveda',
      tags_json: '["shorts","water","ayurveda","health"]',
      views_count: 312000,
      likes_count: 28900,
      status: 'published',
      created_at: now,
      updated_at: now
    },
    {
      id: 'seed_short_eating_surya',
      type: 'shorts',
      destinations_json: '["media"]',
      title: 'Golden Rule of Eating: Surya Swar Digestion Fire 🔥',
      description: 'Never eat during Chandra Swar. Food turns into toxin (Aam) unless Surya Swar is active.',
      media_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      thumbnail_url: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600&auto=format&fit=crop&q=80',
      duration_seconds: 38,
      source_language: 'en',
      target_languages_json: '["hi","mr"]',
      translations_json: JSON.stringify({
        hi: {
          title: 'भोजन करते समय सूर्य स्वर का स्वर्णिम नियम 🔥',
          description: 'दायां स्वर चालू होने पर ही भोजन करें, कभी गैस या अपच नहीं होगी।'
        }
      }),
      category: 'ayurveda',
      tags_json: '["shorts","digestion","ayurveda","eating"]',
      views_count: 295000,
      likes_count: 25400,
      status: 'published',
      created_at: now,
      updated_at: now
    },
    {
      id: 'seed_short_cold_water_warning',
      type: 'shorts',
      destinations_json: '["media"]',
      title: 'Why Cold Water Destroys Your Stomach Jatharagni 🧊',
      description: 'The ancient biological explanation of why chilled water extinguishes gastric digestive heat.',
      media_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      thumbnail_url: 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=600&auto=format&fit=crop&q=80',
      duration_seconds: 48,
      source_language: 'en',
      target_languages_json: '["hi","mr"]',
      translations_json: JSON.stringify({
        hi: {
          title: 'ठंडा पानी जठराग्नि को कैसे बुझा देता है? 🧊',
          description: 'फ्रिज का ठंडा पानी पीने से पाचन तंत्र को होने वाले गंभीर नुकसान।'
        }
      }),
      category: 'ayurveda',
      tags_json: '["shorts","coldwater","jatharagni","guthealth"]',
      views_count: 341000,
      likes_count: 29800,
      status: 'published',
      created_at: now,
      updated_at: now
    },
    {
      id: 'seed_short_post_meal_sleep',
      type: 'shorts',
      destinations_json: '["media"]',
      title: 'Left-Side Rest After Meals: 100% Acid Reflux Cure 🛌',
      description: 'Resting on the left side (Vamkukshi) for 15 minutes activates Pingala and boosts digestion.',
      media_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      thumbnail_url: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=600&auto=format&fit=crop&q=80',
      duration_seconds: 50,
      source_language: 'en',
      target_languages_json: '["hi","mr"]',
      translations_json: JSON.stringify({
        hi: {
          title: 'भोजन के बाद बाईं करवट (वामकुक्षी) लेटने का चमत्कारी नियम 🛌',
          description: '15 मिनट बाईं करवट लेटने से पिंगला नाड़ी सक्रिय होती है और भोजन तुरंत पचता है।'
        }
      }),
      category: 'ayurveda',
      tags_json: '["shorts","vamkukshi","digestion","sleep"]',
      views_count: 412000,
      likes_count: 36700,
      status: 'published',
      created_at: now,
      updated_at: now
    },

    // TOPIC 3: Stress Relief, Peace & Mental Calm (4 Shorts)
    {
      id: 'seed_short_instant_stress',
      type: 'shorts',
      destinations_json: '["media"]',
      title: 'Instant Stress Release with Left Nostril Breathing 🧘‍♀️',
      description: '60 seconds emergency calming technique to stop panic and anxiety immediately.',
      media_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      thumbnail_url: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=600&auto=format&fit=crop&q=80',
      duration_seconds: 60,
      source_language: 'en',
      target_languages_json: '["hi","mr"]',
      translations_json: JSON.stringify({
        hi: {
          title: 'तनाव और घबराहट दूर करने का 60 सेकंड का गुप्त उपाय 🧘‍♀️',
          description: 'अचानक तनाव या चिंता होने पर चंद्र स्वर सक्रिय कर तुरंत राहत पाएं।'
        }
      }),
      category: 'healing',
      tags_json: '["shorts","stressrelief","anxiety","breathing"]',
      views_count: 189000,
      likes_count: 16700,
      status: 'published',
      created_at: now,
      updated_at: now
    },
    {
      id: 'seed_short_anger_stop',
      type: 'shorts',
      destinations_json: '["media"]',
      title: 'Stop Anger & High Blood Pressure in 90 Seconds 🕊️',
      description: 'Close right nostril and breathe slowly through left nostril to immediately normalize pulse and anger.',
      media_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      thumbnail_url: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=600&auto=format&fit=crop&q=80',
      duration_seconds: 55,
      source_language: 'en',
      target_languages_json: '["hi","mr"]',
      translations_json: JSON.stringify({
        hi: {
          title: 'गुस्सा और हाई बीपी तुरंत शांत करने का 90 सेकंड नियम 🕊️',
          description: 'दायां स्वर बंद कर बाएं स्वर से गहरी सांसें लें, क्रोध तुरंत शांत होगा।'
        }
      }),
      category: 'healing',
      tags_json: '["shorts","angercontrol","calm","peace"]',
      views_count: 220000,
      likes_count: 19800,
      status: 'published',
      created_at: now,
      updated_at: now
    },
    {
      id: 'seed_short_insomnia_sleep',
      type: 'shorts',
      destinations_json: '["media"]',
      title: 'Fall Asleep in Under 5 Minutes (The Right Side Sleep Secret) 🌙',
      description: 'Lie on your right side to open the left Chandra nostril; cools the brain and induces deep natural sleep.',
      media_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      thumbnail_url: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=600&auto=format&fit=crop&q=80',
      duration_seconds: 65,
      source_language: 'en',
      target_languages_json: '["hi","mr"]',
      translations_json: JSON.stringify({
        hi: {
          title: 'सिर्फ 5 मिनट में गहरी नींद आने का अचूक स्वर विज्ञान 🌙',
          description: 'सोते समय दाईं करवट लेटें जिससे बायां चंद्र स्वर चले और दिमाग तुरंत शांत हो।'
        }
      }),
      category: 'healing',
      tags_json: '["shorts","sleep","insomnia","calm"]',
      views_count: 375000,
      likes_count: 34100,
      status: 'published',
      created_at: now,
      updated_at: now
    },
    {
      id: 'seed_short_headache_hack',
      type: 'shorts',
      destinations_json: '["media"]',
      title: 'Natural Headache & Migraine Relief with Swar Yoga 💆',
      description: 'Check which nostril is dominant during migraine; switching to the opposite nostril provides rapid relief.',
      media_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      thumbnail_url: 'https://images.unsplash.com/photo-1545205597-3d9d02c29597?w=600&auto=format&fit=crop&q=80',
      duration_seconds: 40,
      source_language: 'en',
      target_languages_json: '["hi","mr"]',
      translations_json: JSON.stringify({
        hi: {
          title: 'सिरदर्द और माइग्रेन से तुरंत राहत पाने का स्वर नियम 💆',
          description: 'सिरदर्द होने पर विपरीत नासिका को सक्रिय कर मिनटों में दर्द दूर करें।'
        }
      }),
      category: 'healing',
      tags_json: '["shorts","headache","migraine","healing"]',
      views_count: 280000,
      likes_count: 23900,
      status: 'published',
      created_at: now,
      updated_at: now
    },

    // TOPIC 4: Morning Sadhana & Vitality Secrets (4 Shorts)
    {
      id: 'seed_short_morning_activation',
      type: 'shorts',
      destinations_json: '["media"]',
      title: 'Morning Nostril Awakening Technique by Mohan Sir ☀️',
      description: 'Which side should you turn before stepping out of bed in the morning?',
      media_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      thumbnail_url: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=600&auto=format&fit=crop&q=80',
      duration_seconds: 55,
      source_language: 'en',
      target_languages_json: '["hi","mr"]',
      translations_json: JSON.stringify({
        hi: {
          title: 'सुबह उठते ही बिस्तर पर करें यह स्वर नियम ☀️',
          description: 'सुबह पहला कदम जमीन पर रखने से पहले यह स्वर जांच लें।'
        }
      }),
      category: 'morning-sadhana',
      tags_json: '["shorts","morningroutine","vitality","sadhana"]',
      views_count: 278000,
      likes_count: 24600,
      status: 'published',
      created_at: now,
      updated_at: now
    },
    {
      id: 'seed_short_first_step',
      type: 'shorts',
      destinations_json: '["media"]',
      title: 'The First Step Out of Bed: Matching Foot with Active Swar 👣',
      description: 'Touch floor with right foot if Surya is flowing, left foot if Chandra is flowing for all-day triumph.',
      media_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      thumbnail_url: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=600&auto=format&fit=crop&q=80',
      duration_seconds: 44,
      source_language: 'en',
      target_languages_json: '["hi","mr"]',
      translations_json: JSON.stringify({
        hi: {
          title: 'सुबह जमीन पर पहला पैर कौन सा रखें? स्वर योग रहस्य 👣',
          description: 'जो स्वर चल रहा हो वही पैर जमीन पर रखें, पूरा दिन मंगलमय रहेगा।'
        }
      }),
      category: 'morning-sadhana',
      tags_json: '["shorts","morning","firststep","swar"]',
      views_count: 362000,
      likes_count: 31800,
      status: 'published',
      created_at: now,
      updated_at: now
    },
    {
      id: 'seed_short_brahma_muhurta',
      type: 'shorts',
      destinations_json: '["media"]',
      title: 'Brahma Muhurta Breath: The 10x Prana Power Window 🌅',
      description: 'Why breathing during Brahma Muhurta (4:00 AM - 5:30 AM) supercharges longevity and consciousness.',
      media_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      thumbnail_url: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=600&auto=format&fit=crop&q=80',
      duration_seconds: 58,
      source_language: 'en',
      target_languages_json: '["hi","mr"]',
      translations_json: JSON.stringify({
        hi: {
          title: 'ब्रह्म मुहूर्त की सांस: 10 गुना प्राण ऊर्जा का रहस्य 🌅',
          description: 'सुबह 4 बजे से 5:30 के बीच स्वर साधना करने से आयु और ज्ञान में वृद्धि होती है।'
        }
      }),
      category: 'morning-sadhana',
      tags_json: '["shorts","brahmamuhurta","prana","longevity"]',
      views_count: 445000,
      likes_count: 41200,
      status: 'published',
      created_at: now,
      updated_at: now
    },
    {
      id: 'seed_short_prana_surge',
      type: 'shorts',
      destinations_json: '["media"]',
      title: '3-Breath Morning Prana Surge Before Leaving Home ⚡',
      description: 'Quick breath retention technique to seal your auric field and attract success throughout the day.',
      media_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      thumbnail_url: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=600&auto=format&fit=crop&q=80',
      duration_seconds: 35,
      source_language: 'en',
      target_languages_json: '["hi","mr"]',
      translations_json: JSON.stringify({
        hi: {
          title: 'घर से निकलने से पहले 3 सांसों का चमत्कारी प्रयोग ⚡',
          description: 'सफलता और सुरक्षा के लिए घर की दहलीज पार करते समय सक्रिय स्वर का नियम।'
        }
      }),
      category: 'morning-sadhana',
      tags_json: '["shorts","prana","success","morning"]',
      views_count: 510000,
      likes_count: 47600,
      status: 'published',
      created_at: now,
      updated_at: now
    },

    // 3. PLAYLISTS
    {
      id: 'seed_playlist_foundations',
      type: 'playlist',
      destinations_json: '["media"]',
      title: 'Foundations of Shiva Swarodaya (8-Part Series)',
      description: 'Comprehensive guided course on Shiva Swarodaya from foundational breath observation to nadi manipulation.',
      thumbnail_url: 'https://images.unsplash.com/photo-1545205597-3d9d02c29597?w=800&auto=format&fit=crop&q=80',
      playlist_items_json: JSON.stringify([
        { title: 'Part 1: Introduction to Shiva Swarodaya', videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', duration: 1800, order: 1 },
        { title: 'Part 2: The Three Nadis (Ida, Pingala, Sushumna)', videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', duration: 2100, order: 2 },
        { title: 'Part 3: Tithi Panchang & Swar Alignment', videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', duration: 2400, order: 3 },
        { title: 'Part 4: Swar Change Techniques', videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', duration: 1500, order: 4 }
      ]),
      source_language: 'en',
      target_languages_json: '["hi","mr"]',
      translations_json: JSON.stringify({
        hi: {
          title: 'शिव स्वरोदय संपूर्ण पाठ्यक्रम (8 भागों की श्रृंखला)',
          description: 'शिव स्वरोदय का गहन और प्रामाणिक अध्ययन पाठ्यक्रम।'
        }
      }),
      category: 'swar-yoga',
      views_count: 56000,
      likes_count: 4900,
      status: 'published',
      created_at: now,
      updated_at: now
    },

    // 4. COMMUNITY POSTS
    {
      id: 'seed_post_daily_reflection',
      type: 'post',
      destinations_json: '["media"]',
      title: '🕉️ Daily Swar Reflection with Mohan Sir',
      description: 'Pranam Sadhaks! Which nostril is active for you this morning? Remember: during Surya Swar, heavy activities, business dealings, and nutritious meals flourish. During Chandra Swar, meditation, cooling liquids, and intellectual learning prosper. Drop your active breath in the comments below!',
      thumbnail_url: 'https://swaryogacrm.b-cdn.net/mohan.jpg',
      source_language: 'en',
      target_languages_json: '["hi","mr"]',
      translations_json: JSON.stringify({
        hi: {
          title: '🕉️ दैनिक स्वर संदेश - मोहन सर',
          description: 'प्रणाम साधकों! आज सुबह आपका कौन सा स्वर सक्रिय है? यदि दायां (सूर्य) स्वर चल रहा है तो दिन की शुरुआत ऊर्जावान कार्यों एवं पौष्टिक भोजन से करें। यदि बायां (चंद्र) स्वर है तो अध्ययन एवं शांत चिंतन करें। कमेंट में बताएं आपका कौन सा स्वर सक्रिय है!'
        }
      }),
      category: 'general',
      likes_count: 1420,
      status: 'published',
      created_at: now,
      updated_at: now
    },

    // 5. LIVE SESSIONS
    {
      id: 'seed_live_pratahkala',
      type: 'live',
      destinations_json: '["media"]',
      title: 'Live Morning Swar Sadhana & Shiva Swarodaya Chanting with Mohan Sir',
      description: 'Join Mohan Sir every morning at 5:30 AM IST for live breath alignment, nadi shodhana, and Shiva Swarodaya guidance. Tune in with practitioners worldwide.',
      thumbnail_url: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800&auto=format&fit=crop&q=80',
      duration_seconds: 3600,
      live_status: 'upcoming',
      live_scheduled_at: new Date(Date.now() + 3600000 * 4).toISOString(),
      source_language: 'en',
      target_languages_json: '["hi","mr","kn"]',
      translations_json: JSON.stringify({
        hi: {
          title: 'लाइव प्रातःकालीन स्वर साधना एवं शिव स्वरोदय पाठ - मोहन सर',
          description: 'प्रतिदिन सुबह 5:30 बजे मोहन सर के साथ लाइव स्वर साधना और नाड़ी शोधन अभ्यास में जुड़ें।'
        }
      }),
      category: 'morning-sadhana',
      views_count: 3200,
      likes_count: 890,
      status: 'published',
      created_at: now,
      updated_at: now
    }
  ];

  for (const item of seedItems) {
    try {
      await bunnyExecute({
        sql: `INSERT INTO bunny_media_items_sql (
          id, type, destinations_json, title, description, media_url, thumbnail_url,
          duration_seconds, source_language, target_languages_json, translations_json,
          playlist_items_json, social_channels_json, live_status, live_scheduled_at,
          category, tags_json, views_count, likes_count, status, created_by, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          title = excluded.title,
          description = excluded.description,
          thumbnail_url = excluded.thumbnail_url,
          translations_json = excluded.translations_json`,
        args: [
          item.id,
          item.type,
          item.destinations_json,
          item.title,
          item.description,
          item.media_url || null,
          item.thumbnail_url || null,
          item.duration_seconds || 0,
          item.source_language || 'en',
          item.target_languages_json,
          item.translations_json,
          (item as any).playlist_items_json || '[]',
          '[]',
          (item as any).live_status || 'upcoming',
          (item as any).live_scheduled_at || null,
          item.category,
          item.tags_json || '[]',
          item.views_count || 0,
          item.likes_count || 0,
          item.status,
          'system',
          item.created_at,
          item.updated_at
        ]
      });
    } catch (err) {
      console.warn('Failed to insert seed item:', item.id, err);
    }
  }
}

function mapRowToMedia(row: any): BunnyMediaItem {
  let destinations: MediaDestination[] = ['media'];
  let targetLanguages: string[] = [];
  let translations: Record<string, MultiLangTranslation> = {};
  let playlistItems: any[] = [];
  let socialChannels: string[] = [];
  let tags: string[] = [];
  let overlayStrip: MediaOverlayStrip | undefined = undefined;

  try { destinations = JSON.parse(row.destinations_json || '["media"]'); } catch {}
  try { targetLanguages = JSON.parse(row.target_languages_json || '[]'); } catch {}
  try { translations = JSON.parse(row.translations_json || '{}'); } catch {}
  try { playlistItems = JSON.parse(row.playlist_items_json || '[]'); } catch {}
  try { socialChannels = JSON.parse(row.social_channels_json || '[]'); } catch {}
  try { tags = JSON.parse(row.tags_json || '[]'); } catch {}
  try {
    if (row.overlay_strip_json && row.overlay_strip_json !== '{}') {
      overlayStrip = JSON.parse(row.overlay_strip_json);
    }
  } catch {}

  return {
    id: String(row.id),
    type: row.type || 'video',
    destinations,
    title: String(row.title || ''),
    description: String(row.description || ''),
    mediaUrl: row.media_url || undefined,
    thumbnailUrl: row.thumbnail_url || undefined,
    durationSeconds: Number(row.duration_seconds || 0),
    sourceLanguage: row.source_language || 'en',
    targetLanguages,
    translations,
    playlistItems,
    socialChannels,
    liveStatus: row.live_status || 'upcoming',
    liveScheduledAt: row.live_scheduled_at || undefined,
    category: row.category || 'general',
    tags,
    viewsCount: Number(row.views_count || 0),
    likesCount: Number(row.likes_count || 0),
    overlayStrip,
    status: row.status || 'published',
    createdBy: row.created_by || undefined,
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || new Date().toISOString()
  };
}

export async function listBunnyMediaItems(options?: {
  type?: MediaType;
  destination?: MediaDestination;
  language?: string;
  category?: string;
  status?: string;
  search?: string;
  limit?: number;
  skip?: number;
}): Promise<{ items: BunnyMediaItem[]; total: number }> {
  await initBunnyMediaSchema();

  let whereClauses: string[] = [];
  let args: any[] = [];

  if (options?.type) {
    whereClauses.push(`type = ?`);
    args.push(options.type);
  }

  if (options?.status) {
    whereClauses.push(`status = ?`);
    args.push(options.status);
  } else {
    // Default to published unless specified
    whereClauses.push(`status = 'published'`);
  }

  if (options?.destination) {
    whereClauses.push(`destinations_json LIKE ?`);
    args.push(`%"${options.destination}"%`);
  }

  if (options?.category && options.category !== 'all') {
    whereClauses.push(`category = ?`);
    args.push(options.category);
  }

  if (options?.search?.trim()) {
    const rawSearch = options.search.trim();
    whereClauses.push(`(title LIKE ? OR description LIKE ? OR tags_json LIKE ? OR translations_json LIKE ? OR id LIKE ? OR category LIKE ?)`);
    const q = `%${rawSearch}%`;
    args.push(q, q, q, q, q, q);
  }

  const whereStr = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
  const limit = Math.min(options?.limit || 20, 100);
  const skip = options?.skip || 0;

  const countRes = await bunnyExecute({
    sql: `SELECT COUNT(*) as count FROM bunny_media_items_sql ${whereStr}`,
    args
  });
  const total = Number(countRes.rows?.[0]?.count || 0);

  const queryArgs = [...args, limit, skip];
  const res = await bunnyExecute({
    sql: `SELECT * FROM bunny_media_items_sql ${whereStr} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    args: queryArgs
  });

  const items = (res.rows || []).map(mapRowToMedia);

  // If language requested and translation exists, localize title & description
  if (options?.language) {
    const lang = options.language;
    for (const item of items) {
      if (item.translations && item.translations[lang]) {
        const trans = item.translations[lang];
        if (trans.title) item.title = trans.title;
        if (trans.description) item.description = trans.description;
        if (trans.mediaUrl) item.mediaUrl = trans.mediaUrl;
      }
    }
  }

  return { items, total };
}

export async function saveBunnyMediaItem(item: Partial<BunnyMediaItem>): Promise<BunnyMediaItem> {
  await initBunnyMediaSchema();
  const now = new Date().toISOString();
  const id = item.id || `media_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;

  const destinationsJson = JSON.stringify(item.destinations || ['media']);
  const targetLangsJson = JSON.stringify(item.targetLanguages || []);
  const translationsJson = JSON.stringify(item.translations || {});
  const playlistJson = JSON.stringify(item.playlistItems || []);
  const socialJson = JSON.stringify(item.socialChannels || []);
  const tagsJson = JSON.stringify(item.tags || []);
  const overlayStripJson = JSON.stringify(item.overlayStrip || {});

  await bunnyExecute({
    sql: `INSERT INTO bunny_media_items_sql (
      id, type, destinations_json, title, description, media_url, thumbnail_url,
      duration_seconds, source_language, target_languages_json, translations_json,
      playlist_items_json, social_channels_json, live_status, live_scheduled_at,
      category, tags_json, views_count, likes_count, overlay_strip_json, status, created_by, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      type = excluded.type,
      destinations_json = excluded.destinations_json,
      title = excluded.title,
      description = excluded.description,
      media_url = excluded.media_url,
      thumbnail_url = excluded.thumbnail_url,
      duration_seconds = excluded.duration_seconds,
      source_language = excluded.source_language,
      target_languages_json = excluded.target_languages_json,
      translations_json = excluded.translations_json,
      playlist_items_json = excluded.playlist_items_json,
      social_channels_json = excluded.social_channels_json,
      live_status = excluded.live_status,
      live_scheduled_at = excluded.live_scheduled_at,
      category = excluded.category,
      tags_json = excluded.tags_json,
      overlay_strip_json = excluded.overlay_strip_json,
      status = excluded.status,
      updated_at = excluded.updated_at`,
    args: [
      id,
      item.type || 'video',
      destinationsJson,
      item.title || 'Untitled Media',
      item.description || '',
      item.mediaUrl || null,
      item.thumbnailUrl || null,
      item.durationSeconds || 0,
      item.sourceLanguage || 'en',
      targetLangsJson,
      translationsJson,
      playlistJson,
      socialJson,
      item.liveStatus || 'upcoming',
      item.liveScheduledAt || null,
      item.category || 'general',
      tagsJson,
      item.viewsCount || 0,
      item.likesCount || 0,
      overlayStripJson,
      item.status || 'published',
      item.createdBy || null,
      item.createdAt || now,
      now
    ]
  });

  return (await getBunnyMediaItemById(id))!;
}

export async function getBunnyMediaItemById(id: string): Promise<BunnyMediaItem | null> {
  await initBunnyMediaSchema();
  const res = await bunnyExecute({
    sql: `SELECT * FROM bunny_media_items_sql WHERE id = ?`,
    args: [id]
  });
  if (!res.rows?.length) return null;
  return mapRowToMedia(res.rows[0]);
}

export async function incrementMediaView(id: string): Promise<void> {
  await initBunnyMediaSchema();
  await bunnyExecute({
    sql: `UPDATE bunny_media_items_sql SET views_count = views_count + 1 WHERE id = ?`,
    args: [id]
  });
}

export async function deleteBunnyMediaItem(id: string): Promise<boolean> {
  await initBunnyMediaSchema();
  await bunnyExecute({
    sql: `DELETE FROM bunny_media_items_sql WHERE id = ?`,
    args: [id]
  });
  return true;
}
