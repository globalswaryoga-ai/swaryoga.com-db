import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/crm-handlers';
import { getKpHoroscopeChart, getKpHoraryChart, getKpMatchMaking } from '@/lib/schemas/enterpriseSchemas';
import { buildKpPredictionPdf } from '@/lib/kpAstro/exportPdf';
import { KP_LANGUAGE_CODES } from '@/lib/kpAstro/languages';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!isSuperAdmin(decoded)) {
      return NextResponse.json({ error: 'Forbidden: Superadmin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const kind = searchParams.get('kind');
    const id = searchParams.get('id') || '';
    const language = searchParams.get('language') || 'hi';
    const requestedReportType = searchParams.get('reportType') || '';

    if (!['birth', 'horary', 'matchmaking'].includes(kind || '')) {
      return NextResponse.json({ error: 'kind must be birth, horary, or matchmaking' }, { status: 400 });
    }
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    }
    if (!KP_LANGUAGE_CODES.includes(language)) {
      return NextResponse.json({ error: 'Invalid language' }, { status: 400 });
    }

    await connectDB();

    let title = '';
    let subtitle = '';
    let metaRows: Array<{ label: string; value: string }> = [];
    let reports: Array<{ language: string; reportType?: string; text: string; generatedAt: string }> = [];
    let reportType = requestedReportType || (kind === 'horary' ? 'horary' : kind === 'matchmaking' ? 'matchmaking' : 'general');
    const legacyReportType = kind === 'horary' ? 'horary' : kind === 'matchmaking' ? 'matchmaking' : 'general';
    if (!['general', 'final', 'timeline', 'matchmaking', 'horary'].includes(reportType)) {
      return NextResponse.json({ error: 'Invalid reportType' }, { status: 400 });
    }

    if (kind === 'birth') {
      const KpHoroscopeChart = getKpHoroscopeChart();
      const chart = await (KpHoroscopeChart as any).findById(id).lean();
      if (!chart) return NextResponse.json({ error: 'Chart not found' }, { status: 404 });
      title = reportType === 'timeline' ? `Life Timeline Prediction — ${chart.personName}` : `Horoscope Prediction — ${chart.personName}`;
      subtitle = [chart.gender, chart.dob ? new Date(chart.dob).toLocaleDateString('en-IN') : null, chart.birthPlace].filter(Boolean).join(' · ');
      metaRows = [
        { label: 'Name', value: chart.personName || '-' },
        { label: 'Date of Birth', value: chart.dob ? new Date(chart.dob).toLocaleDateString('en-IN') : '-' },
        { label: 'Birth Time', value: chart.birthTime || '-' },
        { label: 'Birth Place', value: chart.birthPlace || '-' },
        { label: 'Ascendant', value: chart.ascendant?.sign || '-' },
      ];
      reports = chart.reports || [];
    } else if (kind === 'horary') {
      const KpHoraryChart = getKpHoraryChart();
      const chart = await (KpHoraryChart as any).findById(id).lean();
      if (!chart) return NextResponse.json({ error: 'Horary chart not found' }, { status: 404 });
      title = `Horary Judgment — #${chart.horaryNumber}`;
      subtitle = chart.questionText;
      metaRows = [
        { label: 'Question', value: chart.questionText || '-' },
        { label: 'Querent', value: chart.querentName || '-' },
        { label: 'Horary Number', value: String(chart.horaryNumber) },
        { label: 'Asked At', value: chart.askedAt ? new Date(chart.askedAt).toLocaleString('en-IN') : '-' },
      ];
      reports = chart.reports || [];
    } else {
      const KpMatchMaking = getKpMatchMaking();
      const record = await (KpMatchMaking as any).findById(id).populate('groomChartId', 'personName').populate('brideChartId', 'personName').lean();
      if (!record) return NextResponse.json({ error: 'Match record not found' }, { status: 404 });
      title = `Kundali Milan — ${record.groomChartId?.personName || '?'} & ${record.brideChartId?.personName || '?'}`;
      subtitle = record.label || '';
      metaRows = [
        { label: 'Groom', value: record.groomChartId?.personName || '-' },
        { label: 'Bride', value: record.brideChartId?.personName || '-' },
        { label: 'Compatibility Notes', value: record.compatibilityNotes || '-' },
      ];
      reports = record.reports || [];
    }

    const latestReport = reports
      .filter((r) => r.language === language)
      .filter((r) => (r.reportType || legacyReportType) === reportType)
      .slice(-1)[0];
    if (!latestReport) {
      return NextResponse.json({ error: `No ${reportType} prediction found in this language yet. Generate it first.` }, { status: 404 });
    }

    const pdfBytes = await buildKpPredictionPdf({
      title,
      subtitle,
      languageCode: language,
      metaRows,
      bodyText: latestReport.text,
      generatedAt: new Date(latestReport.generatedAt),
    });

    const filename = title.replace(/[^a-zA-Z0-9_-]+/g, '_');

    return new NextResponse(pdfBytes as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${filename}-${language}.pdf"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to export PDF';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
