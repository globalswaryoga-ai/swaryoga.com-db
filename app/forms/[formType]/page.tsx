'use client';

import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Loader, CheckCircle, User, Mail, Phone, MapPin, Briefcase, Calendar, Globe, BookOpen, Users, Search, ChevronDown, UserCheck, AlertCircle, ShieldCheck } from 'lucide-react';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { workshopCatalog } from '@/lib/workshopsData';

type FormType = 'signup' | 'lead' | 'workshop' | 'sales' | 'inquiry';

interface FormConfig {
  title: string;
  subtitle: string;
  icon: string;
  color: string;
  gradient: string;
  fields: string[];
}

const FORM_CONFIGS: Record<FormType, FormConfig> = {
  signup: {
    title: 'Join Swar Yoga',
    subtitle: 'Create your account and start your wellness journey',
    icon: '🧘',
    color: 'emerald',
    gradient: 'from-emerald-500 to-teal-600',
    fields: ['name', 'email', 'phone', 'countryCode', 'country', 'state', 'gender', 'age', 'profession'],
  },
  lead: {
    title: 'Get Started',
    subtitle: 'Share your details and we\'ll contact you',
    icon: '📋',
    color: 'blue',
    gradient: 'from-blue-500 to-indigo-600',
    fields: ['name', 'email', 'phone', 'countryCode', 'country', 'state', 'interest'],
  },
  workshop: {
    title: 'स्वर योग शिबिर',
    subtitle: '१४ दिवसांचा लाईव्ह ऑनलाइन झूम शिबिर',
    icon: '📚',
    color: 'purple',
    gradient: 'from-purple-500 to-violet-600',
    fields: ['name', 'email', 'phone', 'countryCode', 'country', 'state', 'gender', 'age', 'profession', 'workshopName', 'workshopLanguage', 'workshopMode', 'educationStatus', 'batchPreference'],
  },
  sales: {
    title: 'Course Enrollment',
    subtitle: 'Enroll in our premium courses',
    icon: '🎯',
    color: 'orange',
    gradient: 'from-orange-500 to-amber-600',
    fields: ['name', 'email', 'phone', 'countryCode', 'country', 'state', 'courseName', 'paymentMode'],
  },
  inquiry: {
    title: 'General Inquiry',
    subtitle: 'Have questions? Reach out to us',
    icon: '❓',
    color: 'cyan',
    gradient: 'from-cyan-500 to-blue-600',
    fields: ['name', 'email', 'phone', 'message'],
  },
};

// Auto-populated from workshopsData.ts
const WORKSHOPS = workshopCatalog.map(w => w.name);

const LANGUAGES = [
  { value: 'english', label: 'English' },
  { value: 'hindi', label: 'हिंदी (Hindi)' },
  { value: 'marathi', label: 'मराठी (Marathi)' },
];

const LANGUAGE_OPTIONS = [
  { key: 'english', label: 'English' },
  { key: 'hindi', label: 'हिंदी' },
  { key: 'marathi', label: 'मराठी' },
] as const;

type SupportedLanguage = typeof LANGUAGE_OPTIONS[number]['key'];

type WorkshopBatch = {
  value: string;
  seats: number;
  scheduleId?: string;
  seatsRemaining?: number;
};

// Dates are separated by teaching language so changing the workshop language
// never leaves a date from another class selected.
const WORKSHOP_BATCHES_BY_LANGUAGE: Record<SupportedLanguage, WorkshopBatch[]> = {
  marathi: [
    { value: 'Oct-26 Evening (28th Sep to 14th Oct) (7:00 to 8:15 PM)', seats: 60 },
    { value: 'Nov-26 Morning (14th - 29th Nov) (7:00 AM to 8:15 AM)', seats: 60 },
    { value: 'Dec-26 Evening (4th to 20th Dec) (7:00 to 8:15 PM)', seats: 60 },
    { value: 'Jan-27 Morning (13th - 29th Jan) (7:00 AM to 8:15 AM)', seats: 60 },
    { value: 'Feb-27 Evening (9th to 25th Feb) (7:00 to 8:15 PM)', seats: 60 },
  ],
  hindi: [
    { value: '16th Sep-26 - Evening at 7 PM to 8.15 PM', seats: 40 },
    { value: '13th Nov-26 - Evening at 7 PM to 8.15 PM', seats: 60 },
    { value: '13th Jan-27 - Evening at 7 PM to 8.15 PM', seats: 60 },
    { value: '3rd Oct-26 - Morning at 7 AM to 8.15 AM', seats: 60 },
    { value: '4th Dec-26 - Morning at 7 AM to 8.15 AM', seats: 60 },
    { value: '9th Feb-27 - Morning at 7 AM to 8.15 AM', seats: 60 },
  ],
  english: [
    { value: 'Morning Batch (From 21st September 2026, Time: 9:00 AM IST)', seats: 60 },
    { value: 'Morning Batch (From 12th October 2026, Time: 9:00 AM IST)', seats: 60 },
    { value: 'Morning Batch (From 4th December 2026, Time: 9:00 AM IST)', seats: 60 },
    { value: 'Morning Batch (From 13th January 2027, Time: 9:00 AM IST)', seats: 60 },
    { value: 'Evening Batch (From 21st September 2026, Time: 9:30 PM IST)', seats: 60 },
    { value: 'Evening Batch (From 13th November 2026, Time: 9:30 PM IST)', seats: 60 },
    { value: 'Evening Batch (From 4th December 2026, Time: 9:30 PM IST)', seats: 60 },
    { value: 'Evening Batch (From 9th February 2027, Time: 9:30 PM IST)', seats: 60 },
  ],
};

const LANGUAGE_COPY: Record<SupportedLanguage, {
  heroTitle: string;
  heroBadge: string;
  heroSubtitle: string;
  formHint: string;
  languageLabel: string;
}> = {
  english: {
    heroTitle: 'The Science of Breath (Swar Yoga)',
    heroBadge: 'BOOK NOW',
    heroSubtitle: '14 Days Live',
    formHint: 'Choose your preferred language',
    languageLabel: 'English',
  },
  hindi: {
    heroTitle: 'स्वर विज्ञान (Swar Yoga)',
    heroBadge: 'अभी बुक करें',
    heroSubtitle: '14 दिन लाइव',
    formHint: 'अपनी पसंदीदा भाषा चुनें',
    languageLabel: 'हिंदी',
  },
  marathi: {
    heroTitle: 'शिव स्वरोदय शास्त्र (Swar Yoga)',
    heroBadge: 'बुक नाऊ',
    heroSubtitle: '१४ दिवसांचे लाइव्ह',
    formHint: 'तुमची आवडती भाषा निवडा',
    languageLabel: 'मराठी',
  },
};

const FORM_TEXT: Record<SupportedLanguage, {
  common: {
    fullName: string;
    email: string;
    whatsapp: string;
    country: string;
    state: string;
    gender: string;
    age: string;
    profession: string;
    interest: string;
    message: string;
    required: string;
    select: string;
    optional: string;
    other: string;
  };
  workshop: {
    alreadyRegistered: string;
    alreadyRegisteredHint: string;
    fetch: string;
    sessionInfo: string;
    batchInfo: string;
    workshopName: string;
    workshopLanguage: string;
    mode: string;
    online: string;
    offline: string;
    education: string;
    participantStatus: string;
    district: string;
    city: string;
    batchPreference: string;
    dateTime: string;
    timeAvailable: string;
    videoDuringClass: string;
    regularAttendance: string;
    healthIssues: string;
    device: string;
    donation: string;
    awarenessNote: string;
    awarenessConfirm: string;
    finalConfirm: string;
  };
  actions: {
    register: string;
    submit: string;
    checking: string;
    createPassword: string;
    confirmPassword: string;
    passwordHint: string;
    passwordMatch: string;
    passwordMismatch: string;
    submitted: string;
  };
}> = {
  english: {
    common: {
      fullName: 'Full Name',
      email: 'Email Address',
      whatsapp: 'WhatsApp Number',
      country: 'Country',
      state: 'State / Province',
      gender: 'Gender',
      age: 'Age',
      profession: 'Profession',
      interest: 'What are you interested in?',
      message: 'Your Message',
      required: 'Required',
      select: 'Select',
      optional: 'Optional',
      other: 'Other',
    },
    workshop: {
      alreadyRegistered: 'Already Registered?',
      alreadyRegisteredHint: 'Enter your ID to auto-fill your details.',
      fetch: 'Fetch',
      sessionInfo: 'This 14-day live workshop is conducted online via Zoom.',
      batchInfo: 'Morning slot: 7:00 AM to 8:15 AM and evening slot: 7:00 PM to 8:15 PM.',
      workshopName: 'Workshop Name',
      workshopLanguage: 'Language',
      mode: 'Mode',
      online: 'Online',
      offline: 'Offline',
      education: 'Education / Qualifications',
      participantStatus: 'Are you a new or returning participant?',
      district: 'District',
      city: 'City / Village',
      batchPreference: 'Preferred batch',
      dateTime: 'Workshop date and time',
      timeAvailable: 'Can you attend the full 14-day live workshop?',
      videoDuringClass: 'Will you keep your video on during the live class?',
      regularAttendance: 'Please register only if you can attend all sessions regularly.',
      healthIssues: 'Do you have any health issues? Please describe briefly.',
      device: 'Which device will you use for the workshop?',
      donation: 'The workshop is completely free. Would you be willing to offer Gurudakshina at the end?',
      awarenessNote: 'Please attend all 14 live sessions sincerely and regularly.',
      awarenessConfirm: 'Yes, I understand.',
      finalConfirm: 'Yes, I am ready.',
    },
    actions: {
      register: 'Register & Create Account',
      submit: 'Submit Registration',
      checking: 'Checking if you are already registered...',
      createPassword: 'Create a password to access your account after registration',
      confirmPassword: 'Confirm Password',
      passwordHint: 'Min 6 characters',
      passwordMatch: 'Passwords match',
      passwordMismatch: 'Passwords do not match',
      submitted: 'By submitting, you agree to receive updates via WhatsApp and email.',
    },
  },
  hindi: {
    common: {
      fullName: 'पूरा नाम',
      email: 'ईमेल पता',
      whatsapp: 'व्हाट्सऐप नंबर',
      country: 'देश',
      state: 'राज्य / प्रांत',
      gender: 'लिंग',
      age: 'उम्र',
      profession: 'व्यवसाय',
      interest: 'आपको क्या रुचिकर है?',
      message: 'आपका संदेश',
      required: 'आवश्यक',
      select: 'चुनें',
      optional: 'वैकल्पिक',
      other: 'अन्य',
    },
    workshop: {
      alreadyRegistered: 'पहले से रजिस्टर हैं?',
      alreadyRegisteredHint: 'अपनी आईडी डालें और विवरण अपने आप भरें।',
      fetch: 'खोजें',
      sessionInfo: 'यह 14-दिवसीय लाइव वर्कशॉप ज़ूम पर आयोजित की जाती है।',
      batchInfo: 'सुबह का समय: 7:00 AM से 8:15 AM और शाम का समय: 7:00 PM से 8:15 PM।',
      workshopName: 'वर्कशॉप का नाम',
      workshopLanguage: 'भाषा',
      mode: 'मोड',
      online: 'ऑनलाइन',
      offline: 'ऑफलाइन',
      education: 'शिक्षा / योग्यता',
      participantStatus: 'क्या आप नए प्रतिभागी हैं या दोबारा आ रहे हैं?',
      district: 'जिला',
      city: 'शहर / गाँव',
      batchPreference: 'पसंदीदा बैच',
      dateTime: 'वर्कशॉप की तारीख और समय',
      timeAvailable: 'क्या आप पूरे 14-दिवसीय लाइव वर्कशॉप में शामिल हो सकते हैं?',
      videoDuringClass: 'क्या आप लाइव क्लास के दौरान अपना वीडियो चालू रखेंगे?',
      regularAttendance: 'कृपया तभी रजिस्टर करें जब आप नियमित रूप से उपस्थित रह सकें।',
      healthIssues: 'क्या आपको कोई स्वास्थ्य समस्या है? कृपया बताएं।',
      device: 'वर्कशॉप के लिए आप किस डिवाइस का उपयोग करेंगे?',
      donation: 'यह वर्कशॉप पूरी तरह नि:शुल्क है। क्या आप अंत में अर्पण / गुरुदक्षिणा देने के लिए तैयार हैं?',
      awarenessNote: 'कृपया सभी 14 लाइव सत्रों में ईमानदारी और नियमितता से उपस्थित रहें।',
      awarenessConfirm: 'हाँ, मुझे जानकारी है।',
      finalConfirm: 'हाँ, मैं तैयार हूँ।',
    },
    actions: {
      register: 'रजिस्टर करें और अकाउंट बनाएं',
      submit: 'रजिस्ट्रेशन भेजें',
      checking: 'जांच की जा रही है कि आप पहले से रजिस्टर हैं...',
      createPassword: 'रजिस्ट्रेशन के बाद अपने अकाउंट तक पहुँचने के लिए पासवर्ड बनाएं',
      confirmPassword: 'पासवर्ड की पुष्टि करें',
      passwordHint: 'कम से कम 6 अक्षर',
      passwordMatch: 'पासवर्ड सही है',
      passwordMismatch: 'पासवर्ड समान नहीं है',
      submitted: 'सबमिट करके, आप व्हाट्सऐप और ईमेल के माध्यम से अपडेट पाने के लिए सहमत हैं।',
    },
  },
  marathi: {
    common: {
      fullName: 'पूर्ण नाव',
      email: 'ईमेल पत्ता',
      whatsapp: 'व्हॉट्सअॅप नंबर',
      country: 'देश',
      state: 'राज्य / प्रांत',
      gender: 'लिंग',
      age: 'वय',
      profession: 'व्यवसाय',
      interest: 'तुम्हाला काय आवडते?',
      message: 'तुमचा संदेश',
      required: 'आवश्यक',
      select: 'निवडा',
      optional: 'पर्यायी',
      other: 'इतर',
    },
    workshop: {
      alreadyRegistered: 'आधीच नोंदणी केली आहे?',
      alreadyRegisteredHint: 'तुमचा आयडी टाका आणि तपशील आपोआप भरा.',
      fetch: 'शोधा',
      sessionInfo: 'हे १४ दिवसांचे लाइव्ह वर्कशॉप झूमवर आयोजित केले जाते.',
      batchInfo: 'सकाळचा वेळ: ७:०० ते ८:१५ आणि संध्याकाळी: ७:०० ते ८:१५.',
      workshopName: 'वर्कशॉपचे नाव',
      workshopLanguage: 'भाषा',
      mode: 'मोड',
      online: 'ऑनलाइन',
      offline: 'ऑफलाइन',
      education: 'शिक्षण / पात्रता',
      participantStatus: 'तुम्ही नवीन आहात की पुन्हा येत आहात?',
      district: 'जिल्हा',
      city: 'शहर / गाव',
      batchPreference: 'पसंतीची बॅच',
      dateTime: 'वर्कशॉपची तारीख आणि वेळ',
      timeAvailable: 'तुम्ही संपूर्ण १४ दिवसांच्या लाइव्ह वर्कशॉपमध्ये उपस्थित राहू शकता का?',
      videoDuringClass: 'लाइव्ह क्लासच्या वेळी तुम्ही व्हिडिओ चालू ठेवणार आहात का?',
      regularAttendance: 'तुम्ही सर्व सत्रांना नियमितपणे उपस्थित राहू शकत असाल तरच नोंदणी करा.',
      healthIssues: 'तुमच्याकडे काही आरोग्य समस्या आहेत का? सविस्तर सांगा.',
      device: 'वर्कशॉपसाठी तुम्ही कोणते डिव्हाइस वापरणार आहात?',
      donation: 'हे वर्कशॉप पूर्णपणे मोफत आहे. शेवटी आपण स्वेच्छेने ऐच्छिक देणगी देण्यास तयार आहात का?',
      awarenessNote: 'कृपया सर्व १४ लाइव्ह सत्रांना नियमितपणे आणि प्रामाणिकपणे उपस्थित राहा.',
      awarenessConfirm: 'हो, मला माहिती आहे.',
      finalConfirm: 'होय, मी तयार आहे.',
    },
    actions: {
      register: 'नोंदणी करा आणि खाते तयार करा',
      submit: 'नोंदणी सबमिट करा',
      checking: 'तुम्ही आधीच नोंदणी केले असल्याचे तपासले जात आहे...',
      createPassword: 'नोंदणी झाल्यानंतर आपल्या खात्यावर प्रवेश करण्यासाठी पासवर्ड तयार करा',
      confirmPassword: 'पासवर्ड पुन्हा टाका',
      passwordHint: 'किमान 6 वर्ण',
      passwordMatch: 'पासवर्ड जुळला',
      passwordMismatch: 'पासवर्ड जुळत नाही',
      submitted: 'सबमिट केल्याने, तुम्ही व्हॉट्सअॅप आणि ईमेलद्वारे अपडेट्स मिळण्यास सहमत आहात.',
    },
  },
};

