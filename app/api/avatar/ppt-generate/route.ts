import { NextRequest, NextResponse } from 'next/server';
import { generateAIText } from '@/lib/ai/generateWithFallback';

export const dynamic = 'force-dynamic';

export interface PptThemePreset {
  id: string;
  name: string;
  description: string;
  phases: Array<{
    phase: number;
    name: string;
    energy: string;
    color: string;
    accent: string;
    bgGradient: string;
    textColor: string;
  }>;
}

export const PPT_THEME_PRESETS: Record<string, PptThemePreset> = {
  surya_sushumna_chandra: {
    id: 'surya_sushumna_chandra',
    name: 'Surya ➔ Sushumna ➔ Chandra (Tri-Color Energy Flow)',
    description: 'Gold/Amber activation (0-10m) ➔ Cosmic Indigo wisdom (10-20m) ➔ Moonlight Teal peace (20-30m)',
    phases: [
      {
        phase: 1,
        name: 'Phase 1: Surya / Awakening (0-10 min)',
        energy: 'Solar / Inspiration / Focus',
        color: '#F59E0B',
        accent: '#D97706',
        bgGradient: 'from-amber-950/60 via-stone-950 to-stone-900',
        textColor: '#FEF3C7',
      },
      {
        phase: 2,
        name: 'Phase 2: Sushumna / Wisdom (10-20 min)',
        energy: 'Balance / Brain Hemispheres / Deep Insight',
        color: '#6366F1',
        accent: '#4F46E5',
        bgGradient: 'from-indigo-950/70 via-slate-950 to-slate-900',
        textColor: '#E0E7FF',
      },
      {
        phase: 3,
        name: 'Phase 3: Chandra / Integration (20-30 min)',
        energy: 'Lunar / Calm / Subconscious Assimilation',
        color: '#14B8A6',
        accent: '#0D9488',
        bgGradient: 'from-teal-950/70 via-stone-950 to-slate-950',
        textColor: '#CCFBF1',
      },
    ],
  },
  himalayan_zen: {
    id: 'himalayan_zen',
    name: 'Himalayan Zen Sanctuary',
    description: 'Sacred mountain sunrise ➔ Pristine snow meditation ➔ Twilight stillness',
    phases: [
      {
        phase: 1,
        name: 'Phase 1: Golden Dawn',
        energy: 'Prana / Vitality',
        color: '#EAB308',
        accent: '#CA8A04',
        bgGradient: 'from-yellow-950/50 via-slate-950 to-stone-900',
        textColor: '#FEF08A',
      },
      {
        phase: 2,
        name: 'Phase 2: Snow Peak Stillness',
        energy: 'Clarity / Mind Expansion',
        color: '#38BDF8',
        accent: '#0284C7',
        bgGradient: 'from-sky-950/60 via-slate-950 to-stone-900',
        textColor: '#E0F2FE',
      },
      {
        phase: 3,
        name: 'Phase 3: Twilight Silver',
        energy: 'Samadhi / Deep Peace',
        color: '#94A3B8',
        accent: '#64748B',
        bgGradient: 'from-slate-900 via-zinc-950 to-black',
        textColor: '#F1F5F9',
      },
    ],
  },
  sacred_bio_energy: {
    id: 'sacred_bio_energy',
    name: 'Sacred Bio-Energy & Chakras',
    description: 'Solar Plexus fire ➔ Anahata Heart harmony ➔ Ajna/Sahasrara cosmic consciousness',
    phases: [
      {
        phase: 1,
        name: 'Phase 1: Solar Fire (Manipura)',
        energy: 'Agni / Digestive Fire / Power',
        color: '#F97316',
        accent: '#EA580C',
        bgGradient: 'from-orange-950/60 via-stone-950 to-slate-900',
        textColor: '#FFEDD5',
      },
      {
        phase: 2,
        name: 'Phase 2: Heart Harmony (Anahata)',
        energy: 'Love / Balance / Healing',
        color: '#10B981',
        accent: '#059669',
        bgGradient: 'from-emerald-950/60 via-slate-950 to-stone-900',
        textColor: '#D1FAE5',
      },
      {
        phase: 3,
        name: 'Phase 3: Third Eye & Crown (Ajna)',
        energy: 'Cosmic Union / Consciousness',
        color: '#8B5CF6',
        accent: '#7C3AED',
        bgGradient: 'from-purple-950/60 via-slate-950 to-black',
        textColor: '#EDE9FE',
      },
    ],
  },
  vedic_gold_charcoal: {
    id: 'vedic_gold_charcoal',
    name: 'Royal Vedic Gold & Deep Charcoal',
    description: 'Timeless spiritual royalty with glowing gold accents on velvet black',
    phases: [
      {
        phase: 1,
        name: 'Phase 1: Shloka Invocation',
        energy: 'Reverence / Guru Krupa',
        color: '#FBBF24',
        accent: '#D97706',
        bgGradient: 'from-amber-950/50 via-stone-950 to-black',
        textColor: '#FEF3C7',
      },
      {
        phase: 2,
        name: 'Phase 2: Shiva Swarodaya Scripture',
        energy: 'Ancient Wisdom / Secret Knowledge',
        color: '#F59E0B',
        accent: '#B45309',
        bgGradient: 'from-stone-900 via-stone-950 to-black',
        textColor: '#FDE68A',
      },
      {
        phase: 3,
        name: 'Phase 3: Sadhana Siddhi',
        energy: 'Mastery / Inner Light',
        color: '#D97706',
        accent: '#92400E',
        bgGradient: 'from-amber-950/40 via-stone-950 to-black',
        textColor: '#FEF3C7',
      },
    ],
  },
};

