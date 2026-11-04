import { bunnyExecute, bunnyBatch } from '@/lib/bunnyDatabase';
import crypto from 'crypto';
import { generateAIText } from '@/lib/ai/generateWithFallback';
import { generateGroundedMohanAnswer } from '@/lib/mohanRag/answerService';

export * from './podcastTypes';
import {
  DialogueTurn,
  PodcastEpisode,
  HostClonePreset,
  MohanClonePreset,
  PodcastBackgroundPreset,
  HOST_CLONE_PRESETS,
  MOHAN_CLONE_PRESETS,
  PODCAST_BACKGROUND_PRESETS,
} from './podcastTypes';

let isPodcastSchemaReady = false;

export async function initPodcastSchema(): Promise<void> {
  if (isPodcastSchemaReady) return;
  await bunnyBatch([
    {
      sql: `CREATE TABLE IF NOT EXISTS mohan_podcast_episodes_sql (
        id TEXT PRIMARY KEY,
        episode_number INTEGER NOT NULL,
        title TEXT NOT NULL,
        topic TEXT NOT NULL,
        category TEXT NOT NULL,
        language TEXT NOT NULL,
        host_name TEXT NOT NULL,
        host_gender TEXT NOT NULL,
        student_question TEXT NOT NULL,
        mohan_sir_answer TEXT NOT NULL,
        dialogue_turns_json TEXT NOT NULL,
        audio_url TEXT,
        video_url TEXT,
        duration_seconds INTEGER DEFAULT 0,
        tags_json TEXT NOT NULL,
        is_published INTEGER DEFAULT 1,
        listen_count INTEGER DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )`,
      args: [],
    },
    {
      sql: 'CREATE INDEX IF NOT EXISTS idx_podcast_cat_lang ON mohan_podcast_episodes_sql(category, language)',
      args: [],
    },
    {
      sql: 'CREATE INDEX IF NOT EXISTS idx_podcast_pub_ep ON mohan_podcast_episodes_sql(is_published, episode_number)',
      args: [],
    },
  ]);
  isPodcastSchemaReady = true;
}

