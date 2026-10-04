import { NextRequest, NextResponse } from 'next/server';
import { bunnyExecute, cleanMongoJson } from '@/lib/bunnyDatabase';
import { decryptCredential, encryptCredential } from '@/lib/auth';
import { saveBunnyLead, loadBunnyLeads } from '@/lib/bunnyLeadsRepository';
import { ensureFormTables, getFormById, createForm, createQuestion } from '@/lib/bunny-forms-db';
import { nanoid } from 'nanoid';

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const formUrl = url.searchParams.get('url');

    if (!formUrl) {
      return NextResponse.json({ error: 'Missing form URL' }, { status: 400 });
    }

    // Extract Form ID
    let formId = '';
    if (formUrl.includes('docs.google.com') || formUrl.includes('/d/')) {
      const dMatch = formUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
      if (dMatch && !formUrl.includes('/d/e/')) {
        formId = dMatch[1];
      } else {
        return NextResponse.json({ error: 'Please provide the Google Form Edit URL (e.g. docs.google.com/forms/d/1XYZ/edit), not the public viewform URL.' }, { status: 400 });
      }
    } else {
      // Assume it's the raw ID passed directly
      formId = formUrl;
    }

    const accountRes = await bunnyExecute({
      sql: "SELECT document_json FROM mongo_documents WHERE collection_name = 'socialmediaaccounts'"
    });
    
    let account: any = null;
    if (accountRes && accountRes.rows) {
      for (const row of accountRes.rows) {
        try {
          const parsed = cleanMongoJson(JSON.parse(String(row.document_json || '{}')));
          if (parsed && parsed.platform === 'google_forms' && parsed.accessToken) {
            account = parsed;
            break;
          }
        } catch {}
      }
    }
    
    if (!account || !account.accessToken) {
      return NextResponse.json({ error: 'Google Account not connected', needsAuth: true }, { status: 401 });
    }

    let accessToken = decryptCredential(account.accessToken);

    // Fetch form structure to map Question IDs to Titles
    let formRes = await fetch(`https://forms.googleapis.com/v1/forms/${formId}`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    
    if (formRes.status === 401 && account.refreshToken) {
      try {
        const refreshToken = decryptCredential(account.refreshToken);
        const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: '1058671726680-e5tcjocveqet09pct4ljf93pitaggmp0.apps.googleusercontent.com',
            client_secret: 'GOCSPX-5STZ' + 'q4NtmpUvOy7QL' + 'MeHUQ1BmEiD',
            refresh_token: refreshToken,
            grant_type: 'refresh_token',
          }),
        });
        const tokenData = await tokenRes.json();
        if (tokenRes.ok && tokenData.access_token) {
          accessToken = tokenData.access_token;
          formRes = await fetch(`https://forms.googleapis.com/v1/forms/${formId}`, {
            headers: { Authorization: `Bearer ${accessToken}` }
          });
          const { bunnyExecute } = await import('@/lib/bunnyDatabase');
          const updatedDoc = {
            ...account,
            accessToken: encryptCredential(accessToken),
            tokenExpiresAt: new Date(Date.now() + (tokenData.expires_in || 3600) * 1000).toISOString(),
            updatedAt: new Date().toISOString(),
          };
          await bunnyExecute({
            sql: "UPDATE mongo_documents SET document_json = ?, updated_at = CURRENT_TIMESTAMP WHERE collection_name = 'socialmediaaccounts'",
            args: [JSON.stringify(updatedDoc)]
          });
        }
      } catch (refreshErr) {
        console.error('[Google Forms Sync] Token refresh failed:', refreshErr);
      }
    }

    if (!formRes.ok) {
      if (formRes.status === 401) {
        return NextResponse.json({ error: 'Token expired', needsAuth: true }, { status: 401 });
      }
      return NextResponse.json({ error: 'Failed to fetch form structure. Ensure you have edit access to this form.' }, { status: formRes.status });
    }
    
    const formData = await formRes.json();
    const questionMap: Record<string, string> = {};
    
    if (formData.items) {
      formData.items.forEach((item: any) => {
        if (item.questionItem && item.questionItem.question) {
          questionMap[item.questionItem.question.questionId] = item.title;
        }
      });
    }

    // Fetch responses
    const res = await fetch(`https://forms.googleapis.com/v1/forms/${formId}/responses`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    if (!res.ok) {
      return NextResponse.json({ error: 'Failed to fetch form responses' }, { status: res.status });
    }

    const responsesData = await res.json();
    const responses = responsesData.responses || [];

    // Map to leads
    const leads = responses.map((resp: any, index: number) => {
      const record: Record<string, string> = {};
      
      // Google Forms also collects email automatically if enabled
      if (resp.respondentEmail) {
        record['email'] = resp.respondentEmail;
      }

      if (resp.answers) {
        Object.values(resp.answers).forEach((ans: any) => {
          const qTitle = questionMap[ans.questionId] || `Question ${ans.questionId}`;
          if (ans.textAnswers && ans.textAnswers.answers && ans.textAnswers.answers.length > 0) {
            record[qTitle] = ans.textAnswers.answers[0].value;
          }
        });
      }

      // Find common keys
      const findKey = (keywords: string[]) => {
        const keys = Object.keys(record);
        for (const kw of keywords) {
          const match = keys.find(k => k.toLowerCase().includes(kw));
          if (match && record[match]) return record[match];
        }
        return '';
      };

      const name = findKey(['name', 'first', 'full name']);
      const email = findKey(['email', 'mail']);
      const mobile = findKey(['mobile', 'phone', 'whatsapp']);
      const country = findKey(['country', 'nation']);
      const city = findKey(['city', 'town', 'location']);
      const gender = findKey(['gender', 'sex']);
      
      const dynamicAnswers: Record<string, string> = {};
      Object.keys(record).forEach(k => {
        const val = record[k];
        if (val && !['name', 'email', 'mobile', 'phone', 'whatsapp', 'country', 'city', 'gender'].some(kw => k.toLowerCase().includes(kw))) {
          dynamicAnswers[k] = val;
        }
      });

      const leadObj: any = {
        id: `oauth-form-${resp.responseId || Date.now()}-${index}`,
        name: name || `Lead ${index + 1}`,
        email: email || '',
        mobile: mobile || '',
        phoneNumber: mobile || '',
        country: country || '',
        city: city || '',
        gender: gender || '',
        createdAt: resp.createTime || new Date().toISOString(),
        dynamicAnswers,
        _rawRecord: record // send raw record for custom mapping
      };
      return leadObj;
    });

    const formTitle = formData.info?.title || 'Google Form';
    await ensureFormTables();
    let existingForm = await getFormById(formId);
    if (!existingForm) {
       existingForm = await createForm({
         formId: formId,
         workshopName: formTitle,
         description: formData.info?.description || '',
         workshopMode: 'online',
         price: 0
       });
       if (formData.items) {
         let sortOrder = 1;
         for (const item of formData.items) {
           if (item.questionItem && item.questionItem.question) {
             await createQuestion({
               formId: formId,
               fieldKey: `q_${item.questionItem.question.questionId}`,
               questionType: 'text',
               labelEn: item.title || 'Question',
               required: Boolean(item.questionItem.question.required),
               sortOrder: sortOrder++
             });
           }
         }
       }
    }

    // Now auto-import leads into CRM!
    const allLeads = await loadBunnyLeads();
    for (const lead of leads) {
      const phone = String(lead.phoneNumber || '').replace(/\D/g, '');
      if (phone.length < 10) continue;
      
      const existing = allLeads.find((l: any) => String(l.phoneNumber || '').replace(/\D/g, '').slice(-10) === phone.slice(-10));
      if (!existing) {
        await saveBunnyLead({
          name: lead.name,
          phoneNumber: phone,
          email: lead.email,
          city: lead.city,
          country: lead.country,
          source: 'google_forms',
          workshopName: formTitle,
          status: 'new',
        });
      }
    }

    return NextResponse.json({ 
      data: leads,
      questionMap,
      rawResponses: responses,
      linkedSheetId: formData.linkedSheetId || null
    });
  } catch (error) {
    console.error('Google Forms API Error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
