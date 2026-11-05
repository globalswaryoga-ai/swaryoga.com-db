import { NextRequest, NextResponse } from 'next/server';
import { bunnyExecute } from '@/lib/bunnyDatabase';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/crm-handlers';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

function requireAdmin(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') || '';
    const decoded = verifyToken(token);
    return decoded && isSuperAdmin(decoded, request) ? decoded : null;
  } catch {
    return null;
  }
}

async function ensureTable() {
  await bunnyExecute(`
    CREATE TABLE IF NOT EXISTS mohan_creation_hub_topics_sql (
      id TEXT PRIMARY KEY,
      level TEXT NOT NULL DEFAULT 'L-1',
      day TEXT NOT NULL DEFAULT 'Day 1',
      title TEXT NOT NULL,
      source_language TEXT NOT NULL DEFAULT 'hi',
      duration_minutes INTEGER NOT NULL DEFAULT 45,
      source_video_url TEXT,
      transcript TEXT NOT NULL,
      blueprint_sov_plain TEXT,
      blueprint_sov_hummer TEXT,
      blueprint_svo_plain TEXT,
      blueprint_svo_hummer TEXT,
      key_points_json TEXT,
      admin_notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);
}

function parseLevel(moduleId: string = '', title: string = ''): string {
  const combined = `${moduleId} ${title}`.toLowerCase();
  if (combined.includes('level-4') || combined.includes('level 4') || combined.includes('l-4')) return 'L-4';
  if (combined.includes('level-3') || combined.includes('level 3') || combined.includes('l-3')) return 'L-3';
  if (combined.includes('level-2') || combined.includes('level 2') || combined.includes('l-2')) return 'L-2';
  return 'L-1';
}

function parseDay(title: string = '', topic: string = ''): string {
  const combined = `${title} ${topic}`;
  const m = combined.match(/day[-\s_]?(\d{1,2})/i);
  if (m && m[1]) {
    return `Day ${m[1]}`;
  }
  return 'Day 1';
}

function estimateDurationMinutes(content: string): number {
  if (!content) return 45;
  // Look for largest timestamp [MM:SS] or [HH:MM:SS]
  const regex = /\[(?:(\d{1,2}):)?(\d{1,2}):(\d{2})/g;
  let maxSec = 0;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(content)) !== null) {
    if (match[1]) {
      const sec = parseInt(match[1], 10) * 3600 + parseInt(match[2], 10) * 60 + parseInt(match[3], 10);
      if (sec > maxSec) maxSec = sec;
    } else {
      const sec = parseInt(match[2], 10) * 60 + parseInt(match[3], 10);
      if (sec > maxSec) maxSec = sec;
    }
  }
  if (maxSec > 300) {
    return Math.max(15, Math.min(180, Math.round(maxSec / 60)));
  }
  return Math.max(15, Math.min(120, Math.round(content.length / 1200)));
}

function getKeyPointsForLanguage(lang: string, title: string): string[] {
  if (lang === 'mr') {
    return [
      `स्वर आणि नाडी संतुलन (${title})`,
      'डावी नाकपुडी (चंद्र नाडी) व उजवी नाकपुडी (सूर्य नाडी) कार्यपद्धती',
      'पंचतत्व व जठराग्नी पचन कालचक्र',
      'साधना, ध्यान व सुषुम्ना प्राणायाम नियम',
    ];
  }
  if (lang === 'hi') {
    return [
      `स्वर और नाड़ी विज्ञान सार (${title})`,
      'दायाँ स्वर (सूर्य नाड़ी - उष्णता) और बायाँ स्वर (चंद्र नाड़ी - शीतलता)',
      'पंचतत्व संतुलन और जठराग्नि भोजन नियम',
      'सुषुम्ना नाड़ी जागरण व दैनिक प्राणायाम विधि',
    ];
  }
  return [
    `Verbatim Swar Yoga Lecture (${title})`,
    'Nasal Cycle Dynamics: Left (Ida / Cooling) & Right (Pingala / Heating)',
    'Five Elements (Pancha Tattva) & Digestive Fire Optimization',
    'Sushumna Awakening & Meditation Master Guidelines',
  ];
}

export async function POST(request: NextRequest) {
  try {
    const admin = requireAdmin(request);
    if (!admin) return NextResponse.json({ error: 'Super admin access required' }, { status: 403 });

    await ensureTable();

    // Query all valid approved / existing knowledge sources from RAG database
    const sourcesRes = await bunnyExecute(`
      SELECT id, module_id, title, content, topic, language, source_type,
             original_file_name, original_file_url, source_reference,
             created_at, updated_at
      FROM mohan_rag_sources_sql
      WHERE LENGTH(content) > 300
      ORDER BY updated_at DESC
    `);

    const sources = sourcesRes.rows || [];
    let syncedCount = 0;
    const now = new Date().toISOString();

    for (const s of sources) {
      const rawContent = String(s.content || '');
      const cleanContent = rawContent
        .replace(/\[face:[a-z_]+\]/gi, '')
        .replace(/\[[a-z_]+:\d{1,3}\]/gi, '')
        .trim();

      if (cleanContent.length < 200) continue;

      const title = String(s.title || 'Untitled Swar Yoga Master Lecture').trim();
      const topicId = `src_${s.id}`;
      const level = parseLevel(String(s.module_id || ''), title);
      const day = parseDay(title, String(s.topic || ''));
      const lang = String(s.language || 'mr').toLowerCase() === 'en'
        ? 'en'
        : (String(s.language || 'mr').toLowerCase() === 'hi' ? 'hi' : 'mr');
      const duration = estimateDurationMinutes(cleanContent);
      const videoUrl = s.original_file_url ? String(s.original_file_url) : (s.source_reference ? String(s.source_reference) : null);
      const keyPoints = JSON.stringify(getKeyPointsForLanguage(lang, title));
      const adminNotes = `Auto-synced from Mohan RAG Library Database (Module: ${s.module_id || 'general'}, Type: ${s.source_type || 'video'}).`;

      await bunnyExecute({
        sql: `INSERT OR REPLACE INTO mohan_creation_hub_topics_sql (
                id, level, day, title, source_language, duration_minutes,
                source_video_url, transcript, blueprint_sov_plain, blueprint_sov_hummer,
                blueprint_svo_plain, blueprint_svo_hummer, key_points_json,
                admin_notes, created_at, updated_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, COALESCE((SELECT created_at FROM mohan_creation_hub_topics_sql WHERE id = ?), ?), ?)`,
        args: [
          topicId,
          level,
          day,
          title,
          lang,
          duration,
          videoUrl,
          cleanContent,
          cleanContent,
          cleanContent,
          cleanContent,
          cleanContent,
          keyPoints,
          adminNotes,
          topicId,
          now,
          now,
        ],
      });

      syncedCount++;
    }

    return NextResponse.json({
      success: true,
      syncedCount,
      message: `Successfully synced ${syncedCount} authentic lectures from RAG Library into Creation Hub!`,
    });
  } catch (error: any) {
    console.error('Library Sync error:', error);
    return NextResponse.json({ error: error.message || 'Failed to sync library sources' }, { status: 500 });
  }
}
