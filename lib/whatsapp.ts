/**
 * WhatsApp Cloud API helpers (Meta Graph API)
 * Centralized here so routes don't drift.
 * 
 * Enhanced with Protection Layer for reliability:
 * - Circuit breaker pattern
 * - Retry with exponential backoff
 * - Meta API only (no bridge fallback)
 */

import crypto from 'crypto';
import { generatePresignedUrl } from './aws-s3';
import { 
  recordSuccess, 
  recordFailure, 
  isCircuitOpen, 
  withRetry,
  type ProviderType 
} from './whatsappProtection';

/**
 * Convert S3 URL to a publicly accessible signed URL (for Meta API)
 * Meta's servers need to fetch the media, so the URL must be accessible
 */
export async function getPublicMediaUrl(url: string): Promise<string> {
  if (!url) return url;
  
  // Check if it's an S3 URL from our bucket
  const s3Pattern = /https:\/\/([^.]+)\.s3\.([^.]+)\.amazonaws\.com\/(.+)/;
  const match = url.match(s3Pattern);
  
  if (match) {
    const key = decodeURIComponent(match[3]);
    console.log(`[WHATSAPP] 🔑 Generating signed URL for S3 key: ${key}`);
    try {
      const signedUrl = await generatePresignedUrl(key, { expiresIn: 3600 }); // 1 hour
      console.log(`[WHATSAPP] ✅ Signed URL generated (${signedUrl.substring(0, 80)}...)`);
      return signedUrl;
    } catch (err) {
      console.error(`[WHATSAPP] ❌ Failed to generate signed URL:`, err);
      // Fall back to original URL
      return url;
    }
  }
  
  // Not an S3 URL, return as-is
  return url;
}

export function normalizePhone(raw: string): string {
  // IMPORTANT: We standardize phone numbers across the app as **digits-only**.
  // This avoids mismatches between:
  // - Lead storage (Mongo unique index)
  // - Meta Cloud API `to` format
  // - WhatsApp Web bridge formats
  // Common inbound formats include: "+91 98...", "0091 98...", "(98) ...".
  
  // Handle WhatsApp ID format: "919309986820@c.us" or "919309986820@lid"
  let input = String(raw || '');
  if (input.includes('@')) {
    input = input.split('@')[0];
  }
  
  // Remove everything except digits
  const digits = input.replace(/\D/g, '');
  
  // Validate: phone numbers should be 10-15 digits
  // Anything outside this range is likely not a phone number (e.g., timestamp, group ID)
  if (digits.length < 10 || digits.length > 15) {
    console.warn(`[normalizePhone] Invalid phone format: "${raw}" -> "${digits}" (${digits.length} digits)`);
    return digits; // Return as-is but log warning
  }
  
  if (digits.length === 10) {
    return `91${digits}`;
  }
  // Remove leading 0s if it's like 091...
  if (digits.startsWith('0') && digits.length > 10) {
    return digits.replace(/^0+/, '');
  }
  return digits;
}

/**
 * Validate if a string looks like a valid phone number
 */
export function isValidPhoneNumber(phone: string): boolean {
  const digits = String(phone || '').replace(/\D/g, '');
  return digits.length >= 10 && digits.length <= 15;
}

export type WhatsAppSendTextResult = {
  waMessageId?: string;
  raw: any;
};

export type WhatsAppSendMediaResult = {
  waMessageId?: string;
  raw: any;
};

export type WhatsAppTemplateHeaderMedia = {
  kind: 'image' | 'video';
  url: string;
};

export type WhatsAppTemplateButton =
  | { kind: 'quick_reply'; title: string }
  | { kind: 'url'; title: string; url: string };

export type WhatsAppSendTemplateInput = {
  to: string;
  templateName: string;
  language?: string;
  bodyParams?: Array<string>;
  headerMedia?: WhatsAppTemplateHeaderMedia | null;
  buttons?: Array<WhatsAppTemplateButton>;
};

export type WhatsAppSendTemplateResult = {
  waMessageId?: string;
  raw: any;
};

