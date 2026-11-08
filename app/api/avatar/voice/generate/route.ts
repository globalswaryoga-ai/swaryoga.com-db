import { NextRequest, NextResponse } from 'next/server';
import { runMohanSirVoiceEngine } from '@/lib/avatarEngine/mohanVoiceCliWrapper';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const {
      text,
      voiceProfileId = 'vocal_dna_hindi_pratahkalin',
      language = 'hi',
      voice = '',
      pitch: customPitch,
      rate: customRate,
    } = body;

    const script = text?.trim();
    if (!script) {
      return NextResponse.json(
        { error: 'वॉइस जनरेट करने के लिए टेक्स्ट (Script) अनिवार्य है।' },
        { status: 400 }
      );
    }

    // Determine target voice model based on language & profile
    let targetVoice = voice || 'hi-IN-MadhurNeural';
    let pitch = customPitch || '-8Hz';
    let rate = customRate || '-5%';

    const isMarathi = language === 'mr' || voiceProfileId.toLowerCase().includes('marathi') || voiceProfileId.includes('mr');
    const isEnglish = language === 'en' || voiceProfileId.toLowerCase().includes('eng');

    if (!voice) {
      if (isMarathi) {
        targetVoice = 'mr-IN-ManoharNeural';
        pitch = customPitch || '-6Hz';
        rate = customRate || '-4%';
      } else if (isEnglish) {
        targetVoice = 'en-IN-PrabhatNeural';
        pitch = customPitch || '-5Hz';
        rate = customRate || '-3%';
      }
    }

    // Synthesize real speech in ~1 second via CLI wrapper
    const result = await runMohanSirVoiceEngine({
      text: script,
      voice: targetVoice,
      pitch,
      rate,
    });

    const wordCount = script.split(/\s+/).filter(Boolean).length;

    return NextResponse.json({
      success: true,
      audioUrl: result.audioUrl,
      durationSeconds: result.durationSeconds,
      durationMs: result.durationMs,
      wordCount,
      voiceProfileId,
      voiceId: targetVoice,
      language: isMarathi ? 'mr' : isEnglish ? 'en' : 'hi',
      message: '⚡ मोहन सर की प्रामाणिक आवाज 1 सेकंड में सफलतापूर्वक जनरेट हुई!',
    });
  } catch (error: any) {
    console.error('Mohan Sir Voice Engine Error:', error);
    return NextResponse.json(
      { error: error?.message || 'वॉइस जनरेशन असफल रहा।' },
      { status: 500 }
    );
  }
}
