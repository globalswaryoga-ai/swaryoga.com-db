/**
 * @fileoverview Google Forms Webhook Ingestion API
 * Receives real-time Google Form submissions, parses student details,
 * ingests directly into BunnyDB CRM New-Registration (My Data),
 * and automatically routes the student to either Live Sessions (Zoom/Sadhana Live)
 * or E-Learning / Recorded Course Portal.
 */

import { NextRequest, NextResponse } from 'next/server';
import { saveBunnyLead, loadBunnyLeads, invalidateBunnyLeadsCache } from '@/lib/bunnyLeadsRepository';
import { createSubmission, ensureFormTables } from '@/lib/bunny-forms-db';
import { allocateNextLeadNumber } from '@/lib/crm/leadNumber';
import { normalizePhone } from '@/lib/whatsapp';
import { getUserByEmail, upsertUser } from '@/lib/repositories/userRepository';
import { randomInt } from 'crypto';
import bcrypt from 'bcryptjs';

export const dynamic = 'force-dynamic';

function generatePassword(): string {
  const letters = 'abcdefghijklmnopqrstuvwxyz';
  const randomLetter = () => letters[randomInt(letters.length)];
  const firstLetter = randomLetter().toUpperCase();
  const remainingLetters = `${randomLetter()}${randomLetter()}`;
  const numbers = String(randomInt(1000)).padStart(3, '0');
  return `${firstLetter}${remainingLetters}${numbers}`;
}

function findValueByKeys(obj: Record<string, any>, candidateKeys: string[]): string {
  if (!obj || typeof obj !== 'object') return '';
  const lowerMap: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) {
    lowerMap[k.toLowerCase().trim()] = v;
  }
  for (const candidate of candidateKeys) {
    const key = candidate.toLowerCase().trim();
    if (lowerMap[key] !== undefined && lowerMap[key] !== null && String(lowerMap[key]).trim() !== '') {
      return String(lowerMap[key]).trim();
    }
  }
  for (const [k, v] of Object.entries(lowerMap)) {
    for (const candidate of candidateKeys) {
      if (k.includes(candidate.toLowerCase().trim()) && v !== undefined && v !== null && String(v).trim() !== '') {
        return String(v).trim();
      }
    }
  }
  return '';
}

function detectLanguage(rawLanguage: string, rawText: string): 'hindi' | 'english' | 'marathi' | 'kannada' {
  const combined = `${rawLanguage} ${rawText}`.toLowerCase();
  if (combined.includes('marathi') || combined.includes('मराठी')) return 'marathi';
  if (combined.includes('kannada') || combined.includes('ಕನ್ನಡ')) return 'kannada';
  if (combined.includes('english') || combined.includes('eng')) return 'english';
  return 'hindi';
}

function detectTrack(rawTrack: string, rawText: string): 'live' | 'elearning' {
  const combined = `${rawTrack} ${rawText}`.toLowerCase();
  if (combined.includes('record') || combined.includes('e-learning') || combined.includes('elearning') || combined.includes('course') || combined.includes('video')) {
    return 'elearning';
  }
  return 'live';
}

export async function GET(req: NextRequest) {
  return NextResponse.json({
    status: 'online',
    endpoint: '/api/webhooks/google-forms',
    message: 'Google Forms Webhook is active and accepting submissions.',
    timestamp: new Date().toISOString()
  });
}

