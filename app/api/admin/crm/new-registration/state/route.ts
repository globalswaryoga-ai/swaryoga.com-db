import { NextResponse } from 'next/server';
import { uploadToPath, fetchFromStorage } from '@/lib/bunny-storage';

const STATE_FILE_PATH = 'admin/crm/new-registration-state.json';

export async function GET() {
  try {
    const { buffer } = await fetchFromStorage(STATE_FILE_PATH);
    const data = JSON.parse(buffer.toString('utf-8'));
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error fetching CRM state from Bunny:', error);
    return NextResponse.json({ error: 'Failed to fetch state', details: error?.message || String(error) }, { status: 404 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const buffer = Buffer.from(JSON.stringify(body));
    await uploadToPath(buffer, STATE_FILE_PATH, 'application/json');
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error saving CRM state to Bunny:', error);
    return NextResponse.json({ error: 'Failed to save state', details: error?.message || String(error) }, { status: 500 });
  }
}
