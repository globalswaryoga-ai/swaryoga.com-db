// Custom Fields API for CRM SaaS
import { NextRequest, NextResponse } from 'next/server';
import { connectDB, connectCRMDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { apiError, apiSuccess } from '@/lib/api-error';
import { 
  CUSTOM_FIELD_LIMITS, 
  SYSTEM_FIELDS,
  generateFieldKey,
  validateFieldValue,
  CustomField 
} from '@/lib/crm-site/customFieldsConfig';

// GET - List custom fields
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return apiError('Unauthorized', 401);
    }

    const decoded = await verifyToken(authHeader.substring(7));
    if (!decoded || !decoded.tenantId) {
      return apiError('Invalid token', 401);
    }

    const { searchParams } = new URL(request.url);
    const entity = searchParams.get('entity');
    const includeSystem = searchParams.get('includeSystem') === 'true';

    await connectDB();
    const crmDb = await connectCRMDB();
    const collection = crmDb.collection('custom_fields');

    // Build query
    const query: any = { tenantId: decoded.tenantId, isActive: true };
    if (entity) {
      query.entity = entity;
    }

    const fields = await collection.find(query).sort({ sortOrder: 1 }).toArray();

    // Include system fields if requested
    let result = fields;
    if (includeSystem && entity) {
      const systemFields = SYSTEM_FIELDS[entity] || [];
      result = [
        ...systemFields.map((f, i) => ({ ...f, id: f.key, sortOrder: i, isActive: true })),
        ...fields
      ];
    }

    // Get plan limits
    const tenantPlan = decoded.plan || 'free';
    const limits = CUSTOM_FIELD_LIMITS[tenantPlan] || CUSTOM_FIELD_LIMITS.free;

    return apiSuccess({
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
    return apiError('Failed to fetch custom fields', 500);
  }
}

// POST - Create custom field
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return apiError('Unauthorized', 401);
    }

    const decoded = await verifyToken(authHeader.substring(7));
    if (!decoded || !decoded.tenantId) {
      return apiError('Invalid token', 401);
    }

    const body = await request.json();
    const { name, type, entity, description, required, unique, defaultValue, options, showInList, showInForm, min, max, minLength, maxLength, pattern } = body;

    // Validate required fields
    if (!name || !type || !entity) {
      return apiError('Name, type, and entity are required', 400);
    }

    // Check plan limits
    const tenantPlan = decoded.plan || 'free';
    const limits = CUSTOM_FIELD_LIMITS[tenantPlan] || CUSTOM_FIELD_LIMITS.free;

    // Check if field type is allowed
    if (!limits.fieldTypes.includes(type)) {
      return apiError(`Field type "${type}" is not available in your plan. Upgrade to access more field types.`, 403);
    }

    await connectDB();
    const crmDb = await connectCRMDB();
    const collection = crmDb.collection('custom_fields');

    // Check field count limit
    const currentCount = await collection.countDocuments({ tenantId: decoded.tenantId, isActive: true });
    if (currentCount >= limits.maxFields) {
      return apiError(`You have reached the maximum of ${limits.maxFields} custom fields. Upgrade your plan to add more.`, 403);
    }

    // Check for duplicate name
    const existing = await collection.findOne({
      tenantId: decoded.tenantId,
      entity,
      name: { $regex: new RegExp(`^${name}$`, 'i') },
      isActive: true,
    });
    if (existing) {
      return apiError('A field with this name already exists for this entity', 400);
    }

    // Generate unique key
    const key = generateFieldKey(name);

    const now = new Date();
    const field: Omit<CustomField, 'id'> & { _id?: any } = {
      tenantId: decoded.tenantId,
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
    } as any;

    // Add validation rules if allowed by plan
    if (limits.validation) {
      if (min !== undefined) field.min = min;
      if (max !== undefined) field.max = max;
      if (minLength !== undefined) field.minLength = minLength;
      if (maxLength !== undefined) field.maxLength = maxLength;
      if (pattern) field.pattern = pattern;
    }

    const result = await collection.insertOne(field);

    return apiSuccess({
      message: 'Custom field created successfully',
      field: { ...field, id: result.insertedId.toString() },
    }, 201);
  } catch (error) {
    console.error('Custom field POST error:', error);
    return apiError('Failed to create custom field', 500);
  }
}

// PATCH - Update custom field
export async function PATCH(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return apiError('Unauthorized', 401);
    }

    const decoded = await verifyToken(authHeader.substring(7));
    if (!decoded || !decoded.tenantId) {
      return apiError('Invalid token', 401);
    }

    const body = await request.json();
    const { id, name, description, required, defaultValue, options, showInList, showInForm, sortOrder, min, max, minLength, maxLength, pattern, isActive } = body;

    if (!id) {
      return apiError('Field ID is required', 400);
    }

    await connectDB();
    const crmDb = await connectCRMDB();
    const collection = crmDb.collection('custom_fields');

    // Find existing field
    const { ObjectId } = await import('mongodb');
    const existing = await collection.findOne({
      _id: new ObjectId(id),
      tenantId: decoded.tenantId,
    });

    if (!existing) {
      return apiError('Field not found', 404);
    }

    if (existing.isSystem) {
      return apiError('System fields cannot be modified', 403);
    }

    // Check plan limits for validation
    const tenantPlan = decoded.plan || 'free';
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
      { _id: new ObjectId(id), tenantId: decoded.tenantId },
      { $set: update }
    );

    return apiSuccess({ message: 'Field updated successfully' });
  } catch (error) {
    console.error('Custom field PATCH error:', error);
    return apiError('Failed to update custom field', 500);
  }
}

// DELETE - Delete custom field
export async function DELETE(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return apiError('Unauthorized', 401);
    }

    const decoded = await verifyToken(authHeader.substring(7));
    if (!decoded || !decoded.tenantId) {
      return apiError('Invalid token', 401);
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return apiError('Field ID is required', 400);
    }

    await connectDB();
    const crmDb = await connectCRMDB();
    const collection = crmDb.collection('custom_fields');

    const { ObjectId } = await import('mongodb');
    const existing = await collection.findOne({
      _id: new ObjectId(id),
      tenantId: decoded.tenantId,
    });

    if (!existing) {
      return apiError('Field not found', 404);
    }

    if (existing.isSystem) {
      return apiError('System fields cannot be deleted', 403);
    }

    // Soft delete
    await collection.updateOne(
      { _id: new ObjectId(id), tenantId: decoded.tenantId },
      { $set: { isActive: false, updatedAt: new Date() } }
    );

    return apiSuccess({ message: 'Field deleted successfully' });
  } catch (error) {
    console.error('Custom field DELETE error:', error);
    return apiError('Failed to delete custom field', 500);
  }
}
