/**
 * Meta WhatsApp Business API - Template Management
 * 
 * Handles:
 * - Submitting templates to Meta for approval
 * - Syncing template status from Meta
 * - Importing existing Meta-approved templates
 */

import { getWhatsAppEnv } from './whatsapp';

// Meta Graph API version
const META_API_VERSION = 'v24.0';

export interface MetaTemplateComponent {
  type: 'HEADER' | 'BODY' | 'FOOTER' | 'BUTTONS';
  format?: 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT';
  text?: string;
  example?: {
    header_text?: string[];
    body_text?: string[][];
    header_handle?: string[];
  };
  buttons?: Array<{
    type: 'QUICK_REPLY' | 'URL' | 'PHONE_NUMBER' | 'COPY_CODE';
    text: string;
    url?: string;
    phone_number?: string;
  }>;
}

export interface MetaTemplateSubmission {
  name: string;
  category: 'MARKETING' | 'UTILITY' | 'AUTHENTICATION';
  language: string;
  components: MetaTemplateComponent[];
}

export interface MetaTemplate {
  id: string;
  name: string;
  status: 'APPROVED' | 'PENDING' | 'REJECTED' | 'DISABLED' | 'IN_APPEAL' | 'PENDING_DELETION';
  category: string;
  language: string;
  components?: MetaTemplateComponent[];
  quality_score?: {
    score: string;
    date: number;
  };
  rejected_reason?: string;
}

export interface MetaTemplateListResponse {
  data: MetaTemplate[];
  paging?: {
    cursors: { before: string; after: string };
    next?: string;
  };
}

/**
 * Get the WhatsApp Business Account ID from environment
 */
export function getWABAId(): string | null {
  const wabaId = (process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || '').trim();
  if (!wabaId) {
    console.warn('[META-TEMPLATES] WHATSAPP_BUSINESS_ACCOUNT_ID not set');
    return null;
  }
  return wabaId;
}

/**
 * Build the appsecret_proof if META_APP_SECRET is available
 */
function buildAppSecretProof(accessToken: string, appSecret?: string): string {
  if (!appSecret) return '';
  const crypto = require('crypto');
  const hmac = crypto.createHmac('sha256', appSecret);
  hmac.update(accessToken);
  return hmac.digest('hex');
}

/**
 * Submit a template to Meta for approval
 * 
 * @param template - Template data to submit
 * @returns Meta API response with template ID
 */
