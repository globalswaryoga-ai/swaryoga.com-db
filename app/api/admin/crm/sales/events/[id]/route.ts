import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { handleCrmError, formatCrmSuccess, getVisibleUserIds, isValidObjectId, toObjectId } from '@/lib/crm-handlers';
import { getWorkshopEvent, getSalesReport } from '@/lib/schemas/enterpriseSchemas';

export const dynamic = 'force-dynamic';

function computeTotals(participants: any[]) {
  const list = Array.isArray(participants) ? participants : [];
  const totalAmount = list.reduce((sum, p) => sum + (Number(p?.amount) || 0), 0);
  return { totalAmount, participantCount: list.length };
}

function verifyAdmin(request: NextRequest) {
  const token = request.headers.get('authorization')?.slice('Bearer '.length);
  const decoded = verifyToken(token);
  if (!decoded?.isAdmin) throw new Error('Unauthorized: Admin access required');
  return decoded;
}

function buildEventAccessFilter(decoded: any): Record<string, any> {
  const visibleUserIds = getVisibleUserIds(decoded);
  if (visibleUserIds === null) return {};
  if (visibleUserIds.length === 1) return { reportedByUserId: visibleUserIds[0] || '__never_match__' };
  return { reportedByUserId: { $in: visibleUserIds } };
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    const decoded = verifyAdmin(request);
    const accessFilter = buildEventAccessFilter(decoded);
    const { id } = await params;
    if (!isValidObjectId(id)) throw new Error('Invalid: bad event id');

    const WorkshopEvent = getWorkshopEvent();
    const doc = await WorkshopEvent.findOne({ _id: toObjectId(id), ...accessFilter }).lean();
    if (!doc) throw new Error('Invalid: Event not found');
    return formatCrmSuccess(doc);
  } catch (error: any) {
    return handleCrmError(error, 'sales/events/[id] GET');
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    const decoded = verifyAdmin(request);
    const accessFilter = buildEventAccessFilter(decoded);
    const { id } = await params;
    if (!isValidObjectId(id)) throw new Error('Invalid: bad event id');

    const WorkshopEvent = getWorkshopEvent();
    const body = await request.json();
    const { startDate, endDate, workshopName, workshopTime, workshopFees, notes, participants, addSaleIds } = body;

    const update: Record<string, any> = {};
    if (startDate) {
      const start = new Date(startDate);
      if (isNaN(start.getTime())) throw new Error('Invalid: startDate is not a valid date');
      update.startDate = start;
      update.month = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}`;
    }
    if (endDate !== undefined) update.endDate = endDate ? new Date(endDate) : undefined;
    if (workshopName !== undefined) {
      if (!String(workshopName).trim()) throw new Error('Invalid: workshopName is required');
      update.workshopName = String(workshopName).trim();
    }
    if (workshopTime !== undefined) update.workshopTime = String(workshopTime || '').trim();
    if (workshopFees !== undefined) update.workshopFees = Number(workshopFees) || 0;
    if (notes !== undefined) update.notes = String(notes || '').trim();

    if (participants !== undefined) {
      const cleanParticipants = Array.isArray(participants)
        ? participants
            .filter((p: any) => p && (p.customerName || p.customerId))
            .map((p: any) => ({
              customerId: String(p.customerId || '').trim(),
              customerName: String(p.customerName || '').trim(),
              customerPhone: String(p.customerPhone || '').trim(),
              workshopName: String(p.workshopName || update.workshopName || '').trim(),
              amount: Number(p.amount) || 0,
              paymentMode: String(p.paymentMode || '').trim(),
            }))
        : [];
      const { totalAmount, participantCount } = computeTotals(cleanParticipants);
      update.participants = cleanParticipants;
      update.totalAmount = totalAmount;
      update.participantCount = participantCount;
    }

    if (Array.isArray(addSaleIds) && addSaleIds.length > 0) {
      const existing = await WorkshopEvent.findOne({ _id: toObjectId(id), ...accessFilter }).lean();
      if (!existing) throw new Error('Invalid: Event not found');

      const basis: any[] = update.participants !== undefined ? update.participants : (existing as any).participants || [];
      const existingSaleIds = new Set(basis.map((p: any) => p.saleId ? String(p.saleId) : '').filter(Boolean));

      const SalesReport = getSalesReport();
      const validIds = addSaleIds.filter((sid: any) => isValidObjectId(sid));
      const salesFilter: Record<string, any> = { _id: { $in: validIds.map((sid: string) => toObjectId(sid)) } };
      const visibleUserIds = getVisibleUserIds(decoded);
      if (visibleUserIds !== null) {
        salesFilter.reportedByUserId = visibleUserIds.length === 1 ? visibleUserIds[0] : { $in: visibleUserIds };
      }
      const salesToAdd = await SalesReport.find(salesFilter).lean();

      const newParticipants = (salesToAdd as any[])
        .filter((s) => !existingSaleIds.has(String(s._id)))
        .map((s) => ({
          customerId: s.customerId || '',
          customerName: s.customerName || '',
          customerPhone: s.customerPhone || '',
          workshopName: s.workshopName || '',
          amount: Number(s.saleAmount) || 0,
          paymentMode: s.paymentMode || '',
          saleId: s._id,
        }));

      const merged = [...basis, ...newParticipants];
      const { totalAmount, participantCount } = computeTotals(merged);
      update.participants = merged;
      update.totalAmount = totalAmount;
      update.participantCount = participantCount;
    }

    const doc = await WorkshopEvent.findOneAndUpdate(
      { _id: toObjectId(id), ...accessFilter },
      { $set: update },
      { new: true }
    ).lean();
    if (!doc) throw new Error('Invalid: Event not found');
    return formatCrmSuccess(doc);
  } catch (error: any) {
    return handleCrmError(error, 'sales/events/[id] PUT');
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    const decoded = verifyAdmin(request);
    const accessFilter = buildEventAccessFilter(decoded);
    const { id } = await params;
    if (!isValidObjectId(id)) throw new Error('Invalid: bad event id');

    const WorkshopEvent = getWorkshopEvent();
    const doc = await WorkshopEvent.findOneAndDelete({ _id: toObjectId(id), ...accessFilter }).lean();
    if (!doc) throw new Error('Invalid: Event not found');
    return formatCrmSuccess({ deleted: true });
  } catch (error: any) {
    return handleCrmError(error, 'sales/events/[id] DELETE');
  }
}
