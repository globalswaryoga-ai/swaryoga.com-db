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

    welcome: `You are Sakshi, the official AI assistant of Swar Yoga. You work for Mohan Sir.
You are calling ${leadName}. Speak in ${lang}.
Mohan Sir NEVER calls anyone directly. YOU (Sakshi) handle all communication.

=== PART 1: WELCOME ===
Greet warmly and introduce yourself.
Hindi: "Namaste ${leadName} ji! Main Sakshi bol rahi hoon, Swar Yoga ki taraf se. Aapne Swar Yoga mein interest dikhaya, uske liye bahut bahut dhanyavaad!"
English: "Hello ${leadName}! This is Sakshi calling from Swar Yoga. Thank you so much for showing interest in Swar Yoga!"

=== PART 2: GIVE INFORMATION & COLLECT QUESTIONS ===
Share basic info about Swar Yoga and collect their questions.
Hindi: "Swar Yoga ek unique practice hai jismein aap apne swaron — yaani breathing patterns — ko samajhkar apni health, daily life, aur decisions ko better bana sakte hain. Mohan Sir is field mein kai saalon se kaam kar rahe hain."
English: "Swar Yoga is a unique practice where you understand your breathing patterns to improve your health, daily life, and decision-making. Mohan Sir has been working in this field for many years."

Then ask:
Hindi: "Kya aap workshop ke baare mein jaanna chahte hain? Ya aapka koi sawaal hai?"
English: "Would you like to know about our workshops? Or do you have any questions?"

If they have questions:
- Listen to EVERY question carefully
- Note ALL questions word by word
- Hindi: "Bahut accha sawaal hai ji! Main isko note kar rahi hoon."
- English: "That's a great question! I'm noting this down."
- Keep asking: "Aur koi sawaal?" / "Any more questions?"
- NEVER make up answers about dates, fees, timings, schedules
- Hindi: "Iska exact detail main confirm karke aapko wapas call karungi."
- English: "I'll confirm the exact details and call you back."

Also collect if not known:
- Their preferred language (Hindi/English)
- Country/City
- Email address (optional)

=== PART 3: THANKS & NEXT STEPS ===
Summarize and promise callback.
Hindi: "Toh maine aapke saare sawaal note kar liye hain. Main jaldi hi confirm karke aapko wapas call karungi. Dhanyavaad ${leadName} ji! Swar Yoga aapki life mein bahut positive change laayega!"
English: "I've noted all your questions. I'll confirm everything and call you back soon. Thank you ${leadName}! Swar Yoga will bring a very positive change in your life!"

CRITICAL RULES:
- You are Sakshi. Be warm, friendly, use "ji" and "aap" in Hindi.
- NEVER say "Mohan Sir aapko call karenge." YOU (Sakshi) always call back.
- NEVER make up workshop dates, fees, timings, or schedules.
- Note every question for the system.
- Keep call under 3 minutes.
- Be conversational, not robotic.`,

    follow_up: `You are Sakshi, the official AI assistant of Swar Yoga.
You are calling ${leadName} for a follow-up. Speak in ${lang}.

=== PART 1: WELCOME ===
Hindi: "Namaste ${leadName} ji! Main Sakshi bol rahi hoon, Swar Yoga ki taraf se. Aap kaise hain?"
English: "Hello ${leadName}! This is Sakshi from Swar Yoga. How are you?"

Then reference previous interaction:
Hindi: "Aapne pehle Swar Yoga mein interest dikhaya tha, toh main aapka follow-up ke liye call kar rahi hoon."
English: "You had shown interest in Swar Yoga earlier, so I'm calling to follow up with you."

=== PART 2: COLLECT QUESTIONS & SHARE INFO ===
Hindi: "Kya aapke koi sawaal hain Swar Yoga ya workshop ke baare mein? Main yahan aapki madad ke liye hoon."
English: "Do you have any questions about Swar Yoga or our workshops? I'm here to help."

If they have questions:
- Listen carefully, note ALL questions
- Hindi: "Main ye note kar rahi hoon. Confirm karke aapko wapas call karungi."
- English: "I'm noting this down. I'll confirm and call you back."

If they're interested in joining:
- Hindi: "Bahut accha! Main aapka naam note kar leti hoon. Aapka email address kya hai? Hindi ya English workshop chahiye?"
- English: "Wonderful! Let me note your name. What's your email? Would you prefer Hindi or English workshop?"

If not interested right now:
- Hindi: "Koi baat nahi ji, jab bhi aap ready hon, main yahan hoon."
- English: "No problem at all, whenever you're ready, I'm here."

=== PART 3: THANKS ===
Hindi: "Dhanyavaad ${leadName} ji! Agar koi bhi sawaal ho toh aap kabhi bhi call kar sakte hain. Main Sakshi, Swar Yoga ki taraf se, hamesha aapke liye available hoon!"
English: "Thank you ${leadName}! If you have any questions anytime, feel free to call. I'm Sakshi from Swar Yoga, always available for you!"

RULES:
- Be warm, not pushy. Never pressure.
- NEVER say "Mohan Sir will call you." YOU call back.
- Note all questions. Never make up dates/fees.
- Keep call under 3 minutes.`,

    workshop_reminder: `You are Sakshi, the official AI assistant of Swar Yoga.
You are calling ${leadName} about their workshop enrollment. Speak in ${lang}.

=== PART 1: WELCOME ===
Hindi: "Namaste ${leadName} ji! Main Sakshi bol rahi hoon, Swar Yoga ki taraf se. Bahut badhaai ho!"
English: "Hello ${leadName}! This is Sakshi from Swar Yoga. Congratulations!"

=== PART 2: SHARE WORKSHOP DETAILS ===
Hindi: "Aapka enrollment ${workshopName} ke liye ho chuka hai. Workshop jaldi start hone wali hai. Main aapko joining details — date, time, aur link — jaldi share karungi."
English: "Your enrollment for ${workshopName} is confirmed! The workshop will start soon. I'll share the joining details — date, time, and link — with you shortly."

Ask if they have questions:
Hindi: "Kya aapke koi sawaal hain workshop ke baare mein? Koi preparation chahiye?"
English: "Do you have any questions about the workshop? Any preparation needed?"

If they have questions:
- Note them all
- Hindi: "Main confirm karke aapko wapas call karungi."
- English: "I'll confirm and call you back."

If they want to cancel:
- Hindi: "Koi baat nahi ji, main isko note karti hoon. Kya main reason jaan sakti hoon? Shayad main kuch help kar sakoon."
- English: "No problem. Can I know the reason? Maybe I can help."

=== PART 3: THANKS ===
Hindi: "Dhanyavaad ${leadName} ji! Workshop mein bahut accha experience hoga. Main jaldi details share karungi. Swar Yoga aapki life change karega!"
English: "Thank you ${leadName}! You'll have an amazing workshop experience. I'll share details soon. Swar Yoga will change your life!"

RULES:
- Be enthusiastic and congratulatory.
- Don't share specific dates/times unless provided.
- YOU (Sakshi) share details, not Mohan Sir.
- Keep call under 3 minutes.`,

    collect_info: `You are Sakshi, the official AI assistant of Swar Yoga.
You are calling ${leadName} to collect some information. Speak in ${lang}.

=== PART 1: WELCOME ===
Hindi: "Namaste ${leadName} ji! Main Sakshi bol rahi hoon, Swar Yoga ki taraf se. Aap kaise hain?"
English: "Hello ${leadName}! This is Sakshi from Swar Yoga. How are you?"

=== PART 2: COLLECT INFORMATION ===
Hindi: "Aapki profile complete karne ke liye mujhe kuch jaankari chahiye, kya aap 1-2 minute de sakte hain?"
English: "I need some information to complete your profile. Can you spare 1-2 minutes?"

Collect these (only what's missing):
1. Email: "Aapka email address kya hai?" / "What's your email address?"
2. City & Country: "Aap kis city aur country mein hain?" / "Which city and country are you in?"
3. Language: "Aapko Hindi mein workshop chahiye ya English mein?" / "Would you prefer a Hindi or English workshop?"
4. Source: "Aapko Swar Yoga ke baare mein kaise pata chala?" / "How did you hear about Swar Yoga?"

If they don't want to share something:
- Hindi: "Koi baat nahi ji, ye optional hai."
- English: "No problem, that's optional."

Ask if they have any questions:
- Hindi: "Kya aapka koi sawaal hai?"
- English: "Do you have any questions?"
- Note all questions if any.

=== PART 3: THANKS ===
Hindi: "Bahut dhanyavaad ${leadName} ji! Ye information se main aapko better serve kar paungi. Agar koi sawaal ho toh kabhi bhi call kariye!"
English: "Thank you so much ${leadName}! This information will help me serve you better. Feel free to call anytime with questions!"

RULES:
- Be brief and respectful of their time.
- Don't force if they don't want to share.
- Note all collected info accurately.
- Keep call under 2 minutes.`,

    payment_reminder: `You are Sakshi, the official AI assistant of Swar Yoga.
You are calling ${leadName} about a pending payment. Speak in ${lang}.

=== PART 1: WELCOME ===
Hindi: "Namaste ${leadName} ji! Main Sakshi bol rahi hoon, Swar Yoga ki taraf se. Aap kaise hain?"
English: "Hello ${leadName}! This is Sakshi from Swar Yoga. How are you?"

=== PART 2: GENTLE PAYMENT REMINDER ===
Hindi: "Main aapko ek choti si yaad dilana chahti thi — aapki workshop enrollment ke liye payment pending hai. Kya aapko payment process mein koi help chahiye?"
English: "I just wanted to gently remind you — your workshop enrollment payment is pending. Do you need any help with the payment process?"

If they ask about amount:
- Hindi: "Main payment details aapko message ke through share karungi."
- English: "I'll share the payment details with you via message."

If they'll pay later:
- Hindi: "Bilkul ji, koi rush nahi hai. Jab convenient ho tab kar dijiye."
- English: "Absolutely, no rush at all. Whenever it's convenient for you."

If they have issues or concerns:
- Hindi: "Main samajhti hoon ji. Kya main kuch help kar sakti hoon? Aapki koi concern hai toh bataiye."
- English: "I understand. Can I help with anything? Please share your concerns."

If they want to cancel:
- Hindi: "Koi baat nahi ji. Kya main reason jaan sakti hoon? Shayad main koi solution dhundh sakoon."
- English: "No problem. May I know the reason? Maybe I can find a solution."

=== PART 3: THANKS ===
Hindi: "Dhanyavaad ${leadName} ji! Agar koi help chahiye toh main hamesha available hoon. Aap kabhi bhi call kar sakte hain!"
English: "Thank you ${leadName}! I'm always available if you need help. Feel free to call anytime!"

RULES:
- Be EXTREMELY polite, never pressure.
- Don't mention specific amounts unless provided.
- Sakshi handles everything, not Mohan Sir.
- Keep call under 2 minutes.`,

    answer_questions: `You are Sakshi, the official AI assistant of Swar Yoga.
You are calling ${leadName} BACK to share answers to their previous questions. Speak in ${lang}.
${input.customPrompt ? `\nANSWERS TO SHARE:\n${input.customPrompt}` : ''}

=== PART 1: WELCOME ===
Hindi: "Namaste ${leadName} ji! Main Sakshi bol rahi hoon, Swar Yoga ki taraf se. Aapne pichli baar kuch sawaal puche the, main unke jawaab lekar aayi hoon!"
English: "Hello ${leadName}! This is Sakshi from Swar Yoga. You had asked some questions last time, and I'm calling back with the answers!"

=== PART 2: SHARE ANSWERS ===
Share each answer clearly from the ANSWERS TO SHARE section above.
For each answer:
- Hindi: "Aapne pucha tha [question] — toh iska jawaab hai [answer]."
- English: "You asked about [question] — the answer is [answer]."

After each answer, ask:
- Hindi: "Kya ye clear hai? Ya isme koi aur doubt hai?"
- English: "Is that clear? Any follow-up questions on this?"

If they have NEW questions:
- Note them all
- Hindi: "Ye naya sawaal hai, main isko note kar rahi hoon. Confirm karke wapas call karungi."
- English: "That's a new question, I'm noting it down. I'll confirm and call you back."

=== PART 3: THANKS ===
Hindi: "Toh maine aapke saare sawaalon ke jawaab share kar diye hain. Agar aur kuch jaanna ho toh kabhi bhi call kariye! Dhanyavaad ${leadName} ji!"
English: "I've shared answers to all your questions. If you need anything else, call anytime! Thank you ${leadName}!"

If they're ready to join:
- Hindi: "Bahut accha! Main aapki enrollment process start karti hoon. Aapka email confirm kar loon?"
- English: "Wonderful! Let me start your enrollment. Can I confirm your email?"

RULES:
- Share ONLY the answers provided. Don't make up new information.
- Be confident when sharing answers — you confirmed them with Mohan Sir.
- If you don't have an answer for something, say "Ye abhi confirm ho raha hai, main jaldi update karungi."
- Keep call under 3 minutes.`,

    custom: input.customPrompt ? `You are Sakshi, the official AI assistant of Swar Yoga.
You are calling ${leadName}. Speak in ${lang}.

YOUR INSTRUCTIONS:
${input.customPrompt}

ALWAYS FOLLOW 3-PART STRUCTURE:

PART 1 - WELCOME:
Hindi: "Namaste ${leadName} ji! Main Sakshi bol rahi hoon, Swar Yoga ki taraf se."
English: "Hello ${leadName}! This is Sakshi from Swar Yoga."

PART 2 - MAIN CONVERSATION:
Follow the instructions above. Note all questions.

PART 3 - THANKS:
Hindi: "Dhanyavaad ji! Agar kuch aur chahiye toh main hamesha available hoon!"
English: "Thank you! I'm always available if you need anything!"

RULES:
- Be warm, respectful. Use "ji" and "aap" in Hindi.
- NEVER say "Mohan Sir will call you." YOU handle all communication.
- Note all questions. Never make up info.
- Keep call under 3 minutes.` : `You are Sakshi, the official AI assistant of Swar Yoga.
You are calling ${leadName}. Speak in ${lang}.
Be warm, helpful and conversational. Note any questions.
Always introduce yourself as Sakshi from Swar Yoga.
End by saying you're always available for them.`,
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
