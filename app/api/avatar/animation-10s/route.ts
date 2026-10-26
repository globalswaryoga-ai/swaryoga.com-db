import { NextRequest, NextResponse } from 'next/server';
import { generateAIText } from '@/lib/ai/generateWithFallback';

export const dynamic = 'force-dynamic';

export interface AnimationPresetItem {
  id: string;
  category: 'ayurveda_remedy' | 'yoga_asana' | 'hand_mudra' | 'internal_anatomy' | 'resort_architecture' | 'real_video_hybrid';
  title: string;
  subtitle: string;
  duration: number; // in seconds
  description: string;
  previewUrl: string;
  realVideoUrl?: string;
  steps: Array<{
    timeRange: string;
    action: string;
    visualFocus: string;
    calloutText: string;
  }>;
  cameraMotion: string;
  elements: string[];
}

export const ANIMATION_10S_PRESETS: AnimationPresetItem[] = [
  {
    id: 'triphala_overnight_remedy',
    category: 'ayurveda_remedy',
    title: 'त्रिफला जल: रात को भिगोकर सुबह पीना',
    subtitle: 'Triphala Powder Overnight Water Infusion & Morning Detox',
    duration: 10,
    description: '1 चम्मच त्रिफला कांच के गिलास में घोलकर रात भर ढकना और प्रातःकाल सूर्योदय पर पीना।',
    previewUrl: '/images/animation-4k/triphala_cosmic_4k.jpg',
    steps: [
      {
        timeRange: '00:00 - 00:03s',
        action: '1 चम्मच त्रिफला पाउडर कांच के गिलास में डालना',
        visualFocus: 'Spoon pouring organic herbal Triphala powder into clear mineral water',
        calloutText: '1 चम्मच त्रिफला चूर्ण',
      },
      {
        timeRange: '00:03 - 00:06s',
        action: 'चम्मच से घोलना और रात भर ढक्कन से ढक कर रखना',
        visualFocus: 'Gentle swirl, covered with porcelain lid under serene moonlight ambiance',
        calloutText: 'घोलकर रात भर ढकें',
      },
      {
        timeRange: '00:06 - 00:10s',
        action: 'सूर्योदय पर ढक्कन हटाकर पीना और आंतों का डिटॉक्स',
        visualFocus: 'Lid lifted in golden morning dawn, drinking peacefully with digestive glow',
        calloutText: 'सूर्योदय पर अमृत समान सेवन',
      },
    ],
    cameraMotion: 'Smooth macro slow-zoom ➔ Twilight dissolve ➔ Golden sunrise pan',
    elements: ['Agni (Fire)', 'Prithvi (Earth)', 'Jala (Water)'],
  },
  {
    id: 'brain_hemispheres_sync',
    category: 'internal_anatomy',
    title: 'मस्तिष्क संतुलन: इड़ा-पिंगला श्वास चक्र',
    subtitle: 'Dual Brain Hemispheres Synchronization via Swar Yoga',
    duration: 10,
    description: 'दाईं और बाईं नासिका से श्वास प्रवाह के अनुसार दोनों ब्रेन गोलार्धों का सक्रियण।',
    previewUrl: '/images/animation-4k/brain_hemispheres_4k.jpg',
    steps: [
      {
        timeRange: '00:00 - 00:03s',
        action: 'दाईं नासिका से सूर्य स्वर प्रवाह',
        visualFocus: 'Golden solar breath illuminating Left Brain logic center',
        calloutText: 'सूर्य स्वर • बायां मस्तिष्क सक्रिय',
      },
      {
        timeRange: '00:03 - 00:06s',
        action: 'बाईं नासिका से चंद्र स्वर प्रवाह',
        visualFocus: 'Silvery lunar light illuminating Right Brain intuition & creativity',
        calloutText: 'चंद्र स्वर • दायां मस्तिष्क शांत',
      },
      {
        timeRange: '00:06 - 00:10s',
        action: 'सुषुम्ना मध्य स्वर: दोनों गोलार्धों का पूर्ण समन्वय',
        visualFocus: '360° brain orbit with unified radiant violet aura in Corpus Callosum',
        calloutText: 'सुषुम्ना संतुलन • पूर्ण ध्यान अवस्था',
      },
    ],
    cameraMotion: '360° 3D Brain Orbit with pulsating neural synapse network',
    elements: ['Akasha (Ether)', 'Vayu (Air)'],
  },
  {
    id: 'nasikagra_mudra_technique',
    category: 'hand_mudra',
    title: 'नासिकाग्र मुद्रा: स्वर नियंत्रण हस्त मुद्रा',
    subtitle: 'Nasikagra Hand Mudra for Nostril Swar Shifting',
    duration: 10,
    description: 'स्वर योग में नासिका छिद्रों को बदलने के लिए अंगूठे और अनामिका का पवित्र संरेखण।',
    previewUrl: '/images/animation-4k/nasikagra_prana_4k.jpg',
    steps: [
      {
        timeRange: '00:00 - 00:03s',
        action: 'दाहिने हाथ की तर्जनी व मध्यमा को मोड़ना (भ्रूमध्य पर)',
        visualFocus: '3D Hand model folding index & middle fingers at eyebrow center',
        calloutText: 'भ्रूमध्य स्पर्श मुद्रा',
      },
      {
        timeRange: '00:03 - 00:06s',
        action: 'अंगूठे से दाईं नासिका बंद कर बाईं से चंद्र श्वास लेना',
        visualFocus: 'Thumb gently closing right nostril with glowing blue cool prana',
        calloutText: 'चंद्र स्वर जागृति',
      },
      {
        timeRange: '00:06 - 00:10s',
        action: 'अनामिका से बाईं नासिका बंद कर दाईं से सूर्य रेचन',
        visualFocus: 'Ring finger closing left nostril, golden solar breath releasing',
        calloutText: 'सूर्य स्वर निष्कासन',
      },
    ],
    cameraMotion: 'Close-up 4D Hand focal tracking with golden prana particle trails',
    elements: ['Agni (Thumb)', 'Prithvi (Ring Finger)'],
  },
  {
    id: 'padmasana_spine_kundalini',
    category: 'yoga_asana',
    title: 'पद्मासन: मेरुदंड संरेखण और चक्र जागृति',
    subtitle: 'Lotus Pose 3D Alignment & Kundalini Ascent',
    duration: 10,
    description: 'पद्मासन में स्थिर बैठकर रीढ़ की हड्डी में 7 चक्रों का ऊर्ध्वगामी प्रवाह।',
    previewUrl: '/images/animation-4k/chakras_kundalini_4k.jpg',
    steps: [
      {
        timeRange: '00:00 - 00:03s',
        action: 'पद्मासन पाद संरेखण और मूलबंध',
        visualFocus: '3D Yoga avatar locking feet on thighs with grounded green base',
        calloutText: 'स्थिरं सुखमासनम्',
      },
      {
        timeRange: '00:03 - 00:07s',
        action: 'मेरुदंड की सीधी रेखा और नाभि चक्र सक्रियण',
        visualFocus: 'Transparent anatomical spine glowing with 7 spinning chakra wheels',
        calloutText: 'ऋजुकाय: • सीधी रीढ़',
      },
      {
        timeRange: '00:07 - 00:10s',
        action: 'सहस्रार से दिव्य अमृत वर्षण',
        visualFocus: 'Golden light column erupting from crown into celestial aura',
        calloutText: 'ऊर्ध्वरेता साधना',
      },
    ],
    cameraMotion: 'Vertical crane-up shot from Muladhara ground to Sahasrara sky',
    elements: ['All 5 Elements Harmonized'],
  },
  {
    id: 'resort_ashram_flythrough',
    category: 'resort_architecture',
    title: 'स्वर योग रिसॉर्ट & आश्रम: प्राकृतिक विहार',
    subtitle: 'Swar Yoga Wellness Resort & Meditation Sanctuary',
    duration: 10,
    description: 'हरी-भरी पहाड़ियों के बीच स्थित स्वर योग साधना केंद्र और कॉटेज का सिनेमैटिक शॉट।',
    previewUrl: '/images/animation-4k/swar_ashram_cosmic_4k.jpg',
    steps: [
      {
        timeRange: '00:00 - 00:04s',
        action: 'पहाड़ी घाटी और रिसॉर्ट मुख्य द्वार का एरियल ड्रोन शॉट',
        visualFocus: 'Cinematic sweeping drone shot over lush tropical valley at morning sunrise',
        calloutText: 'स्वर योग साधना केंद्र',
      },
      {
        timeRange: '00:04 - 00:07s',
        action: 'ध्यान मंडप और प्राकृतिक जल कुंड',
        visualFocus: 'Slow glide through open-air wooden meditation gazebo overlooking lotus pond',
        calloutText: 'शांत ध्यान मंडप',
      },
      {
        timeRange: '00:07 - 00:10s',
        action: 'वेलनेस कॉटेज और सात्विक वातावरण',
        visualFocus: 'Warm welcoming cottages bathed in golden sunlight with serene lotus ripples',
        calloutText: 'सात्विक वातावरण',
      },
    ],
    cameraMotion: 'FPV Cinematic Drone gliding from mountain summit down into resort hall',
    elements: ['Pristine Nature', 'Spiritual Sanctuary'],
  },
  {
    id: 'pranayama_lungs_diaphragm',
    category: 'internal_anatomy',
    title: 'प्राणायाम: फेफड़े, डायाफ्राम व 4-चरणीय श्वास',
    subtitle: 'Pranayama Lungs, Diaphragm & Prana Breathing Cycle',
    duration: 10,
    description: 'पूरक, कुम्भक और रेचक के दौरान फेफड़ों का विस्तार, डायाफ्राम की गति और ऊर्जा संचरण।',
    previewUrl: '/images/animation-4k/pranayama_lungs_4k.jpg',
    steps: [
      {
        timeRange: '00:00 - 00:03s',
        action: 'पूरक (श्वास लेना): फेफड़ों का विस्तार और प्राण ग्रहण',
        visualFocus: 'Deep expansion of glowing cyan/gold lungs with oxygenated prana filling bronchial tree',
        calloutText: 'पूरक • प्राण प्रवेश',
      },
      {
        timeRange: '00:03 - 00:06s',
        action: 'कुम्भक (श्वास रोकना): डायाफ्राम स्थिरीकरण व शक्ति संचय',
        visualFocus: 'Suspended volumetric light inside chest cavity and central spine channel',
        calloutText: 'कुम्भक • ऊर्जा संचय',
      },
      {
        timeRange: '00:06 - 00:10s',
        action: 'रेचक (श्वास छोड़ना): कार्बन व तनाव का पूर्ण विसर्जन',
        visualFocus: 'Gentle deflation and calming radiance spreading across chest and heart',
        calloutText: 'रेचक • शांत विश्रांति',
      },
    ],
    cameraMotion: 'Macro 3D Thoracic Slow Push with bioluminescent lung pulsation',
    elements: ['Vayu (Air)', 'Prana Shakti'],
  },
  {
    id: 'jatharagni_digestive_fire',
    category: 'ayurveda_remedy',
    title: 'जठराग्नि प्रदीपन: आमाशय व पाचन तंत्र शुद्धि',
    subtitle: 'Jatharagni Stomach Digestive Fire & Cellular Metabolism',
    duration: 10,
    description: 'आमाशय में जठराग्नि का प्रज्वलन, पोषक तत्वों का अवशोषण और आंतों की सूक्ष्म सफाई।',
    previewUrl: '/images/animation-4k/jatharagni_clean_4k.jpg',
    steps: [
      {
        timeRange: '00:00 - 00:03s',
        action: 'आमाशय में जठराग्नि की ज्योति प्रज्वलित होना',
        visualFocus: 'Golden celestial fire radiating inside transparent stomach cavity',
        calloutText: 'जठराग्नि जाग्रति',
      },
      {
        timeRange: '00:03 - 00:06s',
        action: 'पित्त व पाचक रसों का संतुलित स्राव',
        visualFocus: 'Bio-electric cyan nutrient pathways circulating life force to internal organs',
        calloutText: 'पाचक रस संतुलन',
      },
      {
        timeRange: '00:06 - 00:10s',
        action: 'आंतों से टॉक्सिन्स का निष्कासन व ऊर्जा संचार',
        visualFocus: 'Cellular detox waves clearing waste with radiant vitality',
        calloutText: 'पूर्ण शुद्धि व स्फूर्ति',
      },
    ],
    cameraMotion: 'Internal 3D Organ Flythrough with volumetric digestive flame',
    elements: ['Agni (Fire)', 'Samana Vayu'],
  },
  {
    id: 'mohan_sir_hybrid_triphala',
    category: 'real_video_hybrid',
    title: 'मोहन सर का प्रत्यक्ष वीडियो + 3D साइंटिफिक ग्राफिक',
    subtitle: 'Mohan Sir Real Video Demo with Picture-in-Picture 3D Stomach Glow',
    duration: 10,
    description: 'मोहन सर का असली वीडियो त्रिफला पीते हुए, और साथ में 3D पेट की जठराग्नि सक्रियता।',
    previewUrl: 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&w=1200&q=80',
    realVideoUrl: 'https://swaryogacrm.b-cdn.net/zoom-videos/2026-10-13%20H1P12YTMTRy5J0baEAa-bQ--%20Hindi%20Oct-26%20Mor%20Swar%20Yoga%20L-1%20(speaker).mp4',
    steps: [
      {
        timeRange: '00:00 - 00:04s',
        action: 'मोहन सर का असली वीडियो व्याख्यान और त्रिफला गिलास',
        visualFocus: 'Real footage of Mohan Sir speaking warmly with Triphala glass',
        calloutText: 'मोहन सर: प्रत्यक्ष अनुभव',
      },
      {
        timeRange: '00:04 - 00:07s',
        action: '3D पिक्चर-इन-पिक्चर आमाशय (Stomach) ग्राफिक सक्रिय',
        visualFocus: '3D translucent stomach model showing herbal digestive absorption',
        calloutText: 'जठराग्नि व पित्त संतुलन',
      },
      {
        timeRange: '00:07 - 00:10s',
        action: 'मोहन सर की मुस्कान और समापन सूत्र',
        visualFocus: 'Mohan Sir smiling with hands folded in Namaste blessing',
        calloutText: 'आरोग्यं परमं भाग्यम्',
      },
    ],
    cameraMotion: 'Split-Screen PiP: 65% Real Mohan Sir Video + 35% 3D Scientific Organ Animation',
    elements: ['Authentic Guru Video', 'Scientific 3D Medical Graphic'],
  },
];

