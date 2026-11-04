/**
 * Master Swar Yoga Knowledge Library Corpus
 * Contains structured, authentic, verbatim course notes and lecture references
 * for all workshops (Level 1, Level 2, Level 3, Why Swar Yoga, General Topics, Research)
 * across Marathi, Hindi, English, and all supported 27+ languages.
 */

export interface WorkshopOption {
  id: string;
  label: string;
}

export interface DayOption {
  id: string;
  label: string;
}

export interface TopicOption {
  id: string;
  label: string;
}

export const WORKSHOP_OPTIONS: WorkshopOption[] = [
  { id: 'all', label: 'All Workshops (सर्व कार्यशाळा)' },
  { id: 'level1', label: 'Level 1: Basic & Master Swar Yoga (स्वर योग L-1 व डेमो)' },
  { id: 'level2', label: 'Level 2: Aham Brahmasmi (स्वर योग L-2 व डेमो)' },
  { id: 'level3', label: 'Level-3 (Ashtavakra Dhyan / अष्टावक्र ध्यान)' },
  { id: 'aahar_shastra', label: 'Aahar Shastra (आहार शास्त्र - Diet, Jatharagni & Digestion)' },
  { id: 'children', label: 'Children Yoga (बाल संस्कार / चिल्ड्रेन योग)' },
  { id: 'youth', label: 'Youth Yoga (युवा योग)' },
  { id: 'garbh_sanskar', label: 'Pregnancy (Garbh Sanskar Shibir / गर्भसंस्कार शिबिर)' },
  { id: 'weight_loss', label: 'Weight Loss Program (वजन घटवणे - टॉपिक व डेमो)' },
  { id: 'why', label: 'Why Swar Yoga? (डेमो व परिचयात्मक सत्रे)' },
  { id: 'meditation_sadhana', label: 'Meditation Sadhana (नवरात्री, चक्र ध्यान, संयम, दश ओंकार गायत्री)' },
  { id: 'general', label: 'General Topics & Lifestyle (सामान्य विषय व जीवनशैली)' },
  { id: 'research', label: 'Research & Scientific Reports (वैज्ञानिक संशोधन अहवाल)' },
  { id: 'search', label: 'Knowledge Search & Test (ज्ञान शोध व चाचणी)' },
];

export const DAY_OPTIONS: DayOption[] = [
  { id: 'all', label: 'All Days (सर्व दिवस)' },
  { id: 'day1', label: 'Day 1: भोजन व पाणी नियम (Bhojan & Pani)' },
  { id: 'day2', label: 'Day 2: पाणी, गॅस, झोप (Water, Gas & Sleep)' },
  { id: 'day3', label: 'Day 3: ॐ प्राणायाम, चक्र (Pranayama & Chakras)' },
  { id: 'day4', label: 'Day 4: ध्यान व अंतःशांती (Meditation)' },
  { id: 'day5', label: 'Day 5: अजपा-जप साधना (Ajapa-Jap Breathing)' },
  { id: 'day6', label: 'Day 6: आहार व पचनक्रिया १ (Food Digestion 1)' },
  { id: 'day7', label: 'Day 7: तामसिक व राजसिक आहार (Tamas Rajas Food)' },
  { id: 'day8', label: 'Day 8: राजसिक व सात्विक आहार (Rajas Satvik Food)' },
  { id: 'day9', label: 'Day 9: सात्विक आहार व पंचतत्व (5 Elements Diet)' },
  { id: 'day10', label: 'Day 10: सुषुम्ना नाडी व प्रतीक्षा (Sushumna Waiting)' },
  { id: 'day11', label: 'Day 11: प्रतिबंधक विज्ञान १ (Preventive Science 1)' },
  { id: 'day12', label: 'Day 12: प्रतिबंधक विज्ञान २ (Preventive Science 2)' },
  { id: 'day13', label: 'Day 13: स्वर साधना दैनंदिन सराव (Daily Sadhana)' },
  { id: 'day14', label: 'Day 14: नाडी कामकाज व कार्यप्रणाली (Nadi Functions)' },
  { id: 'day15', label: 'Day 15: नाडी बदल व निसर्ग समतोल (Nadi Switch)' },
  { id: 'day16', label: 'Day 16: द्वेष मुक्ती व चित्तशुद्धी (Freedom from Hatred)' },
];

export const TOPIC_OPTIONS: Record<string, TopicOption[]> = {
  all: [
    { id: 'all', label: 'All Topics (सर्व विषय - Complete Master Corpus)' },
    { id: 'why_overview', label: 'स्वर योग परिचय व वैज्ञानिक महत्त्व' },
    { id: 'day1_bhojan', label: 'Day 1: भोजन व पाणी नियम' },
    { id: 'day2_pani_gas', label: 'Day 2: पाणी, गॅस व झोप' },
    { id: 'day3_om_chakra', label: 'Day 3: ॐ प्राणायाम व चक्र जागरण' },
    { id: 'day4_meditation', label: 'Day 4: ध्यान व सुषुम्ना नाडी' },
    { id: 'day5_ajapa', label: 'Day 5: अजपा-जप सो-हं साधना' },
    { id: 'day6_food1', label: 'Day 6: आहार व पचनक्रिया १' },
    { id: 'day7_tamas_rajas', label: 'Day 7: तामसिक व राजसिक आहार' },
    { id: 'day8_rajas_satvik', label: 'Day 8: राजसिक व सात्विक आहार' },
    { id: 'day9_satvik_tatva', label: 'Day 9: सात्विक आहार व पंचतत्व' },
    { id: 'day10_sushumna', label: 'Day 10: सुषुम्ना नाडी व प्रतीक्षा' },
    { id: 'day11_prev1', label: 'Day 11: प्रतिबंधक विज्ञान - अवयव आरोग्य १' },
    { id: 'day12_prev2', label: 'Day 12: प्रतिबंधक विज्ञान - अवयव आरोग्य २' },
    { id: 'day13_sadhana', label: 'Day 13: स्वर साधना दैनंदिन सराव' },
    { id: 'day14_nadi_work', label: 'Day 14: नाडी कामकाज व कार्यप्रणाली' },
    { id: 'day15_nadi_change', label: 'Day 15: नाडी परिवर्तन व निसर्ग समतोल' },
    { id: 'day16_dwesh', label: 'Day 16: द्वेष मुक्ती व चित्तशुद्धी' },
    { id: 'mahiti_satra', label: 'मराठी माहिती सत्र - संपूर्ण कार्यशाळा परिचय' },
    { id: 'all_lectures', label: '२१+ स्वर योग ऑडिओ/व्हिडिओ व्याख्याने' },
  ],
  level1: [
    { id: 'all', label: 'All Topics & Real Video Lectures (सर्व विषय व २६+ व्हिडिओ व्याख्याने)' },
    { id: 'day1_bhojan', label: 'Day 1: भोजन व पाणी नियम' },
    { id: 'day2_pani_gas', label: 'Day 2: पाणी, गॅस व झोप' },
    { id: 'day3_om_chakra', label: 'Day 3: ॐ प्राणायाम व चक्र जागरण' },
    { id: 'day4_meditation', label: 'Day 4: ध्यान व सुषुम्ना नाडी' },
    { id: 'day5_ajapa', label: 'Day 5: अजपा-जप सो-हं साधना' },
    { id: 'day6_food1', label: 'Day 6: आहार व पचनक्रिया १' },
    { id: 'day7_tamas_rajas', label: 'Day 7: तामसिक व राजसिक आहार' },
    { id: 'day8_rajas_satvik', label: 'Day 8: राजसिक व सात्विक आहार' },
    { id: 'day9_satvik_tatva', label: 'Day 9: सात्विक आहार व पंचतत्व' },
    { id: 'day10_sushumna', label: 'Day 10: सुषुम्ना नाडी व प्रतीक्षा' },
    { id: 'day11_prev1', label: 'Day 11: प्रतिबंधक विज्ञान - अवयव आरोग्य १' },
    { id: 'day12_prev2', label: 'Day 12: प्रतिबंधक विज्ञान - अवयव आरोग्य २' },
    { id: 'day13_sadhana', label: 'Day 13: स्वर साधना दैनंदिन सराव' },
    { id: 'day14_nadi_work', label: 'Day 14: नाडी कामकाज व कार्यप्रणाली' },
    { id: 'day15_nadi_change', label: 'Day 15: नाडी परिवर्तन व निसर्ग समतोल' },
    { id: 'day16_dwesh', label: 'Day 16: द्वेष मुक्ती व चित्तशुद्धी' },
    { id: 'mahiti_satra', label: 'मराठी माहिती सत्र - संपूर्ण कार्यशाळा परिचय' },
    { id: 'all_lectures', label: '२१+ स्वर योग ऑडिओ/व्हिडिओ व्याख्याने' },
  ],
  level2: [
    { id: 'all', label: 'All Level 2 Topics (स्वर योग L-2: अहम् ब्रह्मास्मि संपूर्ण अभ्यासक्रम)' },
    { id: 'samyama', label: '1. Samyama (संयम - ध्यान, धारणा व समाधी)' },
    { id: 'dhyan_dharana_samadhi', label: '2. Dhyan, Dharana & Samadhi (ध्यान, धारणा, समाधी)' },
    { id: 'uttejana', label: '3. Uttejana / Excitement (उत्तेजना नियंत्रण)' },
    { id: 'samruddhi', label: '4. Samruddhi / Prosperity (समृद्धी व संपन्नता)' },
    { id: 'relation', label: '5. Relation (नातेसंबंध व ऊर्जा ताळमेळ)' },
    { id: 'dwandwa', label: '6. Dwandwa / Duality (द्वंद्व मुक्ती)' },
    { id: 'spirit_system', label: '7. Spirit System (स्पिरिट सिस्टीम / आत्मिक चेतना)' },
    { id: 'six_ripu', label: '8. 6 Ripu - Part 1 & 2 (षड्रिपू - काम, क्रोध, लोभ, मोह, मद, मत्सर)' },
    { id: 'panch_tatva_l2', label: '9. Panch Tatva - Part 1 & 2 (पंचतत्व सखोल साधना)' },
    { id: 'brain_body', label: '10. Brain & Body (मेंदू व शरीर समन्वय)' },
    { id: 'money_dhan', label: '11. Money / Paisa / Dhan (पैसा व धन ऊर्जा)' },
    { id: 'meditation_45min', label: '12. 45 Minutes Meditation - Samyama (४५ मिनिटे संयम ध्यान)' },
    { id: 'pranayama_5min', label: '13. 5 Minutes Pranayama (५ मिनिटे प्राणायाम)' },
    { id: 'chakras_sadhna_levels', label: '14. Chakras Sadhna - L1, L2, L3 (एकल, जोडलेली, वेगवान व एका श्वासात)' },
    { id: 'photographer_vs_creator', label: '15. Photographer vs Creator (फोटोग्राफर विरुद्ध क्रिएटर)' },
    { id: 'demo_l2', label: '16. Level 2 Demo Session (L-2 प्रात्यक्षिक सत्र)' },
  ],
  level3: [
    { id: 'all', label: 'All Level 3 Topics (स्वर योग L-3: अष्टावक्र ध्यान संपूर्ण अभ्यासक्रम)' },
    { id: 'history_vs_potential', label: '1. History vs Potential (इतिहास विरुद्ध क्षमता)' },
    { id: 'self_letter_mind', label: '2. Self Letter: My Dear Mind (आत्म-संवाद: माय डिअर माईंड)' },
    { id: 'prakriti_purush', label: '3. Prakriti & Purush (प्रकृती आणि पुरुष सांख्य दर्शन)' },
    { id: 'guru_ashtakam', label: '4. Guru Ashtakam / Guru Tatva (गुरू अष्टकम् - गुरू तत्त्व)' },
    { id: 'bhaja_govindam', label: '5. Bhaja Govindam (भज गोविंदम् - मोह मुक्ती)' },
    { id: 'five_truths', label: '6. 5 Sacred Truths - Satya, Santosh, Daya, Kshama, Aarjav (सत्य, संतोष, दया, क्षमा, आर्जव)' },
    { id: 'shivoham_shivoham', label: '7. Shivoham Shivoham - Last Class Grand Culmination (शिवोऽहम् शिवोऽहम् अंतिम वर्ग)' },
    { id: 'ashtavakra_sakshi', label: '8. Ashtavakra Sakshi Bhav & Ego Dissolution (साक्षी भाव व अहंकार लय)' },
    { id: 'nirvikalpa_samadhi', label: '9. Nirvikalpa Samadhi & Mahasadhana (निर्विकल्प समाधी व महासाधना)' },
  ],
  aahar_shastra: [
    { id: 'all', label: 'All Aahar Shastra Topics (आहार शास्त्र संपूर्ण ज्ञान)' },
    { id: 'swar_aahar', label: 'Swar Aahar Shastra (स्वर आहार शास्त्र व जठराग्नी)' },
    { id: 'jatharagni_rules', label: 'Jatharagni Activation & 45-Min Water Gap (जठराग्नी नियम व ४५ मिनिटे नियम)' },
    { id: 'panch_tatva_food', label: 'Panch Tatva, Tri-Dosha & Food Categories (पंचतत्व, त्रिदोष व सात्विक आहार)' },
    { id: 'water_therapy_rules', label: 'Water Therapy, 3 Sips & 9 PM Ban (पाणी चिकित्सा व ३ घोट नियम)' },
  ],
  weight_loss: [
    { id: 'all', label: 'All Weight Loss Topics (वजन घटवणे संपूर्ण कार्यक्रम)' },
    { id: 'wl_metabolism', label: 'Surya Nadi & Metabolic Fire (सूर्य नाडी व जठराग्नी प्रदीपन)' },
    { id: 'wl_diet_timing', label: 'Panch Tatva Eating Schedule (पंचतत्व आहार वेळापत्रक)' },
    { id: 'wl_demo', label: 'Weight Loss Practical Demo Session (वजन घटवणे प्रात्यक्षिक वर्ग)' },
  ],
  garbh_sanskar: [
    { id: 'all', label: 'All Garbh Sanskar Topics (गर्भ संस्कार संपूर्ण कार्यक्रम)' },
    { id: 'gs_prana', label: 'Maternal Breath & Fetal Brain Development (मातृ श्वास व गर्भाचा मेंदू विकास)' },
    { id: 'gs_chandra_calm', label: 'Chandra Nadi Calmness & Emotional Bonding (शांत चंद्र नाडी व मातृत्व संवाद)' },
    { id: 'gs_demo', label: 'Garbh Sanskar Guided Demo (गर्भ संस्कार प्रात्यक्षिक व ध्यान)' },
  ],
  children: [
    { id: 'all', label: 'Children Swar Yoga (बाल स्वर योग संपूर्ण वर्ग)' },
    { id: 'kids_memory', label: 'Memory, Concentration & Brain Balancing (स्मरणशक्ती व एकाग्रता)' },
    { id: 'kids_games', label: 'Fun Breath Games & Health (श्वास खेळ व निरोगी शरीर)' },
  ],
  youth: [
    { id: 'all', label: 'Youth Swar Yoga (युवा स्वर योग)' },
    { id: 'youth_focus', label: 'Career Focus, Emotional Balance & Energy (करिअर एकाग्रता व ऊर्जा व्यवस्थापन)' },
    { id: 'youth_stress', label: 'Stress Relief & Sleep Quality (परीक्षेचा ताणमुक्ती व गाढ झोप)' },
  ],
  meditation_sadhana: [
    { id: 'all', label: 'All Meditation Sadhana Batches (ध्यान साधना विशेष वर्ग)' },
    { id: 'navaratri_dhyan', label: 'Navaratri Dhyan Sadhana (नवरात्री ध्यान साधना)' },
    { id: 'chakra_dhyan', label: '7 Chakras Guided Dhyan (७ चक्र ध्यान साधना)' },
    { id: 'samyama_dhyan', label: 'Samyama 45-Min Silent Meditation (संयम गहन मौन ध्यान)' },
    { id: 'dash_onkar_gayatri', label: 'Dash Onkar Gayatri Sadhana (दश ओंकार गायत्री साधना)' },
  ],
  why: [
    { id: 'all', label: 'Why Swar Yoga Overview (स्वर योग परिचय व महत्त्व)' },
    { id: 'scientific_basis', label: 'Scientific & Yogic Foundation (वैज्ञानिक व यौगिक आधार)' },
    { id: 'modern_relevance', label: 'Stress Reduction & Modern Life (तणावमुक्ती व आधुनिक जीवन)' },
  ],
  general: [
    { id: 'all', label: 'General Topics & Principles (सामान्य तत्त्वे व आहार शास्त्र)' },
    { id: 'aahar_shastra', label: 'Aahar Shastra (आहार शास्त्र - अन्नमय कोश शुद्धी)' },
    { id: 'diet_lifestyle', label: 'Diet, Season (Ritucharya) & Habits (ऋतूचर्या व दिनचर्या)' },
  ],
  research: [
    { id: 'all', label: 'All Research Studies & Citations (सर्व वैज्ञानिक संशोधन अहवाल)' },
    { id: 'nasal_cycle', label: 'Nasal Cycle & Autonomic Nervous System (नाकपुडी चक्र व मज्जासंस्था)' },
    { id: 'eeg_brain', label: 'EEG Hemispheric Brain Synchronization (मेंदूचे अर्धगोल संतुलन)' },
    { id: 'hrv_cardiac', label: 'HRV & Vagal Tone Measurements (हृदयगती व व्हेगल टोन)' },
  ],
  search: [
    { id: 'all', label: 'Knowledge Retrieval Queries (स्वर योग प्रश्न व उत्तर चाचणी)' },
    { id: 'query_swara', label: 'Query: Changing Swara at Will (इच्छेनुसार स्वर बदलणे)' },
    { id: 'query_sadhana', label: 'Query: Morning Sadhana & Tithi (प्रातःकालीन साधना व तिथी)' },
  ],
};

// Day to topic mapping for direct filtering
const DAY_TOPIC_MAP: Record<string, string> = {
  day1: 'day1_bhojan',
  day2: 'day2_pani_gas',
  day3: 'day3_om_chakra',
  day4: 'day4_meditation',
  day5: 'day5_ajapa',
  day6: 'day6_food1',
  day7: 'day7_tamas_rajas',
  day8: 'day8_rajas_satvik',
  day9: 'day9_satvik_tatva',
  day10: 'day10_sushumna',
  day11: 'day11_prev1',
  day12: 'day12_prev2',
  day13: 'day13_sadhana',
  day14: 'day14_nadi_work',
  day15: 'day15_nadi_change',
  day16: 'day16_dwesh',
};

