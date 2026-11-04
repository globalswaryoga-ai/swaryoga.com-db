import { NextRequest, NextResponse } from 'next/server';
import { getPodcastEpisodeById, incrementListenCount, deletePodcastEpisode } from '@/lib/mohanRag/podcastRepository';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const episode = await getPodcastEpisodeById(id);
    if (!episode) {
      return NextResponse.json({ error: 'Podcast episode not found' }, { status: 404 });
    }

    // Increment listen count asynchronously
    incrementListenCount(id).catch(console.error);

    return NextResponse.json({ success: true, episode });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to retrieve episode';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await deletePodcastEpisode(id);
    return NextResponse.json({ success: true, message: 'Episode deleted successfully' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete episode';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

