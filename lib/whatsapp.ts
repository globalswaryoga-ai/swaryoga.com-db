/**
 * WhatsApp Cloud API helpers (Meta Graph API)
 * Centralized here so routes don't drift.
 */

export function normalizePhone(raw: string): string {
  // IMPORTANT: We standardize phone numbers across the app as **digits-only**.
  // This avoids mismatches between:
  // - Lead storage (Mongo unique index)
  // - Meta Cloud API `to` format
  // - WhatsApp Web bridge formats
  // Common inbound formats include: "+91 98...", "0091 98...", "(98) ...".
  // We remove everything except digits.
  return String(raw || '')
    .trim()
    .replace(/\D/g, '');
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

function getWhatsAppEnv() {
  // Primary (preferred) env keys
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN || process.env.WHATSAPP_BUSINESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || process.env.WHATSAPP_BUSINESS_PHONE_NUMBER;

  // IMPORTANT default:
  // This repo is currently operating in “WhatsApp Web first” mode.
  // Even if Cloud API credentials exist in env, we should NOT send via Meta unless
  // explicitly enabled. This prevents surprises where messages go to the verified
  // Meta number while the Meta UI is hidden.
  //
  // To re-enable Meta sending, set:
  //   WHATSAPP_ENABLE_CLOUD_SEND=true
  const enableCloud = String(process.env.WHATSAPP_ENABLE_CLOUD_SEND || '')
    .trim()
    .toLowerCase();
  const cloudExplicitlyEnabled = ['1', 'true', 'yes', 'on'].includes(enableCloud);
  if (!cloudExplicitlyEnabled) {
    return null;
  }

  // Operational kill-switch: allow temporarily forcing WhatsApp Web bridge sends
  // even when Cloud API credentials are configured.
  // Accept several spellings for convenience.
  const disableCloud = String(
    process.env.WHATSAPP_DISABLE_META_SEND ||
      process.env.WHATSAPP_DISABLE_CLOUD_SEND ||
      process.env.WHATSAPP_FORCE_WEB_BRIDGE ||
      process.env.WHATSAPP_DISABLE_CLOUD ||
      ''
  )
    .trim()
    .toLowerCase();
  if (disableCloud === '1' || disableCloud === 'true' || disableCloud === 'yes' || disableCloud === 'on') {
    return null;
  }

  if (!accessToken || !phoneNumberId) {
    return null; // Cloud API not configured; fallback to Web bridge
  }

  return { accessToken, phoneNumberId };
}

export async function sendWhatsAppText(toRaw: string, body: string): Promise<WhatsAppSendTextResult> {
  const env = getWhatsAppEnv();

  // If Cloud API is configured, use it
  if (env) {
    const { accessToken, phoneNumberId } = env;
    const to = normalizePhone(toRaw);

    const url = `https://graph.facebook.com/v20.0/${encodeURIComponent(phoneNumberId)}/messages`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to,
        type: 'text',
        text: { body },
      }),
      cache: 'no-store',
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const message =
        data?.error?.message || data?.error?.error_user_msg || data?.error || 'WhatsApp API error';
      const err = new Error(String(message));
      (err as any).status = res.status;
      (err as any).data = data;
      throw err;
    }

    const waMessageId =
      Array.isArray(data?.messages) && data.messages[0]?.id ? String(data.messages[0].id) : undefined;

    return { waMessageId, raw: { ...data, provider: 'meta' } };
  }

  // Fallback: Cloud API not configured → use WhatsApp Web bridge
  const bridgeUrl = (process.env.WHATSAPP_BRIDGE_HTTP_URL || '').trim();
  if (!bridgeUrl) {
    throw new Error(
      'WhatsApp sending unavailable: ' +
        'Cloud API not configured (missing WHATSAPP_ACCESS_TOKEN) ' +
        'and no Web bridge URL set (WHATSAPP_BRIDGE_HTTP_URL). ' +
        'Either configure Cloud API or set bridge URLs to use WhatsApp Web QR.'
    );
  }

  const to = normalizePhone(toRaw);
  const sendUrl = `${bridgeUrl.replace(/\/+$/, '')}/api/send`;
  const bridgeSecret = (process.env.WHATSAPP_WEB_BRIDGE_SECRET || '').trim();

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (bridgeSecret) {
    headers['X-WhatsApp-Bridge-Secret'] = bridgeSecret;
  }

  const res = await fetch(sendUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify({ phone: to, message: body }),
    cache: 'no-store',
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const message =
      data?.error || data?.message || `WhatsApp Web bridge error (HTTP ${res.status})`;
    const err = new Error(String(message));
    (err as any).status = res.status;
    (err as any).data = data;
    throw err;
  }
  // Bridge typically returns { success: true, messageId?: "..." }
  const waMessageId = data?.messageId || data?.waMessageId;
  return { waMessageId, raw: { ...data, provider: 'whatsapp_web_bridge' } };
}

/**
 * Send image or video media directly (non-template)
 * Used for: sending new images/videos via Meta Cloud API
 */
