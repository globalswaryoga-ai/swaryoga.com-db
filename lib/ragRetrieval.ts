/**
 * Lightweight retrieval for the e-learning assistant (video transcripts +
 * e-book/material text, any language).
 *
 * No embeddings/vector store: content is chunked and scored by query-term
 * overlap, which works for Latin and Devanagari scripts alike (both are
 * whitespace-tokenized). Small corpora skip retrieval entirely and are passed
 * through whole — retrieval only kicks in when the combined sources would
 * blow up the prompt.
 */

export interface RagSource {
  /** Label shown to the model, e.g. "Video transcript" or "E-book: Pranayama Guide" */
  label: string;
  text: string;
}

export interface RagChunk {
  label: string;
  text: string;
  score: number;
}

const CHUNK_SIZE = 1400;
const CHUNK_OVERLAP = 200;

/** Split on sentence/paragraph boundaries near the target size. */
export function chunkText(text: string, size = CHUNK_SIZE, overlap = CHUNK_OVERLAP): string[] {
  const clean = String(text || '').replace(/\r\n/g, '\n').trim();
  if (!clean) return [];
  if (clean.length <= size) return [clean];

  const chunks: string[] = [];
  let start = 0;
  while (start < clean.length) {
    let end = Math.min(start + size, clean.length);
    if (end < clean.length) {
      // Prefer to break at a paragraph, then sentence (incl. Devanagari danda), then space.
      const window = clean.slice(start, end);
      const breakAt = Math.max(
        window.lastIndexOf('\n\n'),
        window.lastIndexOf('। '),
        window.lastIndexOf('. '),
        window.lastIndexOf('\n')
      );
      if (breakAt > size * 0.5) end = start + breakAt + 1;
    }
    chunks.push(clean.slice(start, end).trim());
    if (end >= clean.length) break;
    start = Math.max(end - overlap, start + 1);
  }
  return chunks.filter(Boolean);
}

/** Tokenize a query into search terms (works for Latin + Devanagari). */
function queryTerms(query: string): string[] {
  return String(query || '')
    .toLowerCase()
    .split(/[\s,.;:!?()"'।॥\-]+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2);
}

function scoreChunk(terms: string[], chunk: string): number {
  if (!terms.length) return 0;
  const lower = chunk.toLowerCase();
  let hits = 0;
  for (const term of terms) {
    if (lower.includes(term)) hits++;
  }
  return hits / terms.length;
}

/**
 * Build the context block for the assistant prompt.
 *
 * If everything fits in `maxChars`, all sources are included whole (best
 * quality). Otherwise chunks are scored against the question and the best
 * ones are packed in, always keeping at least one chunk per source that has
 * any match so the model can cite both video and e-book content.
 */
export function buildRagContext(
  question: string,
  sources: RagSource[],
  maxChars = 9000
): { context: string; retrieved: boolean } {
  const nonEmpty = sources.filter((s) => String(s.text || '').trim());
  if (!nonEmpty.length) return { context: '', retrieved: false };

  const totalLength = nonEmpty.reduce((sum, s) => sum + s.text.length, 0);
  if (totalLength <= maxChars) {
    const context = nonEmpty.map((s) => `--- ${s.label} ---\n${s.text.trim()}`).join('\n\n');
    return { context, retrieved: false };
  }

  const terms = queryTerms(question);
  const allChunks: RagChunk[] = [];
  for (const source of nonEmpty) {
    for (const chunk of chunkText(source.text)) {
      allChunks.push({ label: source.label, text: chunk, score: scoreChunk(terms, chunk) });
    }
  }

  allChunks.sort((a, b) => b.score - a.score);

  const picked: RagChunk[] = [];
  let used = 0;
  const sourcesRepresented = new Set<string>();

  for (const chunk of allChunks) {
    if (used + chunk.text.length > maxChars) continue;
    if (chunk.score <= 0 && sourcesRepresented.has(chunk.label)) continue;
    picked.push(chunk);
    used += chunk.text.length;
    sourcesRepresented.add(chunk.label);
    if (used >= maxChars * 0.95) break;
  }

  // Nothing matched at all — fall back to the first chunk of each source so
  // the model still has grounding instead of an empty context.
  if (!picked.length) {
    for (const source of nonEmpty) {
      const first = chunkText(source.text)[0];
      if (first && used + first.length <= maxChars) {
        picked.push({ label: source.label, text: first, score: 0 });
        used += first.length;
      }
    }
  }

  // Group picked chunks under their source labels, preserving score order.
  const byLabel = new Map<string, string[]>();
  for (const chunk of picked) {
    if (!byLabel.has(chunk.label)) byLabel.set(chunk.label, []);
    byLabel.get(chunk.label)!.push(chunk.text);
  }

  const context = Array.from(byLabel.entries())
    .map(([label, texts]) => `--- ${label} (relevant excerpts) ---\n${texts.join('\n[…]\n')}`)
    .join('\n\n');

  return { context, retrieved: true };
}

const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English',
  hi: 'Hindi',
  ne: 'Nepali',
  mr: 'Marathi',
  gu: 'Gujarati',
  bn: 'Bengali',
  ta: 'Tamil',
  te: 'Telugu',
  kn: 'Kannada',
  ml: 'Malayalam',
  pa: 'Punjabi',
  ur: 'Urdu',
  es: 'Spanish',
  fr: 'French',
  de: 'German',
};

export function languageName(code: string): string {
  return LANGUAGE_NAMES[String(code || '').toLowerCase()] || '';
}

/** Pick the best language variant: requested lang → English → base field. */
export function pickLangVariant(
  i18n: Record<string, string> | undefined | null,
  base: string | undefined | null,
  lang: string
): string {
  const map = i18n || {};
  return String(map[lang] || (lang !== 'en' && map.en) || base || '').trim();
}
