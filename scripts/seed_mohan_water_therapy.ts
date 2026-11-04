import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { bunnyExecute } from '../lib/bunnyDatabase';

async function seedWaterTherapy() {
  const content = `# मोहन काळबुर्गी सरांची जल चिकित्सा (Mohan Sir's Authentic Water Therapy Protocol)
मार्गदर्शक: मोहन काळबुर्गी सर (Mohan Kalburgi Sir)
विषय: दिवस २ - जल चिकित्सा, पाणी पिण्याचे नियम आणि गॅस निवारण (Water Therapy & Gas Elimination)
कार्यशाळा: स्वर योग लेवल १ (Swar Yoga Level 1)

【मोहन सरांचे पाणी पिण्याचे काटेकोर नियम (Mohan Sir's Strict Water Therapy Rules)】:
१. एका वेळेस फक्त ३ घोट पाणी पिणे (Drink Strictly 3 Sips at a Time):
   • पाणी कधीही घटाघटा, घाईघाईने किंवा उभे राहून पिऊ नये.
   • एका वेळेस फक्त ३ घोट हळूहळू आणि बसूनच प्यावे. यामुळे तोंडातील अल्कलाईन लाळ (Alkaline Saliva) पाण्यासवे पोटात उतरून ऍसिडिटी व पित्ताचा त्वरित नाश करते.

२. पाण्याचे अचूक दैनंदिन वेळापत्रक व प्रमाण (Daily Water Timings & Quota):
   • सकाळी ५:०० ते १०:०० च्या दरम्यान २ लिटर पाणी पिऊन पूर्ण करावे (Cover 2 Litres of water from 5:00 AM to 10:00 AM).
   • दुपारी २:०० ते रात्री ९:०० च्या दरम्यान १.५ लिटर पाणी पिऊन पूर्ण करावे (Cover 1.5 Litres of water from 2:00 PM to 9:00 PM).

३. रात्री ९:०० नंतर पाणी पिणे पूर्णपणे बंद (Strictly NO Water After 9:00 PM):
   • रात्री ९:०० नंतर अजिबात पाणी पिऊ नये. रात्री शरीराची पचनशक्ती आणि चयापचय (Metabolism) मंदावतो. रात्री पाणी पिल्याने झोपमोड होते, शरीरावर सूज येते आणि किडनीवर अनावश्यक ताण पडतो.

४. पाणी पिताना स्वर / नाडी नियम:
   • पाणी नेहमी डावी नाकपुडी (चंद्र नाडी / इडा) चालू असताना प्यावे, कारण पाणी शीतल प्रवृत्तीचे आहे.
   • जेवताना पाणी पिणे टाळावे; जेवणापूर्वी किंवा जेवणानंतर किमान ४५ मिनिटांनीच पाणी प्यावे.`;

  const now = new Date().toISOString();
  await bunnyExecute({
    sql: `INSERT OR REPLACE INTO mohan_rag_sources_sql (
      id, module_id, title, content, topic, language, source_type, source_reference,
      original_file_name, original_file_url, original_mime_type, extraction_type,
      status, created_by, reviewed_by, reviewed_at, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      'source_mohan_sir_water_therapy_master',
      'level1',
      'Mohan Sir Water Therapy - पाणी पिण्याचे ३ घोट नियम व वेळापत्रक',
      content,
      'Water Therapy (जल चिकित्सा)',
      'all',
      'approved_transcript',
      'https://www.youtube.com/watch?v=6dz4oFQrs_M',
      'water_therapy_mohan_sir.txt',
      'https://www.youtube.com/watch?v=6dz4oFQrs_M',
      'text/plain',
      'master_verified',
      'approved',
      'admin',
      'mohan_sir',
      now,
      now,
      now,
    ],
  });

  console.log('✅ Permanent Mohan Sir Water Therapy Knowledge Source successfully inserted into Bunny DB!');
}

seedWaterTherapy().catch(console.error);