export function getWhatsAppEnv() {
  // Primary (preferred) env keys
  const accessToken = (process.env.WHATSAPP_ACCESS_TOKEN || process.env.WHATSAPP_BUSINESS_TOKEN || "").trim();
  const phoneNumberId = (process.env.WHATSAPP_PHONE_NUMBER_ID || process.env.WHATSAPP_BUSINESS_PHONE_NUMBER || "").trim();
  // Support both META_APP_SECRET and WHATSAPP_APP_SECRET
  const appSecret = (process.env.META_APP_SECRET || process.env.WHATSAPP_APP_SECRET || "").trim();
  const phoneNumber = (process.env.WHATSAPP_PHONE_NUMBER || "9779006820").trim();

  // Cloud is ALWAYS enabled now as we are removing the Bridge
  const cloudExplicitlyDisabled = String(process.env.WHATSAPP_DISABLE_CLOUD_SEND || '')
    .trim()
    .toLowerCase() === 'true';
  
  if (cloudExplicitlyDisabled) {
    console.log(`[WHATSAPP] Cloud explicitly DISABLED via env`);
    return null;
  }

  if (!accessToken || !phoneNumberId) {
    console.warn(`[WHATSAPP] Cloud API MISSING CONFIG: token=${accessToken?.[0] ? 'SET' : 'MISSING'}, id=${phoneNumberId ? 'SET' : 'MISSING'}`);
    return null; 
  }
  
  // Warn if app secret is missing - Meta requires it!
  if (!appSecret) {
    console.warn(`[WHATSAPP] ⚠️ META_APP_SECRET is MISSING! Template sending may fail. Add META_APP_SECRET or WHATSAPP_APP_SECRET to .env.local`);
  }

  return { 
    accessToken: accessToken.replace(/['"\n\r]/g, ''), 
    phoneNumberId: phoneNumberId.replace(/['"\n\r]/g, ''),
    appSecret: appSecret.replace(/['"\n\r]/g, '') || undefined,
    phoneNumber: phoneNumber.replace(/['"\n\r]/g, '')
  };
}

/**
 * Get the media URL from Meta using a media ID
 */
export async function getWhatsAppMediaUrl(mediaId: string): Promise<string> {
  const env = getWhatsAppEnv();
  if (!env) throw new Error('Meta Cloud API not configured');

  const { accessToken, appSecret } = env;
  
  // Build URL with optional appsecret_proof
  let url = `https://graph.facebook.com/v24.0/${mediaId}`;
  if (appSecret) {
    const proof = generateAppSecretProof(accessToken, appSecret);
    url += `?appsecret_proof=${proof}`;
  }

  console.log(`[getWhatsAppMediaUrl] Fetching media ${mediaId}`);
  
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const data = await res.json();
  if (!res.ok) {
    console.error('[getWhatsAppMediaUrl] Error:', data?.error);
    throw new Error(data?.error?.message || 'Failed to get media URL from Meta');
  }

  console.log(`[getWhatsAppMediaUrl] Got URL: ${data.url?.substring(0, 60)}...`);
  return data.url; // This is the temporary URL to download the actual file
}

/**
 * Download media from Meta temporary URL
 */
export async function downloadWhatsAppMedia(tempUrl: string): Promise<{ buffer: Buffer; contentType: string }> {
  const env = getWhatsAppEnv();
  if (!env) throw new Error('Meta Cloud API not configured');

  const { accessToken } = env;

  console.log(`[downloadWhatsAppMedia] Downloading from Meta...`);
  
  const res = await fetch(tempUrl, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    const errorText = await res.text().catch(() => 'Unknown error');
    console.error('[downloadWhatsAppMedia] Failed:', res.status, errorText);
    throw new Error(`Failed to download media from Meta URL: ${res.status}`);
  }

  const arrayBuffer = await res.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const contentType = res.headers.get('content-type') || 'application/octet-stream';

  console.log(`[downloadWhatsAppMedia] Downloaded ${buffer.length} bytes, type: ${contentType}`);
  return { buffer, contentType };
}

function isWebBridgeDisabled(): boolean {
  return String(process.env.WHATSAPP_DISABLE_WEB_BRIDGE || '')
    .trim()
    .toLowerCase() === 'true';
}

export function generateAppSecretProof(accessToken: string, appSecret?: string): string | undefined {
  if (!appSecret) return undefined;
  return crypto.createHmac('sha256', appSecret).update(accessToken).digest('hex');
}

export function buildGraphMessagesUrl(phoneNumberId: string, appSecretProof?: string): string {
  const base = `https://graph.facebook.com/v24.0/${encodeURIComponent(phoneNumberId)}/messages`;
  if (!appSecretProof) {
    return base;
  }
  const url = new URL(base);
  url.searchParams.set('appsecret_proof', appSecretProof);
  return url.toString();
}

export async function sendWhatsAppText(toRaw: string, body: string): Promise<WhatsAppSendTextResult> {
  const env = getWhatsAppEnv();
  const to = normalizePhone(toRaw);
  const bridgeUrl = (process.env.WHATSAPP_BRIDGE_HTTP_URL || '').trim();
  const bridgeSecret = (process.env.WHATSAPP_WEB_BRIDGE_SECRET || process.env.WHATSAPP_BRIDGE_SECRET || '').trim();

  // Try Meta Cloud API first (with circuit breaker)
  if (env && !isCircuitOpen('meta')) {
    try {
      const result = await withRetry(async () => {
        const { accessToken, phoneNumberId, appSecret } = env;
        const appSecretProof = generateAppSecretProof(accessToken, appSecret);
        const url = buildGraphMessagesUrl(phoneNumberId, appSecretProof);
        
        const payload: any = {
          messaging_product: 'whatsapp',
          to,
          type: 'text',
          text: { body },
        };

        const res = await fetch(url, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify(payload),
          cache: 'no-store',
        });

        const data = await res.json().catch(() => ({}));

        if (res.ok) {
          const waMessageId =
            Array.isArray(data?.messages) && data.messages[0]?.id ? String(data.messages[0].id) : undefined;
          
          if (!waMessageId) {
            console.error('[sendWhatsAppText] Meta API returned 200 but no message ID:', JSON.stringify(data));
            throw new Error('Meta API returned success but no message ID in response. Response: ' + JSON.stringify(data));
          }
          
          return { waMessageId, raw: { ...data, provider: 'meta' } };
        }
        
        throw new Error(data?.error?.message || 'Meta API error');
      }, { maxRetries: 2 });
      
      recordSuccess('meta');
      return result;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      recordFailure('meta', msg);
      console.warn('[WHATSAPP] Meta Cloud API failed:', msg);
      // Fall through to try bridge
    }
  } else if (isCircuitOpen('meta')) {
    console.warn('[WHATSAPP] Meta circuit breaker OPEN - skipping to bridge');
  }

  // Fallback to WhatsApp Web Bridge (with circuit breaker)
  if (isWebBridgeDisabled()) {
    throw new Error(
      'WhatsApp sending failed: Web Bridge is disabled (WHATSAPP_DISABLE_WEB_BRIDGE=true) and Meta Cloud API did not send'
    );
  }

  if (bridgeUrl && bridgeSecret && !isCircuitOpen('qr_bridge')) {
    try {
      const result = await withRetry(async () => {
        const res = await fetch(`${bridgeUrl}/send`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-bridge-secret': bridgeSecret,
          },
          body: JSON.stringify({
            chatId: `${to}@${to.includes('@') ? '' : 'c.us'}`,
            message: body,
          }),
          cache: 'no-store',
        });

        const data = await res.json().catch(() => ({}));

        if (res.ok) {
          return { waMessageId: data?.messageId || 'bridge-queued', raw: { ...data, provider: 'whatsapp_web_bridge' } };
        }

        throw new Error(data?.error || data?.message || 'Bridge send failed');
      }, { maxRetries: 2 });
      
      recordSuccess('qr_bridge');
      return result;
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      recordFailure('qr_bridge', errMsg);
      throw new Error(`WhatsApp sending failed: Meta Cloud API error and Web Bridge failed (${errMsg})`);
    }
  }

  throw new Error('WhatsApp sending failed: All providers unavailable (Meta not configured or circuit open, Bridge not configured or circuit open)');
}

/**
 * Update presence status (typing, recording)
 */
export async function sendWhatsAppPresence(toRaw: string, type: 'composing' | 'recording' | 'paused' | 'none'): Promise<void> {
  if (type === 'none') return;
  
  const to = normalizePhone(toRaw);
  const bridgeUrl = (process.env.WHATSAPP_BRIDGE_HTTP_URL || '').trim();
  const bridgeSecret = (process.env.WHATSAPP_WEB_BRIDGE_SECRET || process.env.WHATSAPP_BRIDGE_SECRET || '').trim();

  if (bridgeUrl && bridgeSecret) {
    try {
      await fetch(`${bridgeUrl}/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-bridge-secret': bridgeSecret,
        },
        body: JSON.stringify({ 
          chatId: `${to}@${to.includes('@') ? '' : 'c.us'}`, 
          type,
          isPresence: true 
        }),
      });
    } catch (err) {
      console.warn('[WHATSAPP] Presence update failed:', err);
    }
  }
}

/**
 * Send image or video media directly (non-template)
 * Used for: sending new images/videos via Meta Cloud API
 */
export async function sendWhatsAppMedia(
  toRaw: string,
  mediaUrl: string,
  mediaType: 'image' | 'video' | 'document' = 'image',
  caption?: string
): Promise<WhatsAppSendMediaResult> {
  const env = getWhatsAppEnv();
  const to = normalizePhone(toRaw);
  
  // Convert S3 URLs to publicly accessible signed URLs
  const publicMediaUrl = await getPublicMediaUrl(mediaUrl);

  // If Cloud API is configured, try it first
  if (env) {
    try {
  const { accessToken, phoneNumberId, appSecret } = env;
  const appSecretProof = generateAppSecretProof(accessToken, appSecret);
  const url = buildGraphMessagesUrl(phoneNumberId, appSecretProof);
      
      const mediaTypeSlug = mediaType;
      const payload: any = {
        messaging_product: 'whatsapp',
        to,
        type: mediaTypeSlug,
        [mediaTypeSlug]: {
          link: publicMediaUrl, // Use the signed/public URL
        },
      };

      if (caption && caption.trim()) {
        payload[mediaTypeSlug].caption = String(caption).trim();
      }

      console.log(`[WHATSAPP] 📤 Sending ${mediaTypeSlug} to ${to} via Meta API`);
      console.log(`[WHATSAPP] 🔗 Original URL: ${mediaUrl}`);
      console.log(`[WHATSAPP] 🔗 Public URL: ${publicMediaUrl.substring(0, 100)}...`);
      
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(payload),
        cache: 'no-store',
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        const waMessageId =
          Array.isArray(data?.messages) && data.messages[0]?.id ? String(data.messages[0].id) : undefined;
        console.log(`[WHATSAPP] ✅ Media sent successfully, messageId: ${waMessageId}`);
        return { waMessageId, raw: { ...data, provider: 'meta' } };
      }
      
      // Log detailed error from Meta API
      const errorDetails = {
        code: data?.error?.code,
        message: data?.error?.message,
        type: data?.error?.type,
        fbtrace_id: data?.error?.fbtrace_id,
        url: mediaUrl,
      };
      console.error('[WHATSAPP] ❌ Meta Cloud API failed (Media):', JSON.stringify(errorDetails, null, 2));
    } catch (err) {
      console.error('[WHATSAPP] ❌ Meta Cloud API error (Media):', err instanceof Error ? err.message : String(err));
    }
  }

  // Fallback to WhatsApp Web Bridge
  // (Deprecated) — can be disabled globally via WHATSAPP_DISABLE_WEB_BRIDGE=true
  if (isWebBridgeDisabled()) {
    throw new Error(
      'WhatsApp media sending failed: Web Bridge is disabled (WHATSAPP_DISABLE_WEB_BRIDGE=true) and Meta Cloud API did not send'
    );
  }

  const bridgeUrl = (process.env.WHATSAPP_BRIDGE_HTTP_URL || '').trim();
  const bridgeSecret = (process.env.WHATSAPP_WEB_BRIDGE_SECRET || process.env.WHATSAPP_BRIDGE_SECRET || '').trim();

  if (bridgeUrl && bridgeSecret) {
    try {
      // Send media via Web Bridge
      const res = await fetch(`${bridgeUrl}/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-bridge-secret': bridgeSecret,
        },
        body: JSON.stringify({
          chatId: `${to}@${to.includes('@') ? '' : 'c.us'}`,
          media: mediaUrl,
          message: caption || null,
          mediaType: mediaType
        }),
        cache: 'no-store',
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        return { waMessageId: data?.messageId || 'bridge-queued', raw: { ...data, provider: 'whatsapp_web_bridge' } };
      }

      throw new Error(data?.error || data?.message || 'Bridge send failed');
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      throw new Error(`WhatsApp media sending failed: Meta Cloud API error and Web Bridge unavailable (${errMsg})`);
    }
  }

  throw new Error('WhatsApp media sending failed: Meta Cloud API is not configured and no Web Bridge URL set (WHATSAPP_BRIDGE_HTTP_URL)');
}

function extractTemplateVariablesFromText(text: string): string[] {
  // Support patterns like: "Hello {{1}}, your code is {{2}}"
  const vars = new Set<string>();
  const re = /\{\{\s*([^}]+?)\s*\}\}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(String(text || ''))) !== null) {
    const key = String(m[1] || '').trim();
    if (key) vars.add(key);
  }
  return Array.from(vars);
}

function toTemplateBodyParams(opts: { templateContent?: string; variables?: any; bodyParams?: string[] }): string[] {
  if (Array.isArray(opts.bodyParams)) {
    return opts.bodyParams.map((v) => String(v ?? ''));
  }

  // If schema includes variable definitions, prefer that order.
  if (Array.isArray(opts.variables) && opts.variables.length > 0) {
    return opts.variables.map((v: any) => String(v?.name ?? '')).filter(Boolean);
  }

  // Else try to infer from {{...}} occurrences.
  return extractTemplateVariablesFromText(String(opts.templateContent || '')).map((v) => v);
}

function buildTemplateComponents(input: WhatsAppSendTemplateInput): any[] {
  const components: any[] = [];

  if (input.headerMedia?.url) {
    // Meta expects uppercase format names inside the template definition.
    const format = input.headerMedia.kind === 'video' ? 'VIDEO' : 'IMAGE';
    components.push({
      type: 'header',
      parameters: [
        {
          type: format.toLowerCase(),
          [format.toLowerCase()]: { link: input.headerMedia.url },
        },
      ],
    });
  }

  if (Array.isArray(input.bodyParams) && input.bodyParams.length > 0) {
    components.push({
      type: 'body',
      parameters: input.bodyParams.map((p) => ({ type: 'text', text: String(p ?? '') })),
    });
  }

  // Note: For QUICK_REPLY buttons, Meta doesn't require parameters when sending
  // The button text is already defined in the template registration
  // Only URL buttons with dynamic variables need parameters
  if (Array.isArray(input.buttons) && input.buttons.length > 0) {
    input.buttons.forEach((b, index) => {
      if (!b) return;

      // Quick reply buttons don't need parameters - they're pre-defined in Meta template
      // We only need to include them if there's a dynamic payload
      if (b.kind === 'quick_reply') {
        // Skip - Meta templates with quick_reply buttons work without runtime parameters
        return;
      }

      if (b.kind === 'url') {
        // For URL buttons, Meta expects the runtime parameter to be the variable part.
        // If the configured URL has no variable (static URL), we omit parameters.
        const url = String(b.url || '');
        const needsParam = url.includes('{{') && url.includes('}}');
        const param = needsParam ? url.replace(/.*\{\{\s*([^}]+)\s*\}\}.*/, '$1') : '';
        const parameters = param ? [{ type: 'text', text: param }] : [];

        components.push({
          type: 'button',
          sub_type: 'url',
          index: String(index),
          ...(parameters.length ? { parameters } : {}),
        });
      }
    });
  }

  return components;
}

