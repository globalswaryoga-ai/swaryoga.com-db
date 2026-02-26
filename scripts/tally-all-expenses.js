/**
 * Parse bank statement and tally ALL expense/withdrawal entries
 * Categorize each debit entry into proper expense heads
 */
require('dotenv').config({ path: '.env.local' });
const XLSX = require('xlsx');

const filePath = '/Users/mohankalburgi/Downloads/02XXXXX457_01-04-2024_31-03-202511111 (2).xlsx';
const wb = XLSX.readFile(filePath);

// Parse Table 1 sheet (has the most complete data)
const allTxns = [];

for (const sheetName of wb.SheetNames) {
  const sheet = wb.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  let hIdx = -1, dateCol = -1, narrCol = -1, debitCol = -1, creditCol = -1;

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    if (!row) continue;
    for (let j = 0; j < row.length; j++) {
      const cell = String(row[j] || '').toLowerCase().trim();
      if (cell.includes('narration') || cell === 'description') {
        hIdx = i;
        break;
      }
    }
    if (hIdx >= 0) break;
  }

  if (hIdx < 0) continue;

  const hRow = data[hIdx];
  for (let j = 0; j < hRow.length; j++) {
    const h = String(hRow[j] || '').toLowerCase().trim();
    if (h.includes('date')) dateCol = j;
    if (h === 'debit' || h.includes('debit') || h.includes('withdrawal')) debitCol = j;
    if (h === 'credit' || h.includes('credit') || h.includes('deposit')) creditCol = j;
    if (h.includes('narration') || h.includes('description')) narrCol = j;
  }

  for (let i = hIdx + 1; i < data.length; i++) {
    const row = data[i];
    if (!row || !row[dateCol]) continue;

    const debit = parseFloat(row[debitCol]) || 0;
    const credit = parseFloat(row[creditCol]) || 0;
    if (debit === 0 && credit === 0) continue;

    const narr = String(row[narrCol] || '');
    
    // Convert Excel date serial to readable date
    let dateVal = row[dateCol];
    if (typeof dateVal === 'number') {
      const d = new Date((dateVal - 25569) * 86400 * 1000);
      dateVal = d.toISOString().split('T')[0];
    }

    allTxns.push({ date: dateVal, narration: narr, debit, credit });
  }
  break; // Only first sheet with data
}

// Filter only DEBIT (withdrawal/expense) entries
const debits = allTxns.filter(t => t.debit > 0);

