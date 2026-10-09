import { NextRequest, NextResponse } from 'next/server';
import { saveBunnyLead, getBunnyLeadByPhone } from '@/lib/bunnyLeadsRepository';

export async function POST(req: NextRequest) {
  try {
    const { fields, workshopId, workshopName } = await req.json();

    if (!fields || !Array.isArray(fields)) {
      return NextResponse.json({ error: 'fields array is required' }, { status: 400 });
    }

    let phone = '';
    let email = '';
    let name = '';
    const rawFieldData = [];

    for (const field of fields) {
      const fieldName = field.name.toLowerCase();
      const values = field.values || [];
      
      rawFieldData.push({ name: field.name, values: values });

      const firstValue = values[0] || '';
      if (fieldName.includes('phone')) phone = firstValue;
      else if (fieldName.includes('email')) email = firstValue;
      else if (fieldName.includes('full_name') || fieldName === 'name') name = firstValue;
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

    const cleanPhone = phone.replace(/\D/g, '');

    if (!cleanPhone) {
      return NextResponse.json({ error: 'Phone number is required in fields' }, { status: 400 });
    }

    const existing = await getBunnyLeadByPhone(cleanPhone, 'system');
    
    if (existing) {
        // Just update existing with new raw field data
        await saveBunnyLead({
            ...existing,
            workshopId: workshopId || existing.workshopId,
            workshopName: workshopName || existing.workshopName,
            metadata: {
                ...(existing.metadata || {}),
                rawFieldData: rawFieldData
            }
        }, existing._id || existing.id);
    } else {
        await saveBunnyLead({
            phoneNumber: cleanPhone,
            name: name || 'Dummy Tester',
            email: email || '',
            source: 'meta_instant_form',
            status: 'new',
            workshopId: workshopId || null,
            workshopName: workshopName || 'Unknown Workshop',
            formSource: 'facebook_instagram_ads',
            createdAt: new Date().toISOString(),
            labels: ['meta_instant_form', 'facebook_ads', 'dummy_lead', workshopId ? `workshop_${workshopId}` : ''].filter(Boolean),
            metadata: {
              metaFormId: 'dummy_form',
              rawFieldData: rawFieldData,
              metaLeadId: `dummy_${Date.now()}`
            },
            createdByUserId: 'system',
        });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error creating dummy lead:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
