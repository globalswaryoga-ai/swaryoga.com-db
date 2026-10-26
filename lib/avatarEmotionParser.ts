/**
 * Avatar Emotion & Command Parser Engine
 * Handles [smile:80], [pause:1.5s], punctuation prosody, and 80 emotion categories.
 */

export interface ParsedEmotionTag {
  tag: string;
  name: string;
  intensity: number;
  duration?: number;
  category?: string;
}

export interface EmotionSentenceSegment {
  index: number;
  rawText: string;
  cleanText: string;
  speechText: string;
  emotions: ParsedEmotionTag[];
  primaryEmotion: string;
  intensity: number;
  pauseAfterSeconds: number;
  voiceStyle: string;
  gesture?: string;
  facialBlendshapes?: Record<string, number>;
}

export interface ParsedScriptResult {
  fullCleanText: string;
  fullSpeechText: string;
  segments: EmotionSentenceSegment[];
  totalEstimatedSeconds: number;
  detectedEmotions: string[];
}

export const EMOTION_LIBRARY: Record<
  string,
  {
    nameHi: string;
    nameEn: string;
    category: 'smile' | 'serious' | 'curious' | 'emotional' | 'anger' | 'presentation';
    blendshapes: Record<string, number>;
    defaultVoiceStyle: string;
    defaultGesture?: string;
  }
