import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';

/**
 * Mock translation endpoint.
 * In production, integrate with Google Translate API or AWS Translate.
 */
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization') || undefined;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : authHeader;
    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { text, sourceLang, targetLang } = await req.json();

    if (!text || !targetLang) {
      return NextResponse.json({ error: 'Text and target language required' }, { status: 400 });
    }

    // --- MOCK TRANSLATION LOGIC ---
    // In a real implementation:
    // const result = await translateClient.translateText({ Text: text, SourceLanguageCode: sourceLang, TargetLanguageCode: targetLang });
    
    let translatedText = text;
    
    // Very simple mock for demo purposes
    if (targetLang === 'hi') {
      translatedText = `(Hindi) ${text}`; 
    } else if (targetLang === 'it') {
      translatedText = `(Italian) ${text}`;
    } else if (targetLang === 'en') {
      translatedText = `(English) ${text}`;
    } else {
        translatedText = `(${targetLang}) ${text}`;
    }

    return NextResponse.json({ 
      success: true, 
      translatedText 
    });

  } catch (error) {
    console.error('Translation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Translation failed' }, 
      { status: 500 }
    );
  }
}
