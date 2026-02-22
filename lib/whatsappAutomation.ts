import { connectDB } from '@/lib/db';
import { ConsentManager } from '@/lib/consentManager';
import { Lead, WhatsAppAutomationRule, WhatsAppMessage, ChatbotFlow, getChatbotScheduledAction } from '@/lib/schemas/enterpriseSchemas';
import { normalizePhone, sendWhatsAppText, sendWhatsAppPresence } from '@/lib/whatsapp';
import { getBotResponse, searchKnowledgeBase, isAdminAvailable } from '@/lib/chatbot/knowledge-bot';

type InboundContext = {
  leadId: string;
  fromPhone: string;
  body: string;
  now: Date;
  wasFirstInbound: boolean;
};

function getEnvFlag(name: string, defaultValue = false): boolean {
  const v = process.env[name];
  if (v == null) return defaultValue;
  return v === '1' || v.toLowerCase() === 'true' || v.toLowerCase() === 'yes';
}

function isQuestion(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  if (t.includes('?')) return true;
  const lowered = t.toLowerCase();
  return (
    lowered.startsWith('how') ||
    lowered.startsWith('what') ||
    lowered.startsWith('when') ||
    lowered.startsWith('where') ||
    lowered.startsWith('can ') ||
    lowered.startsWith('is ') ||
    lowered.startsWith('do ') ||
    lowered.startsWith('tell ') ||
    lowered.startsWith('price')
  );
}

async function maybeAIReply(lead: any, ctx: InboundContext): Promise<string | null> {
  // First, try knowledge base
  const kbEnabled = getEnvFlag('WHATSAPP_KNOWLEDGE_BASE_ENABLED', true);
  if (kbEnabled) {
    try {
      const kbResult = await searchKnowledgeBase(ctx.body, { preferShortAnswer: true });
      if (kbResult.found && kbResult.confidence >= 0.6) {
        console.log(`[AI Reply] Using knowledge base answer (confidence: ${kbResult.confidence})`);
        return kbResult.answer;
      }
    } catch (kbErr) {
      console.warn('[AI Reply] Knowledge base search failed:', kbErr);
    }
  }

  // Fall back to OpenAI if enabled
  const enabled = getEnvFlag('WHATSAPP_AI_AGENT_ENABLED', false);
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';

  if (!enabled || !apiKey) return null;
  if (!isQuestion(ctx.body)) return null;

  // Pull a small recent history for context (avoid huge tokens)
  const recent = await WhatsAppMessage.find({ leadId: lead._id })
    .sort({ sentAt: -1 })
    .limit(8)
    .lean();

  const history = recent
    .reverse()
    .map((m: any) => {
      const role = m.direction === 'inbound' ? 'user' : 'assistant';
      const content = String(m.messageContent || '').slice(0, 800);
      return { role, content };
    })
    .filter((m: any) => m.content);

  const system =
    'You are Swar Yoga CRM assistant on WhatsApp. Reply in a friendly, concise, professional tone. ' +
    'Answer questions about yoga workshops/courses and booking. If information is missing, ask 1-2 short follow-up questions. ' +
    'Do not ask for sensitive data like passwords or OTPs.';

  const payload = {
    model,
    messages: [{ role: 'system', content: system }, ...history, { role: 'user', content: ctx.body }],
    temperature: 0.4,
    max_tokens: 250,
  };

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.error?.message || 'AI provider error';
    throw new Error(String(msg));
  }

  const text = String(data?.choices?.[0]?.message?.content || '').trim();
  return text || null;
}

function matchesConditions(lead: any, conditions: any): boolean {
  if (!conditions || typeof conditions !== 'object') return true;

  if (Array.isArray(conditions.statuses) && conditions.statuses.length > 0) {
    if (!conditions.statuses.includes(String(lead.status))) return false;
  }

  if (typeof conditions.workshopName === 'string' && conditions.workshopName.trim()) {
    if (String(lead.workshopName || '') !== conditions.workshopName.trim()) return false;
  }

  if (typeof conditions.assignedToUserId === 'string' && conditions.assignedToUserId.trim()) {
    if (String(lead.assignedToUserId || '') !== conditions.assignedToUserId.trim()) return false;
  }

  const leadLabels = Array.isArray(lead.labels) ? lead.labels.map(String) : [];

  if (Array.isArray(conditions.labelsAny) && conditions.labelsAny.length > 0) {
    const ok = conditions.labelsAny.some((l: any) => leadLabels.includes(String(l)));
    if (!ok) return false;
  }

  if (Array.isArray(conditions.labelsAll) && conditions.labelsAll.length > 0) {
    const ok = conditions.labelsAll.every((l: any) => leadLabels.includes(String(l)));
    if (!ok) return false;
  }

  return true;
}

function leadThrottleKey(ruleId: string): string {
  return `automation:last:${ruleId}`;
}

async function shouldThrottle(leadId: any, rule: any, now: Date): Promise<boolean> {
  const minutes = typeof rule?.throttleMinutesPerLead === 'number' ? rule.throttleMinutesPerLead : 5;
  if (minutes <= 0) return false;

  const key = leadThrottleKey(String(rule._id));
  const lead = await Lead.findById(leadId).lean();
  const last = (lead as any)?.metadata?.[key];
  if (!last) return false;
  const lastDate = new Date(last);
  if (Number.isNaN(lastDate.getTime())) return false;

  return now.getTime() - lastDate.getTime() < minutes * 60 * 1000;
}

async function markThrottle(leadId: any, rule: any, now: Date) {
  const key = leadThrottleKey(String(rule._id));
  await Lead.updateOne({ _id: leadId }, { $set: { [`metadata.${key}`]: now } });
}

/**
 * Spintax help: {Hello|Hi|Hey} becomes one of the options randomly
 */
