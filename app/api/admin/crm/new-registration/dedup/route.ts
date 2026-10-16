import { NextResponse } from 'next/server';
import { registrationViewer } from '@/lib/registrationAuth';
import { bunnyExecute } from '@/lib/bunnyDatabase';
import { invalidateBunnyLeadsCache } from '@/lib/bunnyLeadsRepository';
import { registrationFormId } from '@/lib/registrationLeads';

export const dynamic = 'force-dynamic';

function phoneKey(val: unknown): string {
  const digits = String(val || '').replace(/\D/g, '');
  return digits.length >= 10 ? digits.slice(-10) : '';
}

export async function POST(request: Request) {
  const viewer = registrationViewer(request);
  if (!viewer) return NextResponse.json({ error: 'Admin authentication required' }, { status: 401 });

  try {
    const body = await request.json().catch(() => ({}));
    const rawFormId = body?.formId ? String(body.formId).trim() : '';
    const targetFormId = rawFormId ? registrationFormId(rawFormId) : null;

    const query = targetFormId
      ? {
          sql: `SELECT id, form_id, name, mobile, email, form_data, created_at, answers, lead_id FROM form_submissions WHERE form_id = ? ORDER BY created_at ASC`,
          args: [targetFormId],
        }
      : {
          sql: `SELECT id, form_id, name, mobile, email, form_data, created_at, answers, lead_id FROM form_submissions ORDER BY created_at ASC`,
          args: [],
        };

    const res = await bunnyExecute(query);
    const rows = res.rows || [];

    // Group rows by form_id to deduplicate within each form
    const formsMap = new Map<string, typeof rows>();
    for (const r of rows) {
      const fId = String(r.form_id || '');
      if (!formsMap.has(fId)) formsMap.set(fId, []);
      formsMap.get(fId)!.push(r);
    }

    const toDeleteIds: string[] = [];
    const affectedFormIds = new Set<string>();

    for (const [fId, formRows] of formsMap.entries()) {
      const seenPhone = new Map<string, any>();
      const seenEmail = new Map<string, any>();
      const seenFormDataPrefix = new Map<string, any>();

      for (const r of formRows) {
        const p = phoneKey(r.mobile);
        const e = String(r.email || '').trim().toLowerCase();
        const fd = String(r.form_data || '').trim();
        const fdPrefix = fd.length >= 12 ? fd.slice(0, 15) : '';

        let match: any = null;
        if (p && seenPhone.has(p)) match = seenPhone.get(p);
        else if (e && seenEmail.has(e)) match = seenEmail.get(e);
        else if (fdPrefix && seenFormDataPrefix.has(fdPrefix)) match = seenFormDataPrefix.get(fdPrefix);

        if (match) {
          // Keep the better/primary record:
          // Prefer gform_ over sub_, prefer longer form_data
          const isRBetter =
            (String(r.id).startsWith('gform_') && !String(match.id).startsWith('gform_')) ||
            String(r.form_data || '').length > String(match.form_data || '').length;

          if (isRBetter) {
            toDeleteIds.push(String(match.id));
            if (p) seenPhone.set(p, r);
            if (e) seenEmail.set(e, r);
            if (fdPrefix) seenFormDataPrefix.set(fdPrefix, r);
          } else {
            toDeleteIds.push(String(r.id));
          }
          affectedFormIds.add(fId);
        } else {
          if (p) seenPhone.set(p, r);
          if (e) seenEmail.set(e, r);
          if (fdPrefix) seenFormDataPrefix.set(fdPrefix, r);
        }
      }
    }

    // Execute deletion in chunks
    if (toDeleteIds.length > 0) {
      const chunkSize = 50;
      for (let i = 0; i < toDeleteIds.length; i += chunkSize) {
        const chunk = toDeleteIds.slice(i, i + chunkSize);
        const placeholders = chunk.map(() => '?').join(',');
        await bunnyExecute({
          sql: `DELETE FROM form_submissions WHERE id IN (${placeholders})`,
          args: chunk,
        });
      }

      // Update submission counts for affected forms
      for (const fId of affectedFormIds) {
        try {
          await bunnyExecute({
            sql: `UPDATE enquiry_forms SET submission_count = (SELECT COUNT(*) FROM form_submissions WHERE form_id = ?) WHERE form_id = ?`,
            args: [fId, fId],
          });
        } catch (e) {}
      }

      invalidateBunnyLeadsCache();
    }

    return NextResponse.json({
      success: true,
      deletedCount: toDeleteIds.length,
      deletedIds: toDeleteIds,
      remainingCount: rows.length - toDeleteIds.length,
    });
  } catch (error: any) {
    console.error('Failed to deduplicate leads:', error);
    return NextResponse.json({ error: error?.message || 'Failed to remove duplicates' }, { status: 500 });
  }
}
