import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';

const execPromise = promisify(exec);
export const dynamic = 'force-dynamic';
export const maxDuration = 300; // Allow up to 5 mins for archive creation and streaming

async function verifyAccess(req: NextRequest): Promise<boolean> {
  const adminPasswordHash = process.env.ADMIN_PASSWORD || '';
  const jwtSecret = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

  // 1. Check Bearer token in headers or query
  const authHeader = req.headers.get('authorization') || '';
  const tokenFromHeader = authHeader.replace(/^Bearer\s+/i, '').trim();
  const tokenFromQuery = req.nextUrl.searchParams.get('token') || '';
  const token = tokenFromHeader || tokenFromQuery;

  if (token) {
    try {
      const decoded: any = jwt.verify(token, jwtSecret);
      if (decoded && (decoded.isAdmin || decoded.username === 'admin')) {
        return true;
      }
    } catch {
      // Token invalid, fall back to password check
    }
  }

  // 2. Check password parameter (via query or header or body)
  const passwordFromQuery = req.nextUrl.searchParams.get('password') || '';
  const passwordFromHeader = req.headers.get('x-admin-password') || '';
  let passwordFromBody = '';

  if (req.method === 'POST') {
    try {
      const contentType = req.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const body = await req.json();
        passwordFromBody = body.password || '';
      } else if (contentType.includes('application/x-www-form-urlencoded') || contentType.includes('multipart/form-data')) {
        const form = await req.formData();
        passwordFromBody = (form.get('password') as string) || '';
      }
    } catch {
      // Ignored
    }
  }

  const candidatePassword = passwordFromQuery || passwordFromHeader || passwordFromBody;

  if (candidatePassword && adminPasswordHash) {
    try {
      // Check bcrypt hash
      if (adminPasswordHash.startsWith('$2a$') || adminPasswordHash.startsWith('$2b$')) {
        const match = await bcrypt.compare(candidatePassword, adminPasswordHash);
        if (match) return true;
      } else if (candidatePassword === adminPasswordHash) {
        return true;
      }
    } catch {
      return false;
    }
  }

  return false;
}

export async function GET(req: NextRequest) {
  return handleDownload(req);
}

export async function POST(req: NextRequest) {
  return handleDownload(req);
}

async function handleDownload(req: NextRequest) {
  try {
    const isAllowed = await verifyAccess(req);

    if (!isAllowed) {
      return NextResponse.json(
        {
          error: 'Unauthorized. Please provide your admin login password or a valid admin session token.',
          hint: 'Pass ?password=YOUR_ADMIN_PASSWORD in the URL or provide it in the export dashboard.',
        },
        { status: 401 }
      );
    }

    const requestedType = req.nextUrl.searchParams.get('type') || req.nextUrl.searchParams.get('file') || '';

    // If user requested only the .env file
    if (requestedType === 'env' || requestedType === 'env.local') {
      const cwd = process.cwd();
      const envPath = path.join(cwd, '.env.local');
      const fallbackEnv = path.join(cwd, '.env');
      const targetEnv = fs.existsSync(envPath) ? envPath : fallbackEnv;

      if (!fs.existsSync(targetEnv)) {
        return NextResponse.json({ error: '.env.local file not found on server.' }, { status: 404 });
      }

      const envContent = fs.readFileSync(targetEnv, 'utf-8');
      return new Response(envContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Content-Disposition': 'attachment; filename=".env.local"',
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      });
    }

    const archivePath = '/tmp/swaryoga-project-full.tar.gz';
    const cwd = process.cwd();

    // Check if a recently cached archive (< 24 hours old) exists to serve instantly
    let needsRebuild = true;
    if (fs.existsSync(archivePath)) {
      const stat = fs.statSync(archivePath);
      const ageHours = (Date.now() - stat.mtimeMs) / (1000 * 60 * 60);
      if (ageHours < 24 && stat.size > 10 * 1024 * 1024) {
        needsRebuild = false;
      }
    }

    if (needsRebuild) {
      // Build clean archive excluding node_modules, .next, .git, etc.
      // Explicitly retains all source code, .env files, configs, scripts, and media.
      const tarCmd = `tar --exclude="*node_modules*" --exclude=".next*" --exclude=".git" --exclude=".wwebjs_auth*" --exclude=".venv*" -czf "${archivePath}" .`;
      await execPromise(tarCmd, { cwd, maxBuffer: 100 * 1024 * 1024 });
    }

    if (!fs.existsSync(archivePath)) {
      return NextResponse.json({ error: 'Failed to build codebase archive.' }, { status: 500 });
    }

    const stat = fs.statSync(archivePath);
    const fileStream = fs.createReadStream(archivePath);

    // Convert Node ReadStream to Web ReadableStream
    const readableStream = new ReadableStream({
      start(controller) {
        fileStream.on('data', (chunk) => controller.enqueue(chunk));
        fileStream.on('end', () => controller.close());
        fileStream.on('error', (err) => controller.error(err));
      },
      cancel() {
        fileStream.destroy();
      },
    });

    const timestamp = new Date().toISOString().slice(0, 10);
    const filename = `swaryoga-project-full-${timestamp}.tar.gz`;

    return new Response(readableStream, {
      status: 200,
      headers: {
        'Content-Type': 'application/gzip',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(stat.size),
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch (error: any) {
    console.error('Error generating project archive:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error generating codebase archive.' },
      { status: 500 }
    );
  }
}

