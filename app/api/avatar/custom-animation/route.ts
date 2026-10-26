import { NextRequest, NextResponse } from 'next/server';
import {
  saveCustomAnimationProject,
  listCustomAnimationProjects,
  getCustomAnimationProjectById,
  CustomAnimationProject,
  StoryboardChunk,
  SceneObject3D,
  MediaTrackItem,
  ApprovalChecklist,
} from '@/lib/bunnyCustomAnimationRepository';
import { generateAIText } from '@/lib/ai/generateWithFallback';

// Master Catalog of 3D Objects & Elements
export const ASSET_LIBRARY_CATALOG = {
  daily_objects: [
    { name: 'Crystal Glass (कांच का गिलास)', defaultScale: 1.0, color: '#e0f2fe' },
    { name: 'Pure Water (स्वच्छ जल)', defaultScale: 1.0, color: '#38bdf8' },
    { name: 'Wooden Spoon (लकड़ी का चम्मच)', defaultScale: 0.8, color: '#92400e' },
    { name: 'Water Jug (पानी का जग)', defaultScale: 1.3, color: '#67e8f9' },
    { name: 'Plate (थाली)', defaultScale: 1.2, color: '#cbd5e1' },
    { name: 'Bowl (कटोरी)', defaultScale: 0.9, color: '#e2e8f0' },
    { name: 'Wooden Table (मेज)', defaultScale: 2.0, color: '#78350f' },
    { name: 'Meditation Chair (आसन कुर्सी)', defaultScale: 1.8, color: '#451a03' },
    { name: 'Glass Bottle (कांच की बोतल)', defaultScale: 1.1, color: '#bae6fd' },
  ],
  human_body: [
    { name: 'Human Yogi Avatar (मानव शरीर)', defaultScale: 1.5, color: '#fed7aa' },
    { name: 'Dual Brain Hemispheres (मस्तिष्क)', defaultScale: 1.0, color: '#f59e0b' },
    { name: 'Lungs & Diaphragm (फेफड़े व डायाफ्राम)', defaultScale: 1.2, color: '#06b6d4' },
    { name: 'Heart (हृदय)', defaultScale: 0.9, color: '#ef4444' },
    { name: 'Stomach & Gut (आमाशय व आंतें)', defaultScale: 1.1, color: '#f97316' },
    { name: 'Spinal Bones (मेरुदंड कंकाल)', defaultScale: 1.4, color: '#f8fafc' },
    { name: 'Musculoskeletal Rig (मांसपेशियां)', defaultScale: 1.4, color: '#f43f5e' },
  ],
  yoga_elements: [
    { name: 'Padmasana Alignment (पद्मासन)', defaultScale: 1.5, color: '#a855f7' },
    { name: 'Bhujangasana Cobra (भुजंगासन)', defaultScale: 1.5, color: '#eab308' },
    { name: '7 Chakras Column (सप्त चक्र)', defaultScale: 1.3, color: '#ec4899' },
    { name: 'Ida & Pingala Nadis (इड़ा-पिंगला)', defaultScale: 1.2, color: '#3b82f6' },
    { name: 'Sushumna Laser Spine (सुषुम्ना)', defaultScale: 1.4, color: '#8b5cf6' },
    { name: 'Nasikagra Hand Mudra (नासिकाग्र मुद्रा)', defaultScale: 0.9, color: '#f59e0b' },
    { name: 'Kundalini Spiral (कुंडलिनी शक्ति)', defaultScale: 1.2, color: '#fbbf24' },
  ],
  nature_food: [
    { name: 'Sacred Jatharagni Fire (जठराग्नि)', defaultScale: 1.0, color: '#f97316' },
    { name: 'Triphala Powder (त्रिफला चूर्ण)', defaultScale: 0.8, color: '#d97706' },
    { name: 'Ayurvedic Herbs (औषधीय जड़ी-बूटी)', defaultScale: 0.9, color: '#22c55e' },
    { name: 'Bioluminescent Lotus (कमल पुष्प)', defaultScale: 1.0, color: '#f472b6' },
    { name: 'Fresh Fruits (सात्विक फल)', defaultScale: 0.9, color: '#eab308' },
    { name: 'Healing Water Vortex (जल भंवर)', defaultScale: 1.1, color: '#0ea5e9' },
  ],
};

