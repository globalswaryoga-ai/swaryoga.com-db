import { NextRequest, NextResponse } from 'next/server';
import { bunnyExecute } from '@/lib/bunnyDatabase';
import { verifyToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

async function initChatbotConfigSchema() {
  await bunnyExecute(`
    CREATE TABLE IF NOT EXISTS crm_chatbot_config_sql (
      config_key TEXT PRIMARY KEY,
      data_json TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `).catch(() => null);
}

/**
 * GET /api/admin/crm/chatbot/config
 * Get chatbot configuration
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(authHeader || '');

    if (!decoded?.isAdmin && !decoded?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await initChatbotConfigSchema();

    const rs = await bunnyExecute({
      sql: `SELECT data_json FROM crm_chatbot_config_sql WHERE config_key = 'chatbot_config' LIMIT 1`,
      args: [],
    }).catch(() => ({ rows: [] }));

    const config = rs.rows.length > 0 ? JSON.parse(String(rs.rows[0].data_json || '{}')) : null;

    return NextResponse.json({
      success: true,
      config: config || null,
    });
  } catch (error) {
    console.error('[Chatbot Config] GET error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get config',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/crm/chatbot/config
 * Save chatbot configuration
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(authHeader || '');

    if (!decoded?.isAdmin && !decoded?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    await initChatbotConfigSchema();

    const configData = {
      key: 'chatbot_config',
      enabled: Boolean(body.enabled),
      welcomeMessage: body.welcomeMessage || '',
      fallbackMessage: body.fallbackMessage || '',
      keywords: Array.isArray(body.keywords) ? body.keywords : [],
      autoReplyDelay: Number(body.autoReplyDelay) || 2,
      workingHours: body.workingHours || {
        enabled: false,
        start: '09:00',
        end: '18:00',
        timezone: 'Asia/Kolkata',
        offHoursMessage: '',
      },
      aiEnabled: Boolean(body.aiEnabled),
      aiModel: body.aiModel || 'gpt-3.5-turbo',
      aiSystemPrompt: body.aiSystemPrompt || '',
      maxAiTokens: Number(body.maxAiTokens) || 150,
      updatedAt: new Date().toISOString(),
      updatedBy: decoded.userId || decoded.username || 'admin',
    };

    await bunnyExecute({
      sql: `INSERT INTO crm_chatbot_config_sql (config_key, data_json, updated_at)
            VALUES ('chatbot_config', ?, ?)
            ON CONFLICT(config_key) DO UPDATE SET data_json=excluded.data_json, updated_at=excluded.updated_at`,
      args: [JSON.stringify(configData), configData.updatedAt],
    });

    return NextResponse.json({
      success: true,
      message: 'Chatbot configuration saved',
      config: configData,
    });
  } catch (error) {
    console.error('[Chatbot Config] POST error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to save config',
      },
      { status: 500 }
    );
  }
}
