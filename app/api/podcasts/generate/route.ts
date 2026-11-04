import { NextRequest, NextResponse } from 'next/server';
import { generatePodcastEpisodeFromQuestion } from '@/lib/mohanRag/podcastRepository';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const question = String(body.question || '').trim();
    const language = (body.language || 'en') as 'mr' | 'hi' | 'en';
    const hostName = body.hostName ? String(body.hostName) : undefined;
    const hostGender = body.hostGender === 'male' ? 'male' : 'female';

    if (!question) {
      return NextResponse.json({ error: 'Please enter a student question to generate the podcast' }, { status: 400 });
    }

    const episode = await generatePodcastEpisodeFromQuestion({
      question,
      language,
      hostName,
      hostGender,
      category: body.category,
    });

    return NextResponse.json({ success: true, episode });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Podcast generation failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

