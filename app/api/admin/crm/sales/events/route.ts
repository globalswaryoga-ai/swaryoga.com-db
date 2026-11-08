import { NextRequest } from 'next/server';
import { verifyToken } from '@/lib/auth';
import {
  getViewerUserId,
  getVisibleUserIds,
  handleCrmError,
  formatCrmSuccess,
  parsePagination,
} from '@/lib/crm-handlers';
import {
  getBunnyWorkshopEvents,
  getBunnyWorkshopEventById,
  createBunnyWorkshopEvent,
} from '@/lib/bunnyWorkshopEventRepository';

export const dynamic = 'force-dynamic';

function cleanParticipantsList(participants: any[], defaultWorkshopName: string) {
  if (!Array.isArray(participants)) return [];
  return participants
    .filter((p: any) => p && (p.customerName || p.customerId || p.name))
    .map((p: any) => ({
      customerId: String(p.customerId || p.id || '').trim(),
      customerName: String(p.customerName || p.name || '').trim(),
      customerPhone: String(p.customerPhone || p.phone || '').trim(),
      workshopName: String(p.workshopName || defaultWorkshopName || '').trim(),
      amount: Number(p.amount) || 0,
      paymentMode: String(p.paymentMode || 'upi').trim(),
      saleId: p.saleId ? String(p.saleId) : undefined,
      source: p.source ? String(p.source) : undefined,
      email: p.email ? String(p.email) : undefined,
      city: p.city ? String(p.city) : undefined,
      country: p.country ? String(p.country) : undefined,
    }));
}

/**
 * Workshop Events (Bunny Database Edge SQL)
 * GET: list events (filters: month=YYYY-MM, workshop=name, id=string)
 * POST: create a new event with participants
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin) throw new Error('Unauthorized: Admin access required');
    const visibleUserIds = getVisibleUserIds(decoded, request);

    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    if (id) {
      const doc = await getBunnyWorkshopEventById(id, visibleUserIds);
      if (!doc) throw new Error('Invalid: Event not found');
      return formatCrmSuccess(doc);
    }

    const month = url.searchParams.get('month');
    const workshop = url.searchParams.get('workshop');
    const { limit, skip } = parsePagination(request);

    const { events, total, summary } = await getBunnyWorkshopEvents({
      month,
      workshop,
      limit,
      skip,
      visibleUserIds,
    });

    return formatCrmSuccess(events, {
      total,
      limit,
      skip,
      summary,
    });
  } catch (error: any) {
    return handleCrmError(error, 'sales/events GET');
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin) throw new Error('Unauthorized: Admin access required');
    const adminUserId = getViewerUserId(decoded);

    const body = await request.json();
    const {
      startDate,
      endDate,
      workshopName,
      workshopTime,
      workshopFees,
      language,
      mode,
      teacher,
      coTeachers,
      organizers,
      notes,
      participants,
    } = body;

    if (!startDate) throw new Error('Invalid: startDate is required');
    if (!workshopName || !String(workshopName).trim()) throw new Error('Invalid: workshopName is required');

    const start = new Date(startDate);
    if (isNaN(start.getTime())) throw new Error('Invalid: startDate is not a valid date');

    const cleanParticipants = cleanParticipantsList(participants, workshopName);

    const doc = await createBunnyWorkshopEvent({
      startDate: start.toISOString(),
      endDate: endDate ? new Date(endDate).toISOString() : undefined,
      workshopName: String(workshopName).trim(),
      workshopTime: String(workshopTime || '').trim(),
      workshopFees: Number(workshopFees) || 0,
      language: String(language || 'Hindi').trim(),
      mode: String(mode || 'online').trim(),
      teacher: String(teacher || '').trim(),
      coTeachers: Array.isArray(coTeachers) ? coTeachers.map(String).map((s) => s.trim()).filter(Boolean) : [],
      organizers: Array.isArray(organizers) ? organizers.map(String).map((s) => s.trim()).filter(Boolean) : [],
      notes: String(notes || '').trim(),
      participants: cleanParticipants,
      reportedByUserId: adminUserId,
      labels: ['manual'],
    });

    return formatCrmSuccess(doc);
  } catch (error: any) {
    return handleCrmError(error, 'sales/events POST');
  }
}
