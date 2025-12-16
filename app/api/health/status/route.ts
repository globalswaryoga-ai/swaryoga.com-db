import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { getConnectionStatus } from '@/lib/db';

export async function GET() {
  try {
    const mongoStatus = mongoose.connection.readyState;
    const statusMap = {
      0: 'Disconnected',
      1: 'Connected',
      2: 'Connecting',
      3: 'Disconnecting'
    };

    const connectionStatus = statusMap[mongoStatus as keyof typeof statusMap] || 'Unknown';

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      mongodb: {
        status: connectionStatus,
        readyState: mongoStatus,
        database: process.env.MONGODB_URI?.includes('swarYogaDB') ? 'swarYogaDB' : 'Unknown'
      },
      environment: {
        nodeEnv: process.env.NODE_ENV,
        apiUrl: process.env.NEXT_PUBLIC_API_URL
      }
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({
      success: false,
      error: errorMsg,
      mongodb: {
        status: 'Error',
        error: errorMsg
      }
    }, { status: 500 });
  }
}
