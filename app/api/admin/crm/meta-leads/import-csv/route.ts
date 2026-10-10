import { NextRequest, NextResponse } from 'next/server';
import { saveBunnyLead, getBunnyLeadByPhone } from '@/lib/bunnyLeadsRepository';
import Papa from 'papaparse';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const workshopId = formData.get('workshopId') as string;
    const workshopName = formData.get('workshopName') as string;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const text = await file.text();
    const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });
    
    if (parsed.errors.length > 0) {
      console.error("CSV Parse Errors:", parsed.errors);
    }

    let syncedCount = 0;
    const localCache = new Map<string, any>();
    
    for (const row of parsed.data as any[]) {
      // Find relevant columns ignoring case
      let phone = '';
      let email = '';
      let name = '';
      let first_name = '';
      let last_name = '';

      const rawFieldData: any[] = [];
      const formId = row['form_id'] || row['id'] || '';

      for (const key of Object.keys(row)) {
        const lowerKey = key.toLowerCase();
        const value = row[key];

        if (lowerKey.includes('phone')) phone = value;
        else if (lowerKey.includes('email')) email = value;
        else if (lowerKey.includes('first_name')) first_name = value;
        else if (lowerKey.includes('last_name')) last_name = value;
        else if (lowerKey === 'name' || lowerKey === 'full_name') name = value;
        else if (!['created_time','ad_id','ad_name','adset_id','adset_name','campaign_id','campaign_name','form_id','form_name','is_organic','platform','id'].includes(lowerKey)) {
          // It's a custom question
          rawFieldData.push({ name: key, values: [value] });
        }
      }

      if (!name) name = `${first_name} ${last_name}`.trim();
      const cleanPhone = phone.replace(/\D/g, '');

      if (!cleanPhone) continue;

      let existing = localCache.get(cleanPhone) || await getBunnyLeadByPhone(cleanPhone, 'system');
      
      if (!existing) {
        const savedLead = await saveBunnyLead({
          phoneNumber: cleanPhone,
          name: name || 'Unknown',
          email: email || '',
          source: 'meta_instant_form',
          status: 'new',
          workshopId: workshopId || null,
          workshopName: workshopName || 'Unknown Workshop',
          formSource: 'facebook_instagram_ads',
          createdAt: new Date(row['created_time'] || Date.now()).toISOString(),
          labels: ['meta_instant_form', 'facebook_ads', 'enquiry', workshopId ? `workshop_${workshopId}` : ''].filter(Boolean),
          metadata: {
            metaFormId: formId,
            rawFieldData: rawFieldData,
            metaLeadId: row['id'] || ''
          },
          createdByUserId: 'system',
        });
        localCache.set(cleanPhone, savedLead);
        syncedCount++;
      }
    }

    return NextResponse.json({ success: true, syncedCount, totalProcessed: parsed.data.length });
  } catch (error: any) {
    console.error('Error importing CSV:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
