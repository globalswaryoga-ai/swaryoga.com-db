import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import {
  getViewerUserId,
  getVisibleUserIds,
  handleCrmError,
  formatCrmSuccess,
  parsePagination,
  isValidObjectId,
  toObjectId,
} from '@/lib/crm-handlers';
import { getWorkshopEvent } from '@/lib/schemas/enterpriseSchemas';

export const dynamic = 'force-dynamic';

function computeTotals(participants: any[]) {
  const list = Array.isArray(participants) ? participants : [];
  const totalAmount = list.reduce((sum, p) => sum + (Number(p?.amount) || 0), 0);
  return { totalAmount, participantCount: list.length };
}

function buildEventAccessFilter(decoded: any): Record<string, any> {
  const visibleUserIds = getVisibleUserIds(decoded);
  if (visibleUserIds === null) return {};
  if (visibleUserIds.length === 1) return { reportedByUserId: visibleUserIds[0] || '__never_match__' };
  return { reportedByUserId: { $in: visibleUserIds } };
}

/**
 * Workshop Events
 * GET: list events (filters: month=YYYY-MM, workshop=name)
 * POST: create a new event with participants
 */
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const WorkshopEvent = getWorkshopEvent();

    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin) throw new Error('Unauthorized: Admin access required');
    const accessFilter = buildEventAccessFilter(decoded);

    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    if (id) {
      if (!isValidObjectId(id)) throw new Error('Invalid: bad event id');
      const doc = await WorkshopEvent.findOne({ _id: toObjectId(id), ...accessFilter }).lean();
      if (!doc) throw new Error('Invalid: Event not found');
      return formatCrmSuccess(doc);
    }

    const month = url.searchParams.get('month');
    const workshop = url.searchParams.get('workshop');
    const { limit, skip } = parsePagination(request);

    const filter: Record<string, any> = { ...accessFilter };
    if (month) filter.month = month;
    if (workshop) filter.workshopName = workshop;

    const [events, total, summary] = await Promise.all([
      WorkshopEvent.find(filter).sort({ startDate: -1 }).skip(skip).limit(limit).lean(),
      WorkshopEvent.countDocuments(filter),
      WorkshopEvent.aggregate([
        { $match: filter },
        { $group: { _id: null, totalAmount: { $sum: '$totalAmount' }, totalParticipants: { $sum: '$participantCount' }, totalEvents: { $sum: 1 } } },
      ]),
    ]);

    return formatCrmSuccess(events, {
      total,
      limit,
      skip,
      summary: summary[0]
        ? { totalAmount: summary[0].totalAmount, totalParticipants: summary[0].totalParticipants, totalEvents: summary[0].totalEvents }
        : { totalAmount: 0, totalParticipants: 0, totalEvents: 0 },
    });
  } catch (error: any) {
    return handleCrmError(error, 'sales/events GET');
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const WorkshopEvent = getWorkshopEvent();

    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin) throw new Error('Unauthorized: Admin access required');
    const adminUserId = getViewerUserId(decoded);

    const body = await request.json();
    const { startDate, endDate, workshopName, workshopTime, workshopFees, notes, participants } = body;

    if (!startDate) throw new Error('Invalid: startDate is required');
    if (!workshopName || !String(workshopName).trim()) throw new Error('Invalid: workshopName is required');

    const start = new Date(startDate);
    if (isNaN(start.getTime())) throw new Error('Invalid: startDate is not a valid date');

    const cleanParticipants = Array.isArray(participants)
      ? participants
          .filter((p: any) => p && (p.customerName || p.customerId))
          .map((p: any) => ({
            customerId: String(p.customerId || '').trim(),
            customerName: String(p.customerName || '').trim(),
            customerPhone: String(p.customerPhone || '').trim(),
            workshopName: String(p.workshopName || workshopName).trim(),
            amount: Number(p.amount) || 0,
            paymentMode: String(p.paymentMode || '').trim(),
          }))
      : [];

    const { totalAmount, participantCount } = computeTotals(cleanParticipants);

    const doc = await WorkshopEvent.create({
      startDate: start,
      endDate: endDate ? new Date(endDate) : undefined,
      workshopName: String(workshopName).trim(),
      workshopTime: String(workshopTime || '').trim(),
      workshopFees: Number(workshopFees) || 0,
      month: `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}`,
      notes: String(notes || '').trim(),
      participants: cleanParticipants,
      totalAmount,
      participantCount,
      reportedByUserId: adminUserId,
      labels: ['manual'],
    });

    return formatCrmSuccess(doc);
  } catch (error: any) {
    return handleCrmError(error, 'sales/events POST');
  }
}
