import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/crm/spell-suggest
 * Get spelling suggestions for a potentially misspelled word.
 *
 * Body: { word: string, language?: string }
 * Response: { suggestions: string[] }
 */

// Common misspellings and their corrections
const COMMON_CORRECTIONS: Record<string, string[]> = {
  // English common mistakes
  'teh': ['the'],
  'helo': ['hello', 'help'],
  'recieve': ['receive'],
  'thier': ['their', 'there', 'they\'re'],
  'occured': ['occurred'],
  'begining': ['beginning'],
  'sepearte': ['separate'],
  'seperate': ['separate'],
  'definately': ['definitely'],
  'occassion': ['occasion'],
  'accomodate': ['accommodate'],
  'embarass': ['embarrass'],
  'occurence': ['occurrence'],
  'untill': ['until'],
  'wierd': ['weird'],
  'beleive': ['believe'],
  'calender': ['calendar'],
  'concious': ['conscious'],
  'goverment': ['government'],
  'publically': ['publicly'],
  'refering': ['referring'],
  'truely': ['truly'],
  'writting': ['writing'],
  'adress': ['address'],
  'acheive': ['achieve'],
  'arguement': ['argument'],
  'basicly': ['basically'],
  'commitee': ['committee'],
  'completly': ['completely'],
  'dissapear': ['disappear'],
  'enviroment': ['environment'],
  'existance': ['existence'],
  'foriegn': ['foreign'],
  'gaurd': ['guard'],
  'grammer': ['grammar'],
  'harrass': ['harass'],
  'immediatly': ['immediately'],
  'independant': ['independent'],
  'knowlege': ['knowledge'],
  'mispell': ['misspell'],
  'neccessary': ['necessary'],
  'noticable': ['noticeable'],
  'persue': ['pursue'],
  'posession': ['possession'],
  'prefered': ['preferred'],
  'priviledge': ['privilege'],
  'pronounciation': ['pronunciation'],
  'recomend': ['recommend'],
  'rythm': ['rhythm'],
  'similiar': ['similar'],
  'succesful': ['successful'],
  'suprise': ['surprise'],
  'tommorow': ['tomorrow'],
  'vaccuum': ['vacuum'],
  'wellcome': ['welcome'],
  
  // Hindi/Indian English common
  'plz': ['please'],
  'pls': ['please'],
  'thx': ['thanks'],
  'thnx': ['thanks'],
  'ur': ['your', 'you\'re'],
  'u': ['you'],
  'r': ['are'],
  'bcoz': ['because'],
  'bcz': ['because'],
  'coz': ['because'],
  'msg': ['message'],
  'tmrw': ['tomorrow'],
  'yday': ['yesterday'],
  'gud': ['good'],
  'nite': ['night'],
  'lite': ['light'],
  'luv': ['love'],
  'fren': ['friend'],
  'frnd': ['friend'],
  'sry': ['sorry'],
  'srry': ['sorry'],
  'thnk': ['think', 'thanks'],
  'abt': ['about'],
  'hw': ['how'],
  'whn': ['when'],
  'wht': ['what'],
  'wen': ['when'],
  'wat': ['what'],
  'wer': ['were', 'where'],
  'whr': ['where'],
  'wid': ['with'],
  'dis': ['this'],
  'dat': ['that'],
  'der': ['their', 'there'],
  'dere': ['there'],
};

// Levenshtein distance for fuzzy matching
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

// Common English words for fuzzy matching
const COMMON_WORDS = [
  'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'I',
  'it', 'for', 'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at',
  'this', 'but', 'his', 'by', 'from', 'they', 'we', 'say', 'her', 'she',
  'or', 'an', 'will', 'my', 'one', 'all', 'would', 'there', 'their', 'what',
  'so', 'up', 'out', 'if', 'about', 'who', 'get', 'which', 'go', 'me',
  'when', 'make', 'can', 'like', 'time', 'no', 'just', 'him', 'know', 'take',
  'people', 'into', 'year', 'your', 'good', 'some', 'could', 'them', 'see', 'other',
  'than', 'then', 'now', 'look', 'only', 'come', 'its', 'over', 'think', 'also',
  'back', 'after', 'use', 'two', 'how', 'our', 'work', 'first', 'well', 'way',
  'even', 'new', 'want', 'because', 'any', 'these', 'give', 'day', 'most', 'us',
  'hello', 'welcome', 'thank', 'thanks', 'please', 'sorry', 'message', 'call', 'today', 'tomorrow',
  'yesterday', 'week', 'month', 'year', 'class', 'session', 'yoga', 'meditation', 'workshop',
  'register', 'registration', 'payment', 'complete', 'confirm', 'confirmation', 'schedule', 'join',
  'online', 'offline', 'free', 'discount', 'offer', 'limited', 'available', 'book', 'booking',
];

function getSuggestions(word: string): string[] {
  const lowerWord = word.toLowerCase();
  
  // 1. Check direct corrections
  if (COMMON_CORRECTIONS[lowerWord]) {
    return COMMON_CORRECTIONS[lowerWord];
  }
  
  // 2. Fuzzy match against common words
  const suggestions: Array<{ word: string; distance: number }> = [];
  
  for (const commonWord of COMMON_WORDS) {
    const distance = levenshteinDistance(lowerWord, commonWord);
    // Only suggest if distance is reasonable (not too different)
    if (distance <= 2 && distance > 0) {
      suggestions.push({ word: commonWord, distance });
    }
  }
  
  // Sort by distance (closest first) and return top 5
  suggestions.sort((a, b) => a.distance - b.distance);
  return suggestions.slice(0, 5).map(s => s.word);
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 401 });
    }

    const token = authHeader.slice(7);
    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const word = body?.word;
    const language = body?.language || 'en';

    if (!word || typeof word !== 'string') {
      return NextResponse.json({ error: 'Word is required' }, { status: 400 });
    }

    const trimmed = word.trim();
    if (trimmed.length < 2) {
      return NextResponse.json({ suggestions: [] }, { status: 200 });
    }

    // Get local suggestions
    const localSuggestions = getSuggestions(trimmed);
    
    // If we have local suggestions, return them
    if (localSuggestions.length > 0) {
      return NextResponse.json({ suggestions: localSuggestions }, { status: 200 });
    }

    // Try Claude API for more suggestions
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (apiKey) {
      try {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: 'claude-3-5-sonnet-20241022',
            max_tokens: 100,
            messages: [
              {
                role: 'user',
                content: `The word "${trimmed}" might be misspelled. If it is misspelled, provide up to 3 correct spelling suggestions in ${language === 'hi' ? 'Hindi context' : 'English'}. If the word is correctly spelled, return empty array.

Return ONLY valid JSON: {"suggestions": ["word1", "word2"]} or {"suggestions": []}`,
              },
            ],
          }),
        });

        if (response.ok) {
          const data = await response.json().catch(() => null);
          const content = data?.content?.[0]?.text || '';
          
          try {
            const parsed = JSON.parse(content);
            if (Array.isArray(parsed?.suggestions)) {
              return NextResponse.json({ suggestions: parsed.suggestions.slice(0, 5) }, { status: 200 });
            }
          } catch {
            // Ignore parse errors
          }
        }
      } catch (error) {
        console.error('Claude spell-suggest error:', error);
      }
    }

    // No suggestions found
    return NextResponse.json({ suggestions: [] }, { status: 200 });
  } catch (error) {
    console.error('Spell suggest error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
