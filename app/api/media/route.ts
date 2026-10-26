import { NextRequest, NextResponse } from 'next/server';
import {
  listBunnyMediaItems,
  saveBunnyMediaItem,
  deleteBunnyMediaItem,
  BunnyMediaItem,
  MediaType,
  MediaDestination
} from '@/lib/bunnyMediaRepository';
import { verifyToken } from '@/lib/auth';
import { generateAIText } from '@/lib/ai/generateWithFallback';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const maxDuration = 300;

const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English',
  hi: 'Hindi',
  mr: 'Marathi',
  kn: 'Kannada',
  ne: 'Nepali',
  zh: 'Mandarin Chinese',
  es: 'Spanish',
  fr: 'French',
  ar: 'Arabic',
  de: 'German',
  pt: 'Portuguese',
  ja: 'Japanese',
  ko: 'Korean',
  ru: 'Russian',
  it: 'Italian',
  tr: 'Turkish',
  nl: 'Dutch',
  sv: 'Swedish',
  th: 'Thai',
  id: 'Indonesian',
};

/**
 * GET /api/media
 * Public / Admin query endpoint
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100);
    const skip = parseInt(searchParams.get('skip') || '0', 10);
    const category = searchParams.get('category')?.trim();
    const type = searchParams.get('type') as MediaType | undefined;
    const destination = searchParams.get('destination') as MediaDestination | undefined;
    const language = searchParams.get('language')?.trim();
    const q = searchParams.get('q')?.trim();
    const status = searchParams.get('status')?.trim() || 'published';

    const { items, total } = await listBunnyMediaItems({
      type,
      destination,
      language,
      category,
      status,
      search: q,
      limit,
      skip,
    });

    // Format for backwards compatibility with legacy frontend and new YouTube UI
    const posts = items.map((item) => ({
      ...item,
      _id: item.id,
      publishedAt: item.createdAt,
    }));

    return NextResponse.json(
      {
        success: true,
        data: {
          items,
          posts,
          total,
          limit,
          skip,
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('❌ Error in GET /api/media:', error);
    return NextResponse.json({ error: error?.message || 'Failed to fetch media' }, { status: 500 });
  }
}

/**
 * POST /api/media
 * Create or Update Media with 1-Click Multi-Language Translation
 */
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const {
      id,
      type = 'video',
      destinations = ['media'],
      title,
      description = '',
      mediaUrl,
      thumbnailUrl,
      durationSeconds = 0,
      sourceLanguage = 'en',
      targetLanguages = [],
      autoTranslate = true,
      playlistItems = [],
      socialChannels = [],
      liveStatus = 'upcoming',
      liveScheduledAt,
      category = 'general',
      tags = [],
      overlayStrip,
      status = 'published',
    } = body;

    if (!title || !title.trim()) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    const translations: Record<string, { title: string; description: string; mediaUrl?: string }> = {
      ...(body.translations || {}),
    };

    // Auto-translate to selected target languages if requested
    if (autoTranslate && Array.isArray(targetLanguages) && targetLanguages.length > 0) {
      const sourceLangName = LANGUAGE_NAMES[sourceLanguage] || sourceLanguage;

      for (const targetLang of targetLanguages) {
        if (targetLang === sourceLanguage) continue;
        const targetLangName = LANGUAGE_NAMES[targetLang] || targetLang;

        try {
          const prompt = `You are a professional multilingual translator for Swar Yoga & Ayurveda.
Translate the following video/post metadata from ${sourceLangName} to ${targetLangName}.
Follow these strict rules:
1. Translate faithfully line-by-line with exact meaning and natural native grammar.
2. Maintain yogic and ayurvedic terms accurately.
3. Do NOT add commentary, explanations, or introductory fluff.
4. Return ONLY a valid JSON object in this exact structure:
{"title": "translated title", "description": "translated description"}

Original Title:
${title}

Original Description:
${description || 'No description'}`;

          const aiResp = await generateAIText({ message: prompt });
          // Parse JSON from response
          const match = aiResp.match(/\{[\s\S]*\}/);
          if (match) {
            const parsed = JSON.parse(match[0]);
            translations[targetLang] = {
              title: parsed.title || title,
              description: parsed.description || description,
              mediaUrl: mediaUrl,
            };
          }
        } catch (transErr) {
          console.warn(`Translation error for ${targetLang}:`, transErr);
        }
      }
    }

    const saved = await saveBunnyMediaItem({
      id,
      type,
      destinations,
      title: title.trim(),
      description: description.trim(),
      mediaUrl,
      thumbnailUrl,
      durationSeconds,
      sourceLanguage,
      targetLanguages,
      translations,
      playlistItems,
      socialChannels,
      liveStatus,
      liveScheduledAt,
      category,
      tags,
      overlayStrip,
      status,
      createdBy: decoded.email || decoded.id || 'admin',
    });

    return NextResponse.json({
      success: true,
      data: saved,
      message: `Media item saved and published to [${destinations.join(', ')}] across ${Object.keys(translations).length + 1} languages.`,
    });
  } catch (error: any) {
    console.error('❌ Error in POST /api/media:', error);
    return NextResponse.json({ error: error?.message || 'Failed to save media' }, { status: 500 });
  }
}

/**
 * DELETE /api/media
 */
export async function DELETE(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Missing id parameter' }, { status: 400 });
    }

    await deleteBunnyMediaItem(id);
    return NextResponse.json({ success: true, message: 'Media item deleted' });
  } catch (error: any) {
    console.error('❌ Error in DELETE /api/media:', error);
    return NextResponse.json({ error: error?.message || 'Failed to delete' }, { status: 500 });
  }
}
