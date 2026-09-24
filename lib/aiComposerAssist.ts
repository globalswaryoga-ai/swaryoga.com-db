// Shared "Fix"/"Auto"/"AI reply" logic used by both the main admin composer
// (app/api/admin/crm/ai-assist/route.ts) and the browser extension
// (app/api/extension/ai/route.ts) — kept in one place so both surfaces
// behave identically instead of drifting.
//
// "Fix"/"Auto" used to run text through an English-only Hunspell dictionary
// (nspell + dictionary-en below) that silently mangled Hindi/Hinglish words
// not on a small ~14-word allow-list — a real problem given how much of this
// business's WhatsApp/Instagram/Messenger traffic is Hindi/Hinglish. "AI
// reply" wasn't AI at all — it was a fixed English keyword→canned-sentence
// table. Both now call a real model first (same Gemini→Anthropic→OpenAI
// fallback chain the translate feature already uses) and only fall back to
// the old dictionary/canned-reply logic if every configured AI provider
// fails or none are configured — so the feature degrades gracefully instead
// of hard-failing when a provider has a quota blip.

import nspell from 'nspell';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { generateAIText } from '@/lib/ai/generateWithFallback';

export async function aiFixText(text: string): Promise<string | null> {
  try {
    const raw = await generateAIText({
      systemPrompt:
        'You correct spelling and grammar in WhatsApp/Instagram/Messenger business messages for a yoga & wellness studio (Swar Yoga). ' +
        'Messages are frequently a mix of English and Hindi/Hinglish written in Latin script (e.g. "kya", "hai", "nahi", "theek", "achha", "aap", "kaise", "namaste", "abhi", "matlab", "bahut", "thoda"). ' +
        'Only fix genuine spelling/typing errors and grammar. Do NOT "correct" Hindi/Hinglish words into unrelated English words, and do NOT translate anything. ' +
        'Preserve emojis, line breaks, WhatsApp formatting markers (*bold*, _italic_, ~strike~, ```code```), and placeholders like {{name}} or {{date}} exactly as-is. ' +
        'Return ONLY valid JSON in this exact shape, no other text: {"correctedText": "..."}',
      message: text,
      maxOutputTokens: 800,
      temperature: 0.1,
    });
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : raw);
    return typeof parsed?.correctedText === 'string' ? parsed.correctedText : null;
  } catch (err) {
    console.warn('[aiComposerAssist] AI fix failed, falling back to dictionary:', err instanceof Error ? err.message : err);
    return null;
  }
}

export async function aiSmartReply(context: string): Promise<string | null> {
  try {
    return (
      await generateAIText({
        systemPrompt:
          'You draft a single short WhatsApp/Instagram/Messenger reply on behalf of Swar Yoga, a yoga & wellness studio. ' +
          'Reply in the SAME language/mix the customer used (English, Hindi, or Hinglish in Latin script) — do not switch languages on them. ' +
          'Be warm, concise (1-3 sentences), and directly address what they asked or said. If you do not have enough information to answer specifically ' +
          '(e.g. exact prices, batch timings, or policies you were not given), ask a brief clarifying question instead of inventing details. ' +
          'Return ONLY the reply text itself — no quotes, no explanation, no JSON.',
        message: context?.trim() ? `Customer's last message: "${context.trim()}"` : 'The customer has not sent a message yet — write a brief, friendly opening greeting.',
        maxOutputTokens: 300,
        temperature: 0.5,
      })
    ).trim();
  } catch (err) {
    console.warn('[aiComposerAssist] AI reply failed, falling back to canned reply:', err instanceof Error ? err.message : err);
    return null;
  }
}

