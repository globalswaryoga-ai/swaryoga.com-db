import { NextRequest, NextResponse } from 'next/server';
import { saveBunnyLead, getBunnyLeadByPhone } from '@/lib/bunnyLeadsRepository';

export async function POST(req: NextRequest) {
  try {
    const { formId, workshopId, workshopName } = await req.json();

    if (!formId) {
      return NextResponse.json({ error: 'formId is required' }, { status: 400 });
    }

    const token = process.env.META_PAGE_ACCESS_TOKEN;
    if (!token) {
      return NextResponse.json({ error: 'META_PAGE_ACCESS_TOKEN is missing' }, { status: 500 });
    }

    // Fetch leads from Meta
    const res = await fetch(`https://graph.facebook.com/v24.0/${formId}/leads?access_token=${token}`);
    const data = await res.json();

    if (data.error) {
      console.error('Meta Graph API Error:', data.error);
      return NextResponse.json({ error: data.error.message }, { status: 500 });
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

      if (!name) name = `${first_name} ${last_name}`.trim();
      const cleanPhone = phone.replace(/\D/g, '');

      if (!cleanPhone) continue; // Skip if no phone

      // Check if exists
      const existing = await getBunnyLeadByPhone(cleanPhone, 'system');
      
      if (!existing) {
        // Create new lead
        await saveBunnyLead({
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
        syncedCount++;
      } else {
        // Update if missing metaLeadId
        if (!existing.metadata?.metaLeadId) {
          await saveBunnyLead({
            ...existing,
            metadata: {
              ...(existing.metadata || {}),
              metaFormId: formId,
              rawFieldData: rawFieldData,
              metaLeadId: item.id
            },
            labels: Array.from(new Set([...(existing.labels || []), 'meta_instant_form', 'facebook_ads', 'enquiry']))
          }, existing._id || existing.id);
          syncedCount++;
        }
      }
    }

    return NextResponse.json({ success: true, syncedCount, totalFetched: (data.data || []).length });
  } catch (error: any) {
    console.error('Error syncing meta leads:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
