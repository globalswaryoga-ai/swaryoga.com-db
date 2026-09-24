import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { checkRateLimit, getClientId } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';


// ---------------------------------------------------------------------------
// Brute-force protection: 5 admin login attempts per 5-minute window per IP
// ---------------------------------------------------------------------------
const ADMIN_LOGIN_RATE_LIMIT = {
  windowMs: 5 * 60 * 1000, // 5 minutes
  maxRequests: 5,
};

// Progressive lockout: track consecutive failures per IP
const failedAttempts = new Map<string, { count: number; lockedUntil: number }>();
const LOCKOUT_THRESHOLD = 3;       // lock after 3 consecutive failures
const LOCKOUT_DURATION_MS = 10 * 60 * 1000; // 10-minute lockout

// Cleanup stale entries every 15 minutes
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of failedAttempts) {
    if (v.lockedUntil > 0 && v.lockedUntil < now) failedAttempts.delete(k);
    else if (v.count === 0) failedAttempts.delete(k);
  }
}, 15 * 60 * 1000);

export async function POST(request: NextRequest) {
  const clientId = getClientId(request.headers);

  // ── Rate limit check ──
  const rl = checkRateLimit(clientId, ADMIN_LOGIN_RATE_LIMIT);
  if (!rl.allowed) {
    const retryAfter = Math.ceil((rl.resetTime - Date.now()) / 1000);
    return NextResponse.json(
      { error: 'Too many login attempts. Please try again later.', retryAfter },
      { status: 429, headers: { 'Retry-After': String(retryAfter) } }
    );
  }

  // ── Progressive lockout check ──
  const lockRec = failedAttempts.get(clientId);
  if (lockRec && lockRec.lockedUntil > Date.now()) {
    const retryAfter = Math.ceil((lockRec.lockedUntil - Date.now()) / 1000);
    return NextResponse.json(
      { error: 'Account temporarily locked due to too many failed attempts.', retryAfter },
      { status: 423, headers: { 'Retry-After': String(retryAfter) } }
    );
  }

  try {
    const { username, password } = await request.json();

    // Validate input
    if (!username?.trim() || !password?.trim()) {
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      );
    }

    // Helper: record a failed attempt and apply progressive lockout
    const recordFailure = () => {
      const rec = failedAttempts.get(clientId) || { count: 0, lockedUntil: 0 };
      rec.count++;
      if (rec.count >= LOCKOUT_THRESHOLD) {
        rec.lockedUntil = Date.now() + LOCKOUT_DURATION_MS;
        rec.count = 0; // reset counter; lockout timer takes over
      }
      failedAttempts.set(clientId, rec);
    };

    // Helper: clear failures on successful login
    const clearFailures = () => {
      failedAttempts.delete(clientId);
    };

    const adminUsername = process.env.ADMIN_USERNAME || 'admin';
    const adminPassword = process.env.ADMIN_PASSWORD;
    // Separate credential for external reviewers (e.g. Meta App Review) — kept
    // distinct from the real admin password so it can be revoked independently
    // without rotating the team's actual login.
    const reviewerUsername = process.env.REVIEWER_USERNAME;
    const reviewerPasswordHash = process.env.REVIEWER_PASSWORD_HASH;
    if (reviewerUsername && reviewerPasswordHash && username === reviewerUsername) {
      const isReviewerPasswordValid = await bcrypt.compare(password, reviewerPasswordHash);
      if (isReviewerPasswordValid) {
        clearFailures();
        const token = jwt.sign(
          { username, isAdmin: true },
          process.env.JWT_SECRET || 'your-secret-key-change-in-production',
          { expiresIn: '365d' }
        );
        return NextResponse.json({ success: true, token, username, message: 'Admin login successful' });
      }
      recordFailure();
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // Dev mode: allow login without password env var
    if (!adminPassword && process.env.NODE_ENV !== 'production') {
      console.warn('ADMIN_PASSWORD not set. Using development mode.');
      if (username === adminUsername) {
        clearFailures();
        const token = jwt.sign(
          { username, isAdmin: true },
          process.env.JWT_SECRET || 'your-secret-key-change-in-production',
          { expiresIn: '7d' }
        );
        return NextResponse.json({ success: true, token, username, message: 'Admin login successful' });
      }
      // Wrong username in dev — still record failure
      recordFailure();
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // Production: verify credentials
    if (adminPassword) {
      // Use generic error message to prevent username enumeration
      if (username !== adminUsername) {
        recordFailure();
        return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
      }

      const isPasswordValid = await bcrypt.compare(password, adminPassword);
      if (!isPasswordValid) {
        recordFailure();
        return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
      }

      // Success — clear lockout state
      clearFailures();
      const token = jwt.sign(
        { username, isAdmin: true },
        process.env.JWT_SECRET || 'your-secret-key-change-in-production',
        { expiresIn: '7d' }
      );
      return NextResponse.json({ success: true, token, username, message: 'Admin login successful' });
    }

    return NextResponse.json(
      { error: 'Admin authentication not configured' },
      { status: 500 }
    );
  } catch (error) {
    console.error('Admin login error:', error);
    return NextResponse.json(
      { error: 'An error occurred during login' },
      { status: 500 }
    );
  }
}