export async function POST(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const queryWorkshopId = url.searchParams.get('workshopId') || url.searchParams.get('formId') || '';
    const queryLanguage = url.searchParams.get('language') || '';
    const queryTrack = url.searchParams.get('track') || '';

    let payload: Record<string, any> = {};
    try {
      payload = await req.json();
    } catch {
      payload = {};
    }

    let flatAnswers: Record<string, any> = {};
    if (Array.isArray(payload)) {
      for (const item of payload) {
        if (item && item.question && item.answer !== undefined) {
          flatAnswers[String(item.question).trim()] = item.answer;
        }
      }
    } else if (payload && typeof payload === 'object') {
      if (payload.responses && typeof payload.responses === 'object') {
        flatAnswers = { ...payload.responses };
      } else {
        flatAnswers = { ...payload };
      }
    }

    const name = findValueByKeys(flatAnswers, ['name', 'full name', 'student name', 'candidate name', 'your name', 'naam', 'नाम']);
    const rawPhone = findValueByKeys(flatAnswers, ['phone', 'mobile', 'whatsapp', 'whatsapp number', 'mobile number', 'phone number', 'contact', 'contact number', 'नंबर']);
    const email = findValueByKeys(flatAnswers, ['email', 'email address', 'email id', 'gmail', 'mail']);
    const city = findValueByKeys(flatAnswers, ['city', 'location', 'town', 'district', 'state', 'shahar', 'शहर']);
    const rawLang = findValueByKeys(flatAnswers, ['language', 'language preference', 'batch language', 'bhasha', 'भाषा']) || queryLanguage;
    const rawTrack = findValueByKeys(flatAnswers, ['mode', 'track', 'format', 'choice', 'type', 'workshop mode', 'session type']) || queryTrack;
    const formId = queryWorkshopId || findValueByKeys(flatAnswers, ['workshopid', 'formid', 'batchid']) || 'master_google_form';

    if (!name && !rawPhone && !email) {
      return NextResponse.json({
        error: 'Missing essential fields (name, phone, or email)',
        received: payload
      }, { status: 400 });
    }

    const cleanPhone = normalizePhone(rawPhone || '0000000000');
    const cleanEmail = email ? email.toLowerCase().trim() : `${cleanPhone}@swaryoga.com`;
    const cleanName = name || 'Student';
    const language = detectLanguage(rawLang, JSON.stringify(flatAnswers));
    const track = detectTrack(rawTrack, JSON.stringify(flatAnswers));

    await ensureFormTables();
    const submissionId = await createSubmission({
      formId: formId,
      name: cleanName,
      mobile: cleanPhone,
      email: cleanEmail,
      city: city || '',
      answers: flatAnswers,
      formData: JSON.stringify(flatAnswers),
      paymentStatus: 'pending',
      amount: 0,
      currency: 'INR',
      createdAt: new Date().toISOString()
    });

    const leadNumber = await allocateNextLeadNumber();
    const leadRecord = {
      leadNumber,
      name: cleanName,
      email: cleanEmail,
      phoneNumber: cleanPhone,
      whatsappNumber: cleanPhone,
      city: city || '',
      source: 'google_forms',
      labels: ['google-form', `lang-${language}`, track === 'elearning' ? 'elearning' : 'live-session'],
      status: 'lead',
      workshopName: `Swar Yoga (${language.toUpperCase()})`,
      language: language,
      track: track,
      dynamicAnswers: flatAnswers,
      metadata: {
        formId,
        submissionId,
        track,
        language,
        syncedVia: 'google-forms-webhook'
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await saveBunnyLead(leadRecord);
    invalidateBunnyLeadsCache();

    let accountProvisioned = false;
    let generatedPassword = '';

    if (track === 'elearning') {
      try {
        const existingUser = await getUserByEmail(cleanEmail);
        if (!existingUser) {
          generatedPassword = generatePassword();
          const hashedPassword = await bcrypt.hash(generatedPassword, 10);
          await upsertUser({
            email: cleanEmail,
            name: cleanName,
            phone: cleanPhone,
            password: hashedPassword,
            role: 'student',
            courses: ['swar-yoga-basic'],
            createdAt: new Date()
          });
          accountProvisioned = true;
          console.log(`[Google Forms Webhook] Created E-Learning account for ${cleanEmail}`);
        }
      } catch (userErr) {
        console.warn('[Google Forms Webhook] User provisioning skipped/failed:', userErr);
      }
    }

    const WHATSAPP_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
    const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;

    if (WHATSAPP_TOKEN && PHONE_NUMBER_ID && cleanPhone && cleanPhone.length >= 10) {
      try {
        const fullPhone = cleanPhone.startsWith('91') ? cleanPhone : `91${cleanPhone.replace(/^0+/, '')}`;
        const welcomeMessage = track === 'elearning'
          ? `Namaste ${cleanName}! 🙏\n\nWelcome to Swar Yoga E-Learning.\nYour registration has been received successfully.\n\nLogin to access your recorded course:\nURL: https://swaryoga.com/signin\nEmail: ${cleanEmail}${generatedPassword ? `\nPassword: ${generatedPassword}` : ''}\n\nHappy Learning! 🧘`
          : `Namaste ${cleanName}! 🙏\n\nWelcome to Swar Yoga Live Workshop (${language.toUpperCase()}).\nYour registration has been confirmed.\n\nJoin the live daily sessions:\nURL: https://swaryoga.com/sadhana/live/hindi-swar-yoga-l-1-sadhana\nTimings: 07:00 AM & 07:00 PM IST\n\nSee you in the practice hall! 🧘`;

        fetch(`https://graph.facebook.com/v18.0/${PHONE_NUMBER_ID}/messages`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${WHATSAPP_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: fullPhone,
            type: 'text',
            text: { body: welcomeMessage },
          }),
        }).catch(err => console.warn('[WhatsApp Send Warning]:', err));
      } catch (waErr) {
        console.warn('[WhatsApp Error]:', waErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Lead successfully imported into New-Registration CRM.',
      data: {
        submissionId,
        leadNumber,
        name: cleanName,
        phone: cleanPhone,
        email: cleanEmail,
        language,
        track,
        accountProvisioned,
      }
    });

  } catch (error: any) {
    console.error('Google Forms Webhook Error:', error);
    return NextResponse.json(
      { error: 'Failed to process Google Form submission', details: error.message },
      { status: 500 }
    );
  }
}
