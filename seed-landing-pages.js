#!/usr/bin/env node
/**
 * Seed 5 Sample Landing Pages for Swar Yoga Masterclass
 * Run: node seed-landing-pages.js
 */

require('dotenv').config({ path: '.env.local' });
const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI_MAIN || process.env.MONGODB_URI;

const sampleLandingPages = [
  {
    slug: 'swar-yoga-masterclass-hindi',
    name: 'Swar Yoga Masterclass - Hindi Batch',
    status: 'draft',
    heroHeading: 'स्वर योग मास्टरक्लास - 6 माह का पूर्ण कोर्स',
    heroSubheading: 'प्राचीन स्वर विज्ञान सीखें और अपने जीवन को बदलें। नाड़ी शोधन, प्राणायाम और स्वर ज्योतिष की गहन शिक्षा।',
    heroCTA: 'अभी एनरोल करें',
    heroImage: 'https://images.unsplash.com/photo-1545389336-cf090694435e?w=1920',
    eventTitle: 'स्वर योग मास्टरक्लास',
    eventDescription: '6 महीने का गहन प्रशिक्षण कार्यक्रम जहाँ आप स्वर योग के रहस्यों को समझेंगे और अपने दैनिक जीवन में लागू करना सीखेंगे।',
    startDate: '2026-03-19',
    endDate: '2026-09-19',
    eventTime: '7:00 PM - 8:30 PM IST',
    location: 'Online via Zoom',
    language: 'Hindi',
    // World-Class Features
    logo: {
      url: 'https://swaryoga.com/logo.png',
      altText: 'Swar Yoga Logo',
    },
    navigation: {
      enabled: true,
      showLogo: true,
      showLogin: false,
      links: [
        { label: 'Benefits', href: '#benefits' },
        { label: 'Curriculum', href: '#curriculum' },
        { label: 'Pricing', href: '#pricing' },
        { label: 'FAQs', href: '#faqs' },
      ],
    },
    heroQuickBenefits: [
      { icon: '✓', text: 'Live Classes' },
      { icon: '✓', text: 'Certificate' },
      { icon: '✓', text: 'Lifetime Access' },
      { icon: '✓', text: 'WhatsApp Support' },
    ],
    heroSecondaryCTA: {
      enabled: true,
      text: 'Watch Demo',
      link: '#video',
      icon: '▶️',
    },
    announcementBar: {
      enabled: true,
      text: '🎉 Early Bird Offer: ₹1,000 OFF - Only 3 Days Left!',
      link: '#pricing',
      backgroundColor: '#FF6B35',
      textColor: '#FFFFFF',
    },
    problemStatement: {
      enabled: true,
      title: 'क्या आप इन समस्याओं से जूझ रहे हैं?',
      subtitle: 'अगर आप इनमें से किसी भी समस्या का सामना कर रहे हैं, तो स्वर योग आपके लिए है।',
      points: [
        { icon: '😰', title: 'तनाव और चिंता', description: 'रोज़मर्रा की ज़िंदगी में बढ़ता हुआ तनाव' },
        { icon: '😴', title: 'नींद की समस्या', description: 'अच्छी नींद न आना या अनिद्रा' },
        { icon: '🤔', title: 'निर्णय लेने में कठिनाई', description: 'सही समय पर सही फैसला न ले पाना' },
        { icon: '😤', title: 'ऊर्जा की कमी', description: 'दिनभर थकान और सुस्ती महसूस करना' },
        { icon: '🌀', title: 'जीवन में दिशाहीनता', description: 'जीवन का उद्देश्य समझ न आना' },
        { icon: '💊', title: 'स्वास्थ्य समस्याएं', description: 'बार-बार बीमार पड़ना' },
      ],
    },
    solution: {
      enabled: true,
      title: 'स्वर योग: आपकी समस्याओं का प्राचीन समाधान',
      subtitle: '5000 साल पुरानी विद्या जो आज भी उतनी ही प्रभावी है',
      description: 'स्वर योग श्वास के विज्ञान के माध्यम से आपके शरीर, मन और आत्मा को संतुलित करता है। यह आपको सही समय पर सही निर्णय लेने, स्वस्थ रहने और आध्यात्मिक विकास की ओर ले जाता है।',
      videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      points: [
        'सिर्फ 15 मिनट रोज़ अभ्यास से जीवन बदलें',
        'कोई महंगे उपकरण या जिम की जरूरत नहीं',
        'घर बैठे Expert guidance प्राप्त करें',
        '10,000+ छात्रों ने result देखा है',
      ],
    },
    howItWorks: {
      enabled: true,
      title: 'यह कोर्स कैसे काम करता है?',
      subtitle: 'सिर्फ 4 आसान steps में शुरू करें',
      steps: [
        { number: 1, icon: '📝', title: 'रजिस्टर करें', description: 'नीचे दिए गए बटन से अपना स्थान सुरक्षित करें' },
        { number: 2, icon: '📧', title: 'Welcome Kit प्राप्त करें', description: 'WhatsApp group link और Zoom details तुरंत' },
        { number: 3, icon: '🎥', title: 'Live Classes जॉइन करें', description: 'हफ्ते में 3 बार Live interactive sessions' },
        { number: 4, icon: '🏆', title: 'Transform हों', description: '6 महीने में देखें अपना बदलाव और Certificate पाएं' },
      ],
    },
    videoSection: {
      enabled: true,
      title: '5 मिनट में समझें स्वर योग क्या है',
      description: 'इस वीडियो में जानें कि स्वर योग कैसे आपके जीवन को बदल सकता है।',
      videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      thumbnailUrl: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=1280',
    },
    transformation: {
      enabled: true,
      title: '6 महीने में आपका बदलाव',
      before: {
        title: 'अभी आप',
        points: [
          'तनाव और चिंता से ग्रस्त',
          'नींद की समस्या',
          'निर्णय लेने में confusion',
          'ऊर्जा की कमी',
          'स्वास्थ्य समस्याएं',
        ],
      },
      after: {
        title: 'कोर्स के बाद आप',
        points: [
          'शांत और संतुलित मन',
          'गहरी और आरामदायक नींद',
          'सही समय पर सही फैसले',
          'दिनभर ऊर्जावान',
          'बेहतर स्वास्थ्य',
        ],
      },
    },
    pricing: [
      {
        name: 'Standard',
        price: 1500,
        currency: 'INR',
        originalPrice: 2500,
        features: ['Live Classes', 'Recording Access', 'WhatsApp Group', 'Certificate'],
        isPopular: false,
        ctaText: 'Enroll Now',
        paymentLink: '',
      },
      {
        name: 'Premium',
        price: 2999,
        currency: 'INR',
        originalPrice: 4999,
        features: ['Everything in Standard', '1-on-1 Sessions', 'Personal Guidance', 'Lifetime Access', 'Priority Support'],
        isPopular: true,
        ctaText: 'Get Premium',
        paymentLink: '',
      },
    ],
    instructorName: 'Swar Yoga Team',
    instructorTitle: 'Certified Swar Yoga Educators',
    instructorImage: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400',
    instructorBio: '15+ वर्षों के अनुभव के साथ, हमारी टीम ने 10,000+ छात्रों को स्वर योग की शिक्षा दी है।',
    benefits: [
      { icon: '🌬️', title: 'श्वास नियंत्रण', description: 'प्राणायाम और नाड़ी शोधन की उन्नत तकनीकें सीखें' },
      { icon: '🔮', title: 'स्वर ज्योतिष', description: 'स्वर के माध्यम से भविष्य जानने की कला' },
      { icon: '💪', title: 'स्वास्थ्य सुधार', description: 'शारीरिक और मानसिक स्वास्थ्य में सुधार' },
      { icon: '🧘', title: 'आध्यात्मिक विकास', description: 'ध्यान और आत्म-जागरूकता में वृद्धि' },
      { icon: '📅', title: 'दैनिक अभ्यास', description: 'रोजमर्रा के जीवन में स्वर योग का उपयोग' },
      { icon: '🎯', title: 'निर्णय क्षमता', description: 'सही समय पर सही निर्णय लेने की कला' },
    ],
    curriculum: [
      { title: 'स्वर योग का परिचय', description: 'मूल सिद्धांत और इतिहास', duration: 'सप्ताह 1-2' },
      { title: 'इड़ा और पिंगला नाड़ी', description: 'दो मुख्य नाड़ियों की समझ', duration: 'सप्ताह 3-4' },
      { title: 'पंचतत्व और स्वर', description: 'पांच तत्वों का स्वर से संबंध', duration: 'सप्ताह 5-8' },
      { title: 'स्वर ज्योतिष', description: 'भविष्यवाणी और मार्गदर्शन', duration: 'सप्ताह 9-12' },
      { title: 'उन्नत प्राणायाम', description: 'गहन श्वास तकनीकें', duration: 'सप्ताह 13-20' },
      { title: 'व्यावहारिक अभ्यास', description: 'दैनिक जीवन में अनुप्रयोग', duration: 'सप्ताह 21-24' },
    ],
    testimonials: [
      { name: 'राजेश शर्मा', location: 'दिल्ली', text: 'इस कोर्स ने मेरी जिंदगी बदल दी। अब मैं सही समय पर सही निर्णय ले पाता हूँ।', rating: 5, videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
      { name: 'सुनीता पटेल', location: 'मुंबई', text: 'बहुत ही सरल भाषा में गहन ज्ञान। पूरी टीम का धन्यवाद।', rating: 5, image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100' },
      { name: 'अमित कुमार', location: 'जयपुर', text: 'प्राणायाम सीखने के बाद मेरी सेहत में काफी सुधार हुआ है।', rating: 5, videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
    ],
    successStories: [
      {
        name: 'विकास गुप्ता',
        title: 'Software Engineer, Bangalore',
        image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200',
        videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        beforeStats: 'Stress Level: 9/10',
        afterStats: 'Stress Level: 3/10',
        testimonial: 'स्वर योग ने मेरी IT job में stress को पूरी तरह manage करना सिखाया। अब मैं work-life balance बना पाता हूँ।',
        duration: '3 months',
      },
      {
        name: 'प्रिया वर्मा',
        title: 'Homemaker, Delhi',
        image: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200',
        beforeStats: 'नींद: 4 घंटे/रात',
        afterStats: 'नींद: 7-8 घंटे/रात',
        testimonial: 'Insomnia से परेशान थी। अब स्वर योग से पहले जैसी गहरी नींद आने लगी।',
        duration: '2 months',
      },
    ],
    bonuses: [
      { title: 'Swar Yoga E-Book (Hindi)', description: '100+ पेज की comprehensive guide', value: 499, currency: 'INR' },
      { title: 'Daily Practice Audio', description: 'Guided meditation MP3s', value: 299, currency: 'INR' },
      { title: 'Private WhatsApp Group', description: 'Direct access to instructors', value: 999, currency: 'INR' },
      { title: 'Monthly Q&A Sessions', description: 'Live doubt clearing sessions', value: 1999, currency: 'INR' },
    ],
    guarantee: {
      enabled: true,
      days: 7,
      title: '7-Day Money Back Guarantee',
      description: 'अगर पहले 7 दिनों में आपको कोर्स पसंद नहीं आया, तो 100% refund - कोई सवाल नहीं पूछा जाएगा।',
    },
    urgency: {
      enabled: true,
      limitedSeats: true,
      totalSeats: 100,
      seatsRemaining: 23,
      earlyBirdDeadline: '2026-03-15',
      earlyBirdMessage: 'Early Bird Discount समाप्त होने में सिर्फ 3 दिन!',
      showLiveCount: true,
    },
    trustBadges: [
      { title: 'Yoga Alliance Certified', image: '' },
      { title: '10,000+ Students', image: '' },
      { title: 'Secure Payment', image: '' },
      { title: '4.9★ Rating', image: '' },
    ],
    leadMagnet: {
      enabled: true,
      title: 'Free E-Book: स्वर योग के 7 रहस्य',
      subtitle: 'अभी डाउनलोड करें',
      description: '15 पेज की guide जो आपको स्वर योग की मूल बातें समझाएगी।',
      buttonText: 'Free Download',
      downloadUrl: '#',
    },
    popup: {
      enabled: true,
      type: 'exit-intent',
      title: 'रुकिए! Special Offer!',
      description: 'अभी register करें और ₹500 की extra छूट पाएं।',
      ctaText: 'Discount पाएं',
      ctaLink: '#pricing',
    },
    stickyHeader: {
      enabled: true,
      text: 'स्वर योग मास्टरक्लास',
      ctaText: 'अभी जॉइन करें',
      ctaLink: '#pricing',
      showCountdown: true,
    },
    registrationForm: {
      enabled: true,
      title: 'Free Demo के लिए Register करें',
      subtitle: 'पहले 50 registrations को special discount!',
      fields: [
        { name: 'name', type: 'text', required: true, placeholder: 'आपका नाम' },
        { name: 'email', type: 'email', required: true, placeholder: 'Email Address' },
        { name: 'phone', type: 'phone', required: true, placeholder: 'WhatsApp Number' },
      ],
      submitText: 'Free Demo बुक करें',
      successMessage: 'धन्यवाद! हम WhatsApp पर जल्द संपर्क करेंगे।',
    },
    liveNotifications: {
      enabled: true,
      messages: [
        'रोहित ने अभी Delhi से enrollment किया!',
        'अंकिता ने Mumbai से Premium plan लिया!',
        'सुरेश ने Jaipur से register किया!',
        '15 मिनट पहले किसी ने enrollment किया',
        'अभी 47 लोग यह page देख रहे हैं',
      ],
    },
    contactInfo: {
      email: 'support@swaryoga.com',
      phone: '+91 98765 43210',
      address: 'Swar Yoga Institute, Mumbai, India',
    },
    footer: {
      showAbout: true,
      aboutText: 'Swar Yoga प्राचीन भारतीय योग विज्ञान को आधुनिक तरीके से सिखाता है।',
      socialLinks: {
        facebook: 'https://facebook.com/swaryoga',
        instagram: 'https://instagram.com/swaryoga',
        youtube: 'https://youtube.com/swaryoga',
      },
      quickLinks: [
        { label: 'About Us', href: '/about' },
        { label: 'Contact', href: '/contact' },
        { label: 'Blog', href: '/blog' },
      ],
      showPrivacyPolicy: true,
      showTerms: true,
      showRefundPolicy: true,
      copyrightText: '© 2026 Swar Yoga. All rights reserved.',
    },
    demoSession: {
      enabled: true,
      title: 'मुफ्त परिचय सत्र',
      description: 'स्वर योग क्या है और यह आपके जीवन को कैसे बदल सकता है - जानिए इस मुफ्त सत्र में',
      date: '2026-03-15',
      time: '7:00 PM IST',
      zoomLink: '',
    },
    faqs: [
      { question: 'क्या यह कोर्स शुरुआती लोगों के लिए है?', answer: 'हाँ, यह कोर्स पूरी तरह से शुरुआती लोगों के लिए डिज़ाइन किया गया है। कोई पूर्व अनुभव आवश्यक नहीं है।' },
      { question: 'क्लास कितनी देर की होती है?', answer: 'प्रत्येक क्लास 90 मिनट की होती है - 60 मिनट सिद्धांत और 30 मिनट अभ्यास।' },
      { question: 'क्या रिकॉर्डिंग मिलेगी?', answer: 'हाँ, सभी क्लास की रिकॉर्डिंग 1 साल तक उपलब्ध रहेगी।' },
      { question: 'सर्टिफिकेट मिलेगा?', answer: 'हाँ, कोर्स पूरा करने पर Swar Yoga से प्रमाणित सर्टिफिकेट मिलेगा।' },
    ],
    theme: {
      mode: 'light',
      primaryColor: '#FF6B35',
      secondaryColor: '#1E3A5F',
      accentColor: '#FFD700',
      backgroundColor: '#FFF9F5',
      textColor: '#2D3748',
      fontFamily: 'Poppins',
    },
    seo: {
      title: 'स्वर योग मास्टरक्लास - 6 माह का हिंदी कोर्स | Swar Yoga',
      description: 'स्वर योग सीखें हिंदी में। प्राणायाम, नाड़ी शोधन, स्वर ज्योतिष की पूर्ण शिक्षा। Live classes + Certificate.',
      keywords: ['स्वर योग', 'प्राणायाम', 'yoga in hindi', 'swar yoga course'],
    },
    integrations: {
      whatsappNumber: '919876543210',
      whatsappMessage: 'नमस्ते! मुझे स्वर योग हिंदी कोर्स के बारे में जानकारी चाहिए।',
    },
    countdown: {
      enabled: true,
      endDate: '2026-03-19T19:00:00',
      message: 'अगला बैच शुरू होने में:',
    },
    socialProof: {
      studentsCount: 10000,
      reviewsCount: 500,
      avgRating: 4.9,
      yearsExperience: 15,
    },
    views: 0,
    conversions: 0,
  },
  {
    slug: 'swar-yoga-masterclass-english',
    name: 'Swar Yoga Masterclass - English Batch',
    status: 'draft',
    heroHeading: 'Master the Ancient Science of Swar Yoga',
    heroSubheading: 'A 6-month comprehensive program to unlock the secrets of breath, energy, and cosmic rhythms for life transformation.',
    heroCTA: 'Enroll Now',
    heroImage: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=1920',
    eventTitle: 'Swar Yoga Masterclass',
    eventDescription: 'Dive deep into the ancient wisdom of Swar Yoga. Learn to harness the power of breath, understand energy channels, and make life-changing decisions using Swar science.',
    startDate: '2026-03-23',
    endDate: '2026-09-23',
    eventTime: '9:00 AM - 10:30 AM IST',
    location: 'Online via Zoom',
    language: 'English',
    // World-Class Features
    heroQuickBenefits: [
      { icon: '✓', text: 'Live Interactive Classes' },
      { icon: '✓', text: 'Yoga Alliance Certificate' },
      { icon: '✓', text: '1:1 Mentorship Sessions' },
      { icon: '✓', text: 'Lifetime Recording Access' },
    ],
    heroSecondaryCTA: {
      enabled: true,
      text: 'Watch Free Demo',
      link: '#video',
    },
    announcementBar: {
      enabled: true,
      text: '🌟 Spring Special: $10 OFF with code SPRING2026',
      backgroundColor: '#4F46E5',
      textColor: '#FFFFFF',
    },
    videoSection: {
      enabled: true,
      title: 'What is Swar Yoga?',
      description: 'In just 5 minutes, discover how this ancient science can transform your life.',
      videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      thumbnailUrl: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=1280',
    },
    problemStatement: {
      enabled: true,
      title: 'Are You Struggling With These?',
      points: [
        { icon: '😰', title: 'Chronic Stress', description: 'Constant anxiety affecting your daily life' },
        { icon: '😴', title: 'Sleep Issues', description: 'Insomnia or poor quality sleep' },
        { icon: '🤔', title: 'Decision Paralysis', description: 'Unable to make important life decisions' },
        { icon: '😤', title: 'Low Energy', description: 'Feeling drained throughout the day' },
      ],
    },
    solution: {
      enabled: true,
      title: 'Discover the Power of Swar Yoga',
      description: 'Swar Yoga is the ancient science of breath that helps you tap into cosmic rhythms for optimal health, decision-making, and spiritual growth. Used by yogis for 5000+ years.',
      points: [
        'Just 15 minutes daily practice for life-changing results',
        'No expensive equipment needed - practice anywhere',
        'Learn from certified experts with 15+ years experience',
        'Join a global community of 10,000+ practitioners',
      ],
    },
    howItWorks: {
      enabled: true,
      title: 'Your Journey in 4 Simple Steps',
      steps: [
        { number: 1, title: 'Enroll Today', description: 'Secure your spot in our exclusive batch' },
        { number: 2, title: 'Get Onboarded', description: 'Receive welcome kit & join WhatsApp community' },
        { number: 3, title: 'Learn & Practice', description: 'Attend live classes 3x/week with recordings' },
        { number: 4, title: 'Transform', description: 'See real changes & earn your certificate' },
      ],
    },
    transformation: {
      enabled: true,
      title: 'Your 6-Month Transformation',
      before: {
        title: 'Before',
        points: ['Stressed & anxious', 'Poor sleep quality', 'Indecisive', 'Low energy', 'Disconnected'],
      },
      after: {
        title: 'After This Course',
        points: ['Calm & centered', 'Deep restful sleep', 'Confident decisions', 'Energized all day', 'Spiritually connected'],
      },
    },
    bonuses: [
      { title: 'Swar Yoga E-Book', description: '100+ page comprehensive guide', value: 29, currency: 'USD' },
      { title: 'Guided Meditation Pack', description: '10 audio meditations', value: 19, currency: 'USD' },
      { title: 'Private Community Access', description: 'Exclusive Facebook group', value: 49, currency: 'USD' },
    ],
    guarantee: {
      enabled: true,
      days: 14,
      title: '14-Day Money-Back Guarantee',
      description: 'Try the program risk-free. If you are not completely satisfied within 14 days, we will refund 100% of your investment.',
    },
    urgency: {
      enabled: true,
      limitedSeats: true,
      totalSeats: 50,
      seatsRemaining: 12,
      earlyBirdMessage: 'Early Bird Price Ends Soon!',
      showLiveCount: true,
    },
    trustBadges: [
      { title: 'Yoga Alliance' },
      { title: '10,000+ Students' },
      { title: 'Secure Checkout' },
      { title: '4.9★ Rating' },
    ],
    successStories: [
      {
        name: 'Sarah M.',
        title: 'Marketing Executive, USA',
        beforeStats: 'Burnout Score: 8/10',
        afterStats: 'Burnout Score: 2/10',
        testimonial: 'Swar Yoga saved my career. I was on the verge of quitting due to stress. Now I handle high-pressure situations with ease.',
        duration: '4 months',
      },
    ],
    pricing: [
      {
        name: 'Standard',
        price: 21,
        currency: 'USD',
        originalPrice: 35,
        features: ['Live Classes', 'Recording Access', 'WhatsApp Community', 'Certificate'],
        isPopular: false,
        ctaText: 'Join Now',
        paymentLink: '',
      },
      {
        name: 'Premium',
        price: 49,
        currency: 'USD',
        originalPrice: 79,
        features: ['Everything in Standard', '1-on-1 Mentoring', 'Personalized Practice Plan', 'Lifetime Access', 'Priority Support'],
        isPopular: true,
        ctaText: 'Go Premium',
        paymentLink: '',
      },
    ],
    instructorName: 'Swar Yoga Team',
    instructorTitle: 'Certified Swar Yoga Educators',
    instructorBio: 'With 15+ years of experience, our team has trained over 10,000 students worldwide in the authentic practices of Swar Yoga.',
    benefits: [
      { icon: '🌬️', title: 'Breath Mastery', description: 'Learn advanced Pranayama and Nadi Shodhana techniques' },
      { icon: '🔮', title: 'Swar Astrology', description: 'Predict outcomes using the ancient science of breath' },
      { icon: '💪', title: 'Health Transformation', description: 'Improve physical and mental well-being naturally' },
      { icon: '🧘', title: 'Spiritual Growth', description: 'Deepen your meditation and self-awareness practice' },
      { icon: '📅', title: 'Daily Application', description: 'Use Swar Yoga for everyday decision making' },
      { icon: '🎯', title: 'Decision Power', description: 'Make the right decisions at the right time' },
    ],
    curriculum: [
      { title: 'Introduction to Swar Yoga', description: 'Foundations and history of Swar science', duration: 'Week 1-2' },
      { title: 'Ida & Pingala Nadis', description: 'Understanding the two main energy channels', duration: 'Week 3-4' },
      { title: 'Five Elements & Swar', description: 'Connection between Panchtattva and breath', duration: 'Week 5-8' },
      { title: 'Swar Astrology', description: 'Prediction and guidance through breath', duration: 'Week 9-12' },
      { title: 'Advanced Pranayama', description: 'Deep breathing techniques and Kumbhaka', duration: 'Week 13-20' },
      { title: 'Practical Integration', description: 'Daily life applications and mastery', duration: 'Week 21-24' },
    ],
    testimonials: [
      { name: 'Sarah Johnson', location: 'USA', text: 'This course completely transformed how I approach life decisions. The breath awareness is incredible!', rating: 5 },
      { name: 'Michael Chen', location: 'Singapore', text: 'Finally found authentic Swar Yoga teaching. The team is knowledgeable and supportive.', rating: 5 },
      { name: 'Emma Williams', location: 'UK', text: 'My health has improved significantly since starting the Pranayama practices. Highly recommend!', rating: 5 },
    ],
    demoSession: {
      enabled: true,
      title: 'Free Introduction Session',
      description: 'Discover what Swar Yoga is and how it can transform your life in this free introductory session.',
      date: '2026-03-20',
      time: '9:00 AM IST',
      zoomLink: '',
    },
    faqs: [
      { question: 'Is this suitable for beginners?', answer: 'Absolutely! This course is designed from the ground up for complete beginners. No prior experience required.' },
      { question: 'How long is each class?', answer: 'Each class is 90 minutes - 60 minutes of theory and 30 minutes of guided practice.' },
      { question: 'Will recordings be available?', answer: 'Yes, all classes are recorded and available for 1 year for revision.' },
      { question: 'Do I get a certificate?', answer: 'Yes, you will receive an official Swar Yoga certificate upon completion.' },
    ],
    theme: {
      mode: 'light',
      primaryColor: '#0EA5E9',
      secondaryColor: '#0369A1',
      accentColor: '#F97316',
      backgroundColor: '#F0F9FF',
      textColor: '#1E3A5F',
      fontFamily: 'Inter',
    },
    seo: {
      title: 'Swar Yoga Masterclass - 6 Month English Course | Swar Yoga',
      description: 'Learn authentic Swar Yoga in English. Pranayama, Nadi Shodhana, Swar Astrology. Live classes + Certificate.',
      keywords: ['swar yoga', 'pranayama', 'yoga course', 'breath yoga', 'nadi shodhana'],
    },
    integrations: {
      whatsappNumber: '919876543210',
      whatsappMessage: 'Hello! I want to know more about the Swar Yoga English course.',
    },
    countdown: {
      enabled: true,
      endDate: '2026-03-23T09:00:00',
      message: 'Next batch starts in:',
    },
    socialProof: {
      studentsCount: 10000,
      reviewsCount: 500,
      avgRating: 4.9,
      yearsExperience: 15,
    },
    views: 0,
    conversions: 0,
  },
  {
    slug: 'swar-yoga-weekend-intensive',
    name: 'Swar Yoga Weekend Intensive',
    status: 'draft',
    heroHeading: 'Swar Yoga Weekend Intensive Workshop',
    heroSubheading: '2-Day deep dive into Swar Yoga fundamentals. Perfect for busy professionals who want quick yet powerful transformation.',
    heroCTA: 'Reserve Your Spot',
    heroImage: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=1920',
    eventTitle: 'Weekend Intensive Workshop',
    eventDescription: 'Packed 2-day workshop covering the essentials of Swar Yoga. Learn the core practices you can immediately apply in your daily life.',
    startDate: '2026-04-05',
    endDate: '2026-04-06',
    eventTime: '10:00 AM - 5:00 PM IST',
    location: 'Online via Zoom',
    language: 'English + Hindi',
    pricing: [
      {
        name: 'Early Bird',
        price: 999,
        currency: 'INR',
        originalPrice: 1999,
        features: ['2 Full Days', 'Practice Kit PDF', 'Recording Access', 'Certificate'],
        isPopular: true,
        ctaText: 'Get Early Bird Price',
        paymentLink: '',
      },
    ],
    instructorName: 'Swar Yoga Team',
    instructorTitle: 'Certified Swar Yoga Educators',
    instructorBio: 'Expert guidance from our certified team for an intensive learning experience.',
    benefits: [
      { icon: '⚡', title: 'Quick Learning', description: 'Learn core concepts in just 2 days' },
      { icon: '🎯', title: 'Practical Focus', description: 'Hands-on techniques you can use immediately' },
      { icon: '📚', title: 'Complete Kit', description: 'Get practice materials and cheat sheets' },
      { icon: '🏆', title: 'Certificate', description: 'Receive completion certificate' },
    ],
    curriculum: [
      { title: 'Day 1 Morning', description: 'Swar Yoga basics, Nadi introduction', duration: '3 hours' },
      { title: 'Day 1 Afternoon', description: 'Pranayama practices, Element recognition', duration: '4 hours' },
      { title: 'Day 2 Morning', description: 'Swar timing, Decision making', duration: '3 hours' },
      { title: 'Day 2 Afternoon', description: 'Integration practice, Q&A', duration: '4 hours' },
    ],
    testimonials: [
      { name: 'Priya Mehta', location: 'Bangalore', text: 'Amazing weekend! I learned more in 2 days than months of reading books.', rating: 5 },
    ],
    demoSession: { enabled: false },
    faqs: [
      { question: 'What if I miss a session?', answer: 'Full recordings will be provided within 24 hours.' },
      { question: 'Is lunch break included?', answer: 'Yes, there is a 1-hour lunch break each day.' },
    ],
    theme: {
      mode: 'custom',
      primaryColor: '#7C3AED',
      secondaryColor: '#4C1D95',
      accentColor: '#F59E0B',
      backgroundColor: '#FAF5FF',
      textColor: '#1F2937',
      fontFamily: 'Poppins',
    },
    seo: {
      title: 'Swar Yoga Weekend Intensive - 2 Day Workshop | Swar Yoga',
      description: '2-day intensive Swar Yoga workshop. Learn core practices quickly. Perfect for busy professionals.',
    },
    integrations: {
      whatsappNumber: '919876543210',
      whatsappMessage: 'Hi! I am interested in the Weekend Intensive workshop.',
    },
    countdown: {
      enabled: true,
      endDate: '2026-04-05T10:00:00',
      message: 'Workshop starts in:',
    },
    socialProof: {
      studentsCount: 5000,
      reviewsCount: 250,
      avgRating: 4.8,
      yearsExperience: 15,
    },
    views: 0,
    conversions: 0,
  },
  {
    slug: 'pranayama-breath-mastery',
    name: 'Pranayama & Breath Mastery Course',
    status: 'draft',
    heroHeading: 'Pranayama & Breath Mastery',
    heroSubheading: 'A specialized 3-month course focused entirely on breathing techniques. From basic to advanced Pranayama.',
    heroCTA: 'Start Breathing Better',
    heroImage: 'https://images.unsplash.com/photo-1593811167562-9cef47bfc4d7?w=1920',
    eventTitle: 'Pranayama Mastery Program',
    eventDescription: 'Deep dive into 20+ Pranayama techniques. Transform your health, energy, and mental clarity through the power of breath.',
    startDate: '2026-04-15',
    endDate: '2026-07-15',
    eventTime: '6:00 AM - 7:00 AM IST',
    location: 'Online via Zoom',
    language: 'Hindi',
    pricing: [
      {
        name: 'Standard',
        price: 1999,
        currency: 'INR',
        originalPrice: 3499,
        features: ['12 Weeks Program', '20+ Techniques', 'Daily Practice', 'Health Tracking'],
        isPopular: true,
        ctaText: 'Join Now',
        paymentLink: '',
      },
    ],
    instructorName: 'Swar Yoga Team',
    instructorTitle: 'Pranayama Specialists',
    instructorBio: 'Our specialized Pranayama experts will guide you through authentic breathing practices.',
    benefits: [
      { icon: '🌬️', title: '20+ Techniques', description: 'Learn comprehensive breathing methods' },
      { icon: '❤️', title: 'Heart Health', description: 'Improve cardiovascular function' },
      { icon: '🧠', title: 'Mental Clarity', description: 'Sharpen focus and concentration' },
      { icon: '😴', title: 'Better Sleep', description: 'Sleep deeper and wake refreshed' },
      { icon: '🔋', title: 'Energy Boost', description: 'Feel more energetic throughout the day' },
      { icon: '😌', title: 'Stress Relief', description: 'Natural anxiety and stress management' },
    ],
    curriculum: [
      { title: 'Foundation Breathing', description: 'Diaphragmatic and basic techniques', duration: 'Week 1-2' },
      { title: 'Nadi Shodhana', description: 'Alternate nostril breathing mastery', duration: 'Week 3-4' },
      { title: 'Kapalbhati & Bhastrika', description: 'Energizing breath techniques', duration: 'Week 5-6' },
      { title: 'Ujjayi & Bhramari', description: 'Calming breath practices', duration: 'Week 7-8' },
      { title: 'Kumbhaka', description: 'Breath retention practices', duration: 'Week 9-10' },
      { title: 'Integration', description: 'Creating your daily routine', duration: 'Week 11-12' },
    ],
    testimonials: [
      { name: 'Vikram Singh', location: 'Chandigarh', text: 'My BP is now normal without medicine. Pranayama changed my life!', rating: 5 },
      { name: 'Anita Rao', location: 'Hyderabad', text: 'Sleep quality improved dramatically. Wake up fresh every morning now.', rating: 5 },
    ],
    demoSession: {
      enabled: true,
      title: 'Free Pranayama Session',
      description: 'Experience the power of breath in this free introductory class.',
      date: '2026-04-10',
      time: '6:00 AM IST',
      zoomLink: '',
    },
    faqs: [
      { question: 'What time are the classes?', answer: 'Classes are early morning 6-7 AM, the best time for Pranayama practice.' },
      { question: 'Can I practice if I have asthma?', answer: 'Yes, but please consult your doctor first. Many Pranayama techniques actually help manage asthma.' },
    ],
    theme: {
      mode: 'light',
      primaryColor: '#059669',
      secondaryColor: '#065F46',
      accentColor: '#FCD34D',
      backgroundColor: '#F0FDF4',
      textColor: '#1F2937',
      fontFamily: 'Roboto',
    },
    seo: {
      title: 'Pranayama Course - Breath Mastery Program | Swar Yoga',
      description: 'Learn 20+ Pranayama techniques. 3-month breath mastery program. Early morning classes.',
    },
    integrations: {
      whatsappNumber: '919876543210',
      whatsappMessage: 'Hi! I want to join the Pranayama course.',
    },
    countdown: {
      enabled: true,
      endDate: '2026-04-15T06:00:00',
      message: 'Course starts in:',
    },
    socialProof: {
      studentsCount: 8000,
      reviewsCount: 400,
      avgRating: 4.9,
      yearsExperience: 15,
    },
    views: 0,
    conversions: 0,
  },
  {
    slug: 'swar-yoga-teacher-training',
    name: 'Swar Yoga Teacher Training Program',
    status: 'draft',
    heroHeading: 'Become a Certified Swar Yoga Teacher',
    heroSubheading: '200-hour comprehensive teacher training program. Learn to teach Swar Yoga professionally and transform lives.',
    heroCTA: 'Apply for Training',
    heroImage: 'https://images.unsplash.com/photo-1599901860904-17e6ed7083a0?w=1920',
    eventTitle: 'Teacher Training Program',
    eventDescription: 'Comprehensive 200-hour certification program for those who want to teach Swar Yoga professionally. Includes teaching methodology, anatomy, and business guidance.',
    startDate: '2026-05-01',
    endDate: '2026-10-31',
    eventTime: 'Weekends: 9:00 AM - 1:00 PM IST',
    location: 'Online + In-person Workshops',
    language: 'English + Hindi',
    pricing: [
      {
        name: 'Full Payment',
        price: 25000,
        currency: 'INR',
        originalPrice: 35000,
        features: ['200 Hours Training', 'Teaching Practice', 'Yoga Alliance Style Certificate', 'Business Mentoring', 'Lifetime Alumni Network'],
        isPopular: false,
        ctaText: 'Enroll Now',
        paymentLink: '',
      },
      {
        name: 'EMI Option',
        price: 5000,
        currency: 'INR',
        features: ['6 Monthly Installments', 'Same Benefits', 'No Extra Cost', 'Flexible Payments'],
        isPopular: true,
        ctaText: 'Start with EMI',
        paymentLink: '',
      },
    ],
    instructorName: 'Senior Swar Yoga Faculty',
    instructorTitle: 'Master Trainers',
    instructorBio: 'Learn from our most experienced teachers who have trained 500+ certified Swar Yoga instructors.',
    benefits: [
      { icon: '🎓', title: '200 Hour Certification', description: 'Internationally recognized training hours' },
      { icon: '📖', title: 'Complete Curriculum', description: 'Theory, practice, anatomy, and teaching skills' },
      { icon: '🎤', title: 'Teaching Practice', description: 'Practice teaching with real students' },
      { icon: '💼', title: 'Business Training', description: 'Learn to build your yoga business' },
      { icon: '🤝', title: 'Alumni Network', description: 'Join our global community of teachers' },
      { icon: '📜', title: 'Certification', description: 'Official Swar Yoga Teacher Certificate' },
    ],
    curriculum: [
      { title: 'Module 1: Foundations', description: 'Swar Yoga philosophy, history, and core concepts', duration: 'Month 1' },
      { title: 'Module 2: Anatomy', description: 'Subtle body, Nadis, Chakras, and energy systems', duration: 'Month 2' },
      { title: 'Module 3: Techniques', description: 'All Pranayama and Swar practices', duration: 'Month 3' },
      { title: 'Module 4: Teaching Skills', description: 'Class sequencing, cueing, and adjustments', duration: 'Month 4' },
      { title: 'Module 5: Practice Teaching', description: 'Supervised teaching practice', duration: 'Month 5' },
      { title: 'Module 6: Business & Certification', description: 'Building your yoga career, final assessment', duration: 'Month 6' },
    ],
    testimonials: [
      { name: 'Dr. Kavita Sharma', location: 'Delhi', text: 'Now running my own successful Swar Yoga studio. This training gave me everything I needed.', rating: 5 },
      { name: 'Rahul Verma', location: 'Pune', text: 'The teaching methodology was excellent. I felt confident from my very first class.', rating: 5 },
    ],
    demoSession: {
      enabled: true,
      title: 'TTC Information Session',
      description: 'Learn about the program structure, requirements, and career opportunities in Swar Yoga.',
      date: '2026-04-20',
      time: '11:00 AM IST',
      zoomLink: '',
    },
    faqs: [
      { question: 'What are the prerequisites?', answer: 'You should have at least 6 months of personal yoga practice. No teaching experience required.' },
      { question: 'Is the certificate recognized?', answer: 'Yes, our certificate is recognized industry-wide and you can register with Yoga Alliance after completion.' },
      { question: 'Can I teach after this program?', answer: 'Absolutely! You will be fully qualified to teach Swar Yoga professionally.' },
      { question: 'Is EMI available?', answer: 'Yes, we offer 6-month EMI at no extra cost.' },
    ],
    theme: {
      mode: 'dark',
      primaryColor: '#F59E0B',
      secondaryColor: '#D97706',
      accentColor: '#FCD34D',
      backgroundColor: '#1A1A2E',
      textColor: '#E2E8F0',
      fontFamily: 'Poppins',
    },
    seo: {
      title: 'Swar Yoga Teacher Training - 200 Hour Certification | Swar Yoga',
      description: 'Become a certified Swar Yoga teacher. 200-hour professional training program with business mentoring.',
    },
    integrations: {
      whatsappNumber: '919876543210',
      whatsappMessage: 'Hello! I am interested in the Teacher Training Program.',
    },
    countdown: {
      enabled: true,
      endDate: '2026-05-01T09:00:00',
      message: 'Training starts in:',
    },
    socialProof: {
      studentsCount: 500,
      reviewsCount: 120,
      avgRating: 5.0,
      yearsExperience: 15,
    },
    views: 0,
    conversions: 0,
  },
];

async function seedLandingPages() {
  if (!MONGODB_URI) {
    console.error('❌ MONGODB_URI not found in environment');
    process.exit(1);
  }

  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');

    const db = client.db('swaryogaDB');
    const collection = db.collection('landingpages');

    // Check for existing pages
    const existingSlugs = await collection.find({}, { projection: { slug: 1 } }).toArray();
    const existingSlugSet = new Set(existingSlugs.map(p => p.slug));

    let inserted = 0;
    let skipped = 0;

    for (const page of sampleLandingPages) {
      if (existingSlugSet.has(page.slug)) {
        console.log(`⏭️  Skipping "${page.name}" - already exists`);
        skipped++;
        continue;
      }

      const doc = {
        ...page,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await collection.insertOne(doc);
      console.log(`✅ Created: ${page.name}`);
      inserted++;
    }

    console.log('\n📊 Summary:');
    console.log(`   Inserted: ${inserted}`);
    console.log(`   Skipped: ${skipped}`);
    console.log('\n🎉 Done! Check /admin/landing-pages to see your sample pages.');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
  }
}

seedLandingPages();
