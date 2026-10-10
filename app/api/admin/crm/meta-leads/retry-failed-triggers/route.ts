import { NextResponse } from 'next/server';
import { bunnyExecute } from '@/lib/bunnyDatabase';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
    try {

        // Update all failed leads to pending (null)
        const sql = `
            UPDATE leads_sql
            SET data_json = json_remove(
                json_remove(data_json, '$.metadata.wtStatus'),
                '$.metadata.wtError'
            ),
            updated_at = ?
            WHERE json_extract(data_json, '$.status') = 'approved'
              AND json_extract(data_json, '$.metadata.wtStatus') = 'failed'
        `;

        const res = await bunnyExecute({
            sql,
            args: [new Date().toISOString()]
        });

        return NextResponse.json({ success: true, message: 'Failed leads queued for retry' });
    } catch (err: any) {
        console.error('Error in retry-failed-triggers:', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
