/**
 * @fileoverview Centralized Notification Service
 * Sends email (and future SMS) confirmations for all key events.
 * 
 * Events covered:
 * 1. Signup confirmation
 * 2. Form filled confirmation
 * 3. Lead created/added
 * 4. Payment confirmation
 * 5. Refund successful
 * 6. Community join confirmation
 * 7. Contact form submission
 * 8. Amount received (super-admin marks payment received)
 * 9. Community member approved
 * 
 * @author Swar Yoga Team
 * @copyright 2025 Global Swar Yoga AI - All Rights Reserved
 */

import { sendEmail, wrapInEmailTemplate } from '@/lib/email';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface NotificationRecipient {
  name: string;
  email: string;
  phone?: string;
}

interface NotifyResult {
  email: { success: boolean; error?: string };
  sms?: { success: boolean; error?: string };
}

// Admin email for internal notifications
const ADMIN_EMAIL = process.env.ADMIN_NOTIFICATION_EMAIL || 'admin@swaryoga.com';
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://swaryoga.com';

// ─── Helper ──────────────────────────────────────────────────────────────────

function safe(val: any): string {
  return String(val || '').trim() || '—';
}

/**
 * Fire-and-forget notification sender.
 * Logs errors but never throws, so it never blocks the calling API.
 */
async function sendNotificationEmail(
  to: string,
  subject: string,
  htmlBody: string,
): Promise<{ success: boolean; error?: string }> {
  if (!to || !to.includes('@')) return { success: false, error: 'Invalid email' };
  try {
    const html = wrapInEmailTemplate(htmlBody, subject);
    const result = await sendEmail({ to, subject, html });
    if (!result.success) {
      console.error(`[Notify] Email failed to ${to}:`, result.error);
    }
    return result;
  } catch (err: any) {
    console.error(`[Notify] Email error to ${to}:`, err?.message);
    return { success: false, error: err?.message || 'Unknown error' };
  }
}

// ─── 1. Signup Confirmation ─────────────────────────────────────────────────

export async function notifySignupConfirmation(
  recipient: NotificationRecipient,
  details: { leadNumber?: string; profileId?: string },
): Promise<NotifyResult> {
  const body = `
    <p>Namaste <strong>${safe(recipient.name)}</strong>,</p>
    <p>Welcome to <strong>Swar Yoga</strong>! Your account has been created successfully.</p>
    ${details.leadNumber ? `<p><strong>Your ID:</strong> ${details.leadNumber}</p>` : ''}
    <p>You can now explore workshops, community, and your Life Planner on our website.</p>
    <p style="text-align:center; margin:24px 0;">
      <a href="${SITE_URL}/signin" style="display:inline-block;padding:12px 28px;background:#667eea;color:#fff;text-decoration:none;border-radius:6px;font-weight:600;">Login to Your Account →</a>
    </p>
    <p>If you have any questions, feel free to reach out to us anytime.</p>
    <p>Har Har Mahadev 🙏</p>
  `;

  const email = await sendNotificationEmail(recipient.email, '🧘 Welcome to Swar Yoga!', body);

  // Admin notification
  sendNotificationEmail(
    ADMIN_EMAIL,
    `New Signup: ${safe(recipient.name)}`,
    `<p>New user signed up:</p>
     <ul>
       <li><strong>Name:</strong> ${safe(recipient.name)}</li>
       <li><strong>Email:</strong> ${safe(recipient.email)}</li>
       <li><strong>Phone:</strong> ${safe(recipient.phone)}</li>
       <li><strong>Lead #:</strong> ${safe(details.leadNumber)}</li>
     </ul>`,
  ).catch(() => {});

  return { email };
}

// ─── 2. Form Filled Confirmation ────────────────────────────────────────────

