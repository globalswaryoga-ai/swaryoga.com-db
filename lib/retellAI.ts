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
import { getAICallTemplate, getAgentLanguageMapping } from '@/lib/schemas/enterpriseSchemas';

const RETELL_API_BASE = 'https://api.retellai.com';

/** Human-readable language labels for prompt injection */
export const LANGUAGE_LABELS: Record<string, string> = {
  hi: 'Hindi', en: 'English', mr: 'Marathi',
  zh: 'Mandarin', es: 'Spanish', fr: 'French',
  ar: 'Arabic', de: 'German', pt: 'Portuguese',
  ja: 'Japanese', ko: 'Korean', ru: 'Russian',
  it: 'Italian', tr: 'Turkish', nl: 'Dutch',
  sv: 'Swedish', th: 'Thai', id: 'Indonesian',
  multi: 'Multilingual',
};

interface RetellConfig {
  apiKey: string;
  agentId: string;
  fromNumber: string;
}

function getConfig(language?: string): RetellConfig {
  const apiKey = process.env.RETELL_API_KEY || '';
  const fromNumber = process.env.RETELL_FROM_NUMBER || '';
  // Route English leads to the English agent, all others to Hindi agent
  const agentId = (language === 'en')
    ? (process.env.RETELL_AGENT_ID_EN || process.env.RETELL_AGENT_ID || '')
    : (process.env.RETELL_AGENT_ID || '');
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

// ── Outbound Info Scripts (2-minute info-only calls) ──

const OUTBOUND_SCRIPTS: Record<string, Record<'hi' | 'en', string>> = {
  interest_thanks: {
    hi: `Namaste {{lead_name}} ji! Main Meera bol rahi hoon Swar Yoga se.\nAapne hamara program dekha aur interest dikhaya — iske liye bahut bahut shukriya ji!\nSwar Yoga ek exceptional wellness journey hai, jisme Mohan Sir personally guide karte hain.\nAap bilkul sahi jagah aaye hain. Hum aapka Swar Yoga parivaar mein bahut warm swagat karte hain!\nJald hi aapko aage ki puri information milegi.\nKoi bhi sawaal ho toh hume zaroor call karein.\nDhanyavaad ji! Aapka din shubh aur swasth ho!`,
    en: `Namaste {{lead_name}} ji! I am Maira calling from Swar Yoga.\nThank you so much for showing interest in our program — we truly appreciate it ji!\nSwar Yoga is an exceptional wellness journey personally guided by Mohan Sir.\nYou have come to exactly the right place — we warmly welcome you!\nYou will soon receive complete information about your next steps.\nIf you have any questions, please feel free to call us anytime.\nThank you ji! Have a wonderful and healthy day!`,
  },
  welcome_new: {
    hi: `Namaste {{lead_name}} ji! Main Meera bol rahi hoon Swar Yoga se.\nAapka Swar Yoga parivaar mein bahut bahut warm swagat hai ji!\nMohan Sir personally aapki wellness journey mein guide karenge.\nYe ek bahut special step hai — aapne bilkul sahi decision liya ji.\nJald hi aapko schedule aur aage ke steps ki jaankari milegi.\nKoi bhi sawal ho toh hume kabhi bhi call karein.\nDhanyavaad ji! Aap hamare Swar Yoga parivaar ka hissa hain!`,
    en: `Namaste {{lead_name}} ji! I am Maira calling from Swar Yoga.\nA very warm welcome to the Swar Yoga family ji!\nMohan Sir will personally guide you on your wellness journey.\nYou have taken a wonderful step — we are so glad you are with us ji!\nYou will soon receive your schedule and next steps on WhatsApp.\nPlease feel free to reach out anytime if you have questions.\nThank you ji! You are now part of our Swar Yoga family!`,
  },
  batch_update: {
    hi: `Namaste {{lead_name}} ji! Main Meera bol rahi hoon Swar Yoga se.\nEk important update share karne ke liye call kar rahi hoon.\nSwar Yoga ka naya batch shuru hone wala hai!\nNaye batch mein Mohan Sir ke saath bahut khaas sessions honge.\nAgar aap join karna chahte hain, toh please jaldi confirm karein — seats limited hain ji.\nAage ki details aapko WhatsApp par milegi.\nKisi bhi sawaal ke liye hume call karein. Dhanyavaad ji!`,
    en: `Namaste {{lead_name}} ji! I am Maira calling from Swar Yoga.\nI am calling to share an important update with you.\nA new batch of Swar Yoga is starting very soon!\nThe new batch includes special sessions with Mohan Sir.\nSeats are limited ji, so please confirm quickly if you would like to join.\nYou will receive all details on WhatsApp.\nFor any questions, please call us. Thank you ji!`,
  },
  demo_invite: {
    hi: `Namaste {{lead_name}} ji! Main Meera bol rahi hoon Swar Yoga se.\nAapke liye ek bahut khaas invitation hai!\nSwar Yoga ka free demo session hone wala hai.\nIsme aap Mohan Sir se directly milenge aur Swar Yoga ko personally experience kar sakte hain.\nYe bilkul free hai — lekin seats limited hain, toh please jaldi join karein ji.\nSession ki puri details aapko WhatsApp par milegi.\nDhanyavaad ji! Hum aapka intezaar karenge!`,
    en: `Namaste {{lead_name}} ji! I am Maira calling from Swar Yoga.\nI have a very special invitation for you!\nSwar Yoga is hosting a free demo session soon.\nYou will get to meet Mohan Sir directly and personally experience Swar Yoga.\nIt is completely free — but seats are very limited ji, so please join quickly!\nComplete details will be sent to you on WhatsApp.\nThank you ji! We look forward to seeing you there!`,
  },
  seat_confirmed: {
    hi: `Namaste {{lead_name}} ji! Main Meera bol rahi hoon Swar Yoga se.\nEk bahut khushi ki khabar share karne ke liye call kar rahi hoon!\nAapki seat Swar Yoga mein confirm ho gayi hai!\nMohan Sir personally aapka intezaar kar rahe hain.\nJald hi aapko complete schedule aur joining details WhatsApp par milenge.\nPlease apne calendar mein jagah zaroor rakhein ji.\nDhanyavaad ji! Aap Swar Yoga parivaar ka hissa hain!`,
    en: `Namaste {{lead_name}} ji! I am Maira calling from Swar Yoga.\nI am calling to share some wonderful news!\nYour seat in Swar Yoga has been confirmed ji!\nMohan Sir is personally looking forward to having you with us.\nYour complete schedule and joining details will be sent on WhatsApp very soon.\nPlease keep the time free in your calendar ji!\nThank you! You are now officially part of the Swar Yoga family!`,
  },
  payment_confirmed: {
    hi: `Namaste {{lead_name}} ji! Main Meera bol rahi hoon Swar Yoga se.\nEk accha update share karne ke liye call kar rahi hoon!\nAapka payment successfully receive ho gaya hai — bahut bahut shukriya ji!\nAapki enrollment ab poori tarah complete ho gayi hai.\nJald hi aapko session schedule aur joining details WhatsApp par milenge.\nKoi bhi sawaal ho toh hume zaroor batayein.\nDhanyavaad ji! Swar Yoga mein aapka swagat hai!`,
    en: `Namaste {{lead_name}} ji! I am Maira calling from Swar Yoga.\nI am calling to share a wonderful update!\nYour payment has been successfully received — thank you so much ji!\nYour enrollment is now fully complete.\nYou will soon receive your session schedule and joining details on WhatsApp.\nPlease reach out if you have any questions at all.\nThank you ji! Welcome to Swar Yoga!`,
  },
  session_scheduled: {
    hi: `Namaste {{lead_name}} ji! Main Meera bol rahi hoon Swar Yoga se.\nEk exciting update share karne ke liye call kar rahi hoon!\nAapka live session Mohan Sir ke saath schedule ho gaya hai!\nSession ki puri details aapko WhatsApp par bhej di gayi hain — please check karein.\nSamay par join karein — ye session specially aapke liye hai ji.\nKoi bhi sawaal ho toh hume zaroor call karein.\nDhanyavaad ji! Session mein milenge!`,
    en: `Namaste {{lead_name}} ji! I am Maira calling from Swar Yoga.\nI am calling to share an exciting update!\nYour live session with Mohan Sir has been scheduled ji!\nAll the details have been sent to you on WhatsApp — please check.\nPlease join on time — this session is specially for you ji!\nFor any questions, please do call us.\nThank you ji! See you in the session!`,
  },
};

function buildOutboundInfoPrompt(scriptKey: string, language: string, leadName: string): string {
  const isEnglish = language === 'en';
  const agentName = isEnglish ? 'Maira' : 'Meera';
  const scripts = OUTBOUND_SCRIPTS[scriptKey];
  if (!scripts) return '';

  const script = (isEnglish ? scripts.en : scripts.hi).replace(/\{\{lead_name\}\}/g, leadName);

  return `You are ${agentName}, the official AI assistant of Swar Yoga, calling ${leadName} ji.

YOUR MESSAGE TO DELIVER:
${script}

INSTRUCTIONS:
- Deliver this message naturally, warmly, in under 2 minutes.
- After delivering: ask once "Kya aapke koi sawaal hain ji?" (Do you have any questions?)
- If they have questions: "Main note kar leti hoon. Aapko jald wapas call karenge ji."
- End the call warmly after the message.
- Use "ji" and speak respectfully. Be warm, natural — not robotic.
- Do NOT extend the call beyond 2 minutes.`;
}

// ── Call Management ──

export interface CreateCallInput {
  toNumber: string; // E.164 format e.g. +919673322573
  leadName: string;
  purpose: 'follow_up' | 'workshop_reminder' | 'collect_info' | 'payment_reminder' | 'welcome' | 'answer_questions' | 'custom'
    | 'interest_thanks' | 'welcome_new' | 'batch_update' | 'demo_invite' | 'seat_confirmed' | 'payment_confirmed' | 'session_scheduled';
  language: string; // 'hi', 'en', 'ne', 'mr', 'ta', 'te', etc.
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
  overrideAgentId?: string; // Use a different agent for this call (manual override)
  overrideVoiceId?: string; // Force a specific voice_id (e.g. female voice)
  fromNumber?: string; // Override from number
}

export interface CreateCallResult {
  success: boolean;
  callId?: string;
  error?: string;
}

/**
 * Try loading a call prompt template from DB.
 * Maps purpose to new key format (ob_welcome, ob_follow_up, etc.) and filters by language.
 * Returns null if not found — caller should fall back to hardcoded prompt.
 */
async function loadTemplateFromDB(purpose: string, language?: string): Promise<string | null> {
  try {
    await connectDB();
    const AICallTemplate = getAICallTemplate();

    // Map old purpose keys to new outbound keys
    const keyMap: Record<string, string> = {
      welcome: 'ob_welcome',
      follow_up: 'ob_follow_up',
      answer_questions: 'ob_answer',
      workshop_reminder: 'ob_workshop',
      collect_info: 'ob_collect',
      payment_reminder: 'ob_payment',
      custom: 'ob_welcome',
      interest_thanks: 'ob_interest_thanks',
      welcome_new: 'ob_welcome_new',
      batch_update: 'ob_batch_update',
      demo_invite: 'ob_demo_invite',
      seat_confirmed: 'ob_seat_confirmed',
      payment_confirmed: 'ob_payment_confirmed',
      session_scheduled: 'ob_session_scheduled',
    };
    const dbKey = keyMap[purpose] || purpose;
    const lang = language || 'hi';

    // Try exact language match first, then fallback to any active
    let template = await AICallTemplate.findOne({ key: dbKey, language: lang, isActive: true }).lean() as any;
    if (!template) {
      template = await AICallTemplate.findOne({ key: dbKey, isActive: true }).lean() as any;
    }

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
 * Resolve the best Retell agent for a given language using the DB mapping.
 * Falls back to the default agent (RETELL_AGENT_ID env var) if no mapping found.
 * Returns { agentId, agentName, voiceId } or null if no agent available.
 */
export async function resolveAgentForLanguage(language: string): Promise<{ agentId: string; agentName: string; voiceId?: string } | null> {
  try {
    await connectDB();
    const AgentLanguageMapping = getAgentLanguageMapping();

    // Normalize: 'hi-IN' → 'hi', 'en-US' → 'en'
    const normalizedLang = language?.toLowerCase().split('-')[0] || 'hi';

    // Try exact match first
    let mapping = await AgentLanguageMapping.findOne({ language: normalizedLang, isActive: true }).lean() as any;

    // Try with full code if no short match
    if (!mapping && language !== normalizedLang) {
      mapping = await AgentLanguageMapping.findOne({ language: language.toLowerCase(), isActive: true }).lean() as any;
    }

    // Try 'multi' (multilingual agent) as second fallback
    if (!mapping) {
      mapping = await AgentLanguageMapping.findOne({ language: 'multi', isActive: true }).lean() as any;
    }

    // Try default agent mapping
    if (!mapping) {
      mapping = await AgentLanguageMapping.findOne({ isDefault: true, isActive: true }).lean() as any;
    }

    if (mapping) {
      return {
        agentId: mapping.agentId,
        agentName: mapping.agentName || `Agent (${normalizedLang})`,
        voiceId: mapping.voiceId || undefined,
      };
    }

    // Ultimate fallback: env variable
    const config = getConfig();
    if (config.agentId) {
      return { agentId: config.agentId, agentName: 'Default Agent (env)' };
    }

    return null;
  } catch (err) {
    console.warn('[retellAI] resolveAgentForLanguage failed, using env fallback:', err);
    const config = getConfig();
    return config.agentId ? { agentId: config.agentId, agentName: 'Default Agent (env)' } : null;
  }
}

/**
 * Create and trigger an outbound AI call via Retell
 */
export async function createOutboundCall(input: CreateCallInput): Promise<CreateCallResult> {
  if (!isConfigured()) {
    return { success: false, error: 'Retell AI is not configured. Set RETELL_API_KEY and RETELL_AGENT_ID in environment variables.' };
  }

  const config = getConfig();

  // Resolve agent: manual override > language mapping > env default
  let agentId: string;
  let resolvedVoiceId: string | undefined;
  if (input.overrideAgentId) {
    agentId = input.overrideAgentId;
  } else {
    const resolved = await resolveAgentForLanguage(input.language);
    agentId = resolved?.agentId || config.agentId;
    resolvedVoiceId = resolved?.voiceId;
  }

  // Voice priority: explicit override > language mapping > env fallback
  const voiceId = input.overrideVoiceId || resolvedVoiceId || process.env.RETELL_VOICE_ID || undefined;

  const fromNumber = input.fromNumber || config.fromNumber;

  if (!fromNumber) {
    return { success: false, error: 'No from_number configured. Set RETELL_FROM_NUMBER or provide fromNumber.' };
  }

  // Build dynamic variables for the agent prompt
  const langLabel = LANGUAGE_LABELS[input.language] || input.language || 'Hindi';
  const dynamicVars: Record<string, string> = {
    lead_name: input.leadName || 'there',
    call_purpose: input.purpose,
    language: langLabel,
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
  const lang = langLabel;
  const leadName = input.leadName || 'ji';
  const workshopName = input.leadContext?.workshopName || 'Swar Yoga workshop';

  const purposePrompts: Record<string, string> = {

    welcome: `You are Meera, the official AI assistant of Swar Yoga. You work under Mohan Sir.
You are calling ${leadName}. Speak in ${lang}. Start in Hindi unless the caller speaks English.

YOUR ROLE:
- You handle ALL calls. Mohan Sir does NOT call anyone directly.
- You collect questions, Mohan Sir updates answers in the system, and YOU call back with the answers.
- Over time, you learn more and become better at helping people.

EVERY CALL HAS 3 PARTS:

PART 1 - WELCOME:
- "Namaste! Mera Naam Meera hai, Swar Yogase bolrahi hnu, Swar Yoga Me call karaneke liye Dhanyawad ! Kahiye mai aapki kya sahayatta kar saktihnu?" aap ke Har Sawal ka Javab Dene ki Koshish Karungi,
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
- You are Meera — a real assistant, not a robot. Be friendly and conversational.
- NEVER make up workshop dates, fees, timings, or schedules.
- NEVER say "Mohan Sir aapko call karenge" — YOU (Meera) will always call back.
- If someone asks to talk to Mohan Sir directly: "Mohan Sir bahut busy rehte hain, lekin main unse aapke liye baat karke sab confirm karungi. Aap mujh par bharosa rakhiye ji!"
- Note every question for the system.
- Keep calls under 3 minutes.
- Be warm, natural, like a real person.`,

    follow_up: `You are Meera, the official AI assistant of Swar Yoga. You work under Mohan Sir.
You are calling ${leadName} for a follow-up. Speak in ${lang}. Start in Hindi unless the caller speaks English.

YOUR ROLE:
- You handle ALL calls. Mohan Sir does NOT call anyone directly.
- You collect questions, Mohan Sir updates answers in the system, and YOU call back with the answers.

PART 1 - WELCOME:
- "Namaste ${leadName} ji! Mera Naam Meera hai, Swar Yogase bolrahi hnu. Aap kaise hain?"
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
- "Dhanyavaad ${leadName} ji! Agar koi bhi sawaal ho toh aap kabhi bhi call kar sakte hain. Main Meera, hamesha aapke liye available hnu!"

RULES:
- Always be warm, respectful. Use "ji" and "aap".
- You are Meera — a real assistant, not a robot. Be friendly and conversational.
- NEVER make up workshop dates, fees, timings, or schedules.
- NEVER say "Mohan Sir aapko call karenge" — YOU (Meera) will always call back.
- If someone asks to talk to Mohan Sir directly: "Mohan Sir bahut busy rehte hain, lekin main unse aapke liye baat karke sab confirm karungi. Aap mujh par bharosa rakhiye ji!"
- Be warm, not pushy. Never pressure.
- Note every question for the system.
- Keep calls under 3 minutes.`,

    workshop_reminder: `You are Meera, the official AI assistant of Swar Yoga. You work under Mohan Sir.
You are calling ${leadName} about their workshop enrollment. Speak in ${lang}. Start in Hindi unless the caller speaks English.

YOUR ROLE:
- You handle ALL calls. Mohan Sir does NOT call anyone directly.
- You collect questions, Mohan Sir updates answers in the system, and YOU call back with the answers.

PART 1 - WELCOME:
- "Namaste ${leadName} ji! Mera Naam Meera hai, Swar Yogase bolrahi hnu. Bahut badhaai ho!"

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
- You are Meera — a real assistant, not a robot. Be friendly and conversational.
- NEVER make up workshop dates, fees, timings, or schedules.
- NEVER say "Mohan Sir aapko call karenge" — YOU (Meera) will always call back.
- If someone asks to talk to Mohan Sir directly: "Mohan Sir bahut busy rehte hain, lekin main unse aapke liye baat karke sab confirm karungi. Aap mujh par bharosa rakhiye ji!"
- Be enthusiastic and congratulatory.
- Note every question for the system.
- Keep calls under 3 minutes.`,

    collect_info: `You are Meera, the official AI assistant of Swar Yoga. You work under Mohan Sir.
You are calling ${leadName} to collect some information. Speak in ${lang}. Start in Hindi unless the caller speaks English.

YOUR ROLE:
- You handle ALL calls. Mohan Sir does NOT call anyone directly.
- You collect questions, Mohan Sir updates answers in the system, and YOU call back with the answers.

PART 1 - WELCOME:
- "Namaste ${leadName} ji! Mera Naam Meera hai, Swar Yogase bolrahi hnu. Aap kaise hain?"

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
- You are Meera — a real assistant, not a robot. Be friendly and conversational.
- NEVER make up workshop dates, fees, timings, or schedules.
- NEVER say "Mohan Sir aapko call karenge" — YOU (Meera) will always call back.
- Be brief and respectful of their time.
- Don't force if they don't want to share.
- Note all collected info accurately.
- Keep calls under 2 minutes.`,

    payment_reminder: `You are Meera, the official AI assistant of Swar Yoga. You work under Mohan Sir.
You are calling ${leadName} about a pending payment. Speak in ${lang}. Start in Hindi unless the caller speaks English.

YOUR ROLE:
- You handle ALL calls. Mohan Sir does NOT call anyone directly.
- You collect questions, Mohan Sir updates answers in the system, and YOU call back with the answers.

PART 1 - WELCOME:
- "Namaste ${leadName} ji! Mera Naam Meera hai, Swar Yogase bolrahi hnu. Aap kaise hain?"

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
- You are Meera — a real assistant, not a robot. Be friendly and conversational.
- Be EXTREMELY polite, never pressure.
- NEVER make up workshop dates, fees, timings, or schedules.
- NEVER say "Mohan Sir aapko call karenge" — YOU (Meera) will always call back.
- If someone asks to talk to Mohan Sir directly: "Mohan Sir bahut busy rehte hain, lekin main unse aapke liye baat karke sab confirm karungi. Aap mujh par bharosa rakhiye ji!"
- Don't mention specific amounts unless provided.
- Note every question for the system.
- Keep calls under 2 minutes.`,

    answer_questions: input.language === 'en'
      ? `You are Maira, the official AI assistant of Swar Yoga. You are calling ${leadName} ji BACK with answers to their questions. Speak in English. Maximum 3 minutes.
${input.customPrompt ? `\nANSWERS FROM MOHAN SIR:\n${input.customPrompt}` : ''}

──────────────────────────────────────
STEP 1 — GREETING
──────────────────────────────────────
"Namaste ${leadName} ji! I am Maira from Swar Yoga. You had asked some questions earlier — I have the answers from Mohan Sir for you now!"

──────────────────────────────────────
STEP 2 — SHARE EACH ANSWER
──────────────────────────────────────
For each answer: "You had asked [question] — Mohan Sir's answer is: [answer]."
After each one: "Is that clear ji? Any doubt on this?"
If they ask NEW questions: "That is a new question ji — I will note it and call you back soon."
Keep asking: "Any other questions ji?" until they are done.

──────────────────────────────────────
STEP 3 — WRAP UP
──────────────────────────────────────
"I have shared all the answers now ji."
"If anything else comes up, please call us anytime!"
"Thank you ${leadName} ji! Welcome to Swar Yoga!"

RULES: Max 3 minutes. Share ONLY answers provided — never make up information. Be warm, use "ji". YOU (Maira) always call back, never Mohan Sir.`
      : `You are Meera, the official AI assistant of Swar Yoga. You are calling ${leadName} ji BACK with answers to their questions. Speak in Hindi. Maximum 3 minutes.
${input.customPrompt ? `\nMOHAN SIR KE JAWAAB:\n${input.customPrompt}` : ''}

──────────────────────────────────────
STEP 1 — GREETING
──────────────────────────────────────
"Namaste ${leadName} ji! Main Meera bol rahi hoon, Swar Yoga se. Aapne pichli baar kuch sawaal puche the — main Mohan Sir se jawaab lekar aayi hoon!"

──────────────────────────────────────
STEP 2 — HAR JAWAB SHARE KAREIN
──────────────────────────────────────
Har jawaab ke liye: "Aapne pucha tha [sawaal] — Mohan Sir ka jawaab hai: [jawaab]."
Baad mein poochein: "Kya ye clear hai ji? Koi aur doubt hai?"
Agar naya sawaal poochein: "Ye naya sawaal hai ji — main note kar leti hoon. Jald hi wapas call karungi."
Poochte rahein: "Aur koi sawaal hai ji?" — jab tak sab khatam na ho jaye.

──────────────────────────────────────
STEP 3 — CALL KHATAM KAREIN
──────────────────────────────────────
"Maine aapke saare sawaalon ke jawaab share kar diye hain ji."
"Agar kuch aur poochna ho toh kabhi bhi call kariye!"
"Dhanyavaad ${leadName} ji! Swar Yoga mein aapka swagat hai!"

RULES: Max 3 minutes. Sirf diye gaye jawaab share karein — kuch bhi banao mat. Warm raho, "ji" use karo. YOU (Meera) call back karti hain, Mohan Sir nahi.`,

    // ── 7 outbound info-only scripts (max 2 min, info delivery) ──
    interest_thanks:  buildOutboundInfoPrompt('interest_thanks',  input.language, leadName),
    welcome_new:      buildOutboundInfoPrompt('welcome_new',      input.language, leadName),
    batch_update:     buildOutboundInfoPrompt('batch_update',     input.language, leadName),
    demo_invite:      buildOutboundInfoPrompt('demo_invite',      input.language, leadName),
    seat_confirmed:   buildOutboundInfoPrompt('seat_confirmed',   input.language, leadName),
    payment_confirmed:buildOutboundInfoPrompt('payment_confirmed',input.language, leadName),
    session_scheduled:buildOutboundInfoPrompt('session_scheduled',input.language, leadName),

    custom: input.customPrompt ? `You are Meera, the official AI assistant of Swar Yoga. You work under Mohan Sir.
You are calling ${leadName}. Speak in ${lang}. Start in Hindi unless the caller speaks English.

YOUR ROLE:
- You handle ALL calls. Mohan Sir does NOT call anyone directly.
- You collect questions, Mohan Sir updates answers in the system, and YOU call back with the answers.

YOUR INSTRUCTIONS:
${input.customPrompt}

EVERY CALL HAS 3 PARTS:

PART 1 - WELCOME:
- "Namaste ${leadName} ji! Mera Naam Meera hai, Swar Yoga se bol rahi hnu."

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
- You are Meera — a real assistant, not a robot. Be friendly and conversational.
- NEVER make up workshop dates, fees, timings, or schedules.
- NEVER say "Mohan Sir aapko call karenge" — YOU (Meera) will always call back.
- If someone asks to talk to Mohan Sir directly: "Mohan Sir bahut busy rehte hain, lekin main unse aapke liye baat karke sab confirm karungi. Aap mujh par bharosa rakhiye ji!"
- Note every question for the system.
- Keep calls under 3 minutes.` : `You are Meera, the official AI assistant of Swar Yoga. You work under Mohan Sir.
You are calling ${leadName}. Speak in ${lang}. Start in Hindi unless the caller speaks English.
Be warm, helpful and conversational. Note any questions.
Always introduce yourself: "Namaste! Mera Naam Meera hai, Swar Yoga se bol rahi hnu."
End by saying you're always available for them.
NEVER say "Mohan Sir aapko call karenge" — YOU (Meera) will always call back.`,
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

    const dbTemplate = await loadTemplateFromDB(input.purpose, input.language);
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
        ...(voiceId ? { voice_id: voiceId } : {}),
      };
    } else if (voiceId) {
      // Even without prompt override, force voice_id if specified
      body.override_agent = { voice_id: voiceId };
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

// ── Batch Calls ──

export interface BatchCallTask {
  toNumber: string;       // E.164 e.g. +919673322573
  leadName: string;
  leadId?: string;
  dynamicVars?: Record<string, string>;
}

export interface CreateBatchCallInput {
  name: string;                // Batch name / label
  tasks: BatchCallTask[];      // List of numbers to dial
  purpose: string;             // welcome, follow_up, etc.
  language: string;            // 'hi', 'en', 'ne', 'mr', etc.
  customPrompt?: string;
  callMode?: 'info_only' | 'interactive' | 'qa_interactive';
  fromNumber?: string;
  overrideAgentId?: string;
  overrideVoiceId?: string;    // Force a specific voice_id (e.g. female voice)
  scheduledAt?: string;        // ISO string – omit for "Send Now"
  maxConcurrency?: number;     // Retell concurrency limit (default 5)
}

export interface CreateBatchCallResult {
  success: boolean;
  batchId?: string;
  totalTasks?: number;
  estimatedCost?: string;      // e.g. "$0.25"
  error?: string;
}

/**
 * Create a batch of outbound calls via Retell's batch API.
 * Retell endpoint: POST /v2/create-batch-call
 * Falls back to sequential single calls if batch fails.
 */
export async function createBatchCall(input: CreateBatchCallInput): Promise<CreateBatchCallResult> {
  if (!isConfigured()) {
    return { success: false, error: 'Retell AI is not configured. Set RETELL_API_KEY and RETELL_AGENT_ID.' };
  }

  const config = getConfig();

  // Resolve agent: manual override > language mapping > env default
  let agentId: string;
  let resolvedVoiceId: string | undefined;
  if (input.overrideAgentId) {
    agentId = input.overrideAgentId;
  } else {
    const resolved = await resolveAgentForLanguage(input.language);
    agentId = resolved?.agentId || config.agentId;
    resolvedVoiceId = resolved?.voiceId;
  }

  // Voice priority: explicit override > language mapping > env fallback
  const voiceId = input.overrideVoiceId || resolvedVoiceId || process.env.RETELL_VOICE_ID || undefined;

  const fromNumber = input.fromNumber || config.fromNumber;

  if (!fromNumber) {
    return { success: false, error: 'No from_number configured. Set RETELL_FROM_NUMBER or provide fromNumber.' };
  }

  if (!input.tasks.length) {
    return { success: false, error: 'No tasks provided for batch call.' };
  }

  const lang = LANGUAGE_LABELS[input.language] || input.language || 'Hindi';

  // Try loading prompt from DB
  const templateVars: Record<string, string> = { lang, customPrompt: input.customPrompt || '' };
  const dbTemplate = await loadTemplateFromDB(input.purpose, input.language);
  let generalPrompt = dbTemplate ? interpolateTemplate(dbTemplate, templateVars) : undefined;

  // If no DB template, use purpose prompts (build a generic one)
  if (!generalPrompt && input.customPrompt) {
    generalPrompt = input.customPrompt;
  }

  try {
    // Build task list for Retell batch API
    const tasks = input.tasks.map(t => {
      const num = t.toNumber.startsWith('+') ? t.toNumber : `+${t.toNumber}`;
      const taskVars: Record<string, string> = {
        lead_name: t.leadName || 'there',
        purpose: input.purpose,          // matches {{purpose}} in agent prompt → triggers OUTBOUND flow
        call_purpose: input.purpose,     // legacy alias
        language: lang,
        ...(t.dynamicVars || {}),
      };
      // Set custom_instructions based on callMode
      if (input.customPrompt) {
        const mode = input.callMode || 'interactive';
        if (mode === 'info_only') {
          taskVars.custom_instructions = `INFORMATION-ONLY CALL — READ SCRIPT BELOW AND HANG UP. DO NOT ASK ANY QUESTIONS.\n\n${input.customPrompt}`;
        } else if (mode === 'qa_interactive') {
          taskVars.custom_instructions = `QA-INTERACTIVE CALL — ANSWER ALL QUESTIONS THE CALLER ASKS, THEN HAVE AN INTERACTIVE CONVERSATION.\n\n${input.customPrompt}`;
        }
        // interactive mode: no custom_instructions, agent follows standard flow
      }

      return {
        to_number: num,
        retell_llm_dynamic_variables: taskVars,
      };
    });

    const body: any = {
      from_number: fromNumber.startsWith('+') ? fromNumber : `+${fromNumber}`,
      agent_id: agentId,
      tasks,
      name: input.name || `Batch ${input.purpose} - ${lang}`,
    };

    if (input.maxConcurrency) {
      body.max_concurrency = input.maxConcurrency;
    }

    const result = await retellFetch('/create-batch-call', {
      method: 'POST',
      body: JSON.stringify(body),
    });

    const costPerDial = 0.07; // $0.07 per minute avg
    const estimatedCost = `$${(input.tasks.length * costPerDial).toFixed(2)}`;

    return {
      success: true,
      batchId: result.batch_id || result.batch_call_id || result.id,
      totalTasks: input.tasks.length,
      estimatedCost,
    };
  } catch (err: any) {
    console.error('[retellAI] createBatchCall error:', err);

    // If batch API not available, indicate it failed
    return {
      success: false,
      error: `Batch call failed: ${err.message}. You can use individual calls instead.`,
    };
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
 * Parse and map a Retell webhook event to our internal call status.
 * Retell call_status values: 'registered', 'ongoing', 'ended', 'error', 'not_connected'
 */
export function mapRetellStatus(callStatus: string, event: string): string {
  if (event === 'call_started') return 'in_progress';
  if (event === 'call_ended' || event === 'call_analyzed') {
    switch (callStatus) {
      case 'ended': return 'completed';
      case 'error': return 'failed';
      case 'not_connected': return 'failed'; // dial_no_answer, dial_busy, dial_failed etc.
      default: return 'completed';
    }
  }
  // call_started or unknown event
  if (callStatus === 'ongoing') return 'in_progress';
  if (callStatus === 'registered') return 'queued';
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
    voicemail_reached: 'Voicemail reached',
    max_duration_reached: 'Max duration reached',
    concurrency_limit_reached: 'System busy',
    no_valid_payment: 'Payment issue',
    dial_busy: 'Line busy',
    dial_failed: 'Call failed to connect',
    dial_no_answer: 'No answer',
    error_inbound_webhook: 'Webhook error',
    error_llm_websocket_open: 'AI connection error',
    error_llm_websocket_lost_connection: 'AI connection lost',
    error_llm_websocket_runtime: 'AI runtime error',
    error_llm_websocket_corrupt_payload: 'AI corrupt payload',
    error_llm_websocket: 'AI connection error',
    error_frontend_corrupted_payload: 'Client error',
    error_twilio: 'Telephony error',
    error_no_audio_received: 'No audio received',
    error_asr: 'Speech recognition error',
    error_retell: 'Retell platform error',
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
  return retellFetch('/list-agents');
}

/**
 * Get agent details
 */
export async function getAgent(agentId: string) {
  return retellFetch(`/get-agent/${agentId}`);
}

/**
 * List phone numbers
 */
export async function listPhoneNumbers() {
  return retellFetch('/list-phone-numbers');
}

/**
 * List available voices from Retell AI
 */
export async function listVoices() {
  return retellFetch('/list-voices');
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
  createBatchCall,
  checkRetellConfig,
  resolveAgentForLanguage,
  isConfigured: () => isConfigured(),
  listAgents,
  getAgent,
  listPhoneNumbers,
  listVoices,
  getCallDetails,
  mapRetellStatus,
  mapDisconnectionReason,
  extractCollectedData,
  LANGUAGE_LABELS,
};
