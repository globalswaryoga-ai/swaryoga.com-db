import { NextRequest, NextResponse } from 'next/server';
import { listForms } from '@/lib/bunny-forms-db';
import { listCohorts } from '@/lib/workshopBunnyRepository';
import { bunnyExecute } from '@/lib/bunnyDatabase';

export const dynamic = 'force-dynamic';

export interface PublicWorkshopItem {
  id: string;
  name: string;
  source: 'form' | 'cohort' | 'course';
  formId?: string;
  workshopDate?: string;
  workshopEndDate?: string;
  workshopTime?: string;
  duration?: string;
  mode?: string;
  description?: string;
  image?: string;
  price?: number;
  currency?: string;
}

/**
 * GET /api/enquiry-form
 * Returns a unified list of all active workshops and courses across:
 * 1. Enquiry forms (enquiry_forms table)
 * 2. Workshop Cohorts (workshop_cohorts_sql table)
 * 3. Recorded Courses (courses_sql table)
 * 
 * Any newly added workshop in the admin system is automatically included!
 */
export async function GET(request: NextRequest) {
  try {
    const workshopsMap = new Map<string, PublicWorkshopItem>();

    // 1. Fetch active enquiry forms
    try {
      const forms = await listForms();
      for (const form of forms) {
        if (form.isActive !== false) {
          const key = (form.workshopName || form.formId).toLowerCase().trim();
          workshopsMap.set(key, {
            id: form.formId,
            name: form.workshopName || 'Workshop',
            source: 'form',
            formId: form.formId,
            workshopDate: form.workshopDate || '',
            workshopEndDate: form.workshopEndDate || '',
            workshopTime: form.workshopTime || '',
            duration: form.duration || '',
            mode: form.workshopMode || 'online',
            description: form.description || '',
            image: form.workshopImage || form.urlImage || '',
            price: form.price || 0,
            currency: form.currency || 'INR',
          });
        }
      }
    } catch (err) {
      console.warn('[Enquiry Workhops] Error listing forms:', err);
    }

    // 2. Fetch workshop cohorts
    try {
      const cohorts = await listCohorts();
      for (const cohort of cohorts) {
        const name = cohort.name || cohort.workshopName || '';
        if (!name) continue;
        const key = name.toLowerCase().trim();
        if (!workshopsMap.has(key)) {
          workshopsMap.set(key, {
            id: cohort.id,
            name,
            source: 'cohort',
            workshopDate: cohort.startDate || '',
            workshopEndDate: cohort.endDate || '',
            workshopTime: cohort.timeSlot || '',
            duration: cohort.duration || '',
            mode: cohort.mode || 'online',
            description: cohort.description || '',
            image: cohort.thumbnail || '',
            price: Number(cohort.price) || 0,
            currency: cohort.currency || 'INR',
          });
        }
      }
    } catch (err) {
      console.warn('[Enquiry Workshops] Error listing cohorts:', err);
    }

    // 3. Fetch published courses
    try {
      const coursesRes = await bunnyExecute(
        `SELECT id, slug, content_json, thumbnail FROM courses_sql WHERE is_published = 1 ORDER BY created_at DESC LIMIT 50`
      );
      for (const row of coursesRes.rows) {
        const r: any = row;
        let content: any = {};
        try {
          content = typeof r.content_json === 'string' ? JSON.parse(r.content_json) : (r.content_json || {});
        } catch {}

        const title = content?.en?.title || content?.title || r.slug || '';
        if (!title) continue;
        const key = title.toLowerCase().trim();
        if (!workshopsMap.has(key)) {
          workshopsMap.set(key, {
            id: String(r.id),
            name: title,
            source: 'course',
            description: content?.en?.description || content?.description || '',
            image: r.thumbnail || '',
            mode: 'online self-paced',
            currency: 'INR',
          });
        }
      }
    } catch (err) {
      console.warn('[Enquiry Workshops] Error listing courses:', err);
    }

    const workshops = Array.from(workshopsMap.values());

    return NextResponse.json({
      success: true,
      count: workshops.length,
      workshops,
    });
  } catch (error: any) {
    console.error('[GET /api/enquiry-form] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to list workshops' },
      { status: 500 }
    );
  }
}
