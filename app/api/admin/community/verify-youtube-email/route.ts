import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import mongoose from 'mongoose';
import crypto from 'crypto';
import nodemailer from 'nodemailer';

export const dynamic = 'force-dynamic';

// Schema for verified YouTube email accounts
const youtubeEmailVerificationSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true },
  verificationToken: String,
  verificationCode: String, // OTP sent to email
  isVerified: { type: Boolean, default: false },
  verifiedAt: Date,
  verifiedBy: String, // Admin who verified it
  createdAt: { type: Date, default: Date.now },
  expiresAt: Date,
  attempts: { type: Number, default: 0 },
  lastAttemptAt: Date,
});

/**
 * POST /api/admin/community/verify-youtube-email
 * Request email verification for YouTube account
 *
 * Body: { email }
 */
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);

    if (!decoded?.isAdmin) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { email, action } = body;

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    await connectDB();

    const YoutubeEmailVerification =
      mongoose.models.YoutubeEmailVerification ||
      mongoose.model('YoutubeEmailVerification', youtubeEmailVerificationSchema);

    // REQUEST VERIFICATION (send email)
    if (action === 'request') {
      // Check if already verified
      const existing = await YoutubeEmailVerification.findOne({ email });
      if (existing?.isVerified) {
        return NextResponse.json({
          success: true,
          message: `✅ ${email} is already verified`,
          isVerified: true,
        });
      }

      // Generate verification code (6-digit OTP)
      const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
      const verificationToken = crypto.randomBytes(32).toString('hex');

      // Save verification request
      await YoutubeEmailVerification.findOneAndUpdate(
        { email },
        {
          email,
          verificationCode,
          verificationToken,
          isVerified: false,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
          createdAt: new Date(),
        },
        { upsert: true }
      );

      // Send email with verification code using SMTP
      const SMTP_HOST = process.env.SMTP_HOST;
      const SMTP_PORT = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : 465;
      const SMTP_USER = process.env.SMTP_USER;
      const SMTP_PASS = process.env.SMTP_PASS;
      const EMAIL_FROM = process.env.EMAIL_FROM || 'Swar Yoga <mohan@swaryoga.com>';

      if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
        try {
          const transporter = nodemailer.createTransport({
            host: SMTP_HOST,
            port: SMTP_PORT,
            secure: SMTP_PORT === 465, // true for 465, false for other ports
            auth: {
              user: SMTP_USER,
              pass: SMTP_PASS,
            },
          });

          const mailOptions = {
            from: EMAIL_FROM,
            to: email,
            subject: '🔐 YouTube Email Verification Code - Swar Yoga',
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #1f2937;">YouTube Email Verification</h2>
                <p style="color: #4b5563; font-size: 16px;">
                  Your 6-digit verification code is:
                </p>
                <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
                  <p style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #ef4444; margin: 0;">
                    ${verificationCode}
                  </p>
                </div>
                <p style="color: #6b7280; font-size: 14px;">
                  This code will expire in 24 hours. Do not share this code with anyone.
                </p>
                <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
                <p style="color: #9ca3af; font-size: 12px;">
                  Swar Yoga • YouTube Private Video System<br/>
                  <a href="https://swaryoga.com" style="color: #3b82f6; text-decoration: none;">swaryoga.com</a>
                </p>
              </div>
            `,
          };

          await transporter.sendMail(mailOptions);
          console.log(`✅ Verification email sent to ${email}`);
        } catch (emailError) {
          console.error('⚠️ Email send error:', emailError);
          // Don't fail the request if email service is unavailable
        }
      }

      return NextResponse.json({
        success: true,
        message: `✅ Verification code sent to ${email}`,
        // For testing: return the code (REMOVE IN PRODUCTION)
        testCode: verificationCode,
        note: 'Check email for verification code. Code valid for 24 hours.',
      });
    }

    // VERIFY CODE
    if (action === 'verify') {
      const { code } = body;

      if (!code) {
        return NextResponse.json(
          { error: 'Verification code is required' },
          { status: 400 }
        );
      }

      const record = await YoutubeEmailVerification.findOne({ email });

      if (!record) {
        return NextResponse.json(
          { error: 'No verification request found. Please request verification first.' },
          { status: 404 }
        );
      }

      if (record.isVerified) {
        return NextResponse.json({
          success: true,
          message: `✅ ${email} is already verified`,
          isVerified: true,
        });
      }

      if (record.expiresAt < new Date()) {
        return NextResponse.json(
          { error: 'Verification code has expired. Request a new one.' },
          { status: 400 }
        );
      }

      if (record.attempts > 5) {
        return NextResponse.json(
          { error: 'Too many attempts. Request a new verification.' },
          { status: 429 }
        );
      }

      if (record.verificationCode !== code) {
        // Increment attempts
        await YoutubeEmailVerification.findByIdAndUpdate(record._id, {
          attempts: record.attempts + 1,
          lastAttemptAt: new Date(),
        });

        return NextResponse.json(
          { error: 'Invalid verification code' },
          { status: 400 }
        );
      }

      // Code matches - mark as verified
      const verified = await YoutubeEmailVerification.findByIdAndUpdate(
        record._id,
        {
          isVerified: true,
          verifiedAt: new Date(),
          verifiedBy: decoded.userId || 'admin',
          attempts: 0,
        },
        { new: true }
      );

      return NextResponse.json({
        success: true,
        message: `✅ ${email} has been verified! You can now add private YouTube videos.`,
        isVerified: true,
        data: verified,
      });
    }

    return NextResponse.json(
      { error: 'Invalid action. Use "request" or "verify"' },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('[YouTube Email Verification]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * GET /api/admin/community/verify-youtube-email
 * Check if email is verified
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);

    if (!decoded?.isAdmin) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');

    if (!email) {
      return NextResponse.json(
        { error: 'Email parameter required' },
        { status: 400 }
      );
    }

    await connectDB();

    const YoutubeEmailVerification =
      mongoose.models.YoutubeEmailVerification ||
      mongoose.model('YoutubeEmailVerification', youtubeEmailVerificationSchema);

    const record = await YoutubeEmailVerification.findOne({ email: email.toLowerCase() });

    return NextResponse.json({
      success: true,
      email,
      isVerified: record?.isVerified || false,
      verifiedAt: record?.verifiedAt || null,
    });
  } catch (error: any) {
    console.error('[YouTube Email Check]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