const WORKSHOP_EDUCATION_OPTIONS = [
  'विद्यार्थी',
  'गृहिणी',
  'नौकरी',
  'व्यवसाय',
  'प्रोफेशनल',
  'सेवा निवृत्ती',
  'बेरोजगार',
];

const WORKSHOP_EXPERIENCE_OPTIONS = [
  'मी नवीन विद्यार्थी आहे',
  'मी रिपीट करीत आहे',
  'मी आधी केले आहे पण पूर्ण करू शकलो नाही',
];

const DEVICE_OPTIONS = [
  'Mobile',
  'Tablet',
  'Desktop / iMac',
  'MacBook / Laptop',
];

const WORKSHOP_UI_TEXT = {
  english: {
    introTitle: 'Swar Yoga Workshop Path',
    select: 'Select',
    workshopPlaceholder: 'Select workshop',
    defaultWorkshop: 'Swar Yoga Workshop (L1)',
    genderOptions: ['Male', 'Female', 'Other'],
    educationOptions: ['Schooling (10th/12th)', 'Graduate (Bachelor Degree)', 'Post Graduate (Master Degree)', 'Doctorate / PhD', 'Professional Degree (Engg/Medical/CA/Law)', 'Other'],
    educationExtraPlaceholder: 'Add more education details (optional)',
    experienceOptions: ['I am a new participant', 'I am a returning participant', 'Joining Swar Yoga for the first time', 'Returning student (Sadhak)'],
    deviceOptions: ['Mobile', 'Tablet', 'Desktop / iMac', 'MacBook / Laptop'],
    agePlaceholder: 'e.g. 32',
    districtPlaceholder: 'Enter district',
    cityPlaceholder: 'City / Village',
    timeOptions: ['Yes', 'No'],
    yesNoOptions: ['Yes', 'No'],
    attendanceOptions: ['Yes, 100%', 'Not sure', 'I will attend whenever possible'],
    healthPlaceholder: 'Describe any health issue, if applicable (Optional)',
    donationOptions: ['Yes, I am happy to offer Gurudakshina', 'As per my capacity', 'Looking for a completely free workshop', 'I will decide later'],
    alreadyRegistered: 'Already Registered!',
    welcomeBack: 'You already have an account — no need to create a password.',
    checking: 'Checking if you are already registered...',
    passwordIntro: 'Create a password to access your account after registration',
    passwordLabel: 'Password',
    confirmPasswordLabel: 'Confirm Password',
    reenterPassword: 'Re-enter your password',
    welcomeBackPrefix: 'Welcome back',
    countryHint: 'The country code updates automatically with the country. You can edit it manually.',
    showList: 'Show list',
  },
  hindi: {
    introTitle: 'स्वर योग वर्कशॉप मार्ग',
    select: 'चुनें',
    workshopPlaceholder: 'वर्कशॉप चुनें',
    defaultWorkshop: 'स्वर योग वर्कशॉप (L1)',
    genderOptions: ['पुरुष', 'महिला', 'अन्य'],
    educationOptions: ['स्कूली शिक्षा (10वीं/12वीं)', 'स्नातक (Bachelor Degree)', 'परास्नातक (Master Degree)', 'पीएचडी / डॉक्टरेट', 'व्यावसायिक डिग्री (इंजीनियरिंग/मेडिकल/सीए/लॉ)', 'अन्य'],
    educationExtraPlaceholder: 'अतिरिक्त शिक्षा विवरण लिखें (वैकल्पिक)',
    experienceOptions: ['मैं एक भाग लेने वाला छात्र हूँ (नया)', 'मैं एक भाग लेने वाला छात्र हूँ (दोबारा/पुराना)', 'पहली बार स्वर योग से जुड़ रहा हूँ', 'पुराना साधक / छात्र'],
    deviceOptions: ['मोबाइल', 'टैबलेट', 'डेस्कटॉप / iMac', 'MacBook / लैपटॉप'],
    agePlaceholder: 'उदा. 32',
    districtPlaceholder: 'जिला लिखें',
    cityPlaceholder: 'शहर / गाँव',
    timeOptions: ['हाँ', 'नहीं'],
    yesNoOptions: ['हाँ', 'नहीं'],
    attendanceOptions: ['हाँ, 100%', 'पता नहीं', 'जब भी समय मिलेगा, उपस्थित रहूँगा/रहूँगी'],
    healthPlaceholder: 'यदि कोई स्वास्थ्य समस्या हो तो लिखें (वैकल्पिक)',
    donationOptions: ['हाँ, सहर्ष अर्पण / गुरुदक्षिणा देने हेतु तैयार हूँ', 'अपनी क्षमता अनुसार अर्पण दूँगा/दूँगी', 'पूरी तरह नि:शुल्क की तलाश में', 'बाद में निर्णय लूँगा/लूँगी'],
    alreadyRegistered: 'पहले से रजिस्टर हैं!',
    welcomeBack: 'आपका अकाउंट पहले से है — पासवर्ड बनाने की आवश्यकता नहीं है।',
    checking: 'जाँच की जा रही है कि आप पहले से पंजीकृत हैं...',
    passwordIntro: 'रजिस्ट्रेशन के बाद अपने अकाउंट के लिए पासवर्ड बनाएं',
    passwordLabel: 'पासवर्ड',
    confirmPasswordLabel: 'पासवर्ड की पुष्टि करें',
    reenterPassword: 'पासवर्ड फिर से लिखें',
    welcomeBackPrefix: 'वापसी पर स्वागत है',
    countryHint: 'देश के अनुसार देश का कोड अपने आप बदलता है। आप इसे बदल सकते हैं।',
    showList: 'सूची दिखाएं',
  },
  marathi: {
    introTitle: 'स्वर योग वर्कशॉप मार्ग',
    select: 'निवडा',
    workshopPlaceholder: 'वर्कशॉप निवडा',
    defaultWorkshop: 'स्वर योग वर्कशॉप (L1)',
    genderOptions: ['पुरुष', 'स्त्री', 'इतर'],
    educationOptions: ['शालेय शिक्षण (10वी/12वी)', 'पदवीधर (Bachelor Degree)', 'पदव्युत्तर (Master Degree)', 'पीएचडी / डॉक्टर', 'व्यावसायिक पदवी (इंजिनिअरिंग/मेडिकल/सीए/लॉ)', 'इतर'],
    educationExtraPlaceholder: 'अधिक शिक्षण तपशील लिहा (पर्यायी)',
    experienceOptions: ['मी नवीन विद्यार्थी आहे', 'मी रिपीट करीत आहे', 'मी आधी केले आहे पण पूर्ण करू शकलो नाही'],
    deviceOptions: ['मोबाईल', 'टॅबलेट', 'डेस्कटॉप / iMac', 'MacBook / लॅपटॉप'],
    agePlaceholder: 'उदा. 32',
    districtPlaceholder: 'जिल्हा लिहा',
    cityPlaceholder: 'शहर / गाव',
    timeOptions: ['हो', 'नाही'],
    yesNoOptions: ['हो', 'नाही'],
    attendanceOptions: ['होय, 100%', 'माहित नाही', 'मला वेळ मिळेल तेव्हा मी उपस्थित राहीन'],
    healthPlaceholder: 'उदा. काही विशेष आरोग्य समस्या असल्यास ते सांगा (पर्यायी)',
    donationOptions: ['होय, आनंदाने अर्पण / गुरुदक्षिणा देण्यास तयार आहे', 'माझ्या क्षमतेनुसार अर्पण देईन', 'पूर्णपणे मोफत शोधत आहे', 'नंतर ठरवेन'],
    alreadyRegistered: 'आधीच नोंदणी केली आहे!',
    welcomeBack: 'तुमचे अकाउंट आधीच आहे — पासवर्ड तयार करण्याची गरज नाही.',
    checking: 'तुम्ही आधीच नोंदणी केली आहे का ते तपासले जात आहे...',
    passwordIntro: 'नोंदणीनंतर तुमच्या अकाउंटसाठी पासवर्ड तयार करा',
    passwordLabel: 'पासवर्ड',
    confirmPasswordLabel: 'पासवर्डची पुष्टी करा',
    reenterPassword: 'पासवर्ड पुन्हा लिहा',
    welcomeBackPrefix: 'पुन्हा स्वागत आहे',
    countryHint: 'देशानुसार देशाचा कोड आपोआप बदलतो. तुम्ही तो बदलू शकता.',
    showList: 'यादी दाखवा',
  },
} as const;

