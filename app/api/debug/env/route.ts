import { NextResponse } from 'next/server';

export async function GET() {
  const allEnvVars = process.env;
  
  // Filter to show only relevant vars
  const relevantVars: Record<string, string | undefined> = {};
  relevantVars['MONGODB_URI'] = allEnvVars.MONGODB_URI ? '✓ SET (length: ' + allEnvVars.MONGODB_URI.length + ')' : '✗ NOT SET';
  relevantVars['JWT_SECRET'] = allEnvVars.JWT_SECRET ? '✓ SET' : '✗ NOT SET';
  relevantVars['NEXT_PUBLIC_API_URL'] = allEnvVars.NEXT_PUBLIC_API_URL || '✗ NOT SET';
  relevantVars['NODE_ENV'] = allEnvVars.NODE_ENV;
  relevantVars['VERCEL_ENV'] = allEnvVars.VERCEL_ENV;
  
  // Show MongoDB URI details
  const mongoUri = allEnvVars.MONGODB_URI;
  const uriDetails = mongoUri ? {
    length: mongoUri.length,
    start: mongoUri.substring(0, 50),
    end: mongoUri.substring(Math.max(0, mongoUri.length - 20)),
    hasPassword: mongoUri.includes(':') && mongoUri.includes('@'),
  } : null;

  return NextResponse.json({
    relevantVars,
    mongoUri: uriDetails,
    allKeys: Object.keys(allEnvVars).filter(k => k.toUpperCase().includes('MONGO') || k.toUpperCase().includes('DB') || k.toUpperCase().includes('JWT')).sort()
  });
}
