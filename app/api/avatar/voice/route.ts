import { NextRequest, NextResponse } from 'next/server';
import { bunnyExecute } from '@/lib/bunnyDatabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const res = await bunnyExecute(
      'SELECT id, language, tone_name, pitch_hz, cadence_words_per_minute, characteristic, audio_sample_url FROM mohan_avatar_vocal_dna_sql ORDER BY id ASC'
    );
    return NextResponse.json({ success: true, data: res.rows });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Database error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Missing voice ID' }, { status: 400 });
    }

    await bunnyExecute({
      sql: 'DELETE FROM mohan_avatar_vocal_dna_sql WHERE id = ?',
      args: [id],
    });

    await bunnyExecute({
      sql: 'DELETE FROM studio_voice_avatars_sql WHERE id = ?',
      args: [id],
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      message: 'वॉइस प्रोफाइल सफलतापूर्वक हटा दी गई।',
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to delete voice' }, { status: 500 });
  }
}