export async function submitTemplateToMeta(template: MetaTemplateSubmission): Promise<{
  success: boolean;
  metaTemplateId?: string;
  status?: string;
  error?: string;
}> {
  const env = getWhatsAppEnv();
  if (!env) {
    return { success: false, error: 'WhatsApp Cloud API not configured' };
  }

  const wabaId = getWABAId();
  if (!wabaId) {
    return { success: false, error: 'WHATSAPP_BUSINESS_ACCOUNT_ID not configured' };
  }

  const { accessToken, appSecret } = env;
  const proof = buildAppSecretProof(accessToken, appSecret);

  let url = `https://graph.facebook.com/${META_API_VERSION}/${wabaId}/message_templates`;
  if (proof) {
    url += `?appsecret_proof=${proof}`;
  }

  try {
    console.log(`[META-TEMPLATES] Submitting template "${template.name}" to Meta...`);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(template),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('[META-TEMPLATES] Submit failed:', data);
      return {
        success: false,
        error: data.error?.message || `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    console.log(`[META-TEMPLATES] Template submitted successfully:`, data);
    return {
      success: true,
      metaTemplateId: data.id,
      status: data.status || 'PENDING',
    };
  } catch (error) {
    console.error('[META-TEMPLATES] Submit error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to submit template',
    };
  }
}

/**
 * Fetch all templates from Meta
 * 
 * @param limit - Number of templates to fetch (default 100)
 * @returns List of Meta templates
 */
export async function fetchTemplatesFromMeta(limit = 100): Promise<{
  success: boolean;
  templates?: MetaTemplate[];
  error?: string;
}> {
  const env = getWhatsAppEnv();
  if (!env) {
    return { success: false, error: 'WhatsApp Cloud API not configured' };
  }

  const wabaId = getWABAId();
  if (!wabaId) {
    return { success: false, error: 'WHATSAPP_BUSINESS_ACCOUNT_ID not configured' };
  }

  const { accessToken, appSecret } = env;
  const proof = buildAppSecretProof(accessToken, appSecret);

  let url = `https://graph.facebook.com/${META_API_VERSION}/${wabaId}/message_templates?fields=id,name,status,category,language,components,quality_score,rejected_reason&limit=${limit}`;
  if (proof) {
    url += `&appsecret_proof=${proof}`;
  }

  try {
    console.log(`[META-TEMPLATES] Fetching templates from Meta...`);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    const data: MetaTemplateListResponse = await response.json();

    if (!response.ok) {
      console.error('[META-TEMPLATES] Fetch failed:', data);
      return {
        success: false,
        error: (data as any).error?.message || `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    console.log(`[META-TEMPLATES] Fetched ${data.data?.length || 0} templates from Meta`);
    return {
      success: true,
      templates: data.data || [],
    };
  } catch (error) {
    console.error('[META-TEMPLATES] Fetch error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch templates',
    };
  }
}

/**
 * Get a single template's status from Meta by name and language
 */
export async function getTemplateStatusFromMeta(templateName: string, language = 'en'): Promise<{
  success: boolean;
  template?: MetaTemplate;
  error?: string;
}> {
  const env = getWhatsAppEnv();
  if (!env) {
    return { success: false, error: 'WhatsApp Cloud API not configured' };
  }

  const wabaId = getWABAId();
  if (!wabaId) {
    return { success: false, error: 'WHATSAPP_BUSINESS_ACCOUNT_ID not configured' };
  }

  const { accessToken, appSecret } = env;
  const proof = buildAppSecretProof(accessToken, appSecret);

  let url = `https://graph.facebook.com/${META_API_VERSION}/${wabaId}/message_templates?name=${encodeURIComponent(templateName)}&fields=id,name,status,category,language,components,quality_score,rejected_reason`;
  if (proof) {
    url += `&appsecret_proof=${proof}`;
  }

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    const data: MetaTemplateListResponse = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: (data as any).error?.message || `HTTP ${response.status}`,
      };
    }

    // Find the template with matching language
    const template = data.data?.find(t => t.language === language) || data.data?.[0];
    
    if (!template) {
      return {
        success: false,
        error: `Template "${templateName}" not found in Meta`,
      };
    }

    return { success: true, template };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get template status',
    };
  }
}

/**
 * Delete a template from Meta
 */
export async function deleteTemplateFromMeta(templateName: string): Promise<{
  success: boolean;
  error?: string;
}> {
  const env = getWhatsAppEnv();
  if (!env) {
    return { success: false, error: 'WhatsApp Cloud API not configured' };
  }

  const wabaId = getWABAId();
  if (!wabaId) {
    return { success: false, error: 'WHATSAPP_BUSINESS_ACCOUNT_ID not configured' };
  }

  const { accessToken, appSecret } = env;
  const proof = buildAppSecretProof(accessToken, appSecret);

  let url = `https://graph.facebook.com/${META_API_VERSION}/${wabaId}/message_templates?name=${encodeURIComponent(templateName)}`;
  if (proof) {
    url += `&appsecret_proof=${proof}`;
  }

  try {
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error?.message || `HTTP ${response.status}`,
      };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete template',
    };
  }
}

/**
 * Convert local template format to Meta API format
 */