// Categorize each debit
function categorize(narr) {
  const n = narr.toUpperCase();
  
  // Family members
  if (n.includes('MOHAN PANDURANG') || n.includes('MOHAN KALB')) return 'Mohan Kalburgi';
  if (n.includes('UPAMANYU') || n.includes('UPAMNYU') || n.includes('UPMANYU')) return 'Upamanyu Kalburgi';
  if (n.includes('LAXMI MOHAN')) return 'Laxmi Kalburgi';
  if (n.includes('TURYA MOHAN') || n.includes('TURYA')) return 'Turya Kalburgi';
  if (n.includes('PANDURANG KRISH')) return 'Pandurang Kalburgi';
  if (n.includes('ARVIND KALBURGI')) return 'Pandurang Kalburgi';
  
  // Facebook/Meta Ads
  if (n.includes('FACEBOOK') || n.includes('META') || n.includes('FACEBOOKADS')) return 'Facebook Ads';
  
  // Google Ads
  if (n.includes('GOOGLE ADS') || n.includes('GOOGLE')) return 'Google Ads';
  
  // Zoom
  if (n.includes('ZOOM') || n.includes('ZVC INDIA')) return 'Zoom Subscription';
  
  // Canva
  if (n.includes('CANVA')) return 'Canva Subscription';
  
  // L&T Finance EMI
  if (n.includes('LNTFINANCIALSER') || n.includes('L&T')) return 'Laptop EMI (L&T Finance)';
  
  // Electricity
  if (n.includes('MSEDCL') || n.includes('MAHARASHTRA STA')) return 'Electricity Expenses';
  
  // Jio/Mobile Recharge
  if (n.includes('JIO') || n.includes('JIOPREPAID') || n.includes('AIRTEL')) return 'Mobile Recharge';
  
  // Fuel/Petrol/Diesel
  if (n.includes('PETROL') || n.includes('DIESEL') || n.includes('HP PETROL') || n.includes('RELIANCE BP') || n.includes('INDIAN OIL') || n.includes('JANSEVA DISEL')) return 'Fuel Expenses';
  
  // Travel (IRCTC, RedBus, MSRTC)
  if (n.includes('IRCTC') || n.includes('REDBUS') || n.includes('MSRTC') || n.includes('IBIBOGROUP')) return 'Travel Booking';
  
  // Car Repair
  if (n.includes('AMERIYA') || n.includes('NEWASKAR AUTO') || n.includes('CAR') || n.includes('HARK KHATRI')) return 'Vehicle Maintenance';
  
  // Zomato/Food
  if (n.includes('ZOMATO') || n.includes('DOMINOS') || n.includes('SWIGGY')) return 'Food & Beverages';
  
  // Hotel/Food (generic)
  if (n.includes('HOTEL') && !n.includes('PANDURANG')) return 'Food & Hospitality';
  
  // Medical
  if (n.includes('MEDICIN') || n.includes('MEDICAL') || n.includes('SAIJYOT') || n.includes('SUDAMA')) return 'Medical Expenses';
  
  // Office supplies / general purchases
  if (n.includes('AMAZON SELLER') || n.includes('AMAZON')) return 'Amazon Purchases';
  
  // GoDaddy / Domain
  if (n.includes('GODADDY') || n.includes('GODADDY')) return 'Domain & Hosting';
  
  // Printing/Xerox
  if (n.includes('XEROX') || n.includes('SAPTSHRUNGI') || n.includes('SHREE COMPUTER')) return 'Printing & Stationery';
  
  // Bank charges
  if (n.includes('CHRG:') || n.includes('DEBIT CARD') || n.includes('POS DECL FEE')) return 'Bank Charges';
  
  // ROC / Government
  if (n.includes('CENTRAL BOARD') || n.includes('NON TAX RECEIPT') || n.includes('ARCHAEOLOGICAL')) return 'Government Fees';
  
  // Rent
  if (n.includes('OFFICE RENT') || n.includes('PRASANNA PG')) return 'Office Rent';
  
  // Software
  if (n.includes('GOOGLE PLAY') || n.includes('JIOCINEMA') || n.includes('COMHARD')) return 'Software Expenses';
  
  // CA / Tax
  if (n.includes('TAX CARE') || n.includes('TAX')) return 'CA Fees';
  
  // Dividend payments
  if (n.includes('PRAMOD KHANVILK') || n.includes('SMITA HARSUKHLA') || n.includes('SWATI SAWANT') || 
      n.includes('AARTI AMEYE') || n.includes('SURYAWANSHI JAN') || n.includes('PATHAK VAISHALI') ||
      n.includes('DAMAYANTI') || n.includes('NANDA KANTILAL') || n.includes('ANKUR UKEY') ||
      n.includes('MANJINDER')) return 'Dividends Paid';
  
  // Workshop payments
  if (n.includes('KAILAS RAH') || n.includes('VISHAL AGR') || n.includes('MAHESH AGA') || 
      n.includes('SANTOSH AG') || n.includes('MINAKSHI') || n.includes('PRAMOD KHA') ||
      n.includes('LAGAD ABHAY') || n.includes('DHEERAJ') || n.includes('MAHADEO') ||
      n.includes('SHUBHAM ARVIND') || n.includes('SUNIL MAHARANID')) return 'Workshop Expenses';
  
  // Teacher payments  
  if (n.includes('SACHIN LAXMAN') || n.includes('PARIVAR KIRANA') || n.includes('SACHIN KALRA') || 
      n.includes('SARODAY') || n.includes('RAHUL DASHRATH') || n.includes('MEGHA MALANI')) return 'Teacher Remuneration';
  
  // Staff  
  if (n.includes('NITIN SURESH') || n.includes('RAJESH RAMCHAND')) return 'Staff Payments';
  
  // Class expenses
  if (n.includes('JYOTISH') || n.includes('ABHIJEET') || n.includes('PATIL VINAYA') || 
      n.includes('MAHA VASTU') || n.includes('JIVAN AYURVED')) return 'Class Expenses';

  // Cash to bank (contra - not expense)
  if (n.includes('BY CASH') || n.includes('CASH DEPOSIT')) return 'CONTRA (Not Expense)';

  // Miscellaneous
  return 'Miscellaneous Expenses';
}

console.log('══════════════════════════════════════════════════════════════════════════');
console.log('  ALL BANK DEBIT (EXPENSE/PAYMENT) ENTRIES - FY 2024-25');
console.log('══════════════════════════════════════════════════════════════════════════\n');

// Group by category
const byCategory = {};
let grandTotal = 0;

for (const d of debits) {
  const cat = categorize(d.narration);
  if (!byCategory[cat]) byCategory[cat] = { items: [], total: 0 };
  byCategory[cat].items.push(d);
  byCategory[cat].total += d.debit;
  grandTotal += d.debit;
}

// Sort by total descending
const sorted = Object.entries(byCategory).sort((a, b) => b[1].total - a[1].total);

for (const [cat, info] of sorted) {
  console.log('── ' + cat + ' (' + info.items.length + ' entries, Rs.' + info.total.toLocaleString('en-IN', {minimumFractionDigits: 2}) + ') ──');
  for (const item of info.items) {
    console.log('  ' + String(item.date).padEnd(12) + ' | Dr Rs.' + item.debit.toLocaleString('en-IN', {minimumFractionDigits: 2}).padStart(12) + ' | ' + item.narration.substring(0, 65));
  }
  console.log('');
}

console.log('══════════════════════════════════════════════════════════════════════════');
console.log('  SUMMARY BY EXPENSE HEAD');
console.log('══════════════════════════════════════════════════════════════════════════');

for (const [cat, info] of sorted) {
  console.log('  ' + cat.padEnd(30) + ' | ' + String(info.items.length).padStart(3) + ' txns | Dr Rs.' + info.total.toLocaleString('en-IN', {minimumFractionDigits: 2}).padStart(12));
}
console.log('  ' + '─'.repeat(65));
console.log('  ' + 'GRAND TOTAL'.padEnd(30) + ' | ' + String(debits.length).padStart(3) + ' txns | Dr Rs.' + grandTotal.toLocaleString('en-IN', {minimumFractionDigits: 2}).padStart(12));
console.log('  Bank Statement Total Withdrawals: Rs.12,85,586.53');
console.log('  Difference: Rs.' + (grandTotal - 1285586.53).toFixed(2));