export async function sendWhatsAppTemplate(input: WhatsAppSendTemplateInput): Promise<WhatsAppSendTemplateResult> {
  const env = getWhatsAppEnv();
  const to = normalizePhone(input.to);
  const templateName = String(input.templateName || '').trim();
  if (!templateName) throw new Error('templateName is required');

  // Check if Meta API is configured
  if (!env) {
    throw new Error('WhatsApp template sending failed: Meta API is not configured (WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID required)');
  }
  
  // Check if app secret is configured - Meta requires it!
  if (!env.appSecret) {
    throw new Error('WhatsApp template sending failed: META_APP_SECRET or WHATSAPP_APP_SECRET is required. Please add it to .env.local');
  }

  // Try Meta Cloud API first (with circuit breaker)
  if (!isCircuitOpen('meta')) {
    try {
      const result = await withRetry(async () => {
        const { accessToken, phoneNumberId, appSecret } = env;
        
        // Convert S3 URLs to signed URLs for header media
        let processedInput = { ...input };
        if (input.headerMedia?.url) {
          const signedUrl = await getPublicMediaUrl(input.headerMedia.url);
          processedInput = {
            ...input,
            headerMedia: {
              ...input.headerMedia,
              url: signedUrl,
            },
          };
          console.log('[sendWhatsAppTemplate] Header media URL:', input.headerMedia.url.substring(0, 50));
          console.log('[sendWhatsAppTemplate] Signed URL:', signedUrl.substring(0, 80));
        }

        const language = String(input.language || 'en').trim() || 'en';
        const appSecretProof = generateAppSecretProof(accessToken, appSecret);
        const url = buildGraphMessagesUrl(phoneNumberId, appSecretProof);

        const components = buildTemplateComponents(processedInput);

        const payload: any = {
          messaging_product: 'whatsapp',
          to,
          type: 'template',
          template: {
            name: templateName,
            language: { code: language },
            ...(components.length ? { components } : {}),
          },
        };

        console.log('[sendWhatsAppTemplate] Sending via Meta:', JSON.stringify(payload, null, 2));

        const res = await fetch(url, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify(payload),
          cache: 'no-store',
        });

        const data = await res.json().catch(() => ({}));
        console.log('[sendWhatsAppTemplate] Meta Response:', res.status, JSON.stringify(data));
        
        if (!res.ok) {
          const message =
            data?.error?.message || data?.error?.error_user_msg || data?.error || 'WhatsApp API error';
          throw new Error(String(message));
        }

        const waMessageId =
          Array.isArray(data?.messages) && data.messages[0]?.id ? String(data.messages[0].id) : undefined;
        
        if (!waMessageId) {
          console.error('[sendWhatsAppTemplate] Meta API returned 200 but no message ID:', JSON.stringify(data));
          throw new Error('Meta API returned success but no message ID in response. Response: ' + JSON.stringify(data));
        }
        
        return { waMessageId, raw: { ...data, provider: 'meta' } };
      }, { maxRetries: 2 });

      recordSuccess('meta');
      return result;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      recordFailure('meta', msg);
      throw new Error(`WhatsApp template sending failed via Meta API: ${msg}`);
    }
  }

  // Meta circuit breaker is open
  throw new Error('WhatsApp template sending failed: Meta API circuit breaker is open, try again later');
}

