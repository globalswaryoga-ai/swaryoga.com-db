import { NextRequest, NextResponse } from 'next/server';
import { getAllPodcastEpisodes, createPodcastEpisode, seedDefaultPodcastEpisodes } from '@/lib/mohanRag/podcastRepository';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') || 'all';
    const language = searchParams.get('language') || 'all';
    const search = searchParams.get('search') || '';

    const episodes = await getAllPodcastEpisodes({ category, language, search });
    return NextResponse.json({ success: true, count: episodes.length, episodes });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch podcast episodes';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (body.action === 'seed') {
      await seedDefaultPodcastEpisodes();
      const episodes = await getAllPodcastEpisodes();
      return NextResponse.json({ success: true, message: 'Seeded default podcast episodes', episodes });
    }

    const episode = await createPodcastEpisode(body);
    return NextResponse.json({ success: true, episode });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create podcast episode';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

