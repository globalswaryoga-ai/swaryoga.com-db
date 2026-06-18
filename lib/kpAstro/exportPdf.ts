// Colorful A4 PDF export for KP Astro predictions (birth, horary, match-
// making). Reuses the PDFKit + Noto Sans Devanagari pattern proven in the
// e-book compiler (app/api/admin/e-learning/ai-video/ebook/compile/route.ts)
// — PDFKit does real Indic script shaping via fontkit, pdf-lib does not.
//
// Font coverage: Noto Sans Devanagari covers Latin + Devanagari (Hindi,
// Marathi, English). The other languages in KP_LANGUAGES (Gujarati, Bengali,
// Tamil, Telugu, Kannada, Malayalam, Punjabi, Odia, Urdu) each use a
// different script needing their own Noto font file — not bundled yet. They
// still render with this font (no crash), but glyphs outside Devanagari+Latin
// will show as blank boxes until that language's font file is added to
// public/fonts/ and wired into FONT_PATH_BY_SCRIPT below.
import fs from 'fs';
import path from 'path';
import PDFDocument from 'pdfkit';
import { KP_LANGUAGE_NAMES, KP_LANGUAGES, languageHasFullFontSupportClient } from './languages';

const DEVANAGARI_FONT_PATH = path.join(process.cwd(), 'public', 'fonts', 'NotoSansDevanagari-Regular.ttf');

const FONT_PATH_BY_SCRIPT: Partial<Record<string, string>> = {
  devanagari: DEVANAGARI_FONT_PATH,
  latin: DEVANAGARI_FONT_PATH,
};

function fontPathForLanguage(languageCode: string): string {
  const lang = KP_LANGUAGES.find((l) => l.code === languageCode);
  return (lang && FONT_PATH_BY_SCRIPT[lang.script]) || DEVANAGARI_FONT_PATH;
}

export const languageHasFullFontSupport = languageHasFullFontSupportClient;

const BRAND_INDIGO = '#4f46e5';
const BRAND_INDIGO_DARK = '#3730a3';
const BRAND_GOLD = '#d97706';
const TEXT_DARK = '#1f2937';
const TEXT_MUTED = '#6b7280';

export interface PdfMetaRow {
  label: string;
  value: string;
}

export interface BuildKpPdfParams {
  title: string;
  subtitle?: string;
  languageCode: string;
  metaRows: PdfMetaRow[];
  bodyText: string;
  generatedAt: Date;
}

export function buildKpPredictionPdf(params: BuildKpPdfParams): Promise<Buffer> {
  const { title, subtitle, languageCode, metaRows, bodyText, generatedAt } = params;
  const fontPath = fontPathForLanguage(languageCode);

  return new Promise<Buffer>((resolve, reject) => {
    // A4 in points: 595.28 x 841.89. Font passed to the constructor (not via
    // .font() after) to skip PDFKit's default Helvetica/AFM lookup, which
    // fails under Next.js's server-route bundling (see ebook compiler).
    const doc = new PDFDocument({ size: 'A4', margin: 0, font: fontPath, bufferPages: true });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const pageWidth = 595.28;
    const margin = 48;
    const contentWidth = pageWidth - margin * 2;

    // Header band
    doc.rect(0, 0, pageWidth, 120).fill(BRAND_INDIGO);
    doc.rect(0, 112, pageWidth, 8).fill(BRAND_GOLD);
    doc.fillColor('#ffffff').fontSize(22).text(title, margin, 36, { width: contentWidth });
    if (subtitle) {
      doc.fontSize(11).fillColor('#e0e7ff').text(subtitle, margin, 68, { width: contentWidth });
    }
    doc.fontSize(9).fillColor('#c7d2fe').text('Swar Yoga — KP Astrology', margin, 90, { width: contentWidth });

    let y = 148;

    // Meta box
    if (metaRows.length) {
      const boxHeight = 22 + metaRows.length * 16;
      doc.roundedRect(margin, y, contentWidth, boxHeight, 6).fill('#f5f3ff');
      doc.roundedRect(margin, y, contentWidth, boxHeight, 6).lineWidth(1).stroke(BRAND_INDIGO_DARK);
      let rowY = y + 12;
      for (const row of metaRows) {
        doc.fontSize(10).fillColor(TEXT_MUTED).text(`${row.label}:`, margin + 14, rowY, { continued: true, width: contentWidth - 28 });
        doc.fillColor(TEXT_DARK).text(`  ${row.value}`);
        rowY += 16;
      }
      y += boxHeight + 20;
    }

    // Body — AI output is often lightly markdown-formatted (#, ##, **bold**,
    // --- dividers); no bold variant of this font is bundled, so headings
    // are distinguished by size/color instead of weight, and the literal
    // markdown punctuation is stripped rather than left in as stray symbols.
    doc.x = margin;
    doc.y = y;
    const lines = bodyText.split('\n');
    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line || /^[-_]{3,}$/.test(line)) {
        doc.moveDown(0.4);
        continue;
      }
      const headingMatch = line.match(/^(#{1,3})\s*(.+)$/);
      const cleaned = line.replace(/\*\*(.+?)\*\*/g, '$1').replace(/^[-*]\s+/, '• ');
      if (headingMatch) {
        const level = headingMatch[1].length;
        const text = headingMatch[2].replace(/\*\*/g, '');
        doc.fontSize(level === 1 ? 16 : level === 2 ? 14 : 12).fillColor(BRAND_INDIGO_DARK).text(text, { width: contentWidth, align: 'left' });
        doc.moveDown(0.3);
      } else {
        doc.fontSize(11).fillColor(TEXT_DARK).text(cleaned, { width: contentWidth, align: 'left', lineGap: 5 });
      }
    }

    // Footer on every page
    const range = doc.bufferedPageRange();
    for (let i = 0; i < range.count; i++) {
      doc.switchToPage(range.start + i);
      doc.fontSize(8).fillColor(TEXT_MUTED).text(
        `Generated ${generatedAt.toLocaleString('en-IN')} · ${KP_LANGUAGE_NAMES[languageCode] || languageCode} · Page ${i + 1} of ${range.count}`,
        margin,
        841.89 - 36,
        { width: contentWidth, align: 'center' }
      );
    }

    doc.end();
  });
}