> = {
  // A. Smile & Happiness
  smile: {
    nameHi: 'हल्की मुस्कान',
    nameEn: 'Gentle Smile',
    category: 'smile',
    blendshapes: { mouthSmileLeft: 0.5, mouthSmileRight: 0.5, cheekSquint: 0.3 },
    defaultVoiceStyle: 'warm',
    defaultGesture: 'natural_hand_gesture',
  },
  big_smile: {
    nameHi: 'बड़ी मुस्कान',
    nameEn: 'Big Smile',
    category: 'smile',
    blendshapes: { mouthSmileLeft: 0.85, mouthSmileRight: 0.85, cheekSquint: 0.6, browInnerUp: 0.3 },
    defaultVoiceStyle: 'warm',
    defaultGesture: 'open_palms',
  },
  laugh: {
    nameHi: 'हँसना',
    nameEn: 'Laughing',
    category: 'smile',
    blendshapes: { mouthSmileLeft: 0.9, mouthSmileRight: 0.9, jawOpen: 0.5, eyeSquintLeft: 0.7 },
    defaultVoiceStyle: 'humorous',
    defaultGesture: 'both_hands_gesture',
  },
  laugh_loud: {
    nameHi: 'जोर से हँसना',
    nameEn: 'Loud Laugh',
    category: 'smile',
    blendshapes: { mouthSmileLeft: 1.0, mouthSmileRight: 1.0, jawOpen: 0.7, eyeSquintLeft: 0.9 },
    defaultVoiceStyle: 'humorous',
    defaultGesture: 'both_hands_gesture',
  },
  happy: {
    nameHi: 'प्रसन्न',
    nameEn: 'Happy',
    category: 'smile',
    blendshapes: { mouthSmileLeft: 0.6, mouthSmileRight: 0.6, cheekSquint: 0.4 },
    defaultVoiceStyle: 'conversational',
  },
  joyful: {
    nameHi: 'आनंदित',
    nameEn: 'Joyful',
    category: 'smile',
    blendshapes: { mouthSmileLeft: 0.8, mouthSmileRight: 0.8, eyeWideLeft: 0.2 },
    defaultVoiceStyle: 'inspirational',
    defaultGesture: 'open_palms',
  },
  playful: {
    nameHi: 'चंचल',
    nameEn: 'Playful',
    category: 'smile',
    blendshapes: { mouthSmileLeft: 0.6, headTilt: 0.4 },
    defaultVoiceStyle: 'humorous',
  },
  friendly: {
    nameHi: 'मित्रवत',
    nameEn: 'Friendly',
    category: 'smile',
    blendshapes: { mouthSmileLeft: 0.55, eyeContact: 1.0 },
    defaultVoiceStyle: 'warm',
    defaultGesture: 'natural_hand_gesture',
  },
  welcoming: {
    nameHi: 'स्वागतपूर्ण',
    nameEn: 'Welcoming',
    category: 'smile',
    blendshapes: { mouthSmileLeft: 0.65, mouthSmileRight: 0.65 },
    defaultVoiceStyle: 'warm',
    defaultGesture: 'open_palms',
  },
  excited: {
    nameHi: 'उत्साहित',
    nameEn: 'Excited',
    category: 'smile',
    blendshapes: { mouthSmileLeft: 0.7, eyeWideLeft: 0.5, eyeWideRight: 0.5 },
    defaultVoiceStyle: 'energetic',
    defaultGesture: 'both_hands_gesture',
  },

  // B. Serious & Professional
  serious: {
    nameHi: 'गंभीर',
    nameEn: 'Serious',
    category: 'serious',
    blendshapes: { browDownLeft: 0.5, browDownRight: 0.5, mouthPress: 0.3 },
    defaultVoiceStyle: 'teaching',
    defaultGesture: 'pointing_finger',
  },
  very_serious: {
    nameHi: 'अत्यंत गंभीर',
    nameEn: 'Very Serious',
    category: 'serious',
    blendshapes: { browDownLeft: 0.8, browDownRight: 0.8, mouthPress: 0.6 },
    defaultVoiceStyle: 'warning',
    defaultGesture: 'hand_raise',
  },
  professional: {
    nameHi: 'व्यावसायिक',
    nameEn: 'Professional',
    category: 'serious',
    blendshapes: { eyeContact: 1.0, browInnerUp: 0.2 },
    defaultVoiceStyle: 'teaching',
    defaultGesture: 'natural_hand_gesture',
  },
  confident: {
    nameHi: 'आत्मविश्वासी',
    nameEn: 'Confident',
    category: 'serious',
    blendshapes: { headTilt: 0.2, mouthSmileLeft: 0.3 },
    defaultVoiceStyle: 'motivational',
    defaultGesture: 'hand_on_heart',
  },
  focused: {
    nameHi: 'एकाग्र',
    nameEn: 'Focused',
    category: 'serious',
    blendshapes: { eyeSquintLeft: 0.3, eyeSquintRight: 0.3 },
    defaultVoiceStyle: 'teaching',
  },
  thoughtful: {
    nameHi: 'विचारशील',
    nameEn: 'Thoughtful',
    category: 'serious',
    blendshapes: { gazeUp: 0.4, browInnerUp: 0.4 },
    defaultVoiceStyle: 'storytelling',
  },
  warning: {
    nameHi: 'चेतावनी देना',
    nameEn: 'Warning',
    category: 'serious',
    blendshapes: { browDownLeft: 0.7, eyeWideLeft: 0.4 },
    defaultVoiceStyle: 'warning',
    defaultGesture: 'stop_gesture',
  },

  // C. Curious & Questioning
  curious: {
    nameHi: 'जिज्ञासु',
    nameEn: 'Curious',
    category: 'curious',
    blendshapes: { browInnerUp: 0.7, headTilt: 0.5, eyeWideLeft: 0.4 },
    defaultVoiceStyle: 'questioning',
    defaultGesture: 'open_palms',
  },
  question: {
    nameHi: 'प्रश्न पूछना',
    nameEn: 'Questioning',
    category: 'curious',
    blendshapes: { browOuterUpLeft: 0.7, headTilt: 0.4 },
    defaultVoiceStyle: 'questioning',
    defaultGesture: 'open_palms',
  },
  surprised: {
    nameHi: 'आश्चर्यचकित',
    nameEn: 'Surprised',
    category: 'curious',
    blendshapes: { eyeWideLeft: 0.8, eyeWideRight: 0.8, jawOpen: 0.4 },
    defaultVoiceStyle: 'energetic',
    defaultGesture: 'both_hands_gesture',
  },
  thinking: {
    nameHi: 'सोचने वाला भाव',
    nameEn: 'Thinking',
    category: 'curious',
    blendshapes: { gazeUp: 0.5, browDownLeft: 0.3 },
    defaultVoiceStyle: 'storytelling',
  },

  // D. Special Presentation & Spiritual
  spiritual: {
    nameHi: 'आध्यात्मिक',
    nameEn: 'Spiritual',
    category: 'presentation',
    blendshapes: { mouthSmileLeft: 0.4, eyesRelaxed: 0.5 },
    defaultVoiceStyle: 'spiritual',
    defaultGesture: 'hands_joined',
  },
  peaceful: {
    nameHi: 'शांत',
    nameEn: 'Peaceful',
    category: 'presentation',
    blendshapes: { eyesRelaxed: 0.6, mouthSmileLeft: 0.3 },
    defaultVoiceStyle: 'calm',
  },
  meditative: {
    nameHi: 'ध्यानमय',
    nameEn: 'Meditative',
    category: 'presentation',
    blendshapes: { eyesRelaxed: 0.8, mouthSmileLeft: 0.2 },
    defaultVoiceStyle: 'very_slow',
    defaultGesture: 'hands_joined',
  },
  inspirational: {
    nameHi: 'प्रेरणादायक',
    nameEn: 'Inspirational',
    category: 'presentation',
    blendshapes: { mouthSmileLeft: 0.6, eyeWideLeft: 0.3 },
    defaultVoiceStyle: 'motivational',
    defaultGesture: 'open_palms',
  },
  teaching: {
    nameHi: 'समझाकर सिखाना',
    nameEn: 'Teaching',
    category: 'presentation',
    blendshapes: { eyeContact: 1.0, mouthSmileLeft: 0.3 },
    defaultVoiceStyle: 'teaching',
    defaultGesture: 'counting_gesture',
  },
  namaste: {
    nameHi: 'नमस्ते',
    nameEn: 'Namaste',
    category: 'presentation',
    blendshapes: { mouthSmileLeft: 0.5, headNod: 0.3 },
    defaultVoiceStyle: 'warm',
    defaultGesture: 'namaste',
  },
  blessing: {
    nameHi: 'आशीर्वाद देना',
    nameEn: 'Blessing',
    category: 'presentation',
    blendshapes: { mouthSmileLeft: 0.4, eyesRelaxed: 0.4 },
    defaultVoiceStyle: 'warm',
    defaultGesture: 'open_palms',
  },
};

