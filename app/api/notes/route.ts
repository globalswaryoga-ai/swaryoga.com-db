import { NextRequest, NextResponse } from 'next/server';
import { connectDB, Note, User } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

// GET - Fetch user's notes with filtering
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Query parameters for filtering
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const tag = searchParams.get('tag') || '';
    const visionId = searchParams.get('visionId') || '';
    const mood = searchParams.get('mood') || '';
    const pinned = searchParams.get('pinned') === 'true';
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const skip = parseInt(searchParams.get('skip') || '0');

    // Build filter
    const filter: any = { userId: decoded.userId };
    
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } },
        { tags: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (tag) filter.tags = tag;
    if (visionId) filter['linkedTo.visionId'] = visionId;
    if (mood) filter.mood = mood;
    if (pinned) filter.isPinned = true;

    const notes = await Note.find(filter)
      .sort({ isPinned: -1, createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .lean();

    const total = await Note.countDocuments(filter);

    return NextResponse.json({
      success: true,
      data: notes,
      total,
      limit,
      skip,
    });
  } catch (error) {
    console.error('GET /api/notes error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch notes' },
      { status: 500 }
    );
  }
}

// POST - Create new note
export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { title, content, fontFamily, colorTheme, linkedTo, tags, mood, attachments } = body;

    // Validation
    if (!title?.trim()) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }
    if (!content?.trim()) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 });
    }

    // Calculate reading time (rough estimate: 200 words per minute)
    const wordCount = content.split(/\s+/).length;
    const readingTimeMinutes = Math.ceil(wordCount / 200);

    // Create note
    const note = new Note({
      userId: decoded.userId,
      title: title.trim(),
      content,
      fontFamily: fontFamily || 'poppins',
      colorTheme: colorTheme || 'serenity-blue',
      linkedTo: linkedTo || {},
      tags: tags || [],
      mood: mood || 'neutral',
      attachments: attachments || [],
      wordCount,
      readingTimeMinutes,
    });

    await note.save();

    return NextResponse.json(
      { success: true, data: note },
      { status: 201 }
    );
  } catch (error) {
    console.error('POST /api/notes error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create note' },
      { status: 500 }
    );
  }
}
