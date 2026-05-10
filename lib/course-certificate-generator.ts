/**
 * E-Learning Course Certificate Generator
 * Creates professional PDF certificates for completed courses
 */

import PDFDocument from 'pdfkit';

type PDFDoc = InstanceType<typeof PDFDocument>;

interface CertificateData {
  studentName: string;
  studentEmail: string;
  courseTitle: string;
  courseInstructor: string;
  completionDate: Date;
  certificateNumber: string;
  duration: number; // in minutes
  progress: number; // percentage
}

const COLORS = {
  BLACK: '#000000',
  WHITE: '#FFFFFF',
  GREEN: '#22C55E',
  YELLOW: '#FBBF24',
  DARK_BG: '#1A1A1A',
};

export function generateCourseCertificate(data: CertificateData): PDFDoc {
  const doc = new PDFDocument({
    size: 'A4',
    margin: 0,
  });

  const { studentName, studentEmail, courseTitle, courseInstructor, completionDate, certificateNumber, duration } = data;

  // ===== BACKGROUND & BORDERS =====
  // Black background
  doc.rect(0, 0, doc.page.width, doc.page.height).fill(COLORS.DARK_BG);

  // Green border (top and bottom)
  doc.rect(0, 0, doc.page.width, 30).fill(COLORS.GREEN);
  doc.rect(0, doc.page.height - 30, doc.page.width, 30).fill(COLORS.GREEN);

  // Green side borders
  doc.rect(0, 0, 30, doc.page.height).fill(COLORS.GREEN);
  doc.rect(doc.page.width - 30, 0, 30, doc.page.height).fill(COLORS.GREEN);

  // ===== CONTENT =====
  let currentY = 80;

  // Title with yellow color
  doc.fontSize(48).font('Helvetica-Bold').fillColor(COLORS.YELLOW);
  doc.text('CERTIFICATE OF COMPLETION', 40, currentY, {
    width: doc.page.width - 80,
    align: 'center',
  });

  currentY += 80;

  // Subtitle
  doc.fontSize(16).font('Helvetica-Oblique').fillColor(COLORS.GREEN);
  doc.text('This is to certify that', 40, currentY, {
    width: doc.page.width - 80,
    align: 'center',
  });

  currentY += 40;

  // Student Name (highlighted with green outline box)
  doc.rect(50, currentY - 10, doc.page.width - 100, 50).stroke({
    color: COLORS.GREEN,
    width: 3,
  });

  doc.fontSize(36).font('Helvetica-Bold').fillColor(COLORS.WHITE);
  doc.text(studentName, 40, currentY + 5, {
    width: doc.page.width - 80,
    align: 'center',
  });

  currentY += 80;

  // Completion text
  doc.fontSize(14).font('Helvetica').fillColor(COLORS.WHITE);
  doc.text('has successfully completed the course', 40, currentY, {
    width: doc.page.width - 80,
    align: 'center',
  });

  currentY += 40;

  // Course Title (highlighted with yellow text)
  doc.fontSize(24).font('Helvetica-Bold').fillColor(COLORS.YELLOW);
  doc.text(courseTitle, 40, currentY, {
    width: doc.page.width - 80,
    align: 'center',
  });

  currentY += 60;

  // Course Details Box
  doc.rect(60, currentY, doc.page.width - 120, 120).stroke({
    color: COLORS.GREEN,
    width: 2,
  });

  currentY += 20;

  doc.fontSize(11).font('Helvetica-Bold').fillColor(COLORS.GREEN);
  doc.text('Instructor:', 80, currentY);
  doc.fontSize(11).font('Helvetica').fillColor(COLORS.WHITE);
  doc.text(courseInstructor, 200, currentY);

  currentY += 25;

  doc.fontSize(11).font('Helvetica-Bold').fillColor(COLORS.GREEN);
  doc.text('Completion Date:', 80, currentY);
  doc.fontSize(11).font('Helvetica').fillColor(COLORS.WHITE);
  doc.text(completionDate.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }), 200, currentY);

  currentY += 25;

  doc.fontSize(11).font('Helvetica-Bold').fillColor(COLORS.GREEN);
  doc.text('Certificate Number:', 80, currentY);
  doc.fontSize(11).font('Helvetica').fillColor(COLORS.WHITE);
  doc.text(certificateNumber, 200, currentY);

  currentY += 25;

  doc.fontSize(11).font('Helvetica-Bold').fillColor(COLORS.GREEN);
  doc.text('Course Duration:', 80, currentY);
  doc.fontSize(11).font('Helvetica').fillColor(COLORS.WHITE);
  const hours = Math.floor(duration / 60);
  const mins = duration % 60;
  doc.text(`${hours}h ${mins}m`, 200, currentY);

  currentY += 60;

  // Achievement message
  doc.fontSize(12).font('Helvetica-Oblique').fillColor(COLORS.GREEN);
  doc.text(
    'This certificate recognizes the dedication and commitment demonstrated in completing this comprehensive course program.',
    40,
    currentY,
    {
      width: doc.page.width - 80,
      align: 'center',
    }
  );

  currentY = doc.page.height - 150;

  // Signatures section with green boxes
  const signBoxWidth = (doc.page.width - 100) / 2;

  // Left signature box
  doc.rect(50, currentY - 10, signBoxWidth, 100).stroke({
    color: COLORS.GREEN,
    width: 2,
  });

  doc.fontSize(10).font('Helvetica').fillColor(COLORS.WHITE);
  doc.text('Instructor Signature', 60, currentY + 10);
  doc.text('_____________________', 60, currentY + 35);
  doc.fontSize(9).font('Helvetica').fillColor(COLORS.GREEN);
  doc.text('Authorized Signature', 60, currentY + 55);

  // Right signature box
  doc.rect(doc.page.width - 50 - signBoxWidth, currentY - 10, signBoxWidth, 100).stroke({
    color: COLORS.GREEN,
    width: 2,
  });

  doc.fontSize(10).font('Helvetica').fillColor(COLORS.WHITE);
  doc.text('Institution Seal', doc.page.width - 40 - signBoxWidth, currentY + 10);
  doc.text('_____________________', doc.page.width - 40 - signBoxWidth, currentY + 35);
  doc.fontSize(9).font('Helvetica').fillColor(COLORS.GREEN);
  doc.text('Official Stamp', doc.page.width - 40 - signBoxWidth, currentY + 55);

  // Footer
  currentY = doc.page.height - 30;
  doc.fontSize(9).font('Helvetica').fillColor(COLORS.GREEN);
  doc.text(
    `Certificate Generated: ${new Date().toLocaleDateString()} | Verify at: swaryoga.com/verify/${certificateNumber}`,
    40,
    currentY,
    {
      width: doc.page.width - 80,
      align: 'center',
    }
  );

  return doc;
}
