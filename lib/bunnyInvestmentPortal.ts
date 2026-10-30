/**
 * Investor Portal - payments, login and payment helpers.
 * Bunny Database only (no MongoDB).
 */

import crypto from 'node:crypto';
import { bunnyExecute } from '@/lib/bunnyDatabase';
import {
  ensureBunnyInvestmentSchema,
  getInvestmentByCertificate,
  getInvestmentById,
  recordRemainingPayment,
  InvestmentRecord,
  BASE_MIN_BOOKING,
} from '@/lib/bunnyInvestmentRepository';

export type PaymentPurpose = 'booking' | 'balance';

export interface InvestmentPaymentRecord {
  txnid: string;
  investmentId: string;
  purpose: PaymentPurpose;
  amount: number;
  status: 'pending' | 'processing' | 'success' | 'failed';
  payuId?: string;
  createdAt: string;
  updatedAt: string;
}

let portalSchemaReady = false;

export async function ensurePortalSchema() {
  if (portalSchemaReady) return;
  await ensureBunnyInvestmentSchema();
  await bunnyExecute({
    sql: `CREATE TABLE IF NOT EXISTS bunny_investment_payments_sql (
      txnid TEXT PRIMARY KEY,
      investment_id TEXT NOT NULL,
      purpose TEXT NOT NULL,
      amount REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      payu_id TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`,
    args: [],
  });
  await bunnyExecute({
    sql: 'CREATE INDEX IF NOT EXISTS idx_inv_pay_invid ON bunny_investment_payments_sql(investment_id)',
    args: [],
  });
  portalSchemaReady = true;
}

/** Unique PayU transaction id (max 25 chars, alphanumeric). */
export function newInvestmentTxnId() {
  return `INV${Date.now().toString(36)}${crypto.randomBytes(3).toString('hex')}`.toUpperCase();
}

/** What the investor can pay right now. */
export function getPaymentOptions(inv: InvestmentRecord) {
  const remaining = Math.max(inv.totalInvestmentAmount - inv.amountPaid, 0);
  const firstPayment = Math.max(inv.bookingAmountRequested || BASE_MIN_BOOKING, BASE_MIN_BOOKING);
  const bookingDue = inv.amountPaid < firstPayment ? Math.min(firstPayment - inv.amountPaid, remaining) : 0;
  return {
    remaining,
    booking: bookingDue > 0 ? { purpose: 'booking' as const, amount: bookingDue } : null,
    balance: remaining > 0 ? { purpose: 'balance' as const, amount: remaining } : null,
  };
}

export async function createInvestmentPayment(params: {
  txnid: string;
  investmentId: string;
  purpose: PaymentPurpose;
  amount: number;
}) {
  await ensurePortalSchema();
  const now = new Date().toISOString();
  await bunnyExecute({
    sql: `INSERT INTO bunny_investment_payments_sql (txnid, investment_id, purpose, amount, status, created_at, updated_at)
          VALUES (?, ?, ?, ?, 'pending', ?, ?)`,
    args: [params.txnid, params.investmentId, params.purpose, params.amount, now, now],
  });
}

export async function getInvestmentPayment(txnid: string): Promise<InvestmentPaymentRecord | null> {
  await ensurePortalSchema();
  const res = await bunnyExecute({
    sql: 'SELECT * FROM bunny_investment_payments_sql WHERE txnid = ? LIMIT 1',
    args: [txnid],
  });
  const r: any = res.rows[0];
  if (!r) return null;
  return {
    txnid: String(r.txnid),
    investmentId: String(r.investment_id),
    purpose: r.purpose as PaymentPurpose,
    amount: Number(r.amount),
    status: r.status as InvestmentPaymentRecord['status'],
    payuId: r.payu_id ? String(r.payu_id) : undefined,
    createdAt: String(r.created_at),
    updatedAt: String(r.updated_at),
  };
}

export async function listInvestmentPayments(investmentId: string): Promise<InvestmentPaymentRecord[]> {
  await ensurePortalSchema();
  const res = await bunnyExecute({
    sql: 'SELECT txnid FROM bunny_investment_payments_sql WHERE investment_id = ? ORDER BY created_at DESC LIMIT 50',
    args: [investmentId],
  });
  const rows: InvestmentPaymentRecord[] = [];
  for (const r of res.rows as any[]) {
    const p = await getInvestmentPayment(String(r.txnid));
    if (p) rows.push(p);
  }
  return rows;
}

/**
 * Apply a verified PayU success exactly once.
 * The pending -> processing claim is atomic, so a repeated callback is a no-op.
 * Returns true if this call applied the payment.
 */
export async function applyVerifiedPayment(params: { txnid: string; payuId?: string }): Promise<boolean> {
  await ensurePortalSchema();
  const claim = await bunnyExecute({
    sql: `UPDATE bunny_investment_payments_sql SET status = 'processing', payu_id = ?, updated_at = ?
          WHERE txnid = ? AND status = 'pending'`,
    args: [params.payuId || null, new Date().toISOString(), params.txnid],
  });
  if (Number(claim.rowsAffected) !== 1) return false;

  const payment = await getInvestmentPayment(params.txnid);
  if (!payment) return false;

  try {
    await recordRemainingPayment({
      investmentId: payment.investmentId,
      amountPaid: payment.amount,
      txnid: payment.txnid,
      paymentMethod: 'payu',
    });
  } catch (err) {
    // Put it back so a later callback can retry instead of losing the payment
    await bunnyExecute({
      sql: `UPDATE bunny_investment_payments_sql SET status = 'pending', updated_at = ? WHERE txnid = ?`,
      args: [new Date().toISOString(), params.txnid],
    });
    throw err;
  }

  await bunnyExecute({
    sql: `UPDATE bunny_investment_payments_sql SET status = 'success', updated_at = ? WHERE txnid = ?`,
    args: [new Date().toISOString(), params.txnid],
  });
  return true;
}

export async function failInvestmentPayment(txnid: string, payuId?: string) {
  await ensurePortalSchema();
  await bunnyExecute({
    sql: `UPDATE bunny_investment_payments_sql SET status = 'failed', payu_id = ?, updated_at = ?
          WHERE txnid = ? AND status = 'pending'`,
    args: [payuId || null, new Date().toISOString(), txnid],
  });
}

/** Phone + certificate number must both match. Used for investor sign-in. */
export async function findInvestorForLogin(phone: string, certificateNumber: string): Promise<InvestmentRecord | null> {
  const cleanPhone = phone.replace(/\D/g, '').slice(-10);
  if (cleanPhone.length !== 10 || !certificateNumber.trim()) return null;
  const inv = await getInvestmentByCertificate(certificateNumber);
  if (!inv) return null;
  if (inv.phone.replace(/\D/g, '').slice(-10) !== cleanPhone) return null;
  return inv;
}

export async function getInvestorById(id: string) {
  return getInvestmentById(id);
}
