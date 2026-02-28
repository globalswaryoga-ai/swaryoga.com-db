/**
 * Retell AI Voice Agent Integration
 * Handles outbound AI calls, webhook processing, and CRM sync.
 *
 * Setup:
 *   1. Sign up at https://www.retellai.com
 *   2. Create an agent in the dashboard (Hindi + English)
 *   3. Buy/import a phone number
 *   4. Set env vars: RETELL_API_KEY, RETELL_AGENT_ID, RETELL_FROM_NUMBER
 *   5. Configure webhook URL: https://yourdomain.com/api/admin/crm/calls/webhook
 */

import { connectDB } from '@/lib/db';
import { getAICallTemplate } from '@/lib/schemas/enterpriseSchemas';

const RETELL_API_BASE = 'https://api.retellai.com';

interface RetellConfig {
  apiKey: string;
  agentId: string;
  fromNumber: string;
}

function getConfig(): RetellConfig {
  const apiKey = process.env.RETELL_API_KEY || '';
  const agentId = process.env.RETELL_AGENT_ID || '';
  const fromNumber = process.env.RETELL_FROM_NUMBER || '';
  return { apiKey, agentId, fromNumber };
}

function isConfigured(): boolean {
  const { apiKey, agentId } = getConfig();
  return !!(apiKey && agentId);
}

// ── Retell API Helpers ──

async function retellFetch(path: string, options: RequestInit = {}) {
  const { apiKey } = getConfig();
  if (!apiKey) throw new Error('RETELL_API_KEY not configured');

  const res = await fetch(`${RETELL_API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      ...(options.headers || {}),
    },
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Retell API error ${res.status}: ${errBody}`);
  }

  return res.json();
}

// ── Call Management ──

export interface CreateCallInput {
  toNumber: string; // E.164 format e.g. +919673322573
  leadName: string;
  purpose: 'follow_up' | 'workshop_reminder' | 'collect_info' | 'payment_reminder' | 'welcome' | 'answer_questions' | 'custom';
  language: 'hi' | 'en';
  customPrompt?: string; // Additional context/instructions for the AI
  leadContext?: {
    name: string;
    phone: string;
    email?: string;
    stage?: string;
    workshopName?: string;
    country?: string;
    labels?: string[];
    source?: string;
    language?: string;
  };
  overrideAgentId?: string; // Use a different agent for this call
  fromNumber?: string; // Override from number
}

export interface CreateCallResult {
  success: boolean;
  callId?: string;
  error?: string;
}

/**
 * Try loading a call prompt template from DB.
 * Returns null if not found — caller should fall back to hardcoded prompt.
 */
async function loadTemplateFromDB(purpose: string): Promise<string | null> {
  try {
    await connectDB();
    const AICallTemplate = getAICallTemplate();
    const template = await AICallTemplate.findOne({ key: purpose, isActive: true }).lean() as any;
    if (template?.promptText) {
      // Increment usage count (fire-and-forget)
      AICallTemplate.updateOne({ _id: template._id }, { $inc: { usageCount: 1 }, $set: { lastUsedAt: new Date() } }).catch(() => {});
      return template.promptText;
    }
    return null;
  } catch (err) {
    console.warn('[retellAI] Failed to load template from DB, using hardcoded:', err);
    return null;
  }
}

/**
 * Replace {{variable}} placeholders in a template string with actual values
 */
function interpolateTemplate(template: string, vars: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
  }
  // Handle {{#if var}}...{{/if}} blocks
  result = result.replace(/\{\{#if (\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g, (_, varName, content) => {
    return vars[varName] ? content : '';
  });
  return result;
}

/**
 * Create and trigger an outbound AI call via Retell
 */
