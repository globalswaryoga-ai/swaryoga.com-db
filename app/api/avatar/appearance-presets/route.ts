import { NextResponse } from 'next/server';
import {
  getAllAppearancePresets,
  saveAppearancePreset,
} from '@/lib/mohanAiClone/appearancePresetsRepository';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const presets = await getAllAppearancePresets();
    return NextResponse.json({ success: true, presets });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const saved = await saveAppearancePreset(body);
    return NextResponse.json({ success: true, preset: saved });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message }, { status: 500 });
  }
}

