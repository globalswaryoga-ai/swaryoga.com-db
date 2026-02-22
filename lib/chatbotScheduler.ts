/**
 * Chatbot Scheduled Action Processor
 * 
 * Handles delayed messages and wait-for-reply timeouts in chatbot flows.
 * Called by a cron job to process due actions.
 */

import { connectDB } from '@/lib/db';
import { getChatbotScheduledAction, getChatbotFlow, Lead, getWhatsAppMessage } from '@/lib/schemas/enterpriseSchemas';
import { normalizePhone, sendWhatsAppText, sendWhatsAppPresence, sendWhatsAppInteractiveButtons } from '@/lib/whatsapp';

export type ChatbotSchedulerResult = {
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

/**
 * Send a WhatsApp text message and log it to the database so it appears in Meta inbox
 */
async function sendAndLogMessage(lead: any, phone: string, text: string, flowId: string, nodeId?: string): Promise<void> {
  const WhatsAppMessage = getWhatsAppMessage();
  const { getWhatsAppEnv } = await import('@/lib/whatsapp');
  const env = getWhatsAppEnv();
  const senderNumber = env?.phoneNumber || '9779006820';
  const now = new Date();

  const msg = await WhatsAppMessage.create({
    leadId: lead._id,
    phoneNumber: phone,
    direction: 'outbound',
    messageType: 'text',
    messageContent: text,
    status: 'queued',
    sentAt: now,
    metadata: { chatbot: { flowId, nodeId, scheduled: true } },
    provider: 'meta',
    senderNumber,
  });

  try {
    const result = await sendWhatsAppText(phone, text);
    await WhatsAppMessage.updateOne(
      { _id: msg._id },
      { $set: { status: 'sent', waMessageId: result.waMessageId, updatedAt: new Date() } }
    );
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : 'Send failed';
    await WhatsAppMessage.updateOne(
      { _id: msg._id },
      { $set: { status: 'failed', failureReason: errMsg, updatedAt: new Date() } }
    );
    throw err;
  }
}

/**
 * Send interactive buttons via WhatsApp and log to database
 */
async function sendAndLogInteractiveMessage(
  lead: any,
  phone: string,
  bodyText: string,
  buttons: Array<{ id: string; title: string }>,
  flowId: string,
  nodeId?: string
): Promise<void> {
  const WhatsAppMessage = getWhatsAppMessage();
  const { getWhatsAppEnv } = await import('@/lib/whatsapp');
  const env = getWhatsAppEnv();
  const senderNumber = env?.phoneNumber || '9779006820';
  const now = new Date();
  const meta = { chatbot: { flowId, nodeId, scheduled: true } };

  // If body contains a URL, split into 2 messages so the link preview/thumbnail shows
  const hasUrl = /https?:\/\/\S+/i.test(bodyText);

  if (hasUrl && bodyText.trim()) {
    // Step 1: Regular text message with URL (gets link preview/thumbnail)
    const textMsg = await WhatsAppMessage.create({
      leadId: lead._id, phoneNumber: phone, direction: 'outbound',
      messageType: 'text', messageContent: bodyText, status: 'queued',
      sentAt: now, metadata: meta, provider: 'meta', senderNumber,
    });
    try {
      const r = await sendWhatsAppText(phone, bodyText);
      await WhatsAppMessage.updateOne({ _id: textMsg._id }, { $set: { status: 'sent', waMessageId: r.waMessageId, updatedAt: new Date() } });
    } catch (err) {
      const e = err instanceof Error ? err.message : 'Send failed';
      await WhatsAppMessage.updateOne({ _id: textMsg._id }, { $set: { status: 'failed', failureReason: e, updatedAt: new Date() } });
    }

    await sleep(1000);

    // Step 2: Interactive buttons with short prompt
    const btnPrompt = 'Please reply after watching:';
    const labels = buttons.map((b, i) => `${i + 1}. ${b.title}`).join('\n');
    const btnMsg = await WhatsAppMessage.create({
      leadId: lead._id, phoneNumber: phone, direction: 'outbound',
      messageType: 'interactive', messageContent: `${btnPrompt}\n\n${labels}`, status: 'queued',
      sentAt: new Date(), metadata: meta, provider: 'meta', senderNumber,
    });
    try {
      const r = await sendWhatsAppInteractiveButtons(phone, btnPrompt, buttons);
      await WhatsAppMessage.updateOne({ _id: btnMsg._id }, { $set: { status: 'sent', waMessageId: r.waMessageId, updatedAt: new Date() } });
    } catch (err) {
      const e = err instanceof Error ? err.message : 'Send failed';
      await WhatsAppMessage.updateOne({ _id: btnMsg._id }, { $set: { status: 'failed', failureReason: e, updatedAt: new Date() } });
      throw err;
    }
    return;
  }

  // No URL — single interactive message
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
    metadata: meta,
    provider: 'meta',
    senderNumber,
  });

  try {
    const result = await sendWhatsAppInteractiveButtons(phone, bodyText, buttons);
    await WhatsAppMessage.updateOne(
      { _id: msg._id },
      { $set: { status: 'sent', waMessageId: result.waMessageId, updatedAt: new Date() } }
    );
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : 'Send failed';
    await WhatsAppMessage.updateOne(
      { _id: msg._id },
      { $set: { status: 'failed', failureReason: errMsg, updatedAt: new Date() } }
    );
    throw err;
  }
}