// -------------------------------------------------------------
// MARATHI (मराठी) COMPLETE MASTER LIBRARY CORPUS
// -------------------------------------------------------------
export const MARATHI_DAYS_DATA: Record<string, string> = {
  day1_bhojan: `दिवस १: भोजन आणि पाणी नियम (Day-1 Bhojan Pani)
===========================================================
मार्गदर्शक: मोहन काळबुर्गी (Mohan Kalburgi Sir)
स्वर योग कार्यशाळा - लेवल १ (Level 1)
व्हिडिओ व्याख्यान संदर्भ: https://www.youtube.com/watch?v=dJJEpSFXY9E

【१. नाडी आणि आहार नियम】
• भोजन नेहमी उजवी नाकपुडी (सूर्य नाडी / पिंगळा नाडी) चालू असतानाच करावे.
  - जेव्हा उजवी नाकपुडी चालू असते, तेव्हा शरीराचा जठराग्नी प्रदीप्त असतो.
  - सूर्य नाडी उष्ण प्रकृतीची असल्याने खाल्लेल्या अन्नाचे योग्य व जलद पचन होते.
• जेवताना किंवा जेवल्यानंतर लगेच भरपूर पाणी पिऊ नये.
  - जेवताना पाणी पिल्याने जठराग्नी विझतो आणि पाचक रस पातळ होतात, ज्यामुळे अपचन, गॅस आणि विषद्रव्ये (आम) तयार होतात.
• जेवणापूर्वी किंवा जेवणानंतर किमान ४५ मिनिटांनी पाणी प्यावे.
• पाणी पिताना डावी नाकपुडी (चंद्र नाडी / इडा) चालू असावी, कारण पाणी शीतल प्रवृत्तीचे असते.

【२. श्वास गती आणि आयुष्यमान संबंध】
• मानवी आयुष्य अन्नावर नाही तर श्वासाच्या गतीवर अवलंबून असते.
• श्वास जितका शांत, संथ आणि दीर्घ असेल, तितके आयुष्यमान दीर्घ आणि निरोगी राहते.
• क्रोध, काम, भीती यांमध्ये श्वास जलद वाहतो (आयुष्य क्षीण होते); ध्यानात श्वास संथ होतो.`,

  day2_pani_gas: `दिवस २: पाणी चिकित्सा, गॅस आणि झोप (Day-2 Pani gas sleep - Water Therapy Mastery)
===========================================================
मार्गदर्शक: मोहन काळबुर्गी (Mohan Kalburgi Sir)
व्हिडिओ व्याख्यान संदर्भ: https://www.youtube.com/watch?v=6dz4oFQrs_M (Water therapy by Mohan Kalburgi)

【१. मोहन सरांचे पाणी पिण्याचे काटेकोर नियम (Water Therapy Rules by Mohan Sir)】
• एका वेळेस फक्त ३ घोट पाणी प्यावे (Drink strictly 3 sips of water at one time):
  - पाणी कधीही घटाघटा किंवा एकदम ग्लास भरून पिऊ नये.
  - एका वेळी फक्त ३ घोट हळूहळू, बसून प्यावे. यामुळे तोंडातील अल्कलाईन लाळ पोटात जाते आणि ऍसिडिटी त्वरित शांत होते.
• पाण्याची वेळ आणि प्रमाण (Exact Daily Water Timing & Quota):
  - सकाळी ५ ते १० या वेळेत २ लिटर पाणी पूर्ण करावे (Cover 2 Litres of water from 5:00 AM to 10:00 AM).
  - दुपारी २ ते रात्री ९ या वेळेत १.५ लिटर पाणी पूर्ण करावे (Cover 1.5 Litres of water from 2:00 PM to 9:00 PM).
• रात्री ९ नंतर पाणी पिणे पूर्णपणे बंद (Strictly NO water after 9:00 PM at night):
  - रात्री ९ नंतर अजिबात पाणी पिऊ नये, कारण रात्री शरीराचा चयापचय मंदावतो आणि रात्री पाणी पिल्याने झोपमोड, सूज व किडनीवर अतिरिक्त ताण येतो.
• पाणी पिताना स्वर / नाडी:
  - पाणी पिताना डावी नाकपुडी (चंद्र नाडी / इडा) चालू असणे सर्वोत्तम आहे. पाणी नेहमी बसूनच प्यावे.

【२. गॅस आणि अपचन निवारण】
• पोटात गॅस किंवा जडपणा जाणवल्यास वज्रासनात बसावे आणि उजवी नाकपुडी (सूर्य नाडी) सक्रिय ठेवावी.
• अन्न पचनासाठी आवश्यक उष्णता सूर्य नाडीमुळे तत्काळ निर्माण होते.

【३. झोपेचे नियम व योग्य दिशा】
• झोपताना डाव्या कुशीवर झोपावे (वामकुक्षी).
• डाव्या कुशीवर झोपल्याने उजवी नाकपुडी आपोआप सुरू होते, ज्यामुळे रात्री पचन सुरळीत होते आणि गाढ, शांत झोप लागते.`,

  day3_om_chakra: `दिवस ३: ॐ प्राणायाम आणि चक्र जागरण (Day-3 Om pranayama chakra)
===========================================================
मार्गदर्शक: मोहन काळबुर्गी (Mohan Kalburgi Sir)
व्हिडिओ व्याख्यान संदर्भ: https://www.youtube.com/watch?v=vsDvWOusePY

【१. ॐकार प्राणायाम आणि ध्वनी स्पंदने】
• 'अ-उ-म' या तीन अक्षरांचा उच्चार नाभी, हृदय आणि मस्तकात स्पंदन निर्माण करतो.
• ॐकार जपाने सूक्ष्म नाड्यांची शुद्धी होते आणि प्राणशक्ती उर्ध्वगामी होते.

【२. सात चक्रे आणि स्वर योग संबंध】
• मूलाधार, स्वाधिष्ठान, मणिपूर, अनाहत, विशुद्ध, आज्ञा आणि सहस्रार चक्रांचे प्राणायामाशी संतुलन.
• सूर्य नाडी मूलाधार ते आज्ञा चक्रातील अग्नी तत्त्वाला जागृत करते, तर चंद्र नाडी अमृत तत्त्वाची वृष्टी करते.`,

  day4_meditation: `दिवस ४: ध्यान आणि मनःशांती (Day-4 Meditation)
===========================================================
मार्गदर्शक: मोहन काळबुर्गी (Mohan Kalburgi Sir)
व्हिडिओ व्याख्यान संदर्भ: https://www.youtube.com/watch?v=TBXncpxqfs4

【१. ध्यान आणि सुषुम्ना नाडी】
• जेव्हा दोन्ही नाकपुड्यांमधून समप्रमाणात श्वास वाहतो, त्याला सुषुम्ना नाडी म्हणतात.
• सुषुम्ना चालू असताना केलेले ध्यान त्वरित फलदायी ठरते, मन विचारशून्य व अंतर्मुख होते.
• पहाटेचा ब्राह्ममुहूर्त आणि संध्याकाळचा संधिकाल ध्यानासाठी सर्वोत्तम मानला जातो.`,

  day5_ajapa: `दिवस ५: अजपा-जप साधना (Day-5 Ajapa-Jap)
===========================================================
मार्गदर्शक: मोहन काळबुर्गी (Mohan Kalburgi Sir)
व्हिडिओ व्याख्यान संदर्भ: https://www.youtube.com/watch?v=sbDX_hK0Jn0

【१. 'सो-हं' अजपा-जप साधना】
• दिवसभरात मनुष्य २१,६०० श्वास नैसर्गिकरीत्या घेतो.
• श्वास आत घेताना 'सो' (So) आणि श्वास बाहेर सोडताना 'हं' (Hum) चा आंतरिक ध्वनी होतो.
• कोणतेही मणी किंवा माळ न घेता श्वासावर सजग राहून केलेला जप म्हणजेच 'अजपा-जप'.
• यामुळे मानसिक चंचलता संपून आत्मसाक्षात्कार आणि असीम शांती प्राप्त होते.`,

  day6_food1: `दिवस ६: आहार आणि पचनक्रिया १ (Day-6 food-1 digestion)
===========================================================
मार्गदर्शक: मोहन काळबुर्गी (Mohan Kalburgi Sir)
व्हिडिओ व्याख्यान संदर्भ: https://www.youtube.com/watch?v=0f9LqY0fTr8

【१. पंचतत्व आणि आहार विज्ञान】
• शरीर पृथ्वी, जल, अग्नी, वायू आणि आकाश या पाच तत्त्वांनी बनलेले आहे.
• आपल्या आहारातील ५ चवी आणि ५ तत्त्वांचा समतोल राखल्याने वात, पित्त आणि कफ त्रिदोष संतुलित राहतात.
• पचनासाठी जठराग्नीची भूमिका व सूर्य नाडीचे महत्त्व.`,

  day7_tamas_rajas: `दिवस ७: तामसिक आणि राजसिक आहार (Day-7 food 2, tamas Rajas)
===========================================================
मार्गदर्शक: मोहन काळबुर्गी (Mohan Kalburgi Sir)
व्हिडिओ व्याख्यान संदर्भ: https://www.youtube.com/watch?v=p1yMH5ktRMM

【१. तामसिक अन्नाचे दुष्परिणाम】
• शिळे, तळलेले, अतिथंड किंवा कुजलेले अन्न शरीरात जडत्व, आळस आणि रोग निर्माण करते.
【२. राजसिक अन्नाचा प्रभाव】
• अतिमसालेदार, तिखट, खारट अन्न मनामध्ये राग, वासना आणि चंचलता निर्माण करते, ज्यामुळे श्वास अनियंत्रित होतो.`,

  day8_rajas_satvik: `दिवस ८: राजसिक आणि सात्विक आहार (Day-8 food 2, Rajas satvik)
===========================================================
मार्गदर्शक: मोहन काळबुर्गी (Mohan Kalburgi Sir)
व्हिडिओ व्याख्यान संदर्भ: https://www.youtube.com/watch?v=wABcWxXNL2Y

【१. सात्विक आहाराचे सामर्थ्य】
• ताजी फळे, भाज्या, मोड आलेली कडधान्ये, मध आणि दूध सात्विक असतात.
• सात्विक आहार बुद्धी तीक्ष्ण करतो, नाड्या स्वच्छ ठेवतो आणि दीर्घायुष्य देतो.`,

  day9_satvik_tatva: `दिवस ९: सात्विक आहार आणि पंचतत्व (Day-9 food 2, Satvik panch tatva)
===========================================================
मार्गदर्शक: मोहन काळबुर्गी (Mohan Kalburgi Sir)
व्हिडिओ व्याख्यान संदर्भ: https://www.youtube.com/watch?v=0VnfjynTHl0

【१. अन्नमय कोश शुद्धी】
• शरीराचे पहिले आवरण अन्नमय कोश आहे.
• पाच तत्त्वांच्या योग्य अन्न घटकांमुळे शरीरातील अवयव नैसर्गिकरीत्या स्वतःला डिटॉक्स (Detox) करतात.`,

  day10_sushumna: `दिवस १०: सुषुम्ना नाडी जागरण आणि प्रतीक्षा (Day-10 sushumna Nadi, Waiting)
===========================================================
मार्गदर्शक: मोहन काळबुर्गी (Mohan Kalburgi Sir)
व्हिडिओ व्याख्यान संदर्भ: https://www.youtube.com/watch?v=VxClaNi8UqQ

【१. संधिकाल व प्रतीक्षा विधी】
• एका नाकपुडीतून दुसऱ्या नाकपुडीत श्वास बदलताना काही मिनिटे सुषुम्ना नाडी वाहते.
• या काळात कोणतेही भौतिक, व्यावसायिक किंवा शारीरिक काम करू नये; केवळ नामस्मरण किंवा ध्यान करावे.`,

  day11_prev1: `दिवस ११: प्रतिबंधक विज्ञान १ (Day-11 Food-3 Preventing 1)
===========================================================
मार्गदर्शक: मोहन काळबुर्गी (Mohan Kalburgi Sir)
व्हिडिओ व्याख्यान संदर्भ: https://www.youtube.com/watch?v=IZJsfHliElY

【१. अवयवांचे आरोग्य: डोळे, दात, फुफ्फुसे आणि हृदय】
• डोळ्यांची काळजी: सकाळी तोंडात पाणी धरून डोळ्यांवर थंड पाण्याचे हबके मारणे.
• फुफ्फुस व हृदयासाठी चंद्र नाडी प्राणायाम आणि उजव्या कुशीवर विश्रांती.`,

  day12_prev2: `दिवस १२: प्रतिबंधक विज्ञान २ (Day-12 Food-3 Preventing 2)
===========================================================
मार्गदर्शक: मोहन काळबुर्गी (Mohan Kalburgi Sir)
व्हिडिओ व्याख्यान संदर्भ: https://www.youtube.com/watch?v=DkvL5uX3d-8

【१. अवयवांचे आरोग्य: यकृत (Liver), स्वादुपिंड (Pancreas), मूत्रपिंड (Kidney)】
• रक्तातील साखर, यकृताची चरबी कमी करण्यासाठी योग्य नाडीत आहाराचे सेवन व पाणी नियंत्रण.`,

  day13_sadhana: `दिवस १३: स्वर साधना दैनंदिन सराव (Day-13 Daily Sadhana)
===========================================================
मार्गदर्शक: मोहन काळबुर्गी (Mohan Kalburgi Sir)

【१. प्रातःकालीन स्वर साधना विधी】
• सकाळी उठल्याबरोबर सर्वप्रथम नाकपुडी तपासावी.
• जी नाकपुडी चालू असेल, त्याच हाताने चेहऱ्याचा तो भाग स्पर्श करावा आणि तेच पाऊल जमिनीवर प्रथम ठेवावे (भूमीस्पर्श).
• यामुळे दिवसभर सकारात्मक ऊर्जा आणि यश मिळते.`,

  day14_nadi_work: `दिवस १४: नाडी कामकाज आणि कार्यप्रणाली (Day-14 Nadi kamkaj)
===========================================================
मार्गदर्शक: मोहन काळबुर्गी (Mohan Kalburgi Sir)
व्हिडिओ व्याख्यान संदर्भ: https://www.youtube.com/watch?v=EqoNsXbvDKs

【१. चंद्र नाडी (इडा) कार्ये】
• शांत कामे, खरेदी, प्रवास, अभ्यास, शीतपेये पिणे, धार्मिक विधी, औषध घेणे.
【२. सूर्य नाडी (पिंगळा) कार्ये】
• भोजन, व्यायाम, कठोर परिश्रम, गणित सोडवणे, धाडसी निर्णय, झोप घेणे.`,

  day15_nadi_change: `दिवस १५: नाडी परिवर्तन आणि निसर्ग समतोल (Day-15 Nadi change, Nature balance)
===========================================================
मार्गदर्शक: मोहन काळबुर्गी (Mohan Kalburgi Sir)
व्हिडिओ व्याख्यान संदर्भ: https://www.youtube.com/watch?v=cIdO0E6_rjc

【१. इच्छेनुसार स्वर बदलण्याच्या ५ शास्त्रीय पद्धती】
१. विरुद्ध कुशीवर झोपणे (डावी सुरू करायची असेल तर उजव्या कुशीवर झोपावे).
२. चालू नाकपुडीच्या बगलेत दाब देणे (योगदंड किंवा हाताची मूठ बगलेत दाबणे).
३. चालू नाकपुडीत स्वच्छ कापूस घालणे.
४. प्राणायामाने श्वास दुसऱ्या बाजूला वळवणे.
५. मानसिक संकल्पाने श्वासाचे नियमन.`,

  day16_dwesh: `दिवस १६: द्वेष मुक्ती आणि चित्तशुद्धी (Day-16 Dwesh)
===========================================================
मार्गदर्शक: मोहन काळबुर्गी (Mohan Kalburgi Sir)
व्हिडिओ व्याख्यान संदर्भ: https://www.youtube.com/watch?v=sCBPAYDBVVQ

【१. द्वेष मुक्ती आणि मानसिक शांती】
• अंतर्मनातील राग, मत्सर, द्वेष माणसाच्या श्वासाला उथळ आणि विषारी बनवतो.
• क्षमाशीलता आणि चंद्र नाडी ध्यान यामुळे नकारात्मक भावना नष्ट होऊन मन आनंदी व शांत होते.`,

  mahiti_satra: `मराठी माहिती सत्र: स्वर योग संपूर्ण कार्यशाळा रूपरेषा
===========================================================
मार्गदर्शक: मोहन काळबुर्गी (Mohan Kalburgi Sir)
व्हिडिओ आयडी: Bunny Stream 6bb1194e-0bee-4150-81f6-1638466b50b5 (कालावधी: १ तास २६ मिनिटे)

स्वर योग ही अशी विद्या आहे जी माणसाला कोणत्याही औषधांशिवाय केवळ श्वासाच्या आधारे परिपूर्ण आरोग्य, दीर्घायुष्य आणि मनःशांती मिळवून देते.
ह्या माहिती सत्रात कार्यशाळेचे सर्व १६ दिवस आणि व्यावहारिक तंत्रांचा सविस्तर परिचय दिला आहे.`,

  all_lectures: `२१+ स्वर योग ऑडिओ/व्हिडिओ व्याख्याने - मोहन काळबुर्गी सर प्रत्यक्ष व्याख्यान ट्रान्सक्रिप्ट
===========================================================
मार्गदर्शक: मोहन काळबुर्गी (Mohan Kalburgi Sir)
भाषा: मराठी (Level 1 Master Video Lecture Corpus)

【सत्र प्रारंभ - ओंकार साधना व नाडी विज्ञान】
ओम शान्ति शान्ति शान्ति। दैविकताप, भौतिकताप, दैहिकताप शान्ताप।
आता सुरुवातीला आपल्याला आज आपण बघणार आहोत - नाडी आणि कामकाज.
खूप महत्त्वाचा जो विषय आहे तो आज आपण बघूया. कारण सुषुम्ना सुद्धा आपण बघितलेला आहे.
त्याच्यानंतर पूर्णांग, रिक्तांग सुद्धा आपण बघितलेला आहे.
आता नाडी आणि कामकाज बघण्याआधी या दोन नाड्या काय आहेत हे समजले पाहिजे.
आणि आनंदाची गोष्ट अशी आहे की कोणते काम कोणत्या नाडीमध्ये करायचे हे निसर्गाने आधीच ठरवून दिले आहे.

【१. चंद्र नाडी, सूर्य नाडी आणि सुषुम्ना कामकाज (Nadi Functions)】
• चंद्र नाडी (डावी नाकपुडी): सर्व शांत, शीतल, मानसिक, स्थिर आणि ज्ञानार्जनाची कामे चंद्र नाडीत करावीत.
• सूर्य नाडी (उजवी नाकपुडी): सर्व शारीरिक हालचाली, पचन, भोजन, व्यायाम, कठोर परिश्रम आणि धाडसी कामे सूर्य नाडीत करावीत.
• सुषुम्ना नाडी (दोन्ही नाकपुड्या): संधिकाल आणि ईश्वरीय ध्यान. सुषुम्ना वाहताना कोणतेही ऐहिक काम करू नये, केवळ ध्यान करावे.

【२. मोहन सरांचे पाणी पिण्याचे ३ घोट व वेळापत्रक नियम (Water Therapy Mastery)】
• पाणी नेहमी एका वेळी फक्त ३ घोट बसून सावकाश प्यावे. एकाच वेळी ग्लास भरून घटाघटा पाणी पिऊ नये.
• सकाळी ५:०० ते १०:०० या वेळेत २ लिटर पाणी पूर्ण करावे (चंद्र नाडीत).
• दुपारी २:०० ते रात्री ९:०० या वेळेत १.५ लिटर पाणी पूर्ण करावे.
• रात्री ९:०० नंतर पाणी पिणे पूर्णपणे बंद (Strictly NO water after 9:00 PM).

【३. भोजन आणि जठराग्नी नियम (Bhojan & Jatharagni)】
• जेवण नेहमी उजवी नाकपुडी (सूर्य नाडी) चालू असतानाच करावे. यामुळे जठराग्नी प्रदीप्त होऊन अन्न व्यवस्थित पचते.
• जेवताना पाणी पिऊ नये; पाणी प्यायल्यास जठराग्नी विझतो आणि गॅस व ऍसिडिटी होते.
• जेवणानंतर किमान ४५ मिनिटांनी पाणी प्यावे.

व्हिडिओ व्याख्याने संदर्भ सूची:
१. https://www.youtube.com/watch?v=gCIPxUdPitk - स्वर योग सर्व विषय १
२. https://www.youtube.com/watch?v=HGtL1YGjsXY - स्वर योग सर्व विषय २
३. https://www.youtube.com/watch?v=9hnfeSVeZg4 - स्वर योग सर्व विषय ३
४. https://www.youtube.com/watch?v=4kMT7mbzbZU - स्वर योग सर्व विषय ४
५. https://www.youtube.com/watch?v=1oJAeL6gEP8 - स्वर योग सर्व विषय ५
६. https://www.youtube.com/watch?v=sNwIulyObKM - स्वर योग सर्व विषय ६
७. https://www.youtube.com/watch?v=AlxHX_VyHGk - स्वर योग सर्व विषय ७`,

  why_overview: `स्वर योग परिचय व वैज्ञानिक महत्त्व (Why Swar Yoga?)
===========================================================
मार्गदर्शक: मोहन काळबुर्गी (Mohan Kalburgi Sir)
व्हिडिओ संदर्भ:
• https://www.youtube.com/watch?v=CqyDUkUnt5c
• https://www.youtube.com/watch?v=lEQ0AJd0G9Q
• https://www.youtube.com/watch?v=xNSTziEr9Zo

स्वर योग हे केवळ प्राणायाम नाही, तर मानवी चेतनेचे आणि निसर्गाचे सूक्ष्म विज्ञान आहे.
आपल्या दोन्ही नाकपुड्यांमधील श्वास दर ६० ते ९० मिनिटांनी बदलतो. हा बदल म्हणजे शरीराचे अंतर्गत घड्याळ (Circadian Rhythm) आहे.
जेव्हा माणूस या श्वासाच्या चक्राशी आपले दैनंदिन जीवन, भोजन, झोप, आणि विचार जुळवून घेतो, तेव्हा व्याधीमुक्ती आणि आत्मशांती साध्य होते.`,
};

// -------------------------------------------------------------
// HINDI (हिंदी) MASTER LIBRARY CORPUS
// -------------------------------------------------------------
export const HINDI_MASTER_OVERVIEW = `🕉️ स्वर योग - श्वास का विज्ञान (Swar Yoga: The Science of Breath)
===========================================================
संस्थापक व मार्गदर्शक: मोहन काळबुर्गी (Mohan Kalburgi Sir)
भाषा: हिंदी (Hindi Master Library Corpus)
सम्पर्क: +91 9309986820 | swarsakshi9@gmail.com
वेबसाइट: www.swaryoga.org

-----------------------------------------------------------
【१】 स्वर योग परिचय एवं नाड़ियों का विज्ञान
-----------------------------------------------------------
स्वर योग श्वास के नियमन के माध्यम से ऊर्जा प्रबंधन का प्राचीन भारतीय विज्ञान है।
1. बायाँ नथुना (इड़ा नाड़ी / चंद्र नाड़ी):
   - शीतलता, मानसिक शांति, कफ प्रकृति, रचनात्मकता एवं अंतर्मुखता।
2. दायाँ नथुना (पिंगला नाड़ी / सूर्य नाड़ी):
   - उष्णता, शारीरिक ऊर्जा, पित्त प्रकृति, जठराग्नि एवं बहिर्मुखता।
3. दोनों नथुने (सुषुम्ना नाड़ी):
   - संधिकाल, कुंडलिनी जागरण, ध्यान एवं आध्यात्मिक अनुभव।

-----------------------------------------------------------
【२】 नाड़ी और भोजन व जल चिकित्सा नियम (Mohan Sir's Authentic Water & Meal Therapy Rules)
-----------------------------------------------------------
• भोजन नियम:
  - भोजन हमेशा दायाँ नथुना (सूर्य नाड़ी) सक्रिय होने पर ही करें।
  - इससे जठराग्नि प्रदीप्त रहती है और भोजन सुगमता से पचता है।
  - भोजन के दौरान पानी पीने से बचें ताकि पाचक रस पतले न हों और गैस/अपच न बने।
  - भोजन से 45 मिनट पूर्व या पश्चात ही पानी पिएं।

• मोहन सर के जल चिकित्सा के सख्त नियम (Strict Water Therapy Rules by Mohan Sir):
  1. एक बार में केवल ३ घूँट पानी पिएं (Drink strictly 3 sips of water at one time):
     - कभी भी गट-गट करके या एक साथ पूरा गिलास पानी न पिएं।
     - बैठकर केवल ३ घूँट धीरे-धीरे पिएं। इससे मुख की क्षारीय लार (Alkaline Saliva) पेट में जाकर एसिडिटी को तुरंत शांत करती है।
  2. पानी का दैनिक समय और कोटा (Daily Water Timings & Volume Quota):
     - सुबह ५:०० बजे से १०:०० बजे के बीच २ लीटर पानी पूरा करें (Cover 2 Litres of water from 5:00 AM to 10:00 AM).
     - दोपहर २:०० बजे से रात ९:०० बजे के बीच १.५ लीटर पानी पूरा करें (Cover 1.5 Litres of water from 2:00 PM to 9:00 PM).
  3. रात ९:०० बजे के बाद पानी पीना सख्त मना (Strictly NO water after 9:00 PM at night):
     - रात ९ बजे के बाद बिल्कुल भी पानी न पिएं। रात में शरीर का चयापचय (metabolism) धीमा हो जाता है, रात को पानी पीने से नींद में बाधा, शरीर में सूजन और किडनी पर अवांछित दबाव पड़ता है।
  4. पानी पीते समय नाड़ी:
     - पानी पीते समय बायाँ नथुना (चंद्र नाड़ी / इड़ा) सक्रिय रहना सर्वोत्तम है, क्योंकि पानी शीतल प्रकृति का है। पानी हमेशा बैठकर ही पिएं।

-----------------------------------------------------------
【३】 श्वास गति और जीवनकाल का संबंध
-----------------------------------------------------------
• जीवनकाल आहार से नहीं बल्कि श्वास दर से निर्धारित होता है।
• कछुआ 1 मिनट में 4-5 श्वास लेता है और 300 वर्ष जीता है; कुत्ता 1 मिनट में 30-40 श्वास लेता है और 12-14 वर्ष जीता है।
• मनुष्य का शांत श्वास (12-15 प्रति मिनट) आयु और तेज में वृद्धि करता है।

-----------------------------------------------------------
【४】 16 दिवसीय संपूर्ण पाठ्यक्रम रूपरेखा
-----------------------------------------------------------
दिवस 1: भोजन और पानी नियम (Bhojan & Water Rules)
दिवस 2: जल चिकित्सा, गैस और निद्रा विज्ञान (Gas, Sleep & Water Therapy)
दिवस 3: ॐ प्राणायाम और चक्र संतुलन (Om Pranayama & Chakras)
दिवस 4: ध्यान और सुषुम्ना जागरण (Meditation & Sushumna)
दिवस 5: अजपा-जप 'सो-हं' साधना (Ajapa-Jap 21,600 Breaths)
दिवस 6: आहार और पाचन क्रिया (Digestion & Elements)
दिवस 7: तामसिक और राजसिक आहार के प्रभाव (Tamas Rajas Foods)
दिवस 8: राजसिक और सात्विक आहार (Rajas Satvik Foods)
दिवस 9: सात्विक आहार एवं पंचतत्व शुद्धि (5 Elements & Detox)
दिवस 10: सुषुम्ना नाड़ी और प्रतीक्षा काल (Waiting Period in Sushumna)
दिवस 11: निवारक विज्ञान 1 - आँख, दाँत, फेफड़े और हृदय (Preventive Science 1)
दिवस 12: निवारक विज्ञान 2 - लिवर, किडनी, पैंक्रियास और अस्थि (Preventive Science 2)
दिवस 13: दैनिक प्रातःकालीन स्वर साधना (Morning Earth Touch Sadhana)
दिवस 14: नाड़ी के दैनिक कामकाज (Activities in Ida & Pingala)
दिवस 15: इच्छानुसार स्वर बदलने की 5 विधियाँ (5 Techniques to Switch Swara)
दिवस 16: द्वेष मुक्ति और चित्त शुद्धि (Mental Peace & Overcoming Hatred)`;

