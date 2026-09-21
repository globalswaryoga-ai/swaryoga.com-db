import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { apiError, apiSuccess } from '@/lib/api-error';
import { bunnyExecute } from '@/lib/bunnyDatabase';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) return apiError('UNAUTHORIZED');
    
    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    if (!decoded || !decoded.isAdmin) return apiError('FORBIDDEN', 'Admin access required');
    
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || 'pending';
    const category = searchParams.get('category');
    
    // Fetch from BunnyDB
    let expsArgs: any[] = [];
    let expsCond: string[] = [];
    if (status !== 'all') {
      expsCond.push("json_extract(data_json, '$.status') = ?");
      expsArgs.push(status);
    }
    const expsWhere = expsCond.length ? "WHERE " + expsCond.join(" AND ") : "";
    
    let allSubmissions: any[] = [];
    
    try {
      const expsRes = await bunnyExecute({
        sql: `SELECT data_json FROM community_experiences_sql ${expsWhere} ORDER BY created_at DESC`,
        args: expsArgs
      });
      
      const qsRes = await bunnyExecute({
        sql: `SELECT data_json FROM community_questions_sql ${expsWhere} ORDER BY created_at DESC`,
        args: expsArgs
      });
      
      allSubmissions = [
        ...expsRes.rows.map((r: any) => JSON.parse(String(r.data_json))),
        ...qsRes.rows.map((r: any) => JSON.parse(String(r.data_json)))
      ];
    } catch (dbErr) {
      console.error('[Admin Submissions List] DB error (likely missing table), returning empty', dbErr);
    }
    
    if (category && category !== 'all') {
      allSubmissions = allSubmissions.filter(s => s.category === category);
    }
    
    allSubmissions.sort((a, b) => new Date(b.createdAt || b.updatedAt).getTime() - new Date(a.createdAt || a.updatedAt).getTime());
    
    const statusCounts = { pending: 0, approved: 0, rejected: 0, posted: 0 };
    allSubmissions.forEach(s => {
      const sStat = s.status || 'pending';
      if (sStat in statusCounts) {
        statusCounts[sStat as keyof typeof statusCounts]++;
      }
    });
    
    return apiSuccess({ submissions: allSubmissions, counts: statusCounts });
  } catch (error) {
    console.error('Get admin submissions error:', error);
    return apiError('SERVER_ERROR', 'Failed to fetch submissions');
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) return apiError('UNAUTHORIZED');
    
    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    if (!decoded || !decoded.isAdmin) return apiError('FORBIDDEN', 'Admin access required');
    
    const body = await req.json();
    const { submissionId, status, adminNotes, answer } = body;
    
    if (!submissionId) return apiError('VALIDATION_ERROR', 'Submission ID required');
    
    let table = 'community_experiences_sql';
    let res = await bunnyExecute({ sql: `SELECT data_json FROM ${table} WHERE document_id = ?`, args: [submissionId] });
    
    if (res.rows.length === 0) {
      table = 'community_questions_sql';
      res = await bunnyExecute({ sql: `SELECT data_json FROM ${table} WHERE document_id = ?`, args: [submissionId] });
    }
    
    if (res.rows.length === 0) return apiError('NOT_FOUND', 'Submission not found');
    
    const doc = JSON.parse(String(res.rows[0].data_json));
    if (status) doc.status = status;
    if (adminNotes !== undefined) doc.adminNotes = adminNotes;
    if (answer !== undefined) doc.answer = answer;
    
    doc.updatedAt = new Date().toISOString();
    doc.reviewedBy = decoded.userId;
    doc.reviewedAt = new Date().toISOString();
    if (status === 'posted') doc.postedAt = new Date().toISOString();
    
    await bunnyExecute({
      sql: `UPDATE ${table} SET data_json = ?, updated_at = ? WHERE document_id = ?`,
      args: [JSON.stringify(doc), doc.updatedAt, submissionId]
    });
    
    return apiSuccess({ submission: doc, message: 'Submission updated' });
  } catch (error) {
    console.error('Update submission error:', error);
    return apiError('SERVER_ERROR', 'Failed to update submission');
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) return apiError('UNAUTHORIZED');
    
    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    if (!decoded || !decoded.isAdmin) return apiError('FORBIDDEN', 'Admin access required');
    
    const { searchParams } = new URL(req.url);
    const submissionId = searchParams.get('id');
    
    if (!submissionId) return apiError('VALIDATION_ERROR', 'Submission ID required');
    
    let result = await bunnyExecute({ sql: 'DELETE FROM community_experiences_sql WHERE document_id = ?', args: [submissionId] });
    if (!result.rowsAffected || result.rowsAffected === 0) {
      result = await bunnyExecute({ sql: 'DELETE FROM community_questions_sql WHERE document_id = ?', args: [submissionId] });
    }
    
    if (!result.rowsAffected || result.rowsAffected === 0) return apiError('NOT_FOUND', 'Submission not found');
    
    return apiSuccess({ message: 'Submission deleted' });
  } catch (error) {
    console.error('Delete submission error:', error);
    return apiError('SERVER_ERROR', 'Failed to delete submission');
  }
}
