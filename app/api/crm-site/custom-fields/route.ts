// Custom Fields API for CRM SaaS
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { 


  CUSTOM_FIELD_LIMITS, 
  SYSTEM_FIELDS,
  generateFieldKey,
  CustomField 
} from '@/lib/crm-site/customFieldsConfig';

export const dynamic = 'force-dynamic';


// GET - List custom fields
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.slice(7);
    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const entity = searchParams.get('entity');
    const includeSystem = searchParams.get('includeSystem') === 'true';
    const tenantSlug = searchParams.get('tenant') || (decoded as any).tenantSlug;

    if (!tenantSlug) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 400 });
    }

    await connectDB();
    const mongoose = (await import('mongoose')).default;
    const crmDb = mongoose.connection.useDb(process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm');
    const collection = crmDb.collection('custom_fields');

    // Build query
    const query: any = { tenantSlug, isActive: true };
    if (entity) {
      query.entity = entity;
    }

    const fields = await collection.find(query).sort({ sortOrder: 1 }).toArray();

    // Include system fields if requested
    let result: any[] = fields;
    if (includeSystem && entity) {
      const systemFields = SYSTEM_FIELDS[entity] || [];
      result = [
        ...systemFields.map((f, i) => ({ ...f, id: f.key, sortOrder: i, isActive: true })),
        ...fields
      ];
    }

    // Get tenant plan
    const tenant = await crmDb.collection('crm_tenants').findOne({ slug: tenantSlug });
    const tenantPlan = tenant?.plan || 'free';
    const limits = CUSTOM_FIELD_LIMITS[tenantPlan] || CUSTOM_FIELD_LIMITS.free;

    return NextResponse.json({
      fields: result,
      total: fields.length,
      limits: {
        maxFields: limits.maxFields,
        used: fields.length,
        remaining: limits.maxFields - fields.length,
        allowedTypes: limits.fieldTypes,
        hasValidation: limits.validation,
        hasGroups: limits.groups,
      },
    });
  } catch (error) {
    console.error('Custom fields GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch custom fields' }, { status: 500 });
  }
}

// POST - Create custom field
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.slice(7);
    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const body = await request.json();
    const { name, type, entity, description, required, unique, defaultValue, options, showInList, showInForm, min, max, minLength, maxLength, pattern } = body;
    const tenantSlug = body.tenant || (decoded as any).tenantSlug;

    if (!tenantSlug) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 400 });
    }

    // Validate required fields
    if (!name || !type || !entity) {
      return NextResponse.json({ error: 'Name, type, and entity are required' }, { status: 400 });
    }

    await connectDB();
    const mongoose = (await import('mongoose')).default;
    const crmDb = mongoose.connection.useDb(process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm');
    const collection = crmDb.collection('custom_fields');

    // Get tenant plan
    const tenant = await crmDb.collection('crm_tenants').findOne({ slug: tenantSlug });
    const tenantPlan = tenant?.plan || 'free';
    const limits = CUSTOM_FIELD_LIMITS[tenantPlan] || CUSTOM_FIELD_LIMITS.free;

    // Check if field type is allowed
    if (!limits.fieldTypes.includes(type)) {
      return NextResponse.json({ error: `Field type "${type}" is not available in your plan. Upgrade to access more field types.` }, { status: 403 });
    }

    // Check field count limit
    const currentCount = await collection.countDocuments({ tenantSlug, isActive: true });
    if (currentCount >= limits.maxFields) {
      return NextResponse.json({ error: `You have reached the maximum of ${limits.maxFields} custom fields. Upgrade your plan to add more.` }, { status: 403 });
    }

    // Check for duplicate name
    const existing = await collection.findOne({
      tenantSlug,
      entity,
      name: { $regex: new RegExp(`^${name}$`, 'i') },
      isActive: true,
    });
    if (existing) {
      return NextResponse.json({ error: 'A field with this name already exists for this entity' }, { status: 400 });
    }

    // Generate unique key
    const key = generateFieldKey(name);

    const now = new Date();
    const field: any = {
      tenantSlug,
      name,
      key,
      type,
      entity,
      description: description || '',
      required: required || false,
      unique: unique || false,
      defaultValue,
      options: type === 'select' || type === 'multiselect' ? options || [] : undefined,
      showInList: showInList ?? true,
      showInForm: showInForm ?? true,
      sortOrder: currentCount + 1,
      isActive: true,
      isSystem: false,
      createdAt: now,
      updatedAt: now,
    };

    // Add validation rules if allowed by plan
    if (limits.validation) {
      if (min !== undefined) field.min = min;
      if (max !== undefined) field.max = max;
      if (minLength !== undefined) field.minLength = minLength;
      if (maxLength !== undefined) field.maxLength = maxLength;
      if (pattern) field.pattern = pattern;
    }

    const result = await collection.insertOne(field);

    return NextResponse.json({
      message: 'Custom field created successfully',
      field: { ...field, id: result.insertedId.toString() },
    }, { status: 201 });
  } catch (error) {
    console.error('Custom field POST error:', error);
    return NextResponse.json({ error: 'Failed to create custom field' }, { status: 500 });
  }
}

