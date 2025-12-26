import { NextResponse } from 'next/server';

export async function GET() {
  // Never expose environment diagnostics on production.
  if (process.env.NODE_ENV === 'production' && process.env.DEBUG_ALLOW_PROD !== '1') {
    return NextResponse.json({ error: 'Not Found' }, { status: 404 });
  }

  const allEnvVars = process.env;
  const mongoUriMain = allEnvVars.MONGODB_URI_MAIN;
  const mongoUriLegacy = allEnvVars.MONGODB_URI;
  const mongoUriEffective = mongoUriMain || mongoUriLegacy;
  
  // Filter to show only relevant vars
  const relevantVars: Record<string, string | undefined> = {};
  relevantVars['MONGODB_URI_MAIN'] = mongoUriMain ? '✓ SET (length: ' + mongoUriMain.length + ')' : '✗ NOT SET';
  relevantVars['MONGODB_URI'] = mongoUriLegacy ? '✓ SET (length: ' + mongoUriLegacy.length + ')' : '✗ NOT SET';
  relevantVars['MONGODB_URI_EFFECTIVE'] = mongoUriEffective ? '✓ SET (length: ' + mongoUriEffective.length + ')' : '✗ NOT SET';
  relevantVars['MONGODB_MAIN_DB_NAME'] = allEnvVars.MONGODB_MAIN_DB_NAME || 'swaryogaDB (default)';
  relevantVars['JWT_SECRET'] = allEnvVars.JWT_SECRET ? '✓ SET' : '✗ NOT SET';
  relevantVars['NEXT_PUBLIC_API_URL'] = allEnvVars.NEXT_PUBLIC_API_URL || '✗ NOT SET';
  relevantVars['NODE_ENV'] = allEnvVars.NODE_ENV;
  relevantVars['VERCEL_ENV'] = allEnvVars.VERCEL_ENV;
  
  // Show MongoDB URI details
  const uriDetails = mongoUriEffective ? {
    length: mongoUriEffective.length,
    // Do not return any portion of the URI, even partially.
    start: '[redacted]',
    end: '[redacted]',
    hasPassword: mongoUriEffective.includes(':') && mongoUriEffective.includes('@'),
  } : null;

  return NextResponse.json({
    relevantVars,
    mongoUri: uriDetails,
    allKeys: Object.keys(allEnvVars).filter(k => k.toUpperCase().includes('MONGO') || k.toUpperCase().includes('DB') || k.toUpperCase().includes('JWT')).sort()
  });
}