// -------------------------------------------------------------
// ENGLISH MASTER LIBRARY CORPUS
// -------------------------------------------------------------
export const ENGLISH_MASTER_OVERVIEW = `🕉️ Swar Yoga - The Science of Breath
===========================================================
Founder & Master: Mohan Kalburgi Sir
Language: English (Master Library Corpus)
Website: www.swaryoga.org | Contact: +91 9309986820

-----------------------------------------------------------
[1] Fundamentals of Swar Yoga & The 3 Nadis
-----------------------------------------------------------
Swar Yoga is the ancient Vedic science of breath regulation, connecting the flow of prana through the nostrils with cosmic rhythms and internal physiology.
1. Left Nostril (Ida Nadi / Moon Breath):
   - Cooling, parasympathetic nervous system activation, mental calm, creativity, digestion rest.
2. Right Nostril (Pingala Nadi / Sun Breath):
   - Heating, sympathetic nervous system activation, metabolic fire (Jatharagni), physical strength.
3. Both Nostrils (Sushumna Nadi):
   - Neutral transition state, ideal for dhyana (meditation), spiritual absorption, and Kundalini flow.

-----------------------------------------------------------
[2] Core Dietary & Water Therapy Rules by Mohan Sir
-----------------------------------------------------------
• Meal Rules:
  - Always consume meals when the Right Nostril (Pingala / Sun Nadi) is active to ensure optimal digestive fire (Jatharagni).
  - Avoid drinking water during or immediately after meals to prevent diluting digestive enzymes.
  - Drink water 45 minutes before or after meals, preferably when the Left Nostril (Chandra / Moon Breath) is active.
  - Sleep on your left side (Vamakukshi) to naturally activate the right nostril, enhancing overnight digestion and restorative sleep.

• Strict Water Therapy Rules by Mohan Sir (Mandatory Protocol):
  1. Drink strictly 3 sips of water at one time:
     - Never gulp down a whole glass or chug water quickly while standing.
     - Always sit down and take strictly 3 slow sips at a time. This allows the alkaline saliva in the mouth to mix thoroughly with the water, neutralizing stomach acidity instantly.
  2. Daily Water Timing & Volume Quota:
     - 5:00 AM to 10:00 AM: Cover strictly 2 Litres of water.
     - 2:00 PM to 9:00 PM: Cover strictly 1.5 Litres of water.
  3. Strictly NO Water After 9:00 PM at Night:
     - Do not drink water after 9:00 PM under any circumstances. Bodily metabolism slows at night; night water causes sleep disruption, bloating/water retention, and puts undue strain on the kidneys.
  4. Swar / Nadi for Drinking Water:
     - Drink water only when the Left Nostril (Chandra Nadi / Ida) is active, as water is cooling by nature. Always drink seated.

-----------------------------------------------------------
[3] 16-Day Level 1 Workshop Syllabus (Foundations)
-----------------------------------------------------------
Day 1: Nadi & Meal Rules (Bhojan & Water Timing)
Day 2: Water Therapy, Gas Prevention & Sleep Alignment
Day 3: Om Pranayama & 7 Chakras Alignment
Day 4: Meditation & Sushumna Activation
Day 5: Ajapa-Jap ('So-Hum' 21,600 Natural Breaths Sadhana)
Day 6: Food & Digestive Fire (Jatharagni Science)
Day 7: Tamasic & Rajasic Foods - Effects on Nervous System
Day 8: Rajasic vs. Satvik Foods - Mental Clarity
Day 9: Satvik Diet & The 5 Elements (Pancha Mahatattva Cleansing)
Day 10: Sushumna Nadi - Transition Periods & Waiting Sadhana
Day 11: Preventive Science 1 - Eyes, Teeth, Lungs & Heart Care
Day 12: Preventive Science 2 - Liver, Pancreas, Kidneys & Bones
Day 13: Daily Morning Swar Sadhana & Earth Touch Ritual
Day 14: Practical Functions of Ida & Pingala Nadis
Day 15: 5 Proven Techniques to Switch Swara at Will
Day 16: Freedom from Resentment & Complete Mental Purification

-----------------------------------------------------------
[4] Level 2: Aham Brahmasmi (अहं ब्रह्मास्मि - Intermediate Mastery)
-----------------------------------------------------------
1. Samyama (संयम) - Dhyan, Dharana & Samadhi in single breath
2. Uttejana (उत्तेजना - Excitement & Emotional Regulation)
3. Samruddhi & Prosperity (समृद्धि - Wealth Consciousness)
4. Relations (संबंध - Harmony & Heart Resonance)
5. Dwandwa (द्वंद्व - Transcending Dualities of Life)
6. Spirit System (आत्म तत्व - Core Spiritual Anatomy)
7. Shad-Ripu (षड्रिपू Part 1 & 2 - 6 Inner Enemies: Kama, Krodha, Lobha, Moha, Mada, Matsara)
8. Panch Tatva (पंचतत्व Part 1 & 2 - 5 Elements Mastery)
9. Brain & Body Connection (Nasal-Hemispheric Synchronization)
10. Money & Dhan (पैसा / धन - Wealth Psychology & Breath Alignment)
11. 45-Minute Samyama Meditation (Continuous Immersion)
12. 5-Minute Pranayama Sadhana
13. Chakras Sadhana (L-1, L-2, L-3 - Single, Connected, Fast, Rapid in One Breath)
14. Photographer vs. Creator Mindset (Passive Spectator vs. Conscious Reality Creator)

-----------------------------------------------------------
[5] Level 3: Ashtavakra Dhyan (अष्टावक्र ध्यान - Advanced Self-Realization)
-----------------------------------------------------------
1. Ashtavakra Gita - Saadhya & Saadhan (साध्य आणि साधन - The Goal & The Means)
2. Drashta Bhav (द्रष्टा भाव - The Silent Witness Consciousness)
3. History vs. Potential (इतिहास विरुद्ध आंतरिक क्षमता - Transcending the past to unlock infinite potential)
4. Self-Letter: "My Dear Mind" (आत्म-संवाद - 'माझ्या मनास पत्र', Dialogue of pure awareness with the mind)
5. Prakriti & Purusha (प्रकृती आणि पुरुष - The eternal dance of Creative Matter & Silent Consciousness)
6. Guru Ashtakam & Gurutatva (गुर्वष्टकम् व गुरुतत्व - Awakening the inner Guru principle & reverence)
7. Bhaja Govindam (भज गोविंदम् - Maya, illusion, and practical detachment from worldly traps)
8. The 5 Virtues / Truths (५ परम सत्य):
   - Satya (सत्य - Absolute Truthfulness)
   - Santosha (संतोष - Deep Inner Contentment)
   - Daya (दया - Boundless Compassion)
   - Kshama (क्षमा - Total Forgiveness)
   - Aarjava (आर्जव - नम्रता / श्रद्धा / समर्पण - Humility, Unshakable Faith & Surrender)
9. Karma Siddhant (कर्म सिद्धांत - Prana, Impressions & Neutralizing Karmic Debt)
10. Panch Kosha & Chetana Ke Star (पंचकोश व चेतनेचे ५ स्तर)
11. Panch Purushartha (धर्म, अर्थ, काम, मोक्ष - Balanced Living)
12. Panch Amrut & Daya Bhav (५ अमृत साधना)
13. Shodhan & Shuddhikriya (षट्कर्म व प्राणायाम शुद्धी)
14. "So What? Life is a Play" (लीला भाव - Transcending cosmic seriousness)
15. Ashtavakra Samadhi Sadhana (अष्टावक्र समाधी साधना)
16. Shivoham Shivoham (शिवोऽहम् शिवोऽहम् - The Grand Culmination / Final Class: "I am Pure Bliss Consciousness")`;

export const JAPANESE_DAYS_DATA: Record<string, string> = {
  why_overview: `🕉️ なぜスワル・ヨガなのか？（Why Swar Yoga? 呼吸の古代科学）
===========================================================
指導者: モハン・カルブルギ先生 (Mohan Kalburgi Sir)
言語: 日本語 (Japanese Master Knowledge)

スワル・ヨガ（Swar Yoga）は、鼻腔を通る呼吸の流れ（スワラ）を自覚し制御することで、心身の健康、自律神経、そして運命のリズムを調律する古代インド・ヴェーダの神聖な叡智です。

【1】2つの主要な生命エネルギーの通り道:
• イダー・ナーディー（Ida Nadi / チャンドラ・スワラ / 左の鼻孔）:
  - 月のエネルギー、冷却、リラクゼーション、副交感神経の活性化。
  - 水分摂取、学習、瞑想、睡眠、静かな対話に適した時間帯。
• ピンガラ・ナーディー（Pingala Nadi / スーリヤ・スワラ / 右の鼻孔）:
  - 太陽のエネルギー、熱、活力、交感神経と消化の火（ジャタラグニ）の活性化。
  - 食事の摂取、運動、商談、決断、肉体労働に適した時間帯。
• スシュムナー・ナーディー（Sushumna Nadi / 両方の鼻孔が同時に均等に通る状態）:
  - イダーとピンガラが切り替わる過渡期（संधि काल / サンディ・カール）。
  - 深い瞑想、マントラ詠唱、内省、神性との一体化に最適な至福の時間。`,

  day1_bhojan: `第1日目: 食事と水分の摂取法則 (Day 1: Bhojan & Water Rules)
===========================================================
指導者: モハン・カルブルギ先生 (Mohan Kalburgi Sir)
言語: 日本語 (Japanese Master Transcript)

スワル・ヨガにおける最初の黄金法則は、「食事はスーリヤ（右鼻孔）、水分はチャンドラ（左鼻孔）」です。

1. 食事の法則:
• 食事をする際は、必ず右の鼻孔（スーリヤ・スワラ）が流れている必要があります。
• 右鼻孔が開いているとき、体内の消化の火（ジャタラグニ）が最高潮に達しており、胃酸と消化酵素が完璧に分泌されます。
• 左鼻孔（チャンドラ）が開いているときに食事を摂ると、火が水によって消され、消化不良、未消化毒素（アーマ）、ガス、疲労感が生じます。

2. 水分の法則:
• 水を飲む際は、左の鼻孔（チャンドラ・スワラ）が開いているときが最適です。
• チャンドラ・スワラは身体の体液バランスと水分代謝を司っており、水分が細胞の隅々まで潤いをもたらします。`,

  day2_pani_gas: `第2日目: 飲水療法、ガス解消、良質な睡眠サイクル (Day 2: Water Therapy & Digestion)
===========================================================
指導者: モハン・カルブルギ先生 (Mohan Kalburgi Sir)
言語: 日本語 (Japanese Master Transcript)

• 朝一番の飲水（ウシャパーナ）は、座った状態でゆっくりと常温の水を一口ずつ噛むように飲みます。
• 食事中や直後に冷たい水をがぶ飲みすることは禁忌です。食事から1時間後にチャンドラ・スワラで水分補給を行います。
• 睡眠時は左側を下にして横たわる（左側臥位）ことで、右鼻孔（スーリヤ・スワラ）が自然に開き、就寝中の消化と内臓の再生が促されます。`,

  day3_om_chakra: `第3日目: オーム・プラーナーヤーマと7つのチャクラ (Day 3: Om Pranayama & Chakras)
===========================================================
指導者: モハン・カルブルギ先生 (Mohan Kalburgi Sir)
言語: 日本語 (Japanese Master Transcript)

• 聖音「オーム（OM / A-U-M）」の微細な振動は、脊柱に沿って走る7つのチャクラ（ムーラーダーラからサハスラーラまで）を整列させます。
• 息を吐きながら胸と頭頂に響かせることで、大脳皮質の興奮を鎮め、自律神経の不調を根本から修復します。`,

  day4_meditation: `第4日目: スシュムナー瞑想と内なる静寂 (Day 4: Sushumna Meditation)
===========================================================
指導者: モハン・カルブルギ先生 (Mohan Kalburgi Sir)
言語: 日本語 (Japanese Master Transcript)

• 日の出、正午、日没、真夜中のサンディ・カール（境目の時間）には、呼吸が自然と両鼻孔に均等に流れるスシュムナー状態に入ります。
• この数分間に目を閉じ、呼吸の微細な出入りを見守ることで、雑念が完全に消え去り、至福の静寂（サマーディ）を体験できます。`,

  day5_ajapa: `第5日目: アジャパ・ジャパ「ソー・ハム」呼吸瞑想 (Day 5: Ajapa-Jap 21,600 Breaths)
===========================================================
指導者: モハン・カルブルギ先生 (Mohan Kalburgi Sir)
言語: 日本語 (Japanese Master Transcript)

人間は1日に約21,600回の呼吸を行っています。
• 吸う息の自然な音は「ソー（So / 彼は）」、吐く息の自然な音は「ハム（Hum / 私は）」。
• 努力して唱えるのではなく、呼吸そのものが奏でる「ソー・ハム（私こそが宇宙そのものである）」の調べに意識を委ねる実践をアジャパ・ジャパと呼びます。`,

  day6_food1: `第6日目: 食事と消化の科学 1 (Day 6: Food & Digestion 1)
===========================================================
指導者: モハン・カルブルギ先生 (Mohan Kalburgi Sir)
言語: 日本語 (Japanese Master Transcript)

• スーリヤ・スワラ（右鼻孔）での食事は、胃酸と酵素の分泌を最大化し、食べたものが純粋なエネルギー（オージャス）に変換されます。
• 食後すぐに座るのではなく、10〜15分間の軽やかな歩行（バジュラーサナまたはゆったりとした散歩）が消化を劇的に促進します。`,

  day7_tamas_rajas: `第7日目: タマスとラジャスの食物 (Day 7: Tamasic & Rajasic Food)
===========================================================
指導者: モハン・カルブルギ先生 (Mohan Kalburgi Sir)
言語: 日本語 (Japanese Master Transcript)

• タマシックな食物（古くなった食品、過度の油分、加工食品）は、呼吸を重くし、思考を鈍らせ、怠惰と病気をもたらします。
• ラジャシックな食物（過度の刺激物、極端な辛味、興奮剤）は、呼吸を浅く速め、怒りと落ち着きのなさを引き起こします。`,

  day8_rajas_satvik: `第8日目: ラジャスからサットヴァへの移行 (Day 8: Rajasic to Satvik)
===========================================================
指導者: モハン・カルブルギ先生 (Mohan Kalburgi Sir)
言語: 日本語 (Japanese Master Transcript)

• 食事を穏やかに整えることで、呼吸の質が安定し、マインドの激しい揺らぎが鎮まります。
• 新鮮な野菜、果物、穀物、純粋な水を中心とした食事は、ナーディーの通り道を清らかに保ちます。`,

  day9_satvik_tatva: `第9日目: サットヴァ的食物と5元素の調和 (Day 9: Satvik Food & 5 Elements)
===========================================================
指導者: モハン・カルブルギ先生 (Mohan Kalburgi Sir)
言語: 日本語 (Japanese Master Transcript)

• 人体は地（プリティヴィ）、水（ジャラ）、火（アグニ）、風（ヴァーユ）、空（アーカーシャ）の5元素で構成されています。
• 適切な食物の選択とスーリヤ・スワラでの消化によって、これら5元素のバランスが完璧に保たれ、病気の根本原因が取り除かれます。`,

  day10_sushumna: `第10日目: スシュムナーの過渡期と待機のサーダナ (Day 10: Sushumna Transition)
===========================================================
指導者: モハン・カルブルギ先生 (Mohan Kalburgi Sir)
言語: 日本語 (Japanese Master Transcript)

• スシュムナー・ナーディーが開いている間は、物質的な仕事、契約、金銭のやり取り、食事、旅行を避け、ただ静止して内省するか祈りを捧げます。
• スシュムナーは神聖なゼロポイント（空）であり、カルマの種を焼き尽くす神聖な時間です。`,

  day11_prev1: `第11日目: 予防科学と内臓の健康管理 1 (Day 11: Preventive Science 1)
===========================================================
指導者: モハン・カルブルギ先生 (Mohan Kalburgi Sir)
言語: 日本語 (Japanese Master Transcript)

• 呼吸の優位側（左右の鼻孔）を観察することで、身体の臓器の疲労度や不調のサインを症状が現れる前に察知できます。
• 肝臓・脾臓・心臓の健康は、日中のスーリヤとチャンドラの自然な周期（約60〜90分ごとの交代）によって維持されています。`,

  day12_prev2: `第12日目: 予防科学と内臓の健康管理 2 (Day 12: Preventive Science 2)
===========================================================
指導者: モハン・カルブルギ先生 (Mohan Kalburgi Sir)
言語: 日本語 (Japanese Master Transcript)

• 慢性の冷え、消化不良、不眠、高血圧は、片方のスワラが異常に長時間ブロックされていることから生じます。
• 意識的にスワラを調整し、就寝前の呼吸を整えることで、自己治癒力が最大限に目覚めます。`,

  day13_sadhana: `第13日目: 朝の地球への祈りとスワラ確認の儀式 (Day 13: Earth Touch & Swara Ritual)
===========================================================
指導者: モハン・カルブルギ先生 (Mohan Kalburgi Sir)
言語: 日本語 (Japanese Master Transcript)

• 毎朝目覚めた瞬間、ベッドから立ち上がる前にまず鼻孔に指を当て、どちらの呼吸が優位かを確認します。
• 流れているスワラと同じ側の足（右鼻孔なら右足、左鼻孔なら左足）を最初に床に降ろし、母なる地球に感謝を捧げて祈ります。
• この儀式を毎日行うことで、一日のすべての行動が宇宙の調和と同期し、不運や災難から身を守ることができます。`,

  day14_nadi_work: `第14日目: イダーとピンガラに基づく人生の重要決断 (Day 14: Practical Decisions)
===========================================================
指導者: モハン・カルブルギ先生 (Mohan Kalburgi Sir)
言語: 日本語 (Japanese Master Transcript)

• 人生の重要な決断、平和的交渉、結婚、学習、瞑想はイダー（チャンドラ）が開いている時に行います。
• 議論、困難な交渉、運動、商談、挑戦はピンガラ（スーリヤ）が開いている時に行います。`,

  day15_nadi_change: `第15日目: 自らの意思でスワラを切り替える5つの技法 (Day 15: 5 Methods to Switch Swara)
===========================================================
指導者: モハン・カルブルギ先生 (Mohan Kalburgi Sir)
言語: 日本語 (Japanese Master Transcript)

自分の意思でスワラを右から左へ、または左から右へ切り替える5つの実用的技法:
1. 脇の下の圧迫（ヨガ・ダンダ技法）
2. 反対側を下にして横たわる体位
3. 開いている鼻孔を指で軽く塞ぐ片鼻呼吸
4. 意識の集中（内観）によるスワラ誘導
5. 肩と首の微細なストレッチと呼吸調整`,

  day16_dwesh: `第16日目: 執着と憎悪からの解放、完全なる心の浄化 (Day 16: Freedom from Hatred)
===========================================================
指導者: モハン・カルブルギ先生 (Mohan Kalburgi Sir)
言語: 日本語 (Japanese Master Transcript)

過去の怒り、恨み、他者への憎悪（ドウェーシャ）は、ナーディーの通路を硬化させ病気の原因となります。
呼気とともにすべての執着を母なる大地に手放し、完全なる許しと慈悲の心を取り戻すことが、スワル・ヨガの最終的な到達点です。`,

  research: `科学的研究と医学的エビデンス (Scientific Research & Evidence)
===========================================================
指導者: モハン・カルブルギ先生 (Mohan Kalburgi Sir)
言語: 日本語 (Japanese Research Report)

1. 鼻周期（Nasal Cycle）と自律神経系（ANS）の同期:
• 右鼻孔優位（スーリヤ）: 交感神経系の刺激、血圧・脈拍・代謝亢進、左脳（論理・計算）の活性化。
• 左鼻孔優位（チャンドラ）: 副交感神経系の優位、心拍低下、鎮静、右脳（直感・創造性・空間認識）の活性化。

2. 脳波測定（EEG）による大脳半球の同期:
• 片鼻呼吸（ナディ・ショーダナ）の実践により、左右の大脳半球の脳波が同期し、集中力と免疫機能が劇的に向上することが現代の神経科学で実証されています。`,
};

/**
 * Resolves the rich, verbatim library corpus text based on selected language, workshop, day, and topic.
 */
