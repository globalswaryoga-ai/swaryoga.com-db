import crypto from 'node:crypto';
import { bunnyExecute, bunnyBatch } from '@/lib/bunnyDatabase';
import { uploadToBunnyStorage } from '@/lib/bunny-storage';
import { synthesizeEdgeTts, WordBoundaryEvent } from './edgeTtsClient';
import { generateVisemeTimeline, VisemeFrame } from './visemeMapper';

export interface InhouseVoiceOption {
  id: string;
  name: string;
  langCode: string;
  language: string;
  gender: 'male' | 'female';
  tone: string;
  styleDesc: string;
  badge?: string;
  sampleText: string;
}

export const INHOUSE_NEURAL_VOICES: InhouseVoiceOption[] = [
  // Hindi Voices (Mohan Sir Master Baritone)
  {
    id: 'hi-IN-MadhurNeural',
    name: 'Mohan Sir (Calm Vedic Guru - Madhur)',
    langCode: 'hi',
    language: 'Hindi (हिन्दी)',
    gender: 'male',
    tone: 'Deep, Resonant, Meditative Guru Cadence',
    styleDesc: 'Ideal for Swar Sadhana, meditation guidance, and Vedic scriptures.',
    badge: '⭐ Mohan Sir Official Voice',
    sampleText: 'नमस्ते! मैं मोहन कलबुर्गी हूँ। स्वर योग के इस पावन सत्र में आपका स्वागत है।',
  },

  // Marathi Voices (Mohan Sir Authentic Native Tongue)
  {
    id: 'mr-IN-ManoharNeural',
    name: 'Mohan Sir (Ashram Masterclass - Manohar)',
    langCode: 'mr',
    language: 'Marathi (मराठी)',
    gender: 'male',
    tone: 'Authoritative, Articulate, Soulful Marathi',
    styleDesc: 'Official voice for Marathi Swar Yoga workshops and retreats.',
    badge: '🚩 Official Marathi Voice',
    sampleText: 'नमस्कार! मी मोहन कलबुर्गी आहे. स्वर योगाच्या या विशेष सत्रात आपले सहर्ष स्वागत आहे.',
  },

  // English (Indian Accent - Mohan Sir Global Keynote)
  {
    id: 'en-IN-PrabhatNeural',
    name: 'Mohan Sir (Universal Indian English - Prabhat)',
    langCode: 'en',
    language: 'English (Indian)',
    gender: 'male',
    tone: 'Clear, Calm, Scholarly English',
    styleDesc: 'Global lectures, scientific respiration studies, and international attendees.',
    badge: '🇬🇧 Global English Voice',
    sampleText: 'Namaste! Welcome to this Swar Yoga masterclass on the sacred science of breath.',
  },

  // Regional Indian Languages (All Authentic Male Masters)
  {
    id: 'gu-IN-NiranjanNeural',
    name: 'Niranjan (Gujarati Guru)',
    langCode: 'gu',
    language: 'Gujarati (ગુજરાતી)',
    gender: 'male',
    tone: 'Traditional, Reverent Gujarati Cadence',
    styleDesc: 'Swar Yoga lectures and health guidance for Gujarati students.',
    sampleText: 'નમસ્કાર! સ્વર યોગના આ વિશેષ સત્રમાં આપનું હાર્દિક સ્વાગત છે.',
  },
  {
    id: 'kn-IN-GaganNeural',
    name: 'Gagan (Kannada Master)',
    langCode: 'kn',
    language: 'Kannada (ಕನ್ನಡ)',
    gender: 'male',
    tone: 'Dignified, Melodious Kannada',
    styleDesc: 'Karnataka retreats and spiritual discourses.',
    sampleText: 'ನಮಸ್ಕಾರ! ಸ್ವರ ಯೋಗದ ಈ ಪಾವನ ಸತ್ರಕ್ಕೆ ನಿಮಗೆ ಹೃತ್ಪೂರ್ವಕ ಸ್ವಾಗತ.',
  },
  {
    id: 'ta-IN-ValluvarNeural',
    name: 'Valluvar (Tamil Sage)',
    langCode: 'ta',
    language: 'Tamil (தமிழ்)',
    gender: 'male',
    tone: 'Resonant Classical Tamil',
    styleDesc: 'Tamil Nadu attendees and Pranayama wisdom.',
    sampleText: 'வணக்கம்! ஸ்வர் யோகாவின் இந்த சிறப்பு வகுப்பிற்கு உங்களை வரவேற்கிறோம்.',
  },
  {
    id: 'te-IN-MohanNeural',
    name: 'Mohan (Telugu Guru)',
    langCode: 'te',
    language: 'Telugu (తెలుగు)',
    gender: 'male',
    tone: 'Warm, Authentic Telugu',
    styleDesc: 'Telugu sadhana guidance and nutrition instruction.',
    sampleText: 'నమస్కారం! స్వర యోగా ఈ ప్రత్యేక తరగతికి మీకు సాదర స్వాగతం.',
  },
];

export interface InhouseSpeechParams {
  script: string;
  voiceId?: string;
  language?: string;
  speed?: number; // 0.8 to 1.3
  pitchHz?: number; // -10 to +10
  adminId?: string;
}

export interface InhouseSpeechResult {
  audioUrl: string;
  voiceId: string;
  language: string;
  durationSeconds: number;
  wordCount: number;
  wordBoundaries: WordBoundaryEvent[];
  visemeFrames: VisemeFrame[];
  provider: 'edge_tts_inhouse' | 'openai_fallback';
  costExpenseUsd: number; // Always 0 for inhouse Edge-TTS!
}

export class InhouseAudioService {
  private static schemaReady = false;