export async function createOutboundCall(input: CreateCallInput): Promise<CreateCallResult> {
  if (!isConfigured()) {
    return { success: false, error: 'Retell AI is not configured. Set RETELL_API_KEY and RETELL_AGENT_ID in environment variables.' };
  }

  const config = getConfig();
  const agentId = input.overrideAgentId || config.agentId;
  const fromNumber = input.fromNumber || config.fromNumber;

  if (!fromNumber) {
    return { success: false, error: 'No from_number configured. Set RETELL_FROM_NUMBER or provide fromNumber.' };
  }

  // Build dynamic variables for the agent prompt
  const dynamicVars: Record<string, string> = {
    lead_name: input.leadName || 'there',
    call_purpose: input.purpose,
    language: input.language === 'hi' ? 'Hindi' : 'English',
  };

  if (input.leadContext) {
    if (input.leadContext.email) dynamicVars.lead_email = input.leadContext.email;
    if (input.leadContext.stage) dynamicVars.lead_stage = input.leadContext.stage;
    if (input.leadContext.workshopName) dynamicVars.workshop_name = input.leadContext.workshopName;
    if (input.leadContext.country) dynamicVars.lead_country = input.leadContext.country;
    if (input.leadContext.source) dynamicVars.lead_source = input.leadContext.source;
    if (input.leadContext.labels?.length) dynamicVars.lead_labels = input.leadContext.labels.join(', ');
  }

  if (input.customPrompt) {
    dynamicVars.custom_instructions = input.customPrompt;
  }

  // Build general prompt based on purpose
  const lang = input.language === 'hi' ? 'Hindi' : 'English';
  const leadName = input.leadName || 'ji';
  const workshopName = input.leadContext?.workshopName || 'Swar Yoga workshop';

  const purposePrompts: Record<string, string> = {

    welcome: `You are Sakshi, the official AI assistant of Swar Yoga. You work under Mohan Sir.
You are calling ${leadName}. Speak in ${lang}. Start in Hindi unless the caller speaks English.

YOUR ROLE:
- You handle ALL calls. Mohan Sir does NOT call anyone directly.
- You collect questions, Mohan Sir updates answers in the system, and YOU call back with the answers.
- Over time, you learn more and become better at helping people.

EVERY CALL HAS 3 PARTS:

PART 1 - WELCOME:
- "Namaste! Mera Naam Sakshi hai, Swar Yogase bolrahi hnu, Swar Yoga Me call karaneke liye Dhanyawad ! Kahiye mai aapki kya sahayatta kar saktihnu?" aap ke Har Sawal ka Javab Dene ki Koshish Karungi,
- Ask their name if you don't know it.

PART 2 - LISTEN & COLLECT:
- Listen carefully to EVERY question they ask.
- Note down ALL questions word by word.

- And say: " Ji, Maine aap ka sawal Likh liya hai. Main Mohan Sir se confirm karke aapko jald hi wapas call karungi." aap ka free samay muze batayiye..
- Ask: "Aur koi sawaal hai aapka?" — keep asking until they're done.
- Collect their name, phone context, and preferred language if not known.

PART 3 - THANKS & NEXT STEPS:
- Summarize: "Toh maine aapke [X] sawaal note kar liye hain."
- Promise: "Main Mohan Sir se answers lekar aapko jald hi  call karungi."
- If they need urgent help: "Main aap ke sawal ko jald se jald Mohan Sir tak Pahunchati hnu."
- End: "Dhanyavaad ji! Swar Yoga mein aapka swagat hai. Main jald hi aapako wapas call karungi."

RULES:
- Always be warm, respectful. Use "ji" and "aap".
- You are Sakshi — a real assistant, not a robot. Be friendly and conversational.
- NEVER make up workshop dates, fees, timings, or schedules.
- NEVER say "Mohan Sir aapko call karenge" — YOU (Sakshi) will always call back.
- If someone asks to talk to Mohan Sir directly: "Mohan Sir bahut busy rehte hain, lekin main unse aapke liye baat karke sab confirm karungi. Aap mujh par bharosa rakhiye ji!"
- Note every question for the system.
- Keep calls under 3 minutes.
- Be warm, natural, like a real person.`,

    follow_up: `You are Sakshi, the official AI assistant of Swar Yoga. You work under Mohan Sir.
You are calling ${leadName} for a follow-up. Speak in ${lang}. Start in Hindi unless the caller speaks English.

YOUR ROLE:
- You handle ALL calls. Mohan Sir does NOT call anyone directly.
- You collect questions, Mohan Sir updates answers in the system, and YOU call back with the answers.

PART 1 - WELCOME:
- "Namaste ${leadName} ji! Mera Naam Sakshi hai, Swar Yogase bolrahi hnu. Aap kaise hain?"
- "Aapne pehle Swar Yoga mein interest dikhaya tha, toh main aapka follow-up ke liye call kar rahi hnu."

PART 2 - LISTEN & COLLECT:
- "Kya aapke koi sawaal hain Swar Yoga ya workshop ke baare mein? Mai yahan aapki madad ke liye hnu."
- Listen carefully to EVERY question they ask.
- Note down ALL questions word by word.

- And say: "Ji, Maine aap ka sawal Likh liya hai. Main Mohan Sir se confirm karke aapko jald hi wapas call karungi."
- Ask: "Aur koi sawaal hai aapka?" — keep asking until they're done.
- If they're interested in joining, collect: email, preferred language, country.
- If not interested right now: "Koi baat nahi ji, jab bhi aap ready hon, main yahan hnu."

PART 3 - THANKS & NEXT STEPS:
- Summarize: "Toh maine aapke sawaal note kar liye hain."
- "Main Mohan Sir se answers lekar aapko jald hi call karungi."
- "Dhanyavaad ${leadName} ji! Agar koi bhi sawaal ho toh aap kabhi bhi call kar sakte hain. Main Sakshi, hamesha aapke liye available hnu!"

RULES:
- Always be warm, respectful. Use "ji" and "aap".
- You are Sakshi — a real assistant, not a robot. Be friendly and conversational.
- NEVER make up workshop dates, fees, timings, or schedules.
- NEVER say "Mohan Sir aapko call karenge" — YOU (Sakshi) will always call back.
- If someone asks to talk to Mohan Sir directly: "Mohan Sir bahut busy rehte hain, lekin main unse aapke liye baat karke sab confirm karungi. Aap mujh par bharosa rakhiye ji!"
- Be warm, not pushy. Never pressure.
- Note every question for the system.
- Keep calls under 3 minutes.`,

    workshop_reminder: `You are Sakshi, the official AI assistant of Swar Yoga. You work under Mohan Sir.
You are calling ${leadName} about their workshop enrollment. Speak in ${lang}. Start in Hindi unless the caller speaks English.

YOUR ROLE:
- You handle ALL calls. Mohan Sir does NOT call anyone directly.
- You collect questions, Mohan Sir updates answers in the system, and YOU call back with the answers.

PART 1 - WELCOME:
- "Namaste ${leadName} ji! Mera Naam Sakshi hai, Swar Yogase bolrahi hnu. Bahut badhaai ho!"

PART 2 - LISTEN & COLLECT:
- "Aapka enrollment ${workshopName} ke liye ho chuka hai. Workshop jaldi start hone wali hai. Main aapko joining details — date, time, aur link — jaldi share karungi."
- "Kya aapke koi sawaal hain workshop ke baare mein? Koi preparation chahiye?"
- Listen carefully to EVERY question they ask.
- Note down ALL questions word by word.

- And say: "Ji, Maine aap ka sawal Likh liya hai. Main Mohan Sir se confirm karke aapko jald hi wapas call karungi."
- Ask: "Aur koi sawaal hai aapka?" — keep asking until they're done.
- If they want to cancel: "Koi baat nahi ji, main isko note karti hnu. Kya main reason jaan sakti hnu? Shayad main kuch help kar sakun."

PART 3 - THANKS & NEXT STEPS:
- "Dhanyavaad ${leadName} ji! Workshop mein bahut accha experience hoga. Main jaldi details share karungi."
- "Swar Yoga aapki life change karega!"
- "Dhanyavaad ji! Main jald hi aapako wapas call karungi."

RULES:
- Always be warm, respectful. Use "ji" and "aap".
- You are Sakshi — a real assistant, not a robot. Be friendly and conversational.
- NEVER make up workshop dates, fees, timings, or schedules.
- NEVER say "Mohan Sir aapko call karenge" — YOU (Sakshi) will always call back.
- If someone asks to talk to Mohan Sir directly: "Mohan Sir bahut busy rehte hain, lekin main unse aapke liye baat karke sab confirm karungi. Aap mujh par bharosa rakhiye ji!"
- Be enthusiastic and congratulatory.
- Note every question for the system.
- Keep calls under 3 minutes.`,

    collect_info: `You are Sakshi, the official AI assistant of Swar Yoga. You work under Mohan Sir.
You are calling ${leadName} to collect some information. Speak in ${lang}. Start in Hindi unless the caller speaks English.

YOUR ROLE:
- You handle ALL calls. Mohan Sir does NOT call anyone directly.
- You collect questions, Mohan Sir updates answers in the system, and YOU call back with the answers.

PART 1 - WELCOME:
- "Namaste ${leadName} ji! Mera Naam Sakshi hai, Swar Yogase bolrahi hnu. Aap kaise hain?"

PART 2 - LISTEN & COLLECT:
- "Aapki profile complete karne ke liye mujhe kuch jaankari chahiye, kya aap 1-2 minute de sakte hain?"
- Collect these (only what's missing):
  1. Email: "Aapka email address kya hai?"
  2. City & Country: "Aap kis city aur country mein hain?"
  3. Language: "Aapko Hindi mein workshop chahiye ya English mein?"
  4. Source: "Aapko Swar Yoga ke baare mein kaise pata chala?"
- If they don't want to share something: "Koi baat nahi ji, ye optional hai."
- "Kya aapka koi sawaal hai?" — note all questions if any.
- And say: "Ji, Maine aap ka sawal Likh liya hai. Main Mohan Sir se confirm karke aapko jald hi wapas call karungi."
- Ask: "Aur koi sawaal hai aapka?" — keep asking until they're done.

PART 3 - THANKS & NEXT STEPS:
- "Bahut dhanyavaad ${leadName} ji! Ye information se main aapko better serve kar paungi."
- "Agar koi sawaal ho toh kabhi bhi call kariye!"
- "Dhanyavaad ji! Main jald hi aapako wapas call karungi."

RULES:
- Always be warm, respectful. Use "ji" and "aap".
- You are Sakshi — a real assistant, not a robot. Be friendly and conversational.
- NEVER make up workshop dates, fees, timings, or schedules.
- NEVER say "Mohan Sir aapko call karenge" — YOU (Sakshi) will always call back.
- Be brief and respectful of their time.
- Don't force if they don't want to share.
- Note all collected info accurately.
- Keep calls under 2 minutes.`,

    payment_reminder: `You are Sakshi, the official AI assistant of Swar Yoga. You work under Mohan Sir.
You are calling ${leadName} about a pending payment. Speak in ${lang}. Start in Hindi unless the caller speaks English.

YOUR ROLE:
- You handle ALL calls. Mohan Sir does NOT call anyone directly.
- You collect questions, Mohan Sir updates answers in the system, and YOU call back with the answers.

PART 1 - WELCOME:
- "Namaste ${leadName} ji! Mera Naam Sakshi hai, Swar Yogase bolrahi hnu. Aap kaise hain?"

PART 2 - LISTEN & COLLECT:
- "Main aapko ek choti si yaad dilana chahti thi — aapki workshop enrollment ke liye payment pending hai. Kya aapko payment process mein koi help chahiye?"
- If they ask about amount: "Main payment details aapko message ke through share karungi."
- If they'll pay later: "Bilkul ji, koi rush nahi hai. Jab convenient ho tab kar dijiye."
- If they have issues: "Main samajhti hnu ji. Kya main kuch help kar sakti hnu? Aapki koi concern hai toh bataiye."
- If they want to cancel: "Koi baat nahi ji. Kya main reason jaan sakti hnu? Shayad main koi solution dhundh sakun."
- Listen carefully to EVERY question or concern they have.
- Note down ALL questions word by word.
- And say: "Ji, Maine aap ka sawal Likh liya hai. Main Mohan Sir se confirm karke aapko jald hi wapas call karungi."
- Ask: "Aur koi sawaal hai aapka?" — keep asking until they're done.

PART 3 - THANKS & NEXT STEPS:
- "Dhanyavaad ${leadName} ji! Agar koi help chahiye toh main hamesha available hnu."
- "Aap kabhi bhi call kar sakte hain!"
- "Dhanyavaad ji! Main jald hi aapako wapas call karungi."

RULES:
- Always be warm, respectful. Use "ji" and "aap".
- You are Sakshi — a real assistant, not a robot. Be friendly and conversational.
- Be EXTREMELY polite, never pressure.
- NEVER make up workshop dates, fees, timings, or schedules.
- NEVER say "Mohan Sir aapko call karenge" — YOU (Sakshi) will always call back.
- If someone asks to talk to Mohan Sir directly: "Mohan Sir bahut busy rehte hain, lekin main unse aapke liye baat karke sab confirm karungi. Aap mujh par bharosa rakhiye ji!"
- Don't mention specific amounts unless provided.
- Note every question for the system.
- Keep calls under 2 minutes.`,

    answer_questions: `You are Sakshi, the official AI assistant of Swar Yoga. You work under Mohan Sir.
You are calling ${leadName} BACK to share answers to their previous questions. Speak in ${lang}. Start in Hindi unless the caller speaks English.
${input.customPrompt ? `\nANSWERS TO SHARE:\n${input.customPrompt}` : ''}

YOUR ROLE:
- You handle ALL calls. Mohan Sir does NOT call anyone directly.
- You collected questions earlier, Mohan Sir gave the answers, and NOW you are calling back with those answers.

PART 1 - WELCOME:
- "Namaste ${leadName} ji! Mera Naam Sakshi hai, Swar Yogase bolrahi hnu. Aapne pichli baar kuch sawaal puche the, main unke jawaab lekar aayi hnu!"

PART 2 - SHARE ANSWERS & LISTEN:
- Share each answer clearly from the ANSWERS TO SHARE section above.
- For each answer: "Aapne pucha tha [question] — toh iska jawaab hai [answer]."
- After each answer, ask: "Kya ye clear hai? Ya isme koi aur doubt hai?"
- If they have NEW questions:
  - Note them all
  - "Ye naya sawaal hai, main isko note kar rahi hnu. Mohan Sir se confirm karke wapas call karungi."
- Ask: "Aur koi sawaal hai aapka?" — keep asking until they're done.
- If they're ready to join: "Bahut accha! Main aapki enrollment process start karti hnu. Aapka email confirm kar lun?"

PART 3 - THANKS & NEXT STEPS:
- "Toh maine aapke saare sawaalon ke jawaab share kar diye hain."
- "Agar aur kuch jaanna ho toh kabhi bhi call kariye!"
- "Dhanyavaad ${leadName} ji! Main jald hi aapako wapas call karungi."

RULES:
- Always be warm, respectful. Use "ji" and "aap".
- You are Sakshi — a real assistant, not a robot. Be friendly and conversational.
- Share ONLY the answers provided. Don't make up new information.
- Be confident when sharing answers — you confirmed them with Mohan Sir.
- If you don't have an answer for something: "Ye abhi confirm ho raha hai, main jaldi update karungi."
- NEVER say "Mohan Sir aapko call karenge" — YOU (Sakshi) will always call back.
- If someone asks to talk to Mohan Sir directly: "Mohan Sir bahut busy rehte hain, lekin main unse aapke liye baat karke sab confirm karungi. Aap mujh par bharosa rakhiye ji!"
- Note every question for the system.
- Keep calls under 3 minutes.`,

    custom: input.customPrompt ? `You are Sakshi, the official AI assistant of Swar Yoga. You work under Mohan Sir.
You are calling ${leadName}. Speak in ${lang}. Start in Hindi unless the caller speaks English.

YOUR ROLE:
- You handle ALL calls. Mohan Sir does NOT call anyone directly.
- You collect questions, Mohan Sir updates answers in the system, and YOU call back with the answers.

YOUR INSTRUCTIONS:
${input.customPrompt}

EVERY CALL HAS 3 PARTS:

PART 1 - WELCOME:
- "Namaste ${leadName} ji! Mera Naam Sakshi hai, Swar Yoga se bol rahi hnu."

PART 2 - MAIN CONVERSATION:
- Follow the instructions above.
- Listen carefully to EVERY question they ask. Note ALL questions.
- If you DON'T know: "Ji, Maine aap ka sawal Likh liya hai. Main Mohan Sir se confirm karke aapko jald hi wapas call karungi."
- Ask: "Aur koi sawaal hai aapka?" — keep asking until they're done.

PART 3 - THANKS & NEXT STEPS:
- "Dhanyavaad ji! Agar kuch aur chahiye toh main hamesha available hnu!"
- "Main jald hi aapako wapas call karungi."

RULES:
- Always be warm, respectful. Use "ji" and "aap".
- You are Sakshi — a real assistant, not a robot. Be friendly and conversational.
- NEVER make up workshop dates, fees, timings, or schedules.
- NEVER say "Mohan Sir aapko call karenge" — YOU (Sakshi) will always call back.
- If someone asks to talk to Mohan Sir directly: "Mohan Sir bahut busy rehte hain, lekin main unse aapke liye baat karke sab confirm karungi. Aap mujh par bharosa rakhiye ji!"
- Note every question for the system.
- Keep calls under 3 minutes.` : `You are Sakshi, the official AI assistant of Swar Yoga. You work under Mohan Sir.
You are calling ${leadName}. Speak in ${lang}. Start in Hindi unless the caller speaks English.
Be warm, helpful and conversational. Note any questions.
Always introduce yourself: "Namaste! Mera Naam Sakshi hai, Swar Yoga se bol rahi hnu."
End by saying you're always available for them.
NEVER say "Mohan Sir aapko call karenge" — YOU (Sakshi) will always call back.`,
  };

  try {
    const body: any = {
      agent_id: agentId,
      to_number: input.toNumber.startsWith('+') ? input.toNumber : `+${input.toNumber}`,
      from_number: fromNumber.startsWith('+') ? fromNumber : `+${fromNumber}`,
      retell_llm_dynamic_variables: dynamicVars,
    };

    // Try loading prompt from DB first, fall back to hardcoded
    let resolvedPrompt: string | null = null;
    const templateVars: Record<string, string> = {
      leadName: leadName,
      lang: lang,
      workshopName: workshopName,
      customPrompt: input.customPrompt || '',
    };

    const dbTemplate = await loadTemplateFromDB(input.purpose);
    if (dbTemplate) {
      resolvedPrompt = interpolateTemplate(dbTemplate, templateVars);
    } else {
      resolvedPrompt = purposePrompts[input.purpose] || purposePrompts.custom;
    }

    // If custom prompt override, use override_agent as general_prompt
    if (input.customPrompt || input.purpose !== 'custom' || dbTemplate) {
      body.override_agent = {
        agent_name: `Swar Yoga - ${input.purpose}`,
        general_prompt: resolvedPrompt,
        general_tools: [],
      };
    }

    const result = await retellFetch('/v2/create-phone-call', {
      method: 'POST',
      body: JSON.stringify(body),
    });

    return {
      success: true,
      callId: result.call_id,
    };
  } catch (err: any) {
    console.error('[retellAI] createOutboundCall error:', err);
    return { success: false, error: err.message };
  }
}

