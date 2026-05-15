import { NextRequest, NextResponse } from 'next/server';
import { uploadImage, uploadVideo, uploadPDF, validateImageFile, validateVideoFile, validatePDFFile } from '@/lib/bunny/bunnyUpload';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const type = formData.get('type') as string; // 'image', 'video', or 'pdf'

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      );
    }

    let uploadResult;

    switch (type) {
      case 'image':
        const imageValidation = validateImageFile(file);
        if (!imageValidation.valid) {
          return NextResponse.json(
            { success: false, error: imageValidation.error },
            { status: 400 }
          );
        }
        uploadResult = await uploadImage(file, file.name);
        break;

      case 'video':
        const videoValidation = validateVideoFile(file);
        if (!videoValidation.valid) {
          return NextResponse.json(
            { success: false, error: videoValidation.error },
            { status: 400 }
          );
        }
        uploadResult = await uploadVideo(file, file.name);
        break;

      case 'pdf':
        const pdfValidation = validatePDFFile(file);
        if (!pdfValidation.valid) {
          return NextResponse.json(
            { success: false, error: pdfValidation.error },
            { status: 400 }
          );
        }
        uploadResult = await uploadPDF(file, file.name);
        break;

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid file type. Use image, video, or pdf.' },
          { status: 400 }
        );
    }

    if (!uploadResult.success) {
      return NextResponse.json(
        { success: false, error: uploadResult.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      url: uploadResult.url,
      message: `${type} uploaded successfully`,
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed',
      },
      { status: 500 }
    );
  }
}
