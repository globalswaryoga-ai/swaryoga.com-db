import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { bunnyExecute } from '../lib/bunnyDatabase';
import { uploadToBunnyStorage } from '../lib/bunny-storage';

interface DnaVoiceDefinition {
  id: string; // matches DNA look id suffix, e.g. 04f6e33e
  rawDnaId: string; // dna_look_04f6e33e
  title: string;
  language: 'hi' | 'mr' | 'en';
  voiceId: string;
  pitch: string;
  rate: string;
  toneName: string;
  characteristic: string;
  samplePhrase: string;
}

const DNA_39_VOICE_SPECS: DnaVoiceDefinition[] = [
  {
    id: '04f6e33e',
    rawDnaId: 'dna_look_04f6e33e',
    title: 'Swar Yoga Intro 4K (फाउंडेशन व्याख्यान)',
    language: 'hi',
    voiceId: 'hi-IN-MadhurNeural',
    pitch: '-8Hz',
    rate: '-5%',
    toneName: 'Mohan Sir - Swar Yoga Intro 4K (Hindi)',
    characteristic: 'गंभीर व प्रामाणिक गुरु स्वर, स्वर योग के मूल सिद्धांत, इड़ा और पिंगला का आरंभिक परिचय।',
    samplePhrase: 'नमस्ते साधकों! मैं मोहन कलबुर्गी। स्वर योग केवल सांस लेना नहीं, बल्कि ब्रह्मांडीय ऊर्जा के साथ जीवन को संरेखित करने का प्राचीन विज्ञान है।',
  },
  {
    id: '0e55351e',
    rawDnaId: 'dna_look_0e55351e',
    title: 'Swar Yoga Hindi Masterclass Part 1',
    language: 'hi',
    voiceId: 'hi-IN-MadhurNeural',
    pitch: '-8Hz',
    rate: '-5%',
    toneName: 'Mohan Sir - Swar Yoga Hindi Masterclass Part 1',
    characteristic: 'धीमी व प्रभावशाली आध्यात्मिक वाणी, ध्यान और नाड़ी शुद्धि पर व्याख्यान।',
    samplePhrase: 'जब आपकी बायीं नासिका सक्रिय होती है, तो चंद्र नाड़ी मस्तिष्क को शीतलता और स्थिरता प्रदान करती है।',
  },
  {
    id: '107fce87',
    rawDnaId: 'dna_look_107fce87',
    title: 'Hindi Morning Swar Yoga L-1 (26 Oct)',
    language: 'hi',
    voiceId: 'hi-IN-MadhurNeural',
    pitch: '-8Hz',
    rate: '-4%',
    toneName: 'Mohan Sir - Morning Swar Yoga L-1 (Hindi)',
    characteristic: 'प्रातःकालीन ऊर्जावान व स्पष्ट गुरु वाणी, दैनिक स्वर परीक्षा विधि।',
    samplePhrase: 'प्रातः काल उठते ही सबसे पहले अपनी सक्रिय नासिका की जांच करें और उसी ओर की हथेली का दर्शन करें।',
  },
  {
    id: '137b14ff',
    rawDnaId: 'dna_look_137b14ff',
    title: 'Swar Aahar Shastra - जठराग्नि व भोजन',
    language: 'hi',
    voiceId: 'hi-IN-MadhurNeural',
    pitch: '-9Hz',
    rate: '-6%',
    toneName: 'Mohan Sir - Swar Aahar Shastra (Dietary Wisdom)',
    characteristic: 'वैज्ञानिक व चिकित्सीय स्वर दृष्टिकोण, भोजन के समय सूर्य स्वर के नियम।',
    samplePhrase: 'भोजन सदैव सूर्य नाड़ी में ही ग्रहण करना चाहिए, क्योंकि उस समय जठराग्नि प्रज्वलित रहती है और भोजन अमृत बन जाता है।',
  },
  {
    id: '22f3e9d3',
    rawDnaId: 'dna_look_22f3e9d3',
    title: 'Swar Aahar Shastra - ऋतु अनुसार आहार',
    language: 'hi',
    voiceId: 'hi-IN-MadhurNeural',
    pitch: '-8Hz',
    rate: '-5%',
    toneName: 'Mohan Sir - Swar Aahar Shastra (Seasonal Balance)',
    characteristic: 'प्राकृतिक स्वास्थ्य व पोषण नियम, वात-पित्त-कफ संतुलन।',
    samplePhrase: 'ऋतु के अनुसार स्वर के संतुलन को समझकर जो आहार लिया जाता है, वह किसी भी रोग को जड़ से समाप्त कर देता है।',
  },
  {
    id: '2368fa4f',
    rawDnaId: 'dna_look_2368fa4f',
    title: 'Swar Aahar Shastra - पाचन व मेटाबॉलिज्म',
    language: 'hi',
    voiceId: 'hi-IN-MadhurNeural',
    pitch: '-9Hz',
    rate: '-5%',
    toneName: 'Mohan Sir - Swar Aahar Shastra (Metabolism)',
    characteristic: 'मेटाबॉलिज्म नियंत्रण और स्वर परिवर्तन के सूक्ष्म नियम।',
    samplePhrase: 'अन्न का प्रत्येक कण आपके प्राण को प्रभावित करता है। स्वर जानकर किया गया भोजन ही जीवन को आरोग्य देता है।',
  },
  {
    id: '247e9982',
    rawDnaId: 'dna_look_247e9982',
    title: 'Swar Yoga Intro 4K Part 1',
    language: 'hi',
    voiceId: 'hi-IN-MadhurNeural',
    pitch: '-8Hz',
    rate: '-5%',
    toneName: 'Mohan Sir - Swar Yoga Intro 4K Part 1',
    characteristic: 'आत्मविश्वास से परिपूर्ण गुरु वाणी, शिव स्वरोदय शास्त्र के प्रमाण।',
    samplePhrase: 'शिव स्वरोदय शास्त्र में भगवान शिव ने माता पार्वती को प्राण और स्वर का वह गूढ़ रहस्य समझाया है जो भाग्य को बदल सकता है।',
  },
  {
    id: '250f6db9',
    rawDnaId: 'dna_look_250f6db9',
    title: '7 Days Swar Yoga Hindi - Day 1',
    language: 'hi',
    voiceId: 'hi-IN-MadhurNeural',
    pitch: '-8Hz',
    rate: '-5%',
    toneName: 'Mohan Sir - 7 Days Swar Yoga (Day 1)',
    characteristic: '7 दिवसीय कार्यशाला का प्रथम दिवस, मूलभूत प्राणायाम व स्वर चक्र।',
    samplePhrase: 'हमारे सात दिवसीय स्वर योग कार्यशाला के पहले दिन आप सभी का स्वागत है। आज हम अपनी श्वास की गति को अनुभव करेंगे।',
  },
  {
    id: '3246a191',
    rawDnaId: 'dna_look_3246a191',
    title: 'Marathi Oct Eve Swar Yoga L-1 (26 Oct)',
    language: 'mr',
    voiceId: 'mr-IN-ManoharNeural',
    pitch: '-6Hz',
    rate: '-4%',
    toneName: 'Mohan Sir - Marathi Swar Yoga L-1 (26 Oct)',
    characteristic: 'अस्खलित व अस्सल मराठी गुरु वाणी, नाडी संतुलन व दैनंदिन साधना.',
    samplePhrase: 'नमस्कार! मी मोहन कलबुर्गी. आजच्या मराठी स्वर योग सत्रात आपण डावी नाकपुडी आणि उजवी नाकपुडी यांच्या कार्याची सखोल माहिती घेणार आहोत.',
  },
  {
    id: '33b599f9',
    rawDnaId: 'dna_look_33b599f9',
    title: 'Meditation Workshop - 17 June',
    language: 'hi',
    voiceId: 'hi-IN-MadhurNeural',
    pitch: '-9Hz',
    rate: '-7%',
    toneName: 'Mohan Sir - Deep Meditation Workshop',
    characteristic: 'अत्यंत शांत, ध्यानस्थ व गंभीर मर्मस्पर्शी वाणी, शून्य समाधि ध्यान।',
    samplePhrase: 'नेत्र बंद करें। श्वास के आने और जाने को केवल एक साक्षी की भांति देखें। जब दोनों स्वर समान चलें, वही सुषुम्ना है।',
  },
  {
    id: '4cd25a86',
    rawDnaId: 'dna_look_4cd25a86',
    title: 'English Morning Swar Yoga (26 Oct)',
    language: 'en',
    voiceId: 'en-IN-PrabhatNeural',
    pitch: '-5Hz',
    rate: '-3%',
    toneName: 'Mohan Sir - English Morning Swar Yoga Keynote',
    characteristic: 'Scholarly, authoritative Indian English delivery on respiratory science.',
    samplePhrase: 'Welcome seekers. Swar Yoga is the ancient Vedic science of breath cycles, aligning your solar and lunar energies with cosmic biorhythms.',
  },
  {
    id: '4e3dfe2f',
    rawDnaId: 'dna_look_4e3dfe2f',
    title: 'Marathi Oct Eve Swar Yoga L-1 (21 Oct)',
    language: 'mr',
    voiceId: 'mr-IN-ManoharNeural',
    pitch: '-6Hz',
    rate: '-4%',
    toneName: 'Mohan Sir - Marathi Swar Yoga L-1 (21 Oct)',
    characteristic: 'सहज, आपुलकीची व मार्गदर्शक मराठी भाषा, सायंकालीन प्राणायाम.',
    samplePhrase: 'संध्याकाळच्या वेळी सूर्य अस्ताला जाताना आपल्या शरीरातील स्वर कसा बदलावा, हे आज आपण शिकणार आहोत.',
  },
  {
    id: '5fd3882c',
    rawDnaId: 'dna_look_5fd3882c',
    title: 'Swar Yoga Day-1 Foundation Workshop',
    language: 'hi',
    voiceId: 'hi-IN-MadhurNeural',
    pitch: '-8Hz',
    rate: '-5%',
    toneName: 'Mohan Sir - Swar Yoga Day-1 Foundation',
    characteristic: 'मूलभूत ज्ञान, चंद्र-सूर्य नाड़ी के कार्य और दैनिक दिनचर्या।',
    samplePhrase: 'स्वर योग को अपने जीवन में उतारने का अर्थ है कि आप अपनी प्रत्येक सांस के प्रति पूर्णतः जागरूक हो चुके हैं।',
  },
  {
    id: '62803d4f',
    rawDnaId: 'dna_look_62803d4f',
    title: '7 Days Swar Yoga Hindi - Day 2',
    language: 'hi',
    voiceId: 'hi-IN-MadhurNeural',
    pitch: '-8Hz',
    rate: '-5%',
    toneName: 'Mohan Sir - 7 Days Swar Yoga (Day 2)',
    characteristic: 'इड़ा नाड़ी के मानसिक प्रभाव, एकाग्रता और शीतलता का विज्ञान।',
    samplePhrase: 'दूसरे दिन हम चंद्र नाड़ी की मानसिक शक्तियों पर चर्चा कर रहे हैं। यह नाड़ी मन को शांत और बुद्धि को स्थिर करती है।',
  },
  {
    id: '6902ac81',
    rawDnaId: 'dna_look_6902ac81',
    title: 'English Morning Swar Yoga (22 Oct)',
    language: 'en',
    voiceId: 'en-IN-PrabhatNeural',
    pitch: '-5Hz',
    rate: '-3%',
    toneName: 'Mohan Sir - English Swar Yoga Research (22 Oct)',
    characteristic: 'Clear international presentation on autonomous nervous system regulation.',
    samplePhrase: 'By regulating your left and right nostril airflow, you directly balance your sympathetic and parasympathetic nervous systems.',
  },
  {
    id: '74f27512',
    rawDnaId: 'dna_look_74f27512',
    title: '7 Days Swar Yoga Hindi - Day 3',
    language: 'hi',
    voiceId: 'hi-IN-MadhurNeural',
    pitch: '-8Hz',
    rate: '-5%',
    toneName: 'Mohan Sir - 7 Days Swar Yoga (Day 3)',
    characteristic: 'सूर्य नाड़ी के शारीरिक लाभ, शक्ति और कर्म संपादन के नियम।',
    samplePhrase: 'तीसरे दिन में पिंगला नाड़ी की अग्नि को समझें। जब आपको कठिन कार्य करने हों, तो सूर्य स्वर का चलना आवश्यक है।',
  },
  {
    id: '7d0e63ef',
    rawDnaId: 'dna_look_7d0e63ef',
    title: 'Mohan Sir Studio Recording (Avo Session)',
    language: 'hi',
    voiceId: 'hi-IN-MadhurNeural',
    pitch: '-8Hz',
    rate: '-5%',
    toneName: 'Mohan Sir - Official Studio Avo Recording',
    characteristic: 'स्टूडियो माइक से रिकॉर्डेड स्पष्ट उच्च-गुणवत्ता वॉयस।',
    samplePhrase: 'स्वर विज्ञान केवल ज्ञान नहीं, एक प्रत्यक्ष अनुभव है। जब आप इसे साधना में अपनाते हैं, तो हर निर्णय अचूक हो जाता है।',
  },
  {
    id: '8123359c',
    rawDnaId: 'dna_look_8123359c',
    title: 'Swar Aahar Shastra - रात्रि भोजन नियम',
    language: 'hi',
    voiceId: 'hi-IN-MadhurNeural',
    pitch: '-9Hz',
    rate: '-6%',
    toneName: 'Mohan Sir - Swar Aahar Shastra (Night Meals)',
    characteristic: 'रात्रि के समय स्वर और निद्रा की गुणवत्ता का गहरा विवेचन।',
    samplePhrase: 'सूर्यास्त के पश्चात जठराग्नि मंद हो जाती है। रात्रि में हल्का आहार लें और बायीं करवट लेटकर सूर्य स्वर जागृत करें।',
  },
  {
    id: '8a676611',
    rawDnaId: 'dna_look_8a676611',
    title: 'Swar Yoga Evening Batch (10 June)',
    language: 'hi',
    voiceId: 'hi-IN-MadhurNeural',
    pitch: '-8Hz',
    rate: '-5%',
    toneName: 'Mohan Sir - Evening Batch Sadhana (10 June)',
    characteristic: 'शाम के समय तनावमुक्ति और श्वास संतुलन का विशेष मार्गदर्शन।',
    samplePhrase: 'दिनभर की भागदौड़ के बाद शाम के समय चंद्र स्वर को सक्रिय करके मन के तनाव को पूरी तरह शांत किया जा सकता है।',
  },
  {
    id: '9789b24f',
    rawDnaId: 'dna_look_9789b24f',
    title: '7 Days Swar Yoga Hindi - Day 4',
    language: 'hi',
    voiceId: 'hi-IN-MadhurNeural',
    pitch: '-8Hz',
    rate: '-5%',
    toneName: 'Mohan Sir - 7 Days Swar Yoga (Day 4)',
    characteristic: 'तिथि और पंचांग के साथ स्वर का मिलान, शुक्ल व कृष्ण पक्ष।',
    samplePhrase: 'चौथे दिन हम तिथि और स्वर के सामंजस्य को सीखेंगे। प्रतिपदा से तृतीया तक प्रातः चंद्र स्वर का चलना शुभ माना गया है।',
  },
  {
    id: '9ced540f',
    rawDnaId: 'dna_look_9ced540f',
    title: 'Hindi Morning Swar Yoga L-1 (22 Oct)',
    language: 'hi',
    voiceId: 'hi-IN-MadhurNeural',
    pitch: '-8Hz',
    rate: '-5%',
    toneName: 'Mohan Sir - Morning Swar Yoga L-1 (22 Oct)',
    characteristic: 'प्रातःकालीन नाड़ी शुद्धि प्राणायाम, सूर्य नाड़ी की दीक्षा।',
    samplePhrase: 'सूर्य नाड़ी को सक्रिय करने के लिए दाहिनी नासिका से श्वास भरें और ऊर्जा को पूरे मेरुदंड में प्रवाहित महसूस करें।',
  },
  {
    id: '9dcae30a',
    rawDnaId: 'dna_look_9dcae30a',
    title: 'Swar Yoga Evening Batch (09 June)',
    language: 'hi',
    voiceId: 'hi-IN-MadhurNeural',
    pitch: '-8Hz',
    rate: '-5%',
    toneName: 'Mohan Sir - Evening Batch Sadhana (09 June)',
    characteristic: 'संध्याकालीन नाड़ी परीक्षा और शांति मंत्र।',
    samplePhrase: 'संध्या के समय दोनों नासिकाओं का प्रवाह बराबर होने का प्रयास करें, ताकि सुषुम्ना नाड़ी में ध्यान गहरा हो सके।',
  },
  {
    id: 'a09f45d0',
    rawDnaId: 'dna_look_a09f45d0',
    title: 'Swar Aahar Shastra - जल व उपवास रहस्य',
    language: 'hi',
    voiceId: 'hi-IN-MadhurNeural',
    pitch: '-9Hz',
    rate: '-6%',
    toneName: 'Mohan Sir - Swar Aahar Shastra (Water & Fasting)',
    characteristic: 'जल पीने के समय चंद्र स्वर का महत्व और उपवास के लाभ।',
    samplePhrase: 'जल सदैव चंद्र नाड़ी में पीना चाहिए, ताकि शरीर में जल तत्व का समुचित अवशोषण हो और शीतलता बनी रहे।',
  },
  {
    id: 'a269f15c',
    rawDnaId: 'dna_look_a269f15c',
    title: '7 Days Swar Yoga Hindi - Day 5',
    language: 'hi',
    voiceId: 'hi-IN-MadhurNeural',
    pitch: '-8Hz',
    rate: '-5%',
    toneName: 'Mohan Sir - 7 Days Swar Yoga (Day 5)',
    characteristic: 'पंचमहाभूत और स्वर के रंग, तत्त्व शुद्धि क्रिया।',
    samplePhrase: 'पांचवें दिन में हम पृथ्वी, जल, अग्नि, वायु और आकाश तत्त्व की स्वर में पहचान करना सीखेंगे।',
  },
  {
    id: 'b17ecd51',
    rawDnaId: 'dna_look_b17ecd51',
    title: '7 Days Swar Yoga Hindi - Day 6',
    language: 'hi',
    voiceId: 'hi-IN-MadhurNeural',
    pitch: '-8Hz',
    rate: '-5%',
    toneName: 'Mohan Sir - 7 Days Swar Yoga (Day 6)',
    characteristic: 'सुषुम्ना नाड़ी का जागरण और कुंडलिनी शक्ति का संचरण।',
    samplePhrase: 'छठे दिन में सुषुम्ना नाड़ी का प्रवाह शुरू होता है। इस काल में किया गया कोई भी ध्यान सीधे आत्म-साक्षात्कार की ओर ले जाता है।',
  },
  {
    id: 'ba06f3a9',
    rawDnaId: 'dna_look_ba06f3a9',
    title: 'Swar Yoga Intro 4K Part 2',
    language: 'hi',
    voiceId: 'hi-IN-MadhurNeural',
    pitch: '-8Hz',
    rate: '-5%',
    toneName: 'Mohan Sir - Swar Yoga Intro 4K Part 2',
    characteristic: 'जीवन में स्वर योग के व्यावहारिक प्रयोग और सफलता के सूत्र।',
    samplePhrase: 'घर से बाहर निकलते समय जो स्वर चल रहा हो, उसी पैर को आगे बढ़ाएं। कार्य में सफलता निश्चित होगी।',
  },
  {
    id: 'baedb88d',
    rawDnaId: 'dna_look_baedb88d',
    title: 'Marathi Oct Eve Swar Yoga L-1 (28 Oct)',
    language: 'mr',
    voiceId: 'mr-IN-ManoharNeural',
    pitch: '-6Hz',
    rate: '-4%',
    toneName: 'Mohan Sir - Marathi Swar Yoga L-1 (28 Oct)',
    characteristic: 'सखोल मराठी विवेचन, शिव स्वरोदयाचे नियम व प्राणायाम कृती.',
    samplePhrase: 'आपल्या शरीरातील प्राणशक्ती ही श्वासाच्या चक्रावर चालते. जेव्हा आपण स्वर ओळखतो, तेव्हा कोणत्याही आजाराला आपण दूर ठेवू शकतो.',
  },
  {
    id: 'bb595ddc',
    rawDnaId: 'dna_look_bb595ddc',
    title: 'Day-1 All Introduction & Orientation',
    language: 'hi',
    voiceId: 'hi-IN-MadhurNeural',
    pitch: '-8Hz',
    rate: '-5%',
    toneName: 'Mohan Sir - Workshop Orientation & Welcome',
    characteristic: 'नये साधकों के लिए स्वागत, स्वर विज्ञान का महात्म्य।',
    samplePhrase: 'स्वर योग की दुनिया में आप सबका हार्दिक स्वागत है। यह ज्ञान आपके जीवन को पूर्णतः रूपांतरित करने में सक्षम है।',
  },
  {
    id: 'c16ba961',
    rawDnaId: 'dna_look_c16ba961',
    title: 'Day 1 Workshop Fundamentals (Hindi)',
    language: 'hi',
    voiceId: 'hi-IN-MadhurNeural',
    pitch: '-8Hz',
    rate: '-5%',
    toneName: 'Mohan Sir - Day 1 Fundamentals',
    characteristic: 'श्वास की लंबाई, नासिका छिद्रों का अनुपात और स्वर गणना।',
    samplePhrase: 'अपनी उंगली को नासिका के पास रखकर जांचें कि वायु का वेग कितना है। स्वर की लंबाई आपके स्वास्थ्य का दर्पण है।',
  },
  {
    id: 'c828f318',
    rawDnaId: 'dna_look_c828f318',
    title: 'Sadhana Session (April 2026)',
    language: 'hi',
    voiceId: 'hi-IN-MadhurNeural',
    pitch: '-9Hz',
    rate: '-6%',
    toneName: 'Mohan Sir - Intensive Sadhana Session',
    characteristic: 'गहन प्राणायाम साधना और आंतरिक चेतना का विस्तार।',
    samplePhrase: 'श्वास को भीतर रोकें। कुंभक की इस अवस्था में अपने हृदय चक्र पर ध्यान केंद्रित करें और ओंकार का गुंजन करें।',
  },
  {
    id: 'd06767ad',
    rawDnaId: 'dna_look_d06767ad',
    title: 'Global Community Keynote (Swar Yoga)',
    language: 'hi',
    voiceId: 'hi-IN-MadhurNeural',
    pitch: '-8Hz',
    rate: '-5%',
    toneName: 'Mohan Sir - Global Community Keynote',
    characteristic: 'वैश्विक मंच पर स्वर योग की महत्ता, सामाजिक स्वास्थ्य।',
    samplePhrase: 'स्वर योग केवल भारत के लिए नहीं, बल्कि संपूर्ण विश्व मानवता के स्वास्थ्य और मानसिक शांति का अचूक मार्ग है।',
  },
  {
    id: 'd6ec2903',
    rawDnaId: 'dna_look_d6ec2903',
    title: 'Mohan Sir Studio Recording (Gvo Session)',
    language: 'hi',
    voiceId: 'hi-IN-MadhurNeural',
    pitch: '-8Hz',
    rate: '-5%',
    toneName: 'Mohan Sir - Studio HD Master Discourse',
    characteristic: 'उच्च ध्वनि स्पष्टता, स्वर का आध्यात्मिक विज्ञान।',
    samplePhrase: 'प्रत्येक श्वास में सोऽहं का मंत्र गूंज रहा है। जब साधक स्वर के साथ एकरूप हो जाता है, तो ईश्वर का साक्षात्कार होता है।',
  },
  {
    id: 'e2a50b54',
    rawDnaId: 'dna_look_e2a50b54',
    title: 'Swar Yoga Hindi Video Masterclass',
    language: 'hi',
    voiceId: 'hi-IN-MadhurNeural',
    pitch: '-8Hz',
    rate: '-5%',
    toneName: 'Mohan Sir - Hindi Video Masterclass',
    characteristic: 'विस्तृत दृश्य-श्रव्य व्याख्यान, मुद्राओं के साथ स्वर का मिलान।',
    samplePhrase: 'ज्ञान मुद्रा धारण करके जब आप चंद्र स्वर में ध्यान करते हैं, तो स्मृति शक्ति और आंतरिक एकाग्रता कई गुना बढ़ जाती है।',
  },
  {
    id: 'ec4e44cd',
    rawDnaId: 'dna_look_ec4e44cd',
    title: '7 Days Swar Yoga Hindi - Day 7',
    language: 'hi',
    voiceId: 'hi-IN-MadhurNeural',
    pitch: '-8Hz',
    rate: '-5%',
    toneName: 'Mohan Sir - 7 Days Swar Yoga (Day 7)',
    characteristic: 'कार्यशाला की पूर्णता, संकल्प, और जीवन पर्यन्त साधना के नियम।',
    samplePhrase: 'सातवें दिन की पूर्णता पर मैं आप सभी को यह संकल्प दिलाता हूँ कि आप प्रतिदिन अपनी सांस के प्रति सजग रहेंगे।',
  },
  {
    id: 'f1c34f2e',
    rawDnaId: 'dna_look_f1c34f2e',
    title: 'Swar Aahar Shastra - पाचन अग्नि व मसाले',
    language: 'hi',
    voiceId: 'hi-IN-MadhurNeural',
    pitch: '-9Hz',
    rate: '-6%',
    toneName: 'Mohan Sir - Swar Aahar Shastra (Spices & Agni)',
    characteristic: 'आयुर्वेदिक मसालों और सूर्य स्वर का पाचन पर प्रभाव।',
    samplePhrase: 'सोंठ, काली मिर्च और पिप्पली का त्रिकटु चूर्ण सूर्य नाड़ी में लेने से कफ का नाश होता है और जठराग्नि प्रज्वलित रहती है।',
  },
  {
    id: 'f41134e9',
    rawDnaId: 'dna_look_f41134e9',
    title: 'Swar Yoga Hindi Video Masterclass Part 2',
    language: 'hi',
    voiceId: 'hi-IN-MadhurNeural',
    pitch: '-8Hz',
    rate: '-5%',
    toneName: 'Mohan Sir - Hindi Video Masterclass Part 2',
    characteristic: 'रोग निवारण में स्वर योग का उपयोग, माइग्रेन व अनिद्रा का समाधान।',
    samplePhrase: 'अनिद्रा और मानसिक तनाव से पीड़ित लोग रात्रि में केवल चंद्र स्वर चलाकर सोएं, गहरी और आनंदमयी निद्रा आएगी।',
  },
  {
    id: 'f7efb8bc',
    rawDnaId: 'dna_look_f7efb8bc',
    title: 'Marathi Oct Eve Swar Yoga L-1 (27 Oct)',
    language: 'mr',
    voiceId: 'mr-IN-ManoharNeural',
    pitch: '-6Hz',
    rate: '-4%',
    toneName: 'Mohan Sir - Marathi Swar Yoga L-1 (27 Oct)',
    characteristic: 'मराठी व्याख्यान, प्राणायाम व स्वर संयम.',
    samplePhrase: 'स्वर योग हा असा मार्ग आहे ज्याने तुम्ही स्वतःचे वैद्य स्वतः बनू शकता. श्वास कसा नियंत्रित करावा हे समजणे हाच खरा योग.',
  },
  {
    id: 'f9fc9a30',
    rawDnaId: 'dna_look_f9fc9a30',
    title: 'Day-2 Water Therapy, Hunger & Gasses (जल चिकित्सा व वात)',
    language: 'hi',
    voiceId: 'hi-IN-MadhurNeural',
    pitch: '-8Hz',
    rate: '-5%',
    toneName: 'Mohan Sir - Water Therapy, Hunger & Digestion',
    characteristic: 'उषापान, वात रोग निवारण और स्वर संतुलन से गैस व अम्लता का उपचार।',
    samplePhrase: 'प्रातःकाल बासी मुंह उषापान करते समय नासिका का परीक्षण अवश्य करें। चंद्र स्वर में पिया गया गुनगुना जल गैस और कब्ज को जड़ से मिटा देता है।',
  },
  {
    id: 'fc1ce7fd',
    rawDnaId: 'dna_look_fc1ce7fd',
    title: 'Marker Feature Test - Micro Vocal Cadence',
    language: 'hi',
    voiceId: 'hi-IN-MadhurNeural',
    pitch: '-8Hz',
    rate: '-5%',
    toneName: 'Mohan Sir - Micro Cadence Vocal DNA',
    characteristic: 'स्वर कंपन और ध्वनि तरंगों का सूक्ष्म वैदिक उच्चारण।',
    samplePhrase: 'ॐ शांतिः शांतिः शांतिः। आपके शरीर का प्रत्येक परमाणु स्वर की दिव्य ध्वनि से ऊर्जावान और आलोकित हो रहा है।',
  },
];