/**
 * Spintax processing: {Hello|Hi|Hey} becomes one of the options randomly
 */
function applySpintax(text: string): string {
  if (!text) return '';
  return text.replace(/\{([^}]+)\}/g, (_, group) => {
    const options = group.split('|');
    return options[Math.floor(Math.random() * options.length)];
  });
}

/**
 * Process a single node and return the message to send
 */
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
      presenceDelay: node.presenceDelay || 1
    };
  }
  
  if (node.type === 'question' || node.type === 'buttons') {
    let text = node.messageText || node.questionText || '';
    
    const result: any = {
      text: applySpintax(text) || 'Please choose:',
      nextNodeId: null, // Wait for user input, don't auto-advance
      presenceType: node.presenceType || 'composing',
      presenceDelay: node.presenceDelay || 1
    };
    
    if (node.type === 'buttons' && node.options?.length > 0) {
      result.interactiveButtons = node.options.slice(0, 3).map((o: any, i: number) => ({
        id: `btn_${i}_${(o.value || o.label || i).toString().substring(0, 20)}`,
        title: String(o.label || '').substring(0, 20)
      }));
    }
    
    return result;
  }
  
  if (node.type === 'end') {
    return {
      text: applySpintax(node.messageText || 'Thank you!'),
      nextNodeId: null,
      presenceType: 'composing',
      presenceDelay: 1
    };
  }
  
  // For other node types (delay, condition, etc.), skip and find next
  if (node.nextNodeId) {
    const nextNode = flow.nodes?.find((n: any) => n.nodeId === node.nextNodeId);
    return processNode(lead, nextNode, flow);
  }
  
  return null;
}

/**
 * Execute a single scheduled action
 */
