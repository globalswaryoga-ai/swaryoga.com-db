import { NextRequest, NextResponse } from 'next/server';
import { listPrograms, getProgram } from '@/lib/bunnySadhanaRepository';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const rawCode = (searchParams.get('code') || '').trim();
    const cleanCode = rawCode.toUpperCase();

    // 1. Fetch active programs
    const allPrograms = await listPrograms({ active: true });
    const activePrograms = (Array.isArray(allPrograms) ? allPrograms : [])
      .filter((p: any) => p && p.active !== false)
      .map((p: any) => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        passcode: p.passcode || p.slug.toUpperCase(),
        timeSlots: Array.isArray(p.timeSlots) ? p.timeSlots : ['05:00', '18:30'],
        timezone: p.timezone || 'Asia/Kolkata',
        description: p.description || '',
        playerMode: p.playerMode || 'player',
      }));

    let matchedProgram: any = null;

    if (cleanCode) {
      // Find by passcode or slug in active programs
      matchedProgram = activePrograms.find(
        (p) =>
          p.passcode.toUpperCase() === cleanCode ||
          p.slug.toUpperCase() === cleanCode ||
          p.id.toUpperCase() === cleanCode
      );

      // If not in memory list, try DB direct query
      if (!matchedProgram) {
        const dbProg = await getProgram(rawCode);
        if (dbProg && dbProg.active !== false) {
          matchedProgram = {
            id: dbProg.id,
            name: dbProg.name,
            slug: dbProg.slug,
            passcode: dbProg.passcode || dbProg.slug.toUpperCase(),
            timeSlots: Array.isArray(dbProg.timeSlots) ? dbProg.timeSlots : ['05:00', '18:30'],
            timezone: dbProg.timezone || 'Asia/Kolkata',
            description: dbProg.description || '',
            playerMode: dbProg.playerMode || 'player',
          };
        }
      }
    }

    const defaultProgram =
      activePrograms.find((p) => p.slug.includes('hindi') || p.slug.includes('swar')) ||
      activePrograms[0] ||
      null;

    return NextResponse.json({
      success: true,
      matched: !!matchedProgram,
      program: matchedProgram || defaultProgram,
      defaultProgram,
      allActivePrograms: activePrograms,
    });
  } catch (error: any) {
    console.error('[API /api/sadhana/resolve-code error]:', error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Failed to resolve sadhana code',
      },
      { status: 500 }
    );
  }
}