// Helps server routes build a stable send contract from our stored template schema.
export function buildCloudTemplateSendInput(template: any, to: string): WhatsAppSendTemplateInput {
  // Check both headerMedia (legacy) and imageFile (new schema) for image URLs
  let headerMediaUrl = String(template?.headerMedia?.url || '').trim();
  let headerMediaKind = String(template?.headerMedia?.kind || '').trim();
  
  // Fallback to imageFile if headerMedia is empty
  if (!headerMediaUrl && template?.imageFile?.url) {
    headerMediaUrl = String(template.imageFile.url).trim();
    headerMediaKind = 'image';
  }

  const headerMedia: WhatsAppTemplateHeaderMedia | null =
    headerMediaUrl && (headerMediaKind === 'image' || headerMediaKind === 'video')
      ? { kind: headerMediaKind as 'image' | 'video', url: headerMediaUrl }
      : null;

  const buttons: WhatsAppTemplateButton[] = [];
  // Backwards compat: templates created via CRM builder may only have titles.
  if (Array.isArray(template?.buttons)) {
    template.buttons.forEach((b: any) => {
      const title = String(b?.title || '').trim();
      const url = String(b?.url || '').trim();
      const kind = String(b?.kind || '').trim();

      if (!title) return;

      if (kind === 'url' || (!!url && url.startsWith('http'))) {
        buttons.push({ kind: 'url', title, url: url || 'https://swaryoga.com' });
      } else {
        buttons.push({ kind: 'quick_reply', title });
      }
    });
  }

  const bodyParams = toTemplateBodyParams({
    templateContent: template?.templateContent,
    variables: template?.variables,
  });

  // Use the language code as-is from the template
  // Meta templates can be registered with 'en' or 'en_US' - use what was registered
  const language = String(template?.language || 'en').trim() || 'en';

  return {
    to,
    templateName: String(template?.templateName || template?.metaTemplateName || '').trim(),
    language,
    bodyParams,
    headerMedia,
    buttons,
  };
}
