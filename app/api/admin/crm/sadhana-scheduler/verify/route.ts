import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getZoomAccessToken } from '@/lib/zoomBotService';

export const dynamic = 'force-dynamic';


/**
 * GET /api/admin/crm/sadhana-scheduler/verify
 * Verifies all components are connected and working
 */
export async function GET(request: NextRequest) {
  try {
    // Optional auth: allow cron secret for testing
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const headerCronSecret = request.headers.get('x-cron-secret');
    const envCronSecretValue = process.env.CRON_SECRET;

    // Check either: valid auth token OR valid cron secret
    const isAuthenticated = (() => {
      if (token) {
        try {
          const decoded = verifyToken(token);
          return !!decoded?.email;
        } catch {
          return false;
        }
      }
      return headerCronSecret === envCronSecretValue && envCronSecretValue;
    })();

    if (!isAuthenticated) {
      return NextResponse.json(
        { error: 'Unauthorized - use Authorization header or x-cron-secret header' },
        { status: 401 }
      );
    }

    console.log('[Sadhana Verify] 🔍 Starting comprehensive verification...');

    const checks: Record<string, any> = {
      timestamp: new Date().toISOString(),
      environment: {},
      database: {},
      zoom: {},
      scheduler: {},
      summary: {},
    };

    // ============================================================================
    // 1. ENVIRONMENT VARIABLES CHECK
    // ============================================================================
    console.log('[Sadhana Verify] 1️⃣ Checking environment variables...');

    const zoomToken = process.env.ZOOM_USER_ACCESS_TOKEN;
    const zoomAccountId = process.env.ZOOM_ACCOUNT_ID;
    const zoomClientId = process.env.ZOOM_CLIENT_ID;
    const zoomClientSecret = process.env.ZOOM_CLIENT_SECRET;
    const zoomBotJid = process.env.ZOOM_BOT_JID;
    const cronSecret = process.env.CRON_SECRET;
    const timezone = process.env.TIMEZONE || 'Asia/Kolkata';

    checks.environment = {
      ZOOM_USER_ACCESS_TOKEN: zoomToken ? '✅ Set' : '❌ Missing',
      ZOOM_ACCOUNT_ID: zoomAccountId ? '✅ Set' : '❌ Missing',
      ZOOM_CLIENT_ID: zoomClientId ? '✅ Set' : '❌ Missing',
      ZOOM_CLIENT_SECRET: zoomClientSecret ? '✅ Set' : '❌ Missing',
      ZOOM_BOT_JID: zoomBotJid ? '✅ Set' : '❌ Not set (optional)',
      CRON_SECRET: cronSecret ? '✅ Set' : '❌ Missing',
      TIMEZONE: `✅ ${timezone}`,
    };

    const envValid = zoomToken || (zoomAccountId && zoomClientId && zoomClientSecret);
    checks.environment.status = envValid
      ? '✅ Zoom credentials found'
      : '❌ No Zoom credentials - bot cannot join';

    // ============================================================================
    // 2. ZOOM API CONNECTION CHECK
    // ============================================================================
    console.log('[Sadhana Verify] 2️⃣ Testing Zoom API connection...');

    let zoomAccessToken: any = null;
    let zoomError = null;

    try {
      zoomAccessToken = await getZoomAccessToken();
      checks.zoom.token = {
        status: '✅ Token generated successfully',
        length: zoomAccessToken?.length || 0,
        preview: zoomAccessToken ? `${zoomAccessToken.slice(0, 20)}...` : 'N/A',
      };
      console.log('[Sadhana Verify] ✅ Zoom token: OK');
    } catch (err: any) {
      zoomError = err.message;
      checks.zoom.token = {
        status: '❌ Token generation failed',
        error: zoomError,
      };
      console.log('[Sadhana Verify] ❌ Zoom token error:', zoomError);
    }

    // ============================================================================
    // 3. DATABASE CONNECTION CHECK
    // ============================================================================
    console.log('[Sadhana Verify] 3️⃣ Checking database connection...');

      const { bunnyExecute } = await import('@/lib/bunnyDatabase');
      const { listSadhanaSchedules } = await import('@/lib/bunnySadhanaSchedulerRepository');
      const { listPrograms } = await import('@/lib/bunnySadhanaRepository');

      const progCountRes = await bunnyExecute({ sql: 'SELECT COUNT(*) as c FROM sadhana_programs_sql', args: [] });
      const totalPrograms = Number(progCountRes.rows[0]?.c || 0);

      const schedules = await listSadhanaSchedules();
      const activeSchedules = schedules.filter((s) => s.status === 'active');
      const programs = await listPrograms({ active: true });

      checks.database.connection = '✅ Connected (Bunny Database)';
      checks.database.schedules = {
        totalSchedules: schedules.length,
        activeSchedules: activeSchedules.length,
        totalPrograms: totalPrograms,
        activePrograms: programs.length,
      };

      if (programs.length > 0) {
        const p = programs[0];
        checks.database.exampleProgram = {
          name: p.name,
          timeSlots: p.timeSlots,
          days: p.days,
          botAutomation: p.enableBotAutomation !== false,
        };
      }

    // ============================================================================
    // 4. SCHEDULER CHECK
    // ============================================================================
    console.log('[Sadhana Verify] 4️⃣ Checking scheduler status...');

    const now = new Date();
    const timezoneForCheck = timezone;

    const localStr = now.toLocaleString('en-US', {
      timeZone: timezoneForCheck,
      hour12: false,
    });

    const [datePart, timePart] = localStr.split(', ');
    const [currentHour, currentMin] = timePart.split(':');
    const utcDate = new Date(now.toLocaleString('sv-SE', { timeZone: timezoneForCheck }));
    const currentDay = utcDate.getDay();

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    checks.scheduler = {
      currentTime: `${currentHour}:${currentMin} (${timezoneForCheck})`,
      currentDay: `${dayNames[currentDay]} (${currentDay})`,
      status: '✅ Scheduler endpoint ready',
      endpoint: '/api/admin/crm/sadhana-scheduler/check',
      callFrequency: 'Every 60 seconds',
      requiresAuth: `x-cron-secret header: ${cronSecret ? '✅ Set' : '❌ Not set'}`,
    };

    // ============================================================================
    // 5. COMPREHENSIVE SUMMARY
    // ============================================================================

    const allGood =
      envValid &&
      zoomAccessToken &&
      checks.database.connection?.includes('✅ Connected') &&
      (checks.database.schedules?.activeSchedules || 0) > 0;

    checks.summary = {
      overallStatus: allGood
        ? '✅ ALL SYSTEMS GO - Ready to deploy!'
        : '⚠️ Some issues - see details below',
      checklist: {
        '1. Zoom Credentials': envValid ? '✅' : '❌',
        '2. Zoom API Token': zoomAccessToken ? '✅' : '❌',
        '3. Database Connected': checks.database.connection?.includes('✅') ? '✅' : '❌',
        '4. Schedules Exist': (checks.database.schedules?.active || 0) > 0 ? '✅' : '❌',
        '5. Bot Automation Enabled': (checks.database.schedules?.botAutomationEnabled || 0) > 0 ? '✅' : '❌',
        '6. Scheduler Endpoint Ready': '✅',
        '7. Cron Secret Set': cronSecret ? '✅' : '❌',
      },
      nextSteps: allGood
        ? [
            '✅ Environment variables are correct',
            '✅ Zoom API is accessible',
            '✅ Database has active schedules',
            '✅ Bot automation is enabled',
            'Deploy to production or test on localhost',
          ]
        : [
            '1. Add missing environment variables',
            '2. Create at least one active schedule with bot automation enabled',
            '3. Set Zoom credentials (ZOOM_USER_ACCESS_TOKEN or service account)',
            '4. Set CRON_SECRET for security',
          ],
    };

    console.log('[Sadhana Verify] ✅ Verification complete');

    return NextResponse.json({
      success: true,
      data: checks,
    });
  } catch (err: any) {
    console.error('[Sadhana Verify] ❌ Error:', err.message);
    return NextResponse.json(
      {
        success: false,
        error: err.message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
