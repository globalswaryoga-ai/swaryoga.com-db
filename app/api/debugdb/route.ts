import { NextResponse } from 'next/server';
import { bunnyExecute } from '@/lib/bunnyDatabase';
export async function GET() {
  const result = await bunnyExecute({
    sql: "SELECT status, failure_reason FROM meta_messages_sql WHERE status = 'failed' ORDER BY created_at DESC LIMIT 3",
    args: []
  });
  return NextResponse.json(result);
}
