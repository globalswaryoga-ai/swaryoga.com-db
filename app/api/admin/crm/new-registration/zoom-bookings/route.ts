import { NextResponse } from 'next/server';
import { bunnyExecute } from '@/lib/bunnyDatabase';
import { registrationViewer } from '@/lib/registrationAuth';
import { ensureRegistrationZoomBookings } from '@/lib/registrationZoom';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const viewer = registrationViewer(request);
  if (!viewer?.superAdmin) return NextResponse.json({ error: 'Super Admin authentication required' }, { status: 403 });
  try {
    await ensureRegistrationZoomBookings();
    const batchId = new URL(request.url).searchParams.get('batchId') || '';
    const result = await bunnyExecute({ sql: 'SELECT data_json FROM registration_zoom_bookings_sql WHERE batch_id = ?', args: [batchId] });
    return NextResponse.json({ success: true, data: result.rows.map(row => JSON.parse(String(row.data_json))) });
  } catch (error) {
    console.error('Failed to load Zoom bookings:', error);
    return NextResponse.json({ error: 'Failed to load Zoom bookings' }, { status: 500 });
  }
}
