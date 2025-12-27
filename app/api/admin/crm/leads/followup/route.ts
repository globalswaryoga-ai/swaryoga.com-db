import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Lead, LeadNote, LeadFollowUp, WhatsAppMessage, WhatsAppScheduledJob } from '@/lib/schemas/enterpriseSchemas';
import { verifyToken } from '@/lib/auth';
import { ConsentManager } from '@/lib/consentManager';
import { sendWhatsAppText } from '@/lib/whatsapp';
import { Types } from 'mongoose';

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

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    // Verify admin token
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);

    if (!decoded?.isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized - admin access required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { leadId, followupNotes, status, actionType, lastUpdated, reminderDate, nextFollowupDate, nextFollowupDetails, selectedLabels, ...extras } = body;

    // Validate required fields
    if (!leadId || !actionType) {
      return NextResponse.json(
        { error: 'leadId and actionType are required' },
        { status: 400 }
      );
    }

    // Validate leadId is valid MongoDB ObjectId
    if (!Types.ObjectId.isValid(leadId)) {
      return NextResponse.json(
        { error: 'Invalid leadId format' },
        { status: 400 }
      );
    }

    // Verify lead exists
    const lead = await Lead.findById(leadId);
    if (!lead) {
      return NextResponse.json(
        { error: 'Lead not found' },
        { status: 404 }
      );
    }

    const userId = decoded.userId || decoded.username || 'system';

    // Handle different action types
    switch (actionType) {
      case 'notes': {
        if (!followupNotes?.trim()) {
          return NextResponse.json(
            { error: 'Note content is required' },
            { status: 400 }
          );
        }
        const note = new LeadNote({
          leadId,
          createdByUserId: userId,
          note: followupNotes,
          metadata: { source: 'leads-followup-page' },
        });
        await note.save();
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

        const reminder = new LeadFollowUp({
          leadId,
          createdByUserId: userId,
          assignedToUserId: userId,
          title: 'Reminder',
          description: followupNotes,
          dueAt,
          timezone: 'Asia/Kolkata',
          status: 'open',
          metadata: { source: 'leads-followup-page', actionType: 'reminder' },
        });
        await reminder.save();
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

        const followup = new LeadFollowUp({
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
        await followup.save();
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

        // Save todos as follow-up items
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

            const followup = new LeadFollowUp({
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
            return followup.save();
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

        // Update lead labels
        const uniqueLabels = Array.from(
          new Set([...(lead.labels || []), ...selectedLabels])
        );
        lead.labels = uniqueLabels;
        await lead.save();

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
          // Get lead with phone number
          const lead = await Lead.findById(leadId);
          if (!lead || !lead.phoneNumber) {
            return NextResponse.json(
              { error: 'Lead phone number not found' },
              { status: 400 }
            );
          }

          // Check compliance
          const compliance = await ConsentManager.validateCompliance(lead.phoneNumber);
          if (!compliance.compliant) {
            return NextResponse.json(
              { 
                error: 'Lead has opted out of WhatsApp messages',
                compliance: compliance 
              },
              { status: 400 }
            );
          }

          // Handle scheduled/delayed vs immediate
          const now = new Date();
          let messageData: any = {
            leadId,
            phoneNumber: lead.phoneNumber,
            direction: 'outbound',
            messageType: extras.whatsappType || 'text',
            messageContent: followupNotes.trim(),
            status: 'queued',
            sentBy: userId,
            sentAt: now,
            retryCount: 0,
            metadata: {
              source: 'leads-followup-page',
              actionType: 'whatsapp',
            },
          };

          // Handle scheduling
          if (extras.whatsappScheduled && extras.whatsappScheduleDate) {
            const scheduledDate = new Date(extras.whatsappScheduleDate);
            if (scheduledDate > now) {
              // Create scheduled job instead of immediate message
              const job = new WhatsAppScheduledJob({
                createdByUserId: userId,
                messageType: extras.whatsappType || 'text',
                messageContent: followupNotes.trim(),
                targetFilters: { leadIds: [leadId] },
                status: 'active',
                frequency: 'once',
                nextRunAt: scheduledDate,
                metadata: { source: 'leads-followup' },
              });
              await job.save();

              // Save note
              const note = new LeadNote({
                leadId,
                createdByUserId: userId,
                note: `[WhatsApp-Scheduled] ${followupNotes}`,
                metadata: {
                  source: 'leads-followup-page',
                  actionType: 'whatsapp-scheduled',
                  scheduledFor: scheduledDate,
                  jobId: job._id,
                },
              });
              await note.save();

              return NextResponse.json(
                {
                  success: true,
                  message: 'WhatsApp message scheduled',
                  data: { note, job },
                },
                { status: 201 }
              );
            }
          }

          // Handle delayed sending
          if (extras.whatsappDelayed && extras.whatsappDelayAmount) {
            const delayMs = 
              (extras.whatsappDelayUnit === 'hours' 
                ? parseInt(extras.whatsappDelayAmount) * 60 * 60 * 1000
                : parseInt(extras.whatsappDelayAmount) * 60 * 1000);
            
            messageData.delayedUntil = new Date(now.getTime() + delayMs);
            messageData.status = 'delayed';
          }

          // Create message record
          const message = new WhatsAppMessage(messageData);
          await message.save();

          // Send immediately if not scheduled/delayed
          if (!extras.whatsappScheduled && !extras.whatsappDelayed) {
            try {
              const apiResult = await sendWhatsAppText(lead.phoneNumber, followupNotes.trim());
              
              // Update message status
              await WhatsAppMessage.findByIdAndUpdate(message._id, {
                status: 'sent',
                waMessageId: apiResult.waMessageId,
                updatedAt: new Date(),
              });

              // Save note
              const note = new LeadNote({
                leadId,
                createdByUserId: userId,
                note: `[WhatsApp-Sent] ${followupNotes}`,
                metadata: {
                  source: 'leads-followup-page',
                  actionType: 'whatsapp-sent',
                  messageId: message._id,
                  sentAt: new Date(),
                },
              });
              await note.save();

              return NextResponse.json(
                {
                  success: true,
                  message: 'WhatsApp message sent successfully',
                  data: { message: note, waMessageId: apiResult.waMessageId },
                },
                { status: 201 }
              );
            } catch (sendError) {
              // Update message as failed
              const errorMsg = sendError instanceof Error ? sendError.message : 'Unknown error';
              await WhatsAppMessage.findByIdAndUpdate(message._id, {
                status: 'failed',
                failureReason: errorMsg,
              });

              // Save note with error
              const note = new LeadNote({
                leadId,
                createdByUserId: userId,
                note: `[WhatsApp-Failed] ${followupNotes} - Error: ${errorMsg}`,
                metadata: {
                  source: 'leads-followup-page',
                  actionType: 'whatsapp-failed',
                  messageId: message._id,
                  error: errorMsg,
                },
              });
              await note.save();

              return NextResponse.json(
                {
                  success: false,
                  message: 'Failed to send WhatsApp message',
                  error: errorMsg,
                  data: note,
                },
                { status: 400 }
              );
            }
          }

          // For delayed messages, save note
          const note = new LeadNote({
            leadId,
            createdByUserId: userId,
            note: `[WhatsApp-${extras.whatsappDelayed ? 'Delayed' : 'Queued'}] ${followupNotes}`,
            metadata: {
              source: 'leads-followup-page',
              actionType: `whatsapp-${extras.whatsappDelayed ? 'delayed' : 'queued'}`,
              messageId: message._id,
            },
          });
          await note.save();

          return NextResponse.json(
            {
              success: true,
              message: `WhatsApp message ${extras.whatsappDelayed ? 'queued for delayed delivery' : 'queued'}`,
              data: note,
            },
            { status: 201 }
          );
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : 'Unknown error';
          return NextResponse.json(
            {
              success: false,
              message: 'Error queuing WhatsApp message',
              error: errorMsg,
            },
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

        // For now, just save as a note with Email metadata
        // In a full implementation, this would queue an email send
        const note = new LeadNote({
          leadId,
          createdByUserId: userId,
          note: `[Email] ${followupNotes}`,
          metadata: {
            source: 'leads-followup-page',
            actionType: 'email',
          },
        });
        await note.save();

        return NextResponse.json(
          {
            success: true,
            message: 'Email queued (TODO: implement actual send)',
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

        // For now, just save as a note with SMS metadata
        // In a full implementation, this would queue an SMS send
        const note = new LeadNote({
          leadId,
          createdByUserId: userId,
          note: `[SMS] ${followupNotes}`,
          metadata: {
            source: 'leads-followup-page',
            actionType: 'sms',
          },
        });
        await note.save();

        return NextResponse.json(
          {
            success: true,
            message: 'SMS queued (TODO: implement actual send)',
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
  } catch (error) {
    console.error('Error saving followup:', error);
    return NextResponse.json(
      { error: 'Failed to save followup' },
      { status: 500 }
    );
  }
}
