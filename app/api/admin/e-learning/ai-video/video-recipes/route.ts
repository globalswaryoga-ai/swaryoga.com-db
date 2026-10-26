import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/crm-handlers';
import { listVideoRecipes, saveVideoRecipe, VideoRecipeProject, MultiLangScene } from '@/lib/bunnyVideoRecipeRepository';
import { generateAIText } from '@/lib/ai/generateWithFallback';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English',
  hi: 'Hindi',
  mr: 'Marathi',
  kn: 'Kannada',
  ne: 'Nepali',
  zh: 'Mandarin Chinese',
  es: 'Spanish',
  fr: 'French',
  ar: 'Arabic',
  de: 'German',
  pt: 'Portuguese',
  ja: 'Japanese',
  ko: 'Korean',
  ru: 'Russian',
  it: 'Italian',
  tr: 'Turkish',
  nl: 'Dutch',
  sv: 'Swedish',
  th: 'Thai',
  id: 'Indonesian',
};

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const recipes = await listVideoRecipes();
    return NextResponse.json({ success: true, recipes }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to list video recipes' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!isSuperAdmin(decoded)) {
      return NextResponse.json({ error: 'Forbidden: Superadmin access required' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const { action, project, targetLanguages } = body;

    // Action 1: Translate all scenes into multi-languages
    if (action === 'translate_scenes') {
      const { scenes = [], sourceLanguage = 'hi' } = project || {};
      const sourceName = LANGUAGE_NAMES[sourceLanguage] || sourceLanguage;
      const langs: string[] = targetLanguages || ['en', 'hi', 'mr', 'kn'];

      const newMultiLangScenes: MultiLangScene[] = [];

      for (const lang of langs) {
        const targetName = LANGUAGE_NAMES[lang] || lang;
        if (lang === sourceLanguage) {
          // Native source language
          for (const s of scenes) {
            newMultiLangScenes.push({
              sceneId: s.id,
              language: lang,
              translatedTitle: s.stepTitle,
              translatedScript: s.spokenScript,
            });
          }
          continue;
        }

        // Translate scene by scene with strict length matching
        for (const s of scenes) {
          const prompt = `You are a professional multi-language voice and subtitle translator.
Source Language: ${sourceName}
Target Language: ${targetName}
Context: Recipe and Yogic health instructional video step.

Translate the following step title and spoken dialogue into ${targetName}:
Step Title: ${s.stepTitle}
Spoken Dialogue: ${s.spokenScript}

STRICT RULES:
1. Translate faithfully matching exact meaning and length (1 line in -> 1 line out).
2. Use natural native grammar and conversational speech rhythm.
3. Output ONLY a valid JSON object in this exact format, with no markdown code blocks and no extra commentary:
{"title": "translated title", "script": "translated script"}`;

          try {
            const raw = await generateAIText({
              message: prompt,
              maxOutputTokens: 1024,
              providerOrder: ['OpenAI', 'Anthropic']
            });

            // Clean json
            const cleaned = raw.replace(/```json/g, '').replace(/```/g, '').trim();
            const parsed = JSON.parse(cleaned);

            newMultiLangScenes.push({
              sceneId: s.id,
              language: lang,
              translatedTitle: parsed.title || s.stepTitle,
              translatedScript: parsed.script || s.spokenScript,
            });
          } catch {
            newMultiLangScenes.push({
              sceneId: s.id,
              language: lang,
              translatedTitle: s.stepTitle,
              translatedScript: s.spokenScript,
            });
          }
        }
      }

      // Save project with translated scenes
      const saved = await saveVideoRecipe({
        ...project,
        multiLangScenes: newMultiLangScenes,
        status: 'ready'
      });

      return NextResponse.json({ success: true, project: saved }, { status: 200 });
    }

    // Action 2: Save project directly
    const saved = await saveVideoRecipe(project);
    return NextResponse.json({ success: true, project: saved }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to process video recipe' }, { status: 500 });
  }
}
