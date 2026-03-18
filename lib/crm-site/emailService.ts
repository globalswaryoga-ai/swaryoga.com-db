/**
 * CRM Billing Email Service
 * Sends payment confirmations, subscription updates, and notifications
 */

import { sendEmail, wrapInEmailTemplate } from '@/lib/email';

// Admin notification email
const ADMIN_EMAIL = 'mohan@swaryoga.com';

export interface PaymentEmailData {
  orderId: string;
  customerName: string;
  customerEmail: string;
  businessName?: string;
  plan: string;
  billing: string;
  amount: number;
  storageGB?: number;
  paymentMethod?: string;
  enableAutopay?: boolean;
  subscriptionEndDate: Date;
}

/**
 * Send payment confirmation to customer
 */
export async function sendCustomerPaymentConfirmation(data: PaymentEmailData): Promise<boolean> {
  const billingLabel = data.billing === 'annual' ? 'Annual' : data.billing === 'quarterly' ? 'Quarterly' : 'Monthly';
  const endDate = new Date(data.subscriptionEndDate).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const content = `
    <h2 style="color:#333; margin-bottom:20px;">Payment Successful! 🎉</h2>
    
    <p>Hi ${data.customerName},</p>
    
    <p>Thank you for your payment. Your CRM subscription is now active!</p>
    
    <div style="background:#f8f9fa; border-radius:8px; padding:20px; margin:20px 0;">
      <h3 style="margin-top:0; color:#667eea;">Order Details</h3>
      <table style="width:100%; border-collapse:collapse;">
        <tr><td style="padding:8px 0; color:#666;">Order ID:</td><td style="padding:8px 0; font-weight:600;">${data.orderId}</td></tr>
        <tr><td style="padding:8px 0; color:#666;">Plan:</td><td style="padding:8px 0; font-weight:600;">${data.plan} (${billingLabel})</td></tr>
        ${data.storageGB ? `<tr><td style="padding:8px 0; color:#666;">Storage:</td><td style="padding:8px 0; font-weight:600;">${data.storageGB} GB</td></tr>` : ''}
        <tr><td style="padding:8px 0; color:#666;">Amount Paid:</td><td style="padding:8px 0; font-weight:600; color:#28a745;">₹${data.amount.toLocaleString('en-IN')}</td></tr>
        <tr><td style="padding:8px 0; color:#666;">Valid Until:</td><td style="padding:8px 0; font-weight:600;">${endDate}</td></tr>
        ${data.enableAutopay ? `<tr><td style="padding:8px 0; color:#666;">Auto-renewal:</td><td style="padding:8px 0; font-weight:600; color:#28a745;">✓ Enabled</td></tr>` : ''}
      </table>
    </div>
    
    <p><a href="https://crm.swaryoga.com/admin/crm" class="btn" style="display:inline-block; padding:12px 28px; background:#667eea; color:#fff !important; text-decoration:none; border-radius:6px; font-weight:600;">Go to CRM Dashboard →</a></p>
    
    <p style="color:#666; font-size:14px; margin-top:24px;">
      Need help? Reply to this email or contact us at support@swaryoga.com
    </p>
  `;

  try {
    const result = await sendEmail({
      to: data.customerEmail,
      subject: `✅ Payment Confirmed - ${data.plan} Plan | Swar Yoga CRM`,
      html: wrapInEmailTemplate(content, 'Payment Confirmation'),
    });
    return result.success;
  } catch (err) {
    console.error('Failed to send customer payment email:', err);
    return false;
  }
}

/**
 * Send payment notification to admin
 */
export async function sendAdminPaymentNotification(data: PaymentEmailData): Promise<boolean> {
  const billingLabel = data.billing === 'annual' ? 'Annual' : data.billing === 'quarterly' ? 'Quarterly' : 'Monthly';
  const endDate = new Date(data.subscriptionEndDate).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const content = `
    <h2 style="color:#333; margin-bottom:20px;">💰 New CRM Payment Received</h2>
    
    <div style="background:#d4edda; border:1px solid #c3e6cb; border-radius:8px; padding:16px; margin-bottom:20px;">
      <strong style="color:#155724;">₹${data.amount.toLocaleString('en-IN')}</strong> received for <strong>${data.plan}</strong> plan
    </div>
    
    <h3 style="color:#667eea;">Customer Details</h3>
    <table style="width:100%; border-collapse:collapse; margin-bottom:20px;">
      <tr><td style="padding:8px 0; color:#666; width:40%;">Name:</td><td style="padding:8px 0; font-weight:600;">${data.customerName}</td></tr>
      <tr><td style="padding:8px 0; color:#666;">Email:</td><td style="padding:8px 0;"><a href="mailto:${data.customerEmail}">${data.customerEmail}</a></td></tr>
      ${data.businessName ? `<tr><td style="padding:8px 0; color:#666;">Business:</td><td style="padding:8px 0; font-weight:600;">${data.businessName}</td></tr>` : ''}
    </table>
    
    <h3 style="color:#667eea;">Subscription Details</h3>
    <table style="width:100%; border-collapse:collapse;">
      <tr><td style="padding:8px 0; color:#666; width:40%;">Order ID:</td><td style="padding:8px 0; font-family:monospace;">${data.orderId}</td></tr>
      <tr><td style="padding:8px 0; color:#666;">Plan:</td><td style="padding:8px 0; font-weight:600;">${data.plan} (${billingLabel})</td></tr>
      ${data.storageGB ? `<tr><td style="padding:8px 0; color:#666;">Storage:</td><td style="padding:8px 0;">${data.storageGB} GB</td></tr>` : ''}
      <tr><td style="padding:8px 0; color:#666;">Payment Method:</td><td style="padding:8px 0;">${data.paymentMethod?.toUpperCase() || 'UPI'}</td></tr>
      <tr><td style="padding:8px 0; color:#666;">Auto-pay:</td><td style="padding:8px 0;">${data.enableAutopay ? '✓ Yes' : '✗ No'}</td></tr>
      <tr><td style="padding:8px 0; color:#666;">Valid Until:</td><td style="padding:8px 0;">${endDate}</td></tr>
    </table>
    
    <p style="margin-top:24px;">
      <a href="https://crm.swaryoga.com/admin/crm/tenants" class="btn" style="display:inline-block; padding:12px 28px; background:#667eea; color:#fff !important; text-decoration:none; border-radius:6px; font-weight:600;">View All Tenants →</a>
    </p>
  `;

  try {
    const result = await sendEmail({
      to: ADMIN_EMAIL,
      subject: `💰 CRM Payment: ₹${data.amount.toLocaleString('en-IN')} - ${data.customerName} (${data.plan})`,
      html: wrapInEmailTemplate(content, 'New Payment'),
    });
    return result.success;
  } catch (err) {
    console.error('Failed to send admin payment email:', err);
    return false;
  }
}

