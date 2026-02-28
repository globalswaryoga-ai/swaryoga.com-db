/**
 * AI Call Templates API
 * GET    - List all call prompt templates (filter by language, category)
 * POST   - Create a new template
 * PUT    - Update template (edit, submit for approval, approve/reject)
 * DELETE - Delete a template
 */
import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { apiError, apiSuccess } from '@/lib/api-error';
import { getAICallTemplate } from '@/lib/schemas/enterpriseSchemas';

export const dynamic = 'force-dynamic';

// ── 6 Outbound stages ──
const OUTBOUND_STAGES = [
  { stageOrder: 1, key: 'ob_welcome',    name: 'Welcome Call',       description: 'First call to a new lead — introduce Sakshi, collect questions' },
  { stageOrder: 2, key: 'ob_follow_up',  name: 'Follow-Up',         description: 'Follow up with leads who showed interest earlier' },
  { stageOrder: 3, key: 'ob_answer',     name: 'Answer Questions',  description: 'Call back with answers to previously asked questions' },
  { stageOrder: 4, key: 'ob_workshop',   name: 'Workshop Reminder', description: 'Remind about upcoming workshop enrollment' },
  { stageOrder: 5, key: 'ob_collect',    name: 'Collect Info',      description: 'Collect missing profile info — email, city, language' },
  { stageOrder: 6, key: 'ob_payment',    name: 'Payment Reminder',  description: 'Gentle reminder about pending payment' },
];

// ── 6 Inbound stages ──
const INBOUND_STAGES = [
  { stageOrder: 1, key: 'ib_greeting',   name: 'Greeting',          description: 'Initial greeting when someone calls Swar Yoga' },
  { stageOrder: 2, key: 'ib_enquiry',    name: 'Enquiry',           description: 'Handle questions about workshops, yoga, pricing' },
  { stageOrder: 3, key: 'ib_support',    name: 'Support',           description: 'Help existing students with issues or concerns' },
  { stageOrder: 4, key: 'ib_booking',    name: 'Booking',           description: 'Assist with workshop booking and enrollment' },
  { stageOrder: 5, key: 'ib_feedback',   name: 'Feedback',          description: 'Collect feedback from workshop attendees' },
  { stageOrder: 6, key: 'ib_escalation', name: 'Escalation',        description: 'Handle urgent or complex requests, escalate to Mohan Sir' },
];

const LANGUAGES = ['hi', 'en', 'mr', 'ne', 'other'];

/**
 * Seed default templates if collection is empty.
 * Creates 6 outbound + 6 inbound stages × 5 languages = 60 templates.
 */
async function seedDefaults(createdBy: string) {
  const AICallTemplate = getAICallTemplate();
  const allStages = [
    ...OUTBOUND_STAGES.map(s => ({ ...s, category: 'outbound' })),
    ...INBOUND_STAGES.map(s => ({ ...s, category: 'inbound' })),
  ];

  const docs: any[] = [];
  for (const stage of allStages) {
    for (const lang of LANGUAGES) {
      docs.push({
        key: stage.key,
        name: stage.name,
        description: stage.description,
        category: stage.category,
        language: lang,
        stageOrder: stage.stageOrder,
        promptText: '',
        voiceRecordingUrl: '',
        voiceRecordingName: '',
        approvalStatus: 'draft',
        isActive: false,
        isDefault: true,
        variables: ['leadName', 'lang', 'workshopName'],
        tags: [],
        createdBy,
      });
    }
  }

  await AICallTemplate.insertMany(docs);
}

