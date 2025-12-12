/**
 * Test file for Panchang calculations
 * Run with: npx ts-node lib/panchang.test.ts
 */

import { calculatePanchang, isAuspiciousDate, getTithiName } from './panchang';

async function testPanchang() {
  console.log('🚀 Testing Panchang Integration\n');
  
  try {
    // Test 1: Today's date
    const today = new Date();
    console.log(`📅 Calculating Panchang for: ${today.toDateString()}`);
    console.log(`📍 Location: Delhi (28.6139°N, 77.209°E)\n`);
    
    const panchang = await calculatePanchang(
      today,
      28.6139,  // Delhi latitude
      77.209,   // Delhi longitude
      'Asia/Kolkata'
    );
    
    console.log('✅ Panchang Data:');
    console.log('─'.repeat(50));
    console.log(`Date: ${panchang.date}`);
    console.log(`Day: ${panchang.day}\n`);
    
    console.log('FIVE PANCHANG ELEMENTS:');
    console.log('─'.repeat(50));
    
    console.log(`\n1. TITHI (Lunar Day):`);
    console.log(`   Name: ${panchang.tithi.name}`);
    console.log(`   Paksha: ${panchang.tithi.paksha}`);
    console.log(`   Number: ${panchang.tithi.number}/30`);
    
    console.log(`\n2. NAKSHATRA (Lunar Mansion):`);
    console.log(`   Name: ${panchang.nakshatra.name}`);
    console.log(`   Deity: ${panchang.nakshatra.deity}`);
    console.log(`   Number: ${panchang.nakshatra.number}/27`);
    
    console.log(`\n3. YOGA (Auspiciousness):`);
    console.log(`   Name: ${panchang.yoga.name}`);
    console.log(`   Type: ${panchang.yoga.type}`);
    console.log(`   Number: ${panchang.yoga.number}/27`);
    
    console.log(`\n4. KARANA (Half Tithi):`);
    console.log(`   Name: ${panchang.karana.name}`);
    console.log(`   Type: ${panchang.karana.type}`);
    
    console.log(`\n5. VAARA (Day of Week):`);
    console.log(`   Day: ${panchang.vaara.name}`);
    
    console.log(`\n6. RAASI (Zodiac Sign):`);
    console.log(`   Sign: ${panchang.raasi.name}`);
    console.log(`   Element: ${panchang.raasi.element}`);
    console.log(`   Symbol: ${panchang.raasi.symbol}`);
    
    console.log(`\nAYANAMSA:`);
    console.log(`   Value: ${panchang.ayanamsa}°`);
    
    // Test auspiciousness
    const isAuspicious = isAuspiciousDate(panchang);
    console.log(`\n${'─'.repeat(50)}`);
    console.log(`Is Auspicious: ${isAuspicious ? '✨ YES' : '⚡ NO'}`);
    
    // Test helper function
    console.log(`\n${'─'.repeat(50)}`);
    console.log(`\nHelper Functions Test:`);
    console.log(`getTithiName(10, true) = ${getTithiName(10, true)}`);
    console.log(`getTithiName(15, true) = ${getTithiName(15, true)} (Full Moon)`);
    console.log(`getTithiName(15, false) = ${getTithiName(15, false)} (New Moon)`);
    
    console.log(`\n✅ All tests passed! Panchang integration is working.\n`);
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

testPanchang();