export async function notifyFormSubmission(
  recipient: NotificationRecipient,
  details: {
    formType: string;
    workshopName?: string;
    leadNumber?: string;
  },
): Promise<NotifyResult> {
  const formLabel = details.formType === 'workshop'
    ? `Workshop Enquiry${details.workshopName ? ` – ${details.workshopName}` : ''}`
    : details.formType === 'sales'
      ? 'Sales Enquiry'
      : details.formType === 'signup'
        ? 'Registration'
        : 'Enquiry';

  const body = `
    <p>Namaste <strong>${safe(recipient.name)}</strong>,</p>
    <p>Thank you for submitting your <strong>${formLabel}</strong> form on Swar Yoga.</p>
    ${details.workshopName ? `<p><strong>Workshop:</strong> ${details.workshopName}</p>` : ''}
    ${details.leadNumber ? `<p><strong>Your Reference ID:</strong> ${details.leadNumber}</p>` : ''}
    <p>Our team will review your submission and get back to you soon.</p>
    <p>Har Har Mahadev 🙏</p>
  `;

  const email = await sendNotificationEmail(
    recipient.email,
    `✅ ${formLabel} Received – Swar Yoga`,
    body,
  );

  // Admin notification
  sendNotificationEmail(
    ADMIN_EMAIL,
    `New Form: ${formLabel} from ${safe(recipient.name)}`,
    `<p>New form submission received:</p>
     <ul>
       <li><strong>Form:</strong> ${formLabel}</li>
       <li><strong>Name:</strong> ${safe(recipient.name)}</li>
       <li><strong>Email:</strong> ${safe(recipient.email)}</li>
       <li><strong>Phone:</strong> ${safe(recipient.phone)}</li>
       <li><strong>Lead #:</strong> ${safe(details.leadNumber)}</li>
     </ul>`,
  ).catch(() => {});

  return { email };
}

// ─── 3. Lead Created / Added to CRM ────────────────────────────────────────

export async function notifyLeadCreated(
  recipient: NotificationRecipient,
  details: { leadNumber: string; source?: string },
): Promise<NotifyResult> {
  // Only admin notification (the user doesn't know about CRM leads)
  const email = await sendNotificationEmail(
    ADMIN_EMAIL,
    `New Lead #${details.leadNumber}: ${safe(recipient.name)}`,
    `<p>A new lead has been added to the CRM:</p>
     <ul>
       <li><strong>Lead #:</strong> ${details.leadNumber}</li>
       <li><strong>Name:</strong> ${safe(recipient.name)}</li>
       <li><strong>Email:</strong> ${safe(recipient.email)}</li>
       <li><strong>Phone:</strong> ${safe(recipient.phone)}</li>
       <li><strong>Source:</strong> ${safe(details.source)}</li>
     </ul>
     <p style="text-align:center; margin:24px 0;">
       <a href="${SITE_URL}/admin/leads" style="display:inline-block;padding:12px 28px;background:#667eea;color:#fff;text-decoration:none;border-radius:6px;font-weight:600;">View in CRM →</a>
     </p>`,
  );

  return { email };
}

// ─── 4. Payment Confirmation ────────────────────────────────────────────────

export async function notifyPaymentConfirmation(
  recipient: NotificationRecipient,
  details: {
    orderId?: string;
    amount: number | string;
    currency?: string;
    workshopName?: string;
    paymentMethod?: string;
    transactionId?: string;
  },
): Promise<NotifyResult> {
  const currency = details.currency || 'INR';
  const amount = typeof details.amount === 'number' ? details.amount.toLocaleString('en-IN') : details.amount;

  const body = `
    <p>Namaste <strong>${safe(recipient.name)}</strong>,</p>
    <p>Your payment has been <strong style="color:#10b981;">successfully received</strong>! 🎉</p>
    <table style="width:100%;border-collapse:collapse;margin:16px 0;">
      <tr style="border-bottom:1px solid #eee;">
        <td style="padding:8px 0;color:#666;">Amount</td>
        <td style="padding:8px 0;font-weight:bold;">₹${amount} ${currency}</td>
      </tr>
      ${details.workshopName ? `
      <tr style="border-bottom:1px solid #eee;">
        <td style="padding:8px 0;color:#666;">Workshop</td>
        <td style="padding:8px 0;font-weight:bold;">${details.workshopName}</td>
      </tr>` : ''}
      ${details.paymentMethod ? `
      <tr style="border-bottom:1px solid #eee;">
        <td style="padding:8px 0;color:#666;">Payment Method</td>
        <td style="padding:8px 0;">${details.paymentMethod}</td>
      </tr>` : ''}
      ${details.transactionId ? `
      <tr style="border-bottom:1px solid #eee;">
        <td style="padding:8px 0;color:#666;">Transaction ID</td>
        <td style="padding:8px 0;font-family:monospace;">${details.transactionId}</td>
      </tr>` : ''}
      ${details.orderId ? `
      <tr>
        <td style="padding:8px 0;color:#666;">Order ID</td>
        <td style="padding:8px 0;font-family:monospace;">${details.orderId}</td>
      </tr>` : ''}
    </table>
    <p>Please keep this email as your payment receipt.</p>
    <p>If you have any questions about your payment, please contact us.</p>
    <p>Har Har Mahadev 🙏</p>
  `;

  const email = await sendNotificationEmail(
    recipient.email,
    `💰 Payment Confirmed – ₹${amount} – Swar Yoga`,
    body,
  );

  // Admin notification
  sendNotificationEmail(
    ADMIN_EMAIL,
    `Payment Received: ₹${amount} from ${safe(recipient.name)}`,
    `<p>Payment received:</p>
     <ul>
       <li><strong>Customer:</strong> ${safe(recipient.name)} (${safe(recipient.email)})</li>
       <li><strong>Amount:</strong> ₹${amount} ${currency}</li>
       <li><strong>Workshop:</strong> ${safe(details.workshopName)}</li>
       <li><strong>Method:</strong> ${safe(details.paymentMethod)}</li>
       <li><strong>Txn ID:</strong> ${safe(details.transactionId)}</li>
     </ul>`,
  ).catch(() => {});

  return { email };
}

