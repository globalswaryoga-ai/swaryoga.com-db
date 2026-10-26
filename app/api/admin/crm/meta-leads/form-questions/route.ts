import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { registrationViewer } from '@/lib/registrationAuth';
import { loadBunnyLeads } from '@/lib/bunnyLeadsRepository';

export const dynamic = 'force-dynamic';

const EXCLUDED_FIELDS = new Set([
  'full_name', 'phone_number', 'email', 'name', 'phone', 
  'first_name', 'last_name', 'country', 'state', 'city', 'zip_code', 'street_address'
]);

export async function GET(req: NextRequest) {
  try {
    const viewer = registrationViewer(req);
    if (!viewer) {
      return NextResponse.json({ error: 'Admin authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const formId = searchParams.get('formId')?.trim() || '';
    const workshopId = searchParams.get('workshopId')?.trim() || '';

    const questionsMap = new Map<string, {
      key: string;
      label: string;
      type: string;
      options: string[];
    }>();

    let formName = '';

    // 1. Fetch live questions from Meta Graph API if formId is provided
    if (formId) {
      const token = process.env.META_PAGE_ACCESS_TOKEN;
      const appSecret = process.env.META_APP_SECRET;

      if (token) {
        try {
          let proofParam = '';
          if (appSecret) {
            const proof = crypto.createHmac('sha256', appSecret).update(token).digest('hex');
            proofParam = `&appsecret_proof=${proof}`;
          }

          const metaUrl = `https://graph.facebook.com/v24.0/${encodeURIComponent(formId)}?fields=id,name,questions,status&access_token=${encodeURIComponent(token)}${proofParam}`;
          const res = await fetch(metaUrl, { cache: 'no-store', signal: AbortSignal.timeout(8000) });
          const data = await res.json();

          if (res.ok && data.questions && Array.isArray(data.questions)) {
            formName = data.name || '';
            for (const q of data.questions) {
              const rawKey = q.key || q.id || '';
              const normalized = rawKey.toLowerCase().replace(/\s+/g, ' ').trim();
              const label = q.label || q.key || '';
              const options = Array.isArray(q.options) 
                ? q.options.map((opt: any) => typeof opt === 'string' ? opt : (opt.value || opt.key || '')).filter(Boolean)
                : [];

              if (normalized) {
                questionsMap.set(normalized, {
                  key: rawKey,
                  label: label || rawKey,
                  type: q.type || 'CUSTOM',
                  options
                });
              }
            }
          } else {
            console.warn('[Form Questions API] Meta API response:', data.error?.message || data);
          }
        } catch (metaErr) {
          console.warn('[Form Questions API] Failed to fetch from Meta:', metaErr);
        }
      }
    }

    // 2. Fallback / supplement: scan existing leads in BunnyDB for rawFieldData
    try {
      const allLeads = await loadBunnyLeads();
      const relevantLeads = allLeads.filter((l: any) => {
        if (formId && (l.metadata?.metaFormId === formId || l.metadata?.facebookFormId === formId || l.metadata?.formId === formId)) return true;
        if (workshopId && (l.workshopId === workshopId || l.metadata?.workshopId === workshopId)) return true;
        return false;
      });

      for (const lead of relevantLeads) {
        const raw = lead.metadata?.rawFieldData;
        if (Array.isArray(raw)) {
          for (const item of raw) {
            const rawKey = item.name || item.question_text || '';
            const normalized = rawKey.toLowerCase().replace(/\s+/g, ' ').trim();
            if (normalized && !questionsMap.has(normalized)) {
              const label = item.question_text || rawKey.replace(/_/g, ' ');
              const values = Array.isArray(item.values) ? item.values : [];
              questionsMap.set(normalized, {
                key: rawKey,
                label: label,
                type: 'LEAD_FIELD',
                options: values.filter(Boolean)
              });
            }
          }
        }
      }
    } catch (dbErr) {
      console.warn('[Form Questions API] Failed scanning leads in DB:', dbErr);
    }

    // Convert to sorted array, prioritizing custom questions over personal fields
    const allQuestions = Array.from(questionsMap.values());
    const customQuestions = allQuestions.filter(q => !EXCLUDED_FIELDS.has(q.key.toLowerCase().trim()));
    const personalQuestions = allQuestions.filter(q => EXCLUDED_FIELDS.has(q.key.toLowerCase().trim()));

    return NextResponse.json({
      success: true,
      formId,
      formName,
      questions: [...customQuestions, ...personalQuestions],
      customQuestionsCount: customQuestions.length,
      totalCount: allQuestions.length
    });
  } catch (err: any) {
    console.error('[Form Questions API] Error:', err);
    return NextResponse.json({ error: err.message || 'Failed to fetch questions' }, { status: 500 });
  }
}
