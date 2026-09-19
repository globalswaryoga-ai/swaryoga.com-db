import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin, getViewerUserId } from '@/lib/crm-handlers';
import { getBunnyLeadById, saveBunnyLead } from '@/lib/bunnyLeadsRepository';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin && !decoded?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const viewerUserId = getViewerUserId(decoded);
    if (!viewerUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const superAdmin = isSuperAdmin(decoded);

    const lead = await getBunnyLeadById(params.id);
    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    if (!superAdmin && String(lead.assignedToUserId || '').trim() !== viewerUserId && String(lead.createdByUserId || '').trim() !== viewerUserId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const notes = lead.notes || [];
    return NextResponse.json({ success: true, data: notes.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get notes';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin && !decoded?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const viewerUserId = getViewerUserId(decoded);
    if (!viewerUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const superAdmin = isSuperAdmin(decoded);

    const body = await request.json().catch(() => null);
    if (!body || !body.note) {
      return NextResponse.json({ error: 'Invalid body: note is required' }, { status: 400 });
    }

    const lead = await getBunnyLeadById(params.id);
    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    if (!superAdmin && String(lead.assignedToUserId || '').trim() !== viewerUserId && String(lead.createdByUserId || '').trim() !== viewerUserId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const newNote = {
      _id: Math.random().toString(36).substring(2, 11),
      leadId: params.id,
      createdByUserId: viewerUserId,
      note: String(body.note).trim(),
      pinned: !!body.pinned,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const notes = lead.notes || [];
    notes.push(newNote);
    
    await saveBunnyLead({ ...lead, notes }, params.id);
    return NextResponse.json({ success: true, data: newNote }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to add note';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin && !decoded?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const viewerUserId = getViewerUserId(decoded);
    if (!viewerUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const superAdmin = isSuperAdmin(decoded);

    const url = new URL(request.url);
    const noteId = url.searchParams.get('noteId');
    if (!noteId) return NextResponse.json({ error: 'Invalid noteId' }, { status: 400 });

    const body = await request.json().catch(() => null);
    if (!body) return NextResponse.json({ error: 'Invalid body' }, { status: 400 });

    const lead = await getBunnyLeadById(params.id);
    if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 });

    if (!superAdmin && String(lead.assignedToUserId || '').trim() !== viewerUserId && String(lead.createdByUserId || '').trim() !== viewerUserId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    let notes = lead.notes || [];
    const noteIndex = notes.findIndex((n: any) => n._id === noteId);
    if (noteIndex === -1) return NextResponse.json({ error: 'Note not found' }, { status: 404 });

    if (!superAdmin && notes[noteIndex].createdByUserId !== viewerUserId) {
      return NextResponse.json({ error: 'Forbidden to edit this note' }, { status: 403 });
    }

    if (body.note !== undefined) notes[noteIndex].note = String(body.note).trim();
    if (body.pinned !== undefined) notes[noteIndex].pinned = !!body.pinned;
    notes[noteIndex].updatedAt = new Date().toISOString();

    await saveBunnyLead({ ...lead, notes }, params.id);
    return NextResponse.json({ success: true, data: notes[noteIndex] }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update note';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin && !decoded?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const viewerUserId = getViewerUserId(decoded);
    if (!viewerUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const superAdmin = isSuperAdmin(decoded);

    const url = new URL(request.url);
    const noteId = url.searchParams.get('noteId');
    if (!noteId) return NextResponse.json({ error: 'Invalid noteId' }, { status: 400 });

    const lead = await getBunnyLeadById(params.id);
    if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 });

    if (!superAdmin && String(lead.assignedToUserId || '').trim() !== viewerUserId && String(lead.createdByUserId || '').trim() !== viewerUserId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    let notes = lead.notes || [];
    const noteIndex = notes.findIndex((n: any) => n._id === noteId);
    if (noteIndex === -1) return NextResponse.json({ error: 'Note not found' }, { status: 404 });

    if (!superAdmin && notes[noteIndex].createdByUserId !== viewerUserId) {
      return NextResponse.json({ error: 'Forbidden to delete this note' }, { status: 403 });
    }

    const deleted = notes[noteIndex];
    notes.splice(noteIndex, 1);

    await saveBunnyLead({ ...lead, notes }, params.id);
    return NextResponse.json({ success: true, data: deleted }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete note';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
