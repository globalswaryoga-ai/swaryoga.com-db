import { NextRequest, NextResponse } from 'next/server';
import { getAllBackgroundEnvironments, addCustomBackgroundEnvironment } from '@/lib/avatarEngine/backgroundEngine';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const backgrounds = await getAllBackgroundEnvironments();
    return NextResponse.json({
      success: true,
      total: backgrounds.length,
      backgrounds,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch backgrounds' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, category, thumbnailUrl, backgroundUrl, cssFilter } = body;

    if (!name || !category || !backgroundUrl) {
      return NextResponse.json(
        { success: false, error: 'Name, category, and backgroundUrl are required.' },
        { status: 400 }
      );
    }

    const id = `bg_custom_${Date.now()}`;
    const newBg = await addCustomBackgroundEnvironment({
      id,
      name,
      category,
      thumbnailUrl: thumbnailUrl || backgroundUrl,
      backgroundUrl,
      cssFilter: cssFilter || 'none',
    });

    return NextResponse.json({
      success: true,
      background: newBg,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create background' },
      { status: 500 }
    );
  }
}