export async function sendWhatsAppMedia(
  toRaw: string,
  mediaUrl: string,
  mediaType: 'image' | 'video',
  caption?: string
): Promise<WhatsAppSendMediaResult> {
  const env = getWhatsAppEnv();

  // If Cloud API is configured, use it
  if (env) {
    const { accessToken, phoneNumberId } = env;
    const to = normalizePhone(toRaw);

    const url = `https://graph.facebook.com/v20.0/${encodeURIComponent(phoneNumberId)}/messages`;
    
    // Build payload based on media type
    const mediaTypeKey = mediaType === 'video' ? 'video' : 'image';
    const payload: any = {
      messaging_product: 'whatsapp',
      to,
      type: mediaTypeKey,
      [mediaTypeKey]: {
        link: mediaUrl,
      },
    };

    // Add caption if provided (works for both image and video)
    if (caption && caption.trim()) {
      payload[mediaTypeKey].caption = String(caption).trim();
    }

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

    if (!res.ok) {
      const message =
        data?.error?.message || data?.error?.error_user_msg || data?.error || 'WhatsApp API error';
      const err = new Error(String(message));
      (err as any).status = res.status;
      (err as any).data = data;
      throw err;
    }

    const waMessageId =
      Array.isArray(data?.messages) && data.messages[0]?.id ? String(data.messages[0].id) : undefined;

    return { waMessageId, raw: { ...data, provider: 'meta' } };
  }

  // Fallback: Cloud API not configured → use WhatsApp Web bridge
  const bridgeUrl = (process.env.WHATSAPP_BRIDGE_HTTP_URL || '').trim();
  if (!bridgeUrl) {
    throw new Error(
      'WhatsApp media sending unavailable: ' +
        'Cloud API not configured (missing WHATSAPP_ACCESS_TOKEN) ' +
        'and no Web bridge URL set (WHATSAPP_BRIDGE_HTTP_URL). ' +
        'Media sending requires Cloud API.'
    );
  }

  const to = normalizePhone(toRaw);
  const sendUrl = `${bridgeUrl.replace(/\/+$/, '')}/api/send`;
  const bridgeSecret = (process.env.WHATSAPP_WEB_BRIDGE_SECRET || '').trim();

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (bridgeSecret) {
    headers['X-WhatsApp-Bridge-Secret'] = bridgeSecret;
  }

  // Web bridge format for media
  const res = await fetch(sendUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      phone: to,
      mediaUrl: mediaUrl,
      mediaType: mediaType,
      caption: caption || undefined,
    }),
    cache: 'no-store',
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const message =
      data?.error || data?.message || `WhatsApp Web bridge error (HTTP ${res.status})`;
    const err = new Error(String(message));
    (err as any).status = res.status;
    (err as any).data = data;
    throw err;
  }

  const waMessageId = data?.messageId || data?.waMessageId;
  return { waMessageId, raw: { ...data, provider: 'whatsapp_web_bridge' } };
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

  if (Array.isArray(input.buttons) && input.buttons.length > 0) {
    input.buttons.forEach((b, index) => {
      if (!b) return;

      if (b.kind === 'quick_reply') {
        components.push({
          type: 'button',
          sub_type: 'quick_reply',
          index: String(index),
          parameters: [{ type: 'payload', payload: String(b.title || '').slice(0, 128) }],
        });
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
  if (!env) {
    throw new Error('WhatsApp Cloud API is not enabled/configured (WHATSAPP_ENABLE_CLOUD_SEND + credentials).');
  }

  const { accessToken, phoneNumberId } = env;
  const to = normalizePhone(input.to);
  const templateName = String(input.templateName || '').trim();
  if (!templateName) throw new Error('templateName is required');

  const language = String(input.language || 'en').trim() || 'en';
  const url = `https://graph.facebook.com/v20.0/${encodeURIComponent(phoneNumberId)}/messages`;

  const components = buildTemplateComponents(input);

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
  if (!res.ok) {
    const message =
      data?.error?.message || data?.error?.error_user_msg || data?.error || 'WhatsApp API error';
    const err = new Error(String(message));
    (err as any).status = res.status;
    (err as any).data = data;
    throw err;
  }

  const waMessageId =
    Array.isArray(data?.messages) && data.messages[0]?.id ? String(data.messages[0].id) : undefined;
  return { waMessageId, raw: { ...data, provider: 'meta' } };
}

// Helps server routes build a stable send contract from our stored template schema.
export function buildCloudTemplateSendInput(template: any, to: string): WhatsAppSendTemplateInput {
  const headerMediaUrl = String(template?.headerMedia?.url || '').trim();
  const headerMediaKind = String(template?.headerMedia?.kind || '').trim();

  const headerMedia: WhatsAppTemplateHeaderMedia | null =
    headerMediaUrl && (headerMediaKind === 'image' || headerMediaKind === 'video')
      ? { kind: headerMediaKind, url: headerMediaUrl }
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

  return {
    to,
    templateName: String(template?.templateName || '').trim(),
    language: String(template?.language || 'en').trim() || 'en',
    bodyParams,
    headerMedia,
    buttons,
  };
}
