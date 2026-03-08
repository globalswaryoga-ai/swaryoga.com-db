import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { 
  ONBOARDING_STEPS, 
  calculateOnboardingProgress, 
  isOnboardingComplete,
  getNextStep,
  OnboardingProgress 
} from '@/lib/crm-site/onboardingConfig';

/**
 * GET /api/crm-site/onboarding
 * Get tenant onboarding progress
 * 
 * POST /api/crm-site/onboarding
 * Update onboarding step data
 */

async function getOnboardingData(tenantSlug: string): Promise<OnboardingProgress> {
  const mongoose = (await import('mongoose')).default;
  const crmDb = mongoose.connection.useDb(process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm');
  
  let progress = await crmDb.collection('tenant_onboarding').findOne({ tenantSlug }) as OnboardingProgress | null;
  
  if (!progress) {
    // Create new onboarding record
    const newProgress: OnboardingProgress = {
      tenantSlug,
      currentStep: ONBOARDING_STEPS[0].id,
      completedSteps: [],
      stepData: {},
      startedAt: new Date(),
      skippedSteps: [],
    };
    await crmDb.collection('tenant_onboarding').insertOne(newProgress as any);
    progress = newProgress;
  }
  
  return progress;
}

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

    await connectDB();

    // Get tenant slug from query or user's tenant
    const url = new URL(request.url);
    const tenantSlug = url.searchParams.get('tenant') || (decoded as any).tenantSlug;

    if (!tenantSlug) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 400 });
    }

    const progress = await getOnboardingData(tenantSlug);
    const percentComplete = calculateOnboardingProgress(progress);
    const isComplete = isOnboardingComplete(progress);
    const nextStep = getNextStep(progress);

    return NextResponse.json({
      progress,
      steps: ONBOARDING_STEPS,
      percentComplete,
      isComplete,
      nextStep,
    });
  } catch (err: any) {
    console.error('Onboarding GET error:', err);
    return NextResponse.json({ error: err.message || 'Failed to fetch onboarding' }, { status: 500 });
  }
}

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
    const { tenantSlug, stepId, stepData, action } = body;

    if (!tenantSlug || !stepId) {
      return NextResponse.json({ error: 'tenantSlug and stepId required' }, { status: 400 });
    }

    await connectDB();

    const mongoose = (await import('mongoose')).default;
    const crmDb = mongoose.connection.useDb(process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm');

    const progress = await getOnboardingData(tenantSlug);
    
    if (action === 'skip') {
      // Skip this step
      if (!progress.skippedSteps.includes(stepId)) {
        await crmDb.collection('tenant_onboarding').updateOne(
          { tenantSlug },
          { 
            $addToSet: { skippedSteps: stepId },
            $set: { updatedAt: new Date() }
          }
        );
      }
    } else if (action === 'complete') {
      // Complete this step
      const updateData: any = {
        $addToSet: { completedSteps: stepId },
        $set: { 
          [`stepData.${stepId}`]: stepData || {},
          updatedAt: new Date()
        },
        $pull: { skippedSteps: stepId }
      };

      // Check if this completes onboarding
      const updatedProgress = {
        ...progress,
        completedSteps: [...(progress.completedSteps || []), stepId],
      } as OnboardingProgress;

      if (isOnboardingComplete(updatedProgress)) {
        updateData.$set.completedAt = new Date();
      }

      // Set next step
      const nextStep = getNextStep(updatedProgress);
      if (nextStep) {
        updateData.$set.currentStep = nextStep.id;
      }

      await crmDb.collection('tenant_onboarding').updateOne({ tenantSlug }, updateData);

      // Apply step data to tenant
      await applyStepDataToTenant(tenantSlug, stepId, stepData, crmDb);
    } else if (action === 'save') {
      // Just save draft data without completing
      await crmDb.collection('tenant_onboarding').updateOne(
        { tenantSlug },
        { 
          $set: { 
            [`stepData.${stepId}`]: stepData || {},
            currentStep: stepId,
            updatedAt: new Date()
          }
        }
      );
    }

    // Return updated progress
    const updatedProgress = await getOnboardingData(tenantSlug);
    const percentComplete = calculateOnboardingProgress(updatedProgress);
    const isComplete = isOnboardingComplete(updatedProgress);
    const nextStep = getNextStep(updatedProgress);

    return NextResponse.json({
      success: true,
      progress: updatedProgress,
      percentComplete,
      isComplete,
      nextStep,
    });
  } catch (err: any) {
    console.error('Onboarding POST error:', err);
    return NextResponse.json({ error: err.message || 'Failed to update onboarding' }, { status: 500 });
  }
}

async function applyStepDataToTenant(tenantSlug: string, stepId: string, stepData: any, crmDb: any) {
  if (!stepData) return;

  const updateFields: any = {};

  switch (stepId) {
    case 'business':
      if (stepData.businessName) updateFields['settings.businessName'] = stepData.businessName;
      if (stepData.industry) updateFields['settings.industry'] = stepData.industry;
      if (stepData.teamSize) updateFields['settings.teamSize'] = stepData.teamSize;
      if (stepData.website) updateFields['settings.website'] = stepData.website;
      break;

    case 'branding':
      if (stepData.logo) updateFields['branding.logo'] = stepData.logo;
      if (stepData.primaryColor) updateFields['branding.primaryColor'] = stepData.primaryColor;
      if (stepData.accentColor) updateFields['branding.accentColor'] = stepData.accentColor;
      if (stepData.favicon) updateFields['branding.favicon'] = stepData.favicon;
      break;

    case 'whatsapp':
      // Store WhatsApp credentials securely
      if (stepData.whatsappPhoneId) {
        await crmDb.collection('tenant_api_keys').updateOne(
          { tenantSlug, keyName: 'whatsapp_phone_id' },
          { $set: { value: stepData.whatsappPhoneId, updatedAt: new Date() } },
          { upsert: true }
        );
      }
      if (stepData.whatsappToken) {
        await crmDb.collection('tenant_api_keys').updateOne(
          { tenantSlug, keyName: 'whatsapp_token' },
          { $set: { value: stepData.whatsappToken, updatedAt: new Date() } },
          { upsert: true }
        );
      }
      updateFields['integrations.whatsapp.enabled'] = true;
      break;
  }

  if (Object.keys(updateFields).length > 0) {
    await crmDb.collection('crm_tenants').updateOne(
      { slug: tenantSlug },
      { $set: { ...updateFields, updatedAt: new Date() } }
    );
  }
}
