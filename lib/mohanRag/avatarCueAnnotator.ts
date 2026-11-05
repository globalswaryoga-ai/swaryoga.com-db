import { generateAIText } from '@/lib/ai/generateWithFallback';
import { EMOTION_LIBRARY, FACIAL_EXPRESSION_LIBRARY } from '@/lib/avatarEmotionParser';

const MAX_ANNOTATION_CHARS = 12_000;

function splitIntoChunks(text: string) {
  const sentences = text.match(/[^.!?।॥\n]+(?:[.!?।॥]+|(?=\n)|$)/g) || [text];
  const chunks: string[] = [];
  let current = '';
  for (const sentence of sentences) {
    if (current.length + sentence.length > MAX_ANNOTATION_CHARS && current.trim()) {
      chunks.push(current);
      current = '';
    }
    current += sentence;
  }
  if (current.trim()) chunks.push(current);
  return chunks;
}

function normalizeSpeech(text: string) {
  return text
    .replace(/\[face:[a-z_]+\]/gi, '')
    .replace(/\[([a-z_]+):\d{1,3}\]/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Adds avatar delivery hints without rewriting the source transcript. */
export async function annotateTranscriptForAvatar(transcript: string): Promise<string> {
  const emotionTags = Object.keys(EMOTION_LIBRARY).join(', ');
  const faceTags = Object.keys(FACIAL_EXPRESSION_LIBRARY).join(', ');
  const annotatedChunks: string[] = [];

  for (const chunk of splitIntoChunks(transcript)) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 45_000);
    let annotated: string;
    try {
      annotated = await generateAIText({
        systemPrompt: `You add optional avatar delivery metadata to a source transcript. Do not summarize, correct, translate, reorder, or rewrite any spoken words. Preserve every original word and punctuation exactly. Add tags only; use at most one emotion tag and one face tag before a sentence, and leave neutral sentences untagged. Emotion tag format: [supported_emotion:0-100]. Allowed emotion names: ${emotionTags}. Face suggestion tag format: [face:supported_expression]. Allowed face expressions: ${faceTags}. Choose only cues supported by the wording and keep intensities restrained. Face tags are avatar performance suggestions inferred from the transcript, not claims that a recorded face was visually observed. Return only the annotated transcript, without markdown or explanation.`,
        message: `Add optional delivery cues to this exact transcript. Its spoken language must remain unchanged.\n\n${chunk}`,
        maxOutputTokens: 8192,
        temperature: 0.1,
        providerOrder: ['Gemini', 'Anthropic', 'OpenAI'],
        signal: controller.signal,
      });
    } catch (error) {
      if (controller.signal.aborted) throw new Error('Emotion cue generation timed out after 45 seconds; the plain transcript is still available.');
      throw error;
    } finally {
      clearTimeout(timeout);
    }
    const clean = annotated.replace(/^```(?:text)?\s*|\s*```$/g, '').trim();
    if (normalizeSpeech(clean) !== normalizeSpeech(chunk)) {
      throw new Error('Could not add avatar cues without changing the transcript. The untagged transcript was preserved.');
    }
    annotatedChunks.push(clean);
  }

  return annotatedChunks.join('\n');
}
