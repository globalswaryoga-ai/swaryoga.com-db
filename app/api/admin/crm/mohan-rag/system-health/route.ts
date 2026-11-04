import { NextResponse } from 'next/server';
import { runComprehensiveSystemHealthCheck } from '@/lib/mohanRag/systemHealthDiagnostic';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const report = await runComprehensiveSystemHealthCheck();
    return NextResponse.json({
      success: true,
      report,
    });
  } catch (error: any) {
    console.error('[SystemHealthDiagnostic] Failed to run health check:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to complete system health diagnostics',
      },
      { status: 500 }
    );
  }
}