/** Small keyword→canned-sentence fallback, only used when every AI provider fails/is unconfigured. */
export function cannedReply(context: string): string {
  const lastMsg = (context || '').toLowerCase();
  if (lastMsg.includes('price') || lastMsg.includes('cost') || lastMsg.includes('fee') || lastMsg.includes('charge')) {
    return 'Our classes start from ₹999/month. Would you like to see the full plan details?';
  }
  if (lastMsg.includes('time') || lastMsg.includes('schedule') || lastMsg.includes('batch')) {
    return 'We have batches at 6 AM, 7 AM, and 6 PM. Which time works best for you?';
  }
  if (lastMsg.includes('online') || lastMsg.includes('zoom')) {
    return 'Yes, we offer online sessions via Zoom. You can join from anywhere!';
  }
  if (lastMsg.includes('namaste') || lastMsg.includes('hello') || lastMsg.includes('hi')) {
    return 'Namaste 🙏 Welcome to Swar Yoga! How can I help you today?';
  }
  if (lastMsg.includes('thank')) {
    return "You're welcome! Feel free to reach out if you have any more questions. 🙏";
  }
  if (lastMsg.includes('address') || lastMsg.includes('location') || lastMsg.includes('where')) {
    return 'You can find our center details on our website. Would you like me to share the link?';
  }
  return 'Hello! How can I assist you with Yoga today?';
}

// ── Offline dictionary fallback (used only when every AI provider fails) ──

let spellChecker: ReturnType<typeof nspell> | null = null;
let dictionaryLoadPromise: Promise<ReturnType<typeof nspell> | null> | null = null;

async function getSpellChecker(): Promise<ReturnType<typeof nspell> | null> {
  if (spellChecker) return spellChecker;
  if (dictionaryLoadPromise) return dictionaryLoadPromise;

  dictionaryLoadPromise = (async () => {
    try {
      const dictPath = dirname(require.resolve('dictionary-en'));
      const aff = readFileSync(join(dictPath, 'index.aff'));
      const dic = readFileSync(join(dictPath, 'index.dic'));

      spellChecker = nspell(aff, dic);

      const customWords = [
        'yoga', 'pranayama', 'asana', 'namaste', 'namaskar', 'swar', 'swara',
        'chakra', 'mudra', 'mantra', 'vedic', 'ayurveda', 'ayurvedic',
        'achha', 'theek', 'kya', 'hai', 'hain', 'nahi', 'ji', 'aap', 'kaise',
        'whatsapp', 'sms', 'msg', 'msgs', 'ok', 'okay',
        'zoom', 'online', 'offline', 'pdf', 'url', 'www',
        'crm', 'api', 'ui', 'ux', 'js', 'ts', 'css', 'html',
        'gmail', 'email', 'wifi',
      ];
      customWords.forEach(word => spellChecker?.add(word));

      return spellChecker;
    } catch (err) {
      console.error('Failed to load spell checker:', err);
      return null;
    }
  })();

  return dictionaryLoadPromise;
}

