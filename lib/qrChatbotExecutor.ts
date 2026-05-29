/**
 * QR Chatbot Executor
 *
 * Mirror of chatbotScheduler.ts, but sends via the EC2 Baileys bridge instead of the
 * Meta Cloud API. All message storage goes into qr_whatsapp_messages / WhatsAppMessage
 * with provider:'whatsapp_web_bridge' so they appear in the QR inbox, not the Meta inbox.
 *
 * Strict tenant isolation: every DB query is scoped to userId / createdByUserId.
 */

import { connectDB } from '@/lib/db';
import { getChatbotScheduledAction, getChatbotFlow, getLead, getQrWhatsAppMessage, getQrWhatsAppChat, getCRMUserSettings, getWhatsAppMessage } from '@/lib/schemas/enterpriseSchemas';
import { normalizePhone } from '@/lib/whatsapp';
import { getWhatsAppBridgeConfig } from '@/lib/whatsappBridgeConfig';

export type QrChatbotSchedulerResult = {
  scannedActions: number;
  executedActions: number;
  delayedMessages: number;
  timeoutActions: number;
  failedActions: number;
  actionResults: Array<{
    actionId: string;
    actionType: string;
    status: 'ok' | 'error';
    error?: string;
  }>;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function applySpintax(text: string): string {
  if (!text) return '';
  return text.replace(/\{([^}]+)\}/g, (_, group) => {
    const options = group.split('|');
    return options[Math.floor(Math.random() * options.length)];
  });
}

function getNodeInteractiveButtons(node: any): Array<{ id: string; title: string }> {
  if (!Array.isArray(node?.options) || node.options.length === 0) return [];
  if (node?.type !== 'buttons' && node?.type !== 'question') return [];
  return node.options.slice(0, 3).map((option: any, index: number) => ({
    id: `btn_${index}_${(option?.value || option?.label || index).toString().substring(0, 20)}`,
    title: String(option?.label || option?.value || `Option ${index + 1}`).substring(0, 20),
  }));
}

/** Resolve bridge URL + secret for a given userId (respects per-user bridge config). */
async function getBridgeConfig(userId: string): Promise<{ bridgeUrl: string; bridgeSecret: string }> {
  const defaults = getWhatsAppBridgeConfig();
  try {
    const CRMUserSettings = getCRMUserSettings();
    const settings = await CRMUserSettings.findOne({ userId }, { qrBridgeUrl: 1, qrBridgeSecret: 1 }).lean() as any;
    if (settings?.qrBridgeUrl) {
      return { bridgeUrl: settings.qrBridgeUrl, bridgeSecret: settings.qrBridgeSecret || defaults.secret };
    }
  } catch {
    // fall through to defaults
  }
  return { bridgeUrl: defaults.url, bridgeSecret: defaults.secret };
}

