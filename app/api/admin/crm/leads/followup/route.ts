import { NextRequest, NextResponse } from 'next/server';
import { bunnyExecute } from '@/lib/bunnyDatabase';
import { getBunnyLeadById, saveBunnyLead } from '@/lib/bunnyLeadsRepository';
import {
  createBunnyLeadNote,
  createBunnyLeadFollowUp,
  listBunnyLeadNotes,
  listBunnyLeadFollowUps,
} from '@/lib/bunnyLeadFollowupRepository';
import { verifyToken } from '@/lib/auth';
import { ConsentManager } from '@/lib/consentManager';
import { sendWhatsAppText } from '@/lib/whatsapp';

export const dynamic = 'force-dynamic';

function parseTodosText(input: unknown): Array<{ text: string; dueDate?: string }> {
  const s = typeof input === 'string' ? input : '';
  const lines = s
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  return lines
    .map((line) => {
      const parts = line.split('|').map((p) => p.trim());
      const text = parts[0] || '';
      const datePart = parts[1];

      if (!text) return null;
      if (!datePart) return { text };

      const d = new Date(datePart);
      if (Number.isNaN(d.getTime())) return { text };
      return { text, dueDate: d.toISOString() };
    })
    .filter((x): x is { text: string; dueDate?: string } => Boolean(x));
}

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin && !decoded?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const leadId = request.nextUrl.searchParams.get('leadId');
    if (!leadId) {
      return NextResponse.json({ error: 'leadId is required' }, { status: 400 });
    }

    const [notes, followups] = await Promise.all([
      listBunnyLeadNotes(leadId),
      listBunnyLeadFollowUps(leadId),
    ]);

    return NextResponse.json({
      success: true,
      data: { notes, followups },
    });
  } catch (error: any) {
    console.error('Error fetching lead followups:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch followups' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verify admin token
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);

    if (!decoded?.isAdmin && !decoded?.userId) {
      return NextResponse.json(
        { error: 'Unauthorized - admin access required' },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const {
      leadId,
      followupNotes,
      status,
      actionType,
      reminderDate,
      nextFollowupDate,
      nextFollowupDetails,
      selectedLabels,
      ...extras
    } = body;

    // Validate required fields
    if (!leadId || !actionType) {
      return NextResponse.json(
        { error: 'leadId and actionType are required' },
        { status: 400 }
      );
    }

    // Verify lead exists in Bunny Database
    const lead = await getBunnyLeadById(leadId);
    if (!lead) {
      return NextResponse.json(
        { error: 'Lead not found' },
        { status: 404 }
      );
    }

    const userId = decoded.userId || decoded.username || 'admincrm';
    const isSuperAdmin =
      decoded?.userId === 'admin' ||
      decoded?.userId === 'admincrm' ||
      (Array.isArray(decoded?.permissions) && decoded.permissions.includes('all'));

    // TENANT ISOLATION: Verify user has access to this lead
    if (
      !isSuperAdmin &&
      String(lead.assignedToUserId || '').trim() !== userId &&
      String(lead.createdByUserId || '').trim() !== userId
    ) {
      return NextResponse.json(
        { error: 'Forbidden: You do not have access to this lead' },
        { status: 403 }
      );
    }

    // Handle different action types
    switch (actionType) {
      case 'notes': {
        if (!followupNotes?.trim()) {
          return NextResponse.json(
            { error: 'Note content is required' },
            { status: 400 }
          );
        }
        const note = await createBunnyLeadNote({
          leadId,
          createdByUserId: userId,
          note: followupNotes.trim(),
          metadata: { source: 'leads-followup-page' },
        });
        return NextResponse.json(
          {
            success: true,
            message: 'Note saved successfully',
            data: note,
          },
          { status: 201 }
        );
      }

      case 'reminder': {
        if (!followupNotes?.trim()) {
          return NextResponse.json(
            { error: 'Reminder message is required' },
            { status: 400 }
          );
        }
        if (!reminderDate) {
          return NextResponse.json(
            { error: 'Reminder date is required' },
            { status: 400 }
          );
        }

        const dueAt = new Date(reminderDate);
        if (isNaN(dueAt.getTime())) {
          return NextResponse.json(
            { error: 'Invalid reminder date format' },
            { status: 400 }
          );
        }

        const reminder = await createBunnyLeadFollowUp({
          leadId,
          createdByUserId: userId,
          assignedToUserId: userId,
          title: 'Reminder',
          description: followupNotes.trim(),
          dueAt,
          timezone: 'Asia/Kolkata',
          status: 'open',
          metadata: { source: 'leads-followup-page', actionType: 'reminder' },
        });

        return NextResponse.json(
          {
            success: true,
            message: 'Reminder set successfully',
            data: reminder,
          },
          { status: 201 }
        );
      }

      case 'nextFollowup': {
        if (!nextFollowupDate) {
          return NextResponse.json(
            { error: 'Follow-up date is required' },
            { status: 400 }
          );
        }

        const dueAt = new Date(nextFollowupDate);
        if (isNaN(dueAt.getTime())) {
          return NextResponse.json(
            { error: 'Invalid follow-up date format' },
            { status: 400 }
          );
        }

        const followup = await createBunnyLeadFollowUp({
          leadId,
          createdByUserId: userId,
          assignedToUserId: userId,
          title: 'Follow-up',
          description: nextFollowupDetails || 'Follow-up scheduled',
          dueAt,
          timezone: 'Asia/Kolkata',
          status: 'open',
          metadata: { source: 'leads-followup-page', actionType: 'nextFollowup' },
        });

        return NextResponse.json(
          {
            success: true,
            message: 'Follow-up scheduled successfully',
            data: followup,
          },
          { status: 201 }
        );
      }

      case 'todos': {
        const todosRaw: any[] = Array.isArray(extras.todos)
          ? extras.todos
          : typeof (extras as any).todosText === 'string'
            ? parseTodosText((extras as any).todosText)
            : typeof extras.todos === 'string'
              ? parseTodosText(extras.todos)
              : [];

        if (!Array.isArray(todosRaw) || todosRaw.length === 0) {
          return NextResponse.json(
            { error: 'At least one todo item is required' },
            { status: 400 }
          );
        }

        const savedTodos = await Promise.all(
          todosRaw.map((todo: any) => {
            const todoObj = typeof todo === 'string' ? { text: todo } : todo;
            const title = String(todoObj?.text || todoObj?.title || '').trim() || 'Todo item';
            const dueRaw = todoObj?.dueDate || todoObj?.dueAt || null;
            let dueAt = dueRaw ? new Date(dueRaw) : null;
            if (!dueAt || Number.isNaN(dueAt.getTime())) {
              dueAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
            }
            const completed = Boolean(todoObj?.completed);

            return createBunnyLeadFollowUp({
              leadId,
              createdByUserId: userId,
              assignedToUserId: userId,
              title,
              dueAt,
              timezone: 'Asia/Kolkata',
              status: completed ? 'done' : 'open',
              completedAt: completed ? new Date() : null,
              metadata: { source: 'leads-followup-page', actionType: 'todo' },
            });
          })
        );

        return NextResponse.json(
          {
            success: true,
            message: `${savedTodos.length} todo(s) saved successfully`,
            data: savedTodos,
          },
          { status: 201 }
        );
      }

      case 'labels': {
        if (!Array.isArray(selectedLabels) || selectedLabels.length === 0) {
          return NextResponse.json(
            { error: 'At least one label is required' },
            { status: 400 }
          );
        }

        const currentLabels = Array.isArray(lead.labels) ? lead.labels : [];
        const uniqueLabels = Array.from(new Set([...currentLabels, ...selectedLabels]));
        lead.labels = uniqueLabels;
        await saveBunnyLead(lead);

        return NextResponse.json(
          {
            success: true,
            message: 'Labels updated successfully',
            data: { labels: lead.labels },
          },
          { status: 200 }
        );
      }

      case 'whatsapp': {
        if (!followupNotes?.trim()) {
          return NextResponse.json(
            { error: 'WhatsApp message is required' },
            { status: 400 }
          );
        }

        try {
          const phoneNumber = lead.phoneNumber;
          if (!phoneNumber) {
            return NextResponse.json(
              { error: 'Lead phone number not found' },
              { status: 400 }
            );
          }

          // Check compliance
          const compliance = await ConsentManager.validateCompliance(phoneNumber);
          if (!compliance.compliant) {
            return NextResponse.json(
              {
                error: 'Lead has opted out of WhatsApp messages',
                compliance: compliance,
              },
              { status: 400 }
            );
          }

          const now = new Date();
          const docId = `wam_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

          // Save note in Bunny DB
          const note = await createBunnyLeadNote({
            leadId,
            createdByUserId: userId,
            note: `[WhatsApp] ${followupNotes.trim()}`,
            metadata: {
              source: 'leads-followup-page',
              actionType: 'whatsapp',
              messageId: docId,
            },
          });

          // Attempt send via WhatsApp service
          let waMessageId = null;
          try {
            const apiResult = await sendWhatsAppText(phoneNumber, followupNotes.trim());
            waMessageId = apiResult.waMessageId;
          } catch (sendErr: any) {
            console.warn('[Lead Followup WhatsApp] Send warning:', sendErr.message);
          }

          return NextResponse.json(
            {
              success: true,
              message: 'WhatsApp message processed',
              data: { note, waMessageId },
            },
            { status: 201 }
          );
        } catch (err: any) {
          return NextResponse.json(
            { error: `Error queuing WhatsApp message: ${err.message}` },
            { status: 500 }
          );
        }
      }

      case 'email': {
        if (!followupNotes?.trim()) {
          return NextResponse.json(
            { error: 'Email message is required' },
            { status: 400 }
          );
        }

        const note = await createBunnyLeadNote({
          leadId,
          createdByUserId: userId,
          note: `[Email] ${followupNotes.trim()}`,
          metadata: {
            source: 'leads-followup-page',
            actionType: 'email',
          },
        });

        return NextResponse.json(
          {
            success: true,
            message: 'Email note saved successfully',
            data: note,
          },
          { status: 201 }
        );
      }

      case 'sms': {
        if (!followupNotes?.trim()) {
          return NextResponse.json(
            { error: 'SMS message is required' },
            { status: 400 }
          );
        }

        const note = await createBunnyLeadNote({
          leadId,
          createdByUserId: userId,
          note: `[SMS] ${followupNotes.trim()}`,
          metadata: {
            source: 'leads-followup-page',
            actionType: 'sms',
          },
        });

        return NextResponse.json(
          {
            success: true,
            message: 'SMS note saved successfully',
            data: note,
          },
          { status: 201 }
        );
      }

      default:
        return NextResponse.json(
          { error: `Unknown action type: ${actionType}` },
          { status: 400 }
        );
    }
  } catch (error: any) {
    console.error('Error saving followup:', error);
    return NextResponse.json(
      { error: 'Failed to save followup' },
      { status: 500 }
    );
  }
}