/**
 * Parses script containing [tags] and punctuation into structured emotion events
 */
export function parseAvatarScript(scriptText: string): ParsedScriptResult {
  if (!scriptText || !scriptText.trim()) {
    return {
      fullCleanText: '',
      fullSpeechText: '',
      segments: [],
      totalEstimatedSeconds: 0,
      detectedEmotions: [],
    };
  }

  // Regex to split into sentence-like chunks on '.', '!', '?', '।', '॥', '\n'
  const sentencePattern = /([^.!?।॥\n]+[.!?।॥\n]+|[^.!?।॥\n]+$)/g;
  const rawChunks = scriptText.match(sentencePattern) || [scriptText];

  const segments: EmotionSentenceSegment[] = [];
  const detectedEmotionsSet = new Set<string>();
  let totalEstimatedSeconds = 0;

  let segmentIdx = 0;
  for (const chunk of rawChunks) {
    const trimmedChunk = chunk.trim();
    if (!trimmedChunk) continue;

    // Extract all [tag] commands
    const tagRegex = /\[([a-zA-Z0-9_]+)(?::([0-9.]+[a-z%]?))?\]/g;
    const emotions: ParsedEmotionTag[] = [];
    let match: RegExpExecArray | null;

    let pauseAfterSeconds = 0.5; // default pause

    // Check sentence ending punctuation
    if (trimmedChunk.includes('?')) {
      pauseAfterSeconds = 0.8;
      emotions.push({ tag: 'question', name: 'curious', intensity: 75 });
    } else if (trimmedChunk.includes('!!') || trimmedChunk.includes('!')) {
      pauseAfterSeconds = 0.6;
      emotions.push({ tag: 'excited', name: 'excited', intensity: 80 });
    } else if (trimmedChunk.includes('॥')) {
      pauseAfterSeconds = 1.5;
      emotions.push({ tag: 'spiritual', name: 'spiritual', intensity: 70 });
    } else if (trimmedChunk.includes('...')) {
      pauseAfterSeconds = 1.2;
      emotions.push({ tag: 'thinking', name: 'thoughtful', intensity: 65 });
    }

    while ((match = tagRegex.exec(trimmedChunk)) !== null) {
      const rawTag = match[1].toLowerCase();
      const rawVal = match[2];

      if (rawTag === 'pause') {
        const parsedSec = rawVal ? parseFloat(rawVal.replace('s', '')) : 1.0;
        pauseAfterSeconds = isNaN(parsedSec) ? 1.0 : parsedSec;
        continue;
      }

      let intensity = 75;
      if (rawVal) {
        const parsedNum = parseFloat(rawVal.replace('%', ''));
        if (!isNaN(parsedNum)) intensity = Math.min(100, Math.max(0, parsedNum));
      }

      emotions.push({
        tag: rawTag,
        name: rawTag,
        intensity,
        category: EMOTION_LIBRARY[rawTag]?.category || 'smile',
      });
      detectedEmotionsSet.add(rawTag);
    }

    // Clean text: strip out [bracket commands]
    const cleanText = trimmedChunk.replace(/\[[a-zA-Z0-9_]+(?::[0-9.]+[a-z%]?)?\]/g, '').replace(/\s+/g, ' ').trim();

    if (!cleanText) continue;

    // Pick primary emotion
    const primaryTag = emotions[0]?.tag || 'friendly';
    const emotionConfig = EMOTION_LIBRARY[primaryTag] || EMOTION_LIBRARY['friendly'];

    // Estimate speaking duration: avg 3.0 words per second + pause
    const wordCount = cleanText.split(/\s+/).length;
    const speechSeconds = Math.max(1.0, wordCount / 3.0);
    const segmentTotal = speechSeconds + pauseAfterSeconds;
    totalEstimatedSeconds += segmentTotal;

    segments.push({
      index: segmentIdx++,
      rawText: trimmedChunk,
      cleanText,
      speechText: cleanText,
      emotions,
      primaryEmotion: primaryTag,
      intensity: emotions[0]?.intensity || 75,
      pauseAfterSeconds,
      voiceStyle: emotionConfig?.defaultVoiceStyle || 'conversational',
      gesture: emotionConfig?.defaultGesture,
      facialBlendshapes: emotionConfig?.blendshapes,
    });
  }

  const fullCleanText = segments.map((s) => s.cleanText).join(' ');

  return {
    fullCleanText,
    fullSpeechText: fullCleanText,
    segments,
    totalEstimatedSeconds: Math.round(totalEstimatedSeconds * 10) / 10,
    detectedEmotions: Array.from(detectedEmotionsSet),
  };
}