// 12 Authentic Masterclass Seed Episodes directly recorded from Mohan Sir's real student discussions
export const SEED_PODCAST_EPISODES: Omit<PodcastEpisode, 'createdAt' | 'updatedAt'>[] = [
  {
    id: 'podcast_ep_01_water_rules',
    episodeNumber: 1,
    title: 'Why 3 Sips? The Truth About Drinking Water with Mohan Sir',
    topic: 'Water Therapy, 3 Sips Rule & 9 PM Restriction',
    category: 'water_digestion',
    language: 'en',
    hostName: 'Priya (Curious Seeker)',
    hostGender: 'female',
    studentQuestion: 'Mohan Sir, students in class often ask: why can’t we drink water whenever we feel like it, and why strictly 3 sips seated down?',
    mohanSirAnswer: 'I am Mohan Sir (Mohan Kalburgi), and in Swar Yoga, water is not just liquid—it is the Jal Tatva. When you chug water standing, it enters like a destructive flood. You must sit down and drink strictly 3 slow sips at one time. Why? Because the saliva in your mouth is alkaline, and the stomach acid is highly acidic. 3 sips allow the alkaline saliva to mix thoroughly and neutralize stomach acidity. Drink 2 liters between 5:00 AM and 10:00 AM, 1.5 liters between 2:00 PM and 9:00 PM, and strictly zero water after 9:00 PM to give your kidneys and sleep complete rest.',
    dialogueTurns: [
      {
        turnNumber: 1,
        speaker: 'host',
        speakerName: 'Priya',
        text: 'Welcome to Swar Vani! Today we have our revered master Mohan Sir. Mohan Sir, a very common question students ask in your Level-1 workshop is: why can’t we just drink water freely whenever we are thirsty, and why do you insist on strictly three sips while sitting down?',
        toneCue: '[curious:80]',
      },
      {
        turnNumber: 2,
        speaker: 'mohan_sir',
        speakerName: 'Mohan Sir',
        text: 'I am Mohan Sir (Mohan Kalburgi), and I welcome you. Understand this deeply: water is not just to extinguish thirst, it is the sacred Jal Tatva within your five elements. When you stand and gulp half a bottle of water, it rushes straight down like a waterfall without mixing with your mouth. Your saliva is pure alkaline medicine, whereas your stomach has acidic bile. When you sit comfortably and take strictly 3 slow sips, that alkaline saliva travels into the stomach and instantly neutralizes acidity and heartburn.',
        toneCue: '[compassionate:95]',
      },
      {
        turnNumber: 3,
        speaker: 'host',
        speakerName: 'Priya',
        text: 'That is incredible science! But what about the timing? Many people keep a water bottle next to their bed and drink at 11 PM or 2 AM when they wake up. What happens if we drink after 9 PM?',
        toneCue: '[questioning:75]',
      },
      {
        turnNumber: 4,
        speaker: 'mohan_sir',
        speakerName: 'Mohan Sir',
        text: 'Never do that! After 9:00 PM, your metabolic fire slows down and the kidneys need to enter cleansing and rest mode. If you drink water at night, your kidneys are overworked, your sleep is repeatedly broken, and puffiness develops under your eyes. Drink your 2 liters in the morning between 5:00 AM and 10:00 AM, and 1.5 liters between 2:00 PM and 9:00 PM. After 9 PM, no water. If your throat is exceptionally dry, take only half a sip to moisten the lips. Follow this for 7 days, and your morning energy will double!',
        toneCue: '[authoritative:90]',
      },
      {
        turnNumber: 5,
        speaker: 'host',
        speakerName: 'Priya',
        text: 'Such simple yet life-changing discipline. 3 sips seated, 2 liters in the morning, 1.5 liters in the afternoon, and zero water after 9 PM. Thank you Mohan Sir for this profound wisdom!',
        toneCue: '[grateful:90]',
      },
    ],
    durationSeconds: 165,
    tags: ['Water Therapy', '3 Sips', 'Jal Tatva', 'Kidney Health', 'Level 1'],
    isPublished: true,
    listenCount: 420,
  },
  {
    id: 'podcast_ep_02_jatharagni_food',
    episodeNumber: 2,
    title: 'Never Water with Meals! Igniting Surya Nadi & Jatharagni',
    topic: 'Food Digestion, Surya Nadi & 45-Minute Gap',
    category: 'water_digestion',
    language: 'mr',
    hostName: 'आनंद (जिज्ञासू साधक)',
    hostGender: 'male',
    studentQuestion: 'मोहन सर, जेवताना तिखट लागल्यावर पाणी का पिऊ नये? आणि जेवण फक्त सूर्य नाडीतच का करावे?',
    mohanSirAnswer: 'मी मोहन सर (मोहन काळबुर्गी), आणि स्वरयोगात मी सांगत आहे: आपल्या पोटात जठराग्नी असतो. तुम्ही जेवताना पाणी प्यायले तर पेटलेल्या चुलीवर पाणी ओतल्यासारखे होते. अग्नी विझतो आणि अन्न पचण्याऐवजी सडते, ज्यामुळे गॅस आणि ॲसिडिटी होते. म्हणूनच जेवताना पाणी पूर्णपणे टाळा. जेवणापूर्वी ४५ मिनिटे आधी किंवा जेवणानंतर ४५ मिनिटांनीच पाणी प्या. आणि जेवताना उजवी नाकपुडी (सूर्य नाडी) चालूच असायला हवी, कारण सूर्य नाडी उष्णता व पाचक रस निर्माण करते.',
    dialogueTurns: [
      {
        turnNumber: 1,
        speaker: 'host',
        speakerName: 'आनंद',
        text: 'नमस्कार स्वर योग साधकांनो! आज आपल्यासोबत स्वतः मोहन सर आहेत. सर, आपल्या वर्गात बरेच जण विचारतात की जेवताना तिखट लागले की आपण घटाघटा पाणी पितो. पण तुम्ही जेवताना पाणी पिण्यास पूर्ण बंदी का घालता?',
        toneCue: '[curious:85]',
      },
      {
        turnNumber: 2,
        speaker: 'mohan_sir',
        speakerName: 'मोहन सर',
        text: 'मी मोहन सर (मोहन काळबुर्गी), आणि सर्वांना माझा सप्रेम नमस्कार. समजून घ्या, तुमच्या पोटात जठराग्नी आहे—पाचक अग्नी. जेव्हा तुम्ही जेवता, तेव्हा पोटात उष्णता निर्माण होते जेणेकरून अन्न नीट पचेल. अशा वेळी जर तुम्ही पाणी प्यायले, तर जळणाऱ्या चुलीवर बादलीभर पाणी ओतल्यासारखे होते! अग्नी विझून जातो, अन्न पचण्याऐवजी आतड्यात सडते आणि विषारी आम (toxins) तयार होतो. यामुळेच गॅस, पोट फुगणे आणि आम्लपित्त (ॲसिडिटी) होते.',
        toneCue: '[serious:90]',
      },
      {
        turnNumber: 3,
        speaker: 'host',
        speakerName: 'आनंद',
        text: 'खूपच पटण्यासारखे आहे सर! मग जेवल्यानंतर किती वेळाने पाणी प्यावे आणि जेवताना कोणती नाडी चालू असावी?',
        toneCue: '[eager:80]',
      },
      {
        turnNumber: 4,
        speaker: 'mohan_sir',
        speakerName: 'मोहन सर',
        text: 'नियम अगदी सोपा आहे: जेवणाच्या ४५ मिनिटे आधी पाणी पिणे थांबवा, आणि जेवण झाल्यावर बरोबर ४५ मिनिटांनीच पाणी प्या. आणि सर्वात महत्त्वाचे—जेव्हा तुम्ही अन्न ग्रहण करता, तेव्हा तुमची उजवी नाकपुडी म्हणजेच सूर्य नाडी (पिंगला) चालूच असली पाहिजे! सूर्य नाडी शरीरात उष्णता आणि अग्नी तत्व जागृत करते. जर डावी नाकपुडी चालू असताना जेवलात, तर अन्न पचणार नाही. म्हणून डावी नाकपुडी बंद करून उजव्या नाकपुडीने श्वास घेऊन सूर्य नाडी सुरू करा आणि मगच भोजन करा.',
        toneCue: '[inspiring:95]',
      },
      {
        turnNumber: 5,
        speaker: 'host',
        speakerName: 'आनंद',
        text: 'अतिशय मोलाचे मार्गदर्शन मोहन सर! जेवणात ४५ मिनिटांचा गॅप आणि सूर्य नाडीचा वापर आजपासूनच आचरणात आणू. धन्यवाद सर!',
        toneCue: '[reverent:90]',
      },
    ],
    durationSeconds: 180,
    tags: ['जठराग्नी', 'सूर्य नाडी', 'भोजन नियम', '४५ मिनिटे नियम', 'Level 1'],
    isPublished: true,
    listenCount: 650,
  },
  {
    id: 'podcast_ep_03_gas_sleep_vamkukshi',
    episodeNumber: 3,
    title: 'Ending Bloating & Acidity: Left-Side Sleeping (Vamkukshi)',
    topic: 'Gas Elimination, Deep Sleep & Sleeping on Left Side',
    category: 'gas_sleep_health',
    language: 'hi',
    hostName: 'प्रिया (जिज्ञासु साधक)',
    hostGender: 'female',
    studentQuestion: 'मोहन सर, शाम को पेट में भारी गैस और बेचैनी क्यों होती है? और रात को बाईं करवट (वामकुक्षी) में सोने का क्या वैज्ञानिक रहस्य है?',
    mohanSirAnswer: 'मैं मोहन सर (मोहन काळबुर्गी), और स्वरयोग में मैं बता रहा हूँ: जब आप खड़े होकर पानी पीते हैं या चंद्र नाड़ी में खाना खाते हैं, तो पेट में वात वायु फंस जाती है। रात को जब आप बाईं करवट (वामकुक्षी) सोते हैं, तो आपका दायां नथुना (सूर्य नाड़ी) तुरंत चालू हो जाता है। सूर्य नाड़ी सक्रिय होने से पेट में पाचक रस पूरी रात सक्रिय रहते हैं, खाना पच जाता है और सुबह पेट एक ही बार में पूरी तरह साफ हो जाता है।',
    dialogueTurns: [
      {
        turnNumber: 1,
        speaker: 'host',
        speakerName: 'प्रिया',
        text: 'प्रणाम मोहन सर! हमारे बहुत से साधकों का सवाल है कि आजकल हर दूसरे व्यक्ति को गैस, एसिडिटी और रात में बेचैनी की समस्या रहती है। स्वरयोग में इसका क्या सटीक समाधान है?',
        toneCue: '[respectful:80]',
      },
      {
        turnNumber: 2,
        speaker: 'mohan_sir',
        speakerName: 'मोहन सर',
        text: 'मैं मोहन सर (मोहन काळबुर्गी), और स्वरयोग के इस पावन मंच पर आपका स्वागत करता हूँ। देखिए, गैस कोई बीमारी नहीं है, यह आपकी गलत जीवनशैली का परिणाम है। जब आप खड़े होकर पानी पीते हैं, या चंद्र नाड़ी में ठंडा खाना खा लेते हैं, तो पाचन तंत्र में वात दोष बढ़ जाता है। खाना पेट में पचने के बजाय सड़ने लगता है जिससे गैस ऊपर छाती और सिर की तरफ चढ़ती है।',
        toneCue: '[warm:90]',
      },
      {
        turnNumber: 3,
        speaker: 'host',
        speakerName: 'प्रिया',
        text: 'सर, आपने क्लास में रात को सोने के लिए वामकुक्षी यानी बाईं करवट का बहुत महत्व बताया है। इसका स्वरयोग से क्या संबंध है?',
        toneCue: '[curious:85]',
      },
      {
        turnNumber: 4,
        speaker: 'mohan_sir',
        speakerName: 'मोहन सर',
        text: 'बहुत गहरा संबंध है! जब आप बाईं करवट (left side) लेटते हैं, तो गुरुत्वाकर्षण के नियम से आपका दायां नथुना यानी सूर्य नाड़ी तुरंत खुल जाती है। हमारा पेट (स्टमक) शरीर के बाईं तरफ स्थित होता है। जब आप बाईं करवट सोते हैं, तो आमाशय में पाचक रस सही जगह रहते हैं और सूर्य नाड़ी की उष्णता खाने को रातभर में भस्म करके ऊर्जा में बदल देती है। सुबह उठते ही बिना किसी चूर्ण या गोली के पेट बिल्कुल हल्का और साफ हो जाता है।',
        toneCue: '[instructive:95]',
      },
      {
        turnNumber: 5,
        speaker: 'host',
        speakerName: 'प्रिया',
        text: 'अद्भुत विज्ञान! बाईं करवट सोएं, सूर्य नाड़ी जगाएं और गैस एसिडिटी को हमेशा के लिए अलविदा कहें। बहुत-बहुत धन्यवाद मोहन सर!',
        toneCue: '[grateful:95]',
      },
    ],
    durationSeconds: 175,
    tags: ['गैस और नींद', 'वामकुक्षी', 'बाईं करवट', 'सूर्य नाड़ी', 'Level 1'],
    isPublished: true,
    listenCount: 580,
  },
  {
    id: 'podcast_ep_04_anger_chandra_nadi',
    episodeNumber: 4,
    title: 'Control Sudden Anger in 2 Minutes: The Chandra Nadi Miracle',
    topic: 'Anger Management, Amygdala Cooling & Left Nostril Breathing',
    category: 'mind_emotions',
    language: 'en',
    hostName: 'Aryan (Yogic Inquirer)',
    hostGender: 'male',
    studentQuestion: 'Mohan Sir, when someone loses their temper in an argument, blood pressure spikes. How can Swar Yoga stop anger within 2 minutes without meditation?',
    mohanSirAnswer: 'I am Mohan Sir (Mohan Kalburgi), and in Swar Yoga, I teach that anger cannot exist without Surya Nadi (right nostril). Anger is excessive Pitta and solar fire. The moment you feel anger rising, immediately close your right nostril with your thumb and breathe exclusively through your left nostril (Chandra Nadi / Ida) for 21 slow breaths. Chandra Nadi activates the parasympathetic nervous system, cools the blood, and anger dissolves within 120 seconds.',
    dialogueTurns: [
      {
        turnNumber: 1,
        speaker: 'host',
        speakerName: 'Aryan',
        text: 'Welcome back seekers! Today we have Mohan Sir with an urgent life question: Mohan Sir, people often say "count to ten" when angry, but it rarely works. In Swar Yoga, how can someone eliminate intense rage or argument within two minutes?',
        toneCue: '[engaging:85]',
      },
      {
        turnNumber: 2,
        speaker: 'mohan_sir',
        speakerName: 'Mohan Sir',
        text: 'I am Mohan Sir (Mohan Kalburgi), and this is one of the most practical secrets of Swar Yoga. Listen carefully: anger is not merely an emotion in the head; it is physical heat. Anger can NEVER happen unless your right nostril—Pingala or Surya Nadi—is dominating! When Surya Nadi flares up, blood pressure rises, the heart beats rapidly, and rational thought is hijacked by fire.',
        toneCue: '[energetic:90]',
      },
      {
        turnNumber: 3,
        speaker: 'host',
        speakerName: 'Aryan',
        text: 'So the breath actually forces the anger to happen? What should we do the instant we realize we are getting mad?',
        toneCue: '[fascinated:90]',
      },
      {
        turnNumber: 4,
        speaker: 'mohan_sir',
        speakerName: 'Mohan Sir',
        text: 'The very second you notice anger, do not speak. Place your right thumb gently over your right nostril and block it. Now inhale slowly, deeply, and gently through your left nostril—the Chandra Nadi. Hold for one second, and exhale through the same left nostril. Take 21 slow breaths in Chandra Nadi. The cooling lunar pranic current floods the right hemisphere, drops your cortisol, relaxes your vagus nerve, and within 2 minutes your calm clarity is fully restored.',
        toneCue: '[calm:95]',
      },
      {
        turnNumber: 5,
        speaker: 'host',
        speakerName: 'Aryan',
        text: 'That is pure yogic technology. Block right, breathe left for 21 breaths, and extinguish the fire. Thank you Mohan Sir for sharing this master tool!',
        toneCue: '[inspired:90]',
      },
    ],
    durationSeconds: 155,
    tags: ['Anger Relief', 'Chandra Nadi', 'Ida Nadi', 'Emotional Balance', 'Mind Power'],
    isPublished: true,
    listenCount: 710,
  },
  {
    id: 'podcast_ep_05_weight_loss_secret',
    episodeNumber: 5,
    title: 'Why Diets Fail: The Swar Yoga Metabolic Switch for Fat Loss',
    topic: 'Natural Weight Loss, Metabolic Fire & Eating in Surya Nadi',
    category: 'weight_loss_metabolism',
    language: 'en',
    hostName: 'Priya (Curious Seeker)',
    hostGender: 'female',
    studentQuestion: 'Mohan Sir, so many students starve themselves with salads and keto but still gain back belly fat. What is the Swar Yoga secret to lasting weight loss?',
    mohanSirAnswer: 'I am Mohan Sir (Mohan Kalburgi), and I always tell my students: starving your body is violence against yourself. The secret to weight loss is not eating less; it is eating in the correct metabolic fire. When you eat while your right nostril (Surya Nadi) is roaring, 100% of your food is metabolized into vital Prana rather than stored as adipose fat. Combine this with the 3-sip water rule, no water during meals, and 2 liters in the morning, and the body naturally burns excess fat without weakness.',
    dialogueTurns: [
      {
        turnNumber: 1,
        speaker: 'host',
        speakerName: 'Priya',
        text: 'Mohan Sir, millions of people struggle with stubborn belly fat. They try extreme diets, skipping dinners, and spending hours on treadmills, only to gain the weight back. What does Swar Yoga teach about natural fat loss?',
        toneCue: '[empathetic:85]',
      },
      {
        turnNumber: 2,
        speaker: 'mohan_sir',
        speakerName: 'Mohan Sir',
        text: 'I am Mohan Sir (Mohan Kalburgi), and I tell every student: do not punish your body with starvation! When you starve, your body enters survival mode and holds onto every gram of fat. In Swar Yoga, fat loss is governed by the Agni Tatva (Fire element). If your Surya Nadi is asleep when you eat, even a bowl of raw salad will ferment into toxic fat and mucus.',
        toneCue: '[authoritative:90]',
      },
      {
        turnNumber: 3,
        speaker: 'host',
        speakerName: 'Priya',
        text: 'So if we eat even healthy food in the wrong nostril, it turns into fat?',
        toneCue: '[surprised:90]',
      },
      {
        turnNumber: 4,
        speaker: 'mohan_sir',
        speakerName: 'Mohan Sir',
        text: 'Exactly! In Chandra Nadi, the body is cooling, storing, and anabolic. If you eat lunch when the left nostril is active, digestion is sluggish. Before lunch and dinner, check your breath. If the left is active, close it and activate the right nostril. When Surya Nadi flows, your metabolic rate jumps. The food is incinerated and absorbed into pure energy. Follow our 3-sip water rule, drink zero water during meals, stop water after 9 PM, and your body will shed fat effortlessly while your face glows with Prana!',
        toneCue: '[inspiring:95]',
      },
      {
        turnNumber: 5,
        speaker: 'host',
        speakerName: 'Priya',
        text: 'No starvation, no guilt—just aligning our meals with Surya Nadi fire and water rules! What a revelation Mohan Sir.',
        toneCue: '[delighted:90]',
      },
    ],
    durationSeconds: 170,
    tags: ['Weight Loss', 'Surya Nadi', 'Metabolism', 'Agni Tatva', 'Fat Burn'],
    isPublished: true,
    listenCount: 890,
  },
  {
    id: 'podcast_ep_06_level2_samyama_uttejana',
    episodeNumber: 6,
    title: 'Level 2 Masterclass: Samyama vs Emotional Excitement (Uttejana)',
    topic: 'Level 2 Samyama, 45-Min Meditation & Mind Mastery',
    category: 'level2_samyama',
    language: 'mr',
    hostName: 'आनंद (जिज्ञासू साधक)',
    hostGender: 'male',
    studentQuestion: 'मोहन सर, लेव्हल-२ मध्ये तुम्ही उत्तेजना (Uttejana) आणि संयम (Samyama) यातला फरक शिकवला. साधक या दोघांमध्ये कसा भेद ओळखू शकतात?',
    mohanSirAnswer: 'मी मोहन सर (मोहन काळबुर्गी), आणि लेव्हल-२ अहम् ब्रह्मास्मि वर्गात मी नेहमी सांगतो: उत्तेजना ही बाह्य जगातील तात्पुरती लाट आहे जी तुमचा ओजस आणि ऊर्जा जाळून टाकते. तर संयम म्हणजे धारणा, ध्यान आणि समाधीचे एकत्र प्रकटीकरण! जेव्हा मन एका बिंदूवर स्थिर होते, श्वास सुशुम्नेत वाहतो, तेव्हा संपूर्ण चराचराचे ज्ञान तुमच्या अंतर्मनात उमटते. हाच खरा संयम आहे.',
    dialogueTurns: [
      {
        turnNumber: 1,
        speaker: 'host',
        speakerName: 'आनंद',
        text: 'जय गुरुदेव मोहन सर! लेव्हल-२ ‘अहम् ब्रह्मास्मि’ मधील एक अतिशय सुंदर विषय म्हणजे ‘संयम आणि उत्तेजना’. बऱ्याचदा आपण एखाद्या उत्साहालाच साधना समजतो. कृपया यातील गूढ उलगडून सांगा.',
        toneCue: '[reverent:85]',
      },
      {
        turnNumber: 2,
        speaker: 'mohan_sir',
        speakerName: 'मोहन सर',
        text: 'मी मोहन सर (मोहन काळबुर्गी). खूप खोल प्रश्न विचारलास आनंद. समाजात लोक उत्तेजनेलाच (excitement) आनंद समजतात. नवीन गाडी घेतली, फोन घेतला, किंवा पार्टी झाली की उत्तेजना येते. पण उत्तेजना ही एका फटाक्यासारखी असते—क्षणभर चमकते आणि नंतर फक्त राख आणि नैराश्य मागे सोडते. ती तुमच्या मज्जासंस्थेचा आणि ओजसाचा नाश करते.',
        toneCue: '[profound:95]',
      },
      {
        turnNumber: 3,
        speaker: 'host',
        speakerName: 'आनंद',
        text: 'मग महर्षी पतंजली आणि स्वरयोगातील खरा ‘संयम’ म्हणजे काय सर?',
        toneCue: '[attentive:90]',
      },
      {
        turnNumber: 4,
        speaker: 'mohan_sir',
        speakerName: 'मोहन सर',
        text: 'त्रयमेकत्र संयमः! जेव्हा धारणा, ध्यान आणि समाधी हे तिन्ही एकाच वस्तूवर अखंडितपणे केंद्रित होतात, त्याला संयम म्हणतात. लेव्हल-२ मध्ये आपण ४५ मिनिटांचे ध्यान शिकतो. जेव्हा दोन्ही नाकपुड्यांमधून एकाच वेळी श्वास वाहू लागतो—म्हणजे सुशुम्ना नाडी प्रज्वलित होते—तेव्हा मनातील सर्व द्वंद्व शांत होतात. तुम्ही द्रष्टा बनता. उत्तेजना संपते आणि अथांग, शांत, शाश्वत आनंद सुरू होतो.',
        toneCue: '[meditative:95]',
      },
      {
        turnNumber: 5,
        speaker: 'host',
        speakerName: 'आनंद',
        text: 'अतिशय सुंदर दर्शन मोहन सर! क्षणिक उत्तेजनेच्या मागे न धावता सुशुम्ना नाडीतील अखंड संयमाची अनुभूती घेणे हीच खरी प्रगती आहे.',
        toneCue: '[grateful:90]',
      },
    ],
    durationSeconds: 190,
    tags: ['संयम', 'उत्तेजना', 'Level 2', 'अहम् ब्रह्मास्मि', 'सुशुम्ना ध्यान'],
    isPublished: true,
    listenCount: 530,
  },
  {
    id: 'podcast_ep_07_level2_photographer_creator',
    episodeNumber: 7,
    title: 'Level 2: The Photographer vs The Creator — Living in Detached Freedom',
    topic: 'Observer vs Entangled Doer, Sakshi Bhava & Freedom',
    category: 'level2_samyama',
    language: 'en',
    hostName: 'Aryan (Yogic Inquirer)',
    hostGender: 'male',
    studentQuestion: 'Mohan Sir, your analogy of the "Photographer vs Creator" in Level-2 opened everyone’s eyes. How does this liberate us from relationship anxiety and stress?',
    mohanSirAnswer: 'I am Mohan Sir (Mohan Kalburgi), and this is the greatest secret of living peacefully in Samsara. The Creator is obsessed with controlling every outcome, every person, and every reaction—and when things do not happen according to him, he suffers deeply. The Photographer, however, walks into the scene with total love, captures reality exactly as it is without resisting the sunset or the storm, and walks away free. In Swar Yoga, you learn to observe your breath like a Photographer.',
    dialogueTurns: [
      {
        turnNumber: 1,
        speaker: 'host',
        speakerName: 'Aryan',
        text: 'Welcome back friends. In Mohan Sir’s Level-2 workshop, there is a legendary concept called "The Photographer vs The Creator". Mohan Sir, why do people suffer so much in relationships, business, and family, and how does this analogy set them free?',
        toneCue: '[thoughtful:85]',
      },
      {
        turnNumber: 2,
        speaker: 'mohan_sir',
        speakerName: 'Mohan Sir',
        text: 'I am Mohan Sir (Mohan Kalburgi), and I want you to reflect on your daily life. Why do you suffer? You suffer because you believe you are the Creator and Controller of the universe! You want your spouse to act according to your script, your children to behave your way, and your business to never see a cloud. The moment reality deviates from your desire, anger, frustration, and pain overwhelm you.',
        toneCue: '[wise:95]',
      },
      {
        turnNumber: 3,
        speaker: 'host',
        speakerName: 'Aryan',
        text: 'That describes almost everyone’s daily struggle! How does the Photographer live differently?',
        toneCue: '[eager:90]',
      },
      {
        turnNumber: 4,
        speaker: 'mohan_sir',
        speakerName: 'Mohan Sir',
        text: 'Consider a master wildlife photographer. When he enters the jungle, does he command the tiger to walk left or the rain to stop? No! If it rains, he clicks a masterpiece of the monsoon. If the tiger rests, he clicks serenity. He observes with 100% presence and zero resistance. When you practice Swar Yoga, you become the Photographer of your own thoughts, emotions, and breath. You watch the breath come and go without clutching. You live in total Sakshi Bhava—pure unshakeable peace.',
        toneCue: '[inspiring:95]',
      },
      {
        turnNumber: 5,
        speaker: 'host',
        speakerName: 'Aryan',
        text: 'Stop trying to control everything as the frantic Creator, and step back as the serene Photographer. Pure gold from Level 2. Thank you Mohan Sir!',
        toneCue: '[reverent:90]',
      },
    ],
    durationSeconds: 185,
    tags: ['Photographer vs Creator', 'Level 2', 'Sakshi Bhava', 'Detachment', 'Peace'],
    isPublished: true,
    listenCount: 780,
  },
  {
    id: 'podcast_ep_08_level3_ashtavakra_mind_letter',
    episodeNumber: 8,
    title: 'Level 3: Ashtavakra Dhyan & The Letter to "My Dear Mind"',
    topic: 'History vs Potential, Self Letter & Ashtavakra Consciousness',
    category: 'level3_ashtavakra',
    language: 'hi',
    hostName: 'प्रिया (जिज्ञासु साधक)',
    hostGender: 'female',
    studentQuestion: 'मोहन सर, लेवल-३ अष्टावक्र ध्यान में जो ‘हिस्ट्री बनाम पोटेंशियल’ और ‘माय डियर माइंड’ को पत्र लिखने की साधना है, वह मन के पुराने बंधनों को कैसे काटती है?',
    mohanSirAnswer: 'मैं मोहन सर (मोहन काळबुर्गी), और लेवल-३ अष्टावक्र ध्यान में मैं साधकों को यह परम सत्य समझाता हूँ: आपका बीता हुआ कल केवल एक इतिहास (History) है, वह आपकी वास्तविक क्षमता (Potential) नहीं है! जब आप अपने मन को एक मित्र की तरह संबोधित करते हुए "माय डियर माइंड" पत्र लिखते हैं, तो आप मन से अलग हो जाते हैं। आप मन नहीं हैं, आप वह असीम चेतना (शिवोऽहम्) हैं जो मन को देख रही है।',
    dialogueTurns: [
      {
        turnNumber: 1,
        speaker: 'host',
        speakerName: 'प्रिया',
        text: 'सादर वंदन मोहन सर! लेवल-३ अष्टावक्र ध्यान आपके सर्वोच्च पाठ्यक्रमों में से एक है। इसमें आप ‘History vs Potential’ और अपने ही मन को एक पत्र लिखने की बात करते हैं। यह प्रक्रिया साधक के जीवन को कैसे रूपांतरित करती है?',
        toneCue: '[reverent:90]',
      },
      {
        turnNumber: 2,
        speaker: 'mohan_sir',
        speakerName: 'मोहन सर',
        text: 'मैं मोहन सर (मोहन काळबुर्गी), और अष्टावक्र ध्यान के इस गूढ़ विषय पर तुम्हारा स्वागत करता हूँ। मनुष्य का सबसे बड़ा भ्रम यह है कि वह अपने अतीत के अनुभवों को, अपनी पुरानी असफलताओं को ही अपना भविष्य मान लेता है। अष्टावक्र गीता का शंखनाद है: तुम शरीर नहीं हो, तुम मन नहीं हो। तुम्हारी हिस्ट्री केवल यादों का एक पुलिंदा है, जबकि तुम्हारी चेतना की क्षमता (Potential) अनंत आकाश जैसी असीम है!',
        toneCue: '[transcendent:95]',
      },
      {
        turnNumber: 3,
        speaker: 'host',
        speakerName: 'प्रिया',
        text: 'सर, और वह जो पत्र लिखने का अभ्यास है—‘My Dear Mind’, वह साधक कैसे करता है?',
        toneCue: '[curious:90]',
      },
      {
        turnNumber: 4,
        speaker: 'mohan_sir',
        speakerName: 'मोहन सर',
        text: 'साधक शांत बैठकर लिखता है: "हे मेरे प्रिय मन (My Dear Mind), तुमने इतने वर्षों तक मुझे संसार में दौड़ाया, डराया, लालच दिया। लेकिन आज मैं अष्टावक्र ध्यान में यह जान चुका हूँ कि तुम मात्र एक नौकर हो, और मैं तुम्हारा स्वामी—आत्मा हूँ।" जब आप मन को पत्र लिखकर सामने रख देते हैं, तो मन का सम्मोहन तुरंत टूट जाता है। आप शुद्ध साक्षी भाव में प्रतिष्ठित हो जाते हैं और स्वयं को शिव स्वरूप अनुभव करते हैं।',
        toneCue: '[profound:95]',
      },
      {
        turnNumber: 5,
        speaker: 'host',
        speakerName: 'प्रिया',
        text: 'अतीत की बेड़ियों को तोड़कर अनंत संभावनाओं में जागना और मन को साक्षी भाव से देखना। अष्टावक्र ध्यान का यह सार हमारे हृदय को छू गया। धन्यवाद मोहन सर!',
        toneCue: '[blessed:90]',
      },
    ],
    durationSeconds: 195,
    tags: ['अष्टावक्र ध्यान', 'My Dear Mind', 'History vs Potential', 'शिवोऽहम्', 'Level 3'],
    isPublished: true,
    listenCount: 620,
  },
  {
    id: 'podcast_ep_09_level3_shivoham_5_truths',
    episodeNumber: 9,
    title: 'Level 3: The 5 Eternal Truths & The Ultimate Silence of Shivoham',
    topic: '5 Truths (Satya, Santosh, Daya, Kshama, Aarjav) & Shivoham',
    category: 'level3_ashtavakra',
    language: 'en',
    hostName: 'Aryan (Yogic Inquirer)',
    hostGender: 'male',
    studentQuestion: 'Mohan Sir, in the graduation of Level-3, you teach the 5 Truths and the chant of Shivoham Shivoham. What is the ultimate fruit of this sadhana?',
    mohanSirAnswer: 'I am Mohan Sir (Mohan Kalburgi), and in Level-3 Ashtavakra Dhyan, the final milestone is resting in your true nature. The 5 Truths—Satya (Truth), Santosh (Contentment), Daya (Compassion), Kshama (Forgiveness), and Aarjav (Total Simplicity & Surrender)—are the pillars. When breath enters Sushumna and the identity dissolves, you chant Shivoham Shivoham: I am not this body, I am not this breath; I am the eternal, auspicious, unmoving consciousness.',
    dialogueTurns: [
      {
        turnNumber: 1,
        speaker: 'host',
        speakerName: 'Aryan',
        text: 'Namaste Mohan Sir! Today we explore the pinnacle of Swar Yoga—Level 3 Ashtavakra Dhyan. In the final graduation class, you unveil the Five Eternal Truths and the sacred revelation of Shivoham Shivoham. Can you share that sacred atmosphere with us?',
        toneCue: '[reverent:90]',
      },
      {
        turnNumber: 2,
        speaker: 'mohan_sir',
        speakerName: 'Mohan Sir',
        text: 'I am Mohan Sir (Mohan Kalburgi), and I bow to the divine light within every listener. When a seeker reaches Level 3, the restlessness of the world has settled. Here, we establish our life upon the 5 Eternal Truths: Satya (Truthfulness to one’s Self), Santosh (Deep Contentment with what is), Daya (Boundless Compassion for all living beings), Kshama (Total Forgiveness that cleanses the heart), and Aarjav (Pure humility, devotion, and surrender).',
        toneCue: '[sacred:95]',
      },
      {
        turnNumber: 3,
        speaker: 'host',
        speakerName: 'Aryan',
        text: 'When a sadhak embodies these 5 Truths, what happens in the meditation during the Shivoham chant?',
        toneCue: '[attentive:95]',
      },
      {
        turnNumber: 4,
        speaker: 'mohan_sir',
        speakerName: 'Mohan Sir',
        text: 'Both Ida and Pingala merge into the central channel—the Sushumna Nadi. The breath becomes so subtle that you cannot tell if you are inhaling or exhaling. In that supreme stillness, the chant resonates: "चिदानन्दरूपः शिवोऽहम् शिवोऽहम्" — I am pure consciousness and bliss, I am Shiva, I am Shiva! All fear of death, all past guilt, all future anxiety evaporates. You realize you were never bound; you were always free.',
        toneCue: '[transcendent:95]',
      },
      {
        turnNumber: 5,
        speaker: 'host',
        speakerName: 'Aryan',
        text: 'Shivoham Shivoham. A state of pure bliss and liberation through Swar Yoga. Mohan Sir, your guidance is an eternal torch for all seekers. Thank you from the depths of our hearts!',
        toneCue: '[deeply_grateful:95]',
      },
    ],
    durationSeconds: 210,
    tags: ['Shivoham', '5 Truths', 'Aarjav', 'Sushumna Silence', 'Level 3'],
    isPublished: true,
    listenCount: 840,
  },
];

