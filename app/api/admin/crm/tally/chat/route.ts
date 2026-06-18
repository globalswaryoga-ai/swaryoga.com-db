/**
 * Tally AI Chat API
 *
 * POST /api/admin/crm/tally/chat
 * Body: { message, history, fy: { from, to } }
 *
 * Uses Google Gemini (free) to answer Tally-related questions.
 * Optionally fetches live data from Tally to provide context.
 */

import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/crm-handlers';
import {
  fetchDashboardSummary,
  fetchLedgers,
  fetchVouchers,
  fetchProfitAndLoss,
  fetchBalanceSheet,
  testTallyConnection,
} from '@/lib/tally/tallyPrimeAPI';

export const dynamic = 'force-dynamic';


function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

// Gather relevant Tally context based on the user's question
async function gatherTallyContext(message: string, fy: { from: string; to: string }) {
  const lower = message.toLowerCase();
  const parts: string[] = [];

  try {
    // Always try to get basic summary
    const conn = await testTallyConnection();
    if (!conn.connected) {
      return 'Tally Prime is currently not connected. The user should make sure Tally is running and ODBC/XML Server is enabled (F12 → Advanced → Enable).';
    }

    // Smart context gathering based on question keywords
    const needsSummary = /dashboard|summary|overview|total|how much|kitna|receipt|sale|purchase|debtor|creditor/i.test(lower);
    const needsLedger = /ledger|balance|party|debtor|creditor|account|customer|client|outstanding|bakaya/i.test(lower);
    const needsPL = /profit|loss|p&l|income|expense|revenue|earning|kamai/i.test(lower);
    const needsBS = /balance sheet|asset|liability|capital|net worth/i.test(lower);
    const needsReceipts = /receipt|payment|received|paid|collection/i.test(lower);
    const needsSales = /sale|invoice|bill|sold/i.test(lower);
    const needsPurchases = /purchase|bought|vendor|supplier/i.test(lower);

    if (needsSummary || (!needsLedger && !needsPL && !needsBS)) {
      const summary = await fetchDashboardSummary(fy.from, fy.to);
      parts.push(`Dashboard Summary (${fy.from}-${fy.to}):`);
      parts.push(`Company: ${summary.company?.name || 'Unknown'}`);
      parts.push(`Total Sales: ₹${summary.totalSales.toLocaleString('en-IN')} (${summary.salesCount} vouchers)`);
      parts.push(`Total Receipts: ₹${summary.totalReceipts.toLocaleString('en-IN')} (${summary.receiptCount} vouchers)`);
      parts.push(`Total Purchases: ₹${summary.totalPurchases.toLocaleString('en-IN')} (${summary.purchaseCount} vouchers)`);
      parts.push(`Debtors: ₹${summary.totalDebtors.toLocaleString('en-IN')} (${summary.debtorCount} parties)`);
      parts.push(`Creditors: ₹${summary.totalCreditors.toLocaleString('en-IN')} (${summary.creditorCount} parties)`);
    }

    if (needsLedger) {
      const ledgers = await fetchLedgers();
      const top = ledgers.slice(0, 30).map(l =>
        `${l.name} (${l.parent}): ₹${Math.abs(l.closingBalance).toLocaleString('en-IN')} ${l.closingBalance < 0 ? 'Cr' : 'Dr'}`
      );
      parts.push(`\nTop Ledgers:\n${top.join('\n')}`);
    }

    if (needsPL) {
      const pl = await fetchProfitAndLoss(fy.from, fy.to);
      parts.push(`\nProfit & Loss:`);
      parts.push(`Total Income: ₹${pl.totalIncome.toLocaleString('en-IN')}`);
      parts.push(`Total Expenses: ₹${pl.totalExpenses.toLocaleString('en-IN')}`);
      parts.push(`Net Profit: ₹${pl.netProfit.toLocaleString('en-IN')}`);
      pl.income.forEach(g => parts.push(`  Income - ${g.name}: ₹${g.amount.toLocaleString('en-IN')}`));
      pl.expenses.forEach(g => parts.push(`  Expense - ${g.name}: ₹${g.amount.toLocaleString('en-IN')}`));
    }

    if (needsBS) {
      const bs = await fetchBalanceSheet(fy.from, fy.to);
      parts.push(`\nBalance Sheet:`);
      parts.push(`Total Assets: ₹${bs.totalAssets.toLocaleString('en-IN')}`);
      parts.push(`Total Liabilities: ₹${bs.totalLiabilities.toLocaleString('en-IN')}`);
      bs.assets.forEach(g => parts.push(`  Asset - ${g.name}: ₹${g.amount.toLocaleString('en-IN')}`));
      bs.liabilities.forEach(g => parts.push(`  Liability - ${g.name}: ₹${g.amount.toLocaleString('en-IN')}`));
    }

    if (needsReceipts) {
      const receipts = await fetchVouchers('Receipt', fy.from, fy.to);
      const recent = receipts.slice(-15).reverse();
      parts.push(`\nRecent Receipts (${receipts.length} total):`);
      recent.forEach(v => parts.push(`  ${v.date} | ${v.partyName} | ₹${v.amount.toLocaleString('en-IN')} | ${v.voucherNumber}`));
    }

    if (needsSales) {
      const sales = await fetchVouchers('Sales', fy.from, fy.to);
      const recent = sales.slice(-15).reverse();
      parts.push(`\nRecent Sales (${sales.length} total):`);
      recent.forEach(v => parts.push(`  ${v.date} | ${v.partyName} | ₹${v.amount.toLocaleString('en-IN')} | ${v.voucherNumber}`));
    }

    if (needsPurchases) {
      const purchases = await fetchVouchers('Purchase', fy.from, fy.to);
      const recent = purchases.slice(-15).reverse();
      parts.push(`\nRecent Purchases (${purchases.length} total):`);
      recent.forEach(v => parts.push(`  ${v.date} | ${v.partyName} | ₹${v.amount.toLocaleString('en-IN')} | ${v.voucherNumber}`));
    }

    return parts.join('\n');
  } catch (err: any) {
    return `Error fetching Tally data: ${err.message}. Tally may not be running.`;
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return unauthorized();
    const decoded = verifyToken(authHeader.split(' ')[1]);
    if (!decoded || !decoded.isAdmin) return unauthorized();
    if (!isSuperAdmin(decoded)) {
      return NextResponse.json({ error: 'Forbidden: Superadmin access required for Tally data' }, { status: 403 });
    }

    await connectDB();

    const body = await request.json();
    const { message, history = [], fy = { from: '20240401', to: '20250331' } } = body;

    if (!message?.trim()) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // Support both Gemini (free) and OpenAI (paid)
    const geminiKey = process.env.GEMINI_API_KEY;
    const openaiKey = process.env.OPENAI_API_KEY;
    
    if (!geminiKey && !openaiKey) {
      return NextResponse.json({
        reply: 'AI is not configured yet. Please add GEMINI_API_KEY (free) or OPENAI_API_KEY to your environment variables to enable the Tally AI assistant.',
      });
    }

    // Gather live Tally context
    const tallyContext = await gatherTallyContext(message, fy);

    const systemPrompt = `You are a Tally Prime AI assistant for Swar Yoga CRM. You help the admin user understand and analyze their Tally accounting data.

ROLE: Answer questions about ledger balances, receipts, sales, purchases, profit & loss, balance sheet, outstanding amounts, and other Tally/accounting queries.

CONTEXT: The business is "Upamnyu International Education P.ltd" — a professional services company (primarily receipts, not GST-based sales). The Tally software is Tally Prime 3.0.1.

LIVE TALLY DATA:
${tallyContext}

RULES:
- Answer in clear, concise language. Use ₹ for amounts.
- If the user asks in Hindi, reply in Hindi.
- Format numbers in Indian notation (e.g., ₹1,23,456).
- If data is not available, say so clearly and suggest what to check.
- Never make up financial figures — only use the data provided above.
- For complex accounting questions, explain the concept briefly.
- Keep responses under 300 words unless the user asks for detailed breakdown.`;

    let reply: string;

    if (geminiKey) {
      // ── Google Gemini (free tier) ──
      // gemini-2.0-flash's free-tier quota is now 0 (sunset) — confirmed live, 2.5-flash works.
      const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`;
      
      // Build Gemini format: system instruction + history + user message
      const contents = [
        ...history.slice(-8).map((m: any) => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }],
        })),
        { role: 'user', parts: [{ text: message }] },
      ];

      const res = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents,
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 800,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        console.error('[Tally Chat Gemini Error]', data);
        return NextResponse.json({
          reply: `AI error: ${data?.error?.message || 'Gemini request failed'}`,
        });
      }

      reply = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response from AI.';
    } else {
      // ── OpenAI (paid) ──
      const messages = [
        { role: 'system', content: systemPrompt },
        ...history.slice(-8).map((m: any) => ({ role: m.role, content: m.content })),
        { role: 'user', content: message },
      ];

      const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${openaiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: 0.3,
          max_tokens: 800,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        console.error('[Tally Chat AI Error]', data);
        return NextResponse.json({
          reply: `AI error: ${data?.error?.message || 'OpenAI request failed'}`,
        });
      }

      reply = data.choices?.[0]?.message?.content || 'No response from AI.';
    }

    return NextResponse.json({ success: true, reply });
  } catch (error: any) {
    console.error('[Tally Chat Error]', error);
    return NextResponse.json({ error: error.message || 'Chat failed' }, { status: 500 });
  }
}