export async function POST(request: NextRequest) {
  try {
    const {
      prompt,
      category = 'ayurveda_remedy',
      duration = 10,
      language = 'hi',
      presetId,
      customRealVideoUrl,
    } = await request.json();

    // If preset requested, return matching preset hydrated with language
    if (presetId) {
      const found = ANIMATION_10S_PRESETS.find((p) => p.id === presetId);
      if (found) {
        return NextResponse.json({
          success: true,
          data: {
            ...found,
            language,
            realVideoUrl: customRealVideoUrl || found.realVideoUrl,
          },
        });
      }
    }

    // Dynamic AI Prompt to 10-Second Visual Script & Sequence
    const systemPrompt = `You are an elite Hollywood & Vedic Medical Animation Director.
The user wants to generate a 10-SECOND cinematic, visual demonstration video for a concept.
Category: "${category}".
Language: "${language}".

TASK:
Break down the user's prompt into an EXACT 10-SECOND, 3-STEP visual animation choreography.
- Step 1 (00:00 - 00:03s): Introduction & Preparation Action.
- Step 2 (00:03 - 00:06s): Core Transformation or Practice Action.
- Step 3 (00:06 - 00:10s): Culmination, Absorption & Closing Glow.

Respond ONLY in valid JSON format:
{
  "title": "Short title in ${language}",
  "subtitle": "English subtitle",
  "category": "${category}",
  "duration": 10,
  "description": "One sentence summary in ${language}",
  "steps": [
    {
      "timeRange": "00:00 - 00:03s",
      "action": "Clear description of action",
      "visualFocus": "Camera and visual focus description",
      "calloutText": "Bold on-screen text in ${language} (max 4-5 words)"
    },
    {
      "timeRange": "00:03 - 00:06s",
      "action": "...",
      "visualFocus": "...",
      "calloutText": "..."
    },
    {
      "timeRange": "00:06 - 00:10s",
      "action": "...",
      "visualFocus": "...",
      "calloutText": "..."
    }
  ],
  "cameraMotion": "Description of camera movement (e.g. 360 degree orbit, macro zoom, FPV glide)",
  "elements": ["Agni", "Jala", "Prana"]
}`;

    const aiRes = await generateAIText({
      systemPrompt,
      message: prompt || 'एक चम्मच त्रिफला पाउडर पानी में घोलकर सुबह पीना',
    });

    let cleanJson = aiRes.trim();
    if (cleanJson.startsWith('```json')) cleanJson = cleanJson.replace(/^```json/, '');
    if (cleanJson.startsWith('```')) cleanJson = cleanJson.replace(/^```/, '');
    if (cleanJson.endsWith('```')) cleanJson = cleanJson.replace(/```$/, '');

    let parsed: any;
    try {
      parsed = JSON.parse(cleanJson.trim());
    } catch {
      parsed = ANIMATION_10S_PRESETS[0];
    }

    return NextResponse.json({
      success: true,
      data: {
        id: `anim_${Date.now()}`,
        ...parsed,
        previewUrl: 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&w=1200&q=80',
        realVideoUrl: customRealVideoUrl || undefined,
        allPresets: ANIMATION_10S_PRESETS,
      },
    });
  } catch (error: any) {
    console.error('10s Animation generation error:', error);
    return NextResponse.json({ error: error.message || 'Animation generation failed' }, { status: 500 });
  }
}
