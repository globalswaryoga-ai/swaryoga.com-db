import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import PDFDocument from 'pdfkit';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/crm-handlers';

import { bunnyExecute } from '@/lib/bunnyDatabase';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

const DEVANAGARI_FONT_PATH = path.join(process.cwd(), 'public', 'fonts', 'NotoSansDevanagari-Regular.ttf');

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!isSuperAdmin(decoded)) {
      return NextResponse.json({ error: 'Forbidden: Superadmin access required' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({} as any));
    const workshopName = String(body?.workshopName || '').trim();
    const language = String(body?.language || '').trim();
    if (!workshopName || !language) {
      return NextResponse.json({ error: 'workshopName and language are required' }, { status: 400 });
    }


    // Query Bunny Database
    const res = await bunnyExecute({
      sql: `SELECT job_id, topic_title, day_order, ebook_chapters_json 
            FROM ai_video_jobs_sql 
            WHERE workshop_name = ? 
            ORDER BY day_order ASC, created_at ASC`,
      args: [workshopName],
    });

    const matchingJobs: { topicTitle: string; chapterText: string }[] = [];

    for (const row of res.rows) {
      let chapters: any[] = [];
      try {
        chapters = row.ebook_chapters_json ? JSON.parse(String(row.ebook_chapters_json)) : [];
      } catch {
        chapters = [];
      }

      const chapter = chapters.find((c: any) => c.language === language);
      if (chapter?.text) {
        matchingJobs.push({
          topicTitle: String(row.topic_title || 'Chapter'),
          chapterText: chapter.text,
        });
      }
    }

    if (!matchingJobs.length) {
      return NextResponse.json(
        { error: `No e-book chapters found for workshop "${workshopName}" in language "${language}"` },
        { status: 404 }
      );
    }

    const pdfBytes = await new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({ margin: 56, font: DEVANAGARI_FONT_PATH });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);


      matchingJobs.forEach((job, i) => {
        if (i > 0) doc.addPage();
        doc.fontSize(20).text(`Chapter ${i + 1}: ${job.topicTitle}`, { align: 'left' });
        doc.moveDown(1);
        doc.fontSize(12).text(job.chapterText, { align: 'left', lineGap: 4 });
      });

      doc.end();
    });

    const filename = workshopName.replace(/[^a-zA-Z0-9_-]+/g, '_');

    return new NextResponse(pdfBytes as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${filename}-${language}.pdf"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to compile e-book';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