/**
 * GET /api/admin/crm/calls/templates?language=hi&category=outbound
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin) return apiError('UNAUTHORIZED');

    await connectDB();
    const AICallTemplate = getAICallTemplate();

    const count = await AICallTemplate.countDocuments();
    if (count === 0) {
      await seedDefaults(decoded.userId || decoded.email || 'system');
    }

    const language = request.nextUrl.searchParams.get('language');
    const category = request.nextUrl.searchParams.get('category');

    const query: any = {};
    if (language) query.language = language;
    if (category) query.category = category;

    const templates = await AICallTemplate.find(query)
      .sort({ category: 1, stageOrder: 1 })
      .lean();

    return apiSuccess({ templates });
  } catch (err: any) {
    console.error('[call-templates GET]', err);
    return apiError('SERVER_ERROR', err.message);
  }
}

/**
 * POST /api/admin/crm/calls/templates
 * Create a new template
 */
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin) return apiError('UNAUTHORIZED');

    const body = await request.json();
    if (!body.key || !body.name || !body.category || !body.language) {
      return apiError('VALIDATION_ERROR', 'key, name, category, and language are required');
    }

    await connectDB();
    const AICallTemplate = getAICallTemplate();

    const existing = await AICallTemplate.findOne({ key: body.key, language: body.language });
    if (existing) {
      return apiError('VALIDATION_ERROR', `Template "${body.key}" for ${body.language} already exists`);
    }

    const template = await AICallTemplate.create({
      ...body,
      approvalStatus: 'draft',
      isActive: false,
      isDefault: false,
      createdBy: decoded.userId || decoded.email || 'admin',
      updatedBy: decoded.userId || decoded.email || 'admin',
    });

    return apiSuccess({ template }, 201);
  } catch (err: any) {
    console.error('[call-templates POST]', err);
    return apiError('SERVER_ERROR', err.message);
  }
}

/**
 * PUT /api/admin/crm/calls/templates
 * Actions: edit, submit (for approval), approve, reject
 * Body: { id, action?, ...fields }
 *   action = 'submit' | 'approve' | 'reject' | undefined (just edit)
 */
export async function PUT(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin) return apiError('UNAUTHORIZED');

    const body = await request.json();
    if (!body.id) return apiError('VALIDATION_ERROR', 'id is required');

    await connectDB();
    const AICallTemplate = getAICallTemplate();

    const existing = await AICallTemplate.findById(body.id);
    if (!existing) return apiError('NOT_FOUND', 'Template not found');

    const adminId = decoded.userId || decoded.email || 'admin';
    const action = body.action;

    if (action === 'submit') {
      // Submit for admin approval
      if (!existing.promptText && !existing.voiceRecordingUrl) {
        return apiError('VALIDATION_ERROR', 'Add text or voice recording before submitting');
      }
      existing.approvalStatus = 'pending';
      existing.submittedAt = new Date();
      existing.updatedBy = adminId;
      await existing.save();
      return apiSuccess({ template: existing.toObject() });
    }

    if (action === 'approve') {
      existing.approvalStatus = 'approved';
      existing.isActive = true;
      existing.approvedBy = adminId;
      existing.approvedAt = new Date();
      existing.approvalNote = body.approvalNote || '';
      existing.updatedBy = adminId;
      await existing.save();
      return apiSuccess({ template: existing.toObject() });
    }

    if (action === 'reject') {
      existing.approvalStatus = 'rejected';
      existing.isActive = false;
      existing.approvedBy = adminId;
      existing.approvedAt = new Date();
      existing.approvalNote = body.approvalNote || '';
      existing.updatedBy = adminId;
      await existing.save();
      return apiSuccess({ template: existing.toObject() });
    }

    // Regular edit (draft mode)
    const { id, action: _a, ...updates } = body;
    // If editing content, reset approval back to draft
    if (updates.promptText !== undefined || updates.voiceRecordingUrl !== undefined) {
      updates.approvalStatus = 'draft';
      updates.isActive = false;
    }
    updates.updatedBy = adminId;

    const template = await AICallTemplate.findByIdAndUpdate(id, updates, { new: true }).lean();
    return apiSuccess({ template });
  } catch (err: any) {
    console.error('[call-templates PUT]', err);
    return apiError('SERVER_ERROR', err.message);
  }
}

/**
 * DELETE /api/admin/crm/calls/templates
 */
export async function DELETE(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin) return apiError('UNAUTHORIZED');

    const body = await request.json();
    if (!body.id) return apiError('VALIDATION_ERROR', 'id is required');

    await connectDB();
    const AICallTemplate = getAICallTemplate();

    const template = await AICallTemplate.findById(body.id);
    if (!template) return apiError('NOT_FOUND', 'Template not found');

    await AICallTemplate.findByIdAndDelete(body.id);
    return apiSuccess({ deleted: true });
  } catch (err: any) {
    console.error('[call-templates DELETE]', err);
    return apiError('SERVER_ERROR', err.message);
  }
}
