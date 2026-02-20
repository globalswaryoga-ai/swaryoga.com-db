import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import nspell from 'nspell';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';

// Load English dictionary (50,000+ base words, expands to 150k+ with affixes)
let spellChecker: ReturnType<typeof nspell> | null = null;
let dictionaryLoadPromise: Promise<ReturnType<typeof nspell> | null> | null = null;

async function getSpellChecker(): Promise<ReturnType<typeof nspell> | null> {
  // Return cached checker
  if (spellChecker) return spellChecker;
  
  // Return ongoing promise if loading
  if (dictionaryLoadPromise) return dictionaryLoadPromise;
  
  dictionaryLoadPromise = (async () => {
    try {
      // Load dictionary files directly from node_modules
      const dictPath = dirname(require.resolve('dictionary-en'));
      const aff = readFileSync(join(dictPath, 'index.aff'));
      const dic = readFileSync(join(dictPath, 'index.dic'));
      
      spellChecker = nspell(aff, dic);
      
      // Add custom words (yoga terms, Hindi words, abbreviations, tech)
      const customWords = [
        // Yoga/Wellness
        'yoga', 'pranayama', 'asana', 'namaste', 'namaskar', 'swar', 'swara',
        'chakra', 'mudra', 'mantra', 'vedic', 'ayurveda', 'ayurvedic',
        // Hindi/Hinglish
        'achha', 'theek', 'kya', 'hai', 'hain', 'nahi', 'ji', 'aap', 'kaise',
        // Tech/Messaging
        'whatsapp', 'sms', 'msg', 'msgs', 'ok', 'okay',
        'zoom', 'online', 'offline', 'pdf', 'url', 'www',
        'crm', 'api', 'ui', 'ux', 'js', 'ts', 'css', 'html',
        'gmail', 'email', 'wifi',
      ];
      customWords.forEach(word => spellChecker?.add(word));
      
      console.log('Spell checker loaded with', dic.toString().split('\n').length, 'base words');
      return spellChecker;
    } catch (err) {
      console.error('Failed to load spell checker:', err);
      return null;
    }
  })();
  
  return dictionaryLoadPromise;
}

// Common misspellings dictionary (for typing errors the dictionary won't catch)
const COMMON_MISSPELLINGS: Record<string, string> = {
  // Common typos
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
  // Send variations
  'senting': 'sending', 'sendng': 'sending', 'sendin': 'sending', 'sening': 'sending',
  'sended': 'sent', 'sendt': 'sent',
  // Receive variations
  'recieve': 'receive', 'recive': 'receive', 'receiv': 'receive',
  'recvered': 'received', 'recived': 'received', 'recieved': 'received', 
  'receved': 'received', 'recevied': 'received', 'recevd': 'received',
  'receivd': 'received', 'recved': 'received',
  // Message variations  
  'mesage': 'message', 'messge': 'message', 'mesg': 'message',
  'messagess': 'messages', 'mesages': 'messages', 'messges': 'messages',
  'messgae': 'message', 'massege': 'message', 'massage': 'message',
  // Today/Tomorrow variations
  'todays': 'today', 'tday': 'today', 'todey': 'today', 'todya': 'today',
  'tommorow': 'tomorrow', 'tommorrow': 'tomorrow', 'tomorow': 'tomorrow',
  'tomorro': 'tomorrow', 'tomowrrow': 'tomorrow', 'tomorr': 'tomorrow',
  // Other common words
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
  // More common typos
  'comming': 'coming', 'comeing': 'coming', 'comng': 'coming',
  'somthing': 'something', 'somethng': 'something', 'smthing': 'something',
  'everthing': 'everything', 'everythng': 'everything',
  'intrested': 'interested', 'intersted': 'interested', 'intrsted': 'interested',
  'diffrent': 'different', 'diferent': 'different', 'diffrent': 'different',
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
  'begining': 'beginning', 'begining': 'beginning', 'beginnng': 'beginning',
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
  'parliment': 'parliament', 'parliment': 'parliament',
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
  'surreptitious': 'surreptitious',
  'temperture': 'temperature', 'temprature': 'temperature', 'tempature': 'temperature',
  'tendancy': 'tendency', 'tendancy': 'tendency',
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
  // Contractions
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
  // Common words
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
  // Yoga specific
  'yog': 'yoga', 'yogaa': 'yoga',
  'pranayam': 'pranayama', 'pranayaam': 'pranayama',
  'asana': 'asana', 'aasana': 'asana',
  'namste': 'namaste', 'namaskar': 'namaskar',
  'swar': 'swar', 'swara': 'swara',
  // Hindi/Hinglish common
  'kya': 'kya', 'hai': 'hai', 'hain': 'hain',
  'nhi': 'nahi', 'nahi': 'nahi',
  'acha': 'achha', 'accha': 'achha',
  'theek': 'theek', 'thik': 'theek',
};

