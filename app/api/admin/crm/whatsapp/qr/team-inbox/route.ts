/**
 * QR WhatsApp Team Inbox — chat assignment, claim/lock, internal notes.
 *
 * GET    ?chatJid=…            → { assignment, claim, notes[] } for one chat
 * POST   { action: 'assign',  chatJid, assignToUserId?, assignToName? }
 * POST   { action: 'claim',   chatJid }   → soft-lock the chat for the caller
 * POST   { action: 'release', chatJid }   → release the caller's claim
 * POST   { action: 'note',    chatJid, text }
 * DELETE { noteId }
 *
 * A claim is a soft lock: it expires CLAIM_TTL_MS after the last refresh, and
 * an admin (or the current holder) can always take/release it. It exists so
 * two agents don't type replies to the same customer at the same time.
 */

import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { getViewerUserId } from '@/lib/crm-handlers';
import { getQrWhatsAppChat, getQrChatNote } from '@/lib/schemas/enterpriseSchemas';
import { getTenantModel } from '@/lib/tenant/tenantSchemas';

export const dynamic = 'force-dynamic';

const CLAIM_TTL_MS = 3 * 60 * 1000; // claims go stale after 3 minutes without refresh

type Caller = { userId: string; name: string; inboxOwnerUserId: string };

/**
 * Chat docs are stored under the tenant OWNER's userId (the whole team shares
 * one inbox). For a team member, resolve their tenant's owner; the owner and
 * standalone admins resolve to themselves.
 */
async function resolveCaller(req: NextRequest): Promise<Caller | null> {
  const decoded: any = verifyToken(req.headers.get('authorization') || '');
  if (!decoded || !decoded.isAdmin) return null;
  const userId = getViewerUserId(decoded);
  if (!userId) return null;

  let inboxOwnerUserId = userId;
  const tenantSlug = String(decoded.tenantSlug || '').trim();
  if (tenantSlug) {
    try {
      const Tenant = getTenantModel();
      const tenant: any = await Tenant.findOne({ slug: tenantSlug }, { ownerUserId: 1 }).lean();
      const owner = String(tenant?.ownerUserId || '').trim();
      if (owner) inboxOwnerUserId = owner;
    } catch { /* fall back to own userId */ }
  }

  return { userId, name: String(decoded.name || decoded.username || userId), inboxOwnerUserId };
}

function claimView(chat: any) {
  const stale = !chat?.claimedAt || Date.now() - new Date(chat.claimedAt).getTime() > CLAIM_TTL_MS;
  if (!chat?.claimedByUserId || stale) return null;
  return { userId: chat.claimedByUserId, name: chat.claimedByName || chat.claimedByUserId, claimedAt: chat.claimedAt };
}

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const caller = await resolveCaller(req);
    if (!caller) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const chatJid = req.nextUrl.searchParams.get('chatJid') || '';
    if (!chatJid) return NextResponse.json({ success: false, error: 'chatJid required' }, { status: 400 });

    const QrChat = getQrWhatsAppChat();
    const QrNote = getQrChatNote();
    const chat: any = await QrChat.findOne(
      { userId: caller.inboxOwnerUserId, chatJid },
      { assignedToUserId: 1, assignedToName: 1, claimedByUserId: 1, claimedByName: 1, claimedAt: 1 }
    ).lean();

    const notes = await QrNote.find({ userId: caller.inboxOwnerUserId, chatJid })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    return NextResponse.json({
      success: true,
      assignment: chat?.assignedToUserId
        ? { userId: chat.assignedToUserId, name: chat.assignedToName || chat.assignedToUserId }
        : null,
      claim: claimView(chat),
      notes: notes.map((n: any) => ({
        id: String(n._id),
        authorId: n.authorId,
        authorName: n.authorName || n.authorId,
        text: n.text,
        createdAt: n.createdAt,
        mine: n.authorId === caller.userId,
      })),
    });
  } catch (err: any) {
    console.error('[QR TEAM-INBOX] GET error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const caller = await resolveCaller(req);
    if (!caller) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const action = String(body.action || '');
    const chatJid = String(body.chatJid || '');
    if (!chatJid) return NextResponse.json({ success: false, error: 'chatJid required' }, { status: 400 });

    const QrChat = getQrWhatsAppChat();
    const filter = { userId: caller.inboxOwnerUserId, chatJid };

    if (action === 'assign') {
      const assignToUserId = String(body.assignToUserId || '');
      const assignToName = String(body.assignToName || assignToUserId);
      await QrChat.updateOne(filter, {
        $set: { assignedToUserId: assignToUserId, assignedToName: assignToUserId ? assignToName : '' },
      });
      return NextResponse.json({
        success: true,
        assignment: assignToUserId ? { userId: assignToUserId, name: assignToName } : null,
      });
    }

    if (action === 'claim') {
      const now = new Date();
      const staleBefore = new Date(Date.now() - CLAIM_TTL_MS);
      // Atomic: claim only if unclaimed, stale, or already held by the caller.
      const updated: any = await QrChat.findOneAndUpdate(
        {
          ...filter,
          $or: [
            { claimedByUserId: { $in: ['', null] } },
            { claimedByUserId: caller.userId },
            { claimedAt: { $lt: staleBefore } },
          ],
        },
        { $set: { claimedByUserId: caller.userId, claimedByName: caller.name, claimedAt: now } },
        { new: true, projection: { claimedByUserId: 1, claimedByName: 1, claimedAt: 1 } }
      ).lean();

      if (updated) {
        return NextResponse.json({ success: true, claim: claimView(updated), mine: true });
      }
      // Someone else holds a live claim — report who.
      const chat: any = await QrChat.findOne(filter, { claimedByUserId: 1, claimedByName: 1, claimedAt: 1 }).lean();
      return NextResponse.json({ success: true, claim: claimView(chat), mine: false });
    }

    if (action === 'release') {
      await QrChat.updateOne(
        { ...filter, claimedByUserId: caller.userId },
        { $set: { claimedByUserId: '', claimedByName: '' }, $unset: { claimedAt: 1 } }
      );
      return NextResponse.json({ success: true, claim: null });
    }

    if (action === 'note') {
      const text = String(body.text || '').trim();
      if (!text) return NextResponse.json({ success: false, error: 'text required' }, { status: 400 });
      const QrNote = getQrChatNote();
      const note: any = await QrNote.create({
        userId: caller.inboxOwnerUserId,
        chatJid,
        authorId: caller.userId,
        authorName: caller.name,
        text: text.slice(0, 2000),
      });
      return NextResponse.json({
        success: true,
        note: { id: String(note._id), authorId: caller.userId, authorName: caller.name, text: note.text, createdAt: note.createdAt, mine: true },
      });
    }

    return NextResponse.json({ success: false, error: `Unknown action: ${action}` }, { status: 400 });
  } catch (err: any) {
    console.error('[QR TEAM-INBOX] POST error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await connectDB();
    const caller = await resolveCaller(req);
    if (!caller) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { noteId } = await req.json();
    if (!noteId) return NextResponse.json({ success: false, error: 'noteId required' }, { status: 400 });

    const QrNote = getQrChatNote();
    // Only the author can delete their own note (tenant-scoped).
    const result = await QrNote.deleteOne({ _id: noteId, userId: caller.inboxOwnerUserId, authorId: caller.userId });
    if (result.deletedCount === 0) {
      return NextResponse.json({ success: false, error: 'Note not found or not yours' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[QR TEAM-INBOX] DELETE error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
