export interface AvatarScene {
  id: string;
  name: string;
  category: 'kitchen' | 'ashram' | 'studio' | 'nature' | 'office' | 'greenscreen' | 'custom';
  badge: string;
  description: string;
  imageUrl: string;
  lightingStyle: string;
  recommendedWardrobe: string;
  recommendedLook: string;
}

export interface AvatarWardrobe {
  id: string;
  name: string;
  tagline: string;
  category: 'chef' | 'vedic' | 'formal' | 'casual' | 'yoga';
  imageUrl: string;
  icon: string;
}

export interface AvatarLook {
  id: string;
  name: string;
  tagline: string;
  icon: string;
  mood: string;
  features: string[];
}

export interface AvatarStudioPreset {
  id: string;
  name: string;
  tagline: string;
  icon: string;
  sceneId: string;
  wardrobeId: string;
  lookId: string;
  sampleScript: string;
}

export const AVAILABLE_SCENES: AvatarScene[] = [
  {
    id: 'kitchen',
    name: 'Modern Luxury Kitchen & Recipes',
    category: 'kitchen',
    badge: '🍳 Sattvic Cuisine',
    description: 'Designer wooden cabinetry, white marble island, copper cookware, fresh organic spices & herbs. Perfect for healthy recipe creation and Ayurvedic diet lectures.',
    imageUrl: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=1200&auto=format&fit=crop&q=80',
    lightingStyle: 'Warm Golden Sunlight & Under-Cabinet Glow',
    recommendedWardrobe: 'chef_apron',
    recommendedLook: 'ayurvedic_chef',
  },
  {
    id: 'ashram',
    name: 'Vedic Ashram & Meditation Sanctuary',
    category: 'ashram',
    badge: '🕉️ Sacred Spiritual',
    description: 'Ancient teakwood carved pillars, glowing brass oil lamps (diyas), silk drapes, serene temple energy for Swar Yoga and Shiva Swarodaya.',
    imageUrl: 'https://images.unsplash.com/photo-1545205597-3d9d02c29597?w=1200&auto=format&fit=crop&q=80',
    lightingStyle: 'Spiritual Candlelit Ambiance & Soft Temple Daylight',
    recommendedWardrobe: 'white_kurta',
    recommendedLook: 'vedic_guru',
  },
  {
    id: 'product_studio',
    name: 'Tech Product & Podcast Studio',
    category: 'studio',
    badge: '🎙️ Modern Broadcast',
    description: 'Dark acoustic slat acoustic walls, dual-tone studio rim lights, high-end desk setup, broadcast microphone. Ideal for tech reviews, products & courses.',
    imageUrl: 'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?w=1200&auto=format&fit=crop&q=80',
    lightingStyle: 'Cinematic Amber & Cyan Rim Lighting with Fill Softbox',
    recommendedWardrobe: 'blazer',
    recommendedLook: 'professional',
  },
  {
    id: 'himalayas',
    name: 'Himalayan Sunrise & Sacred Ganga',
    category: 'nature',
    badge: '🏔️ Pure Prana',
    description: 'Majestic snow-capped mountain peaks, pine valley mist, holy riverbank and morning golden solar rays. Great for outdoor breath sessions.',
    imageUrl: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=1200&auto=format&fit=crop&q=80',
    lightingStyle: 'High Dynamic Golden Hour Morning Sun',
    recommendedWardrobe: 'saffron_kurta',
    recommendedLook: 'vedic_guru',
  },
  {
    id: 'office',
    name: 'Executive Minimalist Masterclass Suite',
    category: 'office',
    badge: '💼 Professional Webinar',
    description: 'Modern glass whiteboard, curated wooden bookshelves, contemporary architectural interior for corporate wellness workshops.',
    imageUrl: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=1200&auto=format&fit=crop&q=80',
    lightingStyle: 'Crisp Natural Skylight & Clean Diffused Office Luminescence',
    recommendedWardrobe: 'blazer',
    recommendedLook: 'professional',
  },
  {
    id: 'greenscreen',
    name: 'Chroma Key Green Screen (#00FF00)',
    category: 'greenscreen',
    badge: '🟢 VFX & Post-Production',
    description: 'Pure studio chroma green backdrop for 100% custom compositing in Premiere Pro, DaVinci Resolve, or web overlays.',
    imageUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=1200&auto=format&fit=crop&q=80',
    lightingStyle: 'Flat Zero-Shadow Studio Key Lighting',
    recommendedWardrobe: 'white_kurta',
    recommendedLook: 'vedic_guru',
  },
];

