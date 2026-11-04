import { NextRequest, NextResponse } from 'next/server';
import { generateAIText } from '@/lib/ai/generateWithFallback';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { text, language = 'hi', mode = 'strict_exact', syntaxStructure = 'SOV' } = await request.json();

    if (!text || typeof text !== 'string' || !text.trim()) {
      return NextResponse.json({ error: 'Text is required for grammar check' }, { status: 400 });
    }

    const trimmedInput = text.trim();
    const inputLines = trimmedInput.split('\n').filter(l => l.trim().length > 0);
    const inputLineCount = inputLines.length;

    let syntaxInstruction = '';
    if (syntaxStructure === 'SOV') {
      syntaxInstruction = `
SYNTAX STRUCTURE: SOV (Subject - Object - Verb)
- Standard for Indian languages (Hindi, Marathi, Kannada, Sanskrit, etc.).
- Word order is strictly Subject -> Object -> Verb.
- CRITICAL: Modify ONLY the Verb (क्रियापद) at the clause end to agree with Subject/Object gender, number, and tense.
- DO NOT rearrange words into English SVO order.
- NEVER replace, delete, or alter any noun (नाम) or object (कर्म). Example: "मी मोहन ला आंबा दिली" -> "मी मोहन ला आंबा दिला" (only दिली -> दिला).`;
    } else {
      syntaxInstruction = `
SYNTAX STRUCTURE: SVO (Subject - Verb - Object)
- Standard for English and global languages (English, Spanish, French, German, etc.).
- Word order is Subject -> Verb -> Object.
- Verify subject-verb agreement (singular/plural, tense) and prepositional accuracy.
- NEVER alter technical terms or nouns.`;
    }

    let modeInstruction = '';
    if (mode === 'strict_exact') {
      modeInstruction = `MODE: STRICT EXACT (1:1 LINE-FOR-LINE MATCH)
- CRITICAL LENGTH RULE: The input has ${inputLineCount} line(s). The correctedText MUST have EXACTLY ${inputLineCount} line(s) and almost identical length!
- If the user provides 1 sentence, output EXACTLY 1 sentence. NEVER expand or hallucinate extra thoughts, explanations, or sentences.
- Only fix spelling, grammatical agreement, typos, and punctuation. Do NOT rewrite or lengthen sentences.`;
    } else if (mode === 'expand_detail') {
      modeInstruction = `MODE: EXPAND DETAIL (EXPLANATORY EXTENSION)
- Elaborate the core teachings into 2 to 4 rich, flowing, oratorical lines per concept.
- Clarify subtle principles, providing practical context for spiritual sadhaks while maintaining Mohan Sir's authentic speaking tone.`;
    } else if (mode === 'ebook_chapter') {
      modeInstruction = `MODE: E-BOOK CHAPTER TRANSFORMATION
- Structure the content as a comprehensive, beautifully written E-Book chapter or section.
- Include introduction, core wisdom explanation, experiential sadhana practice, and concluding takeaway.`;
    }

    const systemPrompt = `You are an expert Vedic & Ayurvedic proofreader and Swar Yoga linguist.
You will receive a spoken script or text in language code: "${language}".

${syntaxInstruction}

${modeInstruction}

CRITICAL RULES:
1. PRESERVE EMOTION & GESTURE TAGS:
- The text may contain bracketed emotion/gesture symbols like [smile], [gentle_smile], [laugh], [namaste], [pointing_finger], [pause:1.5s], [calm], [serious], [teaching], etc.
- You MUST PRESERVE ALL bracketed tags [tag] EXACTLY as they are and keep them at the corresponding places in the sentence! Do NOT remove, rename, or translate any tag inside brackets [].

2. SACRED VEDIC TERMINOLOGY & VERBATIM WORDS:
- STRICT RULE: NEVER change, translate, or corrupt sacred Swar Yoga terms, Vedic concepts, or spoken words.
- In Marathi/Hindi, words like "डावी नाकपुडी व उजवी नाकपुडी" must stay word-for-word. NEVER replace "नाकपुडी" with "छिद्र".
- GRAMMAR CORRECTIONS CAN ONLY CHANGE VERBS (क्रियापद / Kriyapad). NEVER change Objects (कर्म / nouns like "आंबा" or "नाकपुडी"). Example: "मी मोहन ला आंबा दिली" -> change only verb to "मी मोहन ला आंबा दिला".

3. OUTPUT FORMAT:
Respond ONLY in valid JSON format:
{
  "originalText": "...",
  "correctedText": "...",
  "improvedText": "...",
  "mode": "${mode}",
  "corrections": [
    { "original": "...", "corrected": "...", "reason": "..." }
  ]
}`;

    const aiRes = await generateAIText({
      systemPrompt,
      message: trimmedInput,
    });

    let cleanJson = aiRes.trim();
    if (cleanJson.startsWith('```json')) cleanJson = cleanJson.replace(/^```json/, '');
    if (cleanJson.startsWith('```')) cleanJson = cleanJson.replace(/^```/, '');
    if (cleanJson.endsWith('```')) cleanJson = cleanJson.replace(/```$/, '');

    try {
      const parsed = JSON.parse(cleanJson.trim());
      return NextResponse.json({
        success: true,
        data: {
          originalText: text,
          correctedText: parsed.correctedText || text,
          improvedText: parsed.improvedText || text,
          mode,
          corrections: Array.isArray(parsed.corrections) ? parsed.corrections : [],
        },
      });
    } catch {
      return NextResponse.json({
        success: true,
        data: {
          originalText: text,
          correctedText: text,
          improvedText: text,
          mode,
          corrections: [],
        },
      });
    }
  } catch (error: any) {
    console.error('Grammar check error:', error);
    return NextResponse.json({ error: error.message || 'Grammar check failed' }, { status: 500 });
  }
}