function applySpintax(text: string): string {
  if (!text) return text;
  const matches = text.match(/\{[^{}]+\}/g);
  if (!matches) return text;

  let result = text;
  for (const match of matches) {
    const options = match.slice(1, -1).split('|');
    const chosen = options[Math.floor(Math.random() * options.length)];
    result = result.replace(match, chosen);
  }
  
  // Recursive for nested spintax
  if (result.match(/\{[^{}]+\}/g)) {
    return applySpintax(result);
  }
  return result;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function sendOutboundText(lead: any, to: string, text: string, metadata?: any) {
  const compliance = await ConsentManager.validateCompliance(to);
  if (!compliance.compliant) return;

  // Persist outbound message
  const now = new Date();
  const { getWhatsAppEnv } = await import('@/lib/whatsapp');
  const env = getWhatsAppEnv();
  const senderNumber = env?.phoneNumber || '9779006820';

  let finalContent = text;
  // Apply spintax if enabled in metadata or flow node
  if (metadata?.automation?.spintaxEnabled || metadata?.chatbot?.spintaxEnabled) {
    finalContent = applySpintax(text);
  }

  // Handle Presence Delay
  const presenceType = metadata?.chatbot?.presenceType || metadata?.automation?.presenceType;
  const presenceDelay = Number(metadata?.chatbot?.presenceDelay || metadata?.automation?.presenceDelay || 0);

  if (presenceType && presenceType !== 'none') {
    try {
      await sendWhatsAppPresence(to, presenceType as any);
      if (presenceDelay > 0) {
        // Cap delay at 10s to keep lambda/webhook responsive
        await sleep(Math.min(presenceDelay, 10) * 1000);
      }
    } catch (err) {
      console.warn('[Automation] Presence update failed:', err);
    }
  }

  const message = await WhatsAppMessage.create({
    leadId: lead._id,
    phoneNumber: to,
    direction: 'outbound',
    messageType: 'text',
    messageContent: finalContent,
    status: 'queued',
    sentAt: now,
    metadata,
    provider: env ? 'meta' : 'whatsapp_web_bridge',
    senderNumber,
  });

  try {
    const apiResult = await sendWhatsAppText(to, finalContent);
    await WhatsAppMessage.updateOne(
      { _id: message._id },
      { 
        $set: { 
          status: 'sent', 
          waMessageId: apiResult.waMessageId, 
          provider: apiResult.raw?.provider || 'meta',
          senderNumber,
          updatedAt: new Date() 
        }, 
        $unset: { failureReason: 1 } 
      }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'WhatsApp send failed';
    await WhatsAppMessage.updateOne(
      { _id: message._id },
      { $set: { status: 'failed', failureReason: String(msg), updatedAt: new Date() } }
    );
  }
}

async function sendOutboundTemplate(lead: any, to: string, templateId: string, templateVariables?: any, metadata?: any) {
  const { getWhatsAppTemplate } = await import('@/lib/schemas/enterpriseSchemas');
  const TemplateModel = getWhatsAppTemplate();
  const template = await TemplateModel.findById(templateId).lean();
  if (!template) return;

  const compliance = await ConsentManager.validateCompliance(to);
  if (!compliance.compliant) return;

  const now = new Date();
  const { getWhatsAppEnv } = await import('@/lib/whatsapp');
  const env = getWhatsAppEnv();
  const senderNumber = env?.phoneNumber || '9779006820';

  const message = await WhatsAppMessage.create({
    leadId: lead._id,
    phoneNumber: to,
    direction: 'outbound',
    messageType: 'template',
    templateId,
    templateVariables,
    status: 'queued',
    sentAt: now,
    metadata,
    provider: env ? 'meta' : 'whatsapp_web_bridge',
    senderNumber,
  });

  try {
    const { sendWhatsAppTemplate } = await import('@/lib/whatsapp');
    const apiResult = await sendWhatsAppTemplate({
      to,
      templateName: (template as any).templateName,
      language: (template as any).language || 'en',
      bodyParams: Array.isArray(templateVariables) ? templateVariables : [],
    });

    await WhatsAppMessage.updateOne(
      { _id: message._id },
      { 
        $set: { 
          status: 'sent', 
          waMessageId: apiResult.waMessageId, 
          provider: apiResult.raw?.provider || 'meta',
          senderNumber,
          updatedAt: new Date() 
        }, 
        $unset: { failureReason: 1 } 
      }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'WhatsApp template send failed';
    await WhatsAppMessage.updateOne(
      { _id: message._id },
      { $set: { status: 'failed', failureReason: String(msg), updatedAt: new Date() } }
    );
  }
}

async function runSimpleChatbot(lead: any, ctx: InboundContext): Promise<string | null> {
  // Simple lead -> prospect -> customer flow (MVP)
  const md = (lead?.metadata && typeof lead.metadata === 'object') ? lead.metadata : {};
  const state = md.chatbotState && typeof md.chatbotState === 'object' ? md.chatbotState : { stage: 'ask_name' };
  const stage = String(state.stage || 'ask_name');

  const text = ctx.body.trim();

  if (stage === 'ask_name') {
    await Lead.updateOne(
      { _id: lead._id },
      { $set: { 'metadata.chatbotState': { stage: 'ask_interest', updatedAt: ctx.now }, ...(text ? { name: lead.name || text } : {}) } }
    );
    return 'Thank you! Which program are you interested in? (Online / Offline / Residential)';
  }

  if (stage === 'ask_interest') {
    await Lead.updateOne(
      { _id: lead._id },
      { $set: { 'metadata.chatbotState': { stage: 'ask_language', interest: text, updatedAt: ctx.now }, status: 'prospect' } }
    );
    return 'Great. Which language do you prefer? (Hindi / English / Marathi)';
  }

  if (stage === 'ask_language') {
    await Lead.updateOne(
      { _id: lead._id },
      { $set: { 'metadata.chatbotState': { stage: 'done', language: text, updatedAt: ctx.now }, status: 'prospect' } }
    );
    return 'Perfect. Please share your preferred batch date/time, and I will guide you with the next steps.';
  }

  return null;
}

async function advanceChatbotFlow(lead: any, ctx: InboundContext, flow: any): Promise<any | null> {
  const md = lead?.metadata || {};
  const state = md.chatbotFlowState || { flowId: String(flow._id), nodeId: flow.startNodeId };
  
  // ===== DUPLICATE MESSAGE PREVENTION =====
  // If this exact node was already processed for this message, skip
  const lastProcessedMsg = state.lastProcessedMessageBody;
  const lastProcessedNode = state.lastProcessedNodeId;
  const lastProcessedAt = state.lastProcessedAt ? new Date(state.lastProcessedAt).getTime() : 0;
  const timeSinceLastProcess = ctx.now.getTime() - lastProcessedAt;
  
  // Prevent duplicate: same node + same message body within 30 seconds
  if (
    lastProcessedNode === state.nodeId &&
    lastProcessedMsg === ctx.body &&
    timeSinceLastProcess < 30000 &&
    ctx.body !== '' // Allow empty body for auto-advance
  ) {
    console.log(`[Chatbot] DEDUP: Skipping duplicate - same node ${state.nodeId}, same message "${ctx.body.substring(0,30)}..." within ${Math.round(timeSinceLastProcess/1000)}s`);
    return null;
  }
  
  // Track this processing
  await Lead.updateOne(
    { _id: lead._id },
    { $set: {
      'metadata.chatbotFlowState.lastProcessedMessageBody': ctx.body,
      'metadata.chatbotFlowState.lastProcessedNodeId': state.nodeId,
      'metadata.chatbotFlowState.lastProcessedAt': ctx.now
    } }
  );
  // ===== END DUPLICATE PREVENTION =====
  
  // If user changed flows or something went wrong, restart or stay
  if (state.flowId !== String(flow._id)) {
    state.flowId = String(flow._id);
    state.nodeId = flow.startNodeId;
  }

  const currentNode = flow.nodes?.find((n: any) => n.nodeId === state.nodeId);
  if (!currentNode) return null;

  console.log(`[Chatbot] Lead ${ctx.fromPhone} at node ${state.nodeId} (${currentNode.type})`);

  let nextNodeId = currentNode.nextNodeId;
  let replyObj: any = null;

  // ==========================================
  // 0) Check if user was waiting for reply and just responded
  // ==========================================
  if (state.waitingForReply && ctx.body.trim()) {
    console.log(`[Chatbot] User replied while waiting - cancelling timeout`);
    
    // Cancel pending timeout action
    const ChatbotScheduledAction = getChatbotScheduledAction();
    await ChatbotScheduledAction.updateMany(
      { leadId: lead._id, actionType: 'wait_reply_timeout', status: 'pending' },
      { $set: { status: 'cancelled', executedAt: ctx.now } }
    );
    
    // Handle reply delay if specified
    const replyDelayMin = state.replyDelayMinutes || currentNode.replyDelayMinutes || 0;
    if (replyDelayMin > 0) {
      console.log(`[Chatbot] Reply delay: ${replyDelayMin} minutes before continuing`);
      
      const executeAt = new Date(ctx.now.getTime() + replyDelayMin * 60 * 1000);
      await ChatbotScheduledAction.create({
        leadId: lead._id,
        phoneNumber: ctx.fromPhone,
        flowId: flow._id,
        actionType: 'delayed_message',
        status: 'pending',
        sourceNodeId: state.nodeId,
        targetNodeId: currentNode.nextNodeId,
        executeAt,
        metadata: { replyDelayMin, userReply: ctx.body.substring(0, 200) }
      });
      
      // Update state to show we're in reply delay
      await Lead.updateOne(
        { _id: lead._id },
        { $set: { 
          'metadata.chatbotFlowState': { 
            flowId: state.flowId, 
            nodeId: state.nodeId, 
            waitingForReply: false,
            replyDelayScheduled: true,
            scheduledAt: executeAt,
            updatedAt: ctx.now 
          } 
        } }
      );
      
      return null; // Message will be sent after delay
    }
    
    // No reply delay - advance immediately
    nextNodeId = currentNode.nextNodeId;
    if (nextNodeId) {
      // Clear waiting state and continue
      await Lead.updateOne(
        { _id: lead._id },
        { $set: { 'metadata.chatbotFlowState': { flowId: state.flowId, nodeId: nextNodeId, updatedAt: ctx.now } } }
      );
      // Fetch updated lead and continue with next node
      const updatedLead = await Lead.findById(lead._id).lean();
      return advanceChatbotFlow(updatedLead, { ...ctx, body: '' }, flow);
    }
  }

  // ==========================================
  // 1) Handle current node based on type
  // ==========================================
  
  // TEMPLATE node with buttons - match user response to template button
  if (currentNode.type === 'template' && state.templateButtons?.length > 0) {
    const userInput = ctx.body.trim().toLowerCase();
    const tplButtons = state.templateButtons;
    
    // Match by number, exact text, or button title
    const numInput = parseInt(userInput, 10);
    let matchedBtn: any = null;
    let matchedIdx = -1;
    
    if (!isNaN(numInput) && numInput >= 1 && numInput <= tplButtons.length) {
      matchedBtn = tplButtons[numInput - 1];
      matchedIdx = numInput - 1;
    }
    if (!matchedBtn) {
      matchedIdx = tplButtons.findIndex((btn: any) => {
        const title = String(btn.title || '').toLowerCase().trim();
        return title === userInput || title.includes(userInput) || userInput.includes(title);
      });
      if (matchedIdx >= 0) matchedBtn = tplButtons[matchedIdx];
    }
    
    if (matchedBtn && matchedBtn.nextNodeId) {
      nextNodeId = matchedBtn.nextNodeId;
      console.log(`[Chatbot] Template button matched: "${matchedBtn.title}" (idx ${matchedIdx}) -> ${nextNodeId}`);
    } else if (matchedBtn) {
      nextNodeId = currentNode.nextNodeId; // Fallback to default next
      console.log(`[Chatbot] Template button matched but no nextNodeId, using default`);
    } else {
      // No match - show button options
      const btnLabels = tplButtons.map((b: any, i: number) => `${i + 1}. ${b.title}`).join('\n');
      return {
        text: `Please choose:\n${btnLabels}`,
        presenceType: 'composing',
        presenceDelay: 1
      };
    }
  }
  
  // BUTTONS node - match user input to button option
  if (currentNode.type === 'buttons') {
    const userInput = ctx.body.trim().toLowerCase();
    
    // First: try exact match by number ("1", "2", "3")
    const numInput = parseInt(userInput, 10);
    let matchedOption: any = null;
    if (!isNaN(numInput) && numInput >= 1 && numInput <= (currentNode.options?.length || 0)) {
      matchedOption = currentNode.options[numInput - 1];
    }
    
    // Second: try exact match by label or value
    if (!matchedOption) {
      matchedOption = currentNode.options?.find((opt: any) => {
        const labelMatch = String(opt.label || '').toLowerCase().trim();
        const valueMatch = String(opt.value || '').toLowerCase().trim();
        return labelMatch === userInput || valueMatch === userInput;
      });
    }
    
    // Third: try contains match (but only if input is 3+ chars to avoid false positives)
    if (!matchedOption && userInput.length >= 3) {
      matchedOption = currentNode.options?.find((opt: any) => {
        const labelMatch = String(opt.label || '').toLowerCase().trim();
        return labelMatch.includes(userInput) || userInput.includes(labelMatch);
      });
    }

    if (matchedOption) {
      nextNodeId = matchedOption.nextNodeId || currentNode.nextNodeId;
      console.log(`[Chatbot] Button matched: "${matchedOption.label}" -> ${nextNodeId}`);
    } else {
      // Show button options again
      const buttonLabels = currentNode.options?.map((o: any, i: number) => `${i + 1}. ${o.label}`).join('\n') || '';
      return { 
        text: `Please choose one of these options:\n${buttonLabels}`,
        spintaxEnabled: false,
        presenceType: 'composing',
        presenceDelay: 1
      };
    }
  }
  
  // QUESTION node - handle user text response
  if (currentNode.type === 'question') {
    const userInput = ctx.body.trim().toLowerCase();
    
    // If multiple choice, match options
    if (currentNode.questionType === 'multiple_choice' && currentNode.options?.length > 0) {
      const matchedOption = currentNode.options?.find((opt: any) => 
        String(opt.label || '').toLowerCase() === userInput || 
        String(opt.value || '').toLowerCase() === userInput
      );
      if (matchedOption) {
        nextNodeId = matchedOption.nextNodeId || currentNode.nextNodeId;
      } else {
        return { text: `Please choose one of: ${currentNode.options.map((o: any) => o.label).join(', ')}` };
      }
    } else {
      // Free text - store in variable if defined
      if (currentNode.variableName) {
        const vars = md.chatbotVariables || {};
        vars[currentNode.variableName] = ctx.body.trim();
        await Lead.updateOne({ _id: lead._id }, { $set: { 'metadata.chatbotVariables': vars } });
      }
      nextNodeId = currentNode.nextNodeId;
    }
  }

  // ==========================================
  // 2) Get the next node and process it
  // ==========================================
  const nextNode = flow.nodes?.find((n: any) => n.nodeId === nextNodeId);
  if (!nextNode) {
    await Lead.updateOne({ _id: lead._id }, { $unset: { 'metadata.chatbotFlowState': 1 } });
    return null;
  }

  console.log(`[Chatbot] Advancing to next node: ${nextNodeId} (${nextNode.type})`);
    
  // Assign labels if defined
  if (Array.isArray(nextNode.assignLabels) && nextNode.assignLabels.length > 0) {
    await Lead.updateOne({ _id: lead._id }, { $addToSet: { labels: { $each: nextNode.assignLabels } } });
  }
  
  // Remove labels if defined
  if (Array.isArray(nextNode.removeLabels) && nextNode.removeLabels.length > 0) {
    await Lead.updateOne({ _id: lead._id }, { $pull: { labels: { $in: nextNode.removeLabels } } });
  }

  // ==========================================
  // 3) Process next node by type
  // ==========================================
  
  // DELAY node - wait, then auto-advance to next node
  if (nextNode.type === 'delay') {
    // Calculate total delay in seconds from flexible unit fields
    let delaySec = nextNode.delaySeconds || 0;
    if (nextNode.delayMinutes) delaySec += nextNode.delayMinutes * 60;
    if (nextNode.delayHours) delaySec += nextNode.delayHours * 3600;
    if (delaySec === 0) delaySec = 3; // Default 3 seconds
    
    console.log(`[Chatbot] Delay node: ${delaySec}s delay`);
    
    // For short delays (30 seconds or less), wait synchronously
    if (delaySec <= 30) {
      await sleep(delaySec * 1000);
      
      // Auto-advance past delay node
      if (nextNode.nextNodeId) {
        await Lead.updateOne(
          { _id: lead._id },
          { $set: { 'metadata.chatbotFlowState': { flowId: state.flowId, nodeId: nextNode.nextNodeId, updatedAt: ctx.now } } }
        );
        return advanceChatbotFlow(lead, { ...ctx, body: '' }, flow);
      }
    } else {
      // For long delays, schedule an action to execute later
      const ChatbotScheduledAction = getChatbotScheduledAction();
      const executeAt = new Date(ctx.now.getTime() + delaySec * 1000);
      
      await ChatbotScheduledAction.create({
        leadId: lead._id,
        phoneNumber: ctx.fromPhone,
        flowId: flow._id,
        actionType: 'delayed_message',
        status: 'pending',
        sourceNodeId: nextNodeId,
        targetNodeId: nextNode.nextNodeId,
        executeAt,
        metadata: { delaySec, flowState: state }
      });
      
      // Update lead state to the delay node (will be advanced by scheduler)
      await Lead.updateOne(
        { _id: lead._id },
        { $set: { 
          'metadata.chatbotFlowState': { 
            flowId: state.flowId, 
            nodeId: nextNodeId, 
            scheduledAt: executeAt,
            updatedAt: ctx.now 
          } 
        } }
      );
      
      console.log(`[Chatbot] Scheduled delayed action for ${executeAt.toISOString()}`);
      return null; // Don't send anything now, scheduler will handle it
    }
  }
  
  // WAIT_REPLY node - wait for user response with timeout
  if (nextNode.type === 'wait_reply') {
    const timeoutMinutes = nextNode.waitTimeoutMinutes || 60;
    const replyDelayMin = nextNode.replyDelayMinutes || 0;
    
    console.log(`[Chatbot] Wait for reply: timeout=${timeoutMinutes}m, replyDelay=${replyDelayMin}m`);
    
    // Schedule a timeout action
    const ChatbotScheduledAction = getChatbotScheduledAction();
    const timeoutAt = new Date(ctx.now.getTime() + timeoutMinutes * 60 * 1000);
    
    // Cancel any existing wait_reply timeouts for this lead
    await ChatbotScheduledAction.updateMany(
      { leadId: lead._id, actionType: 'wait_reply_timeout', status: 'pending' },
      { $set: { status: 'cancelled' } }
    );
    
    await ChatbotScheduledAction.create({
      leadId: lead._id,
      phoneNumber: ctx.fromPhone,
      flowId: flow._id,
      actionType: 'wait_reply_timeout',
      status: 'pending',
      sourceNodeId: nextNodeId,
      targetNodeId: nextNode.nextNodeId, // Continue path if user replies in time
      timeoutNodeId: nextNode.timeoutNodeId || nextNode.fallbackNodeId, // Timeout fallback
      executeAt: timeoutAt,
      waitingForReply: true,
      replyDelayMinutes: replyDelayMin,
      metadata: { timeoutMinutes, flowState: state }
    });
    
    // Update lead state to waiting for reply
    await Lead.updateOne(
      { _id: lead._id },
      { $set: { 
        'metadata.chatbotFlowState': { 
          flowId: state.flowId, 
          nodeId: nextNodeId, 
          waitingForReply: true,
          replyDelayMinutes: replyDelayMin,
          timeoutAt,
          updatedAt: ctx.now 
        } 
      } }
    );
    
    console.log(`[Chatbot] Waiting for reply, timeout at ${timeoutAt.toISOString()}`);
    return null; // Wait for user to reply
  }

  // MESSAGE node - send text
  if (nextNode.type === 'message') {
    replyObj = {
      text: applySpintax(nextNode.messageText || ''),
      spintaxEnabled: nextNode.spintaxEnabled,
      presenceType: nextNode.presenceType || 'composing',
      presenceDelay: nextNode.presenceDelay || 1
    };
    
    // Auto-advance if message has a nextNodeId (it's just info, not expecting input)
    if (nextNode.nextNodeId) {
      await Lead.updateOne(
        { _id: lead._id },
        { $set: { 'metadata.chatbotFlowState': { flowId: state.flowId, nodeId: nextNode.nextNodeId, updatedAt: ctx.now } } }
      );
    }
  }
  
  // QUESTION or BUTTONS node - send and wait for response
  if (nextNode.type === 'question' || nextNode.type === 'buttons') {
    let text = nextNode.messageText || nextNode.questionText || '';
    
    // Add button labels for buttons node
    if (nextNode.type === 'buttons' && nextNode.options?.length > 0) {
      const buttonLabels = nextNode.options.map((o: any, i: number) => `${i + 1}. ${o.label}`).join('\n');
      text = text ? `${text}\n\n${buttonLabels}` : buttonLabels;
    }
    
    replyObj = {
      text: applySpintax(text),
      spintaxEnabled: nextNode.spintaxEnabled,
      presenceType: nextNode.presenceType || 'composing',
      presenceDelay: nextNode.presenceDelay || 1
    };
    
    // Update state to this node (waiting for user input)
    await Lead.updateOne(
      { _id: lead._id },
      { $set: { 'metadata.chatbotFlowState': { flowId: state.flowId, nodeId: nextNodeId, updatedAt: ctx.now } } }
    );
  }
  
  // TEMPLATE node - send WhatsApp template
  if (nextNode.type === 'template') {
    // Look up template by name or ID to get the actual template document
    const { getWhatsAppTemplate } = await import('@/lib/schemas/enterpriseSchemas');
    const WhatsAppTemplateModel = getWhatsAppTemplate();
    let tplDoc: any = null;
    if (nextNode.templateId) {
      tplDoc = await WhatsAppTemplateModel.findById(nextNode.templateId).lean();
    }
    if (!tplDoc && nextNode.templateName) {
      tplDoc = await WhatsAppTemplateModel.findOne({ templateName: nextNode.templateName }).lean();
    }
    
    if (tplDoc) {
      replyObj = {
        isTemplate: true,
        templateId: String(tplDoc._id),
        templateName: (tplDoc as any).templateName,
      };
    } else {
      console.warn(`[Chatbot] Template not found: ${nextNode.templateName || nextNode.templateId}`);
      // Fallback: send template name as text so flow doesn't silently fail
      replyObj = {
        text: `[Template: ${nextNode.templateName || 'unknown'}]`,
        presenceType: 'composing',
        presenceDelay: 1
      };
    }
    
    // Handle template button routing - if user is responding to a template with buttons
    if (nextNode.templateButtons?.length > 0) {
      // Template with buttons: wait for user to click a button
      await Lead.updateOne(
        { _id: lead._id },
        { $set: { 'metadata.chatbotFlowState': { 
          flowId: state.flowId, 
          nodeId: nextNodeId,
          templateButtons: nextNode.templateButtons,
          updatedAt: ctx.now 
        } } }
      );
    } else if (nextNode.nextNodeId) {
      await Lead.updateOne(
        { _id: lead._id },
        { $set: { 'metadata.chatbotFlowState': { flowId: state.flowId, nodeId: nextNode.nextNodeId, updatedAt: ctx.now } } }
      );
    }
  }
  
  // CRM_UPDATE node - update lead and auto-advance
  if (nextNode.type === 'crm_update') {
    if (nextNode.leadUpdates && typeof nextNode.leadUpdates === 'object') {
      await Lead.updateOne({ _id: lead._id }, { $set: nextNode.leadUpdates });
      console.log(`[Chatbot] CRM update applied:`, nextNode.leadUpdates);
    }
    if (nextNode.nextNodeId) {
      await Lead.updateOne(
        { _id: lead._id },
        { $set: { 'metadata.chatbotFlowState': { flowId: state.flowId, nodeId: nextNode.nextNodeId, updatedAt: ctx.now } } }
      );
      return advanceChatbotFlow(lead, { ...ctx, body: '' }, flow);
    }
  }
  
  // CONDITION node - evaluate and branch
  if (nextNode.type === 'condition') {
    const field = nextNode.conditionField || 'text';
    const op = nextNode.conditionOp || 'contains';
    const val = String(nextNode.conditionValue || '').toLowerCase();
    
    let testValue = '';
    if (field === 'text') testValue = ctx.body.toLowerCase();
    else if (field === 'lead_status') testValue = String(lead.status || '').toLowerCase();
    else if (field === 'label') testValue = (lead.labels || []).join(',').toLowerCase();
    
    let matched = false;
    if (op === 'contains') matched = testValue.includes(val);
    else if (op === 'equals') matched = testValue === val;
    else if (op === 'startsWith') matched = testValue.startsWith(val);
    else if (op === 'endsWith') matched = testValue.endsWith(val);
    
    const targetNodeId = matched ? nextNode.nextNodeId : nextNode.fallbackNodeId;
    console.log(`[Chatbot] Condition: ${field} ${op} "${val}" = ${matched} -> ${targetNodeId}`);
    
    if (targetNodeId) {
      await Lead.updateOne(
        { _id: lead._id },
        { $set: { 'metadata.chatbotFlowState': { flowId: state.flowId, nodeId: targetNodeId, updatedAt: ctx.now } } }
      );
      return advanceChatbotFlow(lead, ctx, flow);
    }
  }
  
  // END node - finish flow
  if (nextNode.type === 'end') {
    replyObj = { 
      text: applySpintax(nextNode.messageText || 'Thank you!'),
      presenceType: 'composing',
      presenceDelay: 1
    };
    await Lead.updateOne({ _id: lead._id }, { $unset: { 'metadata.chatbotFlowState': 1, 'metadata.chatbotVariables': 1 } });
  }

  return replyObj;
}

export async function handleInboundWhatsAppAutomations(input: {
  leadId: any;
  phoneNumber: string;
  messageBody: string;
  wasFirstInbound: boolean;
}): Promise<void> {
  await connectDB();

  const now = new Date();
  const fromPhone = normalizePhone(input.phoneNumber);
  const body = String(input.messageBody || '').trim();
  if (!fromPhone || !body) return;

  const lead: any = await Lead.findById(input.leadId).lean();
  if (!lead || Array.isArray(lead)) return;

  // ===== GLOBAL DEDUP: Prevent processing same message twice =====
  const lastAutoBody = (lead as any)?.metadata?._lastAutoProcessedBody;
  const lastAutoAt = (lead as any)?.metadata?._lastAutoProcessedAt;
  if (lastAutoBody === body && lastAutoAt) {
    const elapsed = now.getTime() - new Date(lastAutoAt).getTime();
    if (elapsed < 15000) { // Same message processed within 15 seconds
      console.log(`[Automation] DEDUP: Skipping duplicate automation for "${body.substring(0, 30)}..." (${Math.round(elapsed/1000)}s ago)`);
      return;
    }
  }
  // Mark this message as being processed
  await Lead.updateOne(
    { _id: input.leadId },
    { $set: { 'metadata._lastAutoProcessedBody': body, 'metadata._lastAutoProcessedAt': now } }
  );
  // ===== END GLOBAL DEDUP =====

  // Never auto-respond to opt-out keywords
  const keyword = body.toUpperCase();
  if (keyword === 'STOP' || keyword === 'UNSUBSCRIBE' || keyword === 'OPTOUT') return;

  const ctx: InboundContext = {
    leadId: String(lead._id),
    fromPhone,
    body,
    now,
    wasFirstInbound: Boolean(input.wasFirstInbound),
  };

  // ===== CHATBOT FLOW: Continue existing flow OR auto-start by keyword =====
  try {
    const md = (lead?.metadata && typeof lead.metadata === 'object') ? lead.metadata : {};
    const existingFlowState = md.chatbotFlowState;
    
    if (existingFlowState?.flowId) {
      // Lead already has an active flow - continue it
      const activeFlow = await ChatbotFlow.findById(existingFlowState.flowId).lean();
      if (activeFlow && (activeFlow as any).enabled) {
        console.log(`[Automation] Continuing active flow "${(activeFlow as any).name}" for ${fromPhone}`);
        const reply = await advanceChatbotFlow(lead, ctx, activeFlow);
        if (reply) {
          await Lead.updateOne({ _id: lead._id }, { $set: { 'metadata._chatbot_last_reply_at': now } });
          if (reply.isTemplate && reply.templateId) {
            await sendOutboundTemplate(lead, fromPhone, reply.templateId, [], {
              chatbot: { flowId: String((activeFlow as any)._id) }
            });
          } else if (reply.text) {
            await sendOutboundText(lead, fromPhone, reply.text, {
              chatbot: { flowId: String((activeFlow as any)._id), spintaxEnabled: reply.spintaxEnabled, presenceType: reply.presenceType, presenceDelay: reply.presenceDelay }
            });
          }
          return; // Flow handled this message
        }
      }
    }
    
    // No active flow - check if any flow has trigger keywords matching this message
    const lowerBody = body.toLowerCase().trim();
    const keywordFlows = await ChatbotFlow.find({
      enabled: true,
      triggerKeywords: { $exists: true, $not: { $size: 0 } }
    }).lean();
    
    for (const flow of keywordFlows) {
      const keywords = ((flow as any).triggerKeywords || []).map((k: string) => k.toLowerCase().trim()).filter(Boolean);
      const matched = keywords.some((kw: string) => lowerBody === kw || lowerBody.includes(kw));
      
      if (matched) {
        console.log(`[Automation] Keyword match! Starting flow "${(flow as any).name}" for ${fromPhone}`);
        
        // Set flow state and advance from start
        const startNodeId = (flow as any).startNodeId;
        if (!startNodeId) continue;
        
        await Lead.updateOne(
          { _id: lead._id },
          { $set: { 'metadata.chatbotFlowState': { flowId: String((flow as any)._id), nodeId: startNodeId, updatedAt: now, autoTriggered: true, triggerKeyword: lowerBody } } }
        );
        
        // Reload lead with updated state
        const updatedLead = await Lead.findById(lead._id).lean();
        const reply = await advanceChatbotFlow(updatedLead, { ...ctx, body: '' }, flow);
        
        if (reply) {
          await Lead.updateOne({ _id: lead._id }, { $set: { 'metadata._chatbot_last_reply_at': now } });
          if (reply.isTemplate && reply.templateId) {
            await sendOutboundTemplate(updatedLead || lead, fromPhone, reply.templateId, [], {
              chatbot: { flowId: String((flow as any)._id), autoTriggered: true }
            });
          } else if (reply.text) {
            await sendOutboundText(updatedLead || lead, fromPhone, reply.text, {
              chatbot: { flowId: String((flow as any)._id), autoTriggered: true, spintaxEnabled: reply.spintaxEnabled, presenceType: reply.presenceType, presenceDelay: reply.presenceDelay }
            });
          }
        }
        return; // Flow started, stop processing
      }
    }
  } catch (flowErr) {
    console.error('[Automation] Chatbot flow keyword check error:', flowErr);
  }
  // ===== END CHATBOT FLOW =====

  // Check if knowledge base auto-reply is enabled (when admin unavailable)
  const kbAutoReplyEnabled = getEnvFlag('WHATSAPP_KB_AUTO_REPLY', true);
  if (kbAutoReplyEnabled) {
    try {
      const adminStatus = await isAdminAvailable();
      if (!adminStatus.available) {
        console.log(`[Automation] Admin unavailable (${adminStatus.reason}), checking knowledge base...`);
        const botResponse = await getBotResponse(body, {
          leadId: String(lead._id),
          phoneNumber: fromPhone,
        });
        
        if (botResponse.shouldRespond && botResponse.response) {
          console.log(`[Automation] Sending KB auto-reply (source: ${botResponse.source}, confidence: ${botResponse.confidence})`);
          await sendOutboundText(lead, fromPhone, botResponse.response, {
            automation: { source: botResponse.source, confidence: botResponse.confidence, kb: true }
          });
          return; // Don't process other rules when KB auto-replied
        }
      }
    } catch (kbErr) {
      console.error('[Automation] KB auto-reply error:', kbErr);
    }
  }

  // ===== CHATBOT CONFIG KEYWORDS (from /admin/crm/chatbot settings) =====
  try {
    const mongoose = await import('mongoose');
    const ChatbotConfig = mongoose.default.models.ChatbotConfig || mongoose.default.model('ChatbotConfig', new mongoose.default.Schema({
      key: String,
      enabled: Boolean,
      welcomeMessage: String,
      fallbackMessage: String,
      keywords: [{
        keyword: String,
        response: String,
        action: { type: String, enum: ['reply', 'forward_to_agent', 'send_template'] },
        templateName: String,
      }],
      autoReplyDelay: Number,
      workingHours: mongoose.default.Schema.Types.Mixed,
      aiEnabled: Boolean,
      aiModel: String,
      aiSystemPrompt: String,
      maxAiTokens: Number,
    }, { collection: 'crm_settings' }));

    const chatbotConfig = await ChatbotConfig.findOne({ key: 'chatbot_config' }).lean();
    
    if (chatbotConfig && (chatbotConfig as any).enabled) {
      const configKeywords = (chatbotConfig as any).keywords || [];
      const lowerBody = body.toLowerCase().trim();
      
      console.log(`[Chatbot Config] Checking ${configKeywords.length} keywords against: "${lowerBody}"`);
      
      // Check each keyword
      for (const kw of configKeywords) {
        const kwLower = String(kw.keyword || '').toLowerCase().trim();
        if (!kwLower) continue;
        
        // Match exact or contains
        const isMatch = lowerBody === kwLower || lowerBody.includes(kwLower);
        
        if (isMatch) {
          console.log(`[Chatbot Config] Keyword matched: "${kwLower}" -> action: ${kw.action}`);
          
          // Add delay if configured
          const delay = Number((chatbotConfig as any).autoReplyDelay || 0);
          if (delay > 0) {
            await new Promise(r => setTimeout(r, delay * 1000));
          }
          
          if (kw.action === 'send_template' && kw.templateName) {
            // Send WhatsApp template
            const { getWhatsAppTemplate } = await import('@/lib/schemas/enterpriseSchemas');
            const WhatsAppTemplateModel = getWhatsAppTemplate();
            const template = await WhatsAppTemplateModel.findOne({ templateName: kw.templateName }).lean();
            
            if (template) {
              console.log(`[Chatbot Config] Sending template: ${kw.templateName}`);
              await sendOutboundTemplate(lead, fromPhone, String((template as any)._id), {}, {
                automation: { chatbotConfig: true, keyword: kwLower }
              });
            } else {
              console.warn(`[Chatbot Config] Template not found: ${kw.templateName}`);
              // Fallback to response text if available
              if (kw.response) {
                await sendOutboundText(lead, fromPhone, kw.response, {
                  automation: { chatbotConfig: true, keyword: kwLower }
                });
              }
            }
          } else if (kw.action === 'forward_to_agent') {
            // Send response and mark for agent follow-up
            if (kw.response) {
              await sendOutboundText(lead, fromPhone, kw.response, {
                automation: { chatbotConfig: true, keyword: kwLower, forwardToAgent: true }
              });
            }
            // Update lead to indicate needs attention
            await Lead.updateOne({ _id: lead._id }, { 
              $set: { 
                needsAttention: true, 
                lastBotForward: now,
                updatedAt: now 
              } 
            });
          } else {
            // Default: reply with text
            if (kw.response) {
              await sendOutboundText(lead, fromPhone, kw.response, {
                automation: { chatbotConfig: true, keyword: kwLower }
              });
            }
          }
          
          return; // Stop processing after first keyword match
        }
      }
      
      console.log(`[Chatbot Config] No keyword matched`);
    }
  } catch (chatbotConfigErr) {
    console.error('[Automation] Chatbot config error:', chatbotConfigErr);
  }
  // ===== END CHATBOT CONFIG KEYWORDS =====

  const rules = await WhatsAppAutomationRule.find({ enabled: true })
    .sort({ createdAt: 1 })
    .lean();

  console.log(`[Automation] Processing ${rules.length} rules for ${fromPhone}`);

  for (const rule of rules) {
    if (!matchesConditions(lead, (rule as any).conditions)) {
      console.log(`[Automation] Rule ${(rule as any).name} conditions NOT matched`);
      continue;
    }

    const triggerType = String((rule as any).triggerType || 'welcome');
    console.log(`[Automation] Rule ${(rule as any).name} trigger: ${triggerType}`);

    if (triggerType === 'welcome' && !ctx.wasFirstInbound) continue;

    if (triggerType === 'keyword') {
      const kws = Array.isArray((rule as any).keywords) ? (rule as any).keywords.map((k: any) => String(k).toLowerCase()) : [];
      if (kws.length === 0) continue;
      const lower = ctx.body.toLowerCase();
      const matched = kws.some((k: string) => k && lower.includes(k));
      if (!matched) {
        console.log(`[Automation] Keywords [${kws.join(',')}] not matched in "${lower}"`);
        continue;
      }
    }

    if (triggerType === 'chatbot') {
      console.log(`[Automation] Chatbot trigger active`);
      const { getChatbotFlow } = await import('@/lib/schemas/enterpriseSchemas');
      const ChatbotFlow = getChatbotFlow();
      const activeFlow = await ChatbotFlow.findOne({ enabled: true }).lean();
      
      if (activeFlow) {
        // Throttle chatbot: prevent duplicate replies to same message within 10 seconds
        const chatbotThrottleKey = `metadata._chatbot_last_reply_at`;
        const lastReplyAt = (lead as any)?.metadata?._chatbot_last_reply_at;
        if (lastReplyAt) {
          const elapsed = now.getTime() - new Date(lastReplyAt).getTime();
          if (elapsed < 10000) {
            console.log(`[Automation] Chatbot throttled: last reply ${Math.round(elapsed/1000)}s ago`);
            continue;
          }
        }
        
        try {
          const reply = await advanceChatbotFlow(lead, ctx, activeFlow);
          if (reply) {
            // Mark chatbot reply timestamp to prevent duplicate
            await Lead.updateOne(
              { _id: lead._id },
              { $set: { 'metadata._chatbot_last_reply_at': now } }
            );
            
            if (reply.isTemplate && reply.templateId) {
              // Send WhatsApp template message
              await sendOutboundTemplate(lead, fromPhone, reply.templateId, [], {
                chatbot: { flowId: String(activeFlow._id) }
              });
            } else if (reply.text) {
              // Send regular text message
              await sendOutboundText(lead, fromPhone, reply.text, { 
                 chatbot: { 
                    flowId: String(activeFlow._id),
                    spintaxEnabled: reply.spintaxEnabled,
                    presenceType: reply.presenceType,
                    presenceDelay: reply.presenceDelay
                 } 
              });
            }
            await markThrottle(lead._id, rule, now);
          }
        } catch (err) {
          console.error('[Automation] Chatbot flow error:', err);
        }
      }
      continue;
    }

    if (await shouldThrottle(lead._id, rule, now)) {
      console.log(`[Automation] Rule ${(rule as any).name} throttled`);
      continue;
    }

    const actionType = String((rule as any).actionType || 'send_text');

    if (actionType === 'send_text') {
      const text = String((rule as any).actionText || '').trim();
      if (!text) continue;
      await sendOutboundText(lead, fromPhone, text, { automation: { ruleId: String((rule as any)._id) } });
      await markThrottle(lead._id, rule, now);
      continue;
    }

    if (actionType === 'send_template') {
      const templateId = (rule as any).actionTemplateId;
      if (!templateId) continue;
      await sendOutboundTemplate(lead, fromPhone, templateId, (rule as any).actionTemplateVariables, { automation: { ruleId: String((rule as any)._id) } });
      await markThrottle(lead._id, rule, now);
      continue;
    }

    if (actionType === 'update_lead') {
      const updates = (rule as any).actionLeadUpdates;
      if (updates && typeof updates === 'object') {
        await Lead.updateOne({ _id: lead._id }, { $set: updates });
        await markThrottle(lead._id, rule, now);
      }
      continue;
    }

    if (actionType === 'ai_reply' || triggerType === 'ai_agent') {
      try {
        const reply = await maybeAIReply(lead, ctx);
        if (reply) {
          await sendOutboundText(lead, fromPhone, reply, { automation: { ruleId: String((rule as any)._id), ai: true } });
          await markThrottle(lead._id, rule, now);
        }
      } catch {
        // Ignore AI failures to keep webhook resilient.
      }
      continue;
    }
  }
}