// Curated high-res imagery for Swar Yoga & Brain Balance visual slides
const CURATED_VISUAL_IMAGERY = [
  {
    id: 'brain_hemispheres_balance',
    title: 'Dual Brain Hemispheres & Breath Sync',
    url: 'https://images.unsplash.com/photo-1559757175-5700dde675bc?auto=format&fit=crop&w=1200&q=80',
    tags: ['brain', 'balance', 'ida', 'pingala', 'breath', 'swar'],
  },
  {
    id: 'surya_nadi_solar_fire',
    title: 'Surya Nadi / Right Nostril Solar Energy',
    url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80',
    tags: ['surya', 'sun', 'solar', 'fire', 'pingala', 'energy'],
  },
  {
    id: 'chandra_nadi_moon_calm',
    title: 'Chandra Nadi / Left Nostril Moonlight Peace',
    url: 'https://images.unsplash.com/photo-1532767153582-b1a0e5145009?auto=format&fit=crop&w=1200&q=80',
    tags: ['chandra', 'moon', 'lunar', 'ida', 'calm', 'peace'],
  },
  {
    id: 'sushumna_spinal_kundalini',
    title: 'Sushumna Central Nadi & Spine Alignment',
    url: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=1200&q=80',
    tags: ['sushumna', 'spine', 'kundalini', 'balance', 'meditation'],
  },
  {
    id: 'himalayas_sunrise_prana',
    title: 'Himalayan Sunrise & Morning Prana Flow',
    url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=80',
    tags: ['himalayas', 'sunrise', 'prana', 'morning', 'sadhana'],
  },
  {
    id: 'sacred_mandala_geometry',
    title: 'Sacred Geometry & Cosmic Breath Cycle',
    url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1200&q=80',
    tags: ['mandala', 'sacred', 'geometry', 'cycles', 'universe'],
  },
  {
    id: 'meditative_mind_stillness',
    title: 'Inner Silence & Mental Stillness in Lotus Pose',
    url: 'https://images.unsplash.com/photo-1545205597-3d9d02c29597?auto=format&fit=crop&w=1200&q=80',
    tags: ['silence', 'stillness', 'meditation', 'lotus', 'mind'],
  },
  {
    id: 'ayurvedic_digestive_fire',
    title: 'Jatharagni / Metabolic Fire & Surya Swar Eating',
    url: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1200&q=80',
    tags: ['food', 'eating', 'fire', 'ayurveda', 'digestion', 'surya'],
  },
];

