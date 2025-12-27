import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { exec } from 'child_process';
import { promisify } from 'util';
import { existsSync, rmSync } from 'fs';
import { join } from 'path';

const execAsync = promisify(exec);

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);

    // Check admin authorization
    if (!decoded?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized - admin access required' }, { status: 401 });
    }

    const sessionDir = join(process.cwd(), '.wwebjs_auth');
    
    // Check if session directory exists
    if (!existsSync(sessionDir)) {
      return NextResponse.json({
        success: true,
        message: 'No session directory found',
        sessionPath: sessionDir,
        existed: false,
      }, { status: 200 });
    }

    // Get session info before deletion
    let sessionFiles: string[] = [];
    try {
      const { stdout } = await execAsync(`ls -la "${sessionDir}"`);
      sessionFiles = stdout.split('\n').filter(line => line.trim());
    } catch (e) {
      // Directory might be empty
    }

    // Remove session directory
    try {
      rmSync(sessionDir, { recursive: true, force: true });
      console.log(`✅ WhatsApp session directory cleared: ${sessionDir}`);
    } catch (deleteErr) {
      console.error(`❌ Failed to delete session directory:`, deleteErr);
      return NextResponse.json({
        error: 'Failed to clear session directory',
        details: (deleteErr as Error).message,
      }, { status: 500 });
    }

    // Verify deletion
    const stillExists = existsSync(sessionDir);
    if (stillExists) {
      return NextResponse.json({
        error: 'Session directory still exists after deletion attempt',
        sessionPath: sessionDir,
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'WhatsApp session cleared successfully',
      details: {
        sessionPath: sessionDir,
        filesCleared: sessionFiles.length,
        filesDeleted: sessionFiles.slice(0, 5), // Show first 5 files deleted
      },
      action: 'Server will generate new QR code on next connection attempt',
    }, { status: 200 });

  } catch (error) {
    console.error('❌ Error resetting WhatsApp session:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: (error as Error).message,
      },
      { status: 500 }
    );
  }
}