async function executeAction(action: any): Promise<{ status: 'ok' | 'error'; error?: string }> {
  const ChatbotScheduledAction = getChatbotScheduledAction();
  const ChatbotFlow = getChatbotFlow();
  
  try {
    const lead = await Lead.findById(action.leadId).lean();
    if (!lead) {
      return { status: 'error', error: 'Lead not found' };
    }
    
    const flow = await ChatbotFlow.findById(action.flowId).lean();
    if (!flow) {
      return { status: 'error', error: 'Flow not found' };
    }
    
    const phone = normalizePhone((lead as any).phoneNumber);
    if (!phone) {
      return { status: 'error', error: 'Invalid phone number' };
    }
    
    if (action.actionType === 'delayed_message') {
      // Process the target node after delay
      const targetNode = (flow as any).nodes?.find((n: any) => n.nodeId === action.targetNodeId);
      if (!targetNode) {
        return { status: 'error', error: 'Target node not found' };
      }
      
      const result = await processNode(lead, targetNode, flow);
      if (result?.text || result?.interactiveButtons?.length) {
        // Send presence indicator first
        if (result.presenceType) {
          try {
            await sendWhatsAppPresence(phone, result.presenceType as any);
            await sleep((result.presenceDelay || 1) * 1000);
          } catch (e) {
            console.warn('[ChatbotScheduler] Presence failed:', e);
          }
        }
        
        // Send the message — interactive buttons or plain text
        if (result.interactiveButtons?.length) {
          await sendAndLogInteractiveMessage(lead, phone, result.text || 'Please choose:', result.interactiveButtons, String((flow as any)._id), action.targetNodeId);
          console.log(`[ChatbotScheduler] Sent interactive buttons to ${phone}`);
        } else {
          await sendAndLogMessage(lead, phone, result.text!, String((flow as any)._id), action.targetNodeId);
          console.log(`[ChatbotScheduler] Sent delayed message to ${phone}`);
        }
        
        // Update lead state and handle delay chaining
        const newNodeId = result.nextNodeId || action.targetNodeId;
        if (targetNode.type === 'question' || targetNode.type === 'buttons') {
          // Wait for user input
          await Lead.updateOne(
            { _id: action.leadId },
            { $set: { 'metadata.chatbotFlowState': { 
              flowId: String((flow as any)._id), 
              nodeId: newNodeId, 
              updatedAt: new Date() 
            } } }
          );
        } else if (result.nextNodeId) {
          // Check if the next node is a delay — if so, schedule it
          const afterNode = (flow as any).nodes?.find((n: any) => n.nodeId === result.nextNodeId);
          
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
              actionType: 'delayed_message',
              status: 'pending',
              sourceNodeId: afterNode.nodeId,
              targetNodeId: afterNode.nextNodeId,
              executeAt,
              metadata: { delaySec, chainedFromScheduler: true }
            });
            await Lead.updateOne(
              { _id: action.leadId },
              { $set: { 'metadata.chatbotFlowState': { 
                flowId: String((flow as any)._id), 
                nodeId: afterNode.nodeId,
                scheduledAt: executeAt,
                updatedAt: new Date() 
              } } }
            );
            console.log(`[ChatbotScheduler] Chained delay: ${delaySec}s → execute at ${executeAt.toISOString()}`);
          } else {
            // Auto-advance to next node
            await Lead.updateOne(
              { _id: action.leadId },
              { $set: { 'metadata.chatbotFlowState': { 
                flowId: String((flow as any)._id), 
                nodeId: result.nextNodeId, 
                updatedAt: new Date() 
              } } }
            );
          }
        } else {
          // Flow ended
          await Lead.updateOne(
            { _id: action.leadId },
            { $unset: { 'metadata.chatbotFlowState': 1, 'metadata.chatbotVariables': 1 } }
          );
        }
      }
      
      return { status: 'ok' };
    }
    
    if (action.actionType === 'wait_reply_timeout') {
      // Check if user already replied (action should be cancelled)
      const currentState = (lead as any)?.metadata?.chatbotFlowState;
      if (!currentState?.waitingForReply) {
        console.log(`[ChatbotScheduler] Wait reply already handled for ${phone}`);
        return { status: 'ok' };
      }
      
      // User didn't reply in time - go to timeout path
      const timeoutNodeId = action.timeoutNodeId;
      if (timeoutNodeId) {
        const timeoutNode = (flow as any).nodes?.find((n: any) => n.nodeId === timeoutNodeId);
        if (timeoutNode) {
          const result = await processNode(lead, timeoutNode, flow);
          if (result?.text || result?.interactiveButtons?.length) {
            if (result.presenceType) {
              try {
                await sendWhatsAppPresence(phone, result.presenceType as any);
                await sleep((result.presenceDelay || 1) * 1000);
              } catch (e) {
                console.warn('[ChatbotScheduler] Presence failed:', e);
              }
            }
            
            if (result.interactiveButtons?.length) {
              await sendAndLogInteractiveMessage(lead, phone, result.text || 'Please choose:', result.interactiveButtons, String((flow as any)._id), timeoutNodeId);
            } else {
              await sendAndLogMessage(lead, phone, result.text!, String((flow as any)._id), timeoutNodeId);
            }
            console.log(`[ChatbotScheduler] Sent timeout message to ${phone}`);
          }
          
          // Update state
          if (result?.nextNodeId) {
            await Lead.updateOne(
              { _id: action.leadId },
              { $set: { 'metadata.chatbotFlowState': { 
                flowId: String((flow as any)._id), 
                nodeId: result.nextNodeId, 
                updatedAt: new Date() 
              } } }
            );
          } else if (timeoutNode.type === 'end') {
            await Lead.updateOne(
              { _id: action.leadId },
              { $unset: { 'metadata.chatbotFlowState': 1, 'metadata.chatbotVariables': 1 } }
            );
          }
        }
      } else {
        // No timeout node - just end the waiting
        await Lead.updateOne(
          { _id: action.leadId },
          { $set: { 'metadata.chatbotFlowState.waitingForReply': false, 'metadata.chatbotFlowState.timedOut': true } }
        );
      }
      
      return { status: 'ok' };
    }
    
    return { status: 'error', error: `Unknown action type: ${action.actionType}` };
  } catch (err) {
    console.error('[ChatbotScheduler] Action failed:', err);
    return { status: 'error', error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

/**
 * Process all due chatbot scheduled actions
 */
export async function runDueChatbotActions(options?: {
  now?: Date;
  limit?: number;
}): Promise<ChatbotSchedulerResult> {
  await connectDB();
  
  const now = options?.now || new Date();
  const limit = options?.limit || 100;
  
  const ChatbotScheduledAction = getChatbotScheduledAction();
  
  const result: ChatbotSchedulerResult = {
    scannedActions: 0,
    executedActions: 0,
    delayedMessages: 0,
    timeoutActions: 0,
    failedActions: 0,
    actionResults: [],
  };
  
  // Find due actions
  const dueActions = await ChatbotScheduledAction.find({
    status: 'pending',
    executeAt: { $lte: now },
  })
    .sort({ executeAt: 1 })
    .limit(limit)
    .lean();
  
  result.scannedActions = dueActions.length;
  console.log(`[ChatbotScheduler] Found ${dueActions.length} due actions`);
  
  for (const action of dueActions) {
    const actionId = String((action as any)._id);
    const actionType = (action as any).actionType;
    
    // Mark as processing
    await ChatbotScheduledAction.updateOne(
      { _id: actionId },
      { $set: { status: 'processing' } }
    );
    
    const execResult = await executeAction(action);
    
    result.actionResults.push({
      actionId,
      actionType,
      status: execResult.status,
      error: execResult.error,
    });
    
    if (execResult.status === 'ok') {
      result.executedActions++;
      if (actionType === 'delayed_message') result.delayedMessages++;
      if (actionType === 'wait_reply_timeout') result.timeoutActions++;
      
      await ChatbotScheduledAction.updateOne(
        { _id: actionId },
        { $set: { status: 'completed', executedAt: now } }
      );
    } else {
      result.failedActions++;
      
      // Retry up to 3 times
      const retryCount = ((action as any).retryCount || 0) + 1;
      if (retryCount < 3) {
        await ChatbotScheduledAction.updateOne(
          { _id: actionId },
          { 
            $set: { 
              status: 'pending', 
              executeAt: new Date(now.getTime() + 60000), // Retry in 1 minute
              lastError: execResult.error,
              retryCount
            } 
          }
        );
      } else {
        await ChatbotScheduledAction.updateOne(
          { _id: actionId },
          { $set: { status: 'failed', lastError: execResult.error, executedAt: now } }
        );
      }
    }
  }
  
  console.log(`[ChatbotScheduler] Completed: ${result.executedActions} executed, ${result.failedActions} failed`);
  return result;
}
