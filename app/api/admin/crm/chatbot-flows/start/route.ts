import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { tenantFilter, getViewerUserId } from '@/lib/crm-handlers';
import { connectDB } from '@/lib/db';
import { getLead, getWhatsAppMessage, getChatbotFlow, getWhatsAppTemplate, getChatbotScheduledAction } from '@/lib/schemas/enterpriseSchemas';
import { normalizePhone, sendWhatsAppText, sendWhatsAppPresence, sendWhatsAppInteractiveButtons } from '@/lib/whatsapp';

export const dynamic = 'force-dynamic';

function applySpintax(text: string): string {
  return text.replace(/\{([^{}]+)\}/g, (_, options) => {
    const parts = options.split('|').map((s: string) => s.trim());
    return parts[Math.floor(Math.random() * parts.length)] || '';
  });
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * POST /api/admin/crm/chatbot-flows/start
 * 
 * Assigns a chatbot flow to a lead AND immediately sends the first node's message.
 * This allows admins to start a flow during a 24-hour window without waiting
 * for the customer to send a message first.
 * 
 * Body: { flowId: string, leadId: string }
 */
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const tf = tenantFilter(decoded);

    const body = await request.json().catch(() => null);
    if (!body?.flowId || !body?.leadId) {
      return NextResponse.json({ success: false, error: 'Missing flowId or leadId' }, { status: 400 });
    }

    await connectDB();
    const Lead = getLead();
    const WhatsAppMessage = getWhatsAppMessage();
    const ChatbotFlow = getChatbotFlow();

    // Load lead and flow
    const lead = await Lead.findOne({ _id: body.leadId, ...tf }).lean() as any;
    if (!lead) {
      return NextResponse.json({ success: false, error: 'Lead not found' }, { status: 404 });
    }

    if (lead.isBlocked) {
      return NextResponse.json({ success: false, error: 'Lead is blocked' }, { status: 403 });
    }

    const flow = await ChatbotFlow.findOne({ _id: body.flowId, ...tf }).lean() as any;
    if (!flow || !flow.enabled) {
      return NextResponse.json({ success: false, error: 'Flow not found or disabled' }, { status: 404 });
    }

    const phone = normalizePhone(lead.phoneNumber || '');
    if (!phone) {
      return NextResponse.json({ success: false, error: 'Lead has no phone number' }, { status: 400 });
    }

    const now = new Date();
    const startNodeId = flow.startNodeId;
    if (!startNodeId) {
      return NextResponse.json({ success: false, error: 'Flow has no start node' }, { status: 400 });
    }

    const startNode = flow.nodes?.find((n: any) => n.nodeId === startNodeId);
    if (!startNode) {
      return NextResponse.json({ success: false, error: 'Start node not found in flow' }, { status: 400 });
    }

    console.log(`[FlowStart] Starting flow "${flow.name}" for lead ${phone}, startNode: ${startNodeId} (${startNode.type})`);

    // Helper: send text message and log it
    async function sendAndLog(text: string, metadata?: any) {
      const { getWhatsAppEnv } = await import('@/lib/whatsapp');
      const env = getWhatsAppEnv();
      const senderNumber = env?.phoneNumber || '9779006820';

      // Handle presence
      const presenceType = metadata?.presenceType || 'composing';
      const presenceDelay = Number(metadata?.presenceDelay || 1);
      if (presenceType && presenceType !== 'none') {
        try {
          await sendWhatsAppPresence(phone, presenceType as any);
          if (presenceDelay > 0) await sleep(Math.min(presenceDelay, 5) * 1000);
        } catch (_) {}
      }

      let finalText = metadata?.spintaxEnabled ? applySpintax(text) : text;

      const msg = await WhatsAppMessage.create({
        leadId: lead._id,
        phoneNumber: phone,
        direction: 'outbound',
        messageType: 'text',
        messageContent: finalText,
        status: 'queued',
        sentAt: now,
        metadata: { chatbot: { flowId: flow._id, nodeId: metadata?.nodeId, autoStart: true } },
        provider: 'meta',
        senderNumber,
      });

      try {
        const result = await sendWhatsAppText(phone, finalText);
        await WhatsAppMessage.updateOne(
          { _id: msg._id },
          { $set: { status: 'sent', waMessageId: result.waMessageId, updatedAt: new Date() } }
        );
        return { success: true, waMessageId: result.waMessageId };
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : 'Send failed';
        await WhatsAppMessage.updateOne(
          { _id: msg._id },
          { $set: { status: 'failed', failureReason: errMsg, updatedAt: new Date() } }
        );
        return { success: false, error: errMsg };
      }
    }

    // Helper: send interactive buttons
    async function sendAndLogInteractive(bodyText: string, buttons: Array<{id: string; title: string}>, metadata?: any) {
      const { getWhatsAppEnv, extractYouTubeVideoId } = await import('@/lib/whatsapp');
      const env = getWhatsAppEnv();
      const senderNumber = env?.phoneNumber || '9779006820';
      const chatbotMeta = { chatbot: { flowId: flow._id, nodeId: metadata?.nodeId, autoStart: true } };

      const presenceType = metadata?.presenceType || 'composing';
      const presenceDelay = Number(metadata?.presenceDelay || 1);
      if (presenceType && presenceType !== 'none') {
        try {
          await sendWhatsAppPresence(phone, presenceType as any);
          if (presenceDelay > 0) await sleep(Math.min(presenceDelay, 5) * 1000);
        } catch (_) {}
      }

      // Extract YouTube thumbnail if body contains a YouTube URL
      const ytId = extractYouTubeVideoId(bodyText);
      const headerImageUrl = ytId ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg` : undefined;

      const labels = buttons.map((b, i) => `${i + 1}. ${b.title}`).join('\n');
      const displayContent = bodyText ? `${bodyText}\n\n${labels}` : labels;

      const msg = await WhatsAppMessage.create({
        leadId: lead._id,
        phoneNumber: phone,
        direction: 'outbound',
        messageType: 'interactive',
        messageContent: displayContent,
        status: 'queued',
        sentAt: now,
        metadata: chatbotMeta,
        provider: 'meta',
        senderNumber,
      });

      try {
        const result = await sendWhatsAppInteractiveButtons(phone, bodyText, buttons, { headerImageUrl });
        await WhatsAppMessage.updateOne(
          { _id: msg._id },
          { $set: { status: 'sent', waMessageId: result.waMessageId, updatedAt: new Date() } }
        );
        return { success: true, waMessageId: result.waMessageId };
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : 'Send failed';
        await WhatsAppMessage.updateOne(
          { _id: msg._id },
          { $set: { status: 'failed', failureReason: errMsg, updatedAt: new Date() } }
        );
        return { success: false, error: errMsg };
      }
    }

    // Helper: send template
    async function sendTemplate(node: any) {
      const TemplateModel = getWhatsAppTemplate();
      let tplDoc: any = null;
      if (node.templateId) tplDoc = await TemplateModel.findOne({ _id: node.templateId, ...tf }).lean();
      if (!tplDoc && node.templateName) tplDoc = await TemplateModel.findOne({ templateName: node.templateName, ...tf }).lean();
      
      if (!tplDoc) {
        console.warn(`[FlowStart] Template not found: ${node.templateName || node.templateId}`);
        return sendAndLog(`[Template: ${node.templateName || 'unknown'}]`, { nodeId: node.nodeId });
      }

      const { sendWhatsAppTemplate, buildCloudTemplateSendInput } = await import('@/lib/whatsapp');
      const { getWhatsAppEnv } = await import('@/lib/whatsapp');
      const env = getWhatsAppEnv();
      const senderNumber = env?.phoneNumber || '9779006820';

      const msg = await WhatsAppMessage.create({
        leadId: lead._id,
        phoneNumber: phone,
        direction: 'outbound',
        messageType: 'template',
        messageContent: `[Template: ${(tplDoc as any).templateName}]`,
        status: 'queued',
        sentAt: now,
        metadata: { chatbot: { flowId: flow._id, nodeId: node.nodeId, autoStart: true }, templateName: (tplDoc as any).templateName },
        provider: 'meta',
        senderNumber,
      });

      try {
        const templateInput = buildCloudTemplateSendInput(tplDoc, phone);
        const result = await sendWhatsAppTemplate(templateInput);
        await WhatsAppMessage.updateOne(
          { _id: msg._id },
          { $set: { status: 'sent', waMessageId: result.waMessageId, updatedAt: new Date() } }
        );
        return { success: true };
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : 'Template send failed';
        await WhatsAppMessage.updateOne(
          { _id: msg._id },
          { $set: { status: 'failed', failureReason: errMsg, updatedAt: new Date() } }
        );
        return { success: false, error: errMsg };
      }
    }

    // ====== Process the start node and send its message ======
    let nextStateNodeId = startNode.nextNodeId || '';
    let sentMessages: string[] = [];

    // Process the start node based on its type
    if (startNode.type === 'message') {
      const text = startNode.messageText || '';
      if (text) {
        const res = await sendAndLog(text, { 
          nodeId: startNodeId, 
          spintaxEnabled: startNode.spintaxEnabled,
          presenceType: startNode.presenceType,
          presenceDelay: startNode.presenceDelay 
        });
        sentMessages.push(text);
        if (!res.success) {
          return NextResponse.json({ success: false, error: `Failed to send first message: ${res.error}` }, { status: 500 });
        }
      }
      // Message nodes auto-advance
      nextStateNodeId = startNode.nextNodeId || '';
    }

    if (startNode.type === 'question' || startNode.type === 'buttons') {
      let text = startNode.messageText || startNode.questionText || '';
      if (startNode.type === 'buttons' && startNode.options?.length > 0) {
        const btns = startNode.options.slice(0, 3).map((o: any, i: number) => ({
          id: `btn_${i}_${(o.value || o.label || i).toString().substring(0, 20)}`,
          title: String(o.label || '').substring(0, 20)
        }));
        const res = await sendAndLogInteractive(text || 'Please choose:', btns, {
          nodeId: startNodeId,
          presenceType: startNode.presenceType,
          presenceDelay: startNode.presenceDelay
        });
        sentMessages.push(text || '[Buttons]');
        if (!res.success) {
          return NextResponse.json({ success: false, error: `Failed to send first message: ${res.error}` }, { status: 500 });
        }
      } else if (text) {
        const res = await sendAndLog(text, {
          nodeId: startNodeId,
          spintaxEnabled: startNode.spintaxEnabled,
          presenceType: startNode.presenceType,
          presenceDelay: startNode.presenceDelay
        });
        sentMessages.push(text);
        if (!res.success) {
          return NextResponse.json({ success: false, error: `Failed to send first message: ${res.error}` }, { status: 500 });
        }
      }
      // Question/button nodes wait for user response, so state stays at startNodeId
      nextStateNodeId = startNodeId;
    }

    if (startNode.type === 'template') {
      const res = await sendTemplate(startNode);
      sentMessages.push(`[Template]`);
      if (!res.success) {
        return NextResponse.json({ success: false, error: `Failed to send template: ${(res as any).error}` }, { status: 500 });
      }
      // If template has buttons, stay at this node waiting for button click
      if (startNode.templateButtons?.length > 0) {
        nextStateNodeId = startNodeId;
      } else {
        nextStateNodeId = startNode.nextNodeId || '';
      }
    }

    // For message->message chains: auto-send the next few message nodes too (up to 5 to prevent infinite loops)
    let chainCount = 0;
    while (nextStateNodeId && chainCount < 5) {
      const nextNode = flow.nodes?.find((n: any) => n.nodeId === nextStateNodeId);
      if (!nextNode) break;

      // Stop chaining at interactive nodes (user needs to respond)
      if (['question', 'buttons', 'end', 'wait_reply', 'condition', 'crm_update', 'template'].includes(nextNode.type)) {
        // If it's a question/buttons/end node, send it and then wait
        if (nextNode.type === 'question' || nextNode.type === 'buttons') {
          let text = nextNode.messageText || nextNode.questionText || '';
          if (nextNode.type === 'buttons' && nextNode.options?.length > 0) {
            const btns = nextNode.options.slice(0, 3).map((o: any, i: number) => ({
              id: `btn_${i}_${(o.value || o.label || i).toString().substring(0, 20)}`,
              title: String(o.label || '').substring(0, 20)
            }));
            await sleep(1000);
            await sendAndLogInteractive(text || 'Please choose:', btns, { nodeId: nextNode.nodeId, presenceType: nextNode.presenceType, presenceDelay: nextNode.presenceDelay });
            sentMessages.push(text || '[Buttons]');
          } else if (text) {
            await sleep(1000);
            await sendAndLog(text, { nodeId: nextNode.nodeId, presenceType: nextNode.presenceType, presenceDelay: nextNode.presenceDelay });
            sentMessages.push(text);
          }
          nextStateNodeId = nextNode.nodeId; // Wait at this node for user input
        } else if (nextNode.type === 'end') {
          const text = nextNode.messageText || 'Thank you!';
          await sleep(1000);
          await sendAndLog(text, { nodeId: nextNode.nodeId });
          sentMessages.push(text);
          nextStateNodeId = ''; // Flow complete
        } else if (nextNode.type === 'template') {
          await sleep(1000);
          await sendTemplate(nextNode);
          sentMessages.push('[Template]');
          if (nextNode.templateButtons?.length > 0) {
            nextStateNodeId = nextNode.nodeId;
          } else {
            nextStateNodeId = nextNode.nextNodeId || '';
          }
        }
        break;
      }

      // Delay nodes
      if (nextNode.type === 'delay') {
        let delaySec = nextNode.delaySeconds || 0;
        if (nextNode.delayMinutes) delaySec += nextNode.delayMinutes * 60;
        if (nextNode.delayHours) delaySec += nextNode.delayHours * 3600;
        if (delaySec <= 30) {
          await sleep(delaySec * 1000);
          nextStateNodeId = nextNode.nextNodeId || '';
          chainCount++;
          continue;
        } else {
          // Long delay: schedule it
          const ChatbotScheduledAction = getChatbotScheduledAction();
          const executeAt = new Date(now.getTime() + delaySec * 1000);
          await ChatbotScheduledAction.create({
            leadId: lead._id,
            phoneNumber: phone,
            flowId: flow._id,
            actionType: 'delayed_message',
            status: 'pending',
            sourceNodeId: nextNode.nodeId,
            targetNodeId: nextNode.nextNodeId,
            executeAt,
            metadata: { delaySec, autoStart: true }
          });
          nextStateNodeId = nextNode.nodeId;
          break;
        }
      }

      // Message node in chain - send it
      if (nextNode.type === 'message') {
        const text = nextNode.messageText || '';
        if (text) {
          await sleep(1000); // Brief pause between messages
          await sendAndLog(text, { nodeId: nextNode.nodeId, spintaxEnabled: nextNode.spintaxEnabled, presenceType: nextNode.presenceType, presenceDelay: nextNode.presenceDelay });
          sentMessages.push(text);
        }
        nextStateNodeId = nextNode.nextNodeId || '';
        chainCount++;
        continue;
      }

      // CRM update node - apply and continue
      if (nextNode.type === 'crm_update') {
        if (nextNode.leadUpdates && typeof nextNode.leadUpdates === 'object') {
          await Lead.updateOne({ _id: lead._id, ...tf }, { $set: nextNode.leadUpdates });
        }
        nextStateNodeId = nextNode.nextNodeId || '';
        chainCount++;
        continue;
      }

      // Unknown node type, stop
      break;
    }

    // ====== Save the flow state on the lead ======
    const flowState: any = {
      flowId: body.flowId,
      nodeId: nextStateNodeId || '',
      updatedAt: now,
      autoStarted: true,
      startedBy: decoded.userId || decoded.username || 'admin',
    };

    // If we're at a template node with buttons, save button info
    if (nextStateNodeId) {
      const stateNode = flow.nodes?.find((n: any) => n.nodeId === nextStateNodeId);
      if (stateNode?.type === 'template' && stateNode.templateButtons?.length > 0) {
        flowState.templateButtons = stateNode.templateButtons;
      }
    }

    if (nextStateNodeId) {
      // Flow is in progress
      await Lead.updateOne(
        { _id: lead._id, ...tf },
        { $set: { 'metadata.chatbotFlowState': flowState } }
      );
    } else {
      // Flow completed (end node or no next node)
      await Lead.updateOne(
        { _id: lead._id, ...tf },
        { $unset: { 'metadata.chatbotFlowState': 1, 'metadata.chatbotVariables': 1 } }
      );
    }

    // Assign labels from start node if defined
    if (Array.isArray(startNode.assignLabels) && startNode.assignLabels.length > 0) {
      await Lead.updateOne({ _id: lead._id, ...tf }, { $addToSet: { labels: { $each: startNode.assignLabels } } });
    }

    console.log(`[FlowStart] ✅ Flow "${flow.name}" started for ${phone}. Sent ${sentMessages.length} message(s). State: node=${nextStateNodeId || 'completed'}`);

    return NextResponse.json({
      success: true,
      message: `Flow started! Sent ${sentMessages.length} message(s) immediately.`,
      sentCount: sentMessages.length,
      currentNode: nextStateNodeId || null,
      flowCompleted: !nextStateNodeId,
    });
  } catch (err) {
    console.error('[FlowStart] Error:', err);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
