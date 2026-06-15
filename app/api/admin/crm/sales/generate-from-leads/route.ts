import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/crm-handlers';
import mongoose from 'mongoose';

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

    await connectDB();
    const crmDb = mongoose.connection.useDb('swaryoga_admin_crm', { useCache: true });

    const body: GenerateRequest = await request.json();
    const { startMonth, endMonth, workshops } = body;

    if (!startMonth || !endMonth || !workshops?.length) {
      throw new Error('Missing required fields: startMonth, endMonth, workshops');
    }

    // Parse months to get date range
    const [startYear, startMonthNum] = startMonth.split('-').map(Number);
    const [endYear, endMonthNum] = endMonth.split('-').map(Number);

    const leadCollection = crmDb.collection('leads');
    const saleCollection = crmDb.collection('sales');

    const createdSales = [];

    for (const workshop of workshops) {
      // Find enrolled leads for this workshop
      const leads = await leadCollection
        .find({
          $or: [
            { workshopName: workshop.workshopName },
            { 'workshops': workshop.workshopName },
            { 'sales.stage': 'enrolled', workshopName: new RegExp(workshop.workshopName, 'i') },
          ],
          status: { $in: ['enrolled', 'repeater', 'completed'] },
        })
        .toArray();

      if (leads.length === 0) continue;

      // Calculate number of people per month to hit income target
      const monthCount = (endYear - startYear) * 12 + (endMonthNum - startMonthNum) + 1;
      const peoplePerMonth = Math.ceil(leads.length / monthCount);
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
            customerName: lead.name || 'Unknown',
            customerPhone: lead.phoneNumber,
            workshopName: workshop.workshopName,
            saleAmount: actualFee,
            paidAmount: actualFee,
            dueAmount: 0,
            saleDate: saleDate,
            paymentType: 'full',
            paymentMode: 'bank_transfer',
            status: 'completed',
            labels: ['generated-from-leads'],
            createdAt: new Date(),
            createdByUserId: decoded.userId || decoded.id || 'system',
          };

          const result = await saleCollection.insertOne(saleRecord);
          createdSales.push({
            ...saleRecord,
            _id: result.insertedId,
          });
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