// ─── 5. Refund Successful ───────────────────────────────────────────────────

export async function notifyRefundSuccessful(
  recipient: NotificationRecipient,
  details: {
    amount: number | string;
    currency?: string;
    workshopName?: string;
    refundReason?: string;
    saleId?: string;
  },
): Promise<NotifyResult> {
  const currency = details.currency || 'INR';
  const amount = typeof details.amount === 'number' ? details.amount.toLocaleString('en-IN') : details.amount;

  const body = `
    <p>Namaste <strong>${safe(recipient.name)}</strong>,</p>
    <p>Your refund of <strong style="color:#10b981;">₹${amount} ${currency}</strong> has been processed successfully.</p>
    ${details.workshopName ? `<p><strong>Workshop:</strong> ${details.workshopName}</p>` : ''}
    ${details.refundReason ? `<p><strong>Reason:</strong> ${details.refundReason}</p>` : ''}
    <p>The refund will be credited to your original payment method within 5-7 business days.</p>
    <p>If you have any questions, please don't hesitate to reach out.</p>
    <p>Har Har Mahadev 🙏</p>
  `;

  const email = await sendNotificationEmail(
    recipient.email,
    `💸 Refund Processed – ₹${amount} – Swar Yoga`,
    body,
  );

  return { email };
}

// ─── 6. Community Join Confirmation ─────────────────────────────────────────

export async function notifyCommunityJoin(
  recipient: NotificationRecipient,
  details: {
    communityName: string;
    approved: boolean;
    leadNumber?: string;
  },
): Promise<NotifyResult> {
  const statusMsg = details.approved
    ? `You have been <strong style="color:#10b981;">approved</strong> and are now a member of <strong>${safe(details.communityName)}</strong>.`
    : `Your request to join <strong>${safe(details.communityName)}</strong> has been received. An admin will review and approve your membership soon.`;

  const body = `
    <p>Namaste <strong>${safe(recipient.name)}</strong>,</p>
    <p>${statusMsg}</p>
    ${details.leadNumber ? `<p><strong>Your Member ID:</strong> ${details.leadNumber}</p>` : ''}
    <p style="text-align:center; margin:24px 0;">
      <a href="${SITE_URL}" style="display:inline-block;padding:12px 28px;background:#667eea;color:#fff;text-decoration:none;border-radius:6px;font-weight:600;">Visit Swar Yoga →</a>
    </p>
    <p>Har Har Mahadev 🙏</p>
  `;

  const email = await sendNotificationEmail(
    recipient.email,
    details.approved
      ? `✅ Welcome to ${safe(details.communityName)} – Swar Yoga`
      : `👋 Membership Pending – ${safe(details.communityName)} – Swar Yoga`,
    body,
  );

  // Admin notification
  sendNotificationEmail(
    ADMIN_EMAIL,
    `Community Join: ${safe(recipient.name)} → ${safe(details.communityName)}`,
    `<p>New community join request:</p>
     <ul>
       <li><strong>Name:</strong> ${safe(recipient.name)}</li>
       <li><strong>Email:</strong> ${safe(recipient.email)}</li>
       <li><strong>Phone:</strong> ${safe(recipient.phone)}</li>
       <li><strong>Community:</strong> ${safe(details.communityName)}</li>
       <li><strong>Status:</strong> ${details.approved ? 'Auto-approved' : 'Pending approval'}</li>
     </ul>
     ${!details.approved ? `
     <p style="text-align:center; margin:24px 0;">
       <a href="${SITE_URL}/admin/community/members" style="display:inline-block;padding:12px 28px;background:#667eea;color:#fff;text-decoration:none;border-radius:6px;font-weight:600;">Review in Admin →</a>
     </p>` : ''}`,
  ).catch(() => {});

  return { email };
}

