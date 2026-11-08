import { NextRequest } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { handleCrmError, formatCrmSuccess } from '@/lib/crm-handlers';
import { bunnyExecute } from '@/lib/bunnyDatabase';

export const dynamic = 'force-dynamic';

export interface CandidateStudent {
  id: string;
  name: string;
  phone: string;
  email: string;
  workshopName: string;
  amount: number;
  paymentMode: string;
  city: string;
  country: string;
  source: 'leads' | 'sales' | 'workshops' | 'offer';
  details?: string;
}

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin) throw new Error('Unauthorized: Admin access required');

    const url = new URL(request.url);
    const source = (url.searchParams.get('source') || 'leads').toLowerCase();
    const q = (url.searchParams.get('q') || '').trim().toLowerCase();
    const limit = Math.min(Math.max(Number(url.searchParams.get('limit') || 100), 1), 300);

    let candidates: CandidateStudent[] = [];

    if (source === 'leads') {
      let sql = 'SELECT document_id, data_json FROM leads_sql';
      const args: any[] = [];
      if (q) {
        sql += ' WHERE lower(data_json) LIKE ?';
        args.push(`%${q}%`);
      }
      sql += ' ORDER BY created_at DESC LIMIT ?';
      args.push(limit);

      const res = await bunnyExecute({ sql, args });
      candidates = res.rows.map((row: any) => {
        let data: any = {};
        try {
          data = JSON.parse(String(row.data_json || '{}'));
        } catch {}
        const id = String(data._id?.$oid || data._id || row.document_id || data.leadNumber || '');
        return {
          id,
          name: String(data.name || 'Unnamed Lead').trim(),
          phone: String(data.phoneNumber || data.phone || '').trim(),
          email: String(data.email || '').trim(),
          workshopName: String(data.workshopName || '').trim(),
          amount: 0,
          paymentMode: 'upi',
          city: String(data.city || '').trim(),
          country: String(data.country || '').trim(),
          source: 'leads' as const,
          details: data.leadNumber ? `Lead #${data.leadNumber}` : 'Lead',
        };
      }).filter((c) => c.name && c.name !== 'Unnamed Lead');
    } else if (source === 'sales') {
      let sql = 'SELECT document_id, data_json, sale_amount, payment_mode, workshop_name FROM sales_reports_sql';
      const args: any[] = [];
      if (q) {
        sql += ' WHERE lower(data_json) LIKE ? OR lower(workshop_name) LIKE ?';
        args.push(`%${q}%`, `%${q}%`);
      }
      sql += ' ORDER BY sale_date DESC LIMIT ?';
      args.push(limit);

      const res = await bunnyExecute({ sql, args });
      candidates = res.rows.map((row: any) => {
        let data: any = {};
        try {
          data = JSON.parse(String(row.data_json || '{}'));
        } catch {}
        const id = String(data._id || row.document_id || '');
        return {
          id,
          name: String(data.customerName || data.name || 'Customer').trim(),
          phone: String(data.customerPhone || data.phone || '').trim(),
          email: String(data.email || '').trim(),
          workshopName: String(data.workshopName || row.workshop_name || '').trim(),
          amount: Number(data.saleAmount || row.sale_amount || 0),
          paymentMode: String(data.paymentMode || row.payment_mode || 'upi').toLowerCase(),
          city: String(data.city || '').trim(),
          country: String(data.country || '').trim(),
          source: 'sales' as const,
          details: data.saleAmount ? `₹${data.saleAmount} via ${data.paymentMode || 'UPI'}` : 'Sale Record',
        };
      }).filter((c) => c.name);
    } else if (source === 'workshops') {
      let sql = 'SELECT id, cohort_id, name, email, phone, whatsapp_number, source, metadata_json FROM workshop_students_sql';
      const args: any[] = [];
      if (q) {
        sql += ' WHERE lower(name) LIKE ? OR lower(email) LIKE ? OR lower(phone) LIKE ? OR lower(cohort_id) LIKE ?';
        args.push(`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`);
      }
      sql += ' ORDER BY created_at DESC LIMIT ?';
      args.push(limit);

      const res = await bunnyExecute({ sql, args });
      candidates = res.rows.map((row: any) => {
        const id = String(row.id || '');
        return {
          id,
          name: String(row.name || 'Student').trim(),
          phone: String(row.phone || row.whatsapp_number || '').trim(),
          email: String(row.email || '').trim(),
          workshopName: String(row.cohort_id || 'Workshop Batch').trim(),
          amount: 0,
          paymentMode: 'upi',
          city: '',
          country: '',
          source: 'workshops' as const,
          details: row.source ? `Workshop (${row.source})` : 'Workshop Student',
        };
      }).filter((c) => c.name);
    } else if (source === 'offer' || source === 'offers') {
      let sql = 'SELECT id, form_id, name, mobile, email, city, amount, payment_status FROM form_submissions';
      const args: any[] = [];
      if (q) {
        sql += ' WHERE lower(name) LIKE ? OR lower(mobile) LIKE ? OR lower(email) LIKE ? OR lower(form_id) LIKE ? OR lower(city) LIKE ?';
        args.push(`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`);
      }
      sql += ' ORDER BY created_at DESC LIMIT ?';
      args.push(limit);

      const res = await bunnyExecute({ sql, args });
      candidates = res.rows.map((row: any) => {
        const id = String(row.id || '');
        return {
          id,
          name: String(row.name || 'Applicant').trim(),
          phone: String(row.mobile || '').trim(),
          email: String(row.email || '').trim(),
          workshopName: String(row.form_id || 'Enquiry Form').trim(),
          amount: Number(row.amount || 0),
          paymentMode: 'upi',
          city: String(row.city || '').trim(),
          country: '',
          source: 'offer' as const,
          details: `Form: ${row.form_id || 'Enquiry'}${row.city ? ` (${row.city})` : ''}`,
        };
      }).filter((c) => c.name);
    }

    return formatCrmSuccess(candidates, { total: candidates.length, source, q });
  } catch (error: any) {
    return handleCrmError(error, 'sales/events/student-sources GET');
  }
}

