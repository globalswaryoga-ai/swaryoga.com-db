import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import mongoose from 'mongoose';

/**
 * Create or Update Lead from Payment Order
 * Called after successful payment to convert buyer to customer lead
 * 
 * Creates a new lead with:
 * - Status: "customer"
 * - Workshop name from order
 * - Customer payment details
 * - Auto-generated lead number
 */

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const {
      orderId,
      userId,
      firstName,
      lastName,
      email,
      phone,
      workshopName,
      workshopSlug,
      scheduleId,
      amount,
      paymentMethod,
      transactionId,
      mode,
      language,
      startDate,
      endDate,
    } = body;

    // Validate required fields
    if (!orderId || !firstName || !email || !phone) {
      return NextResponse.json(
        { error: 'Missing required fields: orderId, firstName, email, phone' },
        { status: 400 }
      );
    }

    await connectDB();

    // Get CRM database
    const crmDb = mongoose.connection.useDb(
      process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm',
      { useCache: true }
    );

    // Get Lead model
    const Lead = crmDb.model('Lead', new mongoose.Schema({
      leadNumber: { type: String, trim: true, unique: true, sparse: true, index: true },
      assignedToUserId: { type: String, trim: true, index: true },
      createdByUserId: { type: String, trim: true, index: true },
      name: { type: String, trim: true },
      email: { type: String, trim: true, lowercase: true },
      phoneNumber: { type: String, required: true, unique: true, index: true },
      status: {
        type: String,
        enum: ['lead', 'prospect', 'customer', 'inactive'],
        default: 'lead',
        index: true,
      },
      source: {
        type: String,
        enum: ['website', 'import', 'api', 'manual', 'whatsapp', 'referral', 'social', 'event'],
        default: 'manual',
        index: true,
      },
      workshopId: { type: mongoose.Schema.Types.ObjectId, sparse: true, index: true },
      workshopName: { type: String, sparse: true },
      sales: {
        stage: { type: String, default: 'enrolled' },
        enrolledAt: { type: Date },
        enrollmentNotes: { type: String, trim: true },
        workshop: {
          slug: { type: String, trim: true },
          scheduleId: { type: String, trim: true },
          startDate: { type: Date },
          endDate: { type: Date },
          mode: { type: String, enum: ['online', 'offline', 'hybrid', ''], default: '' },
          language: { type: String, trim: true },
        },
        payment: {
          status: { type: String, default: 'paid', index: true },
          currency: { type: String, trim: true },
          amount: { type: Number },
          paidAmount: { type: Number },
          method: { type: String, trim: true },
          provider: { type: String, trim: true },
          orderId: { type: String, trim: true },
          transactionId: { type: String, trim: true },
          paidAt: { type: Date },
          notes: { type: String, trim: true },
        },
      },
      inSales: { type: Boolean, default: true, index: true },
      metadata: mongoose.Schema.Types.Mixed,
    }, { timestamps: true, collection: 'leads' }), 'Lead');

    // Check if lead already exists by phone + order
    let existingLead = await Lead.findOne({
      phoneNumber: phone.replace(/\D/g, ''),
    });

    if (existingLead && existingLead.sales?.payment?.orderId === orderId) {
      // Lead already processed this order
      return NextResponse.json({
        success: true,
        message: 'Lead already exists for this order',
        leadId: existingLead._id,
        leadNumber: existingLead.leadNumber,
      });
    }

    // Get next lead number
    const CrmCounter = crmDb.model('CrmCounter', new mongoose.Schema({
      _id: { type: String, required: true },
      seq: { type: Number, required: true },
    }, { collection: 'crm_counters' }), 'CrmCounter');

    const counter = await CrmCounter.findByIdAndUpdate(
      'leadNumber',
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );

    const leadNumber = String(counter.seq).padStart(6, '0');

    // Create new customer lead
    const newLead = new Lead({
      leadNumber,
      createdByUserId: userId || 'system',
      name: `${firstName} ${lastName || ''}`.trim(),
      email: email.toLowerCase(),
      phoneNumber: phone,
      status: 'customer', // ✅ Set as customer immediately
      source: 'website',
      labels: ['website'],
      workshopName,
      sales: {
        stage: 'enrolled',
        enrolledAt: new Date(),
        enrollmentNotes: `Enrolled via payment (${paymentMethod})`,
        workshop: {
          slug: workshopSlug || '',
          scheduleId: scheduleId || '',
          startDate: startDate ? new Date(startDate) : undefined,
          endDate: endDate ? new Date(endDate) : undefined,
          mode: mode || '',
          language: language || '',
        },
        payment: {
          status: 'paid',
          currency: 'INR',
          amount: parseFloat(amount),
          paidAmount: parseFloat(amount),
          method: paymentMethod,
          provider: 'cashfree',
          orderId,
          transactionId: transactionId || '',
          paidAt: new Date(),
          notes: `Payment received via ${paymentMethod}`,
        },
      },
      inSales: true,
      metadata: {
        orderId,
        userId,
        paymentGateway: 'cashfree',
      },
    });

    await newLead.save();

    return NextResponse.json({
      success: true,
      message: 'Customer lead created successfully',
      leadId: newLead._id,
      leadNumber: newLead.leadNumber,
      status: newLead.status,
      workshopName: newLead.workshopName,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create customer lead';
    console.error('Create customer lead error:', message, error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