const COMMON_MISSPELLINGS: Record<string, string> = {
  'teh': 'the', 'hte': 'the', 'tge': 'the', 'th': 'the',
  'adn': 'and', 'nad': 'and', 'anf': 'and',
  'taht': 'that', 'htat': 'that', 'tht': 'that',
  'wiht': 'with', 'wtih': 'with', 'wih': 'with',
  'thsi': 'this', 'htis': 'this', 'ths': 'this',
  'jsut': 'just', 'juts': 'just', 'jst': 'just',
  'waht': 'what', 'hwat': 'what', 'wht': 'what',
  'yoru': 'your', 'yuor': 'your', 'yor': 'your',
  'ahve': 'have', 'hvae': 'have', 'hav': 'have',
  'cna': 'can', 'acn': 'can',
  'woudl': 'would', 'owuld': 'would', 'wuld': 'would',
  'shoudl': 'should', 'shuold': 'should', 'shold': 'should',
  'oculd': 'could', 'cuold': 'could', 'coud': 'could',
  'abotu': 'about', 'aobut': 'about', 'abot': 'about',
  'becuase': 'because', 'becasue': 'because', 'becouse': 'because', 'becase': 'because',
  'beleive': 'believe', 'belive': 'believe', 'beleve': 'believe',
  'senting': 'sending', 'sendng': 'sending', 'sendin': 'sending', 'sening': 'sending',
  'sended': 'sent', 'sendt': 'sent',
  'recieve': 'receive', 'recive': 'receive', 'receiv': 'receive',
  'recvered': 'received', 'recived': 'received', 'recieved': 'received',
  'receved': 'received', 'recevied': 'received', 'recevd': 'received',
  'receivd': 'received', 'recved': 'received',
  'mesage': 'message', 'messge': 'message', 'mesg': 'message',
  'messagess': 'messages', 'mesages': 'messages', 'messges': 'messages',
  'messgae': 'message', 'massege': 'message', 'massage': 'message',
  'todays': 'today', 'tday': 'today', 'todey': 'today', 'todya': 'today',
  'tommorow': 'tomorrow', 'tommorrow': 'tomorrow', 'tomorow': 'tomorrow',
  'tomorro': 'tomorrow', 'tomowrrow': 'tomorrow', 'tomorr': 'tomorrow',
  'occured': 'occurred', 'occurr': 'occur', 'occure': 'occur',
  'untill': 'until', 'untl': 'until', 'util': 'until',
  'definately': 'definitely', 'definatly': 'definitely', 'defintely': 'definitely',
  'defiantly': 'definitely', 'definetly': 'definitely',
  'seperate': 'separate', 'seperete': 'separate', 'seprate': 'separate',
  'occassion': 'occasion', 'ocasion': 'occasion', 'occation': 'occasion',
  'neccessary': 'necessary', 'necesary': 'necessary', 'necessery': 'necessary',
  'accomodate': 'accommodate', 'acommodate': 'accommodate',
  'gaurd': 'guard', 'gard': 'guard',
  'wierd': 'weird', 'wired': 'weird',
  'freind': 'friend', 'frend': 'friend', 'frnd': 'friend',
  'acheive': 'achieve', 'achive': 'achieve', 'acheiv': 'achieve',
  'knowlege': 'knowledge', 'konwledge': 'knowledge', 'knwledge': 'knowledge',
  'goverment': 'government', 'govermnent': 'government', 'govt': 'government',
  'enviroment': 'environment', 'enviornment': 'environment',
  'restaraunt': 'restaurant', 'resturant': 'restaurant', 'restraunt': 'restaurant',
  'buisness': 'business', 'busines': 'business', 'bussiness': 'business',
  'calender': 'calendar', 'calandar': 'calendar', 'calander': 'calendar',
  'comming': 'coming', 'comeing': 'coming', 'comng': 'coming',
  'somthing': 'something', 'somethng': 'something', 'smthing': 'something',
  'everthing': 'everything', 'everythng': 'everything',
  'intrested': 'interested', 'intersted': 'interested', 'intrsted': 'interested',
  'diffrent': 'different', 'diferent': 'different',
  'probaly': 'probably', 'probabaly': 'probably', 'probbly': 'probably',
  'alot': 'a lot', 'allot': 'a lot',
  'thier': 'their', 'ther': 'their',
  'realy': 'really', 'raelly': 'really', 'realyy': 'really',
  'actualy': 'actually', 'acutally': 'actually', 'actully': 'actually',
  'basicaly': 'basically', 'basicly': 'basically',
  'finaly': 'finally', 'finially': 'finally',
  'generaly': 'generally', 'genrally': 'generally',
  'especally': 'especially', 'especialy': 'especially', 'espically': 'especially',
  'immedietly': 'immediately', 'immediatly': 'immediately', 'immediatley': 'immediately',
  'unfortunatly': 'unfortunately', 'unfortunatley': 'unfortunately',
  'completly': 'completely', 'completley': 'completely',
  'absoutely': 'absolutely', 'absolutley': 'absolutely',
  'orignal': 'original', 'originaly': 'originally',
  'availble': 'available', 'avaliable': 'available', 'availabe': 'available',
  'accross': 'across', 'acros': 'across',
  'adress': 'address', 'addres': 'address', 'adres': 'address',
  'begining': 'beginning', 'beginnng': 'beginning',
  'comittee': 'committee', 'commitee': 'committee', 'committe': 'committee',
  'embarass': 'embarrass', 'embarras': 'embarrass',
  'excelent': 'excellent', 'excellant': 'excellent', 'exellent': 'excellent',
  'familar': 'familiar', 'familer': 'familiar',
  'foriegn': 'foreign', 'forein': 'foreign',
  'fourty': 'forty', 'fourties': 'forties',
  'grammer': 'grammar', 'gramer': 'grammar',
  'harrass': 'harass', 'harras': 'harass',
  'helllo': 'hello', 'helo': 'hello', 'hllo': 'hello',
  'independant': 'independent', 'indepedent': 'independent',
  'inteligent': 'intelligent', 'inteligance': 'intelligence',
  'jewlery': 'jewelry', 'jewellry': 'jewelry',
  'knowldge': 'knowledge', 'knowldege': 'knowledge',
  'liason': 'liaison', 'liasion': 'liaison',
  'libary': 'library', 'libray': 'library',
  'lisence': 'license', 'licence': 'license', 'liscense': 'license',
  'maintenace': 'maintenance', 'maintainance': 'maintenance',
  'manuever': 'maneuver', 'manuver': 'maneuver',
  'millenium': 'millennium', 'milennium': 'millennium',
  'miniture': 'miniature', 'minature': 'miniature',
  'mispell': 'misspell', 'mispelled': 'misspelled',
  'noticable': 'noticeable', 'noticible': 'noticeable',
  'ocassion': 'occasion', 'occaison': 'occasion',
  'oppurtunity': 'opportunity', 'oportunity': 'opportunity', 'oppertunity': 'opportunity',
  'parliment': 'parliament',
  'passtime': 'pastime', 'pasttime': 'pastime',
  'percieve': 'perceive', 'preceive': 'perceive',
  'persistant': 'persistent', 'persistance': 'persistence',
  'personel': 'personnel', 'personell': 'personnel',
  'posession': 'possession', 'possesion': 'possession',
  'potatos': 'potatoes', 'potatoe': 'potato',
  'preceed': 'precede', 'preceede': 'precede',
  'priviledge': 'privilege', 'privilage': 'privilege', 'privelege': 'privilege',
  'pronounciation': 'pronunciation',
  'publically': 'publicly', 'publicaly': 'publicly',
  'questionaire': 'questionnaire', 'questionnare': 'questionnaire',
  'recomend': 'recommend', 'reccomend': 'recommend', 'recommed': 'recommend',
  'refered': 'referred', 'refering': 'referring',
  'relevent': 'relevant', 'relavent': 'relevant',
  'religous': 'religious', 'religius': 'religious',
  'rember': 'remember', 'remeber': 'remember', 'remembr': 'remember',
  'repitition': 'repetition', 'repetetion': 'repetition',
  'resistence': 'resistance', 'resistense': 'resistance',
  'rythm': 'rhythm', 'rhythym': 'rhythm', 'rythym': 'rhythm',
  'sacrafice': 'sacrifice', 'sacrifise': 'sacrifice',
  'safty': 'safety', 'saftey': 'safety',
  'scedule': 'schedule', 'schedual': 'schedule', 'shedule': 'schedule',
  'sentance': 'sentence', 'sentense': 'sentence',
  'similer': 'similar', 'similiar': 'similar', 'smilar': 'similar',
  'sinceerly': 'sincerely', 'sincerly': 'sincerely',
  'speach': 'speech', 'speeck': 'speech',
  'strenght': 'strength', 'stregth': 'strength', 'strenth': 'strength',
  'succesful': 'successful', 'successfull': 'successful', 'sucessful': 'successful',
  'suprise': 'surprise', 'surprize': 'surprise', 'suprize': 'surprise',
  'temperture': 'temperature', 'temprature': 'temperature', 'tempature': 'temperature',
  'tendancy': 'tendency',
  'threshhold': 'threshold', 'thresold': 'threshold',
  'tomatos': 'tomatoes', 'tomatoe': 'tomato',
  'truely': 'truly', 'trully': 'truly',
  'tyrany': 'tyranny', 'tyrrany': 'tyranny',
  'underate': 'underrate', 'underait': 'underrate',
  'vaccum': 'vacuum', 'vacume': 'vacuum', 'vaccuum': 'vacuum',
  'vegatarian': 'vegetarian', 'vegitarian': 'vegetarian',
  'vehical': 'vehicle', 'vehicel': 'vehicle',
  'visable': 'visible', 'visibile': 'visible',
  'whitch': 'which', 'wich': 'which',
  'writting': 'writing', 'writeing': 'writing',
  'dont': "don't", 'doesnt': "doesn't", 'didnt': "didn't",
  'cant': "can't", 'couldnt': "couldn't", 'wouldnt': "wouldn't", 'shouldnt': "shouldn't",
  'wont': "won't", 'wasnt': "wasn't", 'werent': "weren't",
  'isnt': "isn't", 'arent': "aren't", 'hasnt': "hasn't", 'havent': "haven't",
  'im': "I'm", 'ive': "I've", 'ill': "I'll", 'id': "I'd",
  'youre': "you're", 'youve': "you've", 'youll': "you'll", 'youd': "you'd",
  'theyre': "they're", 'theyve': "they've", 'theyll': "they'll", 'theyd': "they'd",
  'were': "we're", 'weve': "we've", 'well': "we'll", 'wed': "we'd",
  'hes': "he's", 'shes': "she's", 'its': "it's", 'thats': "that's", 'whats': "what's",
  'lets': "let's", 'whos': "who's", 'heres': "here's", 'theres': "there's",
  'plz': 'please', 'pls': 'please', 'pleas': 'please',
  'thx': 'thanks', 'thnx': 'thanks', 'thanx': 'thanks', 'thnks': 'thanks',
  'u': 'you', 'ur': 'your',
  'r': 'are', 'b': 'be',
  'msg': 'message', 'msgs': 'messages',
  'info': 'information', 'ppl': 'people',
  'coz': 'because', 'bcoz': 'because', 'bcz': 'because',
  'tmrw': 'tomorrow', 'tmr': 'tomorrow',
  'yr': 'year', 'yrs': 'years',
  'hr': 'hour', 'hrs': 'hours',
  'min': 'minute', 'mins': 'minutes',
  'yog': 'yoga', 'yogaa': 'yoga',
  'pranayam': 'pranayama', 'pranayaam': 'pranayama',
  'aasana': 'asana',
  'namste': 'namaste',
};

