import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import mongoose from 'mongoose';

export const dynamic = 'force-dynamic';

// Chatbot Config Schema (stored in settings collection)
const ChatbotConfigSchema = new mongoose.Schema({
  key: { type: String, default: 'chatbot_config', unique: true },
  enabled: { type: Boolean, default: false },
  welcomeMessage: { type: String, default: '' },
  fallbackMessage: { type: String, default: '' },
  keywords: [{
    keyword: String,
    response: String,
    action: { type: String, enum: ['reply', 'forward_to_agent', 'send_template'], default: 'reply' },
    templateName: String,
  }],
  autoReplyDelay: { type: Number, default: 2 },
  workingHours: {
    enabled: { type: Boolean, default: false },
    start: { type: String, default: '09:00' },
    end: { type: String, default: '18:00' },
    timezone: { type: String, default: 'Asia/Kolkata' },
    offHoursMessage: { type: String, default: '' },
  },
  aiEnabled: { type: Boolean, default: false },
  aiModel: { type: String, default: 'gpt-3.5-turbo' },
  aiSystemPrompt: { type: String, default: '' },
  maxAiTokens: { type: Number, default: 150 },
  updatedAt: { type: Date, default: Date.now },
  updatedBy: { type: String },
}, { collection: 'crm_settings' });

function getChatbotConfig() {
  return mongoose.models.ChatbotConfig || mongoose.model('ChatbotConfig', ChatbotConfigSchema);
}

/**
 * GET /api/admin/crm/chatbot/config
 * Get chatbot configuration
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(authHeader || '');
    
    if (!decoded?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const ChatbotConfig = getChatbotConfig();

    const config = await ChatbotConfig.findOne({ key: 'chatbot_config' });

    return NextResponse.json({
      success: true,
      config: config || null,
    });
  } catch (error) {
    console.error('[Chatbot Config] GET error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get config',
    }, { status: 500 });
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
    
    if (!decoded?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    await connectDB();
    const ChatbotConfig = getChatbotConfig();

    const config = await ChatbotConfig.findOneAndUpdate(
      { key: 'chatbot_config' },
      {
        $set: {
          enabled: body.enabled,
          welcomeMessage: body.welcomeMessage,
          fallbackMessage: body.fallbackMessage,
          keywords: body.keywords,
          autoReplyDelay: body.autoReplyDelay,
          workingHours: body.workingHours,
          aiEnabled: body.aiEnabled,
          aiModel: body.aiModel,
          aiSystemPrompt: body.aiSystemPrompt,
          maxAiTokens: body.maxAiTokens,
          updatedAt: new Date(),
          updatedBy: decoded.userId || 'admin',
        },
      },
      { upsert: true, new: true }
    );

    console.log('[Chatbot Config] Saved by:', decoded.userId);

    return NextResponse.json({
      success: true,
      message: 'Configuration saved',
      config,
    });
  } catch (error) {
    console.error('[Chatbot Config] POST error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to save config',
    }, { status: 500 });
  }
}