// Generates dynamic 5-second segments complying with the 8 script questions
function generateComprehensiveChoreography(
  topic: string,
  durationSeconds: number,
  needfulThings: string[]
): StoryboardChunk[] {
  const numChunks = Math.max(1, Math.ceil(durationSeconds / 5));
  const chunks: StoryboardChunk[] = [];

  const isWaterDrinking =
    topic.includes('जल') || topic.includes('पानी') || topic.includes('water') || topic.includes('drink') || topic.includes('गिलास');
  const isBreathing =
    topic.includes('श्वास') || topic.includes('प्राणायाम') || topic.includes('breath') || topic.includes('lungs') || topic.includes('फेफड़े');
  const isChakra =
    topic.includes('चक्र') || topic.includes('chakra') || topic.includes('kundalini') || topic.includes('पद्मासन');

  for (let i = 0; i < numChunks; i++) {
    const startSec = i === 0 ? 0 : i * 5 + 1;
    const endSec = Math.min(durationSeconds, (i + 1) * 5);
    const startStr = `00:${startSec.toString().padStart(2, '0')}s`;
    const endStr = `00:${endSec.toString().padStart(2, '0')}s`;

    let actionText = '';
    let movementStartToEnd = '';
    let cameraDirection = 'Eye-level slow cinematic push in (1.0x to 1.06x)';
    let lightingEnvironment = 'Deep cosmic dark space with radiant volumetric starlight';
    let endStateDescription = '';
    let visualPrompt = '';
    const chunkObjects: SceneObject3D[] = [];

    if (isWaterDrinking) {
      if (i === 0) {
        actionText = 'एक टेबल दिखाई देगी, उस पर खाली स्वच्छ कांच का गिलास रखा होगा।';
        movementStartToEnd = 'कैमरा सामने से धीरे-धीरे आगे बढ़ता है। खाली गिलास स्थिर केंद्र में है। 0s पर टेबल की लकड़ी की सतह और कांच की शुद्धता दिखती है, 5s पर जग का छायांकन आरंभ होता है।';
        cameraDirection = 'Front eye-level slow tracking in 10%';
        lightingEnvironment = 'Warm Vedic dawn sunlight with sparkling reflections on crystal glass';
        endStateDescription = 'कांच का गिलास टेबल पर स्थिर, पूर्ण तैयार अवस्था में।';
        visualPrompt = 'Cinematic 4K empty crystal glass sitting on rustic teakwood table, radiant morning sunbeams, Octane Render 3D.';
        chunkObjects.push({
          id: `obj_${i}_1`,
          name: 'Wooden Table (मेज)',
          category: 'daily_objects',
          posX: 0, posY: -1, posZ: 0, rotX: 0, rotY: 0, rotZ: 0, scale: 2.0,
          speed: 'normal', direction: 'forward', path: 'straight', entry: 'appear', exit: 'fade',
          startSec, endSec,
        });
        chunkObjects.push({
          id: `obj_${i}_2`,
          name: 'Crystal Glass (कांच का गिलास)',
          category: 'daily_objects',
          posX: 0, posY: 0, posZ: 0, rotX: 0, rotY: 0, rotZ: 0, scale: 1.0,
          speed: 'normal', direction: 'forward', path: 'straight', entry: 'appear', exit: 'fade',
          startSec, endSec,
        });
      } else if (i === 1) {
        actionText = 'पानी का जग स्क्रीन में आएगा और गिलास में अमृत समान शुद्ध जल भरेगा।';
        movementStartToEnd = 'पानी का जग दाईं ओर से 30° झुकाव के साथ अंदर आता है। पानी की धारा गिलास में गिरती है, सूक्ष्म बुलबुले बनते हैं। 6s पर जल प्रवाह आरंभ ➔ 10s पर गिलास 80% जल से भरा, जग वापस बाहर जाता है।';
        cameraDirection = 'Slight high-angle 45° macro zoom on the glass opening';
        lightingEnvironment = 'Morning sunlight refracting through cascading crystal water stream';
        endStateDescription = 'कांच का गिलास शुद्ध जल से भरा हुआ, सतह पर शांत रिपल्स।';
        visualPrompt = 'Cinematic 4K macro shot of water jug pouring sparkling mineral water into crystal glass, glowing sunlit caustics.';
        chunkObjects.push({
          id: `obj_${i}_1`,
          name: 'Water Jug (पानी का जग)',
          category: 'daily_objects',
          posX: 1.5, posY: 1.2, posZ: 0, rotX: 0, rotY: 0, rotZ: -30, scale: 1.2,
          speed: 'normal', direction: 'left', path: 'curved', entry: 'move', exit: 'move',
          startSec, endSec,
        });
        chunkObjects.push({
          id: `obj_${i}_2`,
          name: 'Pure Water (स्वच्छ जल)',
          category: 'daily_objects',
          posX: 0, posY: 0, posZ: 0, rotX: 0, rotY: 0, rotZ: 0, scale: 1.0,
          speed: 'normal', direction: 'down', path: 'straight', entry: 'fade', exit: 'fade',
          startSec, endSec,
        });
      } else if (i === 2) {
        actionText = 'एक हाथ गिलास की तरफ बढ़ेगा और उसे कोमलता से पकड़ेगा।';
        movementStartToEnd = 'मानव हाथ बाईं ओर से आगे बढ़ता है, उंगलियां गिलास के चारों ओर संतुलित पकड़ बनाती हैं। 11s पर हाथ का प्रवेश ➔ 15s पर अंगूठा और उंगलियां गिलास को सुरक्षित उठाना आरंभ करती हैं।';
        cameraDirection = 'Side angle close-up focusing on yogic hand grip and fingertips';
        lightingEnvironment = 'Soft natural daylight emphasizing peaceful mindfulness';
        endStateDescription = 'हाथ ने गिलास को पूर्ण रूप से पकड़ लिया है, उठने के लिए तैयार।';
        visualPrompt = 'Cinematic 4K side angle of a yogic hand gently gripping crystal glass filled with water, serene focus.';
        chunkObjects.push({
          id: `obj_${i}_1`,
          name: 'Human Yogi Avatar (मानव हाथ)',
          category: 'human_body',
          posX: -1.0, posY: 0.1, posZ: 0, rotX: 0, rotY: 45, rotZ: 0, scale: 1.0,
          speed: 'slow', direction: 'right', path: 'straight', entry: 'move', exit: 'fade',
          startSec, endSec,
        });
      } else if (i === 3) {
        actionText = 'हाथ गिलास को धीरे-धीरे ऊपर उठाकर मुंह तक लेकर जाएगा।';
        movementStartToEnd = 'गिलास टेबल से ऊपर उठता है (Y-अक्ष गति), हाथ धीरे-धीरे ऊपर उठता है। 16s पर टेबल छूटती है ➔ 20s पर गिलास मुंह के निकट पहुंचता है, व्यक्ति का शांत मुखमंडल दिखाई देता है।';
        cameraDirection = 'Vertical crane tilt up from table to face profile';
        lightingEnvironment = 'Warm contemplative glow on face and water surface';
        endStateDescription = 'गिलास होठों के समीप 45° झुकाव की मुद्रा में स्थित।';
        visualPrompt = 'Cinematic 4K medium profile shot of hand raising water glass toward serene peaceful mouth, soft dawn rim light.';
      } else if (i === 4) {
        actionText = 'व्यक्ति घूंट-घूंट कर जल पीता हुआ दिखाई देगा, आंतरिक ऊर्जा सक्रिय होगी।';
        movementStartToEnd = 'गिलास थोड़ा और झुकता है, जल की बूंदें अंदर प्रवेश करती हैं। व्यक्ति के गले में निगलने की कोमल गति होती है। 21s पर प्रथम घूंट ➔ 25s पर जल स्तर आधा घटता है, आंतरिक आमाशय में तृप्ति का प्रकाश।';
        cameraDirection = 'Intimate profile close-up with subtle internal bioluminescent glow';
        lightingEnvironment = 'Ethereal pranic glow spreading through throat and chest';
        endStateDescription = 'जल का संतोषजनक सेवन संपन्न, मुख पर शांति व कृतज्ञता।';
        visualPrompt = 'Cinematic 4K mindful water drinking, refreshing vitality and gentle golden light aura illuminating the throat and chest.';
      } else {
        actionText = 'गिलास वापस टेबल पर रखा जाएगा और कैमरा धीरे-धीरे पीछे जाएगा (समापन)।';
        movementStartToEnd = 'हाथ गिलास को नीचे टेबल पर वापस लाता है। टेबल पर कोमलता से रखने का स्पर्श। 26s पर गिलास टेबल पर स्थिर ➔ हाथ वापस पीछे हटता है ➔ 30s पर कैमरा वाइड शॉट में पीछे जाता है।';
        cameraDirection = 'Slow pull back wide reveal shot';
        lightingEnvironment = 'Bright expansive morning sunshine filling the serene room';
        endStateDescription = 'टेबल पर रखा आधा गिलास, पृष्ठभूमि में शांत ध्यानमय वातावरण।';
        visualPrompt = 'Cinematic 4K wide pull back shot of peaceful morning tea table with water glass, expansive tranquil atmosphere, masterpiece.';
      }
    } else if (isBreathing) {
      if (i === 0) {
        actionText = 'सीधी रीढ़, पद्मासन मुद्रा व शांत वक्षस्थल का दृश्य।';
        movementStartToEnd = 'कैमरा नाभि से ऊपर वक्षस्थल तक पैन-अप करता है। 0s पर शरीर स्थिर ➔ 5s पर फेफड़े विश्राम अवस्था में पारदर्शी रूप से दिखते हैं।';
        cameraDirection = 'Frontal slow tilt-up from solar plexus to chest';
        lightingEnvironment = 'Deep cosmic starlight with gentle blue lunar aura';
        endStateDescription = 'पूर्ण शांत श्वसन तंत्र, पूरक के लिए तैयार।';
        visualPrompt = 'Cinematic 4K transparent anatomical human torso in deep space with resting lungs, Octane Render 3D.';
      } else if (i === 1) {
        actionText = 'पूरक (गहरा श्वास लेना): फेफड़ों का विस्तार व डायाफ्राम का नीचे जाना।';
        movementStartToEnd = 'सुनहरी प्राण वायु नासिका से प्रवेश करती है, फेफड़े 25% फूलते हैं, डायाफ्राम नीचे दबता है। 6s पर श्वास आरंभ ➔ 10s पर वक्ष पूर्ण रूप से विस्तारित।';
        cameraDirection = 'Macro 3D internal push into thoracic cavity';
        lightingEnvironment = 'Radiant golden solar energy filling the cyan bronchial tree';
        endStateDescription = 'फेफड़े प्राण से परिपूर्ण, डायाफ्राम अधिकतम तान में।';
        visualPrompt = 'Cinematic 4K glowing lungs expanding with golden solar prana in cosmic nebula, volumetric light.';
      } else {
        actionText = `प्राणायाम चरण ${i + 1}: कुम्भक व रेचक द्वारा प्राण संतुलन।`;
        movementStartToEnd = 'श्वास की गतिशीलता, डायाफ्राम का संतुलित स्पंदन, केंद्रीय सुषुम्ना में बैंगनी प्रकाश तरंग।';
        cameraDirection = 'Slow 360 orbit around spinal column';
        lightingEnvironment = 'Violet laser spinal light with concentric energy rings';
        endStateDescription = 'पूर्ण आंतरिक सामंजस्य एवं शांति।';
        visualPrompt = 'Cinematic 4K spinal cord energy column pulsating with violet light in starry cosmos.';
      }
    } else {
      // General Animation Template
      actionText = `चरण ${i + 1}: ${topic} (${startStr} - ${endStr})`;
      movementStartToEnd = `कैमरा स्टार्टिंग पोज़िशन से ➔ आवश्यक वस्तुएं सक्रिय गति में ➔ एंड पोज़िशन पर संतुलित संरेखण।`;
      cameraDirection = 'Smooth cinematic tracking shot';
      lightingEnvironment = 'High-end studio volumetric lighting';
      endStateDescription = `चरण ${i + 1} का दृश्य संपन्न एवं अगले चरण के लिए तैयार।`;
      visualPrompt = `Cinematic 4K hyper-realistic 3D rendering of ${topic}, Octane Render, Unreal Engine 5.`;
    }

    chunks.push({
      chunkIndex: i + 1,
      timeRange: `${startStr} - ${endStr}`,
      startSecond: startSec,
      endSecond: endSec,
      actionText,
      movementStartToEnd,
      cameraDirection,
      lightingEnvironment,
      endStateDescription,
      objects: chunkObjects,
      needfulThings: [...needfulThings],
      visualPrompt,
      assetType: 'ai_4k',
      status: 'draft',
    });
  }

  return chunks;
}

