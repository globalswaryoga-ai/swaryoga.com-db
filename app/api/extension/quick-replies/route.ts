import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import { QuickReply } from '@/lib/schemas/enterpriseSchemas';
import { extensionJson, extensionOptions, requireExtensionAccess } from '@/lib/extensionAccess';

export const dynamic = 'force-dynamic';

export async function OPTIONS() {
  return extensionOptions();
}

/**
 * GET /api/extension/quick-replies
 * Lists this user's saved quick replies for the extension's click-to-insert list.
 */
export async function GET(req: NextRequest) {
  try {
    const decoded = await requireExtensionAccess(req);
    if (!decoded) {
      return extensionJson({ success: false, error: 'Extension access not approved for this user' }, 403);
    }

    await connectDB();
    const replies = await QuickReply.find({ createdByUserId: String(decoded.userId), enabled: true })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    return extensionJson({
      success: true,
      replies: replies.map((r: any) => ({ title: r.title, content: r.content, shortcut: r.shortcut || '' })),
    });
  } catch (err) {
    console.error('[extension/quick-replies]', err);
    return extensionJson({ success: false, error: 'Internal error' }, 500);
  }
}

/**
 * POST /api/extension/quick-replies
 * Body: { title: string, content: string }
 * Lets the sidebar's "+" button add a new quick reply without leaving WhatsApp Web.
 */
export async function POST(req: NextRequest) {
  try {
    const decoded = await requireExtensionAccess(req);
    if (!decoded) {
      return extensionJson({ success: false, error: 'Extension access not approved for this user' }, 403);
    }

    const { title, content } = await req.json();
    if (!title?.trim() || !content?.trim()) {
      return extensionJson({ success: false, error: 'title and content are required' }, 400);
    }

    await connectDB();
    const reply = await QuickReply.create({
      title: title.trim(),
      content: content.trim(),
      createdByUserId: String(decoded.userId),
      enabled: true,
    });

    return extensionJson({ success: true, reply: { title: reply.title, content: reply.content } });
  } catch (err) {
    console.error('[extension/quick-replies POST]', err);
    return extensionJson({ success: false, error: 'Internal error' }, 500);
  }
}
