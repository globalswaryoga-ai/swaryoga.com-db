import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// Format bytes to human readable
function formatBytes(bytes: number): { value: number; unit: string; display: string } {
  if (bytes === 0) return { value: 0, unit: 'B', display: '0 B' };
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const value = parseFloat((bytes / Math.pow(k, i)).toFixed(2));
  
  return {
    value,
    unit: sizes[i],
    display: `${value} ${sizes[i]}`,
  };
}

export async function GET(request: NextRequest) {
  try {
    // Verify admin token
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const db = mongoose.connection.db;
    if (!db) {
      return NextResponse.json({ error: 'Database not connected' }, { status: 500 });
    }

    // Get database stats
    const stats = await db.stats();
    
    // Get collection stats for breakdown
    const collections = await db.listCollections().toArray();
    const collectionStats = await Promise.all(
      collections.map(async (col) => {
        try {
          const colStats = await db.command({ collStats: col.name });
          return {
            name: col.name,
            size: colStats.size || 0,
            storageSize: colStats.storageSize || 0,
            count: colStats.count || 0,
            avgObjSize: colStats.avgObjSize || 0,
          };
        } catch {
          return {
            name: col.name,
            size: 0,
            storageSize: 0,
            count: 0,
            avgObjSize: 0,
          };
        }
      })
    );

    // Sort by size descending
    collectionStats.sort((a, b) => b.size - a.size);

    // Calculate totals
    const totalDataSize = stats.dataSize || 0;
    const totalStorageSize = stats.storageSize || 0;
    const totalIndexSize = stats.indexSize || 0;

    // Top 5 collections by size
    const topCollections = collectionStats.slice(0, 5).map(col => ({
      name: col.name,
      size: formatBytes(col.size),
      count: col.count,
    }));

    // Cost calculation (₹35 per GB per month, ~$0.42/GB)
    const totalGB = totalStorageSize / (1024 * 1024 * 1024);
    const monthlyCost = Math.ceil(totalGB * 35); // INR
    const monthlyCostUSD = Math.ceil(totalGB * 0.42 * 100) / 100; // USD with 2 decimal places

    return NextResponse.json({
      success: true,
      data: {
        // Total sizes
        dataSize: formatBytes(totalDataSize),
        storageSize: formatBytes(totalStorageSize),
        indexSize: formatBytes(totalIndexSize),
        totalSize: formatBytes(totalDataSize + totalIndexSize),
        
        // Raw bytes for progress bars
        dataSizeBytes: totalDataSize,
        storageSizeBytes: totalStorageSize,
        indexSizeBytes: totalIndexSize,
        totalSizeBytes: totalDataSize + totalIndexSize,
        
        // GB value for cost
        totalGB: parseFloat(totalGB.toFixed(3)),
        
        // Cost in both currencies
        monthlyCost, // INR
        monthlyCostUSD,
        costPerGB: 35, // INR
        costPerGBUSD: 0.42, // USD
        
        // Collections
        collectionCount: collections.length,
        topCollections,
        
        // Database info
        dbName: db.databaseName,
      },
    });
  } catch (error) {
    console.error('[Storage Usage API]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get storage usage' },
      { status: 500 }
    );
  }
}
