import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import mongoose from 'mongoose';
import { ObjectId } from 'mongodb';
import { getWhatsAppScheduledJob } from '@/lib/schemas/enterpriseSchemas';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { ids, status, wtSettings, workshopId, bulkUpdates } = body;

    if (!bulkUpdates && (!ids || !ids.length || !status)) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    await connectDB();
    const db = mongoose.connection.getClient().db('swaryoga-ai');
    
    // Convert string IDs to ObjectIds
    const objectIds = ids.map((id: string) => {
        try { return new ObjectId(id); }
        catch (e) { return id; }
    });

    let updatedIds = ids || [];
    
    if (bulkUpdates && bulkUpdates.length > 0) {
      updatedIds = bulkUpdates.map((u: any) => u.id);
      
      const bulkOps = bulkUpdates.map((u: any) => ({
        updateOne: {
          filter: { $or: [{ _id: { $in: [u.id] } }, { id: u.id }] },
          update: { 
            $set: { 
              status: u.status, 
              updatedAt: new Date().toISOString(),
              ...(u.reason ? { "metadata.ai9Reason": u.reason } : {})
            } 
          }
        }
      }));
      await db.collection('leads').bulkWrite(bulkOps);
    } else {
      const result = await db.collection('leads').updateMany(
        { $or: [ { _id: { $in: objectIds } }, { id: { $in: ids } } ] },
        { $set: { status: status, updatedAt: new Date().toISOString() } }
      );
    }

    // Auto-schedule WhatsApp Trigger Jobs
    if (wtSettings) {
      const stageConfig = status === 'approved' ? wtSettings.approved : status === 'pending' ? wtSettings.pending : null;
      if (stageConfig && stageConfig.template) {
        const delayMs = Math.max(0, parseInt(stageConfig.delay) || 0) * 60 * 1000;
        const nextRunAt = new Date(Date.now() + delayMs);
        
        const WhatsAppScheduledJob = getWhatsAppScheduledJob();
        
        const jobs = updatedIds.map((id: string) => ({
          name: `WT Trigger: ${status} - ${stageConfig.template}`,
          createdByUserId: 'system',
          status: 'active',
          targetType: 'leadIds',
          targetLeadIds: [id],
          provider: 'meta',
          messageType: 'template',
          metadata: { templateName: stageConfig.template, workshopId, triggerStage: status },
          nextRunAt,
          maxRuns: 1,
        }));
        
        if (jobs.length > 0) {
          await WhatsAppScheduledJob.insertMany(jobs);
        }
      }
    }

    return NextResponse.json({ success: true, modifiedCount: result.modifiedCount });
  } catch (error: any) {
    console.error('Error updating bulk leads status:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
