import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { getLead } from '@/lib/schemas/enterpriseSchemas';
import { normalizePhone } from '@/lib/whatsapp';
import { bunnyExecute } from '@/lib/bunny';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const q = url.searchParams.get('q');
    
    if (!q || q.trim() === '') {
      return NextResponse.json({ message: 'Query parameter is required' }, { status: 400 });
    }

    const query = q.trim();
    let phoneMatch = normalizePhone(query);
    if (!phoneMatch && query.replace(/[^0-9]/g, '').length >= 10) {
      phoneMatch = '+91' + query.replace(/[^0-9]/g, '').slice(-10);
    }
    
    // Search in Bunny form_submissions first
    let result = null;
    try {
      const res = await bunnyExecute({
        sql: `SELECT * FROM form_submissions WHERE id = ? OR email = ? OR mobile = ? OR mobile = ? LIMIT 1`,
        args: [query, query, query, phoneMatch || '']
      });
      
      if (res.rows && res.rows.length > 0) {
        const row = res.rows[0];
        result = {
          name: row.name,
          email: row.email,
          mobile: String(row.mobile).replace('+91', ''),
          gender: row.gender,
          city: row.city,
          dynamicAnswers: row.dynamic_answers_json ? JSON.parse(String(row.dynamic_answers_json)) : {}
        };
      }
    } catch (err) {
      console.error('Error fetching from BunnyDB:', err);
    }
    
    if (result) {
      return NextResponse.json({ success: true, data: result });
    }

    // Fallback: search in CRM Leads
    await connectDB();
    const Lead = getLead();
    
    const orClauses: any[] = [{ email: query }];
    if (phoneMatch) orClauses.push({ phoneNumber: phoneMatch });
    orClauses.push({ leadNumber: query });
    
    const lead = await Lead.findOne({ $or: orClauses }).sort({ createdAt: -1 }).lean();
    if (lead) {
      const meta = (lead as any).metadata?.lastEnquiry || (lead as any).metadata || {};
      result = {
        name: (lead as any).name || '',
        email: (lead as any).email || meta.email || '',
        mobile: ((lead as any).phoneNumber || '').replace('+91', ''),
        gender: meta.gender || '',
        city: meta.city || '',
        dynamicAnswers: meta.dynamicAnswers || {}
      };
      return NextResponse.json({ success: true, data: result });
    }

    return NextResponse.json({ success: false, message: 'No past submission found' }, { status: 404 });
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json({ success: false, message: 'Search failed' }, { status: 500 });
  }
}
