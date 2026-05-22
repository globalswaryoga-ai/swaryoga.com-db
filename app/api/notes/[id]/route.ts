import { NextRequest, NextResponse } from 'next/server';
import { connectDB, Note, User } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { Types } from 'mongoose';
import mongoose from 'mongoose';

async function resolveUserId(decoded: any): Promise<string | null> {
  const rawId = decoded?.userId || '';
  if (rawId && mongoose.Types.ObjectId.isValid(rawId)) return rawId;
  const email = decoded?.email;
  const username = decoded?.username;
  const filter: any = {};
  if (rawId) filter.userId = rawId;
  else if (email) filter.email = email.toLowerCase();
  else if (username) filter.userId = username;
  else return null;
  const user = await User.findOne(filter).select('_id').lean();
  return user ? String((user as any)._id) : null;
}

export const dynamic = 'force-dynamic';


// PUT - Update note
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();

    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.userId && !decoded?.email && !decoded?.username) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resolvedUserId = await resolveUserId(decoded);

    const { id } = params;
    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid note ID' }, { status: 400 });
    }

    const body = await request.json();
    const { title, content, fontFamily, colorTheme, linkedTo, tags, mood, attachments, canvasItems, isPinned } = body;

    // Fetch note to verify ownership
    const note = await Note.findOne({ _id: id, userId: resolvedUserId || decoded.userId });
    if (!note) {
      return NextResponse.json({ error: 'Note not found or unauthorized' }, { status: 404 });
    }

    // Update fields
    if (title !== undefined) note.title = title.trim();
    if (content !== undefined) {
      note.content = content;
      // Recalculate word count and reading time
      const wordCount = content.split(/\s+/).length;
      note.wordCount = wordCount;
      note.readingTimeMinutes = Math.ceil(wordCount / 200);
    }
    if (fontFamily !== undefined) note.fontFamily = fontFamily;
    if (colorTheme !== undefined) note.colorTheme = colorTheme;
    if (linkedTo !== undefined) note.linkedTo = linkedTo;
    if (tags !== undefined) note.tags = tags;
    if (mood !== undefined) note.mood = mood;
    if (attachments !== undefined) note.attachments = attachments;
    if (canvasItems !== undefined) note.canvasItems = Array.isArray(canvasItems) ? canvasItems : [];
    if (isPinned !== undefined) note.isPinned = isPinned;

    note.updatedAt = new Date();
    note.lastEditedAt = new Date();

    await note.save();

    return NextResponse.json({ success: true, data: note });
  } catch (error) {
    console.error('PUT /api/notes/[id] error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update note' },
      { status: 500 }
    );
  }
}

// DELETE - Remove note
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();

    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.userId && !decoded?.email && !decoded?.username) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resolvedUserId = await resolveUserId(decoded);

    const { id } = params;
    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid note ID' }, { status: 400 });
    }

    const result = await Note.findOneAndDelete({ _id: id, userId: resolvedUserId || decoded.userId });

    if (!result) {
      return NextResponse.json({ error: 'Note not found or unauthorized' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Note deleted' });
  } catch (error) {
    console.error('DELETE /api/notes/[id] error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete note' },
      { status: 500 }
    );
  }
}
