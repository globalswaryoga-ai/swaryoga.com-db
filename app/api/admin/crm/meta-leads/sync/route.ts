import { NextRequest, NextResponse } from 'next/server';
import { loadBunnyLeads } from '@/lib/bunnyLeadsRepository';
import { persistMetaFormLead } from '@/lib/bunnyMetaLeadIngestion';
import { registrationViewer } from '@/lib/registrationAuth';
import { normalizePhone } from '@/lib/whatsapp';

export async function POST(req: NextRequest) {
  const viewer = registrationViewer(req);
  const cron = Boolean(process.env.CRON_SECRET && req.headers.get('authorization') === `Bearer ${process.env.CRON_SECRET}`);
  if (!cron && !viewer?.superAdmin) return NextResponse.json({ error: 'Super Admin or cron authentication required for the shared Meta form account' }, { status: 403 });
  try {
    const { formId, workshopId, workshopName } = await req.json();

    if (!formId) {
      return NextResponse.json({ error: 'formId is required' }, { status: 400 });
    }

    const token = process.env.META_PAGE_ACCESS_TOKEN;
    if (!token) {
      return NextResponse.json({ error: 'META_PAGE_ACCESS_TOKEN is missing' }, { status: 500 });
    }

    const appSecret = process.env.META_APP_SECRET;
    let proofParam = '';
    if (appSecret) {
      const crypto = require('crypto');
      const appsecret_proof = crypto.createHmac('sha256', appSecret).update(token).digest('hex');
      proofParam = `&appsecret_proof=${appsecret_proof}`;
    }

    // Fetch leads from Meta
    let nextUrl: string | undefined = `https://graph.facebook.com/v24.0/${encodeURIComponent(formId)}/leads?access_token=${token}${proofParam}&limit=100`;
    const items: Array<{ id: string; created_time?: string; field_data?: Array<{ name: string; values?: string[] }> }> = [];
    const visitedPages = new Set<string>();
    while (nextUrl) {
      if (visitedPages.has(nextUrl)) throw new Error('Meta returned a repeated pagination page. Retry sync.');
      visitedPages.add(nextUrl);
      const res = await fetch(nextUrl, { signal: AbortSignal.timeout(15000), cache: 'no-store' });
      const data = await res.json();
      if (!res.ok || data.error) {
        return NextResponse.json({ error: data.error?.message || 'Meta form sync failed' }, { status: 502 });
      }
      items.push(...(data.data || []));
      nextUrl = data.paging?.next;
      if (nextUrl && new URL(nextUrl).hostname !== 'graph.facebook.com') throw new Error('Invalid Meta pagination URL');
    }

    let syncedCount = 0;
    let unchangedCount = 0;
    let skippedCount = 0;
    const localCache = new Map<string, any>();
    const emailCache = new Map<string, any>();
    const metaIds = new Map<string, any>();
    for (const lead of await loadBunnyLeads()) {
      if (!['system', 'admin', 'admincrm'].includes(String(lead.createdByUserId))) continue;
      const phone = normalizePhone(String(lead.phoneNumber || ''));
      const email = String(lead.email || '').trim().toLowerCase();
      if (phone && !localCache.has(phone)) localCache.set(phone, lead);
      if (email && !emailCache.has(email)) emailCache.set(email, lead);
      if (lead.metadata?.metaLeadId) metaIds.set(String(lead.metadata.metaLeadId), lead);
    }
    
    // Process leads
    for (const item of items) {
      // Extract data
      let phone = '';
      let email = '';
      let name = '';
      let first_name = '';
      let last_name = '';

      const rawFieldData: Array<{ name: string; values?: string[] }> = [];

      for (const field of (item.field_data || [])) {
        const fieldName = field.name.toLowerCase();
        const value = field.values?.[0] || '';
        
        rawFieldData.push({ name: field.name, values: field.values });

        if (fieldName.includes('phone')) phone = value;
        else if (fieldName.includes('email')) email = value;
        else if (fieldName.includes('first_name')) first_name = value;
        else if (fieldName.includes('last_name')) last_name = value;
        else if (fieldName.includes('full_name') || fieldName === 'name') name = value;
      }

      const PERSONAL_FIELDS = ['full_name', 'phone_number', 'email', 'name', 'phone', 'first_name', 'last_name'];
      
      // Reorganise so custom questions are first, and personal data is last
      rawFieldData.sort((a, b) => {
        const aIsPersonal = PERSONAL_FIELDS.includes(a.name.toLowerCase());
        const bIsPersonal = PERSONAL_FIELDS.includes(b.name.toLowerCase());
        if (aIsPersonal && !bIsPersonal) return 1;
        if (!aIsPersonal && bIsPersonal) return -1;
        return 0;
      });

      if (!name) name = `${first_name} ${last_name}`.trim();
      const cleanPhone = normalizePhone(phone);

      if (!cleanPhone || cleanPhone.length < 10 || cleanPhone.length > 15) {
        skippedCount++;
        continue;
      }

      // Check if exists
      const existing = metaIds.get(item.id) || localCache.get(cleanPhone) || emailCache.get(email.trim().toLowerCase());
      if (existing && existing.metadata?.metaFormId === formId && existing.metadata?.metaLeadId === item.id &&
          JSON.stringify(existing.metadata?.rawFieldData) === JSON.stringify(rawFieldData) &&
          (!workshopId || existing.workshopId === workshopId) && (!workshopName || existing.workshopName === workshopName)) {
        unchangedCount++;
        continue;
      }
      
      if (!existing) {
        // Create new lead
        const savedLead = await persistMetaFormLead({
          phoneNumber: cleanPhone,
          name: name || 'Unknown',
          email: email || '',
          source: 'meta_instant_form',
          status: 'new',
          workshopId: workshopId || null,
          workshopName: workshopName || 'Unknown Workshop',
          formSource: 'facebook_instagram_ads',
          createdAt: new Date(item.created_time || Date.now()).toISOString(),
          labels: ['meta_instant_form', 'facebook_ads', 'enquiry', workshopId ? `workshop_${workshopId}` : ''].filter(Boolean),
          metadata: {
            metaFormId: formId,
            rawFieldData: rawFieldData,
            metaLeadId: item.id
          },
          createdByUserId: 'system',
        });
        
        // Cache it to avoid duplicate inserts in this run
        localCache.set(cleanPhone, savedLead);
        if (email) emailCache.set(email.trim().toLowerCase(), savedLead);
        metaIds.set(item.id, savedLead);

        syncedCount++;
      } else {
        // Always update existing lead to bring in latest answers and make sure no duplicates are created
        const savedLead = await persistMetaFormLead({
          ...existing,
          workshopId: workshopId || existing.workshopId,
          workshopName: workshopName || existing.workshopName,
          metadata: {
            ...(existing.metadata || {}),
            metaFormId: formId,
            rawFieldData: rawFieldData,
            metaLeadId: item.id
          },
          labels: Array.from(new Set([...(existing.labels || []), 'meta_instant_form', 'facebook_ads', 'enquiry', workshopId ? `workshop_${workshopId}` : '']))
        });
        localCache.set(cleanPhone, savedLead);
        if (email) emailCache.set(email.trim().toLowerCase(), savedLead);
        metaIds.set(item.id, savedLead);
        syncedCount++;
      }
    }

    return NextResponse.json({ success: true, syncedCount, unchangedCount, skippedCount, totalFetched: items.length });
  } catch (error: any) {
    console.error('Error syncing meta leads:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
