import { NextRequest, NextResponse } from 'next/server';
import { bunnyExecute } from '@/lib/bunnyDatabase';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const yearStr = searchParams.get('year');
    const monthStr = searchParams.get('month'); // 1-12

    if (!yearStr || !monthStr) {
      return NextResponse.json({ error: 'year and month parameters required' }, { status: 400 });
    }

    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10); // 1-12
    if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
      return NextResponse.json({ error: 'Invalid year or month' }, { status: 400 });
    }

    // Get program info from BunnyDB
    const programData = await bunnyExecute({
      sql: `SELECT timezone FROM sadhana_programs_sql WHERE slug = ?`,
      args: [params.slug]
    });
    
    if (!programData.rows || programData.rows.length === 0) {
      return NextResponse.json({ error: 'Program not found' }, { status: 404 });
    }

    const timezone = programData.rows[0].timezone || 'Asia/Kolkata';

    // Calculate UTC range for the entire month in the program's timezone
    const daysInMonth = new Date(year, month, 0).getDate(); // month is 1-indexed, trick to get days

    const pad = (n: number) => String(n).padStart(2, '0');
    const firstDay = `${year}-${pad(month)}-01`;
    const lastDay = `${year}-${pad(month)}-${pad(daysInMonth)}`;

    const startUtc = new Date(`${firstDay}T00:00:00Z`);
    startUtc.setUTCDate(startUtc.getUTCDate() - 1); 
    const endUtc = new Date(`${lastDay}T23:59:59Z`);
    endUtc.setUTCDate(endUtc.getUTCDate() + 1); 

    const startIso = startUtc.toISOString();
    const endIso = endUtc.toISOString();

    const joinLogs = (await bunnyExecute({
      sql: `SELECT joined_at FROM sadhana_join_history_sql 
            WHERE program_slug = ? AND joined_at >= ? AND joined_at <= ?`,
      args: [params.slug, startIso, endIso]
    })).rows;

    // Group by local date using the program timezone
    const countsByDate: Record<string, number> = {};

    // Initialize all days to 0
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${pad(month)}-${pad(d)}`;
      countsByDate[dateStr] = 0;
    }

    // Count participants from join logs
    for (const log of joinLogs) {
      const joinDate = log.joined_at ? new Date(log.joined_at) : null;
      if (!joinDate) continue;

      const localDateStr = joinDate.toLocaleDateString('en-CA', { timeZone: timezone });
      if (countsByDate[localDateStr] !== undefined) {
        countsByDate[localDateStr]++;
      }
    }

    return NextResponse.json({
      success: true,
      year,
      month,
      daysInMonth,
      countsByDate, 
    });
  } catch (error) {
    console.error('[participants-by-month]', error);
    const msg = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
