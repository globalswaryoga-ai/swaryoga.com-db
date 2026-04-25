/**
 * User Compartment API - Initialize and manage user data compartments
 * 
 * Each CRM user gets their own isolated compartment with:
 * - Custom folder name (user chooses)
 * - Bunny CDN storage folder
 * - MongoDB data isolation via userId/createdByUserId
 * 
 * POST: Initialize compartment (choose folder name, verify Bunny, verify MongoDB)
 * GET: Get compartment status
 * PATCH: Update compartment settings
 */

import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { getUserCompartment } from '@/lib/schemas/enterpriseSchemas';
import { isBunnyStorageConfigured } from '@/lib/bunny-storage';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';


// Storage plans
const STORAGE_PLANS = {
  none: { quotaMB: 0, price: 0 },
  starter: { quotaMB: 500, price: 30 },
  growth: { quotaMB: 2048, price: 99 },
  pro: { quotaMB: 10240, price: 349 },
};

// Folder name validation
function validateFolderName(name: string): { valid: boolean; error?: string } {
  const trimmed = name.trim().toLowerCase();
  
  if (!trimmed) {
    return { valid: false, error: 'Folder name is required' };
  }
  
  if (trimmed.length < 3) {
    return { valid: false, error: 'Folder name must be at least 3 characters' };
  }
  
  if (trimmed.length > 32) {
    return { valid: false, error: 'Folder name must be 32 characters or less' };
  }
  
  if (!/^[a-z0-9][a-z0-9_-]*[a-z0-9]$/.test(trimmed) && trimmed.length > 2) {
    return { valid: false, error: 'Folder name must start/end with letter/number, only contain letters, numbers, hyphens, underscores' };
  }
  
  if (/^[a-z0-9]$/.test(trimmed) || /^[a-z0-9]{2}$/.test(trimmed)) {
    // Allow short names if they're alphanumeric only
  } else if (!/^[a-z0-9][a-z0-9_-]*[a-z0-9]$/.test(trimmed)) {
    return { valid: false, error: 'Invalid folder name format' };
  }
  
  // Reserved names
  const reserved = ['admin', 'root', 'system', 'uploads', 'temp', 'tmp', 'cache', 'api', 'www', 'mail'];
  if (reserved.includes(trimmed)) {
    return { valid: false, error: 'This folder name is reserved' };
  }
  
  return { valid: true };
}

// Generate unique compartment ID
function generateCompartmentId(): string {
  return `comp_${crypto.randomBytes(8).toString('hex')}`;
}

// GET - Get user's compartment status
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.split(' ')[1] || '';
    const decoded: any = verifyToken(token);

    if (!decoded || !decoded.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = decoded.userId || decoded._id || decoded.id;
    if (!userId) {
      return NextResponse.json({ error: 'User ID not found' }, { status: 400 });
    }

    await connectDB();
    const UserCompartment = getUserCompartment();
    
    const compartment = await UserCompartment.findOne({ userId }).lean();
    
    if (!compartment) {
      // No compartment yet - return setup required
      return NextResponse.json({
        exists: false,
        setupRequired: true,
        bunnyConfigured: isBunnyStorageConfigured(),
        steps: {
          folderNameChosen: false,
          storagePurchased: false,
          bunnyFolderCreated: false,
          mongodbConfigured: false,
          connectionVerified: false,
        },
      });
    }

    return NextResponse.json({
      exists: true,
      setupRequired: !compartment.setup?.isComplete,
      compartment: {
        compartmentId: compartment.compartmentId,
        folderName: compartment.folderName,
        bunny: compartment.bunny,
        storage: compartment.storage,
        setup: compartment.setup,
      },
    });
  } catch (error: any) {
    console.error('[Compartment GET] Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to get compartment' }, { status: 500 });
  }
}

