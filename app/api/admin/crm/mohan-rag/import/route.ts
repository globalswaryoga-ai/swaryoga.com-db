import { NextRequest, NextResponse } from 'next/server';
import JSZip from 'jszip';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/crm-handlers';
import { uploadToBunnyStorage } from '@/lib/bunny-storage';
import { transcribeAudio } from '@/lib/aiVideo/transcribeAndCondense';
import { isMohanRagModule, saveKnowledgeSource } from '@/lib/mohanRag/knowledgeRepository';
import { chunkText } from '@/lib/ragRetrieval';
import { annotateTranscriptForAvatar } from '@/lib/mohanRag/avatarCueAnnotator';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300;

const MAX_ORIGINAL_BYTES = 150 * 1024 * 1024;
const MAX_TRANSCRIPTION_BYTES = 24 * 1024 * 1024;
const PDFParser = require('pdf2json');

function isUploadedFile(value: FormDataEntryValue | null): value is File {
  return Boolean(value && typeof value === 'object' && 'arrayBuffer' in value && 'name' in value && 'size' in value);
}

function requireMohanRagAdmin(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') || '';
    const decoded = verifyToken(token);
    return decoded && isSuperAdmin(decoded, request) ? decoded : null;
  } catch { return null; }
}

function decodePdfText(value: unknown): string {
  const encodedText = String(value ?? '');
  try {
    return decodeURIComponent(encodedText);
  } catch {
    // pdf2json may return malformed percent escapes for some embedded fonts.
    // Decode valid byte runs independently so one bad sequence cannot fail the upload.
    return encodedText.replace(/(?:%[0-9a-f]{2})+/gi, (encodedBytes) => {
      const bytes = encodedBytes.match(/%[0-9a-f]{2}/gi) || [];
      return Buffer.from(bytes.map(byte => Number.parseInt(byte.slice(1), 16))).toString('utf8');
    });
  }
}

function extractPdfPageText(page: any): string {
  const items = (page.Texts || []).map((item: any) => ({
    x: Number(item.x),
    y: Number(item.y),
    width: Number(item.w),
    text: (item.R || []).map((run: any) => decodePdfText(run.T)).join(''),
  })).filter((item: any) => item.text);
  if (!items.length) return '';

  // pdf2json emits positioned text blocks. Joining every block with a space
  // inserts spaces between individual Hindi glyphs in many PDFs, so reconstruct
  // lines from coordinates and add a space only where the horizontal gap shows one.
  if (items.some((item: any) => !Number.isFinite(item.x) || !Number.isFinite(item.y) || !Number.isFinite(item.width))) {
    return items.map((item: any) => item.text).join('');
  }

  items.sort((a: any, b: any) => a.y - b.y || a.x - b.x);
  const lines: Array<{ y: number; items: typeof items }> = [];
  for (const item of items) {
    let line = lines[lines.length - 1];
    if (!line || Math.abs(item.y - line.y) > 0.35) {
      line = { y: item.y, items: [] };
      lines.push(line);
    }
    line.items.push(item);
  }

  return lines.map(line => {
    let text = '';
    let previous: (typeof items)[number] | null = null;
    for (const item of line.items) {
      if (previous) {
        const gap = item.x - (previous.x + previous.width);
        const spaceThreshold = Math.max(0.06, Math.min(previous.width, item.width) * 0.25);
        if (gap > spaceThreshold && !/\s$/.test(text)) text += ' ';
      }
      text += item.text;
      previous = item;
    }
    return text.trim();
  }).filter(Boolean).join('\n');
}

function extractPdfText(buffer: Buffer): Promise<string> {
  return new Promise((resolve, reject) => {
    const parser = new PDFParser(null, true);
    parser.on('pdfParser_dataReady', (data: any) => {
      try {
        const text = (data.Pages || []).map(extractPdfPageText).filter(Boolean).join('\n\n');
        resolve(text.trim());
      } catch (error) { reject(error); }
    });
    parser.on('pdfParser_dataError', (error: any) => reject(new Error(String(error?.parserError || error || 'Could not read PDF'))));
    parser.parseBuffer(buffer);
  });
}

