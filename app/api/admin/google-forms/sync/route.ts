import { NextRequest, NextResponse } from 'next/server';
import { bunnyExecute, cleanMongoJson } from '@/lib/bunnyDatabase';
import { decryptCredential, encryptCredential } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const formUrl = url.searchParams.get('url');

    if (!formUrl) {
      return NextResponse.json({ error: 'Missing form URL' }, { status: 400 });
    }

    // Extract Form ID
    let formId = '';
    const dMatch = formUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (dMatch && !formUrl.includes('/d/e/')) {
      formId = dMatch[1];
    } else {
      return NextResponse.json({ error: 'Please provide the Google Form Edit URL (e.g. docs.google.com/forms/d/1XYZ/edit), not the public viewform URL.' }, { status: 400 });
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
            client_id: process.env.GOOGLE_CLIENT_ID?.trim() || '',
            client_secret: process.env.GOOGLE_CLIENT_SECRET?.trim() || '',
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

      return {
        id: `oauth-form-${resp.responseId || Date.now()}-${index}`,
        name: name || `Lead ${index + 1}`,
        email: email || '',
        mobile: mobile || '',
        phoneNumber: mobile || '',
        country: country || '',
        city: city || '',
        gender: gender || '',
        createdAt: resp.createTime || new Date().toISOString(),
        dynamicAnswers
      };
    });

    return NextResponse.json({ data: leads });
  } catch (error) {
    console.error('Google Forms API Error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