// Fix double letters (e.g., messagess -> messages)
function fixDoubleLetters(word: string): string {
  // Fix trailing double letters that should be single
  return word.replace(/([a-z])\1+$/i, '$1');
}

// Auto-correct text (synchronous - uses dictionary only)
function autoCorrectTextSync(text: string): { corrected: string; corrections: Array<{ from: string; to: string }> } {
  const corrections: Array<{ from: string; to: string }> = [];
  let corrected = text;
  
  // Fix "i " at start or after punctuation to "I "
  if (/^i\s/i.test(corrected)) {
    corrected = 'I ' + corrected.slice(2);
    corrections.push({ from: 'i', to: 'I' });
  }
  corrected = corrected.replace(/([.!?]\s+)i\s/gi, (match, p1) => {
    corrections.push({ from: 'i', to: 'I' });
    return p1 + 'I ';
  });
  
  // Apply misspelling corrections (word by word for better matching)
  const words = corrected.split(/(\s+)/);
  corrected = words.map(word => {
    // Skip whitespace
    if (/^\s+$/.test(word)) return word;
    
    // Remove punctuation for lookup
    const punctMatch = word.match(/^([.,!?;:'"]*)(.*?)([.,!?;:'"']*)$/);
    if (!punctMatch) return word;
    const [, leadPunct, cleanWord, trailPunct] = punctMatch;
    
    const lowerWord = cleanWord.toLowerCase();
    
    // Check dictionary first
    if (COMMON_MISSPELLINGS[lowerWord]) {
      const correctedWord = COMMON_MISSPELLINGS[lowerWord];
      corrections.push({ from: cleanWord, to: correctedWord });
      // Preserve original case for first letter
      const finalWord = cleanWord[0] === cleanWord[0].toUpperCase() 
        ? correctedWord.charAt(0).toUpperCase() + correctedWord.slice(1)
        : correctedWord;
      return leadPunct + finalWord + trailPunct;
    }
    
    // Fix double trailing letters (e.g., messagess -> messages)
    const fixedDouble = fixDoubleLetters(cleanWord);
    if (fixedDouble !== cleanWord) {
      corrections.push({ from: cleanWord, to: fixedDouble });
      return leadPunct + fixedDouble + trailPunct;
    }
    
    return word;
  }).join('');
  
  return { corrected, corrections };
}

// Common words list for better suggestion picking
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

// Pick best suggestion based on similarity and common usage
function pickBestSuggestion(original: string, suggestions: string[]): string {
  if (!suggestions.length) return original;
  if (suggestions.length === 1) return suggestions[0];
  
  const lowerOriginal = original.toLowerCase();
  
  // Score each suggestion
  const scored = suggestions.map(sug => {
    let score = 0;
    const lowerSug = sug.toLowerCase();
    
    // Prefer common words (+10)
    if (COMMON_WORDS.has(lowerSug)) score += 10;
    
    // Prefer same first letter (+5)
    if (lowerSug[0] === lowerOriginal[0]) score += 5;
    
    // Prefer same length (+2)
    if (sug.length === original.length) score += 2;
    
    // Prefer similar length (+1 for each matching char in length)
    score += Math.max(0, 3 - Math.abs(sug.length - original.length));
    
    // Prefer same ending (+3)
    if (lowerSug.slice(-2) === lowerOriginal.slice(-2)) score += 3;
    if (lowerSug.slice(-3) === lowerOriginal.slice(-3)) score += 2;
    
    return { suggestion: sug, score };
  });
  
  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);
  
  return scored[0].suggestion;
}

// Auto-correct text with full dictionary (async - uses nspell with 150k+ words)
async function autoCorrectTextFull(text: string): Promise<{ corrected: string; corrections: Array<{ from: string; to: string }> }> {
  const corrections: Array<{ from: string; to: string }> = [];
  let corrected = text;
  
  // First apply sync corrections (common typos)
  const syncResult = autoCorrectTextSync(text);
  corrected = syncResult.corrected;
  corrections.push(...syncResult.corrections);
  
  // Get spell checker
  const checker = await getSpellChecker();
  if (!checker) {
    return { corrected, corrections };
  }
  
  // Apply full dictionary spell checking
  const words = corrected.split(/(\s+)/);
  corrected = words.map(word => {
    // Skip whitespace
    if (/^\s+$/.test(word)) return word;
    
    // Remove punctuation for lookup
    const punctMatch = word.match(/^([.,!?;:'"]*)(.*?)([.,!?;:'"']*)$/);
    if (!punctMatch) return word;
    const [, leadPunct, cleanWord, trailPunct] = punctMatch;
    
    // Skip very short words, numbers, and already corrected
    if (cleanWord.length < 2 || /^\d+$/.test(cleanWord)) return word;
    if (corrections.some(c => c.from === cleanWord)) return word;
    
    // Check if word is correct
    if (!checker.correct(cleanWord)) {
      // Get suggestions and pick the best one
      const suggestions = checker.suggest(cleanWord);
      if (suggestions && suggestions.length > 0) {
        const suggestion = pickBestSuggestion(cleanWord, suggestions);
        corrections.push({ from: cleanWord, to: suggestion });
        
        // Preserve original case
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

// Fix grammar and sentence structure
function fixSentences(text: string): string {
  let fixed = text;
  
  // Capitalize first letter of sentence
  fixed = fixed.replace(/^([a-z])/g, (match) => match.toUpperCase());
  fixed = fixed.replace(/([.!?]\s+)([a-z])/g, (match, p1, p2) => p1 + p2.toUpperCase());
  
  // Fix double spaces
  fixed = fixed.replace(/\s{2,}/g, ' ');
  
  // Fix punctuation spacing
  fixed = fixed.replace(/\s+([.!?,;:])/g, '$1'); // Remove space before punctuation
  fixed = fixed.replace(/([.!?,;:])([A-Za-z])/g, '$1 $2'); // Add space after punctuation
  
  // Fix capitalizations
  fixed = fixed.replace(/\bi\b/g, 'I'); // "i" to "I"
  
  // Fix common sentence issues
  fixed = fixed.replace(/\s+$/g, ''); // Trim trailing spaces
  
  return fixed;
}

/**
 * AI Assistant endpoint.
 * Features:
 * 1. Auto-correct (while typing)
 * 2. Full Grammar/Spelling Fix
 * 3. Smart Reply Generation
 */
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : authHeader;
    const decoded = verifyToken(token || undefined);
    
    if (!decoded) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { text, mode, context } = await req.json();

    // Mode: 'autocorrect' (Real-time while typing - uses sync for speed + async for thoroughness)
    if (mode === 'autocorrect') {
      if (!text) {
        return NextResponse.json({ success: true, result: '', corrections: [] });
      }
      
      // Use full dictionary-based correction
      const { corrected, corrections } = await autoCorrectTextFull(text);
      
      return NextResponse.json({ 
        success: true, 
        result: corrected,
        original: text,
        corrections,
        changed: corrected !== text
      });
    }

    // Mode: 'fix' (Full grammar/spelling fix with dictionary)
    if (mode === 'fix') {
      if (!text) {
         return NextResponse.json({ error: 'Text required' }, { status: 400 });
      }

      // Use full dictionary-based correction
      const { corrected } = await autoCorrectTextFull(text);
      
      // Then fix sentences
      let fixed = fixSentences(corrected);
      
      // Add period if missing
      if (fixed.length > 0 && !/[.!?]$/.test(fixed.trim())) {
        fixed = fixed.trim() + '.';
      }

      return NextResponse.json({ 
        success: true, 
        result: fixed,
        original: text
      });
    }

    // Mode: 'reply' (Generate Response)
    if (mode === 'reply') {
      const lastMsg = (context || '').toLowerCase();
      let reply = "Hello! How can I assist you with Yoga today?";

      if (lastMsg.includes('price') || lastMsg.includes('cost') || lastMsg.includes('fee') || lastMsg.includes('charge')) {
        reply = "Our classes start from ₹999/month. Would you like to see the full plan details?";
      } else if (lastMsg.includes('time') || lastMsg.includes('schedule') || lastMsg.includes('batch')) {
        reply = "We have batches at 6 AM, 7 AM, and 6 PM. Which time works best for you?";
      } else if (lastMsg.includes('online') || lastMsg.includes('zoom')) {
        reply = "Yes, we offer online sessions via Zoom. You can join from anywhere!";
      } else if (lastMsg.includes('namaste') || lastMsg.includes('hello') || lastMsg.includes('hi')) {
        reply = "Namaste 🙏 Welcome to Swar Yoga! How can I help you today?";
      } else if (lastMsg.includes('thank')) {
        reply = "You're welcome! Feel free to reach out if you have any more questions. 🙏";
      } else if (lastMsg.includes('address') || lastMsg.includes('location') || lastMsg.includes('where')) {
        reply = "You can find our center details on our website. Would you like me to share the link?";
      }
         
      return NextResponse.json({
        success: true,
        result: reply 
      });
    }

    return NextResponse.json({ error: 'Invalid mode' }, { status: 400 });

  } catch (error: any) {
    console.error('AI Assist error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
