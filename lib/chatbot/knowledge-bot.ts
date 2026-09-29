import { searchBunnyKnowledgeBaseArticles } from '@/lib/bunnyKnowledgeBaseRepository';

/**
 * Knowledge Base Bot Engine
 * Searches knowledge base and returns appropriate response
 * Used by both Meta WhatsApp and QR WhatsApp
 */

type KBSearchResult = {
  found: boolean;
  answer: string | null;
  confidence: number;
  articleId?: string;
  category?: string;
  matchType?: string;
};

/**
 * Search knowledge base for an answer to the user's question
 */
export async function searchKnowledgeBase(
  query: string,
  options: {
    category?: string;
    language?: string;
    preferShortAnswer?: boolean;
  } = {}
): Promise<KBSearchResult> {
  try {
    const res = await searchBunnyKnowledgeBaseArticles(query, options);
    return {
      found: res.found,
      answer: res.answer,
      confidence: res.confidence,
      articleId: res.articleId,
      category: res.category,
      matchType: res.matchType,
    };
  } catch (err) {
    console.error('[KnowledgeBase Search Error]', err);
    return { found: false, answer: null, confidence: 0 };
  }
}

/**
 * Check if admin is currently available (within office hours & online)
 */
export async function isAdminAvailable(ownerId: string = ''): Promise<{
  available: boolean;
  reason?: string;
}> {
  try {
    const { getBunnyChatbotSettings } = await import('@/lib/bunnyChatbotSettingsRepository');
    const settings = await getBunnyChatbotSettings(ownerId);
    if (!settings) {
      return { available: true }; // No settings = always available
    }

    // Check office hours
    if (settings.officeHoursEnabled) {
      const tz = settings.officeHoursTimezone || 'Asia/Kolkata';
      const now = new Date();

      // Get current time in timezone
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: tz,
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
      const currentTime = formatter.format(now);

      const startTime = settings.officeHoursStart || '09:00';
      const endTime = settings.officeHoursEnd || '18:00';

      if (currentTime < startTime || currentTime > endTime) {
        return {
          available: false,
          reason: 'outside_office_hours'
        };
      }
    }

    return { available: true };
  } catch (err) {
    console.error('[Admin Availability Check Error]', err);
    return { available: true }; // Default to available on error
  }
}

/**
 * Get after-hours message from settings
 */
export async function getAfterHoursMessage(ownerId: string = ''): Promise<string | null> {
  try {
    const { getBunnyChatbotSettings } = await import('@/lib/bunnyChatbotSettingsRepository');
    const settings = await getBunnyChatbotSettings(ownerId);
    return settings?.afterHoursMessage || null;
  } catch {
    return null;
  }
}

/**
 * Get default response for unmatched queries
 */
export async function getDefaultResponse(ownerId: string = ''): Promise<string | null> {
  try {
    const { getBunnyChatbotSettings } = await import('@/lib/bunnyChatbotSettingsRepository');
    const settings = await getBunnyChatbotSettings(ownerId);
    return settings?.defaultResponse || null;
  } catch {
    return null;
  }
}

/**
 * Main bot response handler
 * Uses knowledge base when admin is unavailable
 */
export async function getBotResponse(
  userMessage: string,
  options: {
    leadId?: string;
    phoneNumber?: string;
    forceBot?: boolean;
    language?: string;
    ownerId?: string;
  } = {}
): Promise<{
  shouldRespond: boolean;
  response: string | null;
  source: 'knowledge_base' | 'ai' | 'after_hours' | 'default' | 'none';
  confidence: number;
}> {
  // Check admin availability
  const adminStatus = await isAdminAvailable(options.ownerId || '');

  // If admin is available and not forcing bot, don't auto-respond
  if (adminStatus.available && !options.forceBot) {
    return {
      shouldRespond: false,
      response: null,
      source: 'none',
      confidence: 0,
    };
  }

  // Admin not available - check knowledge base
  const kbResult = await searchKnowledgeBase(userMessage, {
    language: options.language,
    preferShortAnswer: true, // For WhatsApp, prefer shorter answers
  });

  if (kbResult.found && kbResult.confidence >= 0.5) {
    return {
      shouldRespond: true,
      response: kbResult.answer,
      source: 'knowledge_base',
      confidence: kbResult.confidence,
    };
  }

  // If outside office hours, send after-hours message
  if (adminStatus.reason === 'outside_office_hours') {
    const afterHoursMsg = await getAfterHoursMessage(options.ownerId || '');
    if (afterHoursMsg) {
      return {
        shouldRespond: true,
        response: afterHoursMsg,
        source: 'after_hours',
        confidence: 1.0,
      };
    }
  }

  // Fall back to default response
  const defaultResp = await getDefaultResponse(options.ownerId || '');
  if (defaultResp) {
    return {
      shouldRespond: true,
      response: defaultResp,
      source: 'default',
      confidence: 0.3,
    };
  }

  // No response available
  return {
    shouldRespond: false,
    response: null,
    source: 'none',
    confidence: 0,
  };
}