// ─── 7. Contact Form Submission ─────────────────────────────────────────────

export async function notifyContactFormSubmission(
  recipient: NotificationRecipient,
  details: {
    subject: string;
    message: string;
  },
): Promise<NotifyResult> {
  // User confirmation
  const userBody = `
    <p>Namaste <strong>${safe(recipient.name)}</strong>,</p>
    <p>We have received your message and our team will get back to you as soon as possible.</p>
    <div style="background:#f8f9fa;border-left:4px solid #667eea;padding:16px;margin:16px 0;border-radius:4px;">
      <p style="margin:0 0 8px;color:#666;font-size:13px;"><strong>Your message:</strong></p>
      <p style="margin:0;"><strong>${safe(details.subject)}</strong></p>
      <p style="margin:8px 0 0;color:#555;">${safe(details.message)}</p>
    </div>
    <p>Har Har Mahadev 🙏</p>
  `;

  const email = await sendNotificationEmail(
    recipient.email,
    `📩 We received your message – Swar Yoga`,
    userBody,
  );

  // Admin notification with full details
  sendNotificationEmail(
    ADMIN_EMAIL,
    `New Contact: ${safe(details.subject)} from ${safe(recipient.name)}`,
    `<p>New contact form submission:</p>
     <ul>
       <li><strong>Name:</strong> ${safe(recipient.name)}</li>
       <li><strong>Email:</strong> ${safe(recipient.email)}</li>
       <li><strong>Phone:</strong> ${safe(recipient.phone)}</li>
     </ul>
     <div style="background:#f8f9fa;border-left:4px solid #667eea;padding:16px;margin:16px 0;border-radius:4px;">
       <p style="margin:0 0 8px;"><strong>Subject:</strong> ${safe(details.subject)}</p>
       <p style="margin:0;">${safe(details.message)}</p>
     </div>
     <p><a href="mailto:${safe(recipient.email)}">Reply to ${safe(recipient.name)}</a></p>`,
  ).catch(() => {});

  return { email };
}

// ─── 8. Amount Received (Super Admin marks payment received) ────────────────

export async function notifyAmountReceived(
  recipient: NotificationRecipient,
  details: {
    amount: number | string;
    currency?: string;
    workshopName?: string;
    paymentMode?: string;
    confirmedBy?: string;
    saleId?: string;
  },
): Promise<NotifyResult> {
  const currency = details.currency || 'INR';
  const amount = typeof details.amount === 'number' ? details.amount.toLocaleString('en-IN') : details.amount;

  const body = `
    <p>Namaste <strong>${safe(recipient.name)}</strong>,</p>
    <p>This is to confirm that your payment of <strong style="color:#10b981;">₹${amount} ${currency}</strong> has been received and verified by our team.</p>
    ${details.workshopName ? `<p><strong>Workshop:</strong> ${details.workshopName}</p>` : ''}
    ${details.paymentMode ? `<p><strong>Payment Mode:</strong> ${details.paymentMode}</p>` : ''}
    <p>Thank you for your payment. You are all set!</p>
    <p>Har Har Mahadev 🙏</p>
  `;

  const email = await sendNotificationEmail(
    recipient.email,
    `✅ Payment Verified – ₹${amount} – Swar Yoga`,
    body,
  );

  return { email };
}

// ─── 9. Community Member Approved ───────────────────────────────────────────

export async function notifyCommunityApproval(
  recipient: NotificationRecipient,
  details: {
    communityName: string;
  },
): Promise<NotifyResult> {
  const body = `
    <p>Namaste <strong>${safe(recipient.name)}</strong>,</p>
    <p>Great news! Your membership in <strong>${safe(details.communityName)}</strong> has been <strong style="color:#10b981;">approved</strong>! 🎉</p>
    <p>You can now participate in community discussions, access resources, and connect with fellow members.</p>
    <p style="text-align:center; margin:24px 0;">
      <a href="${SITE_URL}" style="display:inline-block;padding:12px 28px;background:#667eea;color:#fff;text-decoration:none;border-radius:6px;font-weight:600;">Go to Community →</a>
    </p>
    <p>Har Har Mahadev 🙏</p>
  `;

  const email = await sendNotificationEmail(
    recipient.email,
    `✅ Membership Approved – ${safe(details.communityName)} – Swar Yoga`,
    body,
  );

  return { email };
}
