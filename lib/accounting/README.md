# Accounting System — Developer Reference

## 1. Double-Entry Accounting Theory (Developer Format)

### The Golden Rules
Every financial transaction affects **at least two accounts** equally:

```
Total Debits = Total Credits  (ALWAYS, for every voucher)
```

### Account Types & Natural Balance

| Type       | Natural Balance | Increase by | Decrease by | Examples                        |
|------------|----------------|-------------|-------------|---------------------------------|
| **Asset**      | Debit          | Debit       | Credit      | Cash, Bank, Equipment, Debtors  |
| **Liability**  | Credit         | Credit      | Debit       | Loans, Creditors, Share Capital |
| **Income**     | Credit         | Credit      | Debit       | Course Fees, Interest Received  |
| **Expense**    | Debit          | Debit       | Credit      | Rent, Salaries, Electricity     |
| **Equity**     | Credit         | Credit      | Debit       | Share Capital, Reserves         |

### Balance Sheet Equation
```
Assets = Liabilities + Equity + (Income - Expenses)
```

### Voucher Types (Indian Accounting / Tally-compatible)
| Voucher Type | Typical Usage                      | Debit Side      | Credit Side      |
|--------------|------------------------------------|-----------------|------------------|
| **Receipt**  | Money received from party          | Cash/Bank       | Income/Party     |
| **Payment**  | Money paid to party                | Expense/Party   | Cash/Bank        |
| **Journal**  | Adjustments, depreciation, accrual | Account(s)      | Account(s)       |
| **Sales**    | Invoice raised                     | Debtor/Cash     | Sales Income     |
| **Purchase** | Bill received                      | Purchase/Expense| Creditor/Cash    |
| **Contra**   | Fund transfer between Cash/Bank    | Cash/Bank       | Cash/Bank        |

---

## 2. Data Model Architecture

### Three Core Collections:
```
accounting_groups     →  Chart of Accounts hierarchy (tree structure)
accounting_ledgers    →  Individual accounts (leaf nodes of the tree)
accounting_vouchers   →  Every transaction (multi-leg debit/credit entries)
```

### Group Hierarchy (Tally Prime Compatible)
```
Root
├── Capital Account (Equity)
│   ├── Share Capital
│   └── Reserves & Surplus
├── Current Liabilities
│   ├── Sundry Creditors
│   ├── Duties & Taxes
│   └── Provisions
├── Loans (Liability)
│   ├── Secured Loans
│   └── Unsecured Loans
├── Fixed Assets
│   └── (Computers, Furniture, etc.)
├── Current Assets
│   ├── Cash-in-Hand
│   ├── Bank Accounts
│   ├── Sundry Debtors
│   └── Deposits (Asset)
├── Direct Incomes
│   └── Sales Accounts
├── Indirect Incomes
├── Direct Expenses
│   └── Purchase Accounts
└── Indirect Expenses
```

### Voucher Entry Structure (Multi-Leg)
Each voucher has **multiple ledger entries** that MUST balance:
```json
{
  "voucherNumber": "RCV-001",
  "voucherType": "Receipt",
  "date": "2024-05-15",
  "entries": [
    { "ledgerId": "kotak-bank", "amount": 15000, "type": "Dr" },
    { "ledgerId": "course-fees", "amount": 15000, "type": "Cr" }
  ],
  "narration": "Course fee received from student",
  "totalDebit": 15000,
  "totalCredit": 15000
}
```

### Report Computation
- **Trial Balance**: Sum all ledger closing balances; Total Dr must = Total Cr
- **P&L Statement**: Income groups (Cr) minus Expense groups (Dr) = Net Profit/Loss
- **Balance Sheet**: Assets (Dr) = Liabilities (Cr) + Equity + Retained Earnings

---

## 3. File Structure
```
lib/accounting/
├── README.md                  ← This file
├── schemas.ts                 ← Mongoose schemas (Groups, Ledgers, Vouchers)
├── engine.ts                  ← Auto-calculation logic (balances, reports)
├── seedGroups.ts              ← Default Chart of Accounts (Indian/Tally standard)
├── types.ts                   ← TypeScript interfaces
└── validation.ts              ← Voucher validation (debit=credit, etc.)

app/api/admin/crm/accounting/
├── groups/route.ts            ← CRUD for account groups
├── ledgers/route.ts           ← CRUD for ledgers
├── vouchers/route.ts          ← CRUD for vouchers (with validation)
├── trial-balance/route.ts     ← Trial Balance report
├── profit-loss/route.ts       ← P&L Statement
├── balance-sheet/route.ts     ← Balance Sheet
└── seed/route.ts              ← Seed default groups
```
