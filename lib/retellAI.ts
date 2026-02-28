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
  const purposePrompts: Record<string, string> = {
    follow_up: `You are calling ${input.leadName} as a follow-up from Swar Yoga. Ask how they are doing, if they have any questions about the yoga program, and if they'd like to join an upcoming session.`,
    workshop_reminder: `You are calling ${input.leadName} to remind them about the upcoming Swar Yoga workshop${input.leadContext?.workshopName ? ` "${input.leadContext.workshopName}"` : ''}. Confirm their attendance and share any important details.`,
    collect_info: `You are calling ${input.leadName} from Swar Yoga. Politely collect the following missing information: email address, preferred language, and country. Be warm and conversational.`,
    payment_reminder: `You are calling ${input.leadName} regarding a pending payment for Swar Yoga services. Be polite and helpful, offer to assist with the payment process.`,
    welcome: `You are calling ${input.leadName} to welcome them to Swar Yoga! Introduce yourself, briefly explain the benefits of Swar Yoga, and ask if they have any questions.`,
    custom: input.customPrompt || `You are calling ${input.leadName} from Swar Yoga. Be helpful and conversational.`,
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
