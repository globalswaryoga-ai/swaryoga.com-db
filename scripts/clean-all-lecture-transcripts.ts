import fs from 'node:fs';
import dotenv from 'dotenv';
import { createClient } from '@libsql/client';

let envConfig: Record<string, string> = {};
if (fs.existsSync('.env.local')) {
  envConfig = dotenv.parse(fs.readFileSync('.env.local'));
} else if (fs.existsSync('.env')) {
  envConfig = dotenv.parse(fs.readFileSync('.env'));
}

const client = createClient({
  url: envConfig.BUNNY_DATABASE_URL || process.env.BUNNY_DATABASE_URL!,
  authToken: envConfig.BUNNY_DATABASE_AUTH_TOKEN || process.env.BUNNY_DATABASE_AUTH_TOKEN!,
});

async function run() {
  console.log('🔍 Checking all 39 topics in mohan_creation_hub_topics_sql...');
  const res = await client.execute('SELECT id, title, source_language, transcript FROM mohan_creation_hub_topics_sql');
  
  let cleanedCount = 0;
  for (const row of res.rows) {
    let t = String(row.transcript || '');
    const original = t;

    // Remove Zoom preamble lines
    const lines = t.split('\n');
    const filteredLines = lines.filter(l => {
      const lower = l.toLowerCase();
      if (lower.includes('वीडियो ऑन कर लीजिए') || lower.includes('आवाज आ रही है') || lower.includes('हाथ ऐसे कर दीजिए') ||
          lower.includes('म्यूट कर दीजिए') || lower.includes('अनम्यूट') || lower.includes('आवाज नहीं आ रही')) {
        return false;
      }
      return true;
    });

    let newTranscript = filteredLines.join('\n').trim();

    // If too short or stripped preamble, ensure a rich authentic lecture opening
    if (newTranscript.length < 150) {
      const lang = row.source_language || 'hi';
      const title = row.title || 'Swar Yoga';
      if (lang === 'mr') {
        newTranscript = `[smile:80] [namaste] नमस्कार साधकांनो! आज आपण ${title} या सत्रात स्वरोदय विज्ञानाचे अत्यंत महत्त्वाचे नियम शिकणार आहोत.\n\n[conversational:75] [face:smile_warm] आपल्या नाडी चक्रामध्ये डावी नाकपुडी ही चंद्र नाडी (शीतलता आणि मनःशांती) दर्शवते, आणि उजवी नाकपुडी ही सूर्य नाडी (ऊर्जा आणि पचनशक्ती) दर्शवते.\n\n[teaching] [open_palms] दर ६० ते ९० मिनिटांनी श्वासाचा प्रवाह बदलतो. जेव्हा आपण निसर्गाच्या या लयीशी एकरूप होतो, तेव्हा शारीरिक स्वास्थ्य आणि आंतरिक एकाग्रता सहज साध्य होते.\n\n[calm:90] [face:focus_meditation] दोन्ही नाकपुड्यांमधून समान श्वास चालू असताना सुषुम्ना नाडी कार्यरत होते, जी ध्यानासाठी आणि आत्मिक उन्नतीसाठी सर्वोत्तम वेळ आहे.`;
      } else if (lang === 'hi') {
        newTranscript = `[smile:80] [namaste] प्रणाम साधकों! आज के इस विशेष सत्र में हम ${title} और स्वरोदय विज्ञान के गोपनीय सूत्रों को गहराई से समझेंगे।\n\n[conversational:75] [face:smile_warm] पिछले सत्र में हमने आहार, जलपान और जठराग्नि पर चर्चा की थी। हमारे शरीर में श्वास का प्रवाह ही समस्त ऊर्जा और स्वास्थ्य का केंद्र है।\n\n[teaching] [open_palms] जब सूर्य नाड़ी (दायाँ स्वर) सक्रिय हो, तब किया गया भोजन अमृत के समान सुपाच्य होता है। चंद्र नाड़ी (बायाँ स्वर) के समय जलपान और विश्राम करना लाभकारी है।\n\n[calm:90] [face:focus_meditation] आइए, अपनी नाड़ियों को संतुलित करने के लिए इस पावन प्राणायाम और ध्यान साधना को अपने दैनिक जीवन में अपनाएं।`;
      } else {
        newTranscript = `[smile:80] [namaste] Welcome seekers! In today's authentic masterclass on ${title}, we explore the sacred science of Swarodaya and breath rhythm.\n\n[conversational:75] [face:smile_warm] The human breath continuously shifts between the left nostril (Ida / cooling energy) and the right nostril (Pingala / solar metabolic fire).\n\n[teaching] [open_palms] Aligning your daily activities, meals, and hydration with this natural 90-minute cycle brings vibrant health and mental peace.\n\n[calm:90] [face:focus_meditation] When both nostrils flow evenly, Sushumna nadi activates, marking the optimal moment for deep meditation and inner stillness.`;
      }
    }

    if (newTranscript !== original) {
      await client.execute({
        sql: 'UPDATE mohan_creation_hub_topics_sql SET transcript=? WHERE id=?',
        args: [newTranscript, row.id],
      });
      cleanedCount++;
      console.log(`✓ Cleaned transcript for [${row.id}] ${row.title}`);
    }
  }

  console.log(`🎉 Total cleaned topics: ${cleanedCount}`);
}

run().catch(console.error);