export const AVAILABLE_WARDROBES: AvatarWardrobe[] = [
  {
    id: 'chef_apron',
    name: 'Master Chef Apron & Rolled Sleeves',
    tagline: 'Dark artisan canvas apron with Swar Yoga golden insignia, crisp linen roll-up shirt',
    category: 'chef',
    imageUrl: 'https://images.unsplash.com/photo-1577219491135-ce391730fb2c?w=500&auto=format&fit=crop&q=80',
    icon: '👨‍🍳',
  },
  {
    id: 'white_kurta',
    name: 'Pure White Khadi Cotton Kurta',
    tagline: 'Traditional Indian yogic attire with subtle thread embroidery on Mandarin collar',
    category: 'vedic',
    imageUrl: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=500&auto=format&fit=crop&q=80',
    icon: '⚪',
  },
  {
    id: 'saffron_kurta',
    name: 'Sacred Saffron / Ochre Silk Kurta',
    tagline: 'Auspicious Vedic spiritual attire worn during high-energy Surya Swar sadhana',
    category: 'vedic',
    imageUrl: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=500&auto=format&fit=crop&q=80',
    icon: '🟠',
  },
  {
    id: 'blazer',
    name: 'Charcoal Navy Linen Smart Blazer',
    tagline: 'Contemporary sharp tailored jacket over crisp open-collar white shirt',
    category: 'formal',
    imageUrl: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=500&auto=format&fit=crop&q=80',
    icon: '👔',
  },
  {
    id: 'yoga_active',
    name: 'Breathable Yoga Flow Activewear',
    tagline: 'Flexible athletic yogic apparel engineered for deep stretches and asana flows',
    category: 'yoga',
    imageUrl: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=500&auto=format&fit=crop&q=80',
    icon: '🧘',
  },
];

export const AVAILABLE_LOOKS: AvatarLook[] = [
  {
    id: 'ayurvedic_chef',
    name: 'Ayurvedic Chef & Culinary Host',
    tagline: 'Warm, hospitable, enthusiastic culinary instructor with expressive hand gestures',
    icon: '🍲',
    mood: 'Engaging, Joyful & Sensory',
    features: ['Welcoming smile', 'Food aroma gestures', 'Clear demonstration posture'],
  },
  {
    id: 'vedic_guru',
    name: 'Swar Yoga Master & Sage',
    tagline: 'Serene forehead chandan tilak, deeply calm and conscious gaze, authoritative yogic presence',
    icon: '🧘‍♂️',
    mood: 'Tranquil, Sacred & Profound',
    features: ['Gentle compassionate eyes', 'Gyan mudra poses', 'Deep measured pauses'],
  },
  {
    id: 'professional',
    name: 'Executive Masterclass Coach',
    tagline: 'Sharp, dynamic, articulate presentation style with focused eye contact',
    icon: '💼',
    mood: 'Confident, Crisp & Action-Oriented',
    features: ['Direct audience engagement', 'Emphasis gestures', 'Upright posture'],
  },
  {
    id: 'healer',
    name: 'Holistic Prana Healer',
    tagline: 'Soft empathetic warmth, soothing acoustic cadence, reassuring healing energy',
    icon: '🌿',
    mood: 'Empathetic, Gentle & Reassuring',
    features: ['Heart-touching warmth', 'Open palm blessings', 'Meditative rhythm'],
  },
];

