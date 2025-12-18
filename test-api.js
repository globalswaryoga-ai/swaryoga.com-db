#!/usr/bin/env node

// Quick test script to verify API parsing works correctly

const workshopMap = {
  'SWARYOGA_BASIC': { id: 'swar-yoga-basic', name: 'Swar Yoga Basic Workshop' },
  'SWARYOGA_LEVEL1': { id: 'swar-yoga-level-1', name: 'Swar Yoga Level-1 Workshop' },
};

// Test matching logic
const testKeys = [
  'SWARYOGA_BASIC_1',
  'SWARYOGA_LEVEL1_1',
  'SWARYOGA_BASIC_2',
];

testKeys.forEach(key => {
  console.log(`\nTesting key: ${key}`);
  
  for (const [prefix, info] of Object.entries(workshopMap)) {
    const cleanPrefix = prefix.replace(/_$/, '');
    const matches = key.includes(cleanPrefix);
    console.log(`  Prefix: ${prefix} (cleaned: ${cleanPrefix}) -> matches: ${matches}`);
    
    if (matches) {
      console.log(`  ✅ MATCHED: ${info.id}`);
      break;
    }
  }
});

// Test parsing env format
console.log('\n\nTesting .env parsing:');
const envValue = '25-Jan to 28-Jan|28-Jan|3 days|19:00 to 21:00|50|10-Jan|online|Hindi|Zoom|96';
const parts = envValue.split('|');
console.log(`Parts length: ${parts.length}`);
console.log(`Parts:`, parts);

if (parts.length >= 9) {
  const [dates, endDate, days, time, slots, registrationCloseDate, mode, language, location, fees] = parts;
  console.log(`
  ✅ Parsed successfully:
  - Dates: ${dates}
  - End Date: ${endDate}
  - Days: ${days}
  - Time: ${time}
  - Slots: ${slots}
  - Registration Close: ${registrationCloseDate}
  - Mode: ${mode}
  - Language: ${language}
  - Location: ${location}
  - Fees: ${fees}
  `);
} else {
  console.log('❌ NOT ENOUGH PARTS!');
}
