import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { handleCrmError, formatCrmSuccess, isValidObjectId } from '@/lib/crm-handlers';
import { getWorkshopEvent } from '@/lib/schemas/enterpriseSchemas';

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

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    verifyAdmin(request);
    const { id } = await params;
    if (!isValidObjectId(id)) throw new Error('Invalid: bad event id');

    const WorkshopEvent = getWorkshopEvent();
    const doc = await WorkshopEvent.findById(id).lean();
    if (!doc) throw new Error('Invalid: Event not found');
    return formatCrmSuccess(doc);
  } catch (error: any) {
    return handleCrmError(error, 'sales/events/[id] GET');
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    verifyAdmin(request);
    const { id } = await params;
    if (!isValidObjectId(id)) throw new Error('Invalid: bad event id');

    const WorkshopEvent = getWorkshopEvent();
    const body = await request.json();
    const { startDate, endDate, workshopName, workshopTime, workshopFees, notes, participants } = body;

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

    const doc = await WorkshopEvent.findByIdAndUpdate(id, { $set: update }, { new: true }).lean();
    if (!doc) throw new Error('Invalid: Event not found');
    return formatCrmSuccess(doc);
  } catch (error: any) {
    return handleCrmError(error, 'sales/events/[id] PUT');
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    verifyAdmin(request);
    const { id } = await params;
    if (!isValidObjectId(id)) throw new Error('Invalid: bad event id');

    const WorkshopEvent = getWorkshopEvent();
    const doc = await WorkshopEvent.findByIdAndDelete(id).lean();
    if (!doc) throw new Error('Invalid: Event not found');
    return formatCrmSuccess({ deleted: true });
  } catch (error: any) {
    return handleCrmError(error, 'sales/events/[id] DELETE');
  }
}