// Dynamically generate 3D storyboard using Gemini / OpenAI with curated fallback
async function generateDynamicAIChoreography(
  topic: string,
  durationSeconds: number,
  needfulThings: string[]
): Promise<StoryboardChunk[]> {
  const numChunks = Math.max(1, Math.ceil(durationSeconds / 5));
  try {
    const systemPrompt = `You are an expert 3D Animation Choreographer and Director for Vedic science, anatomy, and yoga educational 3D animations.
The user wants a dynamic 3D storyboard for the topic: "${topic}".
Total duration: ${durationSeconds} seconds, split into ${numChunks} consecutive 5-second scenes.
Required props/objects: ${needfulThings.join(', ')}.

For each of the ${numChunks} scenes, you MUST answer the 8 mandatory directorial questions:
1. Visual Action (What happens on screen in Hindi/English)
2. Exact Start and End Time (e.g. 0-5s, 6-10s)
3. Objects required (positions X/Y/Z, rotation, scale, entry/exit)
4. Exact movement from start to end of scene
5. Camera movements (angles, zoom, tracking)
6. Lighting and background environment
7. End state description (how the scene settles)
8. Visual prompt for 4K rendering

Return ONLY a JSON array with ${numChunks} objects conforming to this schema:
[
  {
    "chunkIndex": 1,
    "timeRange": "00:00s - 00:05s",
    "startSecond": 0,
    "endSecond": 5,
    "actionText": "Description of scene action",
    "movementStartToEnd": "Detailed trajectory from start to end",
    "cameraDirection": "Camera movement instructions",
    "lightingEnvironment": "Lighting atmosphere",
    "endStateDescription": "State at scene finish",
    "visualPrompt": "Cinematic 4K prompt",
    "objects": [
      {
        "id": "obj_0_1",
        "name": "Object Name",
        "category": "daily_objects",
        "posX": 0,
        "posY": 0,
        "posZ": 0,
        "rotX": 0,
        "rotY": 0,
        "rotZ": 0,
        "scale": 1.0,
        "speed": "normal",
        "direction": "forward",
        "path": "straight",
        "entry": "fade",
        "exit": "fade",
        "startSec": 0,
        "endSec": 5
      }
    ]
  }
]`;

    const aiRes = await generateAIText({
      systemPrompt,
      message: `Generate complete 3D storyboard and choreography for topic: "${topic}" across ${durationSeconds} seconds (${numChunks} scenes). Props: ${needfulThings.join(', ')}. Return strictly valid JSON array.`,
      temperature: 0.3,
      maxOutputTokens: 3500,
    });

    const jsonMatch = aiRes.match(/\[\s*\{[\s\S]*\}\s*\]/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((item, idx) => ({
          chunkIndex: idx + 1,
          timeRange: item.timeRange || `00:${(idx * 5).toString().padStart(2, '0')}s - 00:${Math.min(durationSeconds, (idx + 1) * 5).toString().padStart(2, '0')}s`,
          startSecond: item.startSecond ?? (idx === 0 ? 0 : idx * 5 + 1),
          endSecond: item.endSecond ?? Math.min(durationSeconds, (idx + 1) * 5),
          actionText: item.actionText || `Scene ${idx + 1}`,
          movementStartToEnd: item.movementStartToEnd || '',
          cameraDirection: item.cameraDirection || 'Cinematic tracking shot',
          lightingEnvironment: item.lightingEnvironment || 'Studio volumetric lighting',
          endStateDescription: item.endStateDescription || '',
          objects: Array.isArray(item.objects) ? item.objects : [],
          needfulThings: [...needfulThings],
          visualPrompt: item.visualPrompt || `Cinematic 4K render of ${topic}`,
          assetType: 'ai_4k',
          status: 'draft',
        }));
      }
    }
  } catch (err: any) {
    console.warn('[DynamicAIChoreography] LLM generation error, falling back to curated choreography:', err.message);
  }

  // Graceful fallback to deterministic curated choreography
  return generateComprehensiveChoreography(topic, durationSeconds, needfulThings);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      topic = 'पानी पीने की क्रिया (Water Drinking Animation)',
      durationSeconds = 30,
      needfulThings = ['कांच का गिलास (Glass)', 'स्वच्छ जल (Water)', 'पानी का जग (Jug)', 'लकड़ी की मेज (Table)'],
    } = body;

    const parsedDuration = Math.min(30, Math.max(1, Number(durationSeconds) || 30));
    const title = `${topic.slice(0, 45)} (${parsedDuration}s Master Storyboard)`;

    // Step 1: AI dynamically generates full 8-question script & 5s segment breakdown
    const chunks = await generateDynamicAIChoreography(topic, parsedDuration, needfulThings);

    // Initial multi-track setup
    const mediaTracks: MediaTrackItem[] = [
      {
        id: 'track_3d_main',
        type: '3d_animation',
        title: 'Primary 3D & 4K Animation Layer',
        url: '',
        startSec: 0,
        endSec: parsedDuration,
        layerIndex: 1,
      },
    ];

    // Initial Approval Checklist (All Pending Admin Review)
    const approvalChecklist: ApprovalChecklist = {
      script: 'pending',
      objects: 'pending',
      motion: 'pending',
      timeline: 'pending',
      camera: 'pending',
      audio: 'pending',
      adminNotes: 'AI draft generated. Awaiting Admin review and formal approval.',
    };

    // Save as draft project ready for Admin Approval
    const project = await saveCustomAnimationProject({
      title,
      topic,
      durationSeconds: parsedDuration,
      needfulThings,
      chunks,
      mediaTracks,
      approvalChecklist,
      approvalStatus: 'ready_for_approval',
    });

    return NextResponse.json({
      success: true,
      message: 'AI Animation Script generated and awaiting Admin approval!',
      data: project,
    });
  } catch (error: any) {
    console.error('Custom animation create error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create animation project' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (id) {
      const project = await getCustomAnimationProjectById(id);
      if (!project) {
        return NextResponse.json({ success: false, error: 'Project not found' }, { status: 404 });
      }
      return NextResponse.json({ success: true, data: project });
    }

    const projects = await listCustomAnimationProjects();
    return NextResponse.json({
      success: true,
      catalog: ASSET_LIBRARY_CATALOG,
      data: projects,
    });
  } catch (error: any) {
    console.error('Custom animation fetch error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch animation projects' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      id,
      title,
      topic,
      durationSeconds,
      needfulThings,
      chunks,
      mediaTracks,
      approvalChecklist,
      approvalStatus,
      adminAction, // 'approve' | 'reject' | 'edit' | 'regenerate'
    } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Project ID is required' }, { status: 400 });
    }

    let finalStatus = approvalStatus || 'ready_for_approval';
    let adminApprovedAt = undefined;

    if (adminAction === 'approve') {
      finalStatus = 'approved';
      adminApprovedAt = new Date().toISOString();
    } else if (adminAction === 'reject') {
      finalStatus = 'rejected';
    } else if (adminAction === 'regenerate') {
      finalStatus = 'ready_for_approval';
    }

    const updated = await saveCustomAnimationProject({
      id,
      title: title || 'Custom Animation Project',
      topic: topic || '',
      durationSeconds: Number(durationSeconds) || 30,
      needfulThings: needfulThings || [],
      chunks: chunks || [],
      mediaTracks: mediaTracks || [],
      approvalChecklist: approvalChecklist || {
        script: 'pending',
        objects: 'pending',
        motion: 'pending',
        timeline: 'pending',
        camera: 'pending',
        audio: 'pending',
      },
      approvalStatus: finalStatus,
      adminApprovedAt,
    });

    return NextResponse.json({
      success: true,
      message:
        finalStatus === 'approved'
          ? '🎉 Animation project approved! Rendering engine initialized.'
          : finalStatus === 'rejected'
          ? 'Animation proposal rejected. Returned to editing.'
          : 'Project updated successfully.',
      data: updated,
    });
  } catch (error: any) {
    console.error('Custom animation update error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update animation project' },
      { status: 500 }
    );
  }
}