export function getLibraryCorpusText(
  lang: string,
  workshopId: string,
  dayId: string,
  topicId: string
): string {
  const normalizedLang = (lang || 'mr').toLowerCase();

  // 1. MARATHI (मराठी) RESOLUTION
  if (normalizedLang === 'mr') {
    // If a specific topic is selected
    if (topicId && topicId !== 'all' && MARATHI_DAYS_DATA[topicId]) {
      return MARATHI_DAYS_DATA[topicId];
    }
    // If a specific day is selected
    if (dayId && dayId !== 'all' && DAY_TOPIC_MAP[dayId] && MARATHI_DAYS_DATA[DAY_TOPIC_MAP[dayId]]) {
      return MARATHI_DAYS_DATA[DAY_TOPIC_MAP[dayId]];
    }
    // If Why Swar Yoga workshop is selected
    if (workshopId === 'why') {
      return MARATHI_DAYS_DATA.why_overview;
    }
    // If Research is selected
    if (workshopId === 'research') {
      return `स्वर योग संशोधन अहवाल आणि वैज्ञानिक पुरावे (Scientific Research Reports)
===========================================================
मार्गदर्शक: मोहन काळबुर्गी (Mohan Kalburgi Sir)

१. नाकपुडी चक्र आणि स्वायत्त मज्जासंस्था (Nasal Cycle & Autonomic Nervous System):
   - उजवी नाकपुडी (सूर्य नाडी) सुरू असताना सिम्पथेटिक नर्व्हस सिस्टीम (Sympathetic Nervous System) उत्तेजित होते, ज्यामुळे हृदयगती व ऑक्सिजन खप वाढतो.
   - डावी नाकपुडी (चंद्र नाडी) सुरू असताना पॅरासिम्पथेटिक नर्व्हस सिस्टीम (Parasympathetic Nervous System) कार्यरत होते, ज्यामुळे रक्तदाब कमी होतो आणि शरीर शांत होते.

२. ईईजी मेंदूचे अर्धगोल संतुलन (EEG Hemispheric Synchronization):
   - डाव्या नाकपुडीचा श्वास उजव्या मेंदूच्या अर्धगोलाला (Right Brain Hemisphere) कार्यक्षम करतो (कलाशौर्य, भावना, ध्यान).
   - उजव्या नाकपुडीचा श्वास डाव्या मेंदूच्या अर्धगोलाला (Left Brain Hemisphere) कार्यक्षम करतो (तर्क, गणित, कृती).

३. हृदयगती परिवर्तनशीलता (HRV & Vagal Tone):
   - दीर्घ संथ श्वासाने व्हेगस नर्व्ह (Vagus Nerve) उत्तेजित होऊन हृदयाचे आरोग्य सुधारते.`;
    }

    // Default: Entire Marathi Master Library Corpus combining all days and lectures!
    return `🕉️ स्वर योग - श्वासाचे विज्ञान (Swar Yoga: The Science of Breath)
===========================================================
मार्गदर्शक: मोहन काळबुर्गी (Mohan Kalburgi Sir)
भाषा: मराठी (Marathi Master Library Corpus)
सर्व कार्यशाळा व १६ दिवसांचा संपूर्ण अभ्यासक्रम (All Workshops & Full Syllabus)

-----------------------------------------------------------
【भाग १】 स्वर योग परिचय व वैज्ञानिक महत्त्व (Why Swar Yoga?)
-----------------------------------------------------------
स्वर योग म्हणजे श्वासाचे प्राचीन भारतीय विज्ञान. डाव्या आणि उजव्या नाकपुडीतील श्वासाचा मानवी मन, शरीर आणि नर्व्हस सिस्टीमशी थेट संबंध असतो.
• डावी नाकपुडी (चंद्र नाडी / इडा): शीतलता, मानसिक शांतता, विश्रांती, कफ प्रवृत्ती.
• उजवी नाकपुडी (सूर्य नाडी / पिंगळा): उष्णता, शारीरिक ऊर्जा, जठराग्नी, पित्त प्रवृत्ती.
• दोन्ही नाकपुड्या (सुषुम्ना नाडी): संधिकाल, अध्यात्म, ध्यान, नामस्मरण.
व्हिडिओ संदर्भ:
• https://www.youtube.com/watch?v=CqyDUkUnt5c
• https://www.youtube.com/watch?v=lEQ0AJd0G9Q
• https://www.youtube.com/watch?v=xNSTziEr9Zo

-----------------------------------------------------------
【भाग २】 लेवल १ (Level 1) - १६ दिवसांचा संपूर्ण अभ्यासक्रम
-----------------------------------------------------------

${MARATHI_DAYS_DATA.day1_bhojan}

-----------------------------------------------------------
${MARATHI_DAYS_DATA.day2_pani_gas}

-----------------------------------------------------------
${MARATHI_DAYS_DATA.day3_om_chakra}

-----------------------------------------------------------
${MARATHI_DAYS_DATA.day4_meditation}

-----------------------------------------------------------
${MARATHI_DAYS_DATA.day5_ajapa}

-----------------------------------------------------------
${MARATHI_DAYS_DATA.day6_food1}

-----------------------------------------------------------
${MARATHI_DAYS_DATA.day7_tamas_rajas}

-----------------------------------------------------------
${MARATHI_DAYS_DATA.day8_rajas_satvik}

-----------------------------------------------------------
${MARATHI_DAYS_DATA.day9_satvik_tatva}

-----------------------------------------------------------
${MARATHI_DAYS_DATA.day10_sushumna}

-----------------------------------------------------------
${MARATHI_DAYS_DATA.day11_prev1}

-----------------------------------------------------------
${MARATHI_DAYS_DATA.day12_prev2}

-----------------------------------------------------------
${MARATHI_DAYS_DATA.day13_sadhana}

-----------------------------------------------------------
${MARATHI_DAYS_DATA.day14_nadi_work}

-----------------------------------------------------------
${MARATHI_DAYS_DATA.day15_nadi_change}

-----------------------------------------------------------
${MARATHI_DAYS_DATA.day16_dwesh}

-----------------------------------------------------------
【भाग ३】 मराठी माहिती सत्र व संपूर्ण व्याख्याने
-----------------------------------------------------------
${MARATHI_DAYS_DATA.mahiti_satra}

${MARATHI_DAYS_DATA.all_lectures}`;
  }

  // 2. HINDI (हिंदी) RESOLUTION
  if (normalizedLang === 'hi') {
    if (dayId && dayId !== 'all' && DAY_TOPIC_MAP[dayId] && MARATHI_DAYS_DATA[DAY_TOPIC_MAP[dayId]]) {
      // Return focused Hindi day info
      return `स्वर योग लेवल १ - ${dayId.toUpperCase()}
===========================================================
मार्गदर्शक: मोहन काळबुर्गी (Mohan Kalburgi Sir)
भाषा: हिंदी (Hindi Corpus)

${HINDI_MASTER_OVERVIEW}`;
    }
    return HINDI_MASTER_OVERVIEW;
  }

  // 3. ENGLISH RESOLUTION
  if (normalizedLang === 'en') {
    return ENGLISH_MASTER_OVERVIEW;
  }

  // 4. KANNADA (ಕನ್ನಡ) RESOLUTION
  if (normalizedLang === 'kn') {
    return `🕉️ ಸ್ವರ ಯೋಗ ಮಾಸ್ಟರ್ ಜ್ಞಾನ ಭಂಡಾರ (Swar Yoga Master Corpus)
===========================================================
ಮಾರ್ಗದರ್ಶಕರು: ಶ್ರೀ ಮೋಹನ್ ಕಾಲ್ಬುರ್ಗಿ (Mohan Kalburgi Sir)
ಭಾಷೆ: ಕನ್ನಡ (Kannada Master Teaching Corpus)

【ಭಾಗ ೧】 ಪವಿತ್ರ ಯೋಗ ಪರಿಭಾಷೆ (ಪದಗಳು ಯಥಾವತ್ತಾಗಿ ಸಂರಕ್ಷಿಸಲ್ಪಟ್ಟಿವೆ):
• ಸ್ವರ ಯೋಗ (Swar Yoga) - ಉಸಿರಾಟದ ಮೂಲಕ ಜೀವನವನ್ನು ಅರಿಯುವ ಪ್ರಾಚೀನ ವಿಜ್ಞಾನ
• ಇಡಾ ನಾಡಿ / ಚಂದ್ರ ಸ್ವರ (Ida Nadi / Chandra Swara) - ಎಡ ಮೂಗಿನ ಹೊಳ್ಳೆ, ತಂಪು, ಶಾಂತಿ, ಜೀರ್ಣಕ್ರಿಯೆ
• ಪಿಂಗಳಾ ನಾಡಿ / ಸೂರ್ಯ ಸ್ವರ (Pingala Nadi / Surya Swara) - ಬಲ ಮೂಗಿನ ಹೊಳ್ಳೆ, ಉಷ್ಣ, ಶಕ್ತಿ, ಕ್ರಿಯಾಶೀಲತೆ
• ಸುಷುಮ್ನಾ ನಾಡಿ (Sushumna Nadi) - ಎರಡೂ ಹೊಳ್ಳೆಗಳು ಸಮಾನವಾಗಿ ಚಲಿಸುವ ಧ್ಯಾನಸ್ಥ ಸ್ಥಿತಿ

【ಭಾಗ ೨】 ೧೬ ದಿನಗಳ ಸಂಪೂರ್ಣ ಪಠ್ಯಕ್ರಮ (16-Day Syllabus):
• ದಿನ ೧: ಊಟ ಮತ್ತು ನೀರು ಸೇವನೆಯ ನಿಯಮಗಳು (ಸೂರ್ಯ ಸ್ವರದಲ್ಲಿ ಭೋಜನ, ಚಂದ್ರ ಸ್ವರದಲ್ಲಿ ನೀರು)
• ದಿನ ೨: ನೀರಿನ ಚಿಕಿತ್ಸೆ, ಗ್ಯಾಸ್ ನಿವಾರಣೆ ಮತ್ತು ನಿದ್ರಾ ವಿಜ್ಞಾನ
• ದಿನ ೩: ಓಂ ಪ್ರಾಣಾಯಾಮ ಮತ್ತು ೭ ಚಕ್ರಗಳ ಜಾಗೃತಿ
• ದಿನ ೪: ಸುಷುಮ್ನಾ ಧ್ಯಾನ ಮತ್ತು ಆಂತರಿಕ ಶಾಂತಿ
• ದಿನ ೫: ಅಜಪಾ-ಜಪ 'ಸೋ-ಹಂ' ಸಾಧನೆ (ಉಸಿರಾಟದ ಮಂತ್ರ)
• ದಿನ ೬-೯: ಪಂಚಮಹಾಭೂತ ಆಹಾರ ಪದ್ಧತಿ, ಸಾತ್ವಿಕ ಮತ್ತು ರಾಜಸಿಕ ಸಮತೋಲನ
• ದಿನ ೧೦: ಸುಷುಮ್ನಾ ಸಂಧಿಕಾಲ ಮತ್ತು ಕಾಯುವ ಸಾಧನೆ
• ದಿನ ೧೧-೧೨: ರೋಗನಿರೋಧಕ ವಿಜ್ಞಾನ ಮತ್ತು ಅಂಗಾಂಗಗಳ ನೈಸರ್ಗಿಕ ಆರೋಗ್ಯ
• ದಿನ ೧೩: ಪ್ರಾತಃಕಾಲ ಭೂಮಿ ಸ್ಪರ್ಶ ಮತ್ತು ದಿನನಿತ್ಯದ ಸ್ವರ ಸಾಧನೆ
• ದಿನ ೧೪: ನಾಡಿಗಳ ಕಾರ್ಯವಿಧಾನ ಮತ್ತು ಜೀವನದ ನಿರ್ಧಾರಗಳು
• ದಿನ ೧೫: ಸ್ವರವನ್ನು ನಮ್ಮಿಷ್ಟದಂತೆ ಬದಲಾಯಿಸುವ ೫ ಪ್ರಾಯೋಗಿಕ ವಿಧಾನಗಳು
• ದಿನ ೧೬: ದ್ವೇಷ ಮುಕ್ತಿ, ಕ್ಷಮಾ ಭಾವ ಮತ್ತು ಚಿತ್ತಶುದ್ಧಿ`;
  }

  // 5. GUJARATI (ગુજરાતી) RESOLUTION
  if (normalizedLang === 'gu') {
    return `🕉️ સ્વર યોગ માસ્ટર જ્ઞાન ભંડાર (Swar Yoga Gujarati Corpus)
===========================================================
માર્ગદર્શક: શ્રી મોહન કાલબુર્ગી (Mohan Kalburgi Sir)
ભાષા: ગુજરાતી (Gujarati Master Knowledge)

【ભાગ ૧】 પવિત્ર યોગિક પારિભાષિક શબ્દો:
• સ્વર યોગ (Swar Yoga) - શ્વાસનું દિવ્ય વિજ્ઞાન
• ઇડા નાડી / ચંદ્ર સ્વર (Ida Nadi / Chandra Swara) - ડાબું નસકોરું, શીતળતા, શાંતિ
• પિંગળા નાડી / સૂર્ય સ્વર (Pingala Nadi / Surya Swara) - જમણું નસકોરું, ગરમી, કાર્યક્ષમતા
• સુષુમ્ણા નાડી (Sushumna Nadi) - ધ્યાન અને સમાધિનો માર્ગ

【ભાગ ૨】 ૧૬ દિવસનો સંપૂર્ણ અભ્યાસક્રમ:
• દિવસ ૧: ભોજન અને પાણીના નિયમો (સૂર્ય સ્વરમાં ભોજન, ચંદ્ર સ્વરમાં પાણી)
• દિવસ ૨: જળ ચિકિત્સા, ગેસ મુક્તિ અને ગાઢ ઊંઘ
• દિવસ ૩: ૐ પ્રાણાયામ અને ૭ ચક્ર જાગરણ
• દિવસ ૪: ધ્યાન અને મનની સ્થિરતા
• દિવસ ૫: અજપા-જપ 'સો-હં' શ્વાસ સાધના
• દિવસ ૬-૯: પંચતત્વ આહાર, સાત્વિક ભોજન નિયમો
• દિવસ ૧૦: સુષુમ્ણા પ્રતીક્ષા સાધના
• દિવસ ૧૧-૧૨: રોગનિવારક વિજ્ઞાન અને અંગ સ્વાસ્થ્ય
• દિવસ ૧૩: સવારની ધરતી વંદના અને દૈનિક સ્વર તપાસ
• દિવસ ૧૪: નાડીઓની કાર્યપદ્ધતિ અને નિર્ણયો
• દિવસ ૧૫: ઇચ્છા મુજબ સ્વર બદલવાની ૫ રીતો
• દિવસ ૧૬: દ્વેષ મુક્તિ અને ચિત્તશુદ્ધિ`;
  }

  // 6. TAMIL (தமிழ்) RESOLUTION
  if (normalizedLang === 'ta') {
    return `🕉️ ஸ்வர யோகா மூல ஞானக் களஞ்சியம் (Swar Yoga Tamil Corpus)
===========================================================
வழிகாட்டி: ஸ்ரீ மோகன் கால்புர்கி (Mohan Kalburgi Sir)
மொழி: தமிழ் (Tamil Master Knowledge)

【பகுதி 1】 புனித யோக சொற்களஞ்சியம்:
• ஸ்வர யோகம் (Swar Yoga) - பிராண சுவாசத்தின் அறிவியல்
• இட கலை / சந்திர ஸ்வரம் (Ida Nadi) - இடது நாசி, குளிர்ச்சி, அமைதி
• பிங்கலை / சூரிய ஸ்வரம் (Pingala Nadi) - வலது நாசி, உஷ்ணம், ஆற்றல்
• சுழுமுனை நாடி (Sushumna Nadi) - தியானத்தின் சமநிலை நிலை

【பகுதி 2】 16 நாட்கள் முழுமையான பயிற்சித் திட்டம்:
• நாள் 1: உணவு மற்றும் நீர் அருந்தும் விதிகள் (சூரிய ஸ்வரத்தில் உணவு, சந்திரனில் நீர்)
• நாள் 2: நீர் மருத்துவம், வாயு நீக்கம் மற்றும் தூக்க அறிவியல்
• நாள் 3: ஓம் பிராணாயாமம் மற்றும் சக்கர விழிப்புணர்வு
• நாள் 4: ஆழ்ந்த தியானம் மற்றும் மன அமைதி
• நாள் 5: அஜபா-ஜபம் 'சோ-ஹம்' மூச்சுப் பயிற்சி
• நாள் 6-9: பஞ்சபூத உணவு முறை, சாத்வீக ஊட்டச்சத்து
• நாள் 10: சுழுமுனை மாற்றம் மற்றும் காத்திருத்தல் தியானம்
• நாள் 11-12: நோய் தடுப்பு அறிவியல் மற்றும் உடல் நலம்
• நாள் 13: காலை பூமி பூஜை மற்றும் தினசரி ஸ்வரப் பயிற்சி
• நாள் 14: நாடிகளின் இயக்கம் மற்றும் வாழ்வியல் முடிவுகள்
• நாள் 15: ஸ்வரத்தை மாற்றும் 5 எளிய முறைகள்
• நாள் 16: மன அமைதி, வெறுப்பு நீக்கம் மற்றும் சித்த சுத்தி`;
  }

  // 7. TELUGU (తెలుగు) RESOLUTION
  if (normalizedLang === 'te') {
    return `🕉️ స్వర యోగ మాస్టర్ జ్ఞాన నిధి (Swar Yoga Telugu Corpus)
===========================================================
మార్గదర్శకులు: శ్రీ మోహన్ కాల్బుర్గి (Mohan Kalburgi Sir)
భాష: తెలుగు (Telugu Master Teaching)

【భాగం 1】 పవిత్ర యోగ పరిభాష:
• స్వర యోగం (Swar Yoga) - శ్వాస ద్వారా జీవన విజ్ఞానం
• ఇడా నాడి / చంద్ర స్వరము (Ida Nadi) - ఎడమ ముక్కు రంధ్రము, శీతలము, ప్రశాంతత
• పింగళ నాడి / సూర్య స్వరము (Pingala Nadi) - కుడి ముక్కు రంధ్రము, శక్తి, ఉష్ణము
• సుషుమ్న నాడి (Sushumna Nadi) - ధ్యాన స్థితి, సమతుల్యత

【భాగం 2】 16 రోజుల సమగ్ర పాఠ్య ప్రణాళిక:
• రోజు 1: ఆహారం మరియు నీటి నియమాలు (సూర్య స్వరంలో భోజనం, చంద్ర స్వరంలో నీరు)
• రోజు 2: జల చికిత్స, గ్యాస్ నివారణ మరియు సంపూర్ణ నిద్ర
• రోజు 3: ఓం ప్రాణాయామం మరియు 7 చక్రాల జాగృతి
• రోజు 4: సుషుమ్న ధ్యానం మరియు అంతశ్శాంతి
• రోజు 5: అజపా-జప 'సో-హం' శ్వాస సాధన
• రోజు 6-9: పంచభూత ఆహార నియమాలు, సాత్విక జీవనం
• రోజు 10: సుషుమ్న ప్రతీక్షా సాధన
• రోజు 11-12: నివారణా విజ్ఞానం మరియు అవయవ ఆరోగ్యం
• రోజు 13: ఉదయపు భూమి స్పర్శ మరియు నిత్య స్వర సాధన
• రోజు 14: నాడీ వ్యవస్థ పనితీరు మరియు నిర్ణయాలు
• రోజు 15: స్వరమును మన ఇష్టానుసారం మార్చే 5 మార్గాలు
• రోజు 16: ద్వేష ముక్తి, క్షమా భావన మరియు చిత్తశుద్ధి`;
  }

  // 8. SPANISH (Español) RESOLUTION
  if (normalizedLang === 'es') {
    return `🕉️ Swar Yoga Maestro Corpus de Conocimiento
===========================================================
Guía Maestro: Mohan Kalburgi Sir
Idioma: Español (Spanish Master Corpus)
Terminología Védica Sagrada: Estrictamente Preservada Verbatim

【SECCIÓN 1】 Terminología Sagrada:
• Swar Yoga (स्वर योग) - La ciencia védica sagrada de los ritmos de la respiración
• Ida Nadi / Chandra Swara - Fosa nasal izquierda, energía lunar, calma, digestión de agua
• Pingala Nadi / Surya Swara - Fosa nasal derecha, energía solar, vitalidad, digestión de alimentos
• Sushumna Nadi - Ambas fosas nasales equilibradas, estado meditativo profundo

【SECCIÓN 2】 Plan de Estudios de 16 Días:
• Día 1: Reglas sagradas de alimentación y agua (Comer en Surya, beber en Chandra)
• Día 2: Terapia del agua, alivio de gases y ciclo del sueño
• Día 3: Pranayama Om y alineación de los 7 Chakras
• Día 4: Meditación profunda y activación de Sushumna
• Día 5: Sadhana Ajapa-Jap ('So-Hum')
• Día 6-9: Dieta Panchatattva y nutrición sáttvica
• Día 10: Transición a Sushumna y paciencia espiritual
• Día 11-12: Ciencia preventiva de órganos vitales
• Día 13: Ritual matutino de saludo a la Tierra y verificación del Swara
• Día 14: Toma de decisiones en Ida vs Pingala
• Día 15: 5 Métodos prácticos para cambiar de Swara voluntariamente
• Día 16: Liberación del resentimiento y purificación de la mente`;
  }

  // 9. FRENCH (Français) RESOLUTION
  if (normalizedLang === 'fr') {
    return `🕉️ Swar Yoga Corpus de Connaissance Maître
===========================================================
Guide Spirituel: Mohan Kalburgi Sir
Langue: Français (French Master Corpus)
Terminologie Védique Sacrée: Strictement Préservée

【SECTION 1】 Terminologie Védique Sacrée:
• Swar Yoga (स्वर योग) - La science védique des flux respiratoires
• Ida Nadi / Chandra Swara - Narine gauche, énergie lunaire, fraîcheur, apaisement
• Pingala Nadi / Surya Swara - Narine droite, énergie solaire, chaleur, dynamisme
• Sushumna Nadi - Flux central équilibré, état de méditation profonde

【SECTION 2】 Programme Complet de 16 Jours:
• Jour 1: Règles sacrées de l'alimentation et de l'eau (Manger en Surya, boire en Chandra)
• Jour 2: Thérapie par l'eau, digestion et science du sommeil
• Jour 3: Pranayama Om et harmonisation des 7 Chakras
• Jour 4: Méditation profonde et activation de Sushumna
• Jour 5: Sadhana Ajapa-Jap ('So-Hum')
• Jour 6-9: Alimentation selon les 5 Éléments et régime Satvik
• Jour 10: Attente sacrée de Sushumna
• Jour 11-12: Science préventive de la santé des organes
• Jour 13: Rituel matinal de contact avec la Terre et diagnostic du Swar
• Jour 14: Prise de décisions selon Ida et Pingala
• Jour 15: 5 méthodes pratiques pour changer de narine dominante
• Jour 16: Libération des rancunes et purification du mental`;
  }

  // 10. GERMAN (Deutsch) RESOLUTION
  if (normalizedLang === 'de') {
    return `🕉️ Swar Yoga Meister-Wissenskorpus
===========================================================
Lehrender Meister: Mohan Kalburgi Sir
Sprache: Deutsch (German Master Corpus)
Heilige vedische Begriffe: Wortgetreu beibehalten

【ABSCHNITT 1】 Heilige vedische Terminologie:
• Swar Yoga (स्वर योग) - Die vedische Wissenschaft des Atems
• Ida Nadi / Chandra Swara - Linkes Nasenloch, Mondenergie, Ruhe, Kühlung
• Pingala Nadi / Surya Swara - Rechtes Nasenloch, Sonnenenergie, Wärme, Aktivität
• Sushumna Nadi - Ausgeglichener Atemstrom, Zustand tiefer Meditation

【ABSCHNITT 2】 16-Tage Lehrplan:
• Tag 1: Gesetze der Nahrungs- und Wasseraufnahme (Essen in Surya, Trinken in Chandra)
• Tag 2: Wassertherapie, Verdauung und Schlafwissenschaft
• Tag 3: Om Pranayama und Ausrichtung der 7 Chakren
• Tag 4: Tiefenmeditation und Sushumna-Aktivierung
• Tag 5: Ajapa-Jap ('So-Hum') Atemsadhana
• Tag 6-9: 5-Elemente-Ernährung und satvische Nahrung
• Tag 10: Sushumna-Übergang und stilles Verweilen
• Tag 11-12: Präventive Organgesundheit
• Tag 13: Morgendliches Erdenritual und Swara-Prüfung
• Tag 14: Lebensentscheidungen nach Ida und Pingala
• Tag 15: 5 praktische Methoden zum bewussten Swara-Wechsel
• Tag 16: Befreiung von Groll und geistige Klärung`;
  }

  // 11. JAPANESE (日本語) RESOLUTION
  if (normalizedLang === 'ja' || normalizedLang === 'japanese' || normalizedLang === 'jp') {
    if (topicId && topicId !== 'all' && JAPANESE_DAYS_DATA[topicId]) {
      return JAPANESE_DAYS_DATA[topicId];
    }
    if (dayId && dayId !== 'all' && DAY_TOPIC_MAP[dayId] && JAPANESE_DAYS_DATA[DAY_TOPIC_MAP[dayId]]) {
      return JAPANESE_DAYS_DATA[DAY_TOPIC_MAP[dayId]];
    }
    if (workshopId === 'why') {
      return JAPANESE_DAYS_DATA.why_overview;
    }
    if (workshopId === 'research') {
      return JAPANESE_DAYS_DATA.research;
    }

    return `🕉️ スワル・ヨガ マスター知識体系 (Swar Yoga Japanese Master Corpus)
===========================================================
指導者: モハン・カルブルギ先生 (Mohan Kalburgi Sir)
言語: 日本語 (Japanese Master Teaching Corpus)
聖なるヴェーダ用語: 完全に原文のまま保持

-----------------------------------------------------------
【第1部】 なぜスワル・ヨガなのか？（Why Swar Yoga? 呼吸の古代科学）
-----------------------------------------------------------
${JAPANESE_DAYS_DATA.why_overview}

-----------------------------------------------------------
【第2部】 レベル1 (Level 1) - 16日間の完全シラバスと講義録
-----------------------------------------------------------
${JAPANESE_DAYS_DATA.day1_bhojan}

-----------------------------------------------------------
${JAPANESE_DAYS_DATA.day2_pani_gas}

-----------------------------------------------------------
${JAPANESE_DAYS_DATA.day3_om_chakra}

-----------------------------------------------------------
${JAPANESE_DAYS_DATA.day4_meditation}

-----------------------------------------------------------
${JAPANESE_DAYS_DATA.day5_ajapa}

-----------------------------------------------------------
${JAPANESE_DAYS_DATA.day6_food1}

-----------------------------------------------------------
${JAPANESE_DAYS_DATA.day7_tamas_rajas}

-----------------------------------------------------------
${JAPANESE_DAYS_DATA.day8_rajas_satvik}

-----------------------------------------------------------
${JAPANESE_DAYS_DATA.day9_satvik_tatva}

-----------------------------------------------------------
${JAPANESE_DAYS_DATA.day10_sushumna}

-----------------------------------------------------------
${JAPANESE_DAYS_DATA.day11_prev1}

-----------------------------------------------------------
${JAPANESE_DAYS_DATA.day12_prev2}

-----------------------------------------------------------
${JAPANESE_DAYS_DATA.day13_sadhana}

-----------------------------------------------------------
${JAPANESE_DAYS_DATA.day14_nadi_work}

-----------------------------------------------------------
${JAPANESE_DAYS_DATA.day15_nadi_change}

-----------------------------------------------------------
${JAPANESE_DAYS_DATA.day16_dwesh}`;
  }

  // 12. RUSSIAN (Русский) RESOLUTION
  if (normalizedLang === 'ru') {
    return `🕉️ Свар Йога: Мастер-Корпус Знаний (Swar Yoga Russian Corpus)
===========================================================
Наставник: Гуру Мохан Калбурги (Mohan Kalburgi Sir)
Язык: Русский (Russian Master Teaching Corpus)
Священная ведическая терминология: сохранена дословно

【РАЗДЕЛ 1】 Священная терминология Свар Йоги:
• Свар Йога (Swar Yoga / древняя наука осознания космических ритмов дыхания)
• Ида Нади / Чандра Свара (левая ноздря, лунная энергия, охлаждение, покой, усвоение воды)
• Пингала Нади / Сурья Свара (правая ноздря, солнечная энергия, огонь пищеварения, активность, приём пищи)
• Сушумна Нади (центральный канал, состояние глубокой медитации и баланса)
• Пранаяма и Кумбхака (дыхательные практики и задержка дыхания)
• Панча Махабхута (пять первоэлементов: Земля, Вода, Огонь, Воздух, Эфир)

【РАЗДЕЛ 2】 16-дневный Мастер-Курс:
• День 1: Священные законы приёма пищи и воды (еда при Сурье, вода при Чандре)
• День 2: Водная терапия, устранение газов и правильный сон
• День 3: Ом Пранаяма и пробуждение 7 чакр
• День 4: Сушумна медитация и внутренний покой
• День 5: Аджапа-Джапа («Со-Хам») дыхательная садхана
• День 6-9: Диета по 5 элементам, саттвическое питание против раджасического
• День 10: Период Сушумны и практика осознанного ожидания
• День 11-12: Превентивное оздоровление внутренних органов
• День 13: Утреннее приветствие Земли и ритуал проверки Свары
• День 14: Принятие жизненно важных решений по Иде и Пингале
• День 15: 5 практических методов осознанного переключения ноздри (Свары)
• День 16: Освобождение от обид, очищение сознания и прощение`;
  }

  // 13. MANDARIN CHINESE (中文) RESOLUTION
  if (normalizedLang === 'zh') {
    return `🕉️ 呼吸瑜伽（Swar Yoga）核心知识全书
===========================================================
导师: 莫汉·卡尔布尔吉大师 (Mohan Kalburgi Sir)
语言: 中文 (Chinese Master Teaching Corpus)
神圣吠陀词汇: 严格保留原文原貌

【第一部分】 吠陀神圣瑜伽术语:
• 呼吸瑜伽 (Swar Yoga / 探索鼻息节律与宇宙生命能量流动的古代吠陀科学)
• 左脉 / 月亮息 (Ida Nadi / Chandra Swara: 左鼻孔流，清凉，平静，水液消化)
• 右脉 / 太阳息 (Pingala Nadi / Surya Swara: 右鼻孔流，温热，消化之火，进餐)
• 中脉 (Sushumna Nadi: 双鼻孔均等流通，进入深定、冥想与灵魂平衡之境)
• 调息与瓶气 (Pranayama & Kumbhaka)
• 五大元素 (Pancha Mahatattva: 地、水、火、风、空)

【第二部分】 16天完整教学大纲:
• 第1天: 进食与饮水法则（太阳息进餐，月亮息饮水）
• 第2天: 水疗法、胀气排除与深度睡眠科学
• 第3天: 嗡音调息（Om Pranayama）与七脉轮觉醒
• 第4天: 中脉冥想与内在宁静
• 第5天: 无念诵念（Ajapa-Jap 'So-Hum'）呼吸修持
• 第6-9天: 五元素饮食、悦性食物与变性食物调节
• 第10天: 中脉交替等待期的修行智慧
• 第11-12天: 五脏六腑预防医学与自体健康管理
• 第13天: 清晨触地礼拜与验息仪式
• 第14天: 依月息与日息做出人生正确决策
• 第15天: 自主转换呼吸气息（鼻孔主导）的5大实修秘法
• 第16天: 远离嗔恨、宽恕与心识彻底净化`;
  }

  // 14. ARABIC (العربية) RESOLUTION
  if (normalizedLang === 'ar') {
    return `🕉️ موسوعة سوار يوجا المعرفية الشاملة (Swar Yoga Arabic Corpus)
===========================================================
المرشد: المعلم موهان كالبورغي (Mohan Kalburgi Sir)
اللغة: العربية (Arabic Master Teaching Corpus)
المصطلحات الفيدية المقدسة: محفوظة حرفياً بأصالتها

【القسم الأول】 المصطلحات الفيدية الأصيلة:
• سوار يوجا (Swar Yoga - علم تدفق الأنفاس وتناغم الإيقاع الكوني الحيوي)
• إيدا نادي / تيار القمر (Ida Nadi / فتحة الأنف اليسرى، برودة، سكينة، هضم الماء)
• بينغالا نادي / تيار الشمس (Pingala Nadi / فتحة الأنف اليمنى، حرارة، نشاط، هضم الطعام)
• سوشومنا نادي (Sushumna Nadi / توازن فتحتي الأنف معاً، بوابة التأمل والارتقاء الروحي)
• براناياما وكومبهاكا (تمارين التنفس وحبس النَفَس المقدس)
• بانشا ماهابوتا (العناصر الخمسة الكونية: الأرض، الماء، النار، الهواء، الأثير)

【القسم الثاني】 منهج الـ 16 يوماً التعليمي الكامل:
• اليوم 1: قواعد تناول الطعام والماء (الأكل مع تيار الشمس، والشرب مع تيار القمر)
• اليوم 2: علاج الماء، التخلص من الغازات وعلم النوم العميق
• اليوم 3: براناياما "أوم" وتناغم الشاكرات السبع
• اليوم 4: تأمل سوشومنا والسلام الداخلي العميق
• اليوم 5: تنفس سادانا "سو-هام" (أجابا-جاب)
• اليوم 6-9: نظام العناصر الخمسة الغذائي والتغذية الساتيفية النقية
• اليوم 10: مرحلة سوشومنا الانتقالية وحكمة الانتظار الواعي
• اليوم 11-12: الطب الوقائي للأعضاء الحيوية
• اليوم 13: طقس لمس الأرض صباحاً وفحص مسار التنفس
• اليوم 14: اتخاذ قرارات الحياة المصيرية وفقاً لإيدا وبينغالا
• اليوم 15: 5 طرق عملية لتغيير مسار التنفس (السوارا) بإرادتك
• اليوم 16: التحرر من البغضاء، التسامح وتطهير العقل والروح`;
  }

  // 15. PORTUGUESE (Português) RESOLUTION
  if (normalizedLang === 'pt') {
    return `🕉️ Corpus Mestre de Conhecimento Swar Yoga
===========================================================
Mestre Guia: Mohan Kalburgi Sir
Idioma: Português (Portuguese Master Corpus)
Terminologia Védica Sagrada: Estritamente Preservada

【SEÇÃO 1】 Terminologia Védica Sagrada:
• Swar Yoga (स्वर योग) - A ciência védica ancestral dos ritmos da respiração
• Ida Nadi / Chandra Swara - Narina esquerda, energia lunar, calma, refrigeração, digestão de líquidos
• Pingala Nadi / Surya Swara - Narina direita, energia solar, calor, vitalidade, digestão de alimentos
• Sushumna Nadi - Fluxo central equilibrado em ambas as narinas, estado de profunda meditação
• Pranayama & Kumbhaka - Controle da respiração e retenção consciente do prana
• Pancha Mahatattva - Os 5 Elementos sagrados (Terra, Água, Fogo, Ar e Éter)

【SEÇÃO 2】 Programa Completo de 16 Dias:
• Dia 1: Leis da ingestão de comida e água (Comer em Surya, beber em Chandra)
• Dia 2: Terapia da água, eliminação de gases e ciência do sono restaurador
• Dia 3: Pranayama Om e despertar dos 7 Chakras
• Dia 4: Meditação Sushumna e paz interior inabalável
• Dia 5: Sadhana de respiração Ajapa-Jap ('So-Hum')
• Dia 6-9: Dieta dos 5 Elementos e equilíbrio da nutrição sátvica
• Dia 10: Transição para Sushumna e sabedoria da espera contemplativa
• Dia 11-12: Medicina preventiva dos órgãos vitais
• Dia 13: Ritual matinal de contato com a Terra e verificação do Swara
• Dia 14: Tomada de decisões essenciais em Ida vs Pingala
• Dia 15: 5 Métodos práticos para alternar o Swara conscientemente
• Dia 16: Libertação de ressentimentos, perdão e purificação mental`;
  }

  // 16. ITALIAN (Italiano) RESOLUTION
  if (normalizedLang === 'it') {
    return `🕉️ Swar Yoga - Corpus della Conoscenza Maestra
===========================================================
Guida Spirituale: Mohan Kalburgi Sir
Lingua: Italiano (Italian Master Corpus)
Terminologia Vedica Sacra: Rigorosamente Conservata

【SEZIONE 1】 Terminologia Sacra:
• Swar Yoga (स्वर योग) - L'antica scienza vedica dei flussi respiratori
• Ida Nadi / Chandra Swara - Narice sinistra, energia lunare, quiete, freschezza, digestione dei liquidi
• Pingala Nadi / Surya Swara - Narice destra, energia solare, calore, azione, digestione del cibo
• Sushumna Nadi - Flusso armonico in entrambe le narici, stato di meditazione profonda
• Pranayama & Kumbhaka - Controllo del respiro e ritenzione sacra del Prana
• Pancha Mahatattva - I 5 Grandi Elementi (Terra, Acqua, Fuoco, Aria, Etere)

【SEZIONE 2】 Programma Completo di 16 Giorni:
• Giorno 1: Regole per cibo e acqua (Mangiare in Surya, bere in Chandra)
• Giorno 2: Terapia dell'acqua, eliminazione dei gas e scienza del sonno
• Giorno 3: Om Pranayama e allineamento dei 7 Chakra
• Giorno 4: Meditazione Sushumna e serenità interiore
• Giorno 5: Sadhana Ajapa-Jap ('So-Hum') con il respiro spontaneo
• Giorno 6-9: Dieta dei 5 Elementi e nutrizione Satvik
• Giorno 10: Transizione in Sushumna e pratica della sacra attesa
• Giorno 11-12: Medicina preventiva e salute naturale degli organi
• Giorno 13: Saluto mattutino alla Terra e verifica del flusso Swara
• Giorno 14: Scelte di vita sagge in Ida e Pingala
• Giorno 15: 5 metodi pratici per cambiare narice dominante a piacimento
• Giorno 16: Liberazione dai risentimenti, perdono e purificazione della mente`;
  }

  // 17. KOREAN (한국어) RESOLUTION
  if (normalizedLang === 'ko') {
    return `🕉️ 스와르 요가 마스터 지식 체계 (Swar Yoga Korean Corpus)
===========================================================
지도 마스터: 모한 칼부르기 선생님 (Mohan Kalburgi Sir)
언어: 한국어 (Korean Master Teaching Corpus)
신성한 베다 용어: 원문 그대로 보존

【제1부】 신성한 요가 핵심 용어:
• 스와르 요가 (Swar Yoga / 호흡의 흐름을 통해 우주와 생명의 리듬을 다스리는 베다 과학)
• 이다 나디 / 찬드라 스와라 (Ida Nadi / 왼쪽 콧구멍, 달의 에너지, 시원함, 평온, 수분 섭취)
• 핑갈라 나디 / 수리야 스와라 (Pingala Nadi / 오른쪽 콧구멍, 태양의 에너지, 온기, 소화력, 식사)
• 수슘나 나디 (Sushumna Nadi / 양쪽 콧구멍이 균형을 이루는 깊은 명상과 깨달음의 상태)
• 프라나야마 & 쿰바카 (호흡 제어 및 숨참기 수련)
• 판차 마하부타 (5대 원소: 지, 수, 화, 풍, 공)

【제2부】 16일 마스터 완성 교육과정:
• 1일차: 음식과 물 섭취의 신성한 법칙 (수리야에서 식사, 찬드라에서 물)
• 2일차: 물 치유법, 가스 제거 및 숙면 과학
• 3일차: 옴 프라나야마 및 7개 차크라 각성
• 4일차: 수슘나 명상과 내면의 고요
• 5일차: 아자파-자파('소-함') 호흡 사다나
• 6-9일차: 5대 원소 식이요법, 사트빅 영양식단
• 10일차: 수슘나 전환기와 거룩한 기다림의 수련
• 11-12일차: 주요 장기 예방 의학 및 자연 치유
• 13일차: 아침 대지 접촉과 스와라 점검 의식
• 14일차: 이다와 핑갈라에 따른 중요한 삶의 결정
• 15일차: 원하는 대로 호흡 흐름을 바꾸는 5가지 실천 기법
• 16일차: 원망과 집착으로부터의 자유, 용서와 마음의 정화`;
  }

  // 18. DUTCH (Nederlands) RESOLUTION
  if (normalizedLang === 'nl') {
    return `🕉️ Swar Yoga Meester Kenniscorpus
===========================================================
Meester-gids: Mohan Kalburgi Sir
Taal: Nederlands (Dutch Master Corpus)
Heilige Vedische terminologie: Woord voor woord bewaard

【DEEL 1】 Heilige Vedische terminologie:
• Swar Yoga (स्वर योग) - De aloude Vedische wetenschap van ademhalingsritmes
• Ida Nadi / Chandra Swara - Linkerneusgat, maanenergie, rust, verkoeling, watervertering
• Pingala Nadi / Surya Swara - Rechterneusgat, zonne-energie, warmte, vitaliteit, voedselvertering
• Sushumna Nadi - Gebalanceerde ademstroom in beide neusgaten, diepe meditatieve staat

【DEEL 2】 16-daags Meester Leerplan:
• Dag 1: Wetten voor voedsel- en waterinname (Eten in Surya, drinken in Chandra)
• Dag 2: Watertherapie, gasverlichting en herstellende slaap
• Dag 3: Om Pranayama en ontwaken van de 7 Chakra's
• Dag 4: Sushumna meditatie en diepe innerlijke vrede
• Dag 5: Ajapa-Jap ('So-Hum') ademhalingssadhana
• Dag 6-9: 5 Elementen dieet en Satvische voeding
• Dag 10: Sushumna overgang en de wijsheid van heilig wachten
• Dag 11-12: Preventieve orgaangezondheid
• Dag 13: Ochtendgroet aan de Aarde en controle van de actieve Swara
• Dag 14: Belangrijke levensbeslissingen nemen volgens Ida en Pingala
• Dag 15: 5 praktische methoden om bewust van Swara te wisselen
• Dag 16: Vrijheid van wrok, vergeving en zuivering van de geest`;
  }

  // 19. TURKISH (Türkçe) RESOLUTION
  if (normalizedLang === 'tr') {
    return `🕉️ Swar Yoga Ana Bilgi Külliyatı (Swar Yoga Turkish Corpus)
===========================================================
Rehber Usta: Mohan Kalburgi Sir
Dil: Türkçe (Turkish Master Teaching Corpus)
Kutsal Vedik Terminoloji: Birebir Korunmuştur

【BÖLÜM 1】 Kutsal Vedik Terminoloji:
• Swar Yoga (स्वर योग) - Nefes akış ritimlerinin kadim Vedik bilimi
• Ida Nadi / Chandra Swara - Sol burun deliği, ay enerjisi, serinlik, sükunet, su sindirimi
• Pingala Nadi / Surya Swara - Sağ burun deliği, güneş enerjisi, sıcaklık, canlılık, yemek sindirimi
• Sushumna Nadi - İki burun deliğinin dengeli akışı, derin meditasyon ve aydınlanma hali

【BÖLÜM 2】 16 Günlük Tam Eğitim Müfredatı:
• Gün 1: Yemek ve su tüketim yasaları (Surya'da yemek, Chandra'da su)
• Gün 2: Su terapisi, gaz giderme ve kaliteli uyku bilimi
• Gün 3: Om Pranayama ve 7 Çakra uyanışı
• Gün 4: Sushumna meditasyonu ve derin içsel huzur
• Gün 5: Ajapa-Jap ('So-Hum') nefes sadhanası
• Gün 6-9: 5 Element diyeti ve Satvik beslenme kuralları
• Gün 10: Sushumna geçişi ve kutsal bekleyiş sadhanası
• Gün 11-12: Yaşamsal organlar için önleyici tıp
• Gün 13: Sabah yeryüzü selamlaması ve Swara kontrol ritüeli
• Gün 14: Ida ve Pingala'ya göre hayati kararlar alma
• Gün 15: İrade ile Swara değiştirmenin 5 pratik yöntemi
• Gün 16: Kin ve kırgınlıklardan özgürleşme, zihinsel arınma`;
  }

  // 20. POLISH (Polski) RESOLUTION
  if (normalizedLang === 'pl') {
    return `🕉️ Swar Yoga - Mistrzowski Korpus Wiedzy
===========================================================
Mistrz Przewodnik: Mohan Kalburgi Sir
Język: Polski (Polish Master Corpus)
Święta terminologia wedyjska: Zachowana dosłownie

【CZĘŚĆ 1】 Święta Terminologia Wedyjska:
• Swar Yoga (स्वर योग) - Starożytna wedyjska nauka o rytmach oddechu
• Ida Nadi / Chandra Swara - Lewe nozdrze, energia księżycowa, chłód, spokój, trawienie wody
• Pingala Nadi / Surya Swara - Prawe nozdrze, energia słoneczna, ciepło, witalność, trawienie posiłków
• Sushumna Nadi - Zrównoważony przepływ w obu nozdrzach, stan głębokiej medytacji

【CZĘŚĆ 2】 16-Dniowy Program Mistrzowski:
• Dzień 1: Zasady przyjmowania pokarmów i wody (Jedzenie przy Surya, woda przy Chandra)
• Dzień 2: Terapia wodna, eliminacja gazów i zdrowy sen
• Dzień 3: Om Pranajama i przebudzenie 7 Czakr
• Dzień 4: Medytacja Sushumna i głęboki spokój wewnętrzny
• Dzień 5: Sadhana oddechowa Ajapa-Jap ('So-Hum')
• Dzień 6-9: Dieta 5 Elementów i odżywianie satwiczne
• Dzień 10: Przejście Sushumna i mądrość uważnego oczekiwania
• Dzień 11-12: Medycyna prewencyjna dla narządów wewnętrznych
• Dzień 13: Poranny rytuał dotknięcia Ziemi i weryfikacja dominującego nozdrza
• Dzień 14: Podejmowanie kluczowych decyzji życiowych według Ida i Pingala
• Dzień 15: 5 praktycznych metod świadomej zmiany dominującego nozdrza
• Dzień 16: Uwolnienie od urazów, wybaczenie i oczyszczenie umysłu`;
  }

  // 21. VIETNAMESE (Tiếng Việt) RESOLUTION
  if (normalizedLang === 'vi') {
    return `🕉️ Swar Yoga - Kho Tàng Kiến Thức Bậc Thầy
===========================================================
Bậc Thầy Hướng Dẫn: Thầy Mohan Kalburgi (Mohan Kalburgi Sir)
Ngôn ngữ: Tiếng Việt (Vietnamese Master Corpus)
Thuật ngữ Vệ Đà thiêng liêng: Bảo tồn nguyên văn 100%

【PHẦN 1】 Thuật Ngữ Vệ Đà Thiêng Liêng:
• Swar Yoga (स्वर योग) - Khoa học Vệ Đà cổ xưa về nhịp điệu của hơi thở
• Kênh Nadi Ida / Chandra Swara - Lỗ mũi trái, năng lượng mặt trăng, thanh mát, tĩnh lặng, tiêu hóa nước
• Kênh Nadi Pingala / Surya Swara - Lỗ mũi phải, năng lượng mặt trời, nhiệt lượng, sức sống, tiêu hóa thức ăn
• Kênh Nadi Sushumna - Dòng chảy cân bằng cả hai lỗ mũi, trạng thái thiền định sâu sắc

【PHẦN 2】 Giáo Trình 16 Ngày Hoàn Chỉnh:
• Ngày 1: Quy luật ăn uống và uống nước (Ăn khi ở Surya, uống khi ở Chandra)
• Ngày 2: Liệu pháp nước, bài trừ khí trệ và khoa học về giấc ngủ phục hồi
• Ngày 3: Pranayama Om và đánh thức 7 luân xa
• Ngày 4: Thiền định Sushumna và sự bình an nội tâm
• Ngày 5: Sadhana hơi thở Ajapa-Jap ('So-Hum')
• Ngày 6-9: Chế độ ăn 5 Nguyên Tố và dinh dưỡng Satvik thanh khiết
• Ngày 10: Chuyển hóa Sushumna và sự kiên nhẫn thiêng liêng
• Ngày 11-12: Khoa học phòng ngừa bệnh lý cho các cơ quan nội tạng
• Ngày 13: Nghi thức chạm đất buổi sáng và kiểm tra dòng thở Swara
• Ngày 14: Đưa ra các quyết định hệ trọng trong đời theo Ida và Pingala
• Ngày 15: 5 phương pháp thực hành chuyển đổi dòng thở theo ý muốn
• Ngày 16: Giải phóng oán hận, tha thứ và thanh lọc tâm trí`;
  }

  // 22. THAI (ไทย) RESOLUTION
  if (normalizedLang === 'th') {
    return `🕉️ สวาร โยคะ คลังปัญญาแห่งปรมาจารย์ (Swar Yoga Thai Corpus)
===========================================================
ปรมาจารย์ผู้สอน: ท่านโมฮัน คาลบูร์กี (Mohan Kalburgi Sir)
ภาษา: ภาษาไทย (Thai Master Teaching Corpus)
คำศัพท์พระเวทศักดิ์สิทธิ์: อนุรักษ์ไว้อย่างถูกต้องครบถ้วน

【ส่วนที่ 1】 คำศัพท์พระเวทศักดิ์สิทธิ์:
• สวาร โยคะ (Swar Yoga / ศาสตร์พระเวทโบราณว่าด้วยจังหวะลมหายใจและพลังชีวิต)
• ช่องพลังงานอิทา / จันทระ สวารา (Ida Nadi / รูจมูกซ้าย พลังพระจันทร์ ความเย็น ความสงบ การย่อยน้ำ)
• ช่องพลังงานปิงคลา / สุริยะ สวารา (Pingala Nadi / รูจมูกขวา พลังพระอาทิตย์ ความอบอุ่น ไฟย่อยอาหาร)
• ช่องพลังงานสุษุมนา (Sushumna Nadi / ลมหายใจไหลสมดุลทั้งสองข้าง เข้าสู่สมาธิขั้นลึก)

【ส่วนที่ 2】 หลักสูตร 16 วันที่สมบูรณ์:
• วันที่ 1: กฎการรับประทานอาหารและดื่มน้ำ (ทานอาหารเมื่อเป็นสุริยะ ดื่มน้ำเมื่อเป็นจันทระ)
• วันที่ 2: วารีบำบัด ขจัดลมในกระเพาะ และวิทยาศาสตร์แห่งการนอนหลับ
• วันที่ 3: โอม ปราณายามะ และการปลุกจักระทั้ง 7
• วันที่ 4: สมาธิสุษุมนาและความสงบแห่งจิตใจ
• วันที่ 5: อาจาปา-จาปา ('โซ-ฮัม') การฝึกสมาธิผ่านลมหายใจ
• วันที่ 6-9: อาหารบำบัดธาตุทั้ง 5 และโภชนาการแบบสัตวิก
• วันที่ 10: ช่วงเปลี่ยนผ่านสุษุมนาและความอดทนอันศักดิ์สิทธิ์
• วันที่ 11-12: วิทยาศาสตร์การป้องกันโรคและสุขภาพอวัยวะภายใน
• วันที่ 13: พิธีสัมผัสแผ่นดินยามเช้าและการตรวจดูลมหายใจสวารา
• วันที่ 14: การตัดสินใจเรื่องสำคัญของชีวิตตามอิทาและปิงคลา
• วันที่ 15: 5 เทคนิคปฏิบัติเพื่อสลับเปลี่ยนลมหายใจได้ดั่งใจนึก
• วันที่ 16: การปลดปล่อยความโกรธแค้น การให้อภัย และการชำระจิตใจให้บริสุทธิ์`;
  }

  // 23. INDONESIAN (Bahasa Indonesia) RESOLUTION
  if (normalizedLang === 'id') {
    return `🕉️ Swar Yoga - Korpus Pengetahuan Utama
===========================================================
Guru Pembimbing: Mohan Kalburgi Sir
Bahasa: Bahasa Indonesia (Indonesian Master Corpus)
Terminologi Weda Suci: Dipertahankan Secara Akurat

【BAGIAN 1】 Terminologi Weda Suci:
• Swar Yoga (स्वर योग) - Ilmu Weda kuno tentang ritme aliran napas
• Ida Nadi / Chandra Swara - Lubang hidung kiri, energi bulan, ketenangan, pencernaan air
• Pingala Nadi / Surya Swara - Lubang hidung kanan, energi matahari, vitalitas, pencernaan makanan
• Sushumna Nadi - Aliran seimbang di kedua lubang hidung, keadaan meditasi mendalam

【BAGIAN 2】 Silabus Lengkap 16 Hari:
• Hari 1: Aturan sakral asupan makanan dan air (Makan saat Surya, minum saat Chandra)
• Hari 2: Terapi air, pembuangan gas lambung, dan sains tidur berkualitas
• Hari 3: Om Pranayama dan penyelarasan 7 Cakra
• Hari 4: Meditasi Sushumna dan kedamaian batin sejati
• Hari 5: Sadhana pernapasan Ajapa-Jap ('So-Hum')
• Hari 6-9: Diet 5 Elemen alam dan nutrisi Satvik murni
• Hari 10: Transisi Sushumna dan kebijaksanaan penantian hening
• Hari 11-12: Sains pencegahan penyakit organ vital
• Hari 13: Ritual menyentuh Bumi pagi hari dan pemeriksaan aliran Swara
• Hari 14: Pengambilan keputusan hidup penting sesuai Ida dan Pingala
• Hari 15: 5 metode praktis mengganti aliran napas sesuai kehendak
• Hari 16: Pembebasan dari kebencian, memaafkan, dan pemurnian batin`;
  }

  // 24. SANSKRIT (संस्कृतम्) RESOLUTION
  if (normalizedLang === 'sa') {
    return `🕉️ स्वरयोग-महाज्ञानकोशः (Swar Yoga Sanskrit Master Corpus)
===========================================================
मार्गदर्शकः: श्रीमान् मोहन कालबुर्गी महोदयः (Mohan Kalburgi Sir)
भाषा: संस्कृतम् (Sanskrit Authentic Text)
परमपवित्र-वैदिकशब्दावलिः सर्वथा सुरक्षिता

【प्रथमः भागः】 पारिभाषिक-योगपदानि:
• स्वरयोगः (श्वासप्रवाहस्य गूढं विज्ञानम्)
• इडा नाडी / चन्द्रस्वरः (वामनासापुटः, शीतलता, शान्तिः, जलपाचनम्)
• पिङ्गला नाडी / सूर्यस्वरः (दक्षिणनासापुटः, उष्णता, तेजः, अन्नपाचनम्)
• सुषुम्ना नाडी (उभयनासापुटयोः समप्रवाहः, परमसमाधेः प्रवेशद्वारम्)
• प्राणायामः कुम्भकश्च (प्राणनियन्त्रणम्)
• पञ्चमहाभूतानि (पृथिवी, जलम्, तेजः, वायुः, आकाशः)

【द्वितीयः भागः】 षोडशदिनानां सम्पूर्ण-पाठ्यक्रमः:
• प्रथमदिनम्: भोजन-जलसेवनयोः नियमाः (सूर्ये भोजनं, चन्द्रे जलम्)
• द्वितीयदिनम्: जलचिकित्सा, वातनिवारणं, सुखनिद्रा च
• तृतीयदिनम्: ॐकार-प्राणायामः सप्तचक्रजागरणञ्च
• चतुर्थदिनम्: सुषुम्नाध्यानम् आन्तरिकशान्तिश्च
• पञ्चमदिनम्: अजपा-जप 'सोऽहम्' श्वाससाधना
• षष्ठ-नवमदिनम्: पञ्चतत्त्वाहारः, सात्त्विक-राजसिक-सन्तुलनम्
• दशमदिनम्: सुषुम्ना-सन्धिकालः प्रतीक्षासाधना च
• एकादश-द्वादशदिनम्: अङ्गारोग्यस्य निवारकविज्ञानम्
• त्रयोदशदिनम्: प्रभाते भूमिसंस्पर्शः स्वरपरीक्षा च
• चतुर्दशदिनम्: इडा-पिङ्गलयोः आधारेण जीवननिर्णयः
• पञ्चदशदिनम्: स्वेच्छया स्वरपरिवर्तनस्य पञ्चोपायाः
• षोडशदिनम्: द्वेषमुक्तिः, क्षमाशीलता, चित्तशुद्धिश्च`;
  }

  // 25. SWEDISH (Svenska) RESOLUTION
  if (normalizedLang === 'sv') {
    return `🕉️ Swar Yoga - Mästarens Kunskapsbank (Swedish Corpus)
===========================================================
Huvudlärare: Mohan Kalburgi Sir
Språk: Svenska (Swedish Master Corpus)
Heliga vediska termer: Strikt bevarade ordagrant

【DEL 1】 Heliga Vediska Termer:
• Swar Yoga (स्वर योग) - Den uråldriga vediska vetenskapen om andningens rytmer
• Ida Nadi / Chandra Swara - Vänster näsborre, månenergi, svalka, lugn, vattenmatsmältning
• Pingala Nadi / Surya Swara - Höger näsborre, solenergi, värme, vitalitet, matsmältning
• Sushumna Nadi - Balanserat flöde i båda näsborrarna, djupt meditativt tillstånd

【DEL 2】 16-dagars Fullständig Kursplan:
• Dag 1: Heliga regler för måltider och vatten (äta i Surya, dricka i Chandra)
• Dag 2: Vattenterapi, matsmältning och sömnvetenskap
• Dag 3: Om Pranayama och balansering av 7 Chakran
• Dag 4: Djup meditation och aktivering av Sushumna
• Dag 5: Ajapa-Jap ('So-Hum') andningssadhana
• Dag 6-9: Panchatattva-diet, Satvik och Rajasik balans
• Dag 10: Sushumna-övergång och tålmodig väntan
• Dag 11-12: Förebyggande organhälsa
• Dag 13: Morgonens jordberöring och Swara-kontroll
• Dag 14: Praktiska livsbeslut i Ida och Pingala
• Dag 15: 5 metoder att byta Swara efter egen vilja
• Dag 16: Frigörelse från agg och sinnets rening`;
  }

  // 26. HEBREW (עברית) RESOLUTION
  if (normalizedLang === 'he') {
    return `🕉️ סוואר יוגה - מאגר הידע המרכזי (Swar Yoga Hebrew Corpus)
===========================================================
מורה דרך: שרי מוהאן קלבורגי (Mohan Kalburgi Sir)
שפה: עברית (Hebrew Master Corpus)
מונחים ודיים מקודשים: נשמרים מילה במילה

【חלק 1】 מונחי מפתח מקודשים:
• סוואר יוגה (Swar Yoga / המדע הוודי העתיק של מקצבי הנשימה וזרימת החיים)
• אידה נאדי / צ'נדרה סווארה (נחיר שמאל, אנרגיית ירח, קרירות, שלווה, עיכול מים)
• פינגלה נאדי / סוריה סווארה (נחיר ימין, אנרגיית שמש, חום, חיוניות, עיכול מזון)
• סושומנה נאדי (זרימה מאוזנת בשני הנחיריים, מצב מדיטציה עמוק והארה)

【חלק 2】 תוכנית לימודים מלאה ל-16 ימים:
• יום 1: חוקי אכילה ושתיית מים (אכילה בסוריה, שתייה בצ'נדרה)
• יום 2: תרפיית מים, מערכת העיכול ואיכות השינה
• יום 3: אום פראנאיאמה ואיזון שבעת הצ'אקרות
• יום 4: מדיטציה עמוקה והפעלת סושומנה
• יום 5: תרגול נשימה אג'אפה-ג'אפ ('סו-האם')
• יום 6-9: תזונת חמשת היסודות ומזון סאטבי
• יום 10: שלב המעבר בסושומנה והמתנה סבלנית
• יום 11-12: מדע מניעת מחלות ובריאות האיברים
• יום 13: טקס נגיעת בוקר באדמה ובדיקת סווארה
• יום 14: החלטות חיים מעשיות באידה מול פינגלה
• יום 15: 5 שיטות מעשיות להחלפת סווארה לפי רצון
• יום 16: שחרור מטינה וטיהור התודעה`;
  }

  // 27. NORWEGIAN (Norsk) RESOLUTION
  if (normalizedLang === 'no') {
    return `🕉️ Swar Yoga - Mesterens Kunnskapsbase (Norsk Corpus)
===========================================================
Veileder: Mohan Kalburgi Sir
Språk: Norsk (Norwegian Master Teaching Corpus)
Hellige vediske begreper: Strengt bevart ord for ord

【DEL 1】 Hellige Vediske Begreper:
• Swar Yoga (स्वर योग) - Den eldgamle vitenskapen om pustens naturlige rytmer
• Ida Nadi / Chandra Swara - Venstre nesebor, måneenergi, kjøling, ro og fordøyelse av vann
• Pingala Nadi / Surya Swara - Høyre nesebor, solenergi, varme, vitalitet og fordøyelse av mat
• Sushumna Nadi - Balansert pust i begge nesebor, tilstand av dyp meditasjon

【DEL 2】 16-dagers Komplett Læreplan:
• Dag 1: Måltids- og vannregler (spis i Surya, drikk i Chandra)
• Dag 2: Vannterapi, fordøyelse og dyp søvn
• Dag 3: Om Pranayama og justering av 7 Chakraer
• Dag 4: Dyp meditasjon og aktivering av Sushumna
• Dag 5: Ajapa-Jap ('So-Hum') pustesadhana
• Dag 6-9: Panchatattva-kosthold, Satvik og Rajasik mat
• Dag 10: Sushumna-overgang og tålmodig ventetid
• Dag 11-12: Forebyggende helse og organpleie
• Dag 13: Morgensjekk av Swara og jording
• Dag 14: Praktiske livsvalg i Ida vs. Pingala
• Dag 15: 5 metoder for å skifte Swara etter egen vilje
• Dag 16: Frihet fra nag og sinnets renselse`;
  }

  // 28. DANISH (Dansk) RESOLUTION
  if (normalizedLang === 'da') {
    return `🕉️ Swar Yoga - Mesterens Vidensbase (Dansk Corpus)
===========================================================
Vejleder: Mohan Kalburgi Sir
Sprog: Dansk (Danish Master Teaching Corpus)
Hellige vediske begreber: Strengt bevaret ordret

【DEL 1】 Hellige Vediske Begreber:
• Swar Yoga (स्वर योग) - Den ældgamle vediske videnskab om åndedrættets rytmer
• Ida Nadi / Chandra Swara - Venstre næsebor, måneenergi, kølighed, fred og vandbalance
• Pingala Nadi / Surya Swara - Højre næsebor, solenergi, varme, aktivitet og madfordøjelse
• Sushumna Nadi - Balanceret strøm i begge næsebor, dyb meditation

【DEL 2】 16-dages Komplet Studieplan:
• Dag 1: Regler for mad og vand (spis i Surya, drik i Chandra)
• Dag 2: Vandterapi, fordøjelse og søvnvidenskab
• Dag 3: Om Pranayama og harmoni i de 7 Chakraer
• Dag 4: Dyb meditation og Sushumna-aktivering
• Dag 5: Ajapa-Jap ('So-Hum') åndedræts-sadhana
• Dag 6-9: Kost ifølge de 5 Elementer og Satvisk ernæring
• Dag 10: Sushumna-overgang og bevidst venten
• Dag 11-12: Forebyggende organsundhed
• Dag 13: Morgenerding og Swara-undersøgelse
• Dag 14: Praktiske livsbeslutninger i Ida vs. Pingala
• Dag 15: 5 enkle metoder til at skifte Swara efter ønske
• Dag 16: Frigørelse fra vrede og sindets renselse`;
  }

  // 29. FINNISH (Suomi) RESOLUTION
  if (normalizedLang === 'fi') {
    return `🕉️ Swar Yoga - Mestarin Tietopankki (Suomenkielinen Korpus)
===========================================================
Ohjaaja: Mohan Kalburgi Sir
Kieli: Suomi (Finnish Master Teaching Corpus)
Pyhät veediset käsitteet: Säilytetty sanantarkasti

【OSA 1】 Pyhät Käsitteet:
• Swar Yoga (स्वर योग) - Hengityksen luonnollisten syklien ikivanha tiede
• Ida Nadi / Chandra Swara - Vasen sierain, kuuenergia, viileys, mielenrauha ja nesteiden imeytyminen
• Pingala Nadi / Surya Swara - Oikea sierain, aurinkoenergia, lämpö, elinvoima ja ruoansulatus
• Sushumna Nadi - Molempien sierainten tasapainoinen virtaus, syvän meditaation tila

【OSA 2】 16-päiväinen Täydellinen Opetussuunnitelma:
• Päivä 1: Ruokailun ja juomisen säännöt (syö Suryassa, juo Chandrassa)
• Päivä 2: Vesiterapia, ruoansulatus ja unen laatu
• Päivä 3: Om Pranayama ja 7 Chakran tasapainotus
• Päivä 4: Syvä meditaatio ja Sushumnan aktivointi
• Päivä 5: Ajapa-Jap ('So-Hum') hengityssadhana
• Päivä 6-9: 5 Alkuaineen ruokavalio ja Satvinen ravinto
• Päivä 10: Sushumna-siirtymä ja kärsivällinen odotus
• Päivä 11-12: Elinten terveyttä ennaltaehkäisevä tiede
• Päivä 13: Aamun maadoittuminen ja Swaran tarkistus
• Päivä 14: Elämänratkaisut Idan ja Pingalan mukaan
• Päivä 15: 5 menetelmää Swaran vaihtamiseen tahdonalaisesti
• Päivä 16: Kaunasta vapautuminen ja mielen puhdistus`;
  }

  // 30. UKRAINIAN (Українська) RESOLUTION
  if (normalizedLang === 'uk') {
    return `🕉️ Свар Йога - Головний Корпус Знань (Український Корпус)
===========================================================
Наставник: Гуру Мохан Калбургі (Mohan Kalburgi Sir)
Мова: Українська (Ukrainian Master Teaching Corpus)
Священна ведична термінологія: збережена дослівно

【РОЗДІЛ 1】 Священні Ведичні Терміни:
• Свар Йога (Swar Yoga / прадавня наука пізнання космічних ритмів дихання)
• Іда Наді / Чандра Свара (ліва ніздря, місячна енергія, охолодження, спокій, засвоєння води)
• Пінгала Наді / Сур'я Свара (права ніздря, сонячна енергія, вогонь травлення, активність, їжа)
• Сушумна Наді (центральний канал, стан глибокої медитації та внутрішньої гармонії)

【РОЗДІЛ 2】 16-денний Повний Навчальний Курс:
• День 1: Священні правила прийому їжі та води (їсти при Сур'ї, пити при Чандрі)
• День 2: Водна терапія, травлення та глибокий сон
• День 3: Ом Пранаяма та гармонізація 7 Чакр
• День 4: Глибока медитація та активація Сушумни
• День 5: Аджапа-Джапа («Со-Хам») дихальна садхана
• День 6-9: Харчування за 5 Елементами та Сатвічна дієта
• День 10: Перехід Сушумни та стан священного очікування
• День 11-12: Превентивна наука здоров'я внутрішніх органів
• День 13: Ранкове торкання землі та діагностика Свари
• День 14: Прийняття життєвих рішень в Іді та Пінгалі
• День 15: 5 практичних способів змінити Свару за власним бажанням
• День 16: Звільнення від образ і повне очищення свідомості`;
  }

  // 31. ROMANIAN (Română) RESOLUTION
  if (normalizedLang === 'ro') {
    return `🕉️ Swar Yoga - Corpusul Magistral de Cunoaștere (Română)
===========================================================
Ghid Spiritual: Mohan Kalburgi Sir
Limba: Română (Romanian Master Teaching Corpus)
Terminologie vedică sacră: Păstrată cu strictețe cuvânt cu cuvânt

【SECȚIUNEA 1】 Terminologie Sacră:
• Swar Yoga (स्वर योग) - Știința vedică străveche a fluxurilor respirației
• Ida Nadi / Chandra Swara - Nara stângă, energie lunară, răcoare, liniște și asimilarea apei
• Pingala Nadi / Surya Swara - Nara dreaptă, energie solară, căldură, digestie și acțiune
• Sushumna Nadi - Fluxul central echilibrat, starea de meditație profundă și iluminare

【SECȚIUNEA 2】 Programa Completă de 16 Zile:
• Ziua 1: Regulile sacre ale mesei și apei (mănâncă pe Surya, bea pe Chandra)
• Ziua 2: Terapia prin apă, digestia și știința somnului
• Ziua 3: Om Pranayama și alinierea celor 7 Chakre
• Ziua 4: Meditație profundă și activarea Sushumnei
• Ziua 5: Sadhana respirației Ajapa-Jap ('So-Hum')
• Ziua 6-9: Dieta celor 5 Elemente și alimentația Satvică
• Ziua 10: Tranziția Sushumnei și arta așteptării conștiente
• Ziua 11-12: Știința preventivă a sănătății organelor
• Ziua 13: Împământarea de dimineață și verificarea Swara
• Ziua 14: Decizii practice de viață în Ida vs. Pingala
• Ziua 15: 5 metode practice de schimbare a Swarei după voință
• Ziua 16: Eliberarea de ranchiună și purificarea minții`;
  }

  // 32. CZECH (Čeština) RESOLUTION
  if (normalizedLang === 'cs') {
    return `🕉️ Svar Jóga - Mistrovský Korpus Vědění (Čeština)
===========================================================
Duchovní průvodce: Mohan Kalburgi Sir
Jazyk: Čeština (Czech Master Teaching Corpus)
Posvátná védská terminologie: Přísně zachována doslovně

【ODDÍL 1】 Posvátná Védská Terminologie:
• Svar Jóga (Swar Yoga) - Dávná védská věda o přirozených rytmech dechu
• Ida Nádí / Čandra Svara - Levá nosní dírka, měsíční energie, chlad, klid a vstřebávání vody
• Pingala Nádí / Súrja Svara - Pravá nosní dírka, sluneční energie, teplo, trávení a vitalita
• Sušumna Nádí - Vyrovnaný proud v obou dírkách, stav hluboké meditace

【ODDÍL 2】 Úplný 16denní Studijní Plán:
• Den 1: Pravidla jídla a pití (jíst v Súrje, pít v Čandře)
• Den 2: Vodní terapie, trávení a věda o spánku
• Den 3: Óm Pránájáma a harmonizace 7 čaker
• Den 4: Hluboká meditace a probuzení Sušumny
• Den 5: Dechová sádhana Adžapa-Džap ('So-Ham')
• Den 6-9: Stava 5 Prvků a sátvická výživa
• Den 10: Přechod v Sušumně a vědomé čekání
• Den 11-12: Preventivní péče o zdraví vnitřních orgánů
• Den 13: Ranní dotek země a diagnostika dechu
• Den 14: Praktická životní rozhodnutí v Idě vs. Pingale
• Den 15: 5 praktických metod vědomé změny nosní dírky
• Den 16: Osvobození od zášti a očištění mysli`;
  }

  // 33. HUNGARIAN (Magyar) RESOLUTION
  if (normalizedLang === 'hu') {
    return `🕉️ Szvar Jóga - Mesteri Tudástár (Magyar Korpusz)
===========================================================
Mester: Mohan Kalburgi Sir
Nyelv: Magyar (Hungarian Master Teaching Corpus)
Szent védikus kifejezések: Szóról szóra pontosan megőrizve

【1. RÉSZ】 Szent Védikus Kifejezések:
• Szvar Jóga (Swar Yoga) - A légzés ritmusainak ősi védikus tudománya
• Ida Nádi / Csandra Szvara - Bal orrlyuk, holdenergia, hűsítés, nyugalom és vízfelszívódás
• Pingala Nádi / Szúrja Szvara - Jobb orrlyuk, napenergia, meleg, emésztés és életerő
• Szusumna Nádi - Kiegyensúlyozott áramlás mindkét orrlyukban, mély meditáció

【2. RÉSZ】 A 16 Napos Teljes Tanmenet:
• 1. nap: Étkezési és vízivási szabályok (evés Szúrjában, ivás Csandrában)
• 2. nap: Vízterápia, emésztés és alvástudomány
• 3. nap: Om Pránájáma és a 7 Csakra összehangolása
• 4. nap: Mély meditáció és a Szusumna aktiválása
• 5. nap: Adzsapa-Dzsap ('Szó-Ham') légzőgyakorlat
• 6-9. nap: Az 5 Elem szerinti étkezés és Szattvikus táplálkozás
• 10. nap: Szusumna átmenet és a türelmes várakozás művészete
• 11-12. nap: Megelőző szervvédelem és belső egészség
• 13. nap: Reggeli földelés és Szvara-ellenőrzés
• 14. nap: Gyakorlati döntések az Idában és Pingalában
• 15. nap: 5 egyszerű módszer a Szvara tudatos váltására
• 16. nap: Megbocsátás, elengedés és a tudat megtisztítása`;
  }

  // 34. GREEK (Ελληνικά) RESOLUTION
  if (normalizedLang === 'el') {
    return `🕉️ Σβαρ Γιόγκα - Κύριο Σώμα Γνώσης (Ελληνικός Κορμός)
===========================================================
Διδάσκαλος: Mohan Kalburgi Sir
Γλώσσα: Ελληνικά (Greek Master Teaching Corpus)
Ιεροί βεδικοί όροι: Αυστηρά διατηρημένοι κατά λέξη

【ΕΝΟΤΗΤΑ 1】 Ιεροί Βεδικοί Όροι:
• Swar Yoga (स्वर योग) - Η αρχαία βεδική επιστήμη των αναπνευστικών ροών
• Ida Nadi / Chandra Swara - Αριστερό ρουθούνι, σεληνιακή ενέργεια, δροσιά, ηρεμία και αφομοίωση νερού
• Pingala Nadi / Surya Swara - Δεξί ρουθούνι, ηλιακή ενέργεια, θερμότητα, πέψη και δράση
• Sushumna Nadi - Ισορροπημένη ροή και στα δύο ρουθούνια, κατάσταση βαθύ διαλογισμού

【ΕΝΟΤΗΤΑ 2】 Πλήρες Πρόγραμμα 16 Ημερών:
• Ημέρα 1: Ιεροί κανόνες φαγητού και νερού (τρώμε στη Surya, πίνουμε στην Chandra)
• Ημέρα 2: Θεραπεία με νερό, πέψη και επιστήμη του ύπνου
• Ημέρα 3: Om Pranayama και ευθυγράμμιση των 7 Τσάκρα
• Ημέρα 4: Βαθύς διαλογισμός και ενεργοποίηση της Sushumna
• Ημέρα 5: Αναπνευστική sadhana Ajapa-Jap ('So-Hum')
• Ημέρα 6-9: Διατροφή των 5 Στοιχείων και Satvik διατροφή
• Ημέρα 10: Μετάβαση Sushumna και συνειδητή αναμονή
• Ημέρα 11-12: Προληπτική υγεία των οργάνων
• Ημέρα 13: Πρωινή γείωση και έλεγχος του Swara
• Ημέρα 14: Πρακτικές αποφάσεις ζωής σε Ida και Pingala
• Ημέρα 15: 5 πρακτικοί τρόποι αλλαγής του Swara κατά βούληση
• Ημέρα 16: Απαλλαγή από κακία και κάθαρση του νου`;
  }

  // 35. MALAY (Bahasa Melayu) RESOLUTION
  if (normalizedLang === 'ms') {
    return `🕉️ Swar Yoga - Khazanah Ilmu Utama (Korpus Bahasa Melayu)
===========================================================
Guru Pembimbing: Mohan Kalburgi Sir
Bahasa: Bahasa Melayu (Malay Master Teaching Corpus)
Istilah Veda Suci: Dipelihara secara verbatim sepenuhnya

【BAHAGIAN 1】 Istilah Veda Suci:
• Swar Yoga (स्वर योग) - Sains purba Veda mengenai irama aliran pernafasan
• Ida Nadi / Chandra Swara - Lubang hidung kiri, tenaga bulan, kesejukan, ketenangan dan penyerapan air
• Pingala Nadi / Surya Swara - Lubang hidung kanan, tenaga suria, kepanasan, pencernaan dan aktiviti
• Sushumna Nadi - Aliran seimbang di kedua-dua lubang hidung, keadaan meditasi mendalam

【BAHAGIAN 2】 Sukatan Pelajaran Lengkap 16 Hari:
• Hari 1: Peraturan makanan dan air (makan semasa Surya, minum semasa Chandra)
• Hari 2: Terapi air, pencernaan dan kualiti tidur
• Hari 3: Om Pranayama dan penyelarasan 7 Chakra
• Hari 4: Meditasi mendalam dan pengaktifan Sushumna
• Hari 5: Sadhana pernafasan Ajapa-Jap ('So-Hum')
• Hari 6-9: Diet 5 Elemen dan pemakanan Satvik
• Hari 10: Peralihan Sushumna dan penantian yang tenang
• Hari 11-12: Sains pencegahan kesihatan organ
• Hari 13: Sentuhan bumi waktu pagi dan pemeriksaan Swara
• Hari 14: Keputusan hidup praktikal dalam Ida vs. Pingala
• Hari 15: 5 kaedah praktikal untuk menukar Swara mengikut kehendak
• Hari 16: Kebebasan daripada dendam dan penyucian minda`;
  }

  // 36. FILIPINO (Tagalog) RESOLUTION
  if (normalizedLang === 'fil') {
    return `🕉️ Swar Yoga - Pangunahing Korpus ng Kaalaman (Wikang Filipino)
===========================================================
Guro at Gabay: Mohan Kalburgi Sir
Wika: Filipino (Tagalog Master Teaching Corpus)
Banal na terminolohiyang Vedic: Mahigpit na pinanatili nang buo

【BAHAGI 1】 Banal na Terminolohiyang Vedic:
• Swar Yoga (स्वर योग) - Sinaunang agham ng mga natural na daloy ng paghinga
• Ida Nadi / Chandra Swara - Kaliwang butas ng ilong, enerhiya ng buwan, lamig, kapayapaan at pag-inom ng tubig
• Pingala Nadi / Surya Swara - Kanang butas ng ilong, enerhiya ng araw, init, sigla at pagtunaw ng pagkain
• Sushumna Nadi - Balanseng paghinga sa dalawang butas ng ilong, estado ng malalim na pagninilay

【BAHAGI 2】 Buong 16-Araw na Plano ng Pag-aaral:
• Araw 1: Mga batas sa pagkain at tubig (kumain sa Surya, uminom sa Chandra)
• Araw 2: Terapiya sa tubig, panunaw at agham ng pagtulog
• Araw 3: Om Pranayama at pagtutugma ng 7 Chakra
• Araw 4: Malalim na meditasyon at paggising ng Sushumna
• Araw 5: Pagsasanay sa paghinga ng Ajapa-Jap ('So-Hum')
• Araw 6-9: Diyeta batay sa 5 Elemento at Satvik na nutrisyon
• Araw 10: Paglipat ng Sushumna at mapayapang paghihintay
• Araw 11-12: Agham ng pag-iwas sa sakit at kalusugan ng mga organo
• Araw 13: Pagdaiti sa lupa sa umaga at pagsusuri ng Swara
• Araw 14: Mga praktikal na desisyon sa buhay sa Ida at Pingala
• Araw 15: 5 madaling paraan upang ilipat ang Swara sa sariling kagustuhan
• Araw 16: Pagpapatawad, paglaya sa poot at paglilinis ng isipan`;
  }

  // 37. SWAHILI (Kiswahili) RESOLUTION
  if (normalizedLang === 'sw') {
    return `🕉️ Swar Yoga - Hazina Kuu ya Mafunzo (Kiswahili Corpus)
===========================================================
Mwalimu Kiongozi: Mohan Kalburgi Sir
Lugha: Kiswahili (Swahili Master Teaching Corpus)
Maneno Matakatifu ya Vedic: Yamehifadhiwa neno kwa neno

【SEHEMU 1】 Maneno Matakatifu ya Vedic:
• Swar Yoga (स्वर योग) - Sayansi ya kale ya mikondo ya pumzi na uhai
• Ida Nadi / Chandra Swara - Tundu la kushoto la pua, nishati ya mwezi, baridi, amani na unywaji wa maji
• Pingala Nadi / Surya Swara - Tundu la kulia la pua, nishati ya jua, joto, usagaji chakula na nguvu
• Sushumna Nadi - Mtiririko uliosawazishwa katika matundu yote mawili, hali ya tafakari ya kina

【SEHEMU 2】 Muhtasari Kamili wa Mafunzo ya Siku 16:
• Siku 1: Kanuni za chakula na maji (kula wakati wa Surya, kunywa wakati wa Chandra)
• Siku 2: Tiba ya maji, mfumo wa mmeng'enyo na usingizi mzuri
• Siku 3: Om Pranayama na mpangilio wa Chakra 7
• Siku 4: Tafakari ya kina na kuamsha Sushumna
• Siku 5: Mazoezi ya pumzi ya Ajapa-Jap ('So-Hum')
• Siku 6-9: Lishe kulingana na Vipengele 5 na chakula cha Satvik
• Siku 10: Kipindi cha mpito cha Sushumna na kungojea kwa amani
• Siku 11-12: Sayansi ya kuzuia magonjwa na afya ya viungo
• Siku 13: Kugusa ardhi asubuhi na kupima mtiririko wa Swara
• Siku 14: Maamuzi sahihi ya maisha katika Ida na Pingala
• Siku 15: Mbinu 5 rahisi za kubadili Swara unavyotaka
• Siku 16: Kuachilia chuki na kusafisha akili`;
  }

  // 38. PERSIAN (فارسی) RESOLUTION
  if (normalizedLang === 'fa') {
    return `🕉️ سوار یوگا - پیکره دانش اصیل (پیکره جامع فارسی)
===========================================================
راهنمای معنوی: استاد موهان کالبورگی (Mohan Kalburgi Sir)
زبان: فارسی (Persian Master Teaching Corpus)
واژگان مقدس ودایی: کاملاً دست‌نخورده و کلمه به کلمه محفوظ است

【بخش ۱】 واژگان مقدس ودایی:
• سوار یوگا (Swar Yoga / علم کهن ودایی شناخت ریتم‌های تنفس و جریان حیات)
• ایدا نادی / چاندرا سوارا (سوراخ چپ بینی، انرژی ماه، خنکی، آرامش و گوارش آب)
• پینگالا نادی / سوریا سوارا (سوراخ راست بینی، انرژی خورشید، گرما، هضم غذا و تحرک)
• سوشومنا نادی (جریان متوازن در هر دو سوراخ بینی، وضعیت مراقبه عمیق و یکی شدن)

【بخش ۲】 برنامه جامع ۱۶ روزه کارگاه:
• روز ۱: قوانین غذا خوردن و نوشیدن آب (غذا در سوریا، آب در چاندرا)
• روز ۲: آب‌درمانی، رفع نفخ و علوم خواب عمیق
• روز ۳: اوم پرانایاما و هماهنگ‌سازی ۷ چاکرا
• روز ۴: مراقبه عمیق و فعال‌سازی سوشومنا
• روز ۵: تمرین تنفسی آجاپا-جاپ ('سو-هام')
• روز ۶-۹: رژیم غذایی عناصر پنج‌گانه و تغذیه ساتویک
• روز ۱۰: دوران گذر سوشومنا و انتظار آگاهانه
• روز ۱۱-۱۲: دانش پیشگیری و سلامت اندام‌های درونی
• روز ۱۳: لمس زمین در سحرگاه و بررسی جریان سوارا
• روز ۱۴: تصمیم‌گیری‌های عملی زندگی در ایدا در برابر پینگالا
• روز ۱۵: ۵ روش کاربردی برای تغییر ارادی سوارا
• روز ۱۶: رهایی از کینه و پاکسازی ذهن و روان`;
  }

  // 39. SLOVAK (Slovenčina) RESOLUTION
  if (normalizedLang === 'sk') {
    return `🕉️ Svar Joga - Majstrovský Korpus Poznania (Slovenčina)
===========================================================
Duchovný sprievodca: Mohan Kalburgi Sir
Jazyk: Slovenčina (Slovak Master Teaching Corpus)
Posvätné védske výrazy: Dôsledne zachované doslovne

【1. ČASŤ】 Posvätné Védske Výrazy:
• Svar Joga (Swar Yoga) - Dávna védska veda o prirodzených rytmoch dychu
• Ida Nádí / Čandra Svara - Ľavá nosná dierka, mesačná energia, chlad, pokoj a vstrebávanie vody
• Pingala Nádí / Súrja Svara - Pravá nosná dierka, slnečná energia, teplo, trávenie a vitalita
• Sušumna Nádí - Vyrovnaný prúd v oboch dierkach, stav hlbokej meditácie

【2. ČASŤ】 Úplný 16-dňový Študijný Plán:
• Deň 1: Pravidlá jedenia a pitia (jesť v Súrji, piť v Čandre)
• Deň 2: Vodná terapia, trávenie a veda o spánku
• Deň 3: Óm Pránájáma a harmonizácia 7 čakier
• Deň 4: Hlboká meditácia a aktivácia Sušumny
• Deň 5: Dychová sádhana Adžapa-Džap ('So-Ham')
• Deň 6-9: Strava podľa 5 Prvkov a sátvická výživa
• Deň 10: Prechod v Sušumne a vedomé čakanie
• Deň 11-12: Preventívna starostlivosť o zdravie orgánov
• Deň 13: Ranný dotyk zeme a diagnostika dychu
• Deň 14: Praktické životné rozhodnutia v Ide a Pingale
• Deň 15: 5 praktických metód vedomej zmeny dychu
• Deň 16: Oslobodenie od hnevu a očista mysle`;
  }

  // 40. BULGARIAN (Български) RESOLUTION
  if (normalizedLang === 'bg') {
    return `🕉️ Свар Йога - Главен Корпус на Знанието (Български)
===========================================================
Духовен водач: Мохан Калбурги (Mohan Kalburgi Sir)
Език: Български (Bulgarian Master Teaching Corpus)
Свещени ведически термини: Строго запазени буквално

【РАЗДЕЛ 1】 Свещени Ведически Термини:
• Свар Йога (Swar Yoga / древната наука за ритмите на дишането)
• Ида Нади / Чандра Свара (лява ноздра, лунна енергия, прохлада, спокойствие и усвояване на вода)
• Пингала Нади / Сурия Свара (дясна ноздра, слънчева енергия, топлина, храносмилане и активност)
• Сушумна Нади (балансиран поток в двете ноздри, състояние на дълбока медитация)

【РАЗДЕЛ 2】 Пълна 16-дневна Учебна Програма:
• Ден 1: Правила за хранене и прием на вода (храна при Сурия, вода при Чандра)
• Ден 2: Водна терапия, храносмилане и наука за съня
• Ден 3: Ом Пранаяма и хармонизиране на 7-те Чакри
• Ден 4: Дълбока медитация и събуждане на Сушумна
• Ден 5: Дихателна садхана Аджапа-Джапа ('Со-Хам')
• Ден 6-9: Хранене според 5-те Елемента и Сатвична диета
• Ден 10: Преходен период на Сушумна и осъзнато чакане
• Ден 11-12: Превантивно здраве на вътрешните органи
• Ден 13: Сутрешно заземяване и проверка на Свара
• Ден 14: Практически житейски решения в Ида и Пингала
• Ден 15: 5 лесни метода за съзнателна смяна на Свара
• Ден 16: Освобождаване от обиди и пречистване на ума`;
  }

  // 41. CROATIAN (Hrvatski) RESOLUTION
  if (normalizedLang === 'hr') {
    return `🕉️ Swar Joga - Glavni Korpus Znanja (Hrvatski)
===========================================================
Duhovni vodič: Mohan Kalburgi Sir
Jezik: Hrvatski (Croatian Master Teaching Corpus)
Sveti vedski pojmovi: Strogo sačuvani doslovno

【1. DIO】 Sveti Vedski Pojmovi:
• Swar Joga (Swar Yoga) - Drevna vedska znanost o prirodnim ritmovima daha
• Ida Nadi / Chandra Swara - Lijeva nosnica, mjesečeva energija, hladnoća, mir i probava vode
• Pingala Nadi / Surya Swara - Desna nosnica, sunčeva energija, toplina, probava hrane i djelovanje
• Sushumna Nadi - Uravnotežen protok u obje nosnice, stanje duboke meditacije

【2. DIO】 Potpuni 16-dnevni Nastavni Plan:
• Dan 1: Pravila prehrane i pijenja vode (jesti u Suryi, piti u Chandri)
• Dan 2: Terapija vodom, probava i znanost o snu
• Dan 3: Om Pranayama i usklađivanje 7 Čakri
• Dan 4: Duboka meditacija i aktivacija Sushumne
• Dan 5: Ajapa-Jap ('So-Hum') sadhana disanja
• Dan 6-9: Prehrana prema 5 Elemenata i Satvična dijeta
• Dan 10: Prijelaz u Sushumni i strpljivo čekanje
• Dan 11-12: Preventivno zdravlje unutarnjih organa
• Dan 13: Jutarnji dodir zemlje i provjera Sware
• Dan 14: Praktične životne odluke u Idi i Pingali
• Dan 15: 5 metoda za svjesnu promjenu Sware po želji
• Dan 16: Oslobađanje od zamjeranja i pročišćenje uma`;
  }

  // 42. SERBIAN (Српски) RESOLUTION
  if (normalizedLang === 'sr') {
    return `🕉️ Свар Јога - Главни Корпус Знања (Српски)
===========================================================
Духовни водич: Мохан Калбурги (Mohan Kalburgi Sir)
Језик: Српски (Serbian Master Teaching Corpus)
Свети ведски појмови: Строго сачувани дословно

【1. ДЕО】 Свети Ведски Појмови:
• Свар Јога (Swar Yoga) - Древна ведска наука о природним ритмовима даха
• Ида Нади / Чандра Свара - Лева ноздрва, месечева енергија, хлађење, мир и асимилација воде
• Пингала Нади / Сурија Свара - Десна ноздрва, сунчева енергија, топлота, варење хране и акција
• Сушумна Нади - Уравнотежен проток у обе ноздрве, стање дубоке медитације

【2. ДЕО】 Комплетан 16-дневни Наставни План:
• Дан 1: Правила исхране и пијења воде (јести у Сурији, пити у Чандри)
• Дан 2: Терапија водом, варење и наука о спавању
• Дан 3: Ом Пранајама и усклађивање 7 Чакри
• Дан 4: Дубока медитација и активирање Сушумне
• Дан 5: Ађапа-Ђап ('Со-Хам') садхана дисања
• Дан 6-9: Исхрана према 5 Елемената и Сатвична дијета
• Дан 10: Прелаз Сушумне и свесно чекање
• Дан 11-12: Превентивно здравље унутрашњих органа
• Дан 13: Јутарње уземљење и провера Сваре
• Дан 14: Практичне животне одлуке у Иди и Пингали
• Дан 15: 5 практичних начина да промените Свару по својој вољи
• Дан 16: Ослобађање од љутње и прочишћење свести`;
  }

  // 43. BURMESE (မြန်မာဘာသာ) RESOLUTION
  if (normalizedLang === 'my') {
    return `🕉️ ဆွာယောဂ - မဟာအသိပညာသိုက် (မြန်မာဘာသာ)
===========================================================
ဆရာသခင်: Mohan Kalburgi Sir
ဘာသာစကား: မြန်မာ (Burmese Master Teaching Corpus)
မြင့်မြတ်သော ဝေဒဝေါဟာရများ: မူရင်းအတိုင်း အတိအကျ ထိန်းသိမ်းထားပါသည်

【အပိုင်း ၁】 အဓိက မြင့်မြတ်သော ဝေါဟာရများ:
• Swar Yoga (स्वर योग) - အသက်ရှူခြင်း၏ သဘာဝစည်းချက်များကို လေ့လာသော ရှေးဟောင်းဝေဒပညာ
• Ida Nadi / Chandra Swara - ဘယ်ဘက်နှာခေါင်းပေါက်၊ လစွမ်းအင်၊ အေးချမ်းခြင်း၊ ရေသောက်ရန်သင့်တော်သောအချိန်
• Pingala Nadi / Surya Swara - ညာဘက်နှာခေါင်းပေါက်၊ နေစွမ်းအင်၊ အပူ၊ အစာခြေဖျက်ခြင်းနှင့် လုပ်ဆောင်မှု
• Sushumna Nadi - နှာခေါင်းပေါက်နှစ်ဖက် ညီမျှစွာ စီးဆင်းသော နက်နဲသော တရားထိုင်ခြင်းအခြေအနေ

【အပိုင်း ၂】 ၁၆ ရက်တာ သင်ရိုးညွှန်းတမ်း အကျဉ်း:
• နေ့ ၁: အစားအသောက်နှင့် ရေသောက်ခြင်းဆိုင်ရာ စည်းမျဉ်းများ (Surya တွင် စားပါ၊ Chandra တွင် သောက်ပါ)
• နေ့ ၂: ရေကုထုံး၊ အစာခြေစနစ်နှင့် အိပ်စက်ခြင်းသိပ္ပံ
• နေ့ ၃: Om Pranayama နှင့် စကြာ ၇ ပါး ချိန်ညှိခြင်း
• နေ့ ၄: နက်ရှိုင်းသော တရားထိုင်ခြင်းနှင့် Sushumna ဖွင့်ခြင်း
• နေ့ ၅: Ajapa-Jap ('So-Hum') အသက်ရှူကျင့်စဉ်
• နေ့ ၆-၉: ဓာတ်ကြီး ၅ ပါး အစားအသောက်နှင့် Satvik အာဟာရ
• နေ့ ၁၀: Sushumna ကူးပြောင်းချိန်နှင့် စောင့်ဆိုင်းခြင်း
• နေ့ ၁၁-၁၂: ရောဂါကြိုတင်ကာကွယ်ရေးနှင့် ကိုယ်တွင်းအင်္ဂါကျန်းမာရေး
• နေ့ ၁၃: နံနက်ခင်း မြေကြီးထိတွေ့မှုနှင့် Swara စစ်ဆေးခြင်း
• နေ့ ၁၄: Ida နှင့် Pingala အပေါ်အခြေခံသော ဘဝဆုံးဖြတ်ချက်များ
• နေ့ ၁၅: မိမိဆန္ဒအတိုင်း Swara ပြောင်းလဲရန် နည်းလမ်း ၅ သွယ်
• နေ့ ၁၆: အာဃာတကင်းစင်ခြင်းနှင့် စိတ်ကို စင်ကြယ်စေခြင်း`;
  }

  // 44. KHMER (ភាសាខ្មែរ) RESOLUTION
  if (normalizedLang === 'km') {
    return `🕉️ ស្វាយោគៈ - បណ្ណាល័យចំណេះដឹងកំពូល (ភាសាខ្មែរ)
===========================================================
គ្រូណែនាំ: Mohan Kalburgi Sir
ភាសា: ភាសាខ្មែរ (Khmer Master Teaching Corpus)
ពាក្យវេទដ៏វិសុទ្ធ: ត្រូវបានរក្សាទុកយ៉ាងត្រឹមត្រូវតាមទម្រង់ដើម

【ផ្នែកទី ១】 ពាក្យវេទដ៏វិសុទ្ធ:
• Swar Yoga (स्वर योग) - វិទ្យាសាស្ត្រវេទបុរាណនៃចង្វាក់ដង្ហើមជីវិត
• Ida Nadi / Chandra Swara - រន្ធច្រមុះខាងឆ្វេង, ថាមពលព្រះច័ន្ទ, ភាពត្រជាក់, ភាពស្ងប់ និងការទទួលទានទឹក
• Pingala Nadi / Surya Swara - រន្ធច្រមុះខាងស្តាំ, ថាមពលព្រះអាទិត្យ, កម្ដៅ, ការរំលាយអាហារ និងសកម្មភាព
• Sushumna Nadi - លំហូរស្មើគ្នានៃរន្ធច្រមុះទាំងពីរ, ស្ថានភាពសមាធិជ្រាលជ្រៅ

【ផ្នែកទី ២】 កម្មវិធីសិក្សាពេញលេញ ១៦ ថ្ងៃ:
• ថ្ងៃទី ១: វិធាននៃការបរិភោគ និងការទទួលទានទឹក (ញ៉ាំក្នុង Surya, ផឹកក្នុង Chandra)
• ថ្ងៃទី ២: វារីព្យាបាល, ការរំលាយអាហារ និងវិទ្យាសាស្ត្រនៃការគេង
• ថ្ងៃទី ៣: Om Pranayama និងការតម្រឹមចក្រាទាំង ៧
• ថ្ងៃទី ៤: សមាធិជ្រាលជ្រៅ និងការបើក Sushumna
• ថ្ងៃទី ៥: ការបដិបត្តិដង្ហើម Ajapa-Jap ('So-Hum')
• ថ្ងៃទី ៦-៩: របបអាហារធាតុទាំង ៥ និងអាហារ Satvik
• ថ្ងៃទី ១០: ដំណាក់កាលផ្លាស់ប្តូរនៃ Sushumna និងការរង់ចាំដោយស្ងប់
• ថ្ងៃទី ១១-១២: វិទ្យាសាស្ត្រការពារជំងឺ និងសុខភាពសរីរាង្គ
• ថ្ងៃទី ១៣: ការប៉ះដីពេលព្រឹក និងការពិនិត្យមើល Swara
• ថ្ងៃទី ១៤: ការសម្រេចចិត្តជាក់ស្តែងក្នុងជីវិតរវាង Ida និង Pingala
• ថ្ងៃទី ១៥: វិធីសាស្ត្រ ៥ យ៉ាងក្នុងការប្តូរ Swara តាមចិត្តចង់
• ថ្ងៃទី ១៦: ការរួចផុតពីការស្អប់ខ្ពើម និងការលាងសម្អាតចិត្ត`;
  }

  // 45. SINHALA (සිංහල) RESOLUTION
  if (normalizedLang === 'si') {
    return `🕉️ ස්වර් යෝග - ප්‍රධාන දැනුම් සම්භාරය (සිංහල)
===========================================================
ගුරු උපදේශක: Mohan Kalburgi Sir
භාෂාව: සිංහල (Sinhala Master Teaching Corpus)
පූජනීය වෛදික වචන: මුල් ස්වරූපයෙන්ම නොවෙනස්ව තබා ඇත

【1 වන කොටස】 පූජනීය වෛදික පාරිභාෂික වචන:
• Swar Yoga (ස්වර් යෝග) - හුස්ම ගැනීමේ රිද්මය පිළිබඳ පුරාණ වෛදික විද්‍යාව
• Ida Nadi / Chandra Swara - වම් නාස්පුඩුව, චන්ද්‍ර ශක්තිය, සිසිලස, මානසික සුවය සහ ජලය ජීර්ණය
• Pingala Nadi / Surya Swara - දකුණු නාස්පුඩුව, සූර්ය ශක්තිය, උණුසුම, ආහාර ජීර්ණය සහ ක්‍රියාශීලී බව
• Sushumna Nadi - නාස්පුඩු දෙකෙහිම සමබර හුස්ම ගලායාම, ගැඹුරු භාවනා තත්ත්වය

【2 වන කොටස】 දින 16 ක සම්පූර්ණ විෂය මාලාව:
• 1 වන දිනය: ආහාර සහ ජලය ගැනීමේ නීති (Surya දී ආහාර ගැනීම, Chandra දී ජලය පානය)
• 2 වන දිනය: ජල චිකිත්සාව, ආහාර ජීර්ණය සහ සුවදායී නින්ද
• 3 වන දිනය: Om Pranayama සහ චක්‍ර 7 සමබර කිරීම
• 4 වන දිනය: ගැඹුරු භාවනාව සහ Sushumna සක්‍රීය කිරීම
• 5 වන දිනය: Ajapa-Jap ('So-Hum') හුස්ම ගැනීමේ සාධනය
• 6-9 දින: පංච මහා භූත ආහාර රටාව සහ Satvik පෝෂණය
• 10 වන දිනය: Sushumna සංක්‍රාන්තිය සහ බලා සිටීමේ සාධනය
• 11-12 දින: අවයව සෞඛ්‍යය ආරක්ෂා කිරීමේ වැළැක්වීමේ විද්‍යාව
• 13 වන දිනය: උදෑසන පොළොව ස්පර්ශය සහ Swara පරීක්ෂාව
• 14 වන දිනය: Ida සහ Pingala තුළ ප්‍රායෝගික ජීවිත තීරණ
• 15 වන දිනය: කැමැත්ත පරිදි Swara මාරු කිරීමේ ප්‍රායෝගික ක්‍රම 5
• 16 වන දිනය: වෛරයෙන් මිදීම සහ මනස පිරිසිදු කිරීම`;
  }

  // 46. LITHUANIAN (Lietuvių) RESOLUTION
  if (normalizedLang === 'lt') {
    return `🕉️ Svar Joga - Meistro Žinių Korpusas (Lietuvių k.)
===========================================================
Dvasinis Mokytojas: Mohan Kalburgi Sir
Kalba: Lietuvių (Lithuanian Master Teaching Corpus)
Šventieji vediniai terminai: Išlaikyti pažodžiui ir tiksliai

【1 DALIS】 Šventieji Vediniai Terminai:
• Svar Joga (Swar Yoga) - Senovinis vedinis mokslas apie kvėpavimo ciklų ritmus
• Ida Nadi / Čandra Svara - Kairioji šnervė, mėnulio energija, vėsa, ramybė ir vandens virškinimas
• Pingala Nadi / Sūrja Svara - Dešinioji šnervė, saulės energija, šiluma, gyvybingumas ir maisto virškinimas
• Sušumna Nadi - Subalansuotas kvėpavimas per abi šnerves, gilios meditacijos būsena

【2 DALIS】 16 Dienų Pilna Mokymo Programa:
• 1 diena: Maisto ir vandens vartojimo dėsniai (valgyti Sūrjoje, gerti Čandroje)
• 2 diena: Vandens terapija, virškinimas ir miego mokslas
• 3 diena: Om Prānāyāma ir 7 čakrų harmonizavimas
• 4 diena: Gilus medytavimas ir Sušumnos aktyvavimas
• 5 diena: Ajapa-Jap ('So-Hum') kvėpavimo sadhana
• 6-9 dienos: 5 Elementų dieta ir satvinė mityba
• 10 diena: Sušumnos perėjimas ir kantrus laukimas
• 11-12 dienos: Profilaktinė organų sveikatos priežiūra
• 13 diena: Rytinis žemės palietimas ir Svaros patikra
• 14 diena: Praktiniai gyvenimo sprendimai Idoje ir Pingaloje
• 15 diena: 5 praktiniai būdai sąmoningai pakeisti Svarą
• 16 diena: Išsilaisvinimas iš pykčio ir proto apvalymas`;
  }

  // 47. SLOVENIAN (Slovenščina) RESOLUTION
  if (normalizedLang === 'sl') {
    return `🕉️ Swar Joga - Glavni Korpus Znanja (Slovenščina)
===========================================================
Duhovni učitelj: Mohan Kalburgi Sir
Jezik: Slovenščina (Slovenian Master Teaching Corpus)
Sveti vedski izrazi: Strogo ohranjeni dobesedno

【1. DEL】 Sveti Vedski Izrazi:
• Swar Joga (Swar Yoga) - Starodavna vedska veda o naravnih ritmih dihanja
• Ida Nadi / Chandra Swara - Leva nosnica, lunarna energija, hlad, mir in presnova vode
• Pingala Nadi / Surya Swara - Desna nosnica, sončna energija, toplota, prebava hrane in dejavnost
• Sushumna Nadi - Uravnotežen pretok skozi obe nosnici, stanje globoke meditacije

【2. DEL】 Celoten 16-dnevni Učni Načrt:
• 1. dan: Pravila prehranjevanja in pitja vode (jesti v Suryi, piti v Chandri)
• 2. dan: Vodna terapija, prebava in znanost o spanju
• 3. dan: Om Pranayama in uskladitev 7 Čaker
• 4. dan: Globoka meditacija in prebujenje Sushumne
• 5. dan: Ajapa-Jap ('So-Hum') dihalna sadhana
• 6-9. dan: Prehrana glede na 5 Elementov in Satvična dieta
• 10. dan: Prehod v Sushumni in zavestno čakanje
• 11-12. dan: Preventivno zdravje notranjih organov
• 13. dan: Jutranja ozemljitev in preverjanje Sware
• 14. dan: Praktične življenjske odločitve v Idi in Pingali
• 15. dan: 5 načinov za zavestno menjavo Sware po lastni želji
• 16. dan: Osvoboditev od zamer in prečiščenje uma`;
  }

  // 48. BENGALI (বাংলা) RESOLUTION
  if (normalizedLang === 'bn') {
    return `🕉️ স্বর যোগ মাস্টার জ্ঞান ভাণ্ডার (Bengali Master Corpus)
===========================================================
মার্গદર્শক: শ্রী মোহন কালবুর্গী (Mohan Kalburgi Sir)
ভাষা: বাংলা (Bengali Master Teaching Corpus)
পবিত্র বৈদিক পরিভাষা: হুবহু এবং অবিকৃত সংরক্ষিত

【পর্ব ১】 পবিত্র বৈদিক পরিভাষা:
• স্বর যোগ (Swar Yoga) - শ্বাস-প্রশ্বাসের মাধ্যমে জীবনযাত্রার প্রাচীন বিজ্ঞান
• ইড়া নাড়ী / চন্দ্র স্বর (Ida Nadi / Chandra Swara) - বাম নাসারন্ধ্র, শীতলতা, মানসিক প্রশান্তি, জল গ্রহণ
• পিঙ্গলা নাড়ী / সূর্য স্বর (Pingala Nadi / Surya Swara) - ডান নাসারন্ধ্র, উষ্ণতা, শক্তি, খাদ্য হজম ও কর্মতৎপরতা
• সুষুম্না নাড়ী (Sushumna Nadi) - উভয় নাসারন্ধ্রে সমভাবে শ্বাসপ্রবাহ, গভীর ধ্যান ও আত্মানুভূতির অবস্থা

【পর্ব ২】 ১৬ দিনের সম্পূর্ণ পাঠ্যক্রম:
• দিন ১: আহার ও জল গ্রহণের নিয়ম (সূর্য স্বরে ভোজন, চন্দ্র স্বরে জলপান)
• দিন ২: জল চিকিৎসা, গ্যাস মুক্তি ও গভীর নিদ্রা বিজ্ঞান
• দিন ৩: ওঁ প্রাণায়াম ও ৭ চক্রের ভারসাম্য
• দিন ৪: সুষুম্না ধ্যান ও অন্তরের প্রশান্তি
• দিন ৫: অজপা-জপ 'সো-হং' শ্বাস সাধনা
• দিন ৬-৯: পঞ্চতত্ত্ব আহার ও সাত্ত্বিক খাদ্যরীতি
• দিন ১০: সুষুম্না সন্ধিক্ষণ ও অপেক্ষা সাধনা
• দিন ১১-১২: প্রতিরোধক স্বাস্থ্যবিজ্ঞান ও অঙ্গপ্রত্যঙ্গের সুরক্ষা
• দিন ১৩: প্রাতঃকালে ভূমি স্পর্শ ও দৈনিক স্বর পরীক্ষা
• দিন ১৪: ইড়া ও পিঙ্গলার ভিত্তিতে জীবনের বাস্তব সিদ্ধান্ত
• দিন ১৫: ইচ্ছানুযায়ী স্বর পরিবর্তন করার ৫টি ব্যবহারিক পদ্ধতি
• দিন ১৬: বিদ্বেষ মুক্তি, ক্ষমাভাব ও চিত্তশুদ্ধি`;
  }

  // 49. PUNJABI (ਪੰਜਾਬੀ) RESOLUTION
  if (normalizedLang === 'pa') {
    return `🕉️ ਸਵਰ ਯੋਗ ਮਾਸਟਰ ਗਿਆਨ ਭੰਡਾਰ (Punjabi Master Corpus)
===========================================================
ਮਾਰਗਦਰਸ਼ਕ: ਸ਼੍ਰੀ ਮੋਹਨ ਕਾਲਬੁਰਗੀ (Mohan Kalburgi Sir)
ਭਾਸ਼ਾ: ਪੰਜਾਬੀ (Punjabi Master Teaching Corpus)
ਪਵਿੱਤਰ ਵੈਦਿਕ ਸ਼ਬਦਾਵਲੀ: ਪੂਰੀ ਤਰ੍ਹਾਂ ਮੂਲ ਰੂਪ ਵਿੱਚ ਸੁਰੱਖਿਅਤ

【ਭਾਗ ੧】 ਪਵਿੱਤਰ ਵੈਦਿਕ ਸ਼ਬਦਾਵਲੀ:
• ਸਵਰ ਯੋਗ (Swar Yoga) - ਸਾਹ ਦੀ ਲੈਅ ਦਾ ਪ੍ਰਾਚੀਨ ਵਿਗਿਆਨ
• ਇੜਾ ਨਾੜੀ / ਚੰਦਰ ਸਵਰ (Ida Nadi / Chandra Swara) - ਖੱਬੀ ਨਾਸ, ਸ਼ਾਂਤੀ, ਠੰਢਕ, ਪਾਣੀ ਪੀਣਾ
• ਪਿੰਗਲਾ ਨਾੜੀ / ਸੂਰਜ ਸਵਰ (Pingala Nadi / Surya Swara) - ਸੱਜੀ ਨਾਸ, ਗਰਮੀ, ਊਰਜਾ, ਭੋਜਨ ਹਜ਼ਮ ਕਰਨਾ
• ਸੁਸ਼ੁਮਨਾ ਨਾੜੀ (Sushumna Nadi) - ਦੋਵਾਂ ਨਾਸਾਂ ਵਿੱਚ ਸਮਾਨ ਸਾਹ, ਡੂੰਘਾ ਧਿਆਨ

【ਭਾਗ ੨】 ੧੬ ਦਿਨਾਂ ਦਾ ਮੁਕੰਮਲ ਪਾਠਕ੍ਰਮ:
• ਦਿਨ ੧: ਭੋਜਨ ਅਤੇ ਪਾਣੀ ਦੇ ਨਿਯਮ (ਸੂਰਜ ਸਵਰ ਵਿੱਚ ਭੋਜਨ, ਚੰਦਰ ਵਿੱਚ ਪਾਣੀ)
• ਦਿਨ ੨: ਜਲ ਚਿਕਿਤਸਾ, ਗੈਸ ਨਿਵਾਰਣ ਅਤੇ ਗੂੜ੍ਹੀ ਨੀਂਦ
• ਦਿਨ ੩: ਓਂਕਾਰ ਪ੍ਰਾਣਾਯਾਮ ਅਤੇ ੭ ਚੱਕਰਾਂ ਦੀ ਜਾਗ੍ਰਿਤੀ
• ਦਿਨ ੪: ਸੁਸ਼ੁਮਨਾ ਧਿਆਨ ਅਤੇ ਅੰਦਰੂਨੀ ਸ਼ਾਂਤੀ
• ਦਿਨ ੫: ਅਜਪਾ-ਜਪ 'ਸੋ-ਹੰ' ਸਾਧਨਾ
• ਦਿਨ ੬-੯: ਪੰਚਤੱਤਵ ਖੁਰਾਕ ਅਤੇ ਸਾਤਵਿਕ ਭੋਜਨ
• ਦਿਨ ੧੦: ਸੁਸ਼ੁਮਨਾ ਪਰਿਵਰਤਨ ਅਤੇ ਸਬਰ ਸਾਧਨਾ
• ਦਿਨ ੧੧-੧੨: ਰੋਗ ਰੋਕਥਾਮ ਵਿਗਿਆਨ ਅਤੇ ਅੰਗਾਂ ਦੀ ਸਿਹਤ
• ਦਿਨ ੧੩: ਸਵੇਰੇ ਧਰਤੀ ਨੂੰ ਪ੍ਰਣਾਮ ਅਤੇ ਸਵਰ ਦੀ ਜਾਂਚ
• ਦਿਨ ੧੪: ਇੜਾ ਅਤੇ ਪਿੰਗਲਾ ਅਨੁਸਾਰ ਜੀਵਨ ਦੇ ਫੈਸਲੇ
• ਦਿਨ ੧੫: ਆਪਣੀ ਮਰਜ਼ੀ ਨਾਲ ਸਵਰ ਬਦਲਣ ਦੇ ੫ ਤਰੀਕੇ
• ਦਿਨ ੧੬: ਵੈਰ-ਵਿਰੋਧ ਤੋਂ ਮੁਕਤੀ ਅਤੇ ਮਨ ਦੀ ਸ਼ੁੱਧੀ`;
  }

  // 50. ODIA (ଓଡ଼ିଆ) RESOLUTION
  if (normalizedLang === 'or') {
    return `🕉️ ସ୍ୱର ଯୋଗ ମାଷ୍ଟର ଜ୍ଞାନ ଭଣ୍ଡାର (Odia Master Corpus)
===========================================================
ମାର୍ଗଦର୍ଶକ: ଶ୍ରୀ ମୋହନ କାଲବୁର୍ଗୀ (Mohan Kalburgi Sir)
ଭାଷା: ଓଡ଼ିଆ (Odia Master Teaching Corpus)
ପବିତ୍ର ବୈଦିକ ପରିଭାଷା: ସମ୍ପୂର୍ଣ୍ଣ ଅକ୍ଷୁର୍ଣ୍ଣ ଓ ସୁରକ୍ଷିତ

【ଭାଗ ୧】 ପବିତ୍ର ବୈଦିକ ଶବ୍ଦାବଳୀ:
• ସ୍ୱର ଯୋଗ (Swar Yoga) - ନିଶ୍ୱାସ ପ୍ରଶ୍ୱାସର ପ୍ରାଚୀନ ବିଜ୍ଞାନ
• ଇଡ଼ା ନାଡ଼ୀ / ଚନ୍ଦ୍ର ସ୍ୱର (Ida Nadi / Chandra Swara) - ବାମ ନାକପୁଡ଼ା, ଶୀତଳତା, ଶାନ୍ତି, ଜଳ ଗ୍ରହଣ
• ପିଙ୍ଗଳା ନାଡ଼ୀ / ସୂର୍ଯ୍ୟ ସ୍ୱର (Pingala Nadi / Surya Swara) - ଡାହାଣ ନାକପୁଡ଼ା, ଉଷ୍ମତା, ଉର୍ଜ୍ଜା, ଖାଦ୍ୟ ହଜମ
• ସୁଷୁମ୍ନା ନାଡ଼ୀ (Sushumna Nadi) - ଉଭୟ ନାକପୁଡ଼ାରେ ସମାନ ପ୍ରବାହ, ଗଭୀର ଧ୍ୟାନ

【ଭାଗ ୨】 ୧୬ ଦିନର ସମ୍ପୂର୍ଣ୍ଣ ପାଠ୍ୟକ୍ରମ:
• ଦିନ ୧: ଭୋଜନ ଓ ଜଳ ନିୟମ (ସୂର୍ଯ୍ୟ ସ୍ୱରରେ ଭୋଜନ, ଚନ୍ଦ୍ରରେ ଜଳପାନ)
• ଦିନ ୨: ଜଳ ଚିକିତ୍ସା, ଗ୍ୟାସ ମୁକ୍ତି ଓ ଗଭୀର ନିଦ୍ରା
• ଦିନ ୩: ଓଁ ପ୍ରାଣାୟାମ ଓ ୭ ଚକ୍ର ଜାଗରଣ
• ଦିନ ୪: ସୁଷୁମ୍ନା ଧ୍ୟାନ ଓ ଆତ୍ମିକ ଶାନ୍ତି
• ଦିନ ୫: ଅଜପା-ଜପ 'ସୋ-ହଂ' ସାଧନା
• ଦିନ ୬-୯: ପଞ୍ଚତତ୍ତ୍ୱ ଆହାର ଓ ସାତ୍ତ୍ୱିକ ନିୟମ
• ଦିନ ୧୦: ସୁଷୁମ୍ନା ସନ୍ଧିକ୍ଷଣ ଓ ଧୈର୍ଯ୍ୟ ସାଧନା
• ଦିନ ୧୧-୧୨: ରୋଗ ନିବାରଣ ବିଜ୍ଞାନ ଓ ଅଙ୍ଗ ସ୍ୱାସ୍ଥ୍ୟ
• ଦିନ ୧୩: ପ୍ରାତଃକାଳ ଭୂମି ସ୍ପର୍ଶ ଓ ସ୍ୱର ପରୀକ୍ଷା
• ଦିନ ୧୪: ଇଡ଼ା ଓ ପିଙ୍ଗଳା ଅନୁସାରେ ନିଷ୍ପତ୍ତି
• ଦିନ ୧୫: ନିଜ ଇଚ୍ଛାରେ ସ୍ୱର ପରିବର୍ତ୍ତନ କରିବାର ୫ଟି ଉପାୟ
• ଦିନ ୧୬: ଦ୍ୱେଷ ମୁକ୍ତି ଓ ଚିତ୍ତଶୁଦ୍ଧି`;
  }

  // Fallback for any other custom code: return English master overview with strictly preserved Vedic terms
  return ENGLISH_MASTER_OVERVIEW;
}

