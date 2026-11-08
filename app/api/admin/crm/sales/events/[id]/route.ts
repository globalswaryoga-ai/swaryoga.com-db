import { NextRequest } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { handleCrmError, formatCrmSuccess, getVisibleUserIds } from '@/lib/crm-handlers';
import {
  getBunnyWorkshopEventById,
  updateBunnyWorkshopEvent,
  deleteBunnyWorkshopEvent,
} from '@/lib/bunnyWorkshopEventRepository';
import { bunnyExecute } from '@/lib/bunnyDatabase';

export const dynamic = 'force-dynamic';

function verifyAdmin(request: NextRequest) {
  const token = request.headers.get('authorization')?.slice('Bearer '.length);
  const decoded = verifyToken(token);
  if (!decoded?.isAdmin) throw new Error('Unauthorized: Admin access required');
  return decoded;
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const decoded = verifyAdmin(request);
    const visibleUserIds = getVisibleUserIds(decoded, request);
    const { id } = await params;
    if (!id || !id.trim()) throw new Error('Invalid: bad event id');

    const doc = await getBunnyWorkshopEventById(id, visibleUserIds);
    if (!doc) throw new Error('Invalid: Event not found');
    return formatCrmSuccess(doc);
  } catch (error: any) {
    return handleCrmError(error, 'sales/events/[id] GET');
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const decoded = verifyAdmin(request);
    const visibleUserIds = getVisibleUserIds(decoded, request);
    const { id } = await params;
    if (!id || !id.trim()) throw new Error('Invalid: bad event id');

    const existing = await getBunnyWorkshopEventById(id, visibleUserIds);
    if (!existing) throw new Error('Invalid: Event not found');

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
      addSaleIds,
    } = body;

    const update: Record<string, any> = {};
    if (startDate) {
      const start = new Date(startDate);
      if (isNaN(start.getTime())) throw new Error('Invalid: startDate is not a valid date');
      update.startDate = start.toISOString();
    }
    if (endDate !== undefined) update.endDate = endDate ? new Date(endDate).toISOString() : undefined;
    if (workshopName !== undefined) {
      if (!String(workshopName).trim()) throw new Error('Invalid: workshopName is required');
      update.workshopName = String(workshopName).trim();
    }
    if (workshopTime !== undefined) update.workshopTime = String(workshopTime || '').trim();
    if (workshopFees !== undefined) update.workshopFees = Number(workshopFees) || 0;
    if (language !== undefined) update.language = String(language || 'Hindi').trim();
    if (mode !== undefined) update.mode = String(mode || 'online').trim();
    if (teacher !== undefined) update.teacher = String(teacher || '').trim();
    if (coTeachers !== undefined) {
      update.coTeachers = Array.isArray(coTeachers)
        ? coTeachers.map(String).map((s) => s.trim()).filter(Boolean)
        : [];
    }
    if (organizers !== undefined) {
      update.organizers = Array.isArray(organizers)
        ? organizers.map(String).map((s) => s.trim()).filter(Boolean)
        : [];
    }
    if (notes !== undefined) update.notes = String(notes || '').trim();

    let mergedParticipants = existing.participants || [];

    if (participants !== undefined) {
      mergedParticipants = Array.isArray(participants)
        ? participants
            .filter((p: any) => p && (p.customerName || p.customerId || p.name))
            .map((p: any) => ({
              customerId: String(p.customerId || p.id || '').trim(),
              customerName: String(p.customerName || p.name || '').trim(),
              customerPhone: String(p.customerPhone || p.phone || '').trim(),
              workshopName: String(p.workshopName || update.workshopName || existing.workshopName).trim(),
              amount: Number(p.amount) || 0,
              paymentMode: String(p.paymentMode || 'upi').trim(),
              saleId: p.saleId ? String(p.saleId) : undefined,
              source: p.source ? String(p.source) : undefined,
              email: p.email ? String(p.email) : undefined,
              city: p.city ? String(p.city) : undefined,
              country: p.country ? String(p.country) : undefined,
            }))
        : [];
    }

    if (Array.isArray(addSaleIds) && addSaleIds.length > 0) {
      const existingSaleIds = new Set(
        mergedParticipants.map((p: any) => (p.saleId ? String(p.saleId) : '')).filter(Boolean)
      );

      const placeholders = addSaleIds.map(() => '?').join(',');
      const salesRes = await bunnyExecute({
        sql: `SELECT document_id, data_json, sale_amount, payment_mode, workshop_name FROM sales_reports_sql WHERE document_id IN (${placeholders})`,
        args: addSaleIds,
      });

      const newFromSales = salesRes.rows
        .filter((r: any) => !existingSaleIds.has(String(r.document_id)))
        .map((r: any) => {
          let s: any = {};
          try {
            s = JSON.parse(String(r.data_json || '{}'));
          } catch {}
          return {
            customerId: String(s.leadId || s.customerId || r.document_id || ''),
            customerName: String(s.customerName || s.name || 'Customer'),
            customerPhone: String(s.customerPhone || s.phone || ''),
            workshopName: String(s.workshopName || r.workshop_name || update.workshopName || existing.workshopName),
            amount: Number(s.saleAmount || r.sale_amount || 0),
            paymentMode: String(s.paymentMode || r.payment_mode || 'upi').toLowerCase(),
            saleId: String(r.document_id),
            source: 'sales',
          };
        });

      mergedParticipants = [...mergedParticipants, ...newFromSales];
    }

    update.participants = mergedParticipants;

    const doc = await updateBunnyWorkshopEvent(id, update, visibleUserIds);
    if (!doc) throw new Error('Invalid: Event not found');
    return formatCrmSuccess(doc);
  } catch (error: any) {
    return handleCrmError(error, 'sales/events/[id] PUT');
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const decoded = verifyAdmin(request);
    const visibleUserIds = getVisibleUserIds(decoded, request);
    const { id } = await params;
    if (!id || !id.trim()) throw new Error('Invalid: bad event id');

    const success = await deleteBunnyWorkshopEvent(id, visibleUserIds);
    if (!success) throw new Error('Invalid: Event not found or could not be deleted');
    return formatCrmSuccess({ deleted: true });
  } catch (error: any) {
    return handleCrmError(error, 'sales/events/[id] DELETE');
  }
}
