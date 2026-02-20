import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import nspell from 'nspell';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';

// Common misspellings for quick fixes
const QUICK_FIXES: Record<string, string> = {
  'teh': 'the', 'hte': 'the', 'adn': 'and', 'taht': 'that',
  'wiht': 'with', 'thsi': 'this', 'jsut': 'just', 'waht': 'what',
  'yoru': 'your', 'ahve': 'have', 'woudl': 'would', 'shoudl': 'should',
  'becuase': 'because', 'recieve': 'receive', 'recieved': 'received',
  'senting': 'sending', 'mesage': 'message', 'messagess': 'messages',
  'todays': 'today', 'tommorow': 'tomorrow', 'definately': 'definitely',
  'seperate': 'separate', 'occured': 'occurred', 'untill': 'until',
};

// Common words for better suggestion ranking
const COMMON_WORDS = new Set([
  'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'i', 'it', 'for',
  'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at', 'this', 'but', 'his',
  'by', 'from', 'they', 'we', 'say', 'her', 'she', 'or', 'an', 'will', 'my',
  'send', 'sending', 'sent', 'receive', 'received', 'message', 'messages',
  'today', 'tomorrow', 'please', 'thanks', 'hello', 'help', 'need', 'want',
  'call', 'come', 'going', 'done', 'amount', 'payment', 'money', 'price',
]);

// Custom words to ignore
const IGNORE_WORDS = new Set([
  'yoga', 'pranayama', 'asana', 'namaste', 'namaskar', 'swar', 'swara',
  'achha', 'theek', 'kya', 'hai', 'hain', 'nahi', 'ji', 'aap',
  'whatsapp', 'sms', 'msg', 'ok', 'okay', 'url', 'pdf', 'gmail',
]);

// Load spell checker
let spellChecker: ReturnType<typeof nspell> | null = null;
let loadPromise: Promise<ReturnType<typeof nspell> | null> | null = null;

async function getSpellChecker() {
  if (spellChecker) return spellChecker;
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    try {
      const dictPath = dirname(require.resolve('dictionary-en'));
      const aff = readFileSync(join(dictPath, 'index.aff'));
      const dic = readFileSync(join(dictPath, 'index.dic'));
      spellChecker = nspell(aff, dic);
      
      // Add custom words
      IGNORE_WORDS.forEach(w => spellChecker?.add(w));
      
      return spellChecker;
    } catch (err) {
      console.error('Spell checker load failed:', err);
      return null;
    }
  })();

  return loadPromise;
}

// Rank suggestions
function rankSuggestions(original: string, suggestions: string[]): string[] {
  if (suggestions.length <= 1) return suggestions;

  const lower = original.toLowerCase();
  
  return suggestions.sort((a, b) => {
    let scoreA = 0, scoreB = 0;
    
    // Prefer common words
    if (COMMON_WORDS.has(a.toLowerCase())) scoreA += 10;
    if (COMMON_WORDS.has(b.toLowerCase())) scoreB += 10;
    
    // Prefer same first letter
    if (a[0].toLowerCase() === lower[0]) scoreA += 5;
    if (b[0].toLowerCase() === lower[0]) scoreB += 5;
    
    // Prefer similar length
    scoreA += Math.max(0, 3 - Math.abs(a.length - original.length));
    scoreB += Math.max(0, 3 - Math.abs(b.length - original.length));
    
    return scoreB - scoreA;
  });
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : authHeader;
    const decoded = verifyToken(token || undefined);

    if (!decoded) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { text } = await req.json();

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ success: true, errors: [] });
    }

    const checker = await getSpellChecker();
    const errors: Array<{ word: string; start: number; end: number; suggestions: string[] }> = [];

    // Find words with their positions
    const wordRegex = /[a-zA-Z']+/g;
    let match;

    while ((match = wordRegex.exec(text)) !== null) {
      const word = match[0];
      const start = match.index;
      const end = start + word.length;

      // Skip short words, numbers, ignored words
      if (word.length < 2) continue;
      if (IGNORE_WORDS.has(word.toLowerCase())) continue;

      // Check quick fixes first
      const quickFix = QUICK_FIXES[word.toLowerCase()];
      if (quickFix) {
        errors.push({
          word,
          start,
          end,
          suggestions: [quickFix],
        });
        continue;
      }

      // Check with dictionary
      if (checker && !checker.correct(word)) {
        let suggestions = checker.suggest(word) || [];
        suggestions = rankSuggestions(word, suggestions).slice(0, 5);
        
        if (suggestions.length > 0) {
          errors.push({
            word,
            start,
            end,
            suggestions,
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      errors,
      wordCount: text.split(/\s+/).filter(Boolean).length,
      errorCount: errors.length,
    });

  } catch (error: any) {
    console.error('Spell check error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