/**
 * Strips all emotion, voice, pause, and avatar cues to return 100% pure plain text.
 * Ensures that in Plain Text stage, the user sees ONLY pure, clean plain text without any brackets or tags.
 */
export function stripToPurePlainText(rawText: string): string {
  if (!rawText) return '';
  return rawText
    // Remove all bracketed emotion, delivery, timing, gesture, and avatar cues
    .replace(/\[(?:CALM|EXPLAINING|EMPHASIS|PAUSE[^\]]*|HUMOROUS|SMILING|INSPIRATIONAL|SERIOUS|HAPPY|SAD|ANGRY|EXCITED|PEACEFUL|MOTIVATIONAL|COMPASSIONATE|CURIOUS|SURPRISED|CONCERNED|TEACHING_TONE|TEACHING TONE|QUESTIONING_TONE|QUESTIONING TONE|STORYTELLING|LAUGHING|LIGHT_HEARTED|SLOW|FAST|HIGH_INTENSITY|LOW_INTENSITY|WHISPERING|face:[^\]]+|gesture:[^\]]+|tag:[^\]]+|smile|big_smile|laugh|open_palms|pointing_finger|namaste|[a-z_]+:\d{1,3})\]/gi, '')
    // Also remove any stray bracketed timestamps (e.g. [00:15], [01:23:45]) so plain text is pure prose
    .replace(/\[\d{1,2}:\d{2}(?::\d{2})?\]/g, '')
    // Normalize spacing and consecutive blank lines
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n\s*\n+/g, '\n\n')
    .trim();
}

