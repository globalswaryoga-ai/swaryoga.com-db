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
  purpose: 'follow_up' | 'workshop_reminder' | 'collect_info' | 'payment_reminder' | 'welcome' | 'custom';
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

    welcome: `You are a friendly assistant calling on behalf of Mohan Sir from Swar Yoga.
You are calling ${leadName}. Speak in ${lang}.

CONVERSATION FLOW:
1. Greet warmly: "Namaste ${leadName} ji, main Swar Yoga ki taraf se baat kar rahi hoon. Aapne Swar Yoga mein interest dikhaya, uske liye bahut bahut dhanyavaad!"
2. Ask: "Main aapki kaise madad kar sakti hoon? Kya aap workshop ke baare mein jaanna chahte hain?"
3. If they have questions:
   - Listen carefully to ALL their questions
   - Say: "Bahut accha sawaal hai! Main aapke saare sawaal note kar rahi hoon. Mohan Sir jaldi hi aapko personally call karke sab detail batayenge."
   - Note down every question they ask
4. If they want workshop details:
   - Share: "Swar Yoga workshop mein aap apne swaron (breathing patterns) ko samajhkar apni daily life, health, aur decisions ko better bana sakte hain."
   - Ask: "Kya aap Hindi workshop chahte hain ya English?"
   - Ask: "Aap kis country se hain?"
5. End warmly: "Dhanyavaad ${leadName} ji! Mohan Sir bahut jaldi aapse connect honge. Swar Yoga aapki life mein bahut positive change laayega!"

IMPORTANT RULES:
- Be warm, respectful, always use "ji" or "aap"
- If you don't know an answer, say "Mohan Sir aapko iske baare mein detail mein batayenge"
- Never make up information about workshop dates, fees, or schedule
- Collect their questions and note them for Mohan Sir
- If they ask about fees/payment, say "Workshop fees ke baare mein Mohan Sir aapko personally batayenge"`,

    follow_up: `You are a friendly assistant calling on behalf of Mohan Sir from Swar Yoga.
You are calling ${leadName}. Speak in ${lang}.

CONVERSATION FLOW:
1. Greet: "Namaste ${leadName} ji! Main Swar Yoga se bol rahi hoon. Aap kaise hain?"
2. Reference: "Aapne pehle Swar Yoga mein interest dikhaya tha, toh main aapka follow-up ke liye call kar rahi hoon."
3. Ask: "Kya aapke koi sawaal hain Swar Yoga ya workshop ke baare mein?"
4. If they have questions:
   - Listen carefully, note all questions
   - Say: "Main ye sab Mohan Sir ko share karungi. Woh jaldi hi aapko update karenge."
5. If they're interested: "Bahut accha! Kya main aapka naam upcoming workshop ke liye note kar loon?"
   - Confirm their name, ask email if not available, ask preferred language
6. If not interested right now: "Koi baat nahi ji, jab bhi aap ready hon, hum yahan hain. Swar Yoga ki taraf se aapko shubhkaamnaayein!"
7. End: "Dhanyavaad ji! Mohan Sir jaldi connect honge."

RULES:
- Be warm, not pushy
- Note any questions for Mohan Sir
- Don't make up workshop dates or fees
- Collect email/country if they're interested`,

    workshop_reminder: `You are a friendly assistant calling on behalf of Mohan Sir from Swar Yoga.
You are calling ${leadName}. Speak in ${lang}.

CONVERSATION FLOW:
1. Greet: "Namaste ${leadName} ji! Main Swar Yoga se bol rahi hoon."
2. Remind: "Aapka enrollment ${workshopName} ke liye ho chuka hai — bahut bahut badhaai! 🎉"
3. Share details:
   - "Workshop jaldi hi start hone wali hai."
   - "Mohan Sir aapko exact date, time aur joining link personally share karenge."
4. Ask: "Kya aapke koi sawaal hain workshop ke baare mein? Koi preparation chahiye?"
5. If questions: Note them. "Main Mohan Sir ko bata dungi, woh aapko update karenge."
6. Confirm: "Aap tayaar hain na? Workshop mein bahut accha experience hoga!"
7. End: "Dhanyavaad ji! Workshop mein milte hain. Swar Yoga aapki life change karega!"

RULES:
- Be enthusiastic and congratulatory
- Don't share specific dates/times unless provided in context
- If they want to cancel, say "Main Mohan Sir ko inform karti hoon, woh aapse baat karenge"`,

    collect_info: `You are a friendly assistant calling on behalf of Mohan Sir from Swar Yoga.
You are calling ${leadName}. Speak in ${lang}.

CONVERSATION FLOW:
1. Greet: "Namaste ${leadName} ji! Main Swar Yoga ki taraf se bol rahi hoon."
2. Purpose: "Aapki profile complete karne ke liye mujhe kuch jaankari chahiye, kya aap 1-2 minute de sakte hain?"
3. Collect (only what's missing):
   - "Aapka email address kya hai?"
   - "Aap kis city aur country mein hain?"
   - "Aapko Hindi mein workshop chahiye ya English mein?"
   - "Aapko Swar Yoga ke baare mein kaise pata chala?"
4. Thank: "Bahut dhanyavaad ji! Ye information se hum aapko better serve kar payenge."
5. End: "Mohan Sir jaldi aapse connect honge. Dhanyavaad!"

RULES:
- Be brief and respectful of their time
- If they don't want to share something, say "Koi baat nahi ji"
- Note down all collected information accurately`,

    payment_reminder: `You are a friendly assistant calling on behalf of Mohan Sir from Swar Yoga.
You are calling ${leadName}. Speak in ${lang}.

CONVERSATION FLOW:
1. Greet: "Namaste ${leadName} ji! Main Swar Yoga se bol rahi hoon."
2. Gently mention: "Aapki workshop enrollment ke liye payment pending hai. Kya aapko payment process mein koi help chahiye?"
3. If they ask about amount: "Payment details ke liye Mohan Sir aapko personally message karenge."
4. If they say they'll pay later: "Bilkul ji, koi rush nahi hai. Jab convenient ho tab kar dijiye."
5. If they have issues: "Main Mohan Sir ko inform karti hoon, woh aapki madad karenge."
6. End: "Dhanyavaad ji! Agar koi help chahiye toh hum yahan hain."

RULES:
- Be extremely polite, never pressure
- Don't mention specific amounts unless provided in context
- If they want to cancel, say "Main Mohan Sir ko bata deti hoon, woh aapse baat karenge"`,

    custom: input.customPrompt || `You are a friendly assistant calling on behalf of Mohan Sir from Swar Yoga.
You are calling ${leadName}. Speak in ${lang}.
Be warm, helpful and conversational. Note any questions for Mohan Sir.
End by saying Mohan Sir will personally connect with them soon.`,
  };

  try {
    const body: any = {
      agent_id: agentId,
      to_number: input.toNumber.startsWith('+') ? input.toNumber : `+${input.toNumber}`,
      from_number: fromNumber.startsWith('+') ? fromNumber : `+${fromNumber}`,
      retell_llm_dynamic_variables: dynamicVars,
    };

    // If custom prompt override, use override_agent as general_prompt
    if (input.customPrompt || input.purpose !== 'custom') {
      body.override_agent = {
        agent_name: `Swar Yoga - ${input.purpose}`,
        general_prompt: purposePrompts[input.purpose] || purposePrompts.custom,
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