  public static async initSchema(): Promise<void> {
    if (this.schemaReady) return;
    await bunnyBatch([
      {
        sql: `CREATE TABLE IF NOT EXISTS studio_inhouse_voices_sql (
          id TEXT PRIMARY KEY,
          script_hash TEXT NOT NULL,
          script_text TEXT NOT NULL,
          voice_id TEXT NOT NULL,
          language TEXT NOT NULL,
          audio_url TEXT NOT NULL,
          duration_seconds REAL NOT NULL,
          visemes_json TEXT,
          admin_id TEXT DEFAULT 'admin',
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        )`,
      },
    ]);
    this.schemaReady = true;
  }

  /**
   * Synthesize speech using Microsoft Edge-TTS with 100% zero expense,
   * uploads MP3 directly to Bunny CDN, and generates viseme frames.
   */
  public static async synthesizeSpeech(params: InhouseSpeechParams): Promise<InhouseSpeechResult> {
    try {
      await this.initSchema();
    } catch (e: any) {
      console.warn('[InhouseAudioService] Schema init warning (non-fatal):', e.message);
    }

    const script = params.script?.trim();
    if (!script) {
      throw new Error('Script text is required for audio synthesis.');
    }

    // Resolve voice
    let voice = params.voiceId;
    if (!voice) {
      const lang = params.language || 'hi';
      const defaultOption = INHOUSE_NEURAL_VOICES.find((v) => v.langCode === lang) || INHOUSE_NEURAL_VOICES[0];
      voice = defaultOption.id;
    }

    // Speed to prosody rate string (e.g. 1.05 -> "+5%", 0.95 -> "-5%")
    const speedMultiplier = params.speed || 1.0;
    const rateDiff = Math.round((speedMultiplier - 1.0) * 100);
    const rateStr = rateDiff >= 0 ? `+${rateDiff}%` : `${rateDiff}%`;

    // Pitch to prosody pitch string
    const pitchDiff = params.pitchHz || 0;
    const pitchStr = pitchDiff >= 0 ? `+${pitchDiff}Hz` : `${pitchDiff}Hz`;

    // Check cache in Bunny DB to avoid re-generating identical audio
    const hash = crypto.createHash('md5').update(`${voice}_${rateStr}_${pitchStr}_${script}`).digest('hex');
    try {
      const cached = await bunnyExecute({
        sql: `SELECT * FROM studio_inhouse_voices_sql WHERE script_hash = ? LIMIT 1`,
        args: [hash],
      });

      if (cached.rows.length > 0) {
        const row: any = cached.rows[0];
        const visemes: VisemeFrame[] = row.visemes_json ? JSON.parse(row.visemes_json) : [];
        return {
          audioUrl: row.audio_url,
          voiceId: row.voice_id,
          language: row.language,
          durationSeconds: Number(row.duration_seconds),
          wordCount: script.split(/\s+/).length,
          wordBoundaries: [],
          visemeFrames: visemes,
          provider: 'edge_tts_inhouse',
          costExpenseUsd: 0.0,
        };
      }
    } catch (cacheErr: any) {
      console.warn('[InhouseAudioService] Cache lookup non-fatal error:', cacheErr.message);
    }

    console.log(`[InhouseAudioService] Synthesizing zero-expense speech with voice: ${voice}, speed: ${rateStr}`);

    // Call native Edge-TTS client
    const synthesis = await synthesizeEdgeTts(script, {
      voice,
      rate: rateStr,
      pitch: pitchStr,
    });

    // Upload MP3 buffer directly to Bunny CDN Storage or fallback to base64 Data URL
    let audioUrl = '';
    try {
      const fileName = `inhouse_avatar_${Date.now()}_${crypto.randomUUID().substring(0, 8)}.mp3`;
      audioUrl = await uploadToBunnyStorage(synthesis.audioBuffer, fileName, { contentType: 'audio/mpeg' });
      console.log(`[InhouseAudioService] Permanent Bunny CDN Audio created: ${audioUrl}`);
    } catch (upErr: any) {
      console.warn('[InhouseAudioService] Storage upload fallback to Data URI:', upErr.message);
      audioUrl = `data:audio/mp3;base64,${synthesis.audioBuffer.toString('base64')}`;
    }

    // Generate ARKit 52 blendshape viseme timeline for real-time lip-sync
    const totalDurationMs = Math.round(synthesis.durationSeconds * 1000);
    const visemeFrames = generateVisemeTimeline(synthesis.wordBoundaries, totalDurationMs, 30);

    // Save cache in Bunny DB
    try {
      const id = `inh_audio_${crypto.randomUUID().substring(0, 10)}`;
      const now = new Date().toISOString();
      await bunnyExecute({
        sql: `INSERT INTO studio_inhouse_voices_sql (
          id, script_hash, script_text, voice_id, language, audio_url, duration_seconds, visemes_json, admin_id, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          id,
          hash,
          script,
          voice,
          params.language || 'hi',
          audioUrl,
          synthesis.durationSeconds,
          JSON.stringify(visemeFrames),
          params.adminId || 'admin',
          now,
          now,
        ],
      });
    } catch (saveErr: any) {
      console.warn('[InhouseAudioService] Cache save non-fatal error:', saveErr.message);
    }

    return {
      audioUrl,
      voiceId: voice,
      language: params.language || 'hi',
      durationSeconds: synthesis.durationSeconds,
      wordCount: script.split(/\s+/).length,
      wordBoundaries: synthesis.wordBoundaries,
      visemeFrames,
      provider: 'edge_tts_inhouse',
      costExpenseUsd: 0.0,
    };
  }

  /**
   * Returns all available zero-cost voices
   */
  public static getVoiceCatalog(): InhouseVoiceOption[] {
    return INHOUSE_NEURAL_VOICES;
  }
}