/**
 * Checks whether the text already contains emotion or hummer annotations.
 */
export function hasHummerAnnotations(text: string): boolean {
  if (!text) return false;
  return /\[(?:CALM|EXPLAINING|EMPHASIS|PAUSE|HUMOROUS|SMILING|INSPIRATIONAL|SERIOUS|face:|gesture:)/i.test(text);
}

/**
 * Generates an initial sample hummer annotated version of the plain text
 * for when audio extraction data has not yet arrived.
 */
export function generateDefaultHummerText(plainText: string, lang: string = 'mr'): string {
  const clean = stripToPurePlainText(plainText);
  if (!clean) return '';

  const paragraphs = clean.split(/\n\n+/);
  const annotatedParagraphs = paragraphs.map((para, idx) => {
    const trimmed = para.trim();
    if (!trimmed) return '';
    if (trimmed.startsWith('#') || trimmed.startsWith('=')) return trimmed;

    // Apply natural pedagogical delivery cues matching Mohan Sir's authentic teaching cadence
    if (idx === 0) {
      return `[CALM] [SMILING] ${trimmed}`;
    } else if (idx % 4 === 1) {
      return `[EXPLAINING] ${trimmed}`;
    } else if (idx % 4 === 2) {
      return `[EMPHASIS] ${trimmed}\n[PAUSE: 2 SECONDS]`;
    } else if (idx % 4 === 3) {
      return `[HUMOROUS] ${trimmed}`;
    } else {
      return `[INSPIRATIONAL] ${trimmed}`;
    }
  });

  return annotatedParagraphs.filter(Boolean).join('\n\n');
}


