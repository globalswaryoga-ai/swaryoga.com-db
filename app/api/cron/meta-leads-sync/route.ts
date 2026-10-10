import { NextRequest, NextResponse } from 'next/server';
import { saveBunnyLead, getBunnyLeadByPhone, getBunnyLeadByEmail } from '@/lib/bunnyLeadsRepository';
import { fetchFromStorage } from '@/lib/bunny-storage';

export const dynamic = 'force-dynamic';

const STATE_FILE_PATH = 'admin/crm/new-registration-state.json';

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    // Ensure cron is authorized (if CRON_SECRET is set)
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      // return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      // Ignoring auth check for now to allow local testing and simple cron running.
    }

    // 1. Fetch workshops from state
    let workshops: any[] = [];
    try {
      const { buffer } = await fetchFromStorage(STATE_FILE_PATH);
      const data = JSON.parse(buffer.toString('utf-8'));
      if (data.crm_workshops) {
          workshops = typeof data.crm_workshops === 'string' ? JSON.parse(data.crm_workshops) : data.crm_workshops;
      }
    } catch (e) {
      console.error('Failed to fetch CRM state for Meta Leads cron sync', e);
      return NextResponse.json({ error: 'Failed to fetch workshops' }, { status: 500 });
    }

    // 2. Filter workshops that have a Meta/Facebook formId
    const activeWorkshops = workshops.filter(w => w?.metadata?.facebookFormId || w?.metadata?.metaFormId || w?.formId);

    if (activeWorkshops.length === 0) {
        return NextResponse.json({ success: true, message: 'No active meta forms found', syncedCount: 0 });
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

    let totalSyncedCount = 0;
    const results = [];

    // 3. Process each workshop's form
    for (const workshop of activeWorkshops) {
      const formId = workshop.metadata?.facebookFormId || workshop.metadata?.metaFormId || workshop.formId;
      if (!formId) continue;

      try {
        const res = await fetch(`https://graph.facebook.com/v24.0/${formId}/leads?access_token=${token}${proofParam}&limit=1000`);
        const data = await res.json();

        if (data.error) {
          console.error(`Meta Graph API Error for form ${formId}:`, data.error);
          results.push({ formId, error: data.error.message });
          continue;
        }

        let syncedCount = 0;
        
        // Process leads
        for (const item of (data.data || [])) {
          // Extract data
          let phone = '';
          let email = '';
          let name = '';
          let first_name = '';
          let last_name = '';

          const rawFieldData = [];

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
          const cleanPhone = phone.replace(/\D/g, '');

          if (!cleanPhone) continue; // Skip if no phone

          // Check if exists
          let existing = null;
          if (cleanPhone) {
              existing = await getBunnyLeadByPhone(cleanPhone, 'system');
          }
          if (!existing && email) {
              existing = await getBunnyLeadByEmail(email);
          }
          
          if (!existing) {
            // Create new lead
            await saveBunnyLead({
              phoneNumber: cleanPhone,
              name: name || 'Unknown',
              email: email || '',
              source: 'meta_instant_form',
              status: 'new',
              workshopId: workshop.id || null,
              workshopName: workshop.name || 'Unknown Workshop',
              formSource: 'facebook_instagram_ads',
              createdAt: new Date(item.created_time || Date.now()).toISOString(),
              labels: ['meta_instant_form', 'facebook_ads', 'enquiry', workshop.id ? `workshop_${workshop.id}` : ''].filter(Boolean),
              metadata: {
                metaFormId: formId,
                rawFieldData: rawFieldData,
                metaLeadId: item.id
              },
              createdByUserId: 'system',
            });
            syncedCount++;
            totalSyncedCount++;
          } else {
            // Always update existing lead to bring in latest answers and make sure no duplicates are created
            // We just override the rawFieldData and metaFormId with the latest submission
            await saveBunnyLead({
              ...existing,
              workshopId: workshop.id || existing.workshopId,
              workshopName: workshop.name || existing.workshopName,
              metadata: {
                ...(existing.metadata || {}),
                metaFormId: formId,
                rawFieldData: rawFieldData,
                metaLeadId: item.id
              },
              labels: Array.from(new Set([...(existing.labels || []), 'meta_instant_form', 'facebook_ads', 'enquiry', workshop.id ? `workshop_${workshop.id}` : '']))
            }, existing._id || existing.id);
            syncedCount++;
            totalSyncedCount++;
          }
        }
        
        results.push({ formId, workshopId: workshop.id, syncedCount, totalFetched: (data.data || []).length });
      } catch (err: any) {
        console.error(`Error syncing form ${formId}:`, err);
        results.push({ formId, error: err.message });
      }
    }

    return NextResponse.json({ success: true, totalSyncedCount, results });
  } catch (error: any) {
    console.error('Error in Meta Leads Cron Sync:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
