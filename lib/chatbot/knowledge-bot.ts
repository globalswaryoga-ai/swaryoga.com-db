import { connectDB } from '@/lib/db';

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
    await connectDB();
    const { getKnowledgeBaseArticle } = await import('@/lib/schemas/enterpriseSchemas');
    const KnowledgeBaseArticle = getKnowledgeBaseArticle();

    const searchQuery = query.trim().toLowerCase();
    if (!searchQuery) {
      return { found: false, answer: null, confidence: 0 };
    }

    const words = searchQuery.split(/\s+/).filter(w => w.length > 2);

    // Build base query
    const baseQuery: any = { enabled: true };
    if (options.category) {
      baseQuery.category = options.category;
    }
    if (options.language && options.language !== 'auto') {
      baseQuery.$or = [{ language: options.language }, { language: 'auto' }];
    }

    // 1. Exact trigger phrase match (highest confidence)
    const exactMatch = await KnowledgeBaseArticle.findOne({
      ...baseQuery,
      triggerPhrases: { $in: [searchQuery, query.trim()] },
    }).lean();

    if (exactMatch) {
      await KnowledgeBaseArticle.updateOne(
        { _id: exactMatch._id },
        { $inc: { usageCount: 1 }, $set: { lastUsedAt: new Date() } }
      );
      return {
        found: true,
        answer: options.preferShortAnswer && exactMatch.shortAnswer 
          ? exactMatch.shortAnswer 
          : exactMatch.content,
        confidence: 1.0,
        articleId: String(exactMatch._id),
        category: exactMatch.category,
        matchType: 'exact',
      };
    }

    // 2. Keyword matching (high confidence)
    if (words.length > 0) {
      const keywordMatches = await KnowledgeBaseArticle.find({
        ...baseQuery,
        keywords: { $in: words },
      })
        .sort({ priority: -1, usageCount: -1 })
        .limit(3)
        .lean();

      if (keywordMatches.length > 0) {
        // Score by keyword overlap
        const scored = keywordMatches.map((article: any) => {
          const matchCount = words.filter(w => 
            article.keywords.some((k: string) => k.includes(w) || w.includes(k))
          ).length;
          return { article, score: matchCount / Math.max(words.length, 1) };
        }).sort((a, b) => b.score - a.score);

        const bestMatch = scored[0];
        if (bestMatch && bestMatch.score >= 0.3) {
          await KnowledgeBaseArticle.updateOne(
            { _id: bestMatch.article._id },
            { $inc: { usageCount: 1 }, $set: { lastUsedAt: new Date() } }
          );
          return {
            found: true,
            answer: options.preferShortAnswer && bestMatch.article.shortAnswer 
              ? bestMatch.article.shortAnswer 
              : bestMatch.article.content,
            confidence: Math.min(bestMatch.score + 0.3, 0.9),
            articleId: String(bestMatch.article._id),
            category: bestMatch.article.category,
            matchType: 'keyword',
          };
        }
      }
    }

    // 3. Fuzzy content match (lower confidence)
    if (words.length > 0) {
      const fuzzyPattern = words.join('|');
      const fuzzyMatches = await KnowledgeBaseArticle.find({
        ...baseQuery,
        $or: [
          { title: { $regex: fuzzyPattern, $options: 'i' } },
          { content: { $regex: fuzzyPattern, $options: 'i' } },
        ],
      })
        .sort({ priority: -1, usageCount: -1 })
        .limit(3)
        .lean();

      if (fuzzyMatches.length > 0) {
        const best = fuzzyMatches[0] as any;
        await KnowledgeBaseArticle.updateOne(
          { _id: best._id },
          { $inc: { usageCount: 1 }, $set: { lastUsedAt: new Date() } }
        );
        return {
          found: true,
          answer: options.preferShortAnswer && best.shortAnswer 
            ? best.shortAnswer 
            : best.content,
          confidence: 0.5,
          articleId: String(best._id),
          category: best.category,
          matchType: 'fuzzy',
        };
      }
    }

    // No match found
    return { found: false, answer: null, confidence: 0 };

  } catch (err) {
    console.error('[KnowledgeBase Search Error]', err);
    return { found: false, answer: null, confidence: 0 };
  }
}

/**
 * Check if admin is currently available (within office hours & online)
 */
export async function isAdminAvailable(): Promise<{
  available: boolean;
  reason?: string;
}> {
  try {
    await connectDB();
    const { getChatbotSettings } = await import('@/lib/schemas/enterpriseSchemas');
    const ChatbotSettings = getChatbotSettings();

    const settings = await ChatbotSettings.findOne({}).lean() as any;
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
export async function getAfterHoursMessage(): Promise<string | null> {
  try {
    await connectDB();
    const { getChatbotSettings } = await import('@/lib/schemas/enterpriseSchemas');
    const ChatbotSettings = getChatbotSettings();

    const settings = await ChatbotSettings.findOne({}).lean() as any;
    return settings?.afterHoursMessage || null;
  } catch {
    return null;
  }
}

/**
 * Get default response for unmatched queries
 */
export async function getDefaultResponse(): Promise<string | null> {
  try {
    await connectDB();
    const { getChatbotSettings } = await import('@/lib/schemas/enterpriseSchemas');
    const ChatbotSettings = getChatbotSettings();

    const settings = await ChatbotSettings.findOne({}).lean() as any;
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
  } = {}
): Promise<{
  shouldRespond: boolean;
  response: string | null;
  source: 'knowledge_base' | 'ai' | 'after_hours' | 'default' | 'none';
  confidence: number;
}> {
  // Check admin availability
  const adminStatus = await isAdminAvailable();

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
    const afterHoursMsg = await getAfterHoursMessage();
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
  const defaultResp = await getDefaultResponse();
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