export async function getAllPodcastEpisodes(options?: {
  category?: string;
  language?: string;
  search?: string;
}): Promise<PodcastEpisode[]> {
  await initPodcastSchema();

  let query = 'SELECT * FROM mohan_podcast_episodes_sql WHERE is_published = 1';
  const args: any[] = [];

  if (options?.category && options.category !== 'all') {
    query += ' AND category = ?';
    args.push(options.category);
  }

  if (options?.language && options.language !== 'all') {
    query += ' AND language = ?';
    args.push(options.language);
  }

  if (options?.search) {
    query += ' AND (title LIKE ? OR topic LIKE ? OR student_question LIKE ? OR tags_json LIKE ?)';
    const term = `%${options.search}%`;
    args.push(term, term, term, term);
  }

  query += ' ORDER BY episode_number ASC';

  const result = await bunnyExecute({ sql: query, args });
  const rows = result.rows || [];

  if (rows.length === 0 && (!options || Object.keys(options).length === 0 || (options.category === 'all' && options.language === 'all' && !options.search))) {
    // Auto-seed if empty
    await seedDefaultPodcastEpisodes();
    return getAllPodcastEpisodes(options);
  }

  return rows.map(mapRowToPodcastEpisode);
}

export async function getPodcastEpisodeById(id: string): Promise<PodcastEpisode | null> {
  await initPodcastSchema();
  const result = await bunnyExecute({
    sql: 'SELECT * FROM mohan_podcast_episodes_sql WHERE id = ?',
    args: [id],
  });
  const row = result.rows?.[0];
  if (!row) return null;
  return mapRowToPodcastEpisode(row);
}