export async function POST(request: NextRequest) {
  try {
    const {
      script,
      duration = '3min', // '3min' | '30min'
      themeId = 'surya_sushumna_chandra',
      language = 'hi',
    } = await request.json();

    if (!script || typeof script !== 'string' || !script.trim()) {
      return NextResponse.json({ error: 'Lecture script or text is required' }, { status: 400 });
    }

    const themePreset = PPT_THEME_PRESETS[themeId] || PPT_THEME_PRESETS.surya_sushumna_chandra;
    const targetSlideCount = duration === '30min' ? 12 : 5;

    const systemPrompt = `You are a world-class Visual Presentation Art Director specializing in Vedic Yoga, Neuroscience, and Brain-Balance visual presentations.

TASK:
Analyze the given speech/lecture transcript and generate an EDITABLE, VISUAL-FIRST presentation slide deck.

CRITICAL RULES (BRAIN-BALANCE DESIGN):
1. HEADING ONLY (NO BULLETS, NO PARAGRAPHS):
- Slides MUST NOT have bulleted lists or heavy explanatory text.
- Each slide has ONLY ONE powerful, captivating HEADING (max 5 to 8 words).
- Optionally, ONE concise sub-heading or sacred Sanskrit sutra (max 6 words).
- The rest of the slide is intended for evocative, mind-balancing IMAGERY.

2. TRI-COLOR ENERGY PROGRESSION (3 PHASES):
You must divide the presentation into 3 phases:
- Phase 1 (First 33% of duration): Surya / Awakening / Solar Focus.
- Phase 2 (Middle 33% of duration): Sushumna / Core Deep Wisdom / Balance.
- Phase 3 (Final 33% of duration): Chandra / Peace / Assimilation.

3. TOTAL SLIDES REQUIRED:
- Generate EXACTLY ${targetSlideCount} slides.
${duration === '30min' 
  ? '- Slides 1-4: Phase 1 (Surya)\n- Slides 5-8: Phase 2 (Sushumna)\n- Slides 9-12: Phase 3 (Chandra)'
  : '- Slide 1-2: Phase 1 (Surya)\n- Slide 3: Phase 2 (Sushumna)\n- Slide 4-5: Phase 3 (Chandra)'}

4. LANGUAGE:
- Generate all slide headings and sutras in language code: "${language}" (e.g. if 'hi', write in clean Hindi; if 'kn', write in Kannada; if 'mr', write in Marathi; if 'en', write in English).
- Keep sacred Sanskrit terms intact (Swar Yoga, Surya Swar, Chandra Swar, Ida, Pingala, Sushumna, Jatharagni).

5. OUTPUT JSON FORMAT ONLY:
Respond strictly in JSON:
{
  "title": "Master Presentation Title",
  "themeId": "${themeId}",
  "language": "${language}",
  "duration": "${duration}",
  "slides": [
    {
      "slideNumber": 1,
      "phase": 1,
      "timeRange": "00:00 - 00:45",
      "heading": "...",
      "subHeading": "...",
      "visualConcept": "Visual metaphor description (e.g. glowing golden sun entering right nostril activating brain left hemisphere)",
      "avatarLayout": "corner_circle",
      "curatedImageKey": "brain_hemispheres_balance"
    }
  ]
}`;

    const aiRes = await generateAIText({
      systemPrompt,
      message: script.trim(),
    });

    let cleanJson = aiRes.trim();
    if (cleanJson.startsWith('```json')) cleanJson = cleanJson.replace(/^```json/, '');
    if (cleanJson.startsWith('```')) cleanJson = cleanJson.replace(/^```/, '');
    if (cleanJson.endsWith('```')) cleanJson = cleanJson.replace(/```$/, '');

    let parsed: any;
    try {
      parsed = JSON.parse(cleanJson.trim());
    } catch {
      // Fallback slides
      parsed = {
        title: 'Swar Yoga Presentation',
        themeId,
        language,
        duration,
        slides: [
          {
            slideNumber: 1,
            phase: 1,
            timeRange: '00:00 - 00:45',
            heading: 'स्वर योग: श्वासों का दिव्य रहस्य',
            subHeading: 'शिव स्वरोदय शास्त्र',
            visualConcept: 'Dual brain hemispheres glowing with golden breath flow',
            avatarLayout: 'corner_circle',
            curatedImageKey: 'brain_hemispheres_balance',
          },
          {
            slideNumber: 2,
            phase: 1,
            timeRange: '00:45 - 01:30',
            heading: 'सूर्य स्वर: प्राण और तेज की जागृति',
            subHeading: 'दाईं नासिका • पिंगला नाड़ी',
            visualConcept: 'Sun energy rising from horizon igniting metabolic fire',
            avatarLayout: 'corner_square',
            curatedImageKey: 'surya_nadi_solar_fire',
          },
          {
            slideNumber: 3,
            phase: 2,
            timeRange: '01:30 - 02:15',
            heading: 'सुषुम्ना: परम संतुलन और ध्यान',
            subHeading: 'उभय स्वर • शून्य अवस्था',
            visualConcept: 'Spinal column illuminated with celestial alignment',
            avatarLayout: 'split_screen',
            curatedImageKey: 'sushumna_spinal_kundalini',
          },
          {
            slideNumber: 4,
            phase: 3,
            timeRange: '02:15 - 02:45',
            heading: 'चंद्र स्वर: शांति और आरोग्य का अमृत',
            subHeading: 'बाईं नासिका • इड़ा नाड़ी',
            visualConcept: 'Serene moonlit stream flowing through peaceful forest',
            avatarLayout: 'corner_circle',
            curatedImageKey: 'chandra_nadi_moon_calm',
          },
          {
            slideNumber: 5,
            phase: 3,
            timeRange: '02:45 - 03:00',
            heading: 'दैनिक साधना से जीवन परिवर्तन',
            subHeading: 'हरि ॐ तत्सत्',
            visualConcept: 'Meditator in stillness surrounded by golden aura',
            avatarLayout: 'stage_background',
            curatedImageKey: 'meditative_mind_stillness',
          },
        ],
      };
    }

    // Attach phase styling and actual image URLs to each slide
    const hydratedSlides = (parsed.slides || []).map((s: any, idx: number) => {
      const phaseNum = s.phase || (idx < 2 ? 1 : idx === 2 ? 2 : 3);
      const phaseConfig = themePreset.phases.find((p) => p.phase === phaseNum) || themePreset.phases[0];
      
      const matchedImg =
        CURATED_VISUAL_IMAGERY.find((img) => img.id === s.curatedImageKey) ||
        CURATED_VISUAL_IMAGERY[idx % CURATED_VISUAL_IMAGERY.length];

      const totalCount = (parsed.slides || []).length;
      // Attach 10-second animations to slides 2, 3, and 5 (Minute 1, 2, 3)
      const hasAnimation = idx === 1 || idx === 2 || idx === (totalCount > 4 ? 4 : totalCount - 1);

      return {
        id: `slide_${idx + 1}_${Date.now()}`,
        slideNumber: idx + 1,
        phase: phaseNum,
        phaseName: phaseConfig.name,
        timeRange: s.timeRange || `0${idx}:00 - 0${idx + 1}:00`,
        heading: s.heading || `Slide ${idx + 1}`,
        subHeading: s.subHeading || '',
        visualConcept: s.visualConcept || '',
        imageUrl: s.imageUrl || matchedImg.url,
        imageTitle: matchedImg.title,
        avatarLayout: s.avatarLayout || 'corner_circle',
        themeColor: phaseConfig.color,
        accentColor: phaseConfig.accent,
        bgGradient: phaseConfig.bgGradient,
        textColor: phaseConfig.textColor,
        hasAttachedAnimation: hasAnimation,
        animationTriggerTime: idx === 1 ? '00:45s' : idx === 2 ? '01:45s' : '02:45s',
      };
    });

    // 3 Automatic 10-Second Animations for the 3-minute class
    const animations10s = [
      {
        id: 'anim_min1',
        minute: 1,
        timeTrigger: '00:45s',
        title: 'मस्तिष्क संतुलन: सूर्य व चंद्र स्वर प्रवाह (10s)',
        subtitle: 'Dual Brain Hemispheres Breath Sync',
        category: 'internal_anatomy',
        duration: 10,
        linkedSlideNumber: 2,
        previewUrl: 'https://images.unsplash.com/photo-1559757175-5700dde675bc?auto=format&fit=crop&w=1200&q=80',
        description: '10-Second 3D Brain hemisphere sync animation during Minute 1 intro',
        actionSteps: [
          '00:00 - 00:03s: सूर्य स्वर से बायां मस्तिष्क सक्रिय',
          '00:03 - 00:06s: चंद्र स्वर से दायां मस्तिष्क शांत',
          '00:06 - 00:10s: सुषुम्ना में दोनों गोलार्धों का पूर्ण समन्वय',
        ],
      },
      {
        id: 'anim_min2',
        minute: 2,
        timeTrigger: '01:45s',
        title: 'नासिकाग्र मुद्रा व जठराग्नि सक्रियण (10s)',
        subtitle: 'Nasikagra Hand Mudra & Digestive Agni',
        category: 'hand_mudra',
        duration: 10,
        linkedSlideNumber: 3,
        previewUrl: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=1200&q=80',
        description: '10-Second Hand Mudra & Agni activation during Minute 2 core principle',
        actionSteps: [
          '00:00 - 00:03s: भ्रूमध्य पर तर्जनी व मध्यमा का स्पर्श',
          '00:03 - 00:06s: अंगूठे से सूर्य स्वर नियंत्रण',
          '00:06 - 00:10s: जठराग्नि व पित्त का प्राकृतिक संतुलन',
        ],
      },
      {
        id: 'anim_min3',
        minute: 3,
        timeTrigger: '02:45s',
        title: 'त्रिफला जल सेवन व आंतों का डिटॉक्स (10s)',
        subtitle: 'Triphala Overnight Infusion & Morning Drink',
        category: 'ayurveda_remedy',
        duration: 10,
        linkedSlideNumber: 5,
        previewUrl: 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&w=1200&q=80',
        description: '10-Second Triphala preparation and morning drinking action during Minute 3 practical takeaway',
        actionSteps: [
          '00:00 - 00:03s: 1 चम्मच त्रिफला पाउडर पानी में घोलना',
          '00:03 - 00:06s: रात भर ढककर रखना (शीतलता)',
          '00:06 - 00:10s: सूर्योदय पर शांति से पीना व डिटॉक्स',
        ],
      },
    ];

    return NextResponse.json({
      success: true,
      data: {
        title: parsed.title || 'Swar Yoga Presentation',
        duration,
        themeId,
        themeName: themePreset.name,
        phases: themePreset.phases,
        curatedLibrary: CURATED_VISUAL_IMAGERY,
        slides: hydratedSlides,
        animations10s,
      },
    });
  } catch (error: any) {
    console.error('PPT generation error:', error);
    return NextResponse.json({ error: error.message || 'PPT generation failed' }, { status: 500 });
  }
}