function fixDoubleLetters(word: string): string {
  return word.replace(/([a-z])\1+$/i, '$1');
}

function autoCorrectTextSync(text: string): { corrected: string; corrections: Array<{ from: string; to: string }> } {
  const corrections: Array<{ from: string; to: string }> = [];
  let corrected = text;

  if (/^i\s/i.test(corrected)) {
    corrected = 'I ' + corrected.slice(2);
    corrections.push({ from: 'i', to: 'I' });
  }
  corrected = corrected.replace(/([.!?]\s+)i\s/gi, (match, p1) => {
    corrections.push({ from: 'i', to: 'I' });
    return p1 + 'I ';
  });

  const words = corrected.split(/(\s+)/);
  corrected = words.map(word => {
    if (/^\s+$/.test(word)) return word;
    const punctMatch = word.match(/^([.,!?;:'"]*)(.*?)([.,!?;:'"']*)$/);
    if (!punctMatch) return word;
    const [, leadPunct, cleanWord, trailPunct] = punctMatch;
    const lowerWord = cleanWord.toLowerCase();

    if (COMMON_MISSPELLINGS[lowerWord]) {
      const correctedWord = COMMON_MISSPELLINGS[lowerWord];
      corrections.push({ from: cleanWord, to: correctedWord });
      const finalWord = cleanWord[0] === cleanWord[0].toUpperCase()
        ? correctedWord.charAt(0).toUpperCase() + correctedWord.slice(1)
        : correctedWord;
      return leadPunct + finalWord + trailPunct;
    }

    const fixedDouble = fixDoubleLetters(cleanWord);
    if (fixedDouble !== cleanWord) {
      corrections.push({ from: cleanWord, to: fixedDouble });
      return leadPunct + fixedDouble + trailPunct;
    }

    return word;
  }).join('');

  return { corrected, corrections };
}

const COMMON_WORDS = new Set([
  'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'i',
  'it', 'for', 'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at',
  'this', 'but', 'his', 'by', 'from', 'they', 'we', 'say', 'her', 'she',
  'or', 'an', 'will', 'my', 'one', 'all', 'would', 'there', 'their', 'what',
  'so', 'up', 'out', 'if', 'about', 'who', 'get', 'which', 'go', 'me',
  'when', 'make', 'can', 'like', 'time', 'no', 'just', 'him', 'know', 'take',
  'people', 'into', 'year', 'your', 'good', 'some', 'could', 'them', 'see', 'other',
  'than', 'then', 'now', 'look', 'only', 'come', 'its', 'over', 'think', 'also',
  'back', 'after', 'use', 'two', 'how', 'our', 'work', 'first', 'well', 'way',
  'even', 'new', 'want', 'because', 'any', 'these', 'give', 'day', 'most', 'us',
  'send', 'sending', 'sent', 'receive', 'received', 'receiving', 'message', 'messages',
  'today', 'tomorrow', 'yesterday', 'please', 'thanks', 'thank', 'hello', 'hi', 'bye',
  'sorry', 'okay', 'yes', 'no', 'maybe', 'sure', 'right', 'wrong', 'good', 'bad',
  'great', 'nice', 'fine', 'help', 'need', 'want', 'call', 'calling', 'called',
  'come', 'coming', 'going', 'done', 'doing', 'being', 'having', 'getting',
  'amount', 'payment', 'money', 'price', 'cost', 'paid', 'pay', 'paying',
]);

function pickBestSuggestion(original: string, suggestions: string[]): string {
  if (!suggestions.length) return original;
  if (suggestions.length === 1) return suggestions[0];

  const lowerOriginal = original.toLowerCase();
  const scored = suggestions.map(sug => {
    let score = 0;
    const lowerSug = sug.toLowerCase();
    if (COMMON_WORDS.has(lowerSug)) score += 10;
    if (lowerSug[0] === lowerOriginal[0]) score += 5;
    if (sug.length === original.length) score += 2;
    score += Math.max(0, 3 - Math.abs(sug.length - original.length));
    if (lowerSug.slice(-2) === lowerOriginal.slice(-2)) score += 3;
    if (lowerSug.slice(-3) === lowerOriginal.slice(-3)) score += 2;
    return { suggestion: sug, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored[0].suggestion;
}

export async function autoCorrectTextFull(text: string): Promise<{ corrected: string; corrections: Array<{ from: string; to: string }> }> {
  const corrections: Array<{ from: string; to: string }> = [];
  let corrected = text;

  const syncResult = autoCorrectTextSync(text);
  corrected = syncResult.corrected;
  corrections.push(...syncResult.corrections);

  const checker = await getSpellChecker();
  if (!checker) {
    return { corrected, corrections };
  }

  const words = corrected.split(/(\s+)/);
  corrected = words.map(word => {
    if (/^\s+$/.test(word)) return word;
    const punctMatch = word.match(/^([.,!?;:'"]*)(.*?)([.,!?;:'"']*)$/);
    if (!punctMatch) return word;
    const [, leadPunct, cleanWord, trailPunct] = punctMatch;

    if (cleanWord.length < 2 || /^\d+$/.test(cleanWord)) return word;
    if (corrections.some(c => c.from === cleanWord)) return word;

    if (!checker.correct(cleanWord)) {
      const suggestions = checker.suggest(cleanWord);
      if (suggestions && suggestions.length > 0) {
        const suggestion = pickBestSuggestion(cleanWord, suggestions);
        corrections.push({ from: cleanWord, to: suggestion });
        const finalWord = cleanWord[0] === cleanWord[0].toUpperCase()
          ? suggestion.charAt(0).toUpperCase() + suggestion.slice(1)
          : suggestion;
        return leadPunct + finalWord + trailPunct;
      }
    }

    return word;
  }).join('');

  return { corrected, corrections };
}

export function fixSentences(text: string): string {
  let fixed = text;
  fixed = fixed.replace(/^([a-z])/g, (match) => match.toUpperCase());
  fixed = fixed.replace(/([.!?]\s+)([a-z])/g, (match, p1, p2) => p1 + p2.toUpperCase());
  fixed = fixed.replace(/\s{2,}/g, ' ');
  fixed = fixed.replace(/\s+([.!?,;:])/g, '$1');
  fixed = fixed.replace(/([.!?,;:])([A-Za-z])/g, '$1 $2');
  fixed = fixed.replace(/\bi\b/g, 'I');
  fixed = fixed.replace(/\s+$/g, '');
  return fixed;
}
