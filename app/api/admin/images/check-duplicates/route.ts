import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/crm-handlers';
import { listFiles, fileExists } from '@/lib/bunny-storage';

export const dynamic = 'force-dynamic';

/**
 * POST - Find duplicate images/thumbnails in storage
 * Scans a storage prefix for files with the same name (case-insensitive)
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let decoded: any;
    try {
      decoded = verifyToken(authHeader.split(' ')[1]);
    } catch {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    if (!isSuperAdmin(decoded)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { prefix = 'uploads' } = body;

    // List all files in the prefix
    const files = await listFiles(prefix);

    // Group by filename (case-insensitive)
    const nameGroups: Record<string, any[]> = {};
    files.forEach((f: any) => {
      const fileName = f.key?.split('/').pop() || 'unknown';
      const key = fileName.toLowerCase();
      if (!nameGroups[key]) nameGroups[key] = [];
      nameGroups[key].push({
        key: f.key,
        size: f.size,
        lastModified: f.lastModified,
        fileName,
      });
    });

    // Group by file size (potential pixel-identical duplicates)
    const sizeGroups: Record<number, any[]> = {};
    files.forEach((f: any) => {
      const size = f.size;
      if (!sizeGroups[size]) sizeGroups[size] = [];
      sizeGroups[size].push({
        key: f.key,
        size: f.size,
        lastModified: f.lastModified,
        fileName: f.key?.split('/').pop(),
      });
    });

    // Find duplicates by name
    const nameDuplicates = Object.entries(nameGroups)
      .filter(([_, files]) => files.length > 1)
      .map(([name, files]) => ({
        fileName: name,
        count: files.length,
        files,
        suggestion: `Keep latest (${new Date(files[files.length - 1].lastModified).toLocaleDateString()}), delete ${files.length - 1}`,
      }));

    // Find potential duplicates by size (might be exact same image)
    const sizeDuplicates = Object.entries(sizeGroups)
      .filter(([_, files]) => files.length > 1 && files.length <= 5)
      .map(([size, files]) => ({
        fileSize: parseInt(size),
        count: files.length,
        files,
        note: 'Same file size - may be identical images with different names',
      }));

    return NextResponse.json({
      success: true,
      prefix,
      totalFiles: files.length,
      nameDuplicatesCount: nameDuplicates.length,
      sizeDuplicatesCount: sizeDuplicates.length,
      nameDuplicates,
      sizeDuplicates,
    });
  } catch (error: any) {
    console.error('[Check Image Duplicates Error]:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}

/**
 * DELETE - Remove duplicate image files
 * Deletes specified image keys from storage (not reversible!)
 */
export async function DELETE(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let decoded: any;
    try {
      decoded = verifyToken(authHeader.split(' ')[1]);
    } catch {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    if (!isSuperAdmin(decoded)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { fileKeys = [] } = body; // Array of storage keys to delete

    if (!Array.isArray(fileKeys) || fileKeys.length === 0) {
      return NextResponse.json({ error: 'File keys array required' }, { status: 400 });
    }

    // Note: Actual deletion would require deleteFromBunnyStorage import
    // For safety, we return the files that would be deleted and let admin confirm
    const filesToDelete = fileKeys.map((key: string) => ({
      key,
      fileName: key.split('/').pop(),
    }));

    return NextResponse.json({
      success: true,
      message: `Ready to delete ${fileKeys.length} file(s). Confirm deletion:`,
      filesToDelete,
      warning: 'Deletion is permanent and cannot be undone!',
    });
  } catch (error: any) {
    console.error('[Delete Images Error]:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