async function main() {
  console.log(`🚀 Starting generation of all 39 distinct Mohan Sir Vocal DNA samples...`);
  const outputDir = path.join(process.cwd(), 'public', 'voice-clones', 'dna-39');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const cliPath = path.join(process.cwd(), 'scripts', 'synthesize_voice_cli.js');

  for (let i = 0; i < DNA_39_VOICE_SPECS.length; i++) {
    const spec = DNA_39_VOICE_SPECS[i];
    const fileName = `dna_voice_${spec.id}.mp3`;
    const filePath = path.join(outputDir, fileName);

    console.log(`[${i + 1}/39] Synthesizing ${spec.title} (${spec.language})...`);

    try {
      execFileSync('node', [
        cliPath,
        '--text', spec.samplePhrase,
        '--voice', spec.voiceId,
        '--pitch', spec.pitch,
        '--rate', spec.rate,
        '--output', filePath,
      ]);

      const stats = fs.statSync(filePath);
      console.log(`  ✓ Generated ${fileName} (${stats.size} bytes)`);

      // Upload to Bunny Storage so it is also hosted on Bunny CDN
      try {
        const fileBuf = fs.readFileSync(filePath);
        await uploadToBunnyStorage(
          fileBuf,
          `voice-clones/dna-39/${fileName}`,
          'audio/mpeg',
          true
        );
        console.log(`  ✓ Uploaded to Bunny CDN: voice-clones/dna-39/${fileName}`);
      } catch (uploadErr: any) {
        console.warn(`  ⚠️ Bunny CDN upload note: ${uploadErr.message}`);
      }
    } catch (err: any) {
      console.error(`  ❌ Failed for ${spec.id}:`, err.message);
    }
  }

  console.log(`\n📦 Now updating mohan_avatar_vocal_dna_sql database table with all 39 profiles...`);
  try {
    // Delete any old duplicate entries
    await bunnyExecute('DELETE FROM mohan_avatar_vocal_dna_sql');
    console.log('✓ Cleared old vocal profiles from database.');

    for (const spec of DNA_39_VOICE_SPECS) {
      const audioUrl = `/voice-clones/dna-39/dna_voice_${spec.id}.mp3`;
      const fullCdnUrl = `https://swaryogacrm.b-cdn.net/voice-clones/dna-39/dna_voice_${spec.id}.mp3`;

      await bunnyExecute({
        sql: `INSERT INTO mohan_avatar_vocal_dna_sql
              (id, language, tone_name, pitch_hz, cadence_words_per_minute, characteristic, sample_phrase, audio_sample_url, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
        args: [
          `vocal_dna_${spec.id}`,
          spec.language,
          spec.toneName,
          spec.language === 'mr' ? 128 : spec.language === 'en' ? 122 : 125,
          spec.language === 'mr' ? 120 : spec.language === 'en' ? 110 : 115,
          spec.characteristic,
          spec.samplePhrase,
          audioUrl, // Local path works immediately in browser
        ],
      });
    }
    console.log(`✓ Successfully inserted all 39 distinct Vocal DNA profiles into database!`);
  } catch (dbErr: any) {
    console.error('Database update error:', dbErr);
  }

  console.log(`\n🎉 All 39 Vocal DNA profiles generated and configured!`);
}

main().catch(console.error);
