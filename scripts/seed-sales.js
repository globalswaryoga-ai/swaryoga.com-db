#!/usr/bin/env node

/**
 * Seed script to populate all bank statement income sales entries
 * Run with: node scripts/seed-sales.js
 */

const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

const salesData = [
  { customerName: "Mark Austreliya", workshopName: "Teacher Training", saleAmount: 33000, saleDate: "2026-05-21" },
  { customerName: "Khushali Peshant", workshopName: "Aahar Shastra", saleAmount: 1500, saleDate: "2026-05-20" },
  { customerName: "Raghavenra Sign", workshopName: "Swar Yoga L-3", saleAmount: 3600, saleDate: "2026-05-17" },
  { customerName: "Kulkarni Jaymala", workshopName: "Advance", saleAmount: 7500, saleDate: "2026-05-14" },
  { customerName: "Ruchi Nair", workshopName: "Swar Yoga L-3", saleAmount: 3600, saleDate: "2026-05-14" },
  { customerName: "Laxmikant Jahagirdar", workshopName: "Swar Yoga L-3", saleAmount: 1000, saleDate: "2026-05-11" },
  { customerName: "Geeta Arrora", workshopName: "Swar Yoga L-3", saleAmount: 3600, saleDate: "2026-05-10" },
  { customerName: "Gopika Sharma", workshopName: "Swar Yoga L-3", saleAmount: 3600, saleDate: "2026-05-10" },
  { customerName: "Anna Sol", workshopName: "Advance", saleAmount: 2000, saleDate: "2026-05-10" },
  { customerName: "Rashmi Kolhe", workshopName: "Swar Yoga L-3", saleAmount: 3600, saleDate: "2026-05-10" },
  { customerName: "Neelom Gond", workshopName: "Meditation Class", saleAmount: 1500, saleDate: "2026-05-06" },
  { customerName: "Babita Nandal", workshopName: "Swar Yoga", saleAmount: 3000, saleDate: "2026-05-03" },
  { customerName: "Swati Desai", workshopName: "Swar Yoga", saleAmount: 1500, saleDate: "2026-05-01" },
  { customerName: "Dnyaneshwar", workshopName: "Swar Yoga", saleAmount: 1500, saleDate: "2026-05-01" },
  { customerName: "Meera Kalburgi", workshopName: "Advance", saleAmount: 15000, saleDate: "2026-05-01" },
  { customerName: "Vishal Singh", workshopName: "Swar Yoga", saleAmount: 1500, saleDate: "2026-04-29" },
  { customerName: "Veedhi Panjabi", workshopName: "Swar Yoga", saleAmount: 1500, saleDate: "2026-04-29" },
  { customerName: "Kanchan Chug", workshopName: "Swar Yoga", saleAmount: 1500, saleDate: "2026-04-29" },
  { customerName: "Jaydev Deshmukh", workshopName: "Swar Yoga", saleAmount: 1500, saleDate: "2026-04-28" },
  { customerName: "Divya Ballal", workshopName: "Swar Yoga", saleAmount: 1500, saleDate: "2026-04-28" },
  { customerName: "Raut Madam", workshopName: "Swar Yoga", saleAmount: 1500, saleDate: "2026-04-28" },
  { customerName: "Narendra Sharma", workshopName: "Swar Yoga", saleAmount: 1500, saleDate: "2026-04-28" },
  { customerName: "Kanchan Jadhawani", workshopName: "Aahar Shastra", saleAmount: 1500, saleDate: "2026-04-15" },
  { customerName: "Ahamudeen Nepal", workshopName: "Aahar Shastra", saleAmount: 1000, saleDate: "2026-04-25" },
  { customerName: "Pankaj Kaushik", workshopName: "Aahar Shastra", saleAmount: 1500, saleDate: "2026-04-25" },
  { customerName: "Shubham Rai", workshopName: "Aahar Shastra", saleAmount: 300, saleDate: "2026-04-25" },
  { customerName: "Gopika Sharma", workshopName: "Aahar Shastra", saleAmount: 1500, saleDate: "2026-04-22" },
  { customerName: "Geeta Rane", workshopName: "Aahar Shastra", saleAmount: 1500, saleDate: "2026-04-22" },
  { customerName: "Jayanti Bindu", workshopName: "Aahar Shastra", saleAmount: 1500, saleDate: "2026-04-22" },
  { customerName: "Sulakashana Sol", workshopName: "Aahar Shastra", saleAmount: 1500, saleDate: "2026-04-22" },
  { customerName: "Yogita Jain", workshopName: "Aahar Shastra", saleAmount: 1500, saleDate: "2026-04-22" },
  { customerName: "Bhutada Lady", workshopName: "Aahar Shastra", saleAmount: 1500, saleDate: "2026-04-17" },
  { customerName: "Meeta Kal", workshopName: "Advance", saleAmount: 730, saleDate: "2026-04-20" },
  { customerName: "Retesh UP", workshopName: "Swar Yoga", saleAmount: 1000, saleDate: "2026-04-06" },
  { customerName: "Turya Kalburgi", workshopName: "Advance", saleAmount: 772, saleDate: "2026-04-05" },
  { customerName: "Sheerisha", workshopName: "Aahar Shastra", saleAmount: 1500, saleDate: "2026-04-22" },
  { customerName: "Shree Patil", workshopName: "Teacher Training", saleAmount: 33000, saleDate: "2026-06-15" },
];

async function seed() {
  try {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      console.error('❌ MONGODB_URI not found in environment');
      process.exit(1);
    }

    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(uri);

    const crmDb = mongoose.connection.useDb('swaryoga_admin_crm');
    const salesCollection = crmDb.collection('sales');

    // Convert dates
    const records = salesData.map(sale => {
      const [y, m, d] = sale.saleDate.split('-');
      return {
        customerName: sale.customerName,
        workshopName: sale.workshopName,
        saleAmount: sale.saleAmount,
        paidAmount: sale.saleAmount,
        dueAmount: 0,
        saleDate: new Date(parseInt(y), parseInt(m) - 1, parseInt(d)),
        paymentType: 'full',
        paymentMode: 'bank_transfer',
        status: 'completed',
        labels: ['bank-import'],
        createdAt: new Date(),
        createdByUserId: 'admin-seed',
      };
    });

    console.log(`📝 Inserting ${records.length} sales entries...`);
    const result = await salesCollection.insertMany(records);

    console.log(`✅ Successfully imported ${result.insertedIds.length} sales entries`);
    console.log('📊 Summary:');
    console.log(`   Total Amount: ₹${records.reduce((sum, r) => sum + r.saleAmount, 0).toLocaleString('en-IN')}`);

    // Group by workshop
    const byWorkshop = {};
    records.forEach(r => {
      byWorkshop[r.workshopName] = (byWorkshop[r.workshopName] || 0) + r.saleAmount;
    });
    Object.entries(byWorkshop).forEach(([ws, amt]) => {
      console.log(`   ${ws}: ₹${amt.toLocaleString('en-IN')}`);
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

seed();
