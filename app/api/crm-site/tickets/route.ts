import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import {
  HELPDESK_LIMITS,
  DEFAULT_CATEGORIES,
  generateTicketNumber,
  calculateSLADeadline,
} from '@/lib/crm-site/helpdeskConfig';

// GET - List tickets or get single ticket
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const decoded = verifyToken(token);
    if (!decoded) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const tenant = searchParams.get('tenant');
    const ticketId = searchParams.get('id');
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const assignee = searchParams.get('assignee');
    const limit = parseInt(searchParams.get('limit') || '50');
    const skip = parseInt(searchParams.get('skip') || '0');

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant required' }, { status: 400 });
    }

    await connectDB();
    const mongoose = (await import('mongoose')).default;
    const crmDb = mongoose.connection.useDb(process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm');
    const tenantsCol = crmDb.collection('crm_tenants');
    const ticketsCol = crmDb.collection('crm_tickets');

    const tenantDoc = await tenantsCol.findOne({ slug: tenant });
    if (!tenantDoc) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    const plan = tenantDoc.subscription?.plan || 'free';
    const limits = HELPDESK_LIMITS[plan] || HELPDESK_LIMITS.free;
    const tenantId = tenantDoc._id.toString();

    if (!limits.enabled) {
      return NextResponse.json({ error: 'Help desk not available in your plan' }, { status: 403 });
    }

    // Get single ticket
    if (ticketId) {
      const ticket = await ticketsCol.findOne({ id: ticketId, tenantId });
      if (!ticket) {
        return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
      }
      return NextResponse.json({ ticket, categories: DEFAULT_CATEGORIES });
    }

    // Build query
    const query: any = { tenantId };
    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (assignee) query.assignedTo = assignee;

    const [tickets, total, stats] = await Promise.all([
      ticketsCol.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).toArray(),
      ticketsCol.countDocuments(query),
      ticketsCol.aggregate([
        { $match: { tenantId } },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
          },
        },
      ]).toArray(),
    ]);

    const statusStats = {
      open: 0,
      pending: 0,
      in_progress: 0,
      resolved: 0,
      closed: 0,
    };
    stats.forEach((s: any) => {
      if (s._id) statusStats[s._id as keyof typeof statusStats] = s.count;
    });

    return NextResponse.json({
      tickets,
      total,
      stats: statusStats,
      categories: DEFAULT_CATEGORIES,
      plan,
      limits,
    });
  } catch (error: any) {
    console.error('Tickets GET error:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch tickets' }, { status: 500 });
  }
}

