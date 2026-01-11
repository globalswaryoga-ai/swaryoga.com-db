import { connectDB } from '@/lib/db';
import { ConsentManager } from '@/lib/consentManager';
import { Lead, WhatsAppAutomationRule, WhatsAppMessage, ChatbotFlow } from '@/lib/schemas/enterpriseSchemas';
import { normalizePhone, sendWhatsAppText, sendWhatsAppPresence } from '@/lib/whatsapp';

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

  // 1) Logic to determine next node based on input
  if (currentNode.type === 'question' || currentNode.type === 'buttons') {
    const userInput = ctx.body.trim().toLowerCase();
    const matchedOption = currentNode.options?.find((opt: any) => 
      String(opt.label || '').toLowerCase() === userInput || 
      String(opt.value || '').toLowerCase() === userInput
    );

    if (matchedOption) {
      nextNodeId = matchedOption.nextNodeId;
    } else if (currentNode.questionType === 'text') {
      // For free text questions, we just move to nextNodeId if it exists
      nextNodeId = currentNode.nextNodeId;
    } else {
      return { text: `I'm sorry, I didn't understand that. Please choose one of: ${currentNode.options.map((o: any) => o.label).join(', ')}` };
    }
  }

  // 2) Get the next node's content
  const nextNode = flow.nodes?.find((n: any) => n.nodeId === nextNodeId);
  if (nextNode) {
    console.log(`[Chatbot] Advancing to next node: ${nextNodeId}`);
    
    // Assign labels if defined
    if (Array.isArray(nextNode.assignLabels) && nextNode.assignLabels.length > 0) {
      await Lead.updateOne({ _id: lead._id }, { $addToSet: { labels: { $each: nextNode.assignLabels } } });
    }

    if (nextNode.type === 'message' || nextNode.type === 'question' || nextNode.type === 'buttons') {
      replyObj = {
        text: nextNode.messageText || nextNode.questionText,
        spintaxEnabled: nextNode.spintaxEnabled,
        presenceType: nextNode.presenceType,
        presenceDelay: nextNode.presenceDelay
      };
    } else if (nextNode.type === 'template') {
       // ... placeholder
    } else if (nextNode.type === 'end') {
      replyObj = { text: nextNode.messageText || 'Thank you!' };
      await Lead.updateOne({ _id: lead._id }, { $unset: { 'metadata.chatbotFlowState': 1 } });
      return replyObj;
    }

    // Update state to the new node
    await Lead.updateOne(
      { _id: lead._id },
      { $set: { 'metadata.chatbotFlowState': { flowId: state.flowId, nodeId: nextNodeId, updatedAt: ctx.now } } }
    );
  } else {
    // No next node? End flow.
    await Lead.updateOne({ _id: lead._id }, { $unset: { 'metadata.chatbotFlowState': 1 } });
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
        try {
          const reply = await advanceChatbotFlow(lead, ctx, activeFlow);
          if (reply && reply.text) {
            await sendOutboundText(lead, fromPhone, reply.text, { 
               chatbot: { 
                  flowId: String(activeFlow._id),
                  spintaxEnabled: reply.spintaxEnabled,
                  presenceType: reply.presenceType,
                  presenceDelay: reply.presenceDelay
               } 
            });
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