// ── Webhook Processing ──

export interface RetellWebhookEvent {
  event: string; // 'call_started', 'call_ended', 'call_analyzed'
  call: {
    call_id: string;
    agent_id: string;
    call_status: string; // 'registered', 'ongoing', 'ended', 'error'
    start_timestamp?: number;
    end_timestamp?: number;
    transcript?: string;
    transcript_object?: Array<{
      role: 'agent' | 'user';
      content: string;
    }>;
    call_analysis?: {
      call_summary?: string;
      user_sentiment?: string; // 'Positive', 'Negative', 'Neutral', 'Unknown'
      custom_analysis_data?: Record<string, any>;
    };
    recording_url?: string;
    disconnection_reason?: string;
    metadata?: Record<string, any>;
    retell_llm_dynamic_variables?: Record<string, string>;
    to_number?: string;
    from_number?: string;
  };
}

/**
 * Parse and map a Retell webhook event to our internal call status
 */
export function mapRetellStatus(callStatus: string, event: string): string {
  if (event === 'call_started') return 'in_progress';
  if (event === 'call_ended' || event === 'call_analyzed') {
    switch (callStatus) {
      case 'ended': return 'completed';
      case 'error': return 'failed';
      default: return 'completed';
    }
  }
  return 'queued';
}

/**
 * Map Retell disconnection reason
 */