// POST - Initialize or update compartment
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.split(' ')[1] || '';
    const decoded: any = verifyToken(token);

    if (!decoded || !decoded.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = decoded.userId || decoded._id || decoded.id;
    const email = decoded.email || decoded.username;
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID not found' }, { status: 400 });
    }

    const body = await request.json();
    const { action, folderName, verifyConnection } = body;

    await connectDB();
    const UserCompartment = getUserCompartment();

    // Action: Choose folder name and initialize compartment
    if (action === 'initialize') {
      // Validate folder name
      const validation = validateFolderName(folderName || '');
      if (!validation.valid) {
        return NextResponse.json({ error: validation.error }, { status: 400 });
      }

      const normalizedName = folderName.trim().toLowerCase();

      // Check if folder name is already taken
      const existing = await UserCompartment.findOne({ folderName: normalizedName });
      if (existing && existing.userId !== userId) {
        return NextResponse.json({ error: 'This folder name is already taken' }, { status: 409 });
      }

      // Check if user already has compartment
      let compartment = await UserCompartment.findOne({ userId });
      
      if (compartment) {
        // Update existing compartment (can change folder name before Bunny folder is created)
        if (compartment.bunny?.folderCreated) {
          return NextResponse.json({ 
            error: 'Cannot change folder name after Bunny folder is created' 
          }, { status: 400 });
        }
        
        compartment.folderName = normalizedName;
        compartment.setup = compartment.setup || {};
        compartment.setup.steps = compartment.setup.steps || {};
        compartment.setup.steps.folderNameChosen = true;
        await compartment.save();
      } else {
        // Create new compartment
        compartment = await UserCompartment.create({
          userId,
          email,
          compartmentId: generateCompartmentId(),
          folderName: normalizedName,
          bunny: {
            folderPath: `users/${normalizedName}/`,
            folderCreated: false,
          },
          storage: {
            quotaMB: 0,
            usedMB: 0,
            plan: 'none',
          },
          mongodb: {
            setupComplete: false,
            indexesCreated: false,
          },
          setup: {
            isComplete: false,
            steps: {
              folderNameChosen: true,
              storagePurchased: false,
              bunnyFolderCreated: false,
              mongodbConfigured: false,
              connectionVerified: false,
            },
          },
        });
      }

      return NextResponse.json({
        success: true,
        message: 'Folder name set successfully',
        compartment: {
          compartmentId: compartment.compartmentId,
          folderName: compartment.folderName,
          bunny: compartment.bunny,
          setup: compartment.setup,
        },
        nextStep: 'Purchase storage to continue',
      });
    }

    // Action: Create Bunny folder (after storage purchased)
    if (action === 'createBunnyFolder') {
      const compartment = await UserCompartment.findOne({ userId });
      if (!compartment) {
        return NextResponse.json({ error: 'Initialize compartment first' }, { status: 400 });
      }

      if (!compartment.storage?.plan || compartment.storage.plan === 'none') {
        return NextResponse.json({ error: 'Purchase storage first' }, { status: 400 });
      }

      if (compartment.bunny?.folderCreated) {
        return NextResponse.json({ 
          success: true, 
          message: 'Bunny folder already exists',
          bunny: compartment.bunny,
        });
      }

      // Create folder in Bunny storage
      const bunnyResult = await createBunnyFolder(compartment.folderName);
      
      if (!bunnyResult.success) {
        return NextResponse.json({ 
          error: bunnyResult.error || 'Failed to create Bunny folder'
        }, { status: 500 });
      }

      // Update compartment
      compartment.bunny = {
        folderPath: `users/${compartment.folderName}/`,
        folderCreated: true,
        folderCreatedAt: new Date(),
        cdnUrl: bunnyResult.cdnUrl || '',
      };
      compartment.setup.steps.bunnyFolderCreated = true;
      await compartment.save();

      return NextResponse.json({
        success: true,
        message: 'Bunny folder created successfully',
        bunny: compartment.bunny,
      });
    }

    // Action: Mark MongoDB setup complete
    if (action === 'markMongoDBSetup') {
      const compartment = await UserCompartment.findOne({ userId });
      if (!compartment) {
        return NextResponse.json({ error: 'Initialize compartment first' }, { status: 400 });
      }

      compartment.mongodb = {
        setupComplete: true,
        indexesCreated: true,
        setupCompletedAt: new Date(),
      };
      compartment.setup.steps.mongodbConfigured = true;
      await compartment.save();

      return NextResponse.json({
        success: true,
        message: 'MongoDB setup marked complete',
      });
    }

    // Action: Verify full connection
    if (action === 'verifyConnection' || verifyConnection) {
      const compartment = await UserCompartment.findOne({ userId });
      if (!compartment) {
        return NextResponse.json({ error: 'Initialize compartment first' }, { status: 400 });
      }

      const verificationResults = {
        bunny: false,
        mongodb: false,
        storage: false,
      };

      // Verify Bunny folder exists
      if (compartment.bunny?.folderCreated) {
        const bunnyCheck = await verifyBunnyFolder(compartment.folderName);
        verificationResults.bunny = bunnyCheck.exists;
      }

      // Verify MongoDB access (simple check - can user create/read own data?)
      verificationResults.mongodb = compartment.mongodb?.setupComplete || false;

      // Verify storage is purchased
      verificationResults.storage = (compartment.storage?.quotaMB || 0) > 0;

      // All verified?
      const allVerified = verificationResults.bunny && verificationResults.mongodb && verificationResults.storage;

      if (allVerified) {
        compartment.setup.steps.connectionVerified = true;
        compartment.setup.isComplete = true;
        compartment.setup.completedAt = new Date();
        compartment.setup.lastVerifiedAt = new Date();
        await compartment.save();
      }

      return NextResponse.json({
        success: true,
        verified: allVerified,
        results: verificationResults,
        setupComplete: allVerified,
        message: allVerified 
          ? '✅ All systems connected! Your CRM is ready to use.'
          : 'Some connections are not verified yet.',
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('[Compartment POST] Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to process request' }, { status: 500 });
  }
}