// POST - Create ticket
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      tenantSlug,
      subject,
      description,
      priority = 'medium',
      category = 'general',
      customerName,
      customerEmail,
      customerId,
      source = 'manual',
    } = body;

    if (!tenantSlug || !subject || !customerEmail) {
      return NextResponse.json({ error: 'Tenant, subject, and customer email required' }, { status: 400 });
    }

    await connectDB();
    const mongoose = (await import('mongoose')).default;
    const crmDb = mongoose.connection.useDb(process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm');
    const tenantsCol = crmDb.collection('crm_tenants');
    const ticketsCol = crmDb.collection('crm_tickets');
    const countersCol = crmDb.collection('crm_counters');

    const tenant = await tenantsCol.findOne({ slug: tenantSlug });
    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    const plan = tenant.subscription?.plan || 'free';
    const limits = HELPDESK_LIMITS[plan] || HELPDESK_LIMITS.free;
    const tenantId = tenant._id.toString();

    if (!limits.enabled) {
      return NextResponse.json({ error: 'Help desk not available in your plan' }, { status: 403 });
    }

    // Check ticket limit
    const ticketCount = await ticketsCol.countDocuments({ tenantId });
    if (ticketCount >= limits.maxTickets) {
      return NextResponse.json({ error: 'Ticket limit reached. Please upgrade your plan.' }, { status: 403 });
    }

    // Get next ticket number
    const counter = await countersCol.findOneAndUpdate(
      { _id: `tickets_${tenantId}` } as any,
      { $inc: { seq: 1 } },
      { upsert: true, returnDocument: 'after' }
    ) as any;
    const ticketNumber = generateTicketNumber(counter?.seq || 1);

    // Find category config
    const categoryConfig = DEFAULT_CATEGORIES.find(c => c.id === category) || DEFAULT_CATEGORIES[0];

    const ticketId = `tkt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date();

    const newTicket = {
      id: ticketId,
      tenantId,
      ticketNumber,
      subject,
      description: description || '',
      status: 'open',
      priority,
      category,
      customerId: customerId || null,
      customerName: customerName || customerEmail.split('@')[0],
      customerEmail,
      assignedTo: categoryConfig.defaultAssignee || null,
      tags: [],
      source,
      slaDeadline: limits.sla ? calculateSLADeadline(priority, categoryConfig, now) : null,
      firstResponseAt: null,
      resolvedAt: null,
      messages: [
        {
          id: `msg_${Date.now()}`,
          type: 'customer',
          content: description || subject,
          authorName: customerName || customerEmail.split('@')[0],
          isInternal: false,
          createdAt: now,
        },
      ],
      createdAt: now,
      updatedAt: now,
    };

    await ticketsCol.insertOne(newTicket);

    return NextResponse.json({ ticket: newTicket, message: 'Ticket created successfully' });
  } catch (error: any) {
    console.error('Ticket POST error:', error);
    return NextResponse.json({ error: error.message || 'Failed to create ticket' }, { status: 500 });
  }
}

// PATCH - Update ticket (status, assignee, add message)
export async function PATCH(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const decoded = verifyToken(token);
    if (!decoded) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    const body = await request.json();
    const { tenantSlug, ticketId, action, ...data } = body;

    if (!tenantSlug || !ticketId) {
      return NextResponse.json({ error: 'Tenant and ticketId required' }, { status: 400 });
    }

    await connectDB();
    const mongoose = (await import('mongoose')).default;
    const crmDb = mongoose.connection.useDb(process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm');
    const tenantsCol = crmDb.collection('crm_tenants');
    const ticketsCol = crmDb.collection('crm_tickets');

    const tenant = await tenantsCol.findOne({ slug: tenantSlug });
    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    const tenantId = tenant._id.toString();
    const ticket = await ticketsCol.findOne({ id: ticketId, tenantId });
    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    const updates: any = { updatedAt: new Date() };

    // Handle different actions
    if (action === 'reply') {
      // Add a reply message
      const message = {
        id: `msg_${Date.now()}`,
        type: data.isAgent ? 'agent' : 'customer',
        content: data.content,
        authorId: data.authorId || null,
        authorName: data.authorName || 'Agent',
        isInternal: data.isInternal || false,
        createdAt: new Date(),
      };

      // Track first response
      if (data.isAgent && !ticket.firstResponseAt) {
        updates.firstResponseAt = new Date();
      }

      await ticketsCol.updateOne(
        { id: ticketId },
        {
          $push: { messages: message },
          $set: updates,
        }
      );
    } else {
      // Update fields
      if (data.status !== undefined) {
        updates.status = data.status;
        if (data.status === 'resolved' && !ticket.resolvedAt) {
          updates.resolvedAt = new Date();
        }
      }
      if (data.priority !== undefined) updates.priority = data.priority;
      if (data.assignedTo !== undefined) updates.assignedTo = data.assignedTo;
      if (data.tags !== undefined) updates.tags = data.tags;

      await ticketsCol.updateOne({ id: ticketId }, { $set: updates });
    }

    const updated = await ticketsCol.findOne({ id: ticketId });
    return NextResponse.json({ ticket: updated, message: 'Ticket updated' });
  } catch (error: any) {
    console.error('Ticket PATCH error:', error);
    return NextResponse.json({ error: error.message || 'Failed to update ticket' }, { status: 500 });
  }
}

// DELETE - Delete ticket
export async function DELETE(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const decoded = verifyToken(token);
    if (!decoded) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    const body = await request.json();
    const { tenantSlug, ticketId } = body;

    if (!tenantSlug || !ticketId) {
      return NextResponse.json({ error: 'Tenant and ticketId required' }, { status: 400 });
    }

    await connectDB();
    const mongoose = (await import('mongoose')).default;
    const crmDb = mongoose.connection.useDb(process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm');
    const tenantsCol = crmDb.collection('crm_tenants');
    const ticketsCol = crmDb.collection('crm_tickets');

    const tenant = await tenantsCol.findOne({ slug: tenantSlug });
    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    await ticketsCol.deleteOne({ id: ticketId, tenantId: tenant._id.toString() });

    return NextResponse.json({ message: 'Ticket deleted' });
  } catch (error: any) {
    console.error('Ticket DELETE error:', error);
    return NextResponse.json({ error: error.message || 'Failed to delete ticket' }, { status: 500 });
  }
}
