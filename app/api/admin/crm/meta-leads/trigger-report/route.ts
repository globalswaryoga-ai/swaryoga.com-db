import { NextRequest, NextResponse } from 'next/server';
import { getWhatsAppScheduledJob } from '@/lib/schemas/enterpriseSchemas';
import { getModel } from '@/lib/mongodb';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const token = authHeader.slice('Bearer '.length);
    if (!verifyToken(token)?.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 401 });
    }

    const workshopId = new URL(request.url).searchParams.get('workshopId');
    if (!workshopId) return NextResponse.json({ error: 'Missing workshopId' }, { status: 400 });

    await connectDB();
    const WhatsAppScheduledJob = getWhatsAppScheduledJob();
    const WhatsAppMessage = getModel('WhatsAppMessage'); 
    const Lead = getModel('Lead');

    // Find all jobs for this workshop
    const jobs = await WhatsAppScheduledJob.find({ 'metadata.workshopId': workshopId }).lean();
    
    const reportData = await Promise.all(jobs.map(async (job: any) => {
        // Resolve lead details
        const leadId = job.targetLeadIds?.[0];
        let leadData = null;
        if (leadId) {
            leadData = await Lead.findById(leadId, 'name phoneNumber status email').lean();
        }

        let messageStatus = job.status === 'active' ? 'pending' : job.status;
        let messageReason = '';
        
        const msg = await WhatsAppMessage.findOne({ 'metadata.scheduler.jobId': job._id.toString() }).sort({ createdAt: -1 }).lean();
        if (msg) {
            messageStatus = msg.status;
            messageReason = msg.failureReason || '';
            
            if (messageReason.toLowerCase().includes('not a valid whatsapp') || messageReason.toLowerCase().includes('not exist') || messageReason.toLowerCase().includes('131026')) {
                messageStatus = 'wrong_number';
            }
            if (messageReason.toLowerCase().includes('spam') || messageReason.toLowerCase().includes('blocked') || messageReason.toLowerCase().includes('131031')) {
                messageStatus = 'blocked';
            }
        }

        return {
            id: job._id.toString(),
            leadName: leadData?.name || 'Unknown',
            phone: leadData?.phoneNumber || job.targetPhone || 'Unknown',
            stage: job.metadata?.triggerStage || 'Unknown',
            template: job.metadata?.templateName || 'Unknown',
            scheduledAt: job.nextRunAt,
            status: messageStatus, 
            reason: messageReason
        };
    }));

    reportData.sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime());

    return NextResponse.json({ success: true, data: reportData });
  } catch (error: any) {
    console.error('Error fetching trigger report:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