export function convertToMetaFormat(localTemplate: {
  templateName: string;
  category: string;
  language: string;
  templateContent: string;
  headerFormat?: string;
  headerContent?: string;
  footerText?: string;
  buttons?: Array<{ title: string }>;
  imageFile?: { url: string };
  videoUrl?: string;
}): MetaTemplateSubmission {
  const components: MetaTemplateComponent[] = [];

  /**
   * Clean template text for Meta:
   * - Keep bold (*text*) formatting - Meta allows it
   * - Remove button markers (• [QUICK_REPLY])
   * - Remove extra whitespace
   */
  function cleanTextForMeta(text: string): string {
    // Keep bold formatting (*text*) - Meta allows it on headings
    // Just remove button markers and clean up whitespace
    return text
      .replace(/•\s*\[QUICK_REPLY\][^\n]*/g, '')  // Remove button lines
      .replace(/•\s*\[[^\]]+\][^\n]*/g, '')       // Remove other button markers
      .replace(/\n{3,}/g, '\n\n')                 // Max 2 newlines
      .trim();
  }

  // Header component
  // NOTE: For IMAGE/VIDEO/DOCUMENT headers, Meta requires uploading media first to get a handle.
  // For now, we skip media headers and only support TEXT headers.
  // Templates with images will be submitted without header - image can be added later in Meta dashboard.
  if (localTemplate.headerFormat && localTemplate.headerFormat !== 'NONE') {
    if (localTemplate.headerFormat === 'TEXT' && localTemplate.headerContent) {
      // Clean header text and skip if it's a URL
      const headerText = localTemplate.headerContent;
      if (!headerText.startsWith('http')) {
        const headerComponent: MetaTemplateComponent = {
          type: 'HEADER',
          format: 'TEXT',
          text: cleanTextForMeta(headerText),
        };
        // Extract variables from header text
        const headerVars = headerComponent.text?.match(/\{\{(\d+)\}\}/g);
        if (headerVars) {
          headerComponent.example = {
            header_text: headerVars.map(() => 'Sample'),
          };
        }
        components.push(headerComponent);
      }
    }
    // Skip IMAGE/VIDEO/DOCUMENT headers for now - they require media upload to Meta first
    // User can add media header in Meta Business Manager after template is approved
  }

  // Body component (required) - keep bold formatting
  const cleanedBody = cleanTextForMeta(localTemplate.templateContent);
  const bodyComponent: MetaTemplateComponent = {
    type: 'BODY',
    text: cleanedBody,
  };

  // Extract variables from body text
  const bodyVars = cleanedBody.match(/\{\{(\d+)\}\}/g);
  if (bodyVars) {
    bodyComponent.example = {
      body_text: [bodyVars.map(() => 'Sample')],
    };
  }

  components.push(bodyComponent);

  // Footer component - also clean it
  if (localTemplate.footerText) {
    components.push({
      type: 'FOOTER',
      text: cleanTextForMeta(localTemplate.footerText),
    });
  }

  // Buttons component
  if (localTemplate.buttons && localTemplate.buttons.length > 0) {
    const validButtons = localTemplate.buttons
      .filter(btn => btn.title && btn.title.trim().length > 0)
      .slice(0, 3);  // Meta allows max 3 buttons
    
    if (validButtons.length > 0) {
      components.push({
        type: 'BUTTONS',
        buttons: validButtons.map(btn => ({
          type: 'QUICK_REPLY' as const,
          text: btn.title.trim().slice(0, 20),  // Meta max 20 chars for button text
        })),
      });
    }
  }

  // Map category - Meta only accepts MARKETING, UTILITY, or AUTHENTICATION
  let metaCategory: 'MARKETING' | 'UTILITY' | 'AUTHENTICATION' = 'MARKETING';
  const cat = localTemplate.category?.toUpperCase();
  if (cat === 'UTILITY' || cat === 'TRANSACTIONAL' || cat === 'ACCOUNT_UPDATE') {
    metaCategory = 'UTILITY';
  } else if (cat === 'OTP' || cat === 'AUTHENTICATION') {
    metaCategory = 'AUTHENTICATION';
  }

  // Clean template name: lowercase, only a-z, 0-9, underscore, max 512 chars
  const cleanName = localTemplate.templateName
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/_+/g, '_')           // No double underscores
    .replace(/^_|_$/g, '')         // No leading/trailing underscores
    .slice(0, 512);

  return {
    name: cleanName || 'template_' + Date.now(),
    category: metaCategory,
    language: localTemplate.language || 'en',
    components,
  };
}

/**
 * Map Meta status to local status
 */
export function mapMetaStatusToLocal(metaStatus: string): string {
  switch (metaStatus) {
    case 'APPROVED':
      return 'approved';
    case 'PENDING':
    case 'IN_APPEAL':
      return 'pending_approval';
    case 'REJECTED':
      return 'rejected';
    case 'DISABLED':
    case 'PENDING_DELETION':
      return 'disabled';
    default:
      return 'draft';
  }
}