// PATCH - Update custom field
export async function PATCH(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.slice(7);
    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const body = await request.json();
    const { id, name, description, required, defaultValue, options, showInList, showInForm, sortOrder, min, max, minLength, maxLength, pattern, isActive } = body;
    const tenantSlug = body.tenant || (decoded as any).tenantSlug;

    if (!id) {
      return NextResponse.json({ error: 'Field ID is required' }, { status: 400 });
    }

    if (!tenantSlug) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 400 });
    }

    await connectDB();
    const mongoose = (await import('mongoose')).default;
    const crmDb = mongoose.connection.useDb(process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm');
    const collection = crmDb.collection('custom_fields');

    // Find existing field
    const existing = await collection.findOne({
      _id: new mongoose.Types.ObjectId(id),
      tenantSlug,
    });

    if (!existing) {
      return NextResponse.json({ error: 'Field not found' }, { status: 404 });
    }

    if (existing.isSystem) {
      return NextResponse.json({ error: 'System fields cannot be modified' }, { status: 403 });
    }

    // Get tenant plan
    const tenant = await crmDb.collection('crm_tenants').findOne({ slug: tenantSlug });
    const tenantPlan = tenant?.plan || 'free';
    const limits = CUSTOM_FIELD_LIMITS[tenantPlan] || CUSTOM_FIELD_LIMITS.free;

    // Build update
    const update: any = { updatedAt: new Date() };
    if (name !== undefined) update.name = name;
    if (description !== undefined) update.description = description;
    if (required !== undefined) update.required = required;
    if (defaultValue !== undefined) update.defaultValue = defaultValue;
    if (options !== undefined) update.options = options;
    if (showInList !== undefined) update.showInList = showInList;
    if (showInForm !== undefined) update.showInForm = showInForm;
    if (sortOrder !== undefined) update.sortOrder = sortOrder;
    if (isActive !== undefined) update.isActive = isActive;

    // Validation rules only if plan allows
    if (limits.validation) {
      if (min !== undefined) update.min = min;
      if (max !== undefined) update.max = max;
      if (minLength !== undefined) update.minLength = minLength;
      if (maxLength !== undefined) update.maxLength = maxLength;
      if (pattern !== undefined) update.pattern = pattern;
    }

    await collection.updateOne(
      { _id: new mongoose.Types.ObjectId(id), tenantSlug },
      { $set: update }
    );

    return NextResponse.json({ message: 'Field updated successfully' });
  } catch (error) {
    console.error('Custom field PATCH error:', error);
    return NextResponse.json({ error: 'Failed to update custom field' }, { status: 500 });
  }
}

// DELETE - Delete custom field
export async function DELETE(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.slice(7);
    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const tenantSlug = searchParams.get('tenant') || (decoded as any).tenantSlug;

    if (!id) {
      return NextResponse.json({ error: 'Field ID is required' }, { status: 400 });
    }

    if (!tenantSlug) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 400 });
    }

    await connectDB();
    const mongoose = (await import('mongoose')).default;
    const crmDb = mongoose.connection.useDb(process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm');
    const collection = crmDb.collection('custom_fields');

    const existing = await collection.findOne({
      _id: new mongoose.Types.ObjectId(id),
      tenantSlug,
    });

    if (!existing) {
      return NextResponse.json({ error: 'Field not found' }, { status: 404 });
    }

    if (existing.isSystem) {
      return NextResponse.json({ error: 'System fields cannot be deleted' }, { status: 403 });
    }

    // Soft delete
    await collection.updateOne(
      { _id: new mongoose.Types.ObjectId(id), tenantSlug },
      { $set: { isActive: false, updatedAt: new Date() } }
    );

    return NextResponse.json({ message: 'Field deleted successfully' });
  } catch (error) {
    console.error('Custom field DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete custom field' }, { status: 500 });
  }
}