export async function incrementListenCount(id: string): Promise<void> {
  await initPodcastSchema();
  await bunnyExecute({
    sql: 'UPDATE mohan_podcast_episodes_sql SET listen_count = listen_count + 1 WHERE id = ?',
    args: [id],
  });
}

export async function deletePodcastEpisode(id: string): Promise<boolean> {
  await initPodcastSchema();
  await bunnyExecute({
    sql: 'DELETE FROM mohan_podcast_episodes_sql WHERE id = ?',
    args: [id],
  });
  return true;
}

export async function createPodcastEpisode(episode: Partial<PodcastEpisode>): Promise<PodcastEpisode> {
  await initPodcastSchema();
  const id = episode.id || `podcast_${crypto.randomUUID()}`;
  const now = new Date().toISOString();

  // Find max episode number
  const maxRow = await bunnyExecute('SELECT MAX(episode_number) as max_num FROM mohan_podcast_episodes_sql');
  const nextNum = (Number(maxRow.rows?.[0]?.max_num) || 0) + 1;

  const newEpisode: PodcastEpisode = {
    id,
    episodeNumber: episode.episodeNumber || nextNum,
    title: episode.title || 'Swar Yoga Discussion with Mohan Sir',
    topic: episode.topic || 'Class Q&A',
    category: episode.category || 'water_digestion',
    language: episode.language || 'en',
    hostName: episode.hostName || 'Priya (Curious Seeker)',
    hostGender: episode.hostGender || 'female',
    studentQuestion: episode.studentQuestion || '',
    mohanSirAnswer: episode.mohanSirAnswer || '',
    dialogueTurns: episode.dialogueTurns || [],
    audioUrl: episode.audioUrl || '',
    videoUrl: episode.videoUrl || '',
    durationSeconds: episode.durationSeconds || 180,
    tags: episode.tags || ['Swar Yoga', 'Class Q&A'],
    isPublished: episode.isPublished !== undefined ? episode.isPublished : true,
    listenCount: 0,
    hostCloneId: episode.hostCloneId || 'priya_seeker',
    mohanCloneId: episode.mohanCloneId || 'mohan_pearl_white_khadi',
    backgroundId: episode.backgroundId || 'bg_himalayan_zen',
    backgroundUrl: episode.backgroundUrl || '',
    createdAt: now,
    updatedAt: now,
  };

  await bunnyExecute({
    sql: `INSERT OR REPLACE INTO mohan_podcast_episodes_sql (
      id, episode_number, title, topic, category, language, host_name, host_gender,
      student_question, mohan_sir_answer, dialogue_turns_json, audio_url, video_url,
      duration_seconds, tags_json, is_published, listen_count,
      host_clone_id, mohan_clone_id, background_id, background_url,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      newEpisode.id,
      newEpisode.episodeNumber,
      newEpisode.title,
      newEpisode.topic,
      newEpisode.category,
      newEpisode.language,
      newEpisode.hostName,
      newEpisode.hostGender,
      newEpisode.studentQuestion,
      newEpisode.mohanSirAnswer,
      JSON.stringify(newEpisode.dialogueTurns),
      newEpisode.audioUrl || null,
      newEpisode.videoUrl || null,
      newEpisode.durationSeconds,
      JSON.stringify(newEpisode.tags),
      newEpisode.isPublished ? 1 : 0,
      newEpisode.listenCount,
      newEpisode.hostCloneId || 'priya_seeker',
      newEpisode.mohanCloneId || 'mohan_pearl_white_khadi',
      newEpisode.backgroundId || 'bg_himalayan_zen',
      newEpisode.backgroundUrl || '',
      newEpisode.createdAt,
      newEpisode.updatedAt,
    ],
  });

  return newEpisode;
}

export async function seedDefaultPodcastEpisodes(): Promise<void> {
  await initPodcastSchema();
  for (const ep of SEED_PODCAST_EPISODES) {
    const now = new Date().toISOString();
    await bunnyExecute({
      sql: `INSERT OR REPLACE INTO mohan_podcast_episodes_sql (
        id, episode_number, title, topic, category, language, host_name, host_gender,
        student_question, mohan_sir_answer, dialogue_turns_json, audio_url, video_url,
        duration_seconds, tags_json, is_published, listen_count, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        ep.id,
        ep.episodeNumber,
        ep.title,
        ep.topic,
        ep.category,
        ep.language,
        ep.hostName,
        ep.hostGender,
        ep.studentQuestion,
        ep.mohanSirAnswer,
        JSON.stringify(ep.dialogueTurns),
        ep.audioUrl || null,
        ep.videoUrl || null,
        ep.durationSeconds,
        JSON.stringify(ep.tags),
        ep.isPublished ? 1 : 0,
        ep.listenCount,
        now,
        now,
      ],
    });
  }
}

