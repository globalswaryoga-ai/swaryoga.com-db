import { NextRequest, NextResponse } from 'next/server';
import { connectDB, Note } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { Types } from 'mongoose';

// PUT - Update note
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();

    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid note ID' }, { status: 400 });
    }

    const body = await request.json();
    const { title, content, fontFamily, colorTheme, linkedTo, tags, mood, attachments, isPinned } = body;

    // Fetch note to verify ownership
    const note = await Note.findOne({ _id: id, userId: decoded.userId });
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
    if (!decoded?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid note ID' }, { status: 400 });
    }

    const result = await Note.findOneAndDelete({ _id: id, userId: decoded.userId });

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
