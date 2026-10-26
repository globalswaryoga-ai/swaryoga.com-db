import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/crm-handlers';
import { formatPersonName } from '@/lib/formatName';
import { loadBunnyLeads } from '@/lib/bunnyLeadsRepository';
import { createBunnySale } from '@/lib/bunnySalesRepository';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface GenerateRequest {
  startMonth: string; // 'YYYY-MM'
  endMonth: string; // 'YYYY-MM'
  workshops: Array<{
    workshopName: string;
    totalIncome: number;
    feePerPerson: number;
  }>;
}

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin) throw new Error('Unauthorized');
    if (!isSuperAdmin(decoded)) throw new Error('Forbidden');

    const body: GenerateRequest = await request.json();
    const { startMonth, endMonth, workshops } = body;

    if (!startMonth || !endMonth || !workshops?.length) {
      throw new Error('Missing required fields: startMonth, endMonth, workshops');
    }

    const [startYear, startMonthNum] = startMonth.split('-').map(Number);
    const [endYear, endMonthNum] = endMonth.split('-').map(Number);

    const allLeads = await loadBunnyLeads();
    const createdSales = [];

    for (const workshop of workshops) {
      const workshopLower = workshop.workshopName.toLowerCase();
      const leads = allLeads.filter(lead => {
        const leadWorkshop = String(lead.workshopName || '').toLowerCase();
        const leadWorkshops = Array.isArray(lead.workshops) ? lead.workshops.map((w: any) => String(w).toLowerCase()) : [];
        const matchesWorkshop = leadWorkshop === workshopLower || leadWorkshops.includes(workshopLower);
        const matchesStatus = ['enrolled', 'repeater', 'completed'].includes(lead.status) || lead.sales?.stage === 'enrolled';
        return matchesWorkshop && matchesStatus;
      });

      if (leads.length === 0) continue;

      const monthCount = (endYear - startYear) * 12 + (endMonthNum - startMonthNum) + 1;
      const peoplePerMonth = Math.ceil(leads.length / Math.max(1, monthCount));
      const actualFee = workshop.feePerPerson;

      let leadIndex = 0;
      const startDate = new Date(startYear, startMonthNum - 1, 1);
      const endDate = new Date(endYear, endMonthNum, 0);

      for (let d = new Date(startDate); d <= endDate; d.setMonth(d.getMonth() + 1)) {
        const monthStart = new Date(d.getFullYear(), d.getMonth(), 1);
        const daysInMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();

        for (let i = 0; i < peoplePerMonth && leadIndex < leads.length; i++) {
          const lead = leads[leadIndex++];
          const dayInMonth = Math.min(1 + Math.floor((i / peoplePerMonth) * daysInMonth), daysInMonth);
          const saleDate = new Date(monthStart.getFullYear(), monthStart.getMonth(), dayInMonth);

          const saleRecord = {
            leadId: lead._id,
            customerName: formatPersonName(lead.name) || 'Unknown',
            customerPhone: lead.phoneNumber,
            workshopName: workshop.workshopName,
            saleAmount: actualFee,
            paidAmount: actualFee,
            dueAmount: 0,
            saleDate: saleDate.toISOString(),
            paymentType: 'full',
            paymentMode: 'bank_transfer',
            status: 'completed',
            labels: ['generated-from-leads'],
            reportedByUserId: 'admincrm',
            currency: 'INR',
          };

          const created = await createBunnySale(saleRecord);
          createdSales.push(created);
        }
      }
    }

    return NextResponse.json({
      success: true,
      createdCount: createdSales.length,
      message: `Generated ${createdSales.length} sales entries from leads`,
    });
  } catch (error: any) {
    const status = error.message === 'Unauthorized' ? 401 : error.message === 'Forbidden' ? 403 : 500;
    console.error('Generate sales error:', error);
    return NextResponse.json({ error: error.message || 'Failed to generate sales' }, { status });
  }
}
