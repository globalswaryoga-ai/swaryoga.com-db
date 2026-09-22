import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { bunnyExecute } from '@/lib/bunnyDatabase';
import { getCohort } from '@/lib/workshopBunnyRepository';

function isAdmin(request: NextRequest) {
  const raw = request.headers.get('authorization') || request.cookies.get('token')?.value || '';
  return verifyToken(raw.startsWith('Bearer ') ? raw.slice(7) : raw)?.isAdmin;
}

export async function POST(request: NextRequest) {
  if (!isAdmin(request)) return NextResponse.json({ error: 'Admin access required' }, { status: 403 });

  try {
    const body = await request.json();
    const { cohortId, classDate, dayNumber, isHoliday } = body;

    if (!cohortId || !classDate) {
      return NextResponse.json({ error: 'cohortId and classDate are required' }, { status: 400 });
    }

    const dateStr = String(classDate).slice(0, 10);
    const cohort = await getCohort(cohortId);
    if (!cohort) {
      return NextResponse.json({ error: 'Cohort not found' }, { status: 404 });
    }

    // 1. Handle Holiday status
    let holidayDates: string[] = Array.isArray(cohort.holidayDates) ? [...cohort.holidayDates] : [];
    if (isHoliday === true) {
      if (!holidayDates.some(d => String(d).slice(0, 10) === dateStr)) {
        holidayDates.push(dateStr);
      }
    } else if (isHoliday === false) {
      holidayDates = holidayDates.filter(d => String(d).slice(0, 10) !== dateStr);
    }

    // 2. Handle metadata dateDayMap
    const metadata = typeof cohort.metadata === 'object' && cohort.metadata ? { ...cohort.metadata } : {};
    if (!metadata.dateDayMap) metadata.dateDayMap = {};
    if (dayNumber !== undefined) {
      if (dayNumber === null || dayNumber === '' || isHoliday) {
        delete metadata.dateDayMap[dateStr];
      } else {
        metadata.dateDayMap[dateStr] = Number(dayNumber);
      }
    }

    // Save updated cohort
    await bunnyExecute({
      sql: 'UPDATE workshop_cohorts_sql SET holiday_dates_json = ?, metadata_json = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      args: [JSON.stringify(holidayDates), JSON.stringify(metadata), cohortId]
    });

    // 3. Handle workshop_recordings_sql day_number
    if (dayNumber !== undefined || isHoliday) {
      const finalDay = isHoliday ? null : (dayNumber ? Number(dayNumber) : null);
      const existingRec = await bunnyExecute({
        sql: 'SELECT id FROM workshop_recordings_sql WHERE cohort_id = ? AND class_date = ?',
        args: [cohortId, dateStr]
      });

      if (existingRec.rows.length > 0) {
        const recId = existingRec.rows[0].id;
        await bunnyExecute({
          sql: 'UPDATE workshop_recordings_sql SET day_number = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
          args: [finalDay, recId]
        });
      } else if (finalDay) {
        const newId = crypto.randomUUID();
        await bunnyExecute({
          sql: `INSERT INTO workshop_recordings_sql (
            id, cohort_id, class_date, day_number, delivered_student_ids_json, metadata_json, created_at, updated_at
          ) VALUES (?, ?, ?, ?, '[]', '{}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
          args: [newId, cohortId, dateStr, finalDay]
        });
      }
    }

    const updatedCohort = await getCohort(cohortId);
    return NextResponse.json({ success: true, cohort: updatedCohort });
  } catch (err: any) {
    console.error('[class-date] Error:', err);
    return NextResponse.json({ error: err.message || 'Failed to update class date' }, { status: 500 });
  }
}
