import { NextResponse } from 'next/server';
import mongoose from 'mongoose';

// This debug route attempts a live DB connection; ensure it is always runtime-only.
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Force rebuild - DEBUG 2025-12-15
export async function GET() {
  try {
    const mongoUri = process.env.MONGODB_URI;
    
    // Check if URI is set
    if (!mongoUri) {
      return NextResponse.json({
        status: 'error',
        message: 'MONGODB_URI environment variable is not set',
        availableEnvVars: Object.keys(process.env).filter(k => 
          k.includes('MONGO') || k.includes('DB') || k.includes('DATABASE')
        )
      }, { status: 400 });
    }

    // Check if already connected
    if (mongoose.connection.readyState === 1) {
      return NextResponse.json({
        status: 'success',
        message: 'Already connected to MongoDB',
        connectionState: mongoose.connection.readyState
      });
    }

    // Try to connect
    console.log('Attempting MongoDB connection...');
    const connection = await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 5000,
    });

    return NextResponse.json({
      status: 'success',
      message: 'Connected to MongoDB',
      host: connection.connection.host,
      name: connection.connection.name,
      state: connection.connection.readyState
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorName = error instanceof Error ? error.name : 'Unknown';
    
    console.error('MongoDB connection error:', {
      name: errorName,
      message: errorMessage,
      error: error
    });

    return NextResponse.json({
      status: 'error',
      message: 'Failed to connect to MongoDB',
      errorName: errorName,
      errorMessage: errorMessage,
      mongoUri: process.env.MONGODB_URI,
      mongoUriLength: process.env.MONGODB_URI?.length,
      mongoUriHasNewline: process.env.MONGODB_URI?.includes('\n'),
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
