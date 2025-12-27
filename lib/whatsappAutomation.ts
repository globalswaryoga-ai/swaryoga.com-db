import { connectDB } from '@/lib/db';
import { ConsentManager } from '@/lib/consentManager';
import { Lead, WhatsAppAutomationRule, WhatsAppMessage } from '@/lib/schemas/enterpriseSchemas';
import { normalizePhone, sendWhatsAppText } from '@/lib/whatsapp';

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

async function sendOutboundText(lead: any, to: string, text: string, metadata?: any) {
  const compliance = await ConsentManager.validateCompliance(to);
  if (!compliance.compliant) return;

  // Persist outbound message
  const now = new Date();
  const message = await WhatsAppMessage.create({
    leadId: lead._id,
    phoneNumber: to,
    direction: 'outbound',
    messageType: 'text',
    messageContent: text,
    status: 'queued',
    sentAt: now,
    metadata,
  });

  try {
    const apiResult = await sendWhatsAppText(to, text);
    await WhatsAppMessage.updateOne(
      { _id: message._id },
      { $set: { status: 'sent', waMessageId: apiResult.waMessageId, updatedAt: new Date() }, $unset: { failureReason: 1 } }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'WhatsApp send failed';
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

  for (const rule of rules) {
    if (!matchesConditions(lead, (rule as any).conditions)) continue;

    const triggerType = String((rule as any).triggerType || 'welcome');

    if (triggerType === 'welcome' && !ctx.wasFirstInbound) continue;

    if (triggerType === 'keyword') {
      const kws = Array.isArray((rule as any).keywords) ? (rule as any).keywords.map((k: any) => String(k).toLowerCase()) : [];
      if (kws.length === 0) continue;
      const lower = ctx.body.toLowerCase();
      const matched = kws.some((k: string) => k && lower.includes(k));
      if (!matched) continue;
    }

    if (await shouldThrottle(lead._id, rule, now)) continue;

    const actionType = String((rule as any).actionType || 'send_text');

    if (actionType === 'send_text') {
      const text = String((rule as any).actionText || '').trim();
      if (!text) continue;
      await sendOutboundText(lead, fromPhone, text, { automation: { ruleId: String((rule as any)._id) } });
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

    if (actionType === 'ai_reply' && triggerType === 'ai_agent') {
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

    if (triggerType === 'chatbot') {
      const reply = await runSimpleChatbot(lead, ctx);
      if (reply) {
        await sendOutboundText(lead, fromPhone, reply, { automation: { ruleId: String((rule as any)._id), chatbot: true } });
        await markThrottle(lead._id, rule, now);
      }
      continue;
    }
  }
}