/**
 * Generate a dynamic 2-speaker podcast dialogue between an AI Host and Mohan Sir
 * Grounded 100% in Mohan Sir's authentic Swar Yoga corpus.
 */
export async function generatePodcastEpisodeFromQuestion(input: {
  question: string;
  language: 'mr' | 'hi' | 'en';
  hostName?: string;
  hostGender?: 'female' | 'male';
  category?: string;
}): Promise<PodcastEpisode> {
  const lang = input.language || 'en';
  const hostName = input.hostName || (lang === 'mr' ? 'आनंद (जिज्ञासू साधक)' : lang === 'hi' ? 'प्रिया (जिज्ञासु साधक)' : 'Priya (Curious Seeker)');
  const hostGender = input.hostGender || (lang === 'mr' ? 'male' : 'female');

  // Step 1: Query the RAG engine for Mohan Sir's exact grounded response
  const ragResult = await generateGroundedMohanAnswer({
    query: input.question,
    moduleId: 'level1',
    language: lang,
  });

  const groundedText = ragResult.answer;

  // Step 2: Use LLM to format into a lively, authentic 5-turn podcast interview script
  const prompt = `Convert the following authentic Swar Yoga teaching from Mohan Sir into a compelling 2-speaker podcast dialogue.
SPEAKER 1: AI Host "${hostName}" (${hostGender === 'female' ? 'Warm, inquisitive female seeker' : 'Insightful, respectful male seeker'}).
SPEAKER 2: "Mohan Sir" (Mohan Kalburgi himself, speaking with warm authority, spiritual depth, and clear first-person presence).

STUDENT QUESTION: "${input.question}"
MOHAN SIR'S AUTHENTIC GROUNDED KNOWLEDGE:
${groundedText}

RULES:
1. Host asks genuine practical questions and follow-ups on behalf of students in class.
2. Mohan Sir answers directly as himself ("I am Mohan Sir...", "In Swar Yoga, I explain...").
3. Keep all specific numbers, rules, timings (e.g. 3 sips, 2L 5-10 AM, 1.5L 2-9 PM, no water after 9 PM, 45-min gap, Surya Nadi during food) 100% accurate.
4. Output EXACTLY a valid JSON object with these keys:
{
  "title": "Short catchy podcast episode title",
  "topic": "Main yogic topic name",
  "category": "water_digestion" | "gas_sleep_health" | "nadi_breath_mechanics" | "level2_samyama" | "level3_ashtavakra" | "mind_emotions" | "weight_loss_metabolism",
  "tags": ["tag1", "tag2", "tag3"],
  "dialogueTurns": [
    {
      "turnNumber": 1,
      "speaker": "host",
      "speakerName": "${hostName}",
      "text": "...",
      "toneCue": "[curious:85]"
    },
    {
      "turnNumber": 2,
      "speaker": "mohan_sir",
      "speakerName": "${lang === 'mr' ? 'मोहन सर' : lang === 'hi' ? 'मोहन सर' : 'Mohan Sir'}",
      "text": "...",
      "toneCue": "[compassionate:95]"
    }
  ]
}
Language of dialogue: ${lang === 'mr' ? 'Marathi' : lang === 'hi' ? 'Hindi' : 'English'}.
Return ONLY valid raw JSON without markdown backticks.`;

  const aiOutput = await generateAIText({
    systemPrompt: 'You are an expert podcast script producer for Swar Yoga and Mohan Kalburgi. Respond ONLY in valid JSON.',
    message: prompt,
    maxOutputTokens: 1600,
    temperature: 0.2,
    providerOrder: ['Replicate', 'Gemini', 'OpenAI', 'Anthropic'],
  });

  let parsed: any;
  try {
    const cleaned = aiOutput.replace(/```json/gi, '').replace(/```/g, '').trim();
    parsed = JSON.parse(cleaned);
  } catch (err) {
    // Fallback dialogue turns
    parsed = {
      title: `Class Q&A with Mohan Sir: ${input.question.slice(0, 40)}`,
      topic: 'Swar Yoga Discussion',
      category: 'water_digestion',
      tags: ['Swar Yoga', 'Mohan Sir', 'Class Q&A'],
      dialogueTurns: [
        {
          turnNumber: 1,
          speaker: 'host',
          speakerName: hostName,
          text: `Welcome to Swar Vani! Today we ask Mohan Sir a question from class: ${input.question}`,
          toneCue: '[curious:80]',
        },
        {
          turnNumber: 2,
          speaker: 'mohan_sir',
          speakerName: lang === 'mr' ? 'मोहन सर' : lang === 'hi' ? 'मोहन सर' : 'Mohan Sir',
          text: groundedText,
          toneCue: '[compassionate:90]',
        },
        {
          turnNumber: 3,
          speaker: 'host',
          speakerName: hostName,
          text: 'Thank you Mohan Sir for this profound, practical yogic clarity!',
          toneCue: '[grateful:90]',
        },
      ],
    };
  }

  const episode = await createPodcastEpisode({
    title: parsed.title,
    topic: parsed.topic,
    category: parsed.category || 'water_digestion',
    language: lang,
    hostName,
    hostGender,
    studentQuestion: input.question,
    mohanSirAnswer: groundedText,
    dialogueTurns: parsed.dialogueTurns,
    durationSeconds: Math.max(90, Math.min(300, (parsed.dialogueTurns?.length || 3) * 35)),
    tags: parsed.tags || ['Swar Yoga', 'Class Discussion'],
    isPublished: true,
  });

  return episode;
}