async function extractDocxText(buffer: Buffer): Promise<string> {
  const zip = await JSZip.loadAsync(buffer);
  const document = zip.file('word/document.xml');
  if (!document) throw new Error('This Word file does not contain a readable document body. Upload a .docx file.');
  const xml = await document.async('string');
  const text = xml
    .replace(/<w:tab\b[^>]*\/>/g, '\t')
    .replace(/<\/w:p>/g, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'").replace(/&amp;/g, '&');
  return text.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}

export async function POST(request: NextRequest) {
  const admin = requireMohanRagAdmin(request);
  if (!admin) return NextResponse.json({ error: 'Super admin access required' }, { status: 403 });

  try {
    const form = await request.formData();
    const file = form.get('file');
    const audioFile = form.get('audioFile');
    const moduleId = String(form.get('moduleId') || '');
    const title = String(form.get('title') || '').trim();
    const topic = String(form.get('topic') || '').trim();
    const language = String(form.get('language') || 'auto');
    const sourceReference = String(form.get('sourceReference') || '').trim();
    if (!isUploadedFile(file) || !isMohanRagModule(moduleId)) return NextResponse.json({ error: 'Choose a supported file and knowledge library.' }, { status: 400 });
    if (moduleId === 'research' && !sourceReference) return NextResponse.json({ error: 'A source citation or URL is required for research reports.' }, { status: 400 });
    if (!['auto', 'en', 'hi', 'mr'].includes(language)) return NextResponse.json({ error: 'Choose a supported source language.' }, { status: 400 });
    if (file.size <= 0 || file.size > MAX_ORIGINAL_BYTES) return NextResponse.json({ error: 'Source files must be smaller than 150 MB.' }, { status: 413 });

    const fileName = file.name.slice(0, 240);
    const extension = fileName.split('.').pop()?.toLowerCase() || '';
    const original = Buffer.from(await file.arrayBuffer());
    let extractedText = '';
    let extractionType = '';
    let sourceType = '';
    let avatarCuesAdded = false;
    let avatarCueWarning = '';

    if (extension === 'pdf') {
      extractedText = await extractPdfText(original);
      extractionType = 'pdf_text_extraction';
      sourceType = 'pdf';
    } else if (extension === 'docx') {
      extractedText = await extractDocxText(original);
      extractionType = 'word_text_extraction';
      sourceType = 'docx';
    } else if (extension === 'mp3' || extension === 'mp4') {
      const transcription = isUploadedFile(audioFile) ? audioFile : file;
      if (transcription.size > MAX_TRANSCRIPTION_BYTES) return NextResponse.json({ error: 'Transcription audio must be 24 MB or smaller. Use the browser audio converter and try again.' }, { status: 413 });
      extractedText = await transcribeAudio({ buffer: Buffer.from(await transcription.arrayBuffer()), mimeType: transcription.type || (extension === 'mp4' ? 'audio/mp4' : 'audio/mpeg') });
      extractionType = 'whisper_transcription';
      sourceType = extension;
      try {
        const rawTranscript = extractedText;
        const annotatedTranscript = await annotateTranscriptForAvatar(rawTranscript);
        if (annotatedTranscript.length <= 180_000 && chunkText(annotatedTranscript, 1800, 220).length <= 100) {
          extractedText = annotatedTranscript;
          extractionType = 'whisper_transcription_with_avatar_cues';
          avatarCuesAdded = true;
        } else {
          avatarCueWarning = 'Transcript kept without avatar cues because the added metadata exceeds this source size limit.';
        }
      } catch (error) {
        avatarCueWarning = error instanceof Error ? error.message : 'Avatar cues could not be added; the original transcript was kept.';
      }
    } else {
      return NextResponse.json({ error: 'Supported imports: PDF, Word .docx, MP3, and MP4. Legacy .doc files are not supported yet; save them as .docx first.' }, { status: 415 });
    }

    if (!extractedText.trim()) return NextResponse.json({ error: 'No text was extracted. The PDF may be scanned, or the audio may contain no clear speech. Add OCR or a reviewed transcript and import it as text.' }, { status: 422 });
    if (!title) return NextResponse.json({ error: 'Add a source title before importing.' }, { status: 400 });
    if (extractedText.length > 180_000) return NextResponse.json({ error: 'Extracted text exceeds the current source editor limit (180,000 characters). Split it into smaller sources.' }, { status: 413 });
    if (chunkText(extractedText, 1800, 220).length > 100) return NextResponse.json({ error: 'This source creates more than 100 searchable chunks. Split it into smaller library items before importing.' }, { status: 413 });

    const originalFileUrl = await uploadToBunnyStorage(original, fileName, { contentType: file.type || 'application/octet-stream' });
    const userId = String((admin as any).userId || (admin as any).username || 'admin');
    const source = await saveKnowledgeSource({
      moduleId, title: title || fileName.replace(/\.[^.]+$/, ''), content: extractedText,
      topic, language, sourceType, sourceReference,
      originalFileName: fileName, originalFileUrl, originalMimeType: file.type || 'application/octet-stream', extractionType,
    }, userId);
    return NextResponse.json({ success: true, source, extractedCharacters: extractedText.length, extractionType, avatarCuesAdded, avatarCueWarning }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not import source';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