export const STUDIO_PRESETS: AvatarStudioPreset[] = [
  {
    id: 'kitchen_recipes',
    name: 'In a Good Kitchen Creating Recipes',
    tagline: 'Chef look + Luxury Kitchen + Sattvic recipe teaching script',
    icon: '🍳',
    sceneId: 'kitchen',
    wardrobeId: 'chef_apron',
    lookId: 'ayurvedic_chef',
    sampleScript: `[smile:85] [namaste] हरि ॐ! स्वागत है आप सभी का स्वर योग की वैदिक रसोई में!
[curious:80] क्या आप जानते हैं कि गलत समय पर खाया गया अमृत समान भोजन भी विष बन जाता है?
[pause:1.5s]
[teaching] [open_palms] जब आपका सूर्य स्वर यानी दायां नथुना सक्रिय हो, तब जठराग्नि सबसे तीव्र होती है।
[serious:90] ठीक इसी समय हमें पाचक मसाले, देसी घी और पौष्टिक सात्विक खिचड़ी खानी चाहिए।
[big_smile:85] आइए, आज हम साथ मिलकर बनाते हैं यह अद्भुत प्राण-पोषक रेसिपी!`,
  },
  {
    id: 'swar_sadhana',
    name: 'Vedic Swar Yoga Sadhana & Ashram',
    tagline: 'Guru look + Sacred Ashram + Breath cycles lecture',
    icon: '🕉️',
    sceneId: 'ashram',
    wardrobeId: 'white_kurta',
    lookId: 'vedic_guru',
    sampleScript: `[smile:75] [namaste] नमस्कार मित्रों! क्या आप जानते हैं? [curious:85]
हमारी सांसें हमारे शरीर और मन को कैसे नियंत्रित करती हैं?
[pause:1.5s]
[serious:90] यह समझना बहुत जरूरी है कि हर 60 से 90 मिनट में आपका सक्रिय स्वर बदलता है। [teaching]
[inspire:85] जब सूर्य स्वर चलता है तो भोजन और ऊर्जावान कार्य करें, और जब चंद्र स्वर चले तो शांत चिंतन करें। [open_palms]
[big_smile:80] आइए, आज स्वर योग के इस चमत्कारी विज्ञान को अपने जीवन में उतारते हैं!
[namaste] धन्यवाद, प्रणाम।`,
  },
  {
    id: 'product_review',
    name: 'Product Studio & Technology Masterclass',
    tagline: 'Blazer + Tech Studio + Modern product & gadget demo',
    icon: '🎙️',
    sceneId: 'product_studio',
    wardrobeId: 'blazer',
    lookId: 'professional',
    sampleScript: `[smile:80] Welcome back to the Swar Yoga Studio! Today we are introducing our new bio-frequency prana tracker.
[curious:85] Can modern wearable technology detect your subtle breath cycles in real time?
[pause:1.2s]
[teaching] [pointing_finger] As you can see right on this dashboard, the sensor maps Ida and Pingala airflow instantly.
[inspire:85] Let's dive into the live demonstration right now!`,
  },
  {
    id: 'himalayan_retreat',
    name: 'Himalayan Mountain Retreat & Prana Flow',
    tagline: 'Saffron Kurta + Misty Mountain Peaks + Meditative sunrise',
    icon: '🏔️',
    sceneId: 'himalayas',
    wardrobeId: 'saffron_kurta',
    lookId: 'vedic_guru',
    sampleScript: `[smile:70] [namaste] हिमालय की इस पावन प्रभात वेला में आप सभी का स्वागत है।
[pause:2.0s]
[inspire:90] अपने नेत्र बंद करें और इस शीतल पर्वतीय वायु को अपनी नासिका से भीतर भरें।
[teaching] [open_palms] चंद्र स्वर की यह शीतल धारा आपके संपूर्ण स्नायु तंत्र को शांत और तनावमुक्त कर रही है।
[peace:85] ॐ शांति, शांति, शांतिः।`,
  },
];