// Comprehensive country phone codes with flags (200 countries)
const COUNTRY_PHONE_CODES: Record<string, { code: string; flag: string }> = {
  'Afghanistan': { code: '+93', flag: '🇦🇫' },
  'Albania': { code: '+355', flag: '🇦🇱' },
  'Algeria': { code: '+213', flag: '🇩🇿' },
  'Andorra': { code: '+376', flag: '🇦🇩' },
  'Angola': { code: '+244', flag: '🇦🇴' },
  'Antigua and Barbuda': { code: '+1268', flag: '🇦🇬' },
  'Argentina': { code: '+54', flag: '🇦🇷' },
  'Armenia': { code: '+374', flag: '🇦🇲' },
  'Australia': { code: '+61', flag: '🇦🇺' },
  'Austria': { code: '+43', flag: '🇦🇹' },
  'Azerbaijan': { code: '+994', flag: '🇦🇿' },
  'Bahamas': { code: '+1242', flag: '🇧🇸' },
  'Bahrain': { code: '+973', flag: '🇧🇭' },
  'Bangladesh': { code: '+880', flag: '🇧🇩' },
  'Barbados': { code: '+1246', flag: '🇧🇧' },
  'Belarus': { code: '+375', flag: '🇧🇾' },
  'Belgium': { code: '+32', flag: '🇧🇪' },
  'Belize': { code: '+501', flag: '🇧🇿' },
  'Benin': { code: '+229', flag: '🇧🇯' },
  'Bhutan': { code: '+975', flag: '🇧🇹' },
  'Bolivia': { code: '+591', flag: '🇧🇴' },
  'Bosnia and Herzegovina': { code: '+387', flag: '🇧🇦' },
  'Botswana': { code: '+267', flag: '🇧🇼' },
  'Brazil': { code: '+55', flag: '🇧🇷' },
  'Brunei': { code: '+673', flag: '🇧🇳' },
  'Bulgaria': { code: '+359', flag: '🇧🇬' },
  'Burkina Faso': { code: '+226', flag: '🇧🇫' },
  'Burundi': { code: '+257', flag: '🇧🇮' },
  'Cambodia': { code: '+855', flag: '🇰🇭' },
  'Cameroon': { code: '+237', flag: '🇨🇲' },
  'Canada': { code: '+1', flag: '🇨🇦' },
  'Cape Verde': { code: '+238', flag: '🇨🇻' },
  'Central African Republic': { code: '+236', flag: '🇨🇫' },
  'Chad': { code: '+235', flag: '🇹🇩' },
  'Chile': { code: '+56', flag: '🇨🇱' },
  'China': { code: '+86', flag: '🇨🇳' },
  'Colombia': { code: '+57', flag: '🇨🇴' },
  'Comoros': { code: '+269', flag: '🇰🇲' },
  'Congo': { code: '+242', flag: '🇨🇬' },
  'Costa Rica': { code: '+506', flag: '🇨🇷' },
  'Croatia': { code: '+385', flag: '🇭🇷' },
  'Cuba': { code: '+53', flag: '🇨🇺' },
  'Cyprus': { code: '+357', flag: '🇨🇾' },
  'Czech Republic': { code: '+420', flag: '🇨🇿' },
  'Denmark': { code: '+45', flag: '🇩🇰' },
  'Djibouti': { code: '+253', flag: '🇩🇯' },
  'Dominica': { code: '+1767', flag: '🇩🇲' },
  'Dominican Republic': { code: '+1809', flag: '🇩🇴' },
  'Ecuador': { code: '+593', flag: '🇪🇨' },
  'Egypt': { code: '+20', flag: '🇪🇬' },
  'El Salvador': { code: '+503', flag: '🇸🇻' },
  'Equatorial Guinea': { code: '+240', flag: '🇬🇶' },
  'Eritrea': { code: '+291', flag: '🇪🇷' },
  'Estonia': { code: '+372', flag: '🇪🇪' },
  'Eswatini': { code: '+268', flag: '🇸🇿' },
  'Ethiopia': { code: '+251', flag: '🇪🇹' },
  'Fiji': { code: '+679', flag: '🇫🇯' },
  'Finland': { code: '+358', flag: '🇫🇮' },
  'France': { code: '+33', flag: '🇫🇷' },
  'Gabon': { code: '+241', flag: '🇬🇦' },
  'Gambia': { code: '+220', flag: '🇬🇲' },
  'Georgia': { code: '+995', flag: '🇬🇪' },
  'Germany': { code: '+49', flag: '🇩🇪' },
  'Ghana': { code: '+233', flag: '🇬🇭' },
  'Greece': { code: '+30', flag: '🇬🇷' },
  'Grenada': { code: '+1473', flag: '🇬🇩' },
  'Guatemala': { code: '+502', flag: '🇬🇹' },
  'Guinea': { code: '+224', flag: '🇬🇳' },
  'Guinea-Bissau': { code: '+245', flag: '🇬🇼' },
  'Guyana': { code: '+592', flag: '🇬🇾' },
  'Haiti': { code: '+509', flag: '🇭🇹' },
  'Honduras': { code: '+504', flag: '🇭🇳' },
  'Hungary': { code: '+36', flag: '🇭🇺' },
  'Iceland': { code: '+354', flag: '🇮🇸' },
  'India': { code: '+91', flag: '🇮🇳' },
  'Indonesia': { code: '+62', flag: '🇮🇩' },
  'Iran': { code: '+98', flag: '🇮🇷' },
  'Iraq': { code: '+964', flag: '🇮🇶' },
  'Ireland': { code: '+353', flag: '🇮🇪' },
  'Israel': { code: '+972', flag: '🇮🇱' },
  'Italy': { code: '+39', flag: '🇮🇹' },
  'Ivory Coast': { code: '+225', flag: '🇨🇮' },
  'Jamaica': { code: '+1876', flag: '🇯🇲' },
  'Japan': { code: '+81', flag: '🇯🇵' },
  'Jordan': { code: '+962', flag: '🇯🇴' },
  'Kazakhstan': { code: '+7', flag: '🇰🇿' },
  'Kenya': { code: '+254', flag: '🇰🇪' },
  'Kiribati': { code: '+686', flag: '🇰🇮' },
  'Kosovo': { code: '+383', flag: '🇽🇰' },
  'Kuwait': { code: '+965', flag: '🇰🇼' },
  'Kyrgyzstan': { code: '+996', flag: '🇰🇬' },
  'Laos': { code: '+856', flag: '🇱🇦' },
  'Latvia': { code: '+371', flag: '🇱🇻' },
  'Lebanon': { code: '+961', flag: '🇱🇧' },
  'Lesotho': { code: '+266', flag: '🇱🇸' },
  'Liberia': { code: '+231', flag: '🇱🇷' },
  'Libya': { code: '+218', flag: '🇱🇾' },
  'Liechtenstein': { code: '+423', flag: '🇱🇮' },
  'Lithuania': { code: '+370', flag: '🇱🇹' },
  'Luxembourg': { code: '+352', flag: '🇱🇺' },
  'Madagascar': { code: '+261', flag: '🇲🇬' },
  'Malawi': { code: '+265', flag: '🇲🇼' },
  'Malaysia': { code: '+60', flag: '🇲🇾' },
  'Maldives': { code: '+960', flag: '🇲🇻' },
  'Mali': { code: '+223', flag: '🇲🇱' },
  'Malta': { code: '+356', flag: '🇲🇹' },
  'Marshall Islands': { code: '+692', flag: '🇲🇭' },
  'Mauritania': { code: '+222', flag: '🇲🇷' },
  'Mauritius': { code: '+230', flag: '🇲🇺' },
  'Mexico': { code: '+52', flag: '🇲🇽' },
  'Micronesia': { code: '+691', flag: '🇫🇲' },
  'Moldova': { code: '+373', flag: '🇲🇩' },
  'Monaco': { code: '+377', flag: '🇲🇨' },
  'Mongolia': { code: '+976', flag: '🇲🇳' },
  'Montenegro': { code: '+382', flag: '🇲🇪' },
  'Morocco': { code: '+212', flag: '🇲🇦' },
  'Mozambique': { code: '+258', flag: '🇲🇿' },
  'Myanmar': { code: '+95', flag: '🇲🇲' },
  'Namibia': { code: '+264', flag: '🇳🇦' },
  'Nauru': { code: '+674', flag: '🇳🇷' },
  'Nepal': { code: '+977', flag: '🇳🇵' },
  'Netherlands': { code: '+31', flag: '🇳🇱' },
  'New Zealand': { code: '+64', flag: '🇳🇿' },
  'Nicaragua': { code: '+505', flag: '🇳🇮' },
  'Niger': { code: '+227', flag: '🇳🇪' },
  'Nigeria': { code: '+234', flag: '🇳🇬' },
  'North Korea': { code: '+850', flag: '🇰🇵' },
  'North Macedonia': { code: '+389', flag: '🇲🇰' },
  'Norway': { code: '+47', flag: '🇳🇴' },
  'Oman': { code: '+968', flag: '🇴🇲' },
  'Pakistan': { code: '+92', flag: '🇵🇰' },
  'Palau': { code: '+680', flag: '🇵🇼' },
  'Palestine': { code: '+970', flag: '🇵🇸' },
  'Panama': { code: '+507', flag: '🇵🇦' },
  'Papua New Guinea': { code: '+675', flag: '🇵🇬' },
  'Paraguay': { code: '+595', flag: '🇵🇾' },
  'Peru': { code: '+51', flag: '🇵🇪' },
  'Philippines': { code: '+63', flag: '🇵🇭' },
  'Poland': { code: '+48', flag: '🇵🇱' },
  'Portugal': { code: '+351', flag: '🇵🇹' },
  'Qatar': { code: '+974', flag: '🇶🇦' },
  'Romania': { code: '+40', flag: '🇷🇴' },
  'Russia': { code: '+7', flag: '🇷🇺' },
  'Rwanda': { code: '+250', flag: '🇷🇼' },
  'Saint Kitts and Nevis': { code: '+1869', flag: '🇰🇳' },
  'Saint Lucia': { code: '+1758', flag: '🇱🇨' },
  'Saint Vincent and the Grenadines': { code: '+1784', flag: '🇻🇨' },
  'Samoa': { code: '+685', flag: '🇼🇸' },
  'San Marino': { code: '+378', flag: '🇸🇲' },
  'Sao Tome and Principe': { code: '+239', flag: '🇸🇹' },
  'Saudi Arabia': { code: '+966', flag: '🇸🇦' },
  'Senegal': { code: '+221', flag: '🇸🇳' },
  'Serbia': { code: '+381', flag: '🇷🇸' },
  'Seychelles': { code: '+248', flag: '🇸🇨' },
  'Sierra Leone': { code: '+232', flag: '🇸🇱' },
  'Singapore': { code: '+65', flag: '🇸🇬' },
  'Slovakia': { code: '+421', flag: '🇸🇰' },
  'Slovenia': { code: '+386', flag: '🇸🇮' },
  'Solomon Islands': { code: '+677', flag: '🇸🇧' },
  'Somalia': { code: '+252', flag: '🇸🇴' },
  'South Africa': { code: '+27', flag: '🇿🇦' },
  'South Korea': { code: '+82', flag: '🇰🇷' },
  'South Sudan': { code: '+211', flag: '🇸🇸' },
  'Spain': { code: '+34', flag: '🇪🇸' },
  'Sri Lanka': { code: '+94', flag: '🇱🇰' },
  'Sudan': { code: '+249', flag: '🇸🇩' },
  'Suriname': { code: '+597', flag: '🇸🇷' },
  'Sweden': { code: '+46', flag: '🇸🇪' },
  'Switzerland': { code: '+41', flag: '🇨🇭' },
  'Syria': { code: '+963', flag: '🇸🇾' },
  'Taiwan': { code: '+886', flag: '🇹🇼' },
  'Tajikistan': { code: '+992', flag: '🇹🇯' },
  'Tanzania': { code: '+255', flag: '🇹🇿' },
  'Thailand': { code: '+66', flag: '🇹🇭' },
  'Timor-Leste': { code: '+670', flag: '🇹🇱' },
  'Togo': { code: '+228', flag: '🇹🇬' },
  'Tonga': { code: '+676', flag: '🇹🇴' },
  'Trinidad and Tobago': { code: '+1868', flag: '🇹🇹' },
  'Tunisia': { code: '+216', flag: '🇹🇳' },
  'Turkey': { code: '+90', flag: '🇹🇷' },
  'Turkmenistan': { code: '+993', flag: '🇹🇲' },
  'Tuvalu': { code: '+688', flag: '🇹🇻' },
  'Uganda': { code: '+256', flag: '🇺🇬' },
  'Ukraine': { code: '+380', flag: '🇺🇦' },
  'United Arab Emirates': { code: '+971', flag: '🇦🇪' },
  'United Kingdom': { code: '+44', flag: '🇬🇧' },
  'United States': { code: '+1', flag: '🇺🇸' },
  'Uruguay': { code: '+598', flag: '🇺🇾' },
  'Uzbekistan': { code: '+998', flag: '🇺🇿' },
  'Vanuatu': { code: '+678', flag: '🇻🇺' },
  'Vatican City': { code: '+379', flag: '🇻🇦' },
  'Venezuela': { code: '+58', flag: '🇻🇪' },
  'Vietnam': { code: '+84', flag: '🇻🇳' },
  'Yemen': { code: '+967', flag: '🇾🇪' },
  'Zambia': { code: '+260', flag: '🇿🇲' },
  'Zimbabwe': { code: '+263', flag: '🇿🇼' },
  'Other': { code: '+', flag: '🌍' },
};

// All 196 countries (same as signup page)
const COUNTRIES = [
  'Afghanistan', 'Albania', 'Algeria', 'Andorra', 'Angola', 'Antigua and Barbuda', 'Argentina', 'Armenia', 'Australia', 'Austria',
  'Azerbaijan', 'Bahamas', 'Bahrain', 'Bangladesh', 'Barbados', 'Belarus', 'Belgium', 'Belize', 'Benin', 'Bhutan',
  'Bolivia', 'Bosnia and Herzegovina', 'Botswana', 'Brazil', 'Brunei', 'Bulgaria', 'Burkina Faso', 'Burundi', 'Cambodia', 'Cameroon',
  'Canada', 'Cape Verde', 'Central African Republic', 'Chad', 'Chile', 'China', 'Colombia', 'Comoros', 'Congo', 'Costa Rica',
  'Croatia', 'Cuba', 'Cyprus', 'Czech Republic', 'Denmark', 'Djibouti', 'Dominica', 'Dominican Republic', 'Ecuador', 'Egypt',
  'El Salvador', 'Equatorial Guinea', 'Eritrea', 'Estonia', 'Eswatini', 'Ethiopia', 'Fiji', 'Finland', 'France', 'Gabon',
  'Gambia', 'Georgia', 'Germany', 'Ghana', 'Greece', 'Grenada', 'Guatemala', 'Guinea', 'Guinea-Bissau', 'Guyana',
  'Haiti', 'Honduras', 'Hungary', 'Iceland', 'India', 'Indonesia', 'Iran', 'Iraq', 'Ireland', 'Israel',
  'Italy', 'Ivory Coast', 'Jamaica', 'Japan', 'Jordan', 'Kazakhstan', 'Kenya', 'Kiribati', 'Kosovo', 'Kuwait',
  'Kyrgyzstan', 'Laos', 'Latvia', 'Lebanon', 'Lesotho', 'Liberia', 'Libya', 'Liechtenstein', 'Lithuania', 'Luxembourg',
  'Madagascar', 'Malawi', 'Malaysia', 'Maldives', 'Mali', 'Malta', 'Marshall Islands', 'Mauritania', 'Mauritius', 'Mexico',
  'Micronesia', 'Moldova', 'Monaco', 'Mongolia', 'Montenegro', 'Morocco', 'Mozambique', 'Myanmar', 'Namibia', 'Nauru',
  'Nepal', 'Netherlands', 'New Zealand', 'Nicaragua', 'Niger', 'Nigeria', 'North Korea', 'North Macedonia', 'Norway', 'Oman',
  'Pakistan', 'Palau', 'Palestine', 'Panama', 'Papua New Guinea', 'Paraguay', 'Peru', 'Philippines', 'Poland', 'Portugal',
  'Qatar', 'Romania', 'Russia', 'Rwanda', 'Saint Kitts and Nevis', 'Saint Lucia', 'Saint Vincent and the Grenadines', 'Samoa', 'San Marino', 'Sao Tome and Principe',
  'Saudi Arabia', 'Senegal', 'Serbia', 'Seychelles', 'Sierra Leone', 'Singapore', 'Slovakia', 'Slovenia', 'Solomon Islands', 'Somalia',
  'South Africa', 'South Korea', 'South Sudan', 'Spain', 'Sri Lanka', 'Sudan', 'Suriname', 'Sweden', 'Switzerland', 'Syria',
  'Taiwan', 'Tajikistan', 'Tanzania', 'Thailand', 'Timor-Leste', 'Togo', 'Tonga', 'Trinidad and Tobago', 'Tunisia', 'Turkey',
  'Turkmenistan', 'Tuvalu', 'Uganda', 'Ukraine', 'United Arab Emirates', 'United Kingdom', 'United States', 'Uruguay', 'Uzbekistan', 'Vanuatu',
  'Vatican City', 'Venezuela', 'Vietnam', 'Yemen', 'Zambia', 'Zimbabwe', 'Other'
];