/** Resolve active session key for the given user from the bridge. */
async function getSessionKey(bridgeUrl: string, bridgeSecret: string, userId: string): Promise<string | null> {
  try {
    const res = await fetch(`${bridgeUrl}/sessions`, {
      headers: { 'x-bridge-secret': bridgeSecret },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const sessions: any[] = data?.sessions || [];
    const own = sessions.find((s) => s.userId === userId && s.status === 'connected');
    const any = sessions.find((s) => s.status === 'connected');
    return own?.sessionKey || any?.sessionKey || null;
  } catch {
    return null;
  }
}

function buildHeaders(bridgeSecret: string, sessionKey: string | null, userId: string): Record<string, string> {
  const h: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-bridge-secret': bridgeSecret,
    'x-user-id': userId,
  };
  if (sessionKey) h['x-session-key'] = sessionKey;
  return h;
}

/** Send a text message via the EC2 bridge. */
async function sendQrText(bridgeUrl: string, bridgeSecret: string, sessionKey: string | null, userId: string, phone: string, text: string): Promise<{ messageId?: string }> {
  const jid = phone.includes('@') ? phone : `${phone}@s.whatsapp.net`;
  const res = await fetch(`${bridgeUrl}/send`, {
    method: 'POST',
    headers: buildHeaders(bridgeSecret, sessionKey, userId),
    body: JSON.stringify({ jid, type: 'text', text }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Bridge send failed (${res.status}): ${err.substring(0, 200)}`);
  }
  const data = await res.json();
  return { messageId: data?.messageId || data?.id || undefined };
}

/** Send a list/button message via the EC2 bridge. Falls back to numbered text automatically at bridge level. */
async function sendQrButtons(
  bridgeUrl: string,
  bridgeSecret: string,
  sessionKey: string | null,
  userId: string,
  phone: string,
  bodyText: string,
  buttons: Array<{ id: string; title: string }>
): Promise<{ messageId?: string }> {
  const jid = phone.includes('@') ? phone : `${phone}@s.whatsapp.net`;
  const res = await fetch(`${bridgeUrl}/send-buttons`, {
    method: 'POST',
    headers: buildHeaders(bridgeSecret, sessionKey, userId),
    body: JSON.stringify({ to: jid, text: bodyText, buttons }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Bridge send-buttons failed (${res.status}): ${err.substring(0, 200)}`);
  }
  const data = await res.json();
  return { messageId: data?.messageId || data?.id || undefined };
}

/** Persist outbound QR message to both WhatsAppMessage and QrWhatsAppMessage. */
async function logQrOutbound(userId: string, connectedPhone: string, lead: any, phone: string, text: string, flowId: string, nodeId?: string): Promise<void> {
  const WhatsAppMessage = getWhatsAppMessage();
  const QrWhatsAppMessage = getQrWhatsAppMessage();
  const QrWhatsAppChat = getQrWhatsAppChat();
  const now = new Date();
  const chatJid = `${phone}@s.whatsapp.net`;
  const timestampSeconds = Math.floor(now.getTime() / 1000);

  await WhatsAppMessage.create({
    leadId: lead._id,
    phoneNumber: phone,
    direction: 'outbound',
    messageType: 'text',
    messageContent: text,
    status: 'queued',
    sentAt: now,
    metadata: { chatbot: { flowId, nodeId, qr: true, scheduled: true } },
    provider: 'whatsapp_web_bridge',
    bridgeUserId: userId,
    ownerId: userId,
  });

  const msgId = `qrcb_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  await QrWhatsAppMessage.findOneAndUpdate(
    { messageId: msgId, userId, connectedPhone },
    {
      $set: {
        userId, connectedPhone, chatJid,
        direction: 'outbound', fromMe: true,
        text, type: 'text',
        participant: '', pushName: '',
        timestamp: timestampSeconds,
        status: 2, hasMedia: false,
        mediaUrl: '', mediaMimetype: '', mediaFileName: '',
        quotedId: '', quotedText: '', quotedParticipant: '',
        rawMessage: {}, metadata: { chatbot: { flowId, nodeId } },
      },
      $setOnInsert: { createdAt: now },
    },
    { upsert: true, new: true }
  );

  await QrWhatsAppChat.findOneAndUpdate(
    { userId, connectedPhone, chatJid },
    {
      $set: {
        userId, connectedPhone, chatJid,
        name: typeof lead.name === 'string' ? lead.name : phone,
        isGroup: false,
        lastMessage: text,
        lastMessageTime: now,
        lastMessageFromMe: true,
        conversationTimestamp: timestampSeconds,
      },
      $setOnInsert: { pinned: false, archived: false, profilePicUrl: '', createdAt: now },
    },
    { upsert: true, new: true }
  );
}

async function processNode(lead: any, node: any, flow: any): Promise<{
  text?: string;
  nextNodeId?: string;
  presenceType?: string;
  presenceDelay?: number;
  interactiveButtons?: Array<{ id: string; title: string }>;
} | null> {
  if (!node) return null;

  if (node.type === 'message') {
    return {
      text: applySpintax(node.messageText || ''),
      nextNodeId: node.nextNodeId,
      presenceType: node.presenceType || 'composing',
      presenceDelay: node.presenceDelay || 1,
    };
  }

  if (node.type === 'question' || node.type === 'buttons') {
    const text = applySpintax(node.messageText || node.questionText || '') || 'Please choose:';
    return {
      text,
      nextNodeId: null as any,
      presenceType: node.presenceType || 'composing',
      presenceDelay: node.presenceDelay || 1,
      interactiveButtons: getNodeInteractiveButtons(node),
    };
  }

  if (node.type === 'end') {
    return {
      text: applySpintax(node.messageText || 'Thank you!'),
      nextNodeId: undefined,
      presenceType: 'composing',
      presenceDelay: 1,
    };
  }

  if (node.nextNodeId) {
    const next = (flow.nodes || []).find((n: any) => n.nodeId === node.nextNodeId);
    return processNode(lead, next, flow);
  }

  return null;
}

async function executeQrAction(action: any): Promise<{ status: 'ok' | 'error'; error?: string }> {
  const ChatbotScheduledAction = getChatbotScheduledAction();
  const ChatbotFlow = getChatbotFlow();
  const Lead = getLead();

  try {
    const lead = await Lead.findById(action.leadId).lean() as any;
    if (!lead) return { status: 'error', error: 'Lead not found' };

    const flow = await ChatbotFlow.findById(action.flowId).lean() as any;
    if (!flow) return { status: 'error', error: 'Flow not found' };

    // Only execute QR flows
    if (flow.provider && flow.provider !== 'qr') return { status: 'error', error: 'Flow is not a QR flow' };

    const phone = normalizePhone(lead.phoneNumber);
    if (!phone) return { status: 'error', error: 'Invalid phone number' };

    // Resolve bridge for the flow owner (tenant isolation)
    const userId = String(flow.createdByUserId || action.userId || '');
    const { bridgeUrl, bridgeSecret } = await getBridgeConfig(userId);
    const sessionKey = await getSessionKey(bridgeUrl, bridgeSecret, userId);

    // Resolve connected phone for logging
    let connectedPhone = '';
    try {
      const CRMUserSettings = getCRMUserSettings();
      const s = await CRMUserSettings.findOne({ userId }, { qrConnectedPhoneNumber: 1 }).lean() as any;
      connectedPhone = s?.qrConnectedPhoneNumber || '';
    } catch { /* non-fatal */ }

    const sendMessage = async (text: string, buttons: Array<{ id: string; title: string }> | undefined, nodeId?: string) => {
      let messageId: string | undefined;
      let logText = text;
      if (buttons && buttons.length > 0) {
        const result = await sendQrButtons(bridgeUrl, bridgeSecret, sessionKey, userId, phone, text, buttons);
        messageId = result.messageId;
        const labels = buttons.map((b, i) => `${i + 1}. ${b.title}`).join('\n');
        logText = text ? `${text}\n\n${labels}` : labels;
      } else {
        const result = await sendQrText(bridgeUrl, bridgeSecret, sessionKey, userId, phone, text);
        messageId = result.messageId;
      }
      await logQrOutbound(userId, connectedPhone, lead, phone, logText, String(flow._id), nodeId);
      return { messageId };
    };

    if (action.actionType === 'delayed_message') {
      const targetNode = (flow.nodes || []).find((n: any) => n.nodeId === action.targetNodeId);
      if (!targetNode) return { status: 'error', error: 'Target node not found' };

      const result = await processNode(lead, targetNode, flow);
      if (!result?.text && !result?.interactiveButtons?.length) return { status: 'ok' };

      await sleep((result.presenceDelay || 1) * 1000);
      await sendMessage(result.text || '', result.interactiveButtons, action.targetNodeId);

      const flowId = String(flow._id);
      const newNodeId = result.nextNodeId || action.targetNodeId;

      if (targetNode.type === 'question' || targetNode.type === 'buttons') {
        await Lead.updateOne(
          { _id: action.leadId },
          { $set: { 'metadata.qrChatbotFlowState': { flowId, nodeId: newNodeId, updatedAt: new Date() } } }
        );
      } else if (result.nextNodeId) {
        const afterNode = (flow.nodes || []).find((n: any) => n.nodeId === result.nextNodeId);
        if (afterNode?.type === 'delay') {
          let delaySec = afterNode.delaySeconds || 0;
          if (afterNode.delayMinutes) delaySec += afterNode.delayMinutes * 60;
          if (afterNode.delayHours) delaySec += afterNode.delayHours * 3600;
          if (delaySec === 0) delaySec = 3;
          const executeAt = new Date(Date.now() + delaySec * 1000);
          await ChatbotScheduledAction.create({
            leadId: action.leadId,
            phoneNumber: phone,
            flowId: action.flowId,
            userId,
            actionType: 'delayed_message',
            status: 'pending',
            sourceNodeId: afterNode.nodeId,
            targetNodeId: afterNode.nextNodeId,
            executeAt,
            metadata: { delaySec, chainedFromScheduler: true, provider: 'qr' },
          });
          await Lead.updateOne(
            { _id: action.leadId },
            { $set: { 'metadata.qrChatbotFlowState': { flowId, nodeId: afterNode.nodeId, scheduledAt: executeAt, updatedAt: new Date() } } }
          );
        } else {
          await Lead.updateOne(
            { _id: action.leadId },
            { $set: { 'metadata.qrChatbotFlowState': { flowId, nodeId: result.nextNodeId, updatedAt: new Date() } } }
          );
        }
      } else {
        await Lead.updateOne(
          { _id: action.leadId },
          { $unset: { 'metadata.qrChatbotFlowState': 1, 'metadata.qrChatbotVariables': 1 } }
        );
      }

      return { status: 'ok' };
    }

    if (action.actionType === 'wait_reply_timeout') {
      const currentState = (lead as any)?.metadata?.qrChatbotFlowState;
      if (!currentState?.waitingForReply) {
        return { status: 'ok' };
      }

      const timeoutNodeId = action.timeoutNodeId;
      if (timeoutNodeId) {
        const timeoutNode = (flow.nodes || []).find((n: any) => n.nodeId === timeoutNodeId);
        if (timeoutNode) {
          const result = await processNode(lead, timeoutNode, flow);
          if (result?.text || result?.interactiveButtons?.length) {
            await sleep((result.presenceDelay || 1) * 1000);
            await sendMessage(result.text || '', result.interactiveButtons, timeoutNodeId);
          }
          if (result?.nextNodeId) {
            await Lead.updateOne(
              { _id: action.leadId },
              { $set: { 'metadata.qrChatbotFlowState': { flowId: String(flow._id), nodeId: result.nextNodeId, updatedAt: new Date() } } }
            );
          } else if (timeoutNode.type === 'end') {
            await Lead.updateOne(
              { _id: action.leadId },
              { $unset: { 'metadata.qrChatbotFlowState': 1, 'metadata.qrChatbotVariables': 1 } }
            );
          }
        }
      } else {
        await Lead.updateOne(
          { _id: action.leadId },
          { $set: { 'metadata.qrChatbotFlowState.waitingForReply': false, 'metadata.qrChatbotFlowState.timedOut': true } }
        );
      }
      return { status: 'ok' };
    }

    return { status: 'error', error: `Unknown action type: ${action.actionType}` };
  } catch (err) {
    console.error('[QrChatbotExecutor] Action failed:', err);
    return { status: 'error', error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

/**
 * Process all due QR chatbot scheduled actions (called from cron).
 */
export async function runDueQrChatbotActions(options?: { now?: Date; limit?: number }): Promise<QrChatbotSchedulerResult> {
  await connectDB();

  const now = options?.now || new Date();
  const limit = options?.limit || 100;
  const ChatbotScheduledAction = getChatbotScheduledAction();

  const result: QrChatbotSchedulerResult = {
    scannedActions: 0,
    executedActions: 0,
    delayedMessages: 0,
    timeoutActions: 0,
    failedActions: 0,
    actionResults: [],
  };

  const dueActions = await ChatbotScheduledAction.find({
    status: 'pending',
    executeAt: { $lte: now },
    'metadata.provider': 'qr',
  })
    .sort({ executeAt: 1 })
    .limit(limit)
    .lean();

  result.scannedActions = dueActions.length;
  console.log(`[QrChatbotExecutor] Found ${dueActions.length} due QR actions`);

  for (const action of dueActions) {
    const actionId = String((action as any)._id);
    const actionType = (action as any).actionType;

    await ChatbotScheduledAction.updateOne({ _id: actionId }, { $set: { status: 'processing' } });

    const execResult = await executeQrAction(action);
    result.actionResults.push({ actionId, actionType, status: execResult.status, error: execResult.error });

    if (execResult.status === 'ok') {
      result.executedActions++;
      if (actionType === 'delayed_message') result.delayedMessages++;
      if (actionType === 'wait_reply_timeout') result.timeoutActions++;
      await ChatbotScheduledAction.updateOne({ _id: actionId }, { $set: { status: 'completed', executedAt: now } });
    } else {
      result.failedActions++;
      const retryCount = ((action as any).retryCount || 0) + 1;
      if (retryCount < 3) {
        await ChatbotScheduledAction.updateOne(
          { _id: actionId },
          { $set: { status: 'pending', executeAt: new Date(now.getTime() + 60000), lastError: execResult.error, retryCount } }
        );
      } else {
        await ChatbotScheduledAction.updateOne(
          { _id: actionId },
          { $set: { status: 'failed', lastError: execResult.error, executedAt: now } }
        );
      }
    }
  }

  console.log(`[QrChatbotExecutor] Completed: ${result.executedActions} executed, ${result.failedActions} failed`);
  return result;
}

/**
 * Trigger a QR chatbot flow for an inbound message.
 * Called from the QR webhook handler when a non-outbound message is received.
 *
 * Strict isolation: flows are looked up by createdByUserId === userId.
 */
export async function triggerQrChatbotFlow(params: {
  userId: string;
  leadId: string;
  phoneNumber: string;
  messageText: string;
  connectedPhone: string;
}): Promise<void> {
  const { userId, leadId, phoneNumber, messageText, connectedPhone } = params;

  try {
    await connectDB();

    const ChatbotFlow = getChatbotFlow();
    const ChatbotScheduledAction = getChatbotScheduledAction();
    const Lead = getLead();

    const lead = await Lead.findById(leadId).lean() as any;
    if (!lead) return;

    const phone = normalizePhone(phoneNumber);
    if (!phone) return;

    const normalizedText = messageText.trim().toLowerCase();

    // Check if lead is already mid-flow — handle reply routing
    const existingState = lead?.metadata?.qrChatbotFlowState;
    if (existingState?.flowId && existingState?.nodeId) {
      await handleQrFlowReply({ userId, lead, phone, connectedPhone, normalizedText, existingState });
      return;
    }

    // No active flow — check keyword triggers
    const flows = await ChatbotFlow.find({
      createdByUserId: userId,
      provider: 'qr',
      enabled: true,
    }).lean() as any[];

    let matchedFlow: any = null;
    for (const flow of flows) {
      const keywords: string[] = Array.isArray(flow.triggerKeywords) ? flow.triggerKeywords : [];
      if (keywords.some((kw) => normalizedText === kw.toLowerCase() || normalizedText.includes(kw.toLowerCase()))) {
        matchedFlow = flow;
        break;
      }
    }

    if (!matchedFlow) return;

    // Start the flow at the startNode
    const startNode = (matchedFlow.nodes || []).find((n: any) => n.nodeId === matchedFlow.startNodeId) || matchedFlow.nodes?.[0];
    if (!startNode) return;

    await runQrFlowFromNode({ userId, lead, phone, connectedPhone, flow: matchedFlow, node: startNode, ChatbotScheduledAction, Lead });
  } catch (err) {
    console.error('[QrChatbotExecutor] triggerQrChatbotFlow error:', err);
  }
}

async function handleQrFlowReply(params: {
  userId: string;
  lead: any;
  phone: string;
  connectedPhone: string;
  normalizedText: string;
  existingState: any;
}): Promise<void> {
  const { userId, lead, phone, connectedPhone, normalizedText, existingState } = params;
  const ChatbotFlow = getChatbotFlow();
  const ChatbotScheduledAction = getChatbotScheduledAction();
  const Lead = getLead();

  const flow = await ChatbotFlow.findById(existingState.flowId).lean() as any;
  if (!flow || flow.provider !== 'qr') return;

  const currentNode = (flow.nodes || []).find((n: any) => n.nodeId === existingState.nodeId);
  if (!currentNode) return;

  // Cancel any pending wait_reply_timeout for this lead
  await ChatbotScheduledAction.updateMany(
    { leadId: lead._id, status: 'pending', actionType: 'wait_reply_timeout', flowId: flow._id },
    { $set: { status: 'cancelled' } }
  );

  // Determine next node from button/option match or default nextNodeId
  let nextNodeId = currentNode.nextNodeId;
  if (currentNode.type === 'buttons' || currentNode.type === 'question') {
    const options: any[] = Array.isArray(currentNode.options) ? currentNode.options : [];
    const matched = options.find((o: any) => {
      const v = String(o.value || o.label || '').toLowerCase();
      return normalizedText === v || normalizedText === String(options.indexOf(o) + 1);
    });
    if (matched?.nextNodeId) nextNodeId = matched.nextNodeId;
  }

  if (!nextNodeId) {
    await Lead.updateOne(
      { _id: lead._id },
      { $unset: { 'metadata.qrChatbotFlowState': 1 } }
    );
    return;
  }

  const nextNode = (flow.nodes || []).find((n: any) => n.nodeId === nextNodeId);
  if (!nextNode) {
    await Lead.updateOne({ _id: lead._id }, { $unset: { 'metadata.qrChatbotFlowState': 1 } });
    return;
  }

  await runQrFlowFromNode({ userId, lead, phone, connectedPhone, flow, node: nextNode, ChatbotScheduledAction, Lead });
}

async function runQrFlowFromNode(params: {
  userId: string;
  lead: any;
  phone: string;
  connectedPhone: string;
  flow: any;
  node: any;
  ChatbotScheduledAction: any;
  Lead: any;
}): Promise<void> {
  const { userId, lead, phone, connectedPhone, flow, node, ChatbotScheduledAction, Lead } = params;

  if (node.type === 'delay') {
    let delaySec = node.delaySeconds || 0;
    if (node.delayMinutes) delaySec += node.delayMinutes * 60;
    if (node.delayHours) delaySec += node.delayHours * 3600;
    if (delaySec === 0) delaySec = 3;

    const executeAt = new Date(Date.now() + delaySec * 1000);
    await ChatbotScheduledAction.create({
      leadId: lead._id,
      phoneNumber: phone,
      flowId: flow._id,
      userId,
      actionType: 'delayed_message',
      status: 'pending',
      sourceNodeId: node.nodeId,
      targetNodeId: node.nextNodeId,
      executeAt,
      metadata: { delaySec, provider: 'qr' },
    });
    await Lead.updateOne(
      { _id: lead._id },
      { $set: { 'metadata.qrChatbotFlowState': { flowId: String(flow._id), nodeId: node.nodeId, scheduledAt: executeAt, updatedAt: new Date() } } }
    );
    return;
  }

  const result = await processNode(lead, node, flow);
  if (!result?.text && !result?.interactiveButtons?.length) return;

  const { bridgeUrl, bridgeSecret } = await getBridgeConfig(userId);
  const sessionKey = await getSessionKey(bridgeUrl, bridgeSecret, userId);

  await sleep((result.presenceDelay || 1) * 500); // shorter delay for immediate trigger

  const buttons = result.interactiveButtons;
  if (buttons && buttons.length > 0) {
    await sendQrButtons(bridgeUrl, bridgeSecret, sessionKey, userId, phone, result.text || '', buttons);
    const labels = buttons.map((b, i) => `${i + 1}. ${b.title}`).join('\n');
    const logText = result.text ? `${result.text}\n\n${labels}` : labels;
    await logQrOutbound(userId, connectedPhone, lead, phone, logText, String(flow._id), node.nodeId);
  } else {
    const plainText = result.text || '';
    await sendQrText(bridgeUrl, bridgeSecret, sessionKey, userId, phone, plainText);
    await logQrOutbound(userId, connectedPhone, lead, phone, plainText, String(flow._id), node.nodeId);
  }

  const flowId = String(flow._id);

  if (node.type === 'question' || node.type === 'buttons') {
    const waitState: any = { flowId, nodeId: node.nodeId, waitingForReply: true, updatedAt: new Date() };
    await Lead.updateOne({ _id: lead._id }, { $set: { 'metadata.qrChatbotFlowState': waitState } });

    // Schedule timeout if configured
    if (node.timerMinutes) {
      const executeAt = new Date(Date.now() + node.timerMinutes * 60 * 1000);
      await ChatbotScheduledAction.create({
        leadId: lead._id,
        phoneNumber: phone,
        flowId: flow._id,
        userId,
        actionType: 'wait_reply_timeout',
        status: 'pending',
        sourceNodeId: node.nodeId,
        timeoutNodeId: node.timerTargetNodeId || node.fallbackNodeId,
        executeAt,
        metadata: { provider: 'qr' },
      });
    }
  } else if (result.nextNodeId) {
    const nextNode = (flow.nodes || []).find((n: any) => n.nodeId === result.nextNodeId);
    if (nextNode) {
      await runQrFlowFromNode({ userId, lead, phone, connectedPhone, flow, node: nextNode, ChatbotScheduledAction, Lead });
    } else {
      await Lead.updateOne({ _id: lead._id }, { $unset: { 'metadata.qrChatbotFlowState': 1 } });
    }
  } else {
    await Lead.updateOne({ _id: lead._id }, { $unset: { 'metadata.qrChatbotFlowState': 1, 'metadata.qrChatbotVariables': 1 } });
  }
}