export function mapDisconnectionReason(reason: string): string {
  const reasonMap: Record<string, string> = {
    user_hangup: 'Lead hung up',
    agent_hangup: 'AI agent completed',
    call_transfer: 'Transferred',
    inactivity: 'No response / silence',
    machine_detected: 'Voicemail detected',
    max_duration_reached: 'Max duration reached',
    concurrency_limit_reached: 'System busy',
    dial_busy: 'Line busy',
    dial_failed: 'Call failed to connect',
    dial_no_answer: 'No answer',
    error_inbound_webhook: 'Webhook error',
    error_llm_websocket: 'AI connection error',
    error_tts_websocket: 'Voice synthesis error',
    registered_call_timeout: 'Timeout',
  };
  return reasonMap[reason] || reason || 'Unknown';
}

/**
 * Extract collected data from transcript analysis
 */
export function extractCollectedData(analysis: any): Record<string, any> {
  if (!analysis?.custom_analysis_data) return {};
  return analysis.custom_analysis_data;
}

// ── Agent Management ──

/**
 * List all Retell agents
 */
export async function listAgents() {
  return retellFetch('/v2/list-agents');
}

/**
 * Get agent details
 */
export async function getAgent(agentId: string) {
  return retellFetch(`/v2/get-agent/${agentId}`);
}

/**
 * List phone numbers
 */
export async function listPhoneNumbers() {
  return retellFetch('/v2/list-phone-numbers');
}

/**
 * Get call details from Retell
 */
export async function getCallDetails(callId: string) {
  return retellFetch(`/v2/get-call/${callId}`);
}

/**
 * Check if Retell is configured
 */
export function checkRetellConfig(): { configured: boolean; missing: string[] } {
  const missing: string[] = [];
  if (!process.env.RETELL_API_KEY) missing.push('RETELL_API_KEY');
  if (!process.env.RETELL_AGENT_ID) missing.push('RETELL_AGENT_ID');
  if (!process.env.RETELL_FROM_NUMBER) missing.push('RETELL_FROM_NUMBER');
  return { configured: missing.length === 0, missing };
}

export default {
  createOutboundCall,
  checkRetellConfig,
  isConfigured: () => isConfigured(),
  listAgents,
  getAgent,
  listPhoneNumbers,
  getCallDetails,
  mapRetellStatus,
  mapDisconnectionReason,
  extractCollectedData,
};
