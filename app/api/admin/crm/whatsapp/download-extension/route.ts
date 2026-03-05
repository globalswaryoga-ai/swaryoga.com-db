import { NextRequest, NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * Endpoint to download the QR WhatsApp PC Extension
 * GET /api/admin/crm/whatsapp/download-extension
 */
export async function GET(request: NextRequest) {
  try {
    const extensionPath = join(
      process.cwd(),
      'qr-whatsapp-pc-extension.js'
    );

    const fileContent = readFileSync(extensionPath, 'utf-8');

    // Return as downloadable file with octet-stream to force download
    return new NextResponse(fileContent, {
      status: 200,
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': 'attachment; filename="qr-whatsapp-pc-extension.js"',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
      },
    });
  } catch (error: any) {
    console.error('[Download Extension] Error:', error.message);
    return NextResponse.json(
      { error: 'Failed to download extension file' },
      { status: 500 }
    );
  }
}
