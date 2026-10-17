import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import bcrypt from 'bcryptjs';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/crm-handlers';
import { bunnyExecute } from '@/lib/bunnyDatabase';
import {
  initCourseSchema,
  saveEnrollment,
} from '@/lib/bunnyCourseRepository';
import { getUserByEmail, upsertUser } from '@/lib/repositories/userRepository';

export const dynamic = 'force-dynamic';

function checkAdmin(request: NextRequest) {
  const raw = request.headers.get('authorization') || request.cookies.get('token')?.value || '';
  const token = raw.startsWith('Bearer ') ? raw.slice(7) : raw;
  if (!token) return null;
  try {
    const decoded: any = verifyToken(token);
    if (!decoded || (!decoded.isAdmin && !isSuperAdmin(decoded))) return null;
    return decoded;
  } catch {
    return null;
  }
}

function normalize(value: unknown): string {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function findColumnValue(row: Record<string, unknown>, aliases: string[]): string {
  const normalizedAliases = aliases.map(normalize);
  const matchedKey = Object.keys(row).find((key) => normalizedAliases.includes(normalize(key)));
  return matchedKey ? String(row[matchedKey] ?? '').trim() : '';
}

export async function POST(request: NextRequest) {
  const admin = checkAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  try {
    await initCourseSchema();

    const contentType = request.headers.get('content-type') || '';
    let rows: Record<string, unknown>[] = [];
    let defaultCourseId = '';
    let defaultLevel = 'beginner';
    let action = 'import';

    if (contentType.includes('multipart/form-data')) {
      const form = await request.formData();
      defaultCourseId = String(form.get('courseId') || '').trim();
      defaultLevel = String(form.get('level') || 'beginner').trim();
      action = String(form.get('action') || 'import');
      const file = form.get('file');

      if (!file || typeof file === 'string') {
        return NextResponse.json({ error: 'File is required (.xlsx, .xls, or .csv)' }, { status: 400 });
      }

      const fileObj = file as File;
      const bytes = Buffer.from(await fileObj.arrayBuffer());
      const isCsv = fileObj.name.toLowerCase().endsWith('.csv');

      const workbook = isCsv
        ? XLSX.read(new TextDecoder().decode(bytes), { type: 'string', raw: false })
        : XLSX.read(bytes, { type: 'buffer', cellDates: true });

      if (workbook.SheetNames.length > 0) {
        rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(
          workbook.Sheets[workbook.SheetNames[0]],
          { defval: '' }
        );
      }
    } else {
      const body = await request.json();
      rows = Array.isArray(body.students) ? body.students : [];
      defaultCourseId = String(body.courseId || '').trim();
      defaultLevel = String(body.level || 'beginner').trim();
      action = String(body.action || 'import');
    }

    if (!rows.length) {
      return NextResponse.json({ error: 'No data rows found in uploaded file' }, { status: 400 });
    }

    const columns = Object.keys(rows[0] || {});

    // Parse and normalize rows
    const parsedStudents = rows.map((row, index) => {
      const name = findColumnValue(row, [
        'name',
        'student name',
        'full name',
        'participant name',
        'student',
        'first name',
      ]);
      const email = findColumnValue(row, [
        'email',
        'email address',
        'email id',
        'gmail',
        'mail',
      ]).toLowerCase();
      const phone = findColumnValue(row, [
        'phone',
        'mobile',
        'contact',
        'phone number',
        'mobile number',
        'whatsapp',
        'whatsapp number',
      ]);
      const course = findColumnValue(row, [
        'course',
        'course id',
        'courseid',
        'workshop',
        'course name',
        'course title',
      ]) || defaultCourseId;
      const level = findColumnValue(row, [
        'level',
        'course level',
        'student level',
      ]) || defaultLevel;
      const password = findColumnValue(row, ['password', 'pass']);

      return {
        rowIndex: index + 2, // Excel 1-based header is row 1
        name: name || (email ? email.split('@')[0] : 'Student'),
        email,
        phone,
        courseId: course,
        level: level.toLowerCase() || 'beginner',
        password,
        raw: row,
      };
    });

    // Preview mode: return sample without committing
    if (action === 'preview') {
      const validCount = parsedStudents.filter(s => s.email && s.courseId).length;
      return NextResponse.json({
        success: true,
        columns,
        totalRows: parsedStudents.length,
        validRows: validCount,
        sample: parsedStudents.slice(0, 5),
      });
    }

    // Import execution mode
    let imported = 0;
    let updated = 0;
    let skipped = 0;
    const errors: string[] = [];
    const generatedPasswords: Array<{ email: string; pass: string }> = [];

    // Pre-cache courses to match slug/title if user provided title instead of id
    const coursesMap = new Map<string, string>(); // name/slug -> id
    try {
      const coursesRes = await bunnyExecute('SELECT id, slug, content_json FROM courses_sql');
      for (const c of coursesRes.rows) {
        const row: any = c;
        coursesMap.set(String(row.id).toLowerCase(), String(row.id));
        if (row.slug) coursesMap.set(String(row.slug).toLowerCase(), String(row.id));
        try {
          const content = typeof row.content_json === 'string' ? JSON.parse(row.content_json) : row.content_json;
          const title = content?.en?.title || content?.title;
          if (title) coursesMap.set(String(title).toLowerCase().trim(), String(row.id));
        } catch {}
      }
    } catch {}

    for (const student of parsedStudents) {
      if (!student.email) {
        skipped++;
        errors.push(`Row ${student.rowIndex}: Email is required`);
        continue;
      }

      // Resolve courseId
      let targetCourseId = student.courseId || defaultCourseId;
      if (coursesMap.has(targetCourseId.toLowerCase())) {
        targetCourseId = coursesMap.get(targetCourseId.toLowerCase())!;
      }

      if (!targetCourseId) {
        skipped++;
        errors.push(`Row ${student.rowIndex} (${student.email}): No course selected or matched`);
        continue;
      }

      try {
        // 1. Find or create user
        let user = await getUserByEmail(student.email);
        let studentPassword = student.password;

        if (!user) {
          if (!studentPassword) {
            studentPassword = `Swar@${Math.floor(1000 + Math.random() * 9000)}`;
          }
          const hashedPassword = await bcrypt.hash(studentPassword, 10);
          user = await upsertUser({
            email: student.email,
            name: student.name,
            phone: student.phone,
            password: hashedPassword,
            role: 'student',
            status: 'active',
            isAdmin: false,
            provider: 'admin-bulk-import',
            emailVerified: true,
            managedUserIds: [],
            permissions: ['course:read'],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
          generatedPasswords.push({ email: student.email, pass: studentPassword });
        }

        const userId = (user as any)?.id || (user as any)?._id || student.email;

        // 2. Check if student already enrolled in this course
        const existingEnrollmentRes = await bunnyExecute({
          sql: `SELECT id FROM course_enrollments_sql WHERE user_id = ? AND course_id = ? LIMIT 1`,
          args: [String(userId), String(targetCourseId)],
        });

        const existingId = existingEnrollmentRes.rows[0]?.id ? String(existingEnrollmentRes.rows[0].id) : undefined;

        await saveEnrollment({
          id: existingId,
          userId: String(userId),
          courseId: String(targetCourseId),
          status: 'active',
          progressPercent: 0,
          data: {
            enrolledBy: admin.email || 'admin',
            studentLevel: student.level || 'beginner',
            studentName: student.name,
            studentPhone: student.phone,
            enrolledAt: new Date().toISOString(),
            source: 'bulk_import',
          },
        });

        if (existingId) {
          updated++;
        } else {
          imported++;
        }
      } catch (err: any) {
        skipped++;
        errors.push(`Row ${student.rowIndex} (${student.email}): ${err.message || 'Failed to save student'}`);
      }
    }

    return NextResponse.json({
      success: true,
      imported,
      updated,
      skipped,
      total: parsedStudents.length,
      errors: errors.slice(0, 20),
      hasMoreErrors: errors.length > 20,
      generatedPasswords: generatedPasswords.slice(0, 10),
      message: `Bulk import completed: ${imported} enrolled, ${updated} updated, ${skipped} skipped.`,
    });
  } catch (error: any) {
    console.error('[Bulk Enrollments POST Error]:', error);
    return NextResponse.json({ error: error.message || 'Failed to bulk import students' }, { status: 500 });
  }
}