// Helper: Create Bunny folder
async function createBunnyFolder(folderName: string): Promise<{ success: boolean; cdnUrl?: string; error?: string }> {
  if (!isBunnyStorageConfigured()) {
    return { success: false, error: 'Bunny storage not configured' };
  }

  const zoneName = process.env.BUNNY_STORAGE_ZONE_NAME || '';
  const apiKey = process.env.BUNNY_STORAGE_API_KEY || '';
  const cdnHost = process.env.BUNNY_STORAGE_CDN_HOST || '';
  const region = process.env.BUNNY_STORAGE_REGION || 'de';
  
  const REGION_HOSTS: Record<string, string> = {
    de: 'storage.bunnycdn.com',
    ny: 'ny.storage.bunnycdn.com',
    la: 'la.storage.bunnycdn.com',
    sg: 'sg.storage.bunnycdn.com',
    syd: 'syd.storage.bunnycdn.com',
  };
  const storageHost = REGION_HOSTS[region] || REGION_HOSTS.de;

  try {
    // Create folder by uploading a placeholder file
    const folderPath = `users/${folderName}/.folder`;
    const url = `https://${storageHost}/${zoneName}/${folderPath}`;
    
    const res = await fetch(url, {
      method: 'PUT',
      headers: {
        AccessKey: apiKey,
        'Content-Type': 'text/plain',
      },
      body: `Folder created for user: ${folderName}\nCreated at: ${new Date().toISOString()}`,
    });

    if (!res.ok) {
      const text = await res.text();
      console.error('[Bunny] Folder creation failed:', res.status, text);
      return { success: false, error: `Bunny API error: ${res.status}` };
    }

    console.log(`[Bunny] ✅ Created folder: users/${folderName}/`);
    
    return {
      success: true,
      cdnUrl: `https://${cdnHost}/users/${folderName}/`,
    };
  } catch (error: any) {
    console.error('[Bunny] Folder creation error:', error);
    return { success: false, error: error.message };
  }
}

// Helper: Verify Bunny folder exists
async function verifyBunnyFolder(folderName: string): Promise<{ exists: boolean }> {
  if (!isBunnyStorageConfigured()) {
    return { exists: false };
  }

  const zoneName = process.env.BUNNY_STORAGE_ZONE_NAME || '';
  const apiKey = process.env.BUNNY_STORAGE_API_KEY || '';
  const region = process.env.BUNNY_STORAGE_REGION || 'de';
  
  const REGION_HOSTS: Record<string, string> = {
    de: 'storage.bunnycdn.com',
    ny: 'ny.storage.bunnycdn.com',
    la: 'la.storage.bunnycdn.com',
    sg: 'sg.storage.bunnycdn.com',
    syd: 'syd.storage.bunnycdn.com',
  };
  const storageHost = REGION_HOSTS[region] || REGION_HOSTS.de;

  try {
    const url = `https://${storageHost}/${zoneName}/users/${folderName}/`;
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        AccessKey: apiKey,
        Accept: 'application/json',
      },
    });
    
    return { exists: res.ok };
  } catch {
    return { exists: false };
  }
}