/**
 * Send subscription expiry reminder (7 days before)
 */
export async function sendExpiryReminder(data: {
  customerName: string;
  customerEmail: string;
  plan: string;
  expiryDate: Date;
  renewalAmount: number;
}): Promise<boolean> {
  const expiryStr = new Date(data.expiryDate).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const content = `
    <h2 style="color:#333; margin-bottom:20px;">⏰ Your CRM Subscription Expires Soon</h2>
    
    <p>Hi ${data.customerName},</p>
    
    <p>Your <strong>${data.plan}</strong> subscription expires on <strong>${expiryStr}</strong>.</p>
    
    <div style="background:#fff3cd; border:1px solid #ffc107; border-radius:8px; padding:16px; margin:20px 0;">
      <p style="margin:0; color:#856404;">
        <strong>Renew now</strong> to continue using all CRM features without interruption.
      </p>
    </div>
    
    <p><a href="https://crm.swaryoga.com/crm-site/checkout?plan=${data.plan.toLowerCase()}" class="btn" style="display:inline-block; padding:12px 28px; background:#667eea; color:#fff !important; text-decoration:none; border-radius:6px; font-weight:600;">Renew Now - ₹${data.renewalAmount.toLocaleString('en-IN')} →</a></p>
    
    <p style="color:#666; font-size:14px; margin-top:24px;">
      Questions? Reply to this email or contact support@swaryoga.com
    </p>
  `;

  try {
    const result = await sendEmail({
      to: data.customerEmail,
      subject: `⏰ Your CRM Subscription Expires in 7 Days | Swar Yoga`,
      html: wrapInEmailTemplate(content, 'Subscription Reminder'),
    });
    return result.success;
  } catch (err) {
    console.error('Failed to send expiry reminder:', err);
    return false;
  }
}

/**
 * Send welcome email after signup (free plan)
 */
export async function sendWelcomeEmail(data: {
  customerName: string;
  customerEmail: string;
  tenantSlug: string;
}): Promise<boolean> {
  const content = `
    <h2 style="color:#333; margin-bottom:20px;">Welcome to Swar Yoga CRM! 🎉</h2>
    
    <p>Hi ${data.customerName},</p>
    
    <p>Your free CRM account is ready. Here's what you can do:</p>
    
    <div style="background:#f8f9fa; border-radius:8px; padding:20px; margin:20px 0;">
      <ul style="margin:0; padding-left:20px;">
        <li style="margin-bottom:10px;">✓ Manage up to 100 leads</li>
        <li style="margin-bottom:10px;">✓ Build 1 chatbot flow</li>
        <li style="margin-bottom:10px;">✓ Track your sales funnel</li>
        <li style="margin-bottom:10px;">✓ Basic analytics & reports</li>
      </ul>
    </div>
    
    <p>Ready for more? <a href="https://crm.swaryoga.com/crm-site/pricing">Upgrade your plan</a> for unlimited leads, WhatsApp API, AI calls, and more!</p>
    
    <p><a href="https://crm.swaryoga.com/admin/crm" class="btn" style="display:inline-block; padding:12px 28px; background:#667eea; color:#fff !important; text-decoration:none; border-radius:6px; font-weight:600;">Start Using CRM →</a></p>
    
    <p style="color:#666; font-size:14px; margin-top:24px;">
      Questions? Reply to this email or contact support@swaryoga.com
    </p>
  `;

  try {
    const result = await sendEmail({
      to: data.customerEmail,
      subject: `🎉 Welcome to Swar Yoga CRM | Your Account is Ready`,
      html: wrapInEmailTemplate(content, 'Welcome'),
    });
    return result.success;
  } catch (err) {
    console.error('Failed to send welcome email:', err);
    return false;
  }
}