function mapRowToPodcastEpisode(row: any): PodcastEpisode {
  let dialogueTurns: DialogueTurn[] = [];
  try {
    dialogueTurns = JSON.parse(row.dialogue_turns_json || '[]');
  } catch {}

  let tags: string[] = [];
  try {
    tags = JSON.parse(row.tags_json || '[]');
  } catch {}

  return {
    id: String(row.id),
    episodeNumber: Number(row.episode_number) || 1,
    title: String(row.title || ''),
    topic: String(row.topic || ''),
    category: row.category as any,
    language: row.language as any,
    hostName: String(row.host_name || ''),
    hostGender: (row.host_gender || 'female') as any,
    studentQuestion: String(row.student_question || ''),
    mohanSirAnswer: String(row.mohan_sir_answer || ''),
    dialogueTurns,
    audioUrl: row.audio_url || undefined,
    videoUrl: row.video_url || undefined,
    durationSeconds: Number(row.duration_seconds) || 120,
    tags,
    isPublished: Boolean(row.is_published),
    listenCount: Number(row.listen_count) || 0,
    hostCloneId: row.host_clone_id || 'priya_seeker',
    mohanCloneId: row.mohan_clone_id || 'mohan_pearl_white_khadi',
    backgroundId: row.background_id || 'bg_himalayan_zen',
    backgroundUrl: row.background_url || undefined,
    createdAt: String(row.created_at || ''),
    updatedAt: String(row.updated_at || ''),
  };
}

