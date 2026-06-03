/**
 * Ritucharya Calendar API — one-year, month-wise chart.
 *
 * GET → 12 entries (Jan–Dec). Each month resolves to its ritu (season) and carries
 *       the full diet data (tastes to eat/avoid, doshas, health tips) plus the
 *       published recipes recommended for that ritu (Recipe.bestForRitus).
 *
 * Master/seasonal data — same for everyone; only requires an authenticated admin.
 */
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { Recipe } from '@/lib/ritucharya/recipeSchema';
import { getCurrentSeasonByDate, getRituBySeason } from '@/lib/ritucharya/seasons';

export const dynamic = 'force-dynamic';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export async function GET(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.split('Bearer ')[1];
    const decoded = token ? verifyToken(token) : null;
    if (!decoded || !decoded.isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await connectDB();
    const year = new Date().getFullYear();

    // Pull published recipes once, then group by ritu id.
    const recipes = await Recipe.find({ isPublished: true })
      .select('name nameHi category primaryRasa images bestForRitus prepTime cookTime difficulty')
      .lean();
    const recipesByRitu: Record<string, any[]> = {};
    for (const r of recipes as any[]) {
      for (const rid of r.bestForRitus || []) {
        (recipesByRitu[rid] ||= []).push({
          id: String(r._id),
          name: r.name,
          nameHi: r.nameHi,
          category: r.category,
          primaryRasa: r.primaryRasa,
          image: r.images?.[0]?.url || null,
          prepTime: r.prepTime,
          cookTime: r.cookTime,
          difficulty: r.difficulty,
        });
      }
    }

    const months = MONTHS.map((label, idx) => {
      // Use mid-month so we land squarely inside a ritu's date range.
      const rituId = getCurrentSeasonByDate(new Date(year, idx, 15));
      const ritu = getRituBySeason(rituId);
      return {
        month: idx + 1,
        monthName: label,
        rituId,
        ritu: ritu
          ? {
              id: ritu.id,
              nameEn: ritu.nameEn,
              nameHi: ritu.nameHi,
              emoji: ritu.emoji,
              monthsEn: ritu.monthsEn,
              tempRange: ritu.tempRange,
              doshas: ritu.doshas,
              tastesToEat: ritu.tastesToEat,
              tastesToAvoid: ritu.tastesToAvoid,
              healthTips: ritu.healthTips,
            }
          : null,
        recipes: recipesByRitu[rituId] || [],
      };
    });

    return NextResponse.json({ success: true, year, months });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