// All states data (copied from signup page)
const STATES_DATA: Record<string, string[]> = {
  'India': ['Andaman and Nicobar Islands', 'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chandigarh', 'Chhattisgarh', 'Dadra and Nagar Haveli', 'Daman and Diu', 'Delhi', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kashmir and Jammu', 'Kerala', 'Ladakh', 'Lakshadweep', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Puducherry', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal'],
  'United States': ['Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey', 'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming'],
  'Canada': ['Alberta', 'British Columbia', 'Manitoba', 'New Brunswick', 'Newfoundland and Labrador', 'Northwest Territories', 'Nova Scotia', 'Nunavut', 'Ontario', 'Prince Edward Island', 'Quebec', 'Saskatchewan', 'Yukon'],
  'Australia': ['Australian Capital Territory', 'New South Wales', 'Northern Territory', 'Queensland', 'South Australia', 'Tasmania', 'Victoria', 'Western Australia'],
  'United Kingdom': ['England', 'Scotland', 'Wales', 'Northern Ireland'],
  'Germany': ['Baden-Württemberg', 'Bavaria', 'Berlin', 'Brandenburg', 'Bremen', 'Hamburg', 'Hesse', 'Lower Saxony', 'Mecklenburg-Vorpommern', 'North Rhine-Westphalia', 'Rhineland-Palatinate', 'Saarland', 'Saxony', 'Saxony-Anhalt', 'Schleswig-Holstein', 'Thuringia'],
  'France': ['Auvergne-Rhône-Alpes', 'Bourgogne-Franche-Comté', 'Brittany', 'Centre-Val de Loire', 'Corsica', 'Grand Est', 'Hauts-de-France', 'Île-de-France', 'Normandy', 'Nouvelle-Aquitaine', 'Occitanie', 'Pays de la Loire', "Provence-Alpes-Côte d'Azur"],
  'Italy': ['Abruzzo', 'Aosta Valley', 'Apulia', 'Basilicata', 'Calabria', 'Campania', 'Emilia-Romagna', 'Friuli-Venezia Giulia', 'Lazio', 'Liguria', 'Lombardy', 'Marche', 'Molise', 'Piedmont', 'Sardinia', 'Sicily', 'Trentino-South Tyrol', 'Tuscany', 'Umbria', 'Veneto'],
  'Spain': ['Andalusia', 'Aragon', 'Asturias', 'Balearic Islands', 'Basque Country', 'Canary Islands', 'Cantabria', 'Castile and León', 'Castile-La Mancha', 'Catalonia', 'Ceuta', 'Extremadura', 'Galicia', 'La Rioja', 'Madrid', 'Melilla', 'Murcia', 'Navarre', 'Valencian Community'],
  'Japan': ['Hokkaido', 'Aomori', 'Iwate', 'Miyagi', 'Akita', 'Yamagata', 'Fukushima', 'Ibaraki', 'Tochigi', 'Gunma', 'Saitama', 'Chiba', 'Tokyo', 'Kanagawa', 'Niigata', 'Toyama', 'Ishikawa', 'Fukui', 'Yamanashi', 'Nagano', 'Gifu', 'Shizuoka', 'Aichi', 'Mie', 'Shiga', 'Kyoto', 'Osaka', 'Hyogo', 'Nara', 'Wakayama', 'Tottori', 'Shimane', 'Okayama', 'Hiroshima', 'Yamaguchi', 'Tokushima', 'Kagawa', 'Ehime', 'Kochi', 'Fukuoka', 'Saga', 'Nagasaki', 'Kumamoto', 'Oita', 'Miyazaki', 'Kagoshima', 'Okinawa'],
  'China': ['Beijing', 'Shanghai', 'Tianjin', 'Chongqing', 'Hebei', 'Shanxi', 'Liaoning', 'Jilin', 'Heilongjiang', 'Jiangsu', 'Zhejiang', 'Anhui', 'Fujian', 'Jiangxi', 'Shandong', 'Henan', 'Hubei', 'Hunan', 'Guangdong', 'Hainan', 'Sichuan', 'Guizhou', 'Yunnan', 'Shaanxi', 'Gansu', 'Qinghai', 'Taiwan', 'Guangxi', 'Inner Mongolia', 'Tibet', 'Ningxia', 'Xinjiang', 'Hong Kong', 'Macau'],
  'Brazil': ['Acre', 'Alagoas', 'Amapá', 'Amazonas', 'Bahia', 'Ceará', 'Distrito Federal', 'Espírito Santo', 'Goiás', 'Maranhão', 'Mato Grosso', 'Mato Grosso do Sul', 'Minas Gerais', 'Pará', 'Paraíba', 'Paraná', 'Pernambuco', 'Piauí', 'Rio de Janeiro', 'Rio Grande do Norte', 'Rio Grande do Sul', 'Rondônia', 'Roraima', 'Santa Catarina', 'São Paulo', 'Sergipe', 'Tocantins'],
  'Mexico': ['Aguascalientes', 'Baja California', 'Baja California Sur', 'Campeche', 'Chiapas', 'Chihuahua', 'Coahuila', 'Colima', 'Durango', 'Guanajuato', 'Guerrero', 'Hidalgo', 'Jalisco', 'Mexico City', 'México', 'Michoacán', 'Morelos', 'Nayarit', 'Nuevo León', 'Oaxaca', 'Puebla', 'Querétaro', 'Quintana Roo', 'San Luis Potosí', 'Sinaloa', 'Sonora', 'Tabasco', 'Tamaulipas', 'Tlaxcala', 'Veracruz', 'Yucatán', 'Zacatecas'],
  'Nepal': ['Koshi Pradesh', 'Madhesh Pradesh', 'Bagmati Pradesh', 'Gandaki Pradesh', 'Lumbini Pradesh', 'Karnali Pradesh', 'Sudurpashchim Pradesh'],
  'United Arab Emirates': ['Abu Dhabi', 'Ajman', 'Dubai', 'Fujairah', 'Ras Al Khaimah', 'Sharjah', 'Umm Al Quwain'],
  'Singapore': ['Central Region', 'East Region', 'North Region', 'North-East Region', 'West Region'],
  'South Africa': ['Eastern Cape', 'Free State', 'Gauteng', 'KwaZulu-Natal', 'Limpopo', 'Mpumalanga', 'North West', 'Northern Cape', 'Western Cape'],
  'Russia': ['Central Federal District', 'Northwestern Federal District', 'Southern Federal District', 'North Caucasian Federal District', 'Volga Federal District', 'Ural Federal District', 'Siberian Federal District', 'Far Eastern Federal District'],
  'Pakistan': ['Azad Kashmir', 'Balochistan', 'Gilgit-Baltistan', 'Islamabad Capital Territory', 'Khyber Pakhtunkhwa', 'Punjab', 'Sindh'],
  'Bangladesh': ['Barishal', 'Chattogram', 'Dhaka', 'Khulna', 'Mymensingh', 'Rajshahi', 'Rangpur', 'Sylhet'],
  'Sri Lanka': ['Central Province', 'Eastern Province', 'North Central Province', 'Northern Province', 'North Western Province', 'Sabaragamuwa Province', 'Southern Province', 'Uva Province', 'Western Province'],
  'Indonesia': ['Aceh', 'Bali', 'Banten', 'Bengkulu', 'Central Java', 'Central Kalimantan', 'Central Sulawesi', 'East Java', 'East Kalimantan', 'East Nusa Tenggara', 'Gorontalo', 'Jakarta', 'Jambi', 'Lampung', 'Maluku', 'North Kalimantan', 'North Maluku', 'North Sulawesi', 'North Sumatra', 'Papua', 'Riau', 'Riau Islands', 'South Kalimantan', 'South Sulawesi', 'South Sumatra', 'Southeast Sulawesi', 'West Java', 'West Kalimantan', 'West Nusa Tenggara', 'West Papua', 'West Sulawesi', 'West Sumatra', 'Yogyakarta'],
  'Malaysia': ['Johor', 'Kedah', 'Kelantan', 'Kuala Lumpur', 'Labuan', 'Melaka', 'Negeri Sembilan', 'Pahang', 'Penang', 'Perak', 'Perlis', 'Putrajaya', 'Sabah', 'Sarawak', 'Selangor', 'Terengganu'],
  'Thailand': ['Bangkok', 'Chiang Mai', 'Chiang Rai', 'Chonburi', 'Khon Kaen', 'Krabi', 'Nakhon Ratchasima', 'Nonthaburi', 'Pathum Thani', 'Phuket', 'Samut Prakan', 'Songkhla', 'Surat Thani', 'Udon Thani'],
  'Vietnam': ['An Giang', 'Ba Ria-Vung Tau', 'Bac Giang', 'Bac Kan', 'Bac Lieu', 'Bac Ninh', 'Ben Tre', 'Binh Dinh', 'Binh Duong', 'Binh Phuoc', 'Binh Thuan', 'Ca Mau', 'Can Tho', 'Cao Bang', 'Da Nang', 'Dak Lak', 'Dak Nong', 'Dien Bien', 'Dong Nai', 'Dong Thap', 'Gia Lai', 'Ha Giang', 'Ha Nam', 'Ha Noi', 'Ha Tinh', 'Hai Duong', 'Hai Phong', 'Hau Giang', 'Ho Chi Minh City', 'Hoa Binh', 'Hung Yen', 'Khanh Hoa', 'Kien Giang', 'Kon Tum', 'Lai Chau', 'Lam Dong', 'Lang Son', 'Lao Cai', 'Long An', 'Nam Dinh', 'Nghe An', 'Ninh Binh', 'Ninh Thuan', 'Phu Tho', 'Phu Yen', 'Quang Binh', 'Quang Nam', 'Quang Ngai', 'Quang Ninh', 'Quang Tri', 'Soc Trang', 'Son La', 'Tay Ninh', 'Thai Binh', 'Thai Nguyen', 'Thanh Hoa', 'Thua Thien Hue', 'Tien Giang', 'Tra Vinh', 'Tuyen Quang', 'Vinh Long', 'Vinh Phuc', 'Yen Bai'],
  'Philippines': ['Ilocos Region', 'Cagayan Valley', 'Central Luzon', 'CALABARZON', 'MIMAROPA', 'Bicol Region', 'Western Visayas', 'Central Visayas', 'Eastern Visayas', 'Zamboanga Peninsula', 'Northern Mindanao', 'Davao Region', 'SOCCSKSARGEN', 'Caraga', 'NCR (Metro Manila)', 'CAR', 'BARMM'],
  'South Korea': ['Seoul', 'Busan', 'Daegu', 'Incheon', 'Gwangju', 'Daejeon', 'Ulsan', 'Sejong', 'Gyeonggi', 'Gangwon', 'North Chungcheong', 'South Chungcheong', 'North Jeolla', 'South Jeolla', 'North Gyeongsang', 'South Gyeongsang', 'Jeju'],
  'Netherlands': ['Drenthe', 'Flevoland', 'Friesland', 'Gelderland', 'Groningen', 'Limburg', 'North Brabant', 'North Holland', 'Overijssel', 'South Holland', 'Utrecht', 'Zeeland'],
  'Belgium': ['Brussels-Capital Region', 'Flemish Region', 'Walloon Region', 'Antwerp', 'East Flanders', 'Flemish Brabant', 'Hainaut', 'Liège', 'Limburg', 'Luxembourg', 'Namur', 'Walloon Brabant', 'West Flanders'],
  'Switzerland': ['Aargau', 'Appenzell Ausserrhoden', 'Appenzell Innerrhoden', 'Basel-Landschaft', 'Basel-Stadt', 'Bern', 'Fribourg', 'Geneva', 'Glarus', 'Graubünden', 'Jura', 'Lucerne', 'Neuchâtel', 'Nidwalden', 'Obwalden', 'Schaffhausen', 'Schwyz', 'Solothurn', 'St. Gallen', 'Thurgau', 'Ticino', 'Uri', 'Valais', 'Vaud', 'Zug', 'Zürich'],
  'Austria': ['Burgenland', 'Carinthia', 'Lower Austria', 'Salzburg', 'Styria', 'Tyrol', 'Upper Austria', 'Vienna', 'Vorarlberg'],
  'Poland': ['Greater Poland', 'Kuyavian-Pomeranian', 'Lesser Poland', 'Łódź', 'Lower Silesian', 'Lublin', 'Lubusz', 'Masovian', 'Opole', 'Podkarpackie', 'Podlaskie', 'Pomeranian', 'Silesian', 'Świętokrzyskie', 'Warmian-Masurian', 'West Pomeranian'],
  'Turkey': ['Marmara Region', 'Central Anatolia Region', 'Aegean Region', 'Mediterranean Region', 'Black Sea Region', 'Eastern Anatolia Region', 'Southeastern Anatolia Region', 'Istanbul', 'Ankara', 'Izmir', 'Bursa', 'Antalya', 'Adana', 'Konya', 'Gaziantep'],
  'Egypt': ['Alexandria', 'Aswan', 'Asyut', 'Beheira', 'Beni Suef', 'Cairo', 'Dakahlia', 'Damietta', 'Faiyum', 'Gharbia', 'Giza', 'Ismailia', 'Kafr El Sheikh', 'Luxor', 'Matruh', 'Minya', 'Monufia', 'New Valley', 'North Sinai', 'Port Said', 'Qalyubia', 'Qena', 'Red Sea', 'Sharqia', 'Sohag', 'South Sinai', 'Suez'],
  'Saudi Arabia': ['Riyadh', 'Makkah', 'Madinah', 'Eastern Province', 'Asir', 'Tabuk', 'Hail', 'Northern Borders', 'Jazan', 'Najran', 'Al-Bahah', 'Al-Jawf', 'Qassim'],
  'Iran': ['Tehran', 'Isfahan', 'Fars', 'Razavi Khorasan', 'East Azerbaijan', 'Khuzestan', 'Mazandaran', 'Kerman', 'Alborz', 'Gilan', 'West Azerbaijan', 'Sistan and Baluchestan', 'Hormozgan', 'Kurdistan', 'Hamadan', 'Lorestan', 'Kermanshah', 'Golestan', 'Markazi', 'Yazd', 'Ardabil', 'Bushehr', 'Zanjan', 'Qom', 'Qazvin', 'Chaharmahal and Bakhtiari', 'South Khorasan', 'North Khorasan', 'Semnan', 'Kohgiluyeh and Boyer-Ahmad', 'Ilam'],
  'Iraq': ['Baghdad', 'Basra', 'Nineveh', 'Erbil', 'Sulaymaniyah', 'Kirkuk', 'Dohuk', 'Anbar', 'Dhi Qar', 'Babylon', 'Diyala', 'Najaf', 'Karbala', 'Wasit', 'Maysan', 'Muthanna', 'Qadisiyyah', 'Saladin'],
  'Kenya': ['Nairobi', 'Mombasa', 'Kisumu', 'Nakuru', 'Eldoret', 'Kiambu', 'Machakos', 'Kajiado', 'Nyeri', 'Meru', 'Kilifi', 'Uasin Gishu', 'Trans Nzoia', 'Kakamega', 'Bungoma', 'Kisii', 'Migori', 'Homa Bay', 'Siaya', 'Nandi'],
  'Nigeria': ['Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue', 'Borno', 'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu', 'FCT Abuja', 'Gombe', 'Imo', 'Jigawa', 'Kaduna', 'Kano', 'Katsina', 'Kebbi', 'Kogi', 'Kwara', 'Lagos', 'Nasarawa', 'Niger', 'Ogun', 'Ondo', 'Osun', 'Oyo', 'Plateau', 'Rivers', 'Sokoto', 'Taraba', 'Yobe', 'Zamfara'],
  'Ghana': ['Greater Accra', 'Ashanti', 'Western', 'Central', 'Eastern', 'Volta', 'Northern', 'Upper East', 'Upper West', 'Brong-Ahafo', 'Bono East', 'Ahafo', 'Savannah', 'North East', 'Oti', 'Western North'],
  'Tanzania': ['Dar es Salaam', 'Arusha', 'Dodoma', 'Mwanza', 'Zanzibar', 'Kilimanjaro', 'Tanga', 'Morogoro', 'Mbeya', 'Iringa', 'Tabora', 'Kagera', 'Mara', 'Shinyanga', 'Kigoma'],
  'Ethiopia': ['Addis Ababa', 'Afar', 'Amhara', 'Benishangul-Gumuz', 'Dire Dawa', 'Gambela', 'Harari', 'Oromia', 'Sidama', 'SNNPR', 'Somali', 'Tigray'],
  'Morocco': ['Casablanca-Settat', 'Rabat-Salé-Kénitra', 'Tangier-Tétouan-Al Hoceima', 'Fès-Meknès', 'Marrakech-Safi', 'Souss-Massa', 'Béni Mellal-Khénifra', 'Drâa-Tafilalet', 'Oriental', 'Guelmim-Oued Noun', 'Laâyoune-Sakia El Hamra', 'Dakhla-Oued Ed-Dahab'],
  'Argentina': ['Buenos Aires', 'Buenos Aires City', 'Catamarca', 'Chaco', 'Chubut', 'Córdoba', 'Corrientes', 'Entre Ríos', 'Formosa', 'Jujuy', 'La Pampa', 'La Rioja', 'Mendoza', 'Misiones', 'Neuquén', 'Río Negro', 'Salta', 'San Juan', 'San Luis', 'Santa Cruz', 'Santa Fe', 'Santiago del Estero', 'Tierra del Fuego', 'Tucumán'],
  'Colombia': ['Amazonas', 'Antioquia', 'Arauca', 'Atlántico', 'Bogotá D.C.', 'Bolívar', 'Boyacá', 'Caldas', 'Caquetá', 'Casanare', 'Cauca', 'Cesar', 'Chocó', 'Córdoba', 'Cundinamarca', 'Guainía', 'Guaviare', 'Huila', 'La Guajira', 'Magdalena', 'Meta', 'Nariño', 'Norte de Santander', 'Putumayo', 'Quindío', 'Risaralda', 'San Andrés', 'Santander', 'Sucre', 'Tolima', 'Valle del Cauca', 'Vaupés', 'Vichada'],
  'Chile': ['Arica y Parinacota', 'Tarapacá', 'Antofagasta', 'Atacama', 'Coquimbo', 'Valparaíso', 'Metropolitana de Santiago', "O'Higgins", 'Maule', 'Ñuble', 'Biobío', 'La Araucanía', 'Los Ríos', 'Los Lagos', 'Aysén', 'Magallanes'],
  'Peru': ['Amazonas', 'Áncash', 'Apurímac', 'Arequipa', 'Ayacucho', 'Cajamarca', 'Callao', 'Cusco', 'Huancavelica', 'Huánuco', 'Ica', 'Junín', 'La Libertad', 'Lambayeque', 'Lima', 'Loreto', 'Madre de Dios', 'Moquegua', 'Pasco', 'Piura', 'Puno', 'San Martín', 'Tacna', 'Tumbes', 'Ucayali'],
  'Venezuela': ['Amazonas', 'Anzoátegui', 'Apure', 'Aragua', 'Barinas', 'Bolívar', 'Carabobo', 'Caracas D.C.', 'Cojedes', 'Delta Amacuro', 'Falcón', 'Guárico', 'Lara', 'Mérida', 'Miranda', 'Monagas', 'Nueva Esparta', 'Portuguesa', 'Sucre', 'Táchira', 'Trujillo', 'Vargas', 'Yaracuy', 'Zulia'],
  'New Zealand': ['Auckland', 'Bay of Plenty', 'Canterbury', 'Gisborne', "Hawke's Bay", 'Manawatū-Whanganui', 'Marlborough', 'Nelson', 'Northland', 'Otago', 'Southland', 'Taranaki', 'Tasman', 'Waikato', 'Wellington', 'West Coast'],
  'Ireland': ['Carlow', 'Cavan', 'Clare', 'Cork', 'Donegal', 'Dublin', 'Galway', 'Kerry', 'Kildare', 'Kilkenny', 'Laois', 'Leitrim', 'Limerick', 'Longford', 'Louth', 'Mayo', 'Meath', 'Monaghan', 'Offaly', 'Roscommon', 'Sligo', 'Tipperary', 'Waterford', 'Westmeath', 'Wexford', 'Wicklow'],
  'Portugal': ['Aveiro', 'Beja', 'Braga', 'Bragança', 'Castelo Branco', 'Coimbra', 'Évora', 'Faro', 'Guarda', 'Leiria', 'Lisbon', 'Portalegre', 'Porto', 'Santarém', 'Setúbal', 'Viana do Castelo', 'Vila Real', 'Viseu', 'Azores', 'Madeira'],
  'Greece': ['Attica', 'Central Greece', 'Central Macedonia', 'Crete', 'Eastern Macedonia and Thrace', 'Epirus', 'Ionian Islands', 'North Aegean', 'Peloponnese', 'South Aegean', 'Thessaly', 'Western Greece', 'Western Macedonia'],
  'Sweden': ['Blekinge', 'Dalarna', 'Gävleborg', 'Gotland', 'Halland', 'Jämtland', 'Jönköping', 'Kalmar', 'Kronoberg', 'Norrbotten', 'Örebro', 'Östergötland', 'Skåne', 'Södermanland', 'Stockholm', 'Uppsala', 'Värmland', 'Västerbotten', 'Västernorrland', 'Västmanland', 'Västra Götaland'],
  'Norway': ['Agder', 'Innlandet', 'Møre og Romsdal', 'Nordland', 'Oslo', 'Rogaland', 'Troms og Finnmark', 'Trøndelag', 'Vestfold og Telemark', 'Vestland', 'Viken'],
  'Denmark': ['Capital Region', 'Central Denmark Region', 'North Denmark Region', 'Region Zealand', 'Region of Southern Denmark'],
  'Finland': ['Uusimaa', 'Southwest Finland', 'Satakunta', 'Kanta-Häme', 'Pirkanmaa', 'Päijät-Häme', 'Kymenlaakso', 'South Karelia', 'South Savo', 'North Savo', 'North Karelia', 'Central Finland', 'South Ostrobothnia', 'Ostrobothnia', 'Central Ostrobothnia', 'North Ostrobothnia', 'Kainuu', 'Lapland', 'Åland'],
  'Czech Republic': ['Prague', 'Central Bohemian', 'South Bohemian', 'Plzeň', 'Karlovy Vary', 'Ústí nad Labem', 'Liberec', 'Hradec Králové', 'Pardubice', 'Vysočina', 'South Moravian', 'Olomouc', 'Zlín', 'Moravian-Silesian'],
  'Hungary': ['Budapest', 'Baranya', 'Bács-Kiskun', 'Békés', 'Borsod-Abaúj-Zemplén', 'Csongrád-Csanád', 'Fejér', 'Győr-Moson-Sopron', 'Hajdú-Bihar', 'Heves', 'Jász-Nagykun-Szolnok', 'Komárom-Esztergom', 'Nógrád', 'Pest', 'Somogy', 'Szabolcs-Szatmár-Bereg', 'Tolna', 'Vas', 'Veszprém', 'Zala'],
  'Romania': ['Bucharest', 'Alba', 'Arad', 'Argeș', 'Bacău', 'Bihor', 'Bistrița-Năsăud', 'Botoșani', 'Brăila', 'Brașov', 'Buzău', 'Călărași', 'Caraș-Severin', 'Cluj', 'Constanța', 'Covasna', 'Dâmbovița', 'Dolj', 'Galați', 'Giurgiu', 'Gorj', 'Harghita', 'Hunedoara', 'Ialomița', 'Iași', 'Ilfov', 'Maramureș', 'Mehedinți', 'Mureș', 'Neamț', 'Olt', 'Prahova', 'Sălaj', 'Satu Mare', 'Sibiu', 'Suceava', 'Teleorman', 'Timiș', 'Tulcea', 'Vâlcea', 'Vaslui', 'Vrancea'],
  'Ukraine': ['Kyiv', 'Cherkasy', 'Chernihiv', 'Chernivtsi', 'Dnipropetrovsk', 'Donetsk', 'Ivano-Frankivsk', 'Kharkiv', 'Kherson', 'Khmelnytskyi', 'Kirovohrad', 'Luhansk', 'Lviv', 'Mykolaiv', 'Odessa', 'Poltava', 'Rivne', 'Sumy', 'Ternopil', 'Vinnytsia', 'Volyn', 'Zakarpattia', 'Zaporizhzhia', 'Zhytomyr'],
  'Qatar': ['Doha', 'Al Rayyan', 'Al Wakrah', 'Al Khor', 'Al Shamal', 'Al Daayen', 'Umm Salal', 'Al Shahaniya'],
  'Kuwait': ['Al Asimah', 'Hawalli', 'Al Farwaniyah', 'Al Ahmadi', 'Mubarak Al-Kabeer', 'Al Jahra'],
  'Oman': ['Muscat', 'Dhofar', 'Musandam', 'Al Buraimi', 'Ad Dakhiliyah', 'Al Batinah North', 'Al Batinah South', 'Ash Sharqiyah South', 'Ash Sharqiyah North', 'Ad Dhahirah', 'Al Wusta'],
  'Bahrain': ['Capital Governorate', 'Muharraq Governorate', 'Northern Governorate', 'Southern Governorate'],
  'Jordan': ['Amman', 'Irbid', 'Zarqa', 'Balqa', 'Mafraq', 'Karak', 'Tafilah', 'Maan', 'Aqaba', 'Jerash', 'Ajloun', 'Madaba'],
  'Lebanon': ['Beirut', 'Mount Lebanon', 'North Lebanon', 'South Lebanon', 'Beqaa', 'Nabatieh', 'Akkar', 'Baalbek-Hermel'],
  'Myanmar': ['Ayeyarwady', 'Bago', 'Chin', 'Kachin', 'Kayah', 'Kayin', 'Magway', 'Mandalay', 'Mon', 'Naypyidaw', 'Rakhine', 'Sagaing', 'Shan', 'Tanintharyi', 'Yangon'],
  'Cambodia': ['Phnom Penh', 'Banteay Meanchey', 'Battambang', 'Kampong Cham', 'Kampong Chhnang', 'Kampong Speu', 'Kampong Thom', 'Kampot', 'Kandal', 'Kep', 'Koh Kong', 'Kratie', 'Mondulkiri', 'Oddar Meanchey', 'Pailin', 'Preah Sihanouk', 'Preah Vihear', 'Prey Veng', 'Pursat', 'Ratanakiri', 'Siem Reap', 'Stung Treng', 'Svay Rieng', 'Takeo', 'Tboung Khmum'],
};

// Get states for a country (with "Other" option)
const getStatesList = (countryName: string): string[] => {
  const states = STATES_DATA[countryName] || [];
  return states.length > 0 ? [...states, 'Other'] : [];
};

// Suspense wrapper required for useSearchParams() in Next.js 14
export default function DynamicFormPageWrapper() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader className="animate-spin text-purple-600" size={32} />
      </div>
    }>
      <DynamicFormPage />
    </Suspense>
  );
}

function DynamicFormPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  
  const rawFormTypeParam = String(params.formType || 'lead');
  const isWorkshopAlias = rawFormTypeParam.toLowerCase().includes('workshop');
  const formType: FormType = isWorkshopAlias
    ? 'workshop'
    : (FORM_CONFIGS[rawFormTypeParam as FormType] ? (rawFormTypeParam as FormType) : 'lead');
  
  // Get URL params for pre-filling
  const workshopParam = searchParams.get('workshop');
  const sourceParam = searchParams.get('source');
  const refParam = searchParams.get('ref');
  const langParam = searchParams.get('lang') || searchParams.get('language');
  
  const config = FORM_CONFIGS[formType] || FORM_CONFIGS.lead;
  
  const initialLang: SupportedLanguage = (langParam === 'marathi' || langParam === 'mr')
    ? 'marathi'
    : (langParam === 'hindi' || langParam === 'hi')
    ? 'hindi'
    : 'english';

  const [selectedLanguage, setSelectedLanguage] = useState<SupportedLanguage>(initialLang);
  const formText = FORM_TEXT[selectedLanguage];
  const commonText = formText.common;
  const workshopText = formText.workshop;
  const actionText = formText.actions;
  const workshopUi = WORKSHOP_UI_TEXT[selectedLanguage];
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  
  // User ID lookup (optional - for existing users)
  const [userId, setUserId] = useState('');
  const [lookupLoading, setLookupLoading] = useState(false);
  const [userFound, setUserFound] = useState(false);
  
  // Dynamic countries and states
  const [countries] = useState<string[]>(COUNTRIES);
  const [states, setStates] = useState<string[]>([]);
  const [customState, setCustomState] = useState('');
  const [useCustomState, setUseCustomState] = useState(false);
  const [showCountryCodeInput, setShowCountryCodeInput] = useState(false);

  // Dynamic questions state
  const [dynamicQuestions, setDynamicQuestions] = useState<any[]>([]);
  const [dynamicAnswers, setDynamicAnswers] = useState<Record<string, any>>({});

  useEffect(() => {
    let isMounted = true;
    async function loadDynamicQuestions() {
      try {
        const res = await fetch(`/api/forms/questions?formType=${encodeURIComponent(formType)}`);
        const json = await res.json();
        if (isMounted && json.success && Array.isArray(json.questions)) {
          setDynamicQuestions(json.questions);
        }
      } catch (err) {
        console.error('Failed to load dynamic questions:', err);
      }
    }
    loadDynamicQuestions();
    return () => {
      isMounted = false;
    };
  }, [formType]);
  
  const handleLanguageChange = (nextLanguage: SupportedLanguage) => {
    setSelectedLanguage(nextLanguage);
    setWorkshopLanguage(nextLanguage === 'english' ? 'english' : nextLanguage === 'hindi' ? 'hindi' : 'marathi');
    setBatchPreference('');
    setAdminWorkshopBatches([]);
  };

  // Form fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [countryCode, setCountryCode] = useState('+91');
  const [country, setCountry] = useState('India');
  const [state, setState] = useState('');
  const [gender, setGender] = useState('');
  const [age, setAge] = useState('');
  const [profession, setProfession] = useState('');
  const [interest, setInterest] = useState('');
  const defaultWorkshop = workshopParam || (
    rawFormTypeParam.toLowerCase().includes('l1')
      ? 'Swar Yoga Workshop (L1)'
      : WORKSHOP_UI_TEXT.english.defaultWorkshop
  );
  const [workshopName, setWorkshopName] = useState(defaultWorkshop);
  const [workshopLanguage, setWorkshopLanguage] = useState<SupportedLanguage>(initialLang);
  const workshopMode = 'online' as const;
  const [educationStatus, setEducationStatus] = useState('');
  const [customEducation, setCustomEducation] = useState('');
  const [batchPreference, setBatchPreference] = useState('');
  const [participantStatus, setParticipantStatus] = useState('');
  const [city, setCity] = useState('');
  const [timeAvailable, setTimeAvailable] = useState('');
  const [videoOnDuringClass, setVideoOnDuringClass] = useState('');
  const [regularAttendance, setRegularAttendance] = useState('');
  const [healthIssues, setHealthIssues] = useState('');
  const [deviceForWorkshop, setDeviceForWorkshop] = useState('');
  const [donationReady, setDonationReady] = useState('');
  const [awarenessConfirmed, setAwarenessConfirmed] = useState(false);
  const [finalConfirmation, setFinalConfirmation] = useState(false);
  const [courseName, setCourseName] = useState('');
  const [paymentMode, setPaymentMode] = useState('');
  const [message, setMessage] = useState('');
  const [adminWorkshopBatches, setAdminWorkshopBatches] = useState<WorkshopBatch[]>([]);

  const workshopBatches = adminWorkshopBatches.length > 0
    ? adminWorkshopBatches
    : WORKSHOP_BATCHES_BY_LANGUAGE[workshopLanguage];
  const selectedWorkshopBatch = workshopBatches.find((batch) => batch.value === batchPreference);

  // Use future schedules approved in Admin when available. The local list is
  // retained only as a fallback until the administrator publishes a schedule.
  useEffect(() => {
    if (formType !== 'workshop') return;

    let cancelled = false;
    const loadAdminWorkshopBatches = async () => {
      try {
        const response = await fetch(
          `/api/workshops/schedules?workshopSlug=swar-yoga-level-1&mode=online&language=${workshopLanguage}`,
          { cache: 'no-store' },
        );
        const data = await response.json();
        if (!response.ok || !Array.isArray(data?.data)) return;

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const batches = data.data
          .filter((schedule: any) => !schedule.startDate || new Date(schedule.startDate) >= today)
          .map((schedule: any): WorkshopBatch => {
            const date = schedule.startDate
              ? new Date(schedule.startDate).toLocaleDateString('en-GB', {
                  day: 'numeric', month: 'long', year: '2-digit', timeZone: 'Asia/Kolkata',
                })
              : 'Date to be announced';
            const batchName = String(schedule.batch || 'batch').replace(/^./, (letter) => letter.toUpperCase());
            const time = schedule.time || [schedule.startTime, schedule.endTime].filter(Boolean).join(' to ') || 'Time to be announced';
            const seats = Number(schedule.seatsTotal) || 0;
            return {
              value: `${batchName} Batch (From ${date}, Time: ${time})`,
              seats,
              scheduleId: String(schedule.id),
              seatsRemaining: Number(schedule.seatsRemaining ?? seats),
            };
          })
          .filter((batch: WorkshopBatch) => (batch.seatsRemaining ?? 0) > 0);

        if (!cancelled) setAdminWorkshopBatches(batches);
      } catch {
        if (!cancelled) setAdminWorkshopBatches([]);
      }
    };

    loadAdminWorkshopBatches();
    return () => { cancelled = true; };
  }, [formType, workshopLanguage]);
  
  // Password fields (for signup & workshop forms)
  const needsPassword = formType === 'signup' || formType === 'workshop';
  
  // Validation engine
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const validateField = (fName: string, val: any): string => {
    switch (fName) {
      case 'email':
        if (!val || !String(val).trim()) return 'Email address is required';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(val).trim())) return 'Please enter a valid email address';
        return '';
      case 'phone':
        if (!val || !String(val).trim()) return 'WhatsApp number is required';
        if (String(val).replace(/\D/g, '').length < 7) return 'Please enter a valid phone number (at least 7 digits)';
        return '';
      case 'name':
        if (!val || !String(val).trim()) return 'Full name is required';
        return '';
      case 'gender':
        if (!val) return 'Please select your gender';
        return '';
      case 'age':
        if (!val || isNaN(Number(val)) || Number(val) < 5 || Number(val) > 120) return 'Please enter a valid age';
        return '';
      case 'educationStatus':
        if (!val) return 'Please select an option';
        return '';
      case 'profession':
        if (!val) return 'Please select your profession';
        return '';
      case 'workshopName':
        if (!val) return 'Please select workshop';
        return '';
      case 'workshopLanguage':
        if (!val) return 'Please select language';
        return '';
      case 'workshopMode':
        if (val !== 'online') return 'This workshop is available online on Zoom';
        return '';
      case 'batchPreference':
        if (!val) return 'Please select workshop date and time';
        return '';
      case 'country':
        if (!val) return 'Please select country';
        return '';
      case 'state':
        const effState = useCustomState || state === 'Other' ? customState : state;
        if (!effState || !String(effState).trim()) return 'Please select or enter state';
        return '';
      case 'participantStatus':
        if (!val) return 'Please select whether you are new or returning';
        return '';
      case 'city':
        if (!val || !String(val).trim()) return 'Please enter your city/village';
        return '';
      case 'timeAvailable':
        if (!val) return 'Please select time availability';
        return '';
      case 'videoOnDuringClass':
        if (!val) return 'Please select video during class option';
        return '';
      case 'regularAttendance':
        if (!val) return 'Please select attendance option';
        return '';
      case 'deviceForWorkshop':
        if (!val) return 'Please select device you will use';
        return '';
      case 'donationReady':
        if (!val) return 'Please select your offering readiness';
        return '';
      case 'awarenessConfirmed':
        if (!val) return 'Please confirm this requirement';
        return '';
      case 'finalConfirmation':
        if (!val) return 'Please confirm this commitment';
        return '';
      case 'interest':
        if (!val) return 'Please select what you are interested in';
        return '';
      case 'courseName':
        if (!val) return 'Please select a course';
        return '';
      case 'paymentMode':
        if (!val) return 'Please select payment mode';
        return '';
      case 'message':
        if (!val || !String(val).trim()) return 'Please enter your message';
        return '';
      default:
        return '';
    }
  };

  const validateAll = (): Record<string, string> => {
    const errs: Record<string, string> = {};
    const checkAndSet = (fName: string, val: any) => {
      const err = validateField(fName, val);
      if (err) errs[fName] = err;
    };

    checkAndSet('email', email);
    checkAndSet('phone', phone);
    checkAndSet('name', name);

    if (config.fields.includes('gender')) checkAndSet('gender', gender);
    if (config.fields.includes('age')) checkAndSet('age', age);
    if (config.fields.includes('profession')) checkAndSet('profession', profession);
    if (config.fields.includes('country')) checkAndSet('country', country);
    if (config.fields.includes('state')) checkAndSet('state', getEffectiveState());
    if (config.fields.includes('interest')) checkAndSet('interest', interest);
    if (config.fields.includes('courseName')) checkAndSet('courseName', courseName);
    if (config.fields.includes('paymentMode')) checkAndSet('paymentMode', paymentMode);
    if (config.fields.includes('message')) checkAndSet('message', message);

    if (formType === 'workshop') {
      checkAndSet('educationStatus', educationStatus);
      checkAndSet('workshopName', workshopName);
      checkAndSet('workshopLanguage', workshopLanguage);
      checkAndSet('workshopMode', workshopMode);
      checkAndSet('batchPreference', batchPreference);
      checkAndSet('participantStatus', participantStatus);
      checkAndSet('city', city);
      checkAndSet('timeAvailable', timeAvailable);
      checkAndSet('videoOnDuringClass', videoOnDuringClass);
      checkAndSet('regularAttendance', regularAttendance);
      checkAndSet('deviceForWorkshop', deviceForWorkshop);
      checkAndSet('donationReady', donationReady);
      checkAndSet('awarenessConfirmed', awarenessConfirmed);
      checkAndSet('finalConfirmation', finalConfirmation);
    }

    // Dynamic questions validation (only required ones)
    dynamicQuestions.forEach((q) => {
      if (q.required) {
        const key = q.fieldKey;
        const answer = dynamicAnswers[key];
        if (
          answer === undefined ||
          answer === null ||
          answer === '' ||
          (Array.isArray(answer) && answer.length === 0)
        ) {
          errs[`dynamic_${key}`] = `${q.label?.[selectedLanguage === 'hindi' ? 'hi' : selectedLanguage === 'marathi' ? 'mr' : 'en'] || q.label?.en || 'This question'} is required`;
        }
      }
    });

    return errs;
  };

  const clearError = (fName: string, val?: any) => {
    setTouched((prev) => ({ ...prev, [fName]: true }));
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next[fName];
      return next;
    });
  };

  const getFieldClass = (fName: string, isSelect = false) => {
    const hasError = (formSubmitted || touched[fName]) && !!fieldErrors[fName];
    if (hasError) {
      return `w-full h-12 px-4 border-2 border-red-500 bg-red-50/50 text-gray-900 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-red-400 focus:border-red-500 transition-all ${isSelect ? 'bg-white' : ''}`;
    }
    return `w-full h-12 px-4 border border-gray-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-purple-300 focus:border-purple-400 transition-all ${isSelect ? 'bg-white' : ''}`;
  };

  const getLabelClass = (fName: string) => {
    const hasError = (formSubmitted || touched[fName]) && !!fieldErrors[fName];
    return `block text-sm font-bold mb-2 transition-colors ${hasError ? 'text-red-600' : 'text-gray-700'}`;
  };

  const renderFieldError = (fName: string) => {
    const hasError = (formSubmitted || touched[fName]) && fieldErrors[fName];
    if (!hasError) return null;
    return (
      <p className="mt-1.5 text-xs font-bold text-red-600 flex items-center gap-1 animate-fadeIn">
        <AlertCircle size={13} className="shrink-0 text-red-500" />
        <span>{fieldErrors[fName]}</span>
      </p>
    );
  };
  
  // Smart user detection (check if user already exists)
  const [existingUser, setExistingUser] = useState(false);
  const [existingUserInfo, setExistingUserInfo] = useState<{ name?: string; maskedEmail?: string } | null>(null);
  const [checkingUser, setCheckingUser] = useState(false);
  const [emailLookupLoading, setEmailLookupLoading] = useState(false);
  const [savedDataLoaded, setSavedDataLoaded] = useState(false);
  const checkTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const emailLookupTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const applySavedContact = useCallback((saved: Record<string, any>) => {
    const savedCountryCode = saved.countryCode || '+91';
    const rawPhone = String(saved.phone || '').replace(/\D/g, '');
    const countryDigits = String(savedCountryCode).replace(/\D/g, '');
    const localPhone = countryDigits && rawPhone.startsWith(countryDigits) && rawPhone.length > 10
      ? rawPhone.slice(countryDigits.length)
      : rawPhone;

    setName(saved.name || '');
    setEmail(saved.email || '');
    setPhone(localPhone);
    setCountryCode(savedCountryCode);
    setCountry(saved.country || 'India');
    setGender(saved.gender || '');
    setAge(saved.age === '' || saved.age == null ? '' : String(saved.age));
    setProfession(saved.profession || '');
    setInterest(saved.interest || '');
    setWorkshopName(saved.workshopName || '');
    setWorkshopLanguage(saved.workshopLanguage || 'english');
    if (['english', 'hindi', 'marathi'].includes(saved.workshopLanguage)) {
      setSelectedLanguage(saved.workshopLanguage as SupportedLanguage);
    }
    setEducationStatus(saved.educationStatus || '');
    setBatchPreference(saved.batchPreference || '');
    setParticipantStatus(saved.participantStatus || '');
    setCity(saved.city || '');
    setTimeAvailable(saved.timeAvailable || '');
    setVideoOnDuringClass(saved.videoOnDuringClass || '');
    setRegularAttendance(saved.regularAttendance || '');
    setHealthIssues(saved.healthIssues || '');
    setDeviceForWorkshop(saved.deviceForWorkshop || '');
    setDonationReady(saved.donationReady || '');
    setAwarenessConfirmed(Boolean(saved.awarenessConfirmed));
    setFinalConfirmation(Boolean(saved.finalConfirmation));
    setCourseName(saved.courseName || '');
    setPaymentMode(saved.paymentMode || '');
    setMessage(saved.message || '');
    setUserId(saved.profileId || saved.leadNumber || '');
    setUserFound(Boolean(saved.profileId || saved.leadNumber));
    setExistingUser(true);
    setExistingUserInfo({ name: saved.name || '' });
    setSavedDataLoaded(true);
  }, []);

  const lookupSavedContact = useCallback(async (emailValue: string) => {
    const normalizedEmail = emailValue.trim().toLowerCase();
    if (!needsPassword || !normalizedEmail.includes('@') || !normalizedEmail.includes('.')) return;

    setEmailLookupLoading(true);
    try {
      const response = await fetch(`/api/forms/contact-lookup?email=${encodeURIComponent(normalizedEmail)}`);
      const data = await response.json();
      if (data.found && data.user) {
        applySavedContact(data.user);
      } else {
        setSavedDataLoaded(false);
      }
    } catch {
      // Lookup is an enhancement; users can always continue filling the form manually.
    } finally {
      setEmailLookupLoading(false);
    }
  }, [applySavedContact, needsPassword]);

  // Prefill the email for a signed-in website user. The normal site login stores
  // the lightweight user profile in `user`; token/profile is the fallback.
  useEffect(() => {
    if (!needsPassword || email) return;

    const hydrateSignedInEmail = async () => {
      let signedInEmail = '';
      try {
        const storedUser = localStorage.getItem('user');
        const parsedUser = storedUser ? JSON.parse(storedUser) : null;
        signedInEmail = String(parsedUser?.email || '').trim().toLowerCase();
      } catch {
        // Ignore malformed legacy browser state.
      }

      if (!signedInEmail) {
        const token = localStorage.getItem('token');
        if (token) {
          try {
            const response = await fetch('/api/auth/profile', {
              headers: { Authorization: `Bearer ${token}` },
            });
            const data = await response.json();
            signedInEmail = String(data?.data?.email || '').trim().toLowerCase();
          } catch {
            // Logged-out or expired sessions should not block a public form.
          }
        }
      }

      if (signedInEmail) setEmail(signedInEmail);
    };

    hydrateSignedInEmail();
  }, [email, needsPassword]);

  // When an email is typed or auto-filled, restore the latest saved form data.
  useEffect(() => {
    if (emailLookupTimerRef.current) clearTimeout(emailLookupTimerRef.current);
    if (!needsPassword || !email.includes('@') || !email.includes('.')) return;

    emailLookupTimerRef.current = setTimeout(() => {
      lookupSavedContact(email);
    }, 700);

    return () => {
      if (emailLookupTimerRef.current) clearTimeout(emailLookupTimerRef.current);
    };
  }, [email, lookupSavedContact, needsPassword]);
  
  // Debounced check if user already exists (by email or phone)
  const checkUserExists = useCallback((emailVal: string, phoneVal: string) => {
    if (!needsPassword) return;
    
    // Clear previous timer
    if (checkTimerRef.current) {
      clearTimeout(checkTimerRef.current);
    }
    
    // Need at least email or phone with minimum length
    const hasEmail = emailVal && emailVal.includes('@') && emailVal.includes('.');
    const hasPhone = phoneVal && phoneVal.replace(/\D/g, '').length >= 10;
    
    if (!hasEmail && !hasPhone) {
      setExistingUser(false);
      setExistingUserInfo(null);
      return;
    }
    
    checkTimerRef.current = setTimeout(async () => {
      setCheckingUser(true);
      try {
        const res = await fetch('/api/auth/check-user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: emailVal || undefined,
            phone: phoneVal || undefined,
          }),
        });
        const data = await res.json();
        if (data.exists) {
          setExistingUser(true);
          setExistingUserInfo({ name: data.name, maskedEmail: data.maskedEmail });
        } else {
          setExistingUser(false);
          setExistingUserInfo(null);
        }
      } catch (_err) {
        // Silently fail — don't block form
      } finally {
        setCheckingUser(false);
      }
    }, 600);
  }, [needsPassword]);

  // Update states when country changes
  useEffect(() => {
    if (country && country !== 'Other') {
      const countryStates = getStatesList(country);
      setStates(countryStates);
      setUseCustomState(false);
      setCustomState('');
      // Reset state when country changes
      if (countryStates.length > 1) {
        setState('');
      } else {
        setState('');
        setUseCustomState(true);
      }
    } else {
      setStates([]);
      setUseCustomState(true);
      setState('');
    }
    
    // Update country code based on country
    const phoneData = COUNTRY_PHONE_CODES[country];
    if (phoneData) {
      setCountryCode(phoneData.code);
    }
  }, [country]);
  
  // Handle user ID lookup
  const handleUserLookup = useCallback(async () => {
    if (!userId || userId.trim().length < 3) return;
    
    setLookupLoading(true);
    setError('');
    
    try {
      const response = await fetch(`/api/forms/user-lookup?userId=${encodeURIComponent(userId.trim())}`);
      const data = await response.json();
      
      if (data.found && data.user) {
        setName(data.user.name || '');
        setEmail(data.user.email || '');
        setPhone(data.user.phone || '');
        setCountryCode(data.user.countryCode || '+91');
        setCountry(data.user.country || 'India');
        // State will be set after country effect runs
        setTimeout(() => {
          if (data.user.state) {
            const countryStates = getStatesList(data.user.country || 'India');
            if (countryStates.includes(data.user.state)) {
              setState(data.user.state);
            } else {
              setCustomState(data.user.state);
              setUseCustomState(true);
            }
          }
        }, 100);
        setGender(data.user.gender || '');
        setAge(data.user.age ? String(data.user.age) : '');
        setProfession(data.user.profession || '');
        setUserFound(true);
      } else {
        setUserFound(false);
        // Don't show error — just let them fill manually
      }
    } catch {
      setError('Failed to lookup user. Please fill manually.');
    } finally {
      setLookupLoading(false);
    }
  }, [userId]);
  
  // Get effective state value
  const getEffectiveState = () => {
    if (useCustomState || state === 'Other') {
      return customState;
    }
    return state;
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormSubmitted(true);
    
    const errs = validateAll();
    setFieldErrors(errs);

    if (Object.keys(errs).length > 0) {
      const firstKey = Object.keys(errs)[0];
      const targetEl = document.getElementById(`field-${firstKey}`);
      if (targetEl) {
        targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        const input = targetEl.querySelector('input, select, textarea') as HTMLElement | null;
        if (input) input.focus();
      }
      setError('Please fill in all required fields highlighted in red below.');
      return;
    }

    setLoading(true);
    setError('');
    
    const effectiveState = getEffectiveState();
    
    try {
      const payload = {
        formType,
        source: sourceParam || 'form-link',
        ref: refParam,
        existingUserId: userFound ? userId : undefined,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        countryCode,
        country,
        state: effectiveState,
        ...(config.fields.includes('gender') && { gender }),
        ...(config.fields.includes('age') && { age: parseInt(age) }),
        ...(config.fields.includes('profession') && { profession }),
        ...(config.fields.includes('interest') && { interest }),
        ...(config.fields.includes('workshopName') && { workshopName }),
        ...(config.fields.includes('workshopLanguage') && { workshopLanguage }),
        ...(config.fields.includes('workshopMode') && { workshopMode }),
        ...(selectedWorkshopBatch?.scheduleId && { workshopScheduleId: selectedWorkshopBatch.scheduleId }),
        ...(config.fields.includes('educationStatus') && {
          educationStatus: customEducation.trim() ? `${educationStatus} - ${customEducation.trim()}` : educationStatus,
        }),
        ...(config.fields.includes('batchPreference') && { batchPreference }),
        ...(formType === 'workshop' && {
          city,
          participantStatus,
          timeAvailable,
          videoOnDuringClass,
          regularAttendance,
          healthIssues,
          deviceForWorkshop,
          donationReady,
          awarenessConfirmed,
          finalConfirmation,
        }),
        ...(config.fields.includes('courseName') && { courseName }),
        ...(config.fields.includes('courseName') && { courseName }),
        ...(config.fields.includes('paymentMode') && { paymentMode }),
        ...(config.fields.includes('message') && { message }),
        dynamicAnswers,
      };
      
      const response = await fetch('/api/forms/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Submission failed');
      }
      
      setSubmitted(true);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };
  
  if (submitted) {
    return (
      <>
        <main className="min-h-screen pt-6 sm:pt-10 bg-gradient-to-b from-gray-50 to-white">
          <div className="max-w-2xl mx-auto px-4 py-16">
            <div className="bg-white rounded-3xl shadow-xl p-8 sm:p-12 border border-gray-100 text-center">
              <div className={`w-20 h-20 bg-${config.color}-100 rounded-full flex items-center justify-center mx-auto mb-6`}>
                <CheckCircle className={`text-${config.color}-600`} size={40} />
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-4">Thank You! 🎉</h1>
              <p className="text-gray-600 mb-6">
                Your submission has been received. We'll contact you soon via WhatsApp and email.
              </p>
              
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 mb-6 text-sm text-emerald-800">
                For a new account, your secure login password is generated automatically and sent to your registered email address. Existing account passwords are not changed.
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/signin"
                  className={`px-8 py-3 bg-gradient-to-r ${config.gradient} text-white rounded-xl font-bold hover:opacity-90 transition-all shadow-lg`}
                >
                  Login Now
                </Link>
                <Link
                  href="/community"
                  className="px-8 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-all"
                >
                  Explore Community
                </Link>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </>
    );
  }
  
  return (
    <>
      <main
        lang={selectedLanguage === 'marathi' ? 'mr' : selectedLanguage === 'hindi' ? 'hi' : 'en'}
        className={`min-h-screen pt-4 sm:pt-6 bg-gradient-to-b from-gray-50 to-white ${
          selectedLanguage === 'marathi' || selectedLanguage === 'hindi' ? 'marathi-font' : ''
        }`}
      >
        <div className="w-full max-w-3xl lg:max-w-4xl mx-auto px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
          <div className="mb-6 overflow-hidden rounded-[24px] border border-emerald-700/20 bg-[#3e7a57] shadow-[0_16px_36px_rgba(9,30,26,0.16)]">
            <div className="relative isolate w-full overflow-hidden p-4 sm:p-6 lg:p-7">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.12),transparent_22%),linear-gradient(135deg,#3d7d5a_0%,#2a6647_52%,#28563f_100%)]" />
              <div className="absolute -right-12 top-0 h-40 w-40 rounded-full bg-[#f4d75d]/10 blur-3xl" />
              <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_0%,rgba(255,255,255,0.04)_32%,rgba(255,255,255,0.08)_100%)]" />

              <div className="relative z-10 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className="inline-flex items-center justify-center rounded-xl border border-[#f0d85a] bg-[#f0d85a] px-3 py-1 text-[11px] font-black uppercase tracking-[0.12em] text-[#183e31] shadow-md sm:text-xs"
                      style={{ fontFamily: 'Verdana, Arial, sans-serif' }}
                    >
                      {LANGUAGE_COPY[selectedLanguage].heroBadge}
                    </span>
                    <span
                      className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-bold text-white shadow-sm sm:text-sm backdrop-blur-sm"
                      style={{ fontFamily: 'Verdana, Arial, sans-serif' }}
                    >
                      {LANGUAGE_COPY[selectedLanguage].heroSubtitle}
                    </span>
                  </div>

                  <div className="hidden sm:block h-10 w-10 rounded-full border border-white/30 bg-white/10 p-0.5 shadow-md backdrop-blur-sm">
                    <img
                      src="/receipt-photo.jpg"
                      alt="Mohan Sir"
                      className="h-full w-full rounded-full border border-[#f0d85a]/70 object-cover"
                    />
                  </div>
                </div>

                <div>
                  <h1
                    className="text-lg font-black leading-tight tracking-tight text-[#f5d953] sm:text-2xl md:text-3xl"
                    style={{
                      fontFamily: 'Georgia, "Times New Roman", serif',
                      letterSpacing: '0.02em',
                    }}
                  >
                    {LANGUAGE_COPY[selectedLanguage].heroTitle}
                  </h1>

                  <div className="mt-2.5 flex flex-wrap items-center gap-2 text-xs text-white/90 sm:text-sm">
                    <div className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 backdrop-blur-sm">
                      <span>📞</span>
                      <span className="font-semibold">9075358557</span>
                    </div>
                    <div className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 backdrop-blur-sm">
                      <span>🌐</span>
                      <span className="font-semibold">www.swaryoga.com</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mb-6 flex flex-wrap items-center justify-center gap-2.5">
            {LANGUAGE_OPTIONS.map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() => handleLanguageChange(option.key)}
                className={`inline-flex items-center justify-center rounded-full px-5 py-2 text-sm font-bold tracking-wide transition-all shadow-sm ${
                  selectedLanguage === option.key
                    ? 'border-2 border-[#f0d85a] bg-[#f0d85a] text-[#214b39] shadow-md scale-105'
                    : 'border border-emerald-200 bg-white text-emerald-900 hover:bg-emerald-50'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border-2 border-red-300 rounded-2xl text-red-700 flex items-center gap-2 text-sm font-bold shadow-sm">
              <AlertCircle size={20} className="text-red-500 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          
          {/* Form */}
          <form onSubmit={handleSubmit} noValidate className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
            <div className="p-4 sm:p-6 md:p-8 space-y-8">
              
              {/* Optional User ID Lookup */}
              {formType === 'workshop' && (
                <details className="rounded-2xl border border-purple-200 bg-purple-50/50 p-3.5 transition-all">
                  <summary className="cursor-pointer list-none text-sm font-bold text-purple-800 flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Search size={15} className="text-purple-600" />
                      {workshopText.alreadyRegistered} <span className="font-semibold text-xs text-purple-600 bg-purple-100 px-2 py-0.5 rounded-full">(Optional)</span>
                    </span>
                    <span className="text-xs text-purple-500 font-medium">Click to expand</span>
                  </summary>
                  <div className="mt-3 flex gap-2">
                    <input
                      type="text"
                      value={userId}
                      onChange={(e) => {
                        setUserId(e.target.value.replace(/[^0-9]/g, '').slice(0, 6));
                        setUserFound(false);
                      }}
                      placeholder="e.g. 518520"
                      className="h-11 min-w-0 flex-1 rounded-xl border border-purple-200 px-3.5 text-sm font-medium outline-none focus:ring-2 focus:ring-purple-300 bg-white"
                    />
                    <button
                      type="button"
                      onClick={handleUserLookup}
                      disabled={lookupLoading || !userId}
                      className="flex h-11 items-center gap-2 rounded-xl bg-purple-600 px-4 text-sm font-bold text-white hover:bg-purple-700 disabled:cursor-not-allowed disabled:bg-gray-300 transition-colors"
                    >
                      {lookupLoading ? <Loader className="animate-spin" size={16} /> : <Search size={16} />}
                      {workshopText.fetch}
                    </button>
                  </div>
                  {userFound && (
                    <p className="mt-2 flex items-center gap-1 text-xs text-green-600 font-semibold">
                      <CheckCircle size={13} /> User found! Your saved information has been filled in.
                    </p>
                  )}
                  <p className="mt-2 text-xs text-purple-600">
                    {workshopText.alreadyRegisteredHint}
                  </p>
                </details>
              )}

              {/* ================= SECTION 1: Personal & Contact ================= */}
              <div className="space-y-4">
                <div className="border-b border-gray-100 pb-2.5">
                  <h2 className="text-base sm:text-lg font-black text-gray-900 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-purple-100 text-purple-700 text-xs font-bold flex items-center justify-center">1</span>
                    Personal & Contact Information
                  </h2>
                </div>

                {/* Email */}
                <div id="field-email">
                  <label className={getLabelClass('email')}>
                    <Mail size={14} className="inline mr-2" />
                    {commonText.email} <span className="font-normal text-gray-500">(Google/Gmail)</span> *
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        clearError('email', e.target.value);
                        setSavedDataLoaded(false);
                        if (needsPassword) checkUserExists(e.target.value, phone);
                      }}
                      onBlur={() => clearError('email', email)}
                      placeholder="your.gmail@example.com"
                      className={getFieldClass('email')}
                    />
                    {/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && (
                      <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500" size={18} aria-label="Valid email" />
                    )}
                  </div>
                  {renderFieldError('email')}
                  {emailLookupLoading && (
                    <p className="mt-1 text-xs text-gray-500">Checking saved details...</p>
                  )}
                  {savedDataLoaded && !emailLookupLoading && (
                    <p className="mt-1 text-xs font-semibold text-emerald-600">
                      Saved details loaded. You can edit and submit again.
                    </p>
                  )}
                </div>
                
                {/* Phone with Country Code */}
                <div id="field-phone">
                  <label className={getLabelClass('phone')}>
                    <Phone size={14} className="inline mr-2" />
                    {commonText.whatsapp} *
                  </label>
                  <div className="flex gap-2">
                    <div className="relative">
                      <div className="flex items-center h-12 border border-gray-200 rounded-xl overflow-hidden bg-white">
                        <span className="text-xl pl-3">{COUNTRY_PHONE_CODES[country]?.flag || '🌍'}</span>
                        <input
                          type="text"
                          value={countryCode}
                          onChange={(e) => {
                            let val = e.target.value;
                            if (!val.startsWith('+')) val = '+' + val.replace(/[^0-9]/g, '');
                            else val = '+' + val.slice(1).replace(/[^0-9]/g, '');
                            setCountryCode(val.slice(0, 6));
                          }}
                          className="w-20 h-full px-2 text-sm font-bold outline-none bg-transparent"
                          placeholder="+91"
                        />
                      </div>
                    </div>
                    <div className="relative flex-1">
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '').slice(0, 15);
                          setPhone(val);
                          clearError('phone', val);
                          if (needsPassword) checkUserExists(email, val);
                        }}
                        onBlur={() => clearError('phone', phone)}
                        placeholder="9876543210"
                        className={getFieldClass('phone')}
                      />
                      {countryCode.replace(/\D/g, '').length > 0 && phone.replace(/\D/g, '').length >= 7 && (
                        <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500" size={18} aria-label="Valid WhatsApp number" />
                      )}
                    </div>
                  </div>
                  {renderFieldError('phone')}
                  <p className="text-xs text-gray-500 mt-1">📱 {COUNTRY_PHONE_CODES[country]?.flag} {workshopUi.countryHint}</p>
                </div>

                {/* Full Name */}
                <div id="field-name">
                  <label className={getLabelClass('name')}>
                    <User size={14} className="inline mr-2" />
                    {commonText.fullName} *
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      clearError('name', e.target.value);
                    }}
                    onBlur={() => clearError('name', name)}
                    placeholder="Enter your full name"
                    className={getFieldClass('name')}
                  />
                  {renderFieldError('name')}
                </div>

                {/* Gender & Age */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div id="field-gender">
                    <label className={getLabelClass('gender')}>{commonText.gender} *</label>
                    <select
                      value={gender}
                      onChange={(e) => {
                        setGender(e.target.value);
                        clearError('gender', e.target.value);
                      }}
                      onBlur={() => clearError('gender', gender)}
                      className={getFieldClass('gender', true)}
                    >
                      <option value="">{workshopUi.select}</option>
                      {workshopUi.genderOptions.map((option) => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                    {renderFieldError('gender')}
                  </div>

                  <div id="field-age">
                    <label className={getLabelClass('age')}>{commonText.age} *</label>
                    <input
                      type="number"
                      value={age}
                      onChange={(e) => {
                        setAge(e.target.value);
                        clearError('age', e.target.value);
                      }}
                      onBlur={() => clearError('age', age)}
                      placeholder={workshopUi.agePlaceholder}
                      min="5"
                      max="120"
                      className={getFieldClass('age')}
                    />
                    {renderFieldError('age')}
                  </div>
                </div>
              </div>

              {/* ================= SECTION 2: Background & Location ================= */}
              <div className="space-y-4 pt-2">
                <div className="border-b border-gray-100 pb-2.5">
                  <h2 className="text-base sm:text-lg font-black text-gray-900 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-purple-100 text-purple-700 text-xs font-bold flex items-center justify-center">2</span>
                    Background & Location
                  </h2>
                </div>

                {formType === 'workshop' && (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div id="field-educationStatus">
                      <label className={getLabelClass('educationStatus')}>
                        <BookOpen size={14} className="inline mr-2" />
                        {workshopText.education} *
                      </label>
                      <select
                        value={educationStatus}
                        onChange={(e) => {
                          setEducationStatus(e.target.value);
                          clearError('educationStatus', e.target.value);
                        }}
                        onBlur={() => clearError('educationStatus', educationStatus)}
                        className={getFieldClass('educationStatus', true)}
                      >
                        <option value="">{workshopUi.select}</option>
                        {workshopUi.educationOptions.map((option) => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                      {renderFieldError('educationStatus')}

                      {/* Optional extra education */}
                      <input
                        type="text"
                        value={customEducation}
                        onChange={(e) => setCustomEducation(e.target.value)}
                        placeholder="Add more education details (Optional)"
                        className="mt-2 w-full h-10 px-3 border border-gray-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-purple-300"
                      />
                    </div>

                    <div id="field-profession">
                      <label className={getLabelClass('profession')}>
                        <Briefcase size={14} className="inline mr-2" />
                        {commonText.profession} *
                      </label>
                      <select
                        value={profession}
                        onChange={(e) => {
                          setProfession(e.target.value);
                          clearError('profession', e.target.value);
                        }}
                        onBlur={() => clearError('profession', profession)}
                        className={getFieldClass('profession', true)}
                      >
                        <option value="">{workshopUi.select}</option>
                        {['Student', 'Jobless', 'Housewife', 'Job', 'Businessman', 'Professional', 'Self Employed', 'Farmer', 'Retired'].map((option) => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                      {renderFieldError('profession')}
                    </div>
                  </div>
                )}

                {/* Country & State */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div id="field-country">
                    <label className={getLabelClass('country')}>
                      <Globe size={14} className="inline mr-2" />
                      {commonText.country} *
                    </label>
                    <select
                      value={country}
                      onChange={(e) => {
                        setCountry(e.target.value);
                        clearError('country', e.target.value);
                      }}
                      onBlur={() => clearError('country', country)}
                      className={getFieldClass('country', true)}
                    >
                      {countries.map((c) => (
                        <option key={c} value={c}>
                          {COUNTRY_PHONE_CODES[c]?.flag || '🌍'} {c}
                        </option>
                      ))}
                    </select>
                    {renderFieldError('country')}
                  </div>

                  <div id="field-state">
                    <label className={getLabelClass('state')}>
                      <MapPin size={14} className="inline mr-2" />
                      {commonText.state} *
                    </label>
                    {states.length > 0 && !useCustomState ? (
                      <select
                        value={state}
                        onChange={(e) => {
                          if (e.target.value === 'Other') {
                            setUseCustomState(true);
                            setState('Other');
                          } else {
                            setState(e.target.value);
                          }
                          clearError('state', e.target.value);
                        }}
                        onBlur={() => clearError('state', state)}
                        className={getFieldClass('state', true)}
                      >
                        <option value="">{workshopUi.select} {commonText.state}</option>
                        {states.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    ) : (
                      <div className="relative">
                        <input
                          type="text"
                          value={customState}
                          onChange={(e) => {
                            setCustomState(e.target.value);
                            clearError('state', e.target.value);
                          }}
                          onBlur={() => clearError('state', customState)}
                          placeholder={workshopUi.districtPlaceholder}
                          className={getFieldClass('state')}
                        />
                        {states.length > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              setUseCustomState(false);
                              setCustomState('');
                              setState('');
                            }}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-purple-600 hover:underline bg-white px-2 py-1 rounded"
                          >
                            ↓ {workshopUi.showList}
                          </button>
                        )}
                      </div>
                    )}
                    {renderFieldError('state')}
                  </div>
                </div>

                {/* City / Village */}
                {formType === 'workshop' && (
                  <div id="field-city">
                    <label className={getLabelClass('city')}>
                      <MapPin size={14} className="inline mr-2" />
                      {workshopText.city} *
                    </label>
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => {
                        setCity(e.target.value);
                        clearError('city', e.target.value);
                      }}
                      onBlur={() => clearError('city', city)}
                      placeholder={workshopUi.cityPlaceholder}
                      className={getFieldClass('city')}
                    />
                    {renderFieldError('city')}
                  </div>
                )}
              </div>

              {/* ================= SECTION 3: Workshop Preferences ================= */}
              {formType === 'workshop' && (
                <div className="space-y-4 pt-2">
                  <div className="border-b border-gray-100 pb-2.5">
                    <h2 className="text-base sm:text-lg font-black text-gray-900 flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-purple-100 text-purple-700 text-xs font-bold flex items-center justify-center">3</span>
                      Workshop Preferences & Commitment
                    </h2>
                  </div>

                  {/* Workshop Name */}
                  <div id="field-workshopName">
                    <label className={getLabelClass('workshopName')}>
                      <BookOpen size={14} className="inline mr-2" />
                      {workshopText.workshopName} *
                    </label>
                    <select
                      value={workshopName}
                      onChange={(e) => {
                        setWorkshopName(e.target.value);
                        clearError('workshopName', e.target.value);
                      }}
                      onBlur={() => clearError('workshopName', workshopName)}
                      className={getFieldClass('workshopName', true)}
                    >
                      <option value="">{workshopUi.workshopPlaceholder}</option>
                      <option value={workshopUi.defaultWorkshop}>{workshopUi.defaultWorkshop}</option>
                    </select>
                    {renderFieldError('workshopName')}
                  </div>

                  {/* Language & Mode */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div id="field-workshopLanguage">
                      <label className={getLabelClass('workshopLanguage')}>{workshopText.workshopLanguage} *</label>
                      <select
                        value={workshopLanguage}
                        onChange={(e) => {
                          const nextLanguage = e.target.value as SupportedLanguage;
                          setWorkshopLanguage(nextLanguage);
                          setSelectedLanguage(nextLanguage);
                          setBatchPreference('');
                          setAdminWorkshopBatches([]);
                          clearError('workshopLanguage', e.target.value);
                        }}
                        onBlur={() => clearError('workshopLanguage', workshopLanguage)}
                        className={getFieldClass('workshopLanguage', true)}
                      >
                        {LANGUAGES.map((l) => (
                          <option key={l.value} value={l.value}>{l.label}</option>
                        ))}
                      </select>
                      {renderFieldError('workshopLanguage')}
                    </div>

                    <div id="field-workshopMode">
                      <label className={getLabelClass('workshopMode')}>{workshopText.mode} *</label>
                      <div className="flex h-12 items-center rounded-xl border border-purple-200 bg-purple-50 px-4 text-sm font-bold text-purple-800">
                        🌐 Online on Zoom
                      </div>
                      {renderFieldError('workshopMode')}
                    </div>
                  </div>

                  {/* Batch Preference */}
                  <div id="field-batchPreference">
                    <label className={getLabelClass('batchPreference')}>
                      <Calendar size={14} className="inline mr-2" />
                      {workshopText.dateTime} *
                    </label>
                    <div className="space-y-2 rounded-xl border border-gray-200 bg-white p-3">
                      {workshopBatches.length > 0 ? workshopBatches.map((batch) => {
                        const remaining = batch.seatsRemaining ?? batch.seats;
                        return (
                          <label
                            key={batch.value}
                            className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${
                              batchPreference === batch.value
                                ? 'border-purple-400 bg-purple-50'
                                : 'border-gray-100 hover:border-purple-200'
                            }`}
                          >
                            <input
                              type="radio"
                              name="workshopBatch"
                              value={batch.value}
                              checked={batchPreference === batch.value}
                              onChange={(e) => {
                                setBatchPreference(e.target.value);
                                clearError('batchPreference', e.target.value);
                              }}
                              className="mt-1 h-5 w-5 accent-purple-600"
                            />
                            <span className="text-sm font-semibold text-gray-800">
                              {batch.value}
                              <span className="ml-2 font-black text-red-600">{remaining} seats left</span>
                            </span>
                          </label>
                        );
                      }) : (
                        <p className="text-sm font-semibold text-gray-500">No approved online batches are available.</p>
                      )}
                    </div>
                    {selectedWorkshopBatch && (
                      <p className="mt-1.5 text-sm font-black text-red-600">
                        Remaining slots: {selectedWorkshopBatch.seatsRemaining ?? selectedWorkshopBatch.seats}
                      </p>
                    )}
                    {renderFieldError('batchPreference')}
                  </div>

                  {/* Participant Status & Time Available */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div id="field-participantStatus">
                      <label className={getLabelClass('participantStatus')}>
                        {workshopText.participantStatus} *
                      </label>
                      <select
                        value={participantStatus}
                        onChange={(e) => {
                          setParticipantStatus(e.target.value);
                          clearError('participantStatus', e.target.value);
                        }}
                        onBlur={() => clearError('participantStatus', participantStatus)}
                        className={getFieldClass('participantStatus', true)}
                      >
                        <option value="">{workshopUi.select}</option>
                        {workshopUi.experienceOptions.map((option) => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                      {renderFieldError('participantStatus')}
                    </div>

                    <div id="field-timeAvailable">
                      <label className={getLabelClass('timeAvailable')}>
                        {workshopText.timeAvailable} *
                      </label>
                      <select
                        value={timeAvailable}
                        onChange={(e) => {
                          setTimeAvailable(e.target.value);
                          clearError('timeAvailable', e.target.value);
                        }}
                        onBlur={() => clearError('timeAvailable', timeAvailable)}
                        className={getFieldClass('timeAvailable', true)}
                      >
                        <option value="">{workshopUi.select}</option>
                        {workshopUi.timeOptions.map((option) => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                      {renderFieldError('timeAvailable')}
                    </div>
                  </div>

                  {/* Video during class & Regular Attendance */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div id="field-videoOnDuringClass">
                      <label className={getLabelClass('videoOnDuringClass')}>
                        {workshopText.videoDuringClass} *
                      </label>
                      <select
                        value={videoOnDuringClass}
                        onChange={(e) => {
                          setVideoOnDuringClass(e.target.value);
                          clearError('videoOnDuringClass', e.target.value);
                        }}
                        onBlur={() => clearError('videoOnDuringClass', videoOnDuringClass)}
                        className={getFieldClass('videoOnDuringClass', true)}
                      >
                        <option value="">{workshopUi.select}</option>
                        {workshopUi.yesNoOptions.map((option) => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                      {renderFieldError('videoOnDuringClass')}
                    </div>

                    <div id="field-regularAttendance">
                      <label className={getLabelClass('regularAttendance')}>
                        {workshopText.regularAttendance} *
                      </label>
                      <select
                        value={regularAttendance}
                        onChange={(e) => {
                          setRegularAttendance(e.target.value);
                          clearError('regularAttendance', e.target.value);
                        }}
                        onBlur={() => clearError('regularAttendance', regularAttendance)}
                        className={getFieldClass('regularAttendance', true)}
                      >
                        <option value="">{workshopUi.select}</option>
                        {workshopUi.attendanceOptions.map((option) => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                      {renderFieldError('regularAttendance')}
                    </div>
                  </div>

                  {/* Device & Donation as Dropdowns */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div id="field-deviceForWorkshop">
                      <label className={getLabelClass('deviceForWorkshop')}>
                        {workshopText.device} *
                      </label>
                      <select
                        value={deviceForWorkshop}
                        onChange={(e) => {
                          setDeviceForWorkshop(e.target.value);
                          clearError('deviceForWorkshop', e.target.value);
                        }}
                        onBlur={() => clearError('deviceForWorkshop', deviceForWorkshop)}
                        className={getFieldClass('deviceForWorkshop', true)}
                      >
                        <option value="">{workshopUi.select}</option>
                        {workshopUi.deviceOptions.map((option) => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                      {renderFieldError('deviceForWorkshop')}
                    </div>

                    <div id="field-donationReady">
                      <label className={getLabelClass('donationReady')}>
                        {workshopText.donation} *
                      </label>
                      <select
                        value={donationReady}
                        onChange={(e) => {
                          setDonationReady(e.target.value);
                          clearError('donationReady', e.target.value);
                        }}
                        onBlur={() => clearError('donationReady', donationReady)}
                        className={getFieldClass('donationReady', true)}
                      >
                        <option value="">{workshopUi.select}</option>
                        {workshopUi.donationOptions.map((option) => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                      {renderFieldError('donationReady')}
                    </div>
                  </div>

                  {/* Dynamic Questions (Admin Configured) */}
                  {dynamicQuestions.length > 0 && (
                    <div className="space-y-4 pt-2 border-t border-purple-100">
                      {dynamicQuestions.map((q) => {
                        const qKey = q.fieldKey;
                        const fieldErrorKey = `dynamic_${qKey}`;
                        const hasError = (formSubmitted || touched[fieldErrorKey]) && !!fieldErrors[fieldErrorKey];
                        const langKey = selectedLanguage === 'hindi' ? 'hi' : selectedLanguage === 'marathi' ? 'mr' : 'en';
                        const labelText = q.label?.[langKey] || q.label?.en || qKey;
                        const placeholderText = q.placeholder?.[langKey] || q.placeholder?.en || '';

                        const labelClassName = `block text-sm font-bold mb-2 transition-colors ${
                          hasError ? 'text-red-600' : 'text-gray-700'
                        }`;
                        const inputClassName = `w-full h-12 px-4 border ${
                          hasError ? 'border-2 border-red-500 bg-red-50/50 text-gray-900' : 'border-gray-200 focus:ring-purple-300'
                        } rounded-xl text-sm font-medium outline-none focus:ring-2 transition-all bg-white`;

                        return (
                          <div key={qKey} id={`field-dynamic_${qKey}`} className="space-y-1.5">
                            <label className={labelClassName}>
                              {labelText} {q.required ? <span className="text-red-500">*</span> : <span className="font-semibold text-xs text-purple-600 bg-purple-100 px-2 py-0.5 rounded-full ml-1">(Optional)</span>}
                            </label>

                            {q.questionType === 'dropdown' && (
                              <select
                                value={dynamicAnswers[qKey] || ''}
                                onChange={(e) => {
                                  setDynamicAnswers((prev) => ({ ...prev, [qKey]: e.target.value }));
                                  clearError(fieldErrorKey, e.target.value);
                                }}
                                className={inputClassName}
                              >
                                <option value="">{workshopUi.select}</option>
                                {q.options?.map((opt: any) => {
                                  const optLabel = typeof opt === 'string' ? opt : (opt.label?.[langKey] || opt.label?.en || opt.value);
                                  const optValue = typeof opt === 'string' ? opt : opt.value;
                                  return (
                                    <option key={optValue} value={optValue}>
                                      {optLabel}
                                    </option>
                                  );
                                })}
                              </select>
                            )}

                            {q.questionType === 'text' && (
                              <input
                                type="text"
                                value={dynamicAnswers[qKey] || ''}
                                onChange={(e) => {
                                  setDynamicAnswers((prev) => ({ ...prev, [qKey]: e.target.value }));
                                  clearError(fieldErrorKey, e.target.value);
                                }}
                                placeholder={placeholderText}
                                className={inputClassName}
                              />
                            )}

                            {q.questionType === 'paragraph' && (
                              <textarea
                                value={dynamicAnswers[qKey] || ''}
                                onChange={(e) => {
                                  setDynamicAnswers((prev) => ({ ...prev, [qKey]: e.target.value }));
                                  clearError(fieldErrorKey, e.target.value);
                                }}
                                rows={3}
                                placeholder={placeholderText}
                                className={`w-full p-4 border ${
                                  hasError ? 'border-2 border-red-500 bg-red-50/50 text-gray-900' : 'border-gray-200 focus:ring-purple-300'
                                } rounded-xl text-sm font-medium outline-none focus:ring-2 resize-none bg-white`}
                              />
                            )}

                            {hasError && (
                              <p className="mt-1.5 text-xs font-bold text-red-600 flex items-center gap-1">
                                <AlertCircle size={13} className="shrink-0 text-red-500" />
                                <span>{fieldErrors[fieldErrorKey]}</span>
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Health Issues (OPTIONAL - never red) */}
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      {workshopText.healthIssues} <span className="font-semibold text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">(Optional)</span>
                    </label>
                    <textarea
                      value={healthIssues}
                      onChange={(e) => setHealthIssues(e.target.value)}
                      rows={3}
                        placeholder="Any health issues or medical conditions you would like us to know about (Optional)"
                      className="w-full p-4 border border-gray-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-purple-300 resize-none"
                    />
                  </div>

                  {/* Agreement Checkboxes */}
                  <div className={`space-y-3 rounded-2xl p-4 text-sm transition-colors ${
                    (formSubmitted && (!awarenessConfirmed || !finalConfirmation))
                      ? 'bg-red-50 border-2 border-red-400 text-red-950'
                      : 'bg-amber-50/70 border border-amber-200 text-amber-950'
                  }`}>
                    <p className="font-bold">{workshopText.awarenessNote}</p>
                    
                    <div id="field-awarenessConfirmed">
                      <label className="flex items-start gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={awarenessConfirmed}
                          onChange={(e) => {
                            setAwarenessConfirmed(e.target.checked);
                            clearError('awarenessConfirmed', e.target.checked);
                          }}
                          className="mt-1 h-4 w-4 rounded border-amber-300 text-amber-600 focus:ring-amber-500"
                        />
                        <span className="font-medium text-xs sm:text-sm">{workshopText.awarenessConfirm} *</span>
                      </label>
                      {renderFieldError('awarenessConfirmed')}
                    </div>

                    <div id="field-finalConfirmation">
                      <label className="flex items-start gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={finalConfirmation}
                          onChange={(e) => {
                            setFinalConfirmation(e.target.checked);
                            clearError('finalConfirmation', e.target.checked);
                          }}
                          className="mt-1 h-4 w-4 rounded border-amber-300 text-amber-600 focus:ring-amber-500"
                        />
                        <span className="font-medium text-xs sm:text-sm">{workshopText.finalConfirm} *</span>
                      </label>
                      {renderFieldError('finalConfirmation')}
                    </div>
                  </div>
                </div>
              )}
              
              {/* Already Registered Popup */}
              {needsPassword && existingUser && existingUserInfo && (
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-2xl p-4 flex items-start gap-3 shadow-sm">
                  <UserCheck className="text-green-600 mt-0.5 flex-shrink-0" size={22} />
                  <div>
                    <p className="text-sm font-bold text-green-800">
                      {workshopUi.alreadyRegistered} 🎉
                    </p>
                    <p className="text-xs text-green-700 mt-1">
                      {existingUserInfo.name ? `${workshopUi.welcomeBackPrefix}, ${existingUserInfo.name}!` : `${workshopUi.welcomeBackPrefix}!`} 
                      {existingUserInfo.maskedEmail ? ` (${existingUserInfo.maskedEmail})` : ''} 
                      {workshopUi.welcomeBack}
                    </p>
                  </div>
                </div>
              )}
              
              {/* Checking user indicator */}
              {needsPassword && checkingUser && (
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Loader className="animate-spin" size={13} />
                  {workshopUi.checking}
                </div>
              )}
              
            </div>
            
            {/* Submit & Trust Area */}
            <div className="p-4 sm:p-6 md:p-8 bg-gray-50 border-t border-gray-100">
              <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-gray-500 mb-4">
                <span className="flex items-center gap-1">
                  <ShieldCheck size={14} className="text-emerald-600" />
                  256-Bit Encrypted Registration
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <span>⚡</span> Instant WhatsApp Confirmation
                </span>
              </div>

              <button
                type="submit"
                disabled={loading}
                className={`w-full h-14 rounded-2xl font-black text-base text-white flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-xl hover:scale-[1.01] active:scale-[0.99] ${
                  loading
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700'
                }`}
              >
                {loading ? (
                  <>
                    <Loader className="animate-spin" size={20} />
                    Processing Registration...
                  </>
                ) : (
                  <>
                    {needsPassword && !existingUser ? actionText.register : actionText.submit}
                  </>
                )}
              </button>

              <p className="text-center text-xs text-gray-400 mt-3">
                {actionText.submitted}
              </p>
            </div>
          </form>
        </div>
      </main>
      <Footer />
    </>
  );
}
