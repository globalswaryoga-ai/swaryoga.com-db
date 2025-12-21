'use client';

import React, { useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { ArrowLeft, Calendar, User, Clock, Tag } from 'lucide-react';

interface BlogPost {
  id: string;
  title: { en: string; hi: string; mr: string };
  excerpt: { en: string; hi: string; mr: string };
  content: { en: string; hi: string; mr: string };
  author: string;
  date: string;
  readTime: { en: string; hi: string; mr: string };
  image: string;
  slug: string;
  category: string;
}

export default function BlogPostPage() {
  const params = useParams();
  const slug = (params?.slug as string) || '';
  const [language, setLanguage] = useState<'en' | 'hi' | 'mr'>('en');
  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);

  // Blog posts data with full content
  const blogPosts: BlogPost[] = useMemo(() => ([
    {
      id: '1',
      slug: 'sleep-postures-swar-yoga',
      title: {
        en: 'Mastering Sleep Postures for Better Health with Swar Yoga',
        hi: 'स्वर योग के साथ बेहतर स्वास्थ्य के लिए सोने की मुद्राओं में महारत हासिल करना',
        mr: 'स्वर योग सह उत्तम आरोग्यासाठी झोप मुद्रा आत्मसात करणे',
      },
      excerpt: {
        en: 'Learn how the right sleep posture can transform your health with ancient Swar Yoga principles. Discover the science behind body positioning and its impact on your respiratory system.',
        hi: 'जानिए कि सही सोने की मुद्रा प्राचीन स्वर योग सिद्धांतों के साथ आपके स्वास्थ्य को कैसे बदल सकती है। शरीर की स्थिति के पीछे के विज्ञान और आपकी श्वसन प्रणाली पर इसके प्रभाव को खोजें।',
        mr: 'जाणून घ्या की योग्य झोप मुद्रा प्राचीन स्वर योग तत्वांसह तुमच्या आरोग्यास कसे बदलू शकते. शरीराच्या स्थितीमागील विज्ञान आणि तुमच्या श्वसन प्रणालीवरील त्याचा प्रभाव शोधा.',
      },
      content: {
        en: `Sleep is one of the most critical aspects of our health, yet many of us overlook the importance of sleeping posture. In Swar Yoga, an ancient Indian science, the position of our body during sleep plays a vital role in maintaining physical, mental, and emotional balance.

The traditional Swar Yoga texts emphasize that sleeping on the left side activates the Ida Nadi (left energy channel), promoting a cooling and calming effect on the nervous system. This posture is particularly beneficial during the day and early evening, helping to reduce mental anxiety and promote peaceful sleep.

Conversely, sleeping on the right side activates the Pingala Nadi (right energy channel), which has a warming, energizing effect. This can be beneficial for those who need to wake up refreshed and energized.

Modern sleep science corroborates these ancient principles. Research has shown that sleeping on the left side can reduce acid reflux, improve heart function, and enhance spinal alignment. It also promotes better drainage of the lymphatic system and can help reduce snoring.

The prone sleeping position (face down) is generally discouraged in both Swar Yoga and modern medicine, as it strains the neck and can disrupt natural breathing patterns. The supine position (face up), while beneficial for spinal alignment, should be modified with proper pillow support.

Key principles for optimal sleep posture:
1. Choose the side that corresponds to your current energetic needs
2. Use a pillow that maintains proper cervical spine alignment
3. Place a pillow between the knees to maintain hip alignment
4. Keep the bottom arm extended or under the pillow
5. Ensure the shoulder is not rolled forward

By applying these Swar Yoga principles to your sleep routine, you can enhance the quality of your rest, improve your respiratory function, and promote overall wellness. The key is consistency and paying attention to how different postures make you feel.

Remember, the best sleeping position is ultimately the one that feels most comfortable and supportive for your individual body. However, being mindful of these principles can help you make the most effective choice for your health.`,
        hi: `नींद हमारे स्वास्थ्य के सबसे महत्वपूर्ण पहलुओं में से एक है, फिर भी हम में से कई सोने की मुद्रा के महत्व को नज़रअंदाज़ करते हैं। स्वर योग में, एक प्राचीन भारतीय विज्ञान, नींद के दौरान हमारे शरीर की स्थिति शारीरिक, मानसिक और भावनात्मक संतुलन बनाए रखने में महत्वपूर्ण भूमिका निभाती है।

परंपरागत स्वर योग ग्रंथ इस बात पर जोर देते हैं कि बाईं ओर सोने से इड़ा नाड़ी (बाईं ऊर्जा चैनल) सक्रिय होती है, जो तंत्रिका तंत्र पर शीतलन और शांत प्रभाव को बढ़ावा देती है। यह मुद्रा विशेष रूप से दिन और शाम के समय लाभकारी है, मानसिक चिंता को कम करने और शांतिपूर्ण नींद को बढ़ावा देने में मदद करती है।

इसके विपरीत, दाईं ओर सोने से पिंगला नाड़ी (दाईं ऊर्जा चैनल) सक्रिय होती है, जिसका तापन, ऊर्जावान प्रभाव होता है। यह उन लोगों के लिए लाभकारी हो सकता है जो तरोताज़ा और ऊर्जावान होकर जागना चाहते हैं।

आधुनिक नींद विज्ञान इन प्राचीन सिद्धांतों की पुष्टि करता है। शोध से पता चला है कि बाईं ओर सोने से एसिड रिफ्लक्स कम हो सकता है, हृदय क्रिया में सुधार हो सकता है, और रीढ़ की हड्डी के संरेखण को बढ़ाया जा सकता है।

स्वर योग और आधुनिक चिकित्सा दोनों में प्रवण सोने की स्थिति (चेहरा नीचे) आम तौर पर हतोत्साहित की जाती है, क्योंकि यह गर्दन को तनाव देती है और प्राकृतिक श्वास पैटर्न को बाधित कर सकती है।

इन स्वर योग सिद्धांतों को अपनी नींद की दिनचर्या में लागू करके, आप अपनी आराम की गुणवत्ता को बढ़ा सकते हैं, अपने श्वसन कार्य में सुधार कर सकते हैं, और समग्र कल्याण को बढ़ावा दे सकते हैं।`,
        mr: `झोप हे आमच्या आरोग्यातील सर्वात महत्वाचे बाबी आहे, तरी आपल्यातील बहुतेक झोप मुद्राचे महत्व दुर्लक्ष करतात. स्वर योगामध्ये, एक प्राचीन भारतीय विज्ञान, झोपेच्या वेळी आपल्या शरीराची स्थिती शारीरिक, मानसिक आणि भावनिक संतुलन राखण्यात महत्वाची भूमिका निभाते.

परंपरागत स्वर योग ग्रंथ जोर देतात की डाव्या बाजूला झोपणे इड़ा नाडी (डावी ऊर्जा चैनल) सक्रिय करते, तंत्रिका तंत्रावर शीतलन आणि शांत प्रभाव टाकते. ही मुद्रा विशेषतः दिवसभरात आणि संध्याकाळी फायदेशीर आहे, मानसिक चिंता कमी करण्यास आणि शांत झोप वर्धन करण्यास मदत करते.

याउलट, उजव्या बाजूला झोपणे पिंगला नाडी (उजवी ऊर्जा चैनल) सक्रिय करते, ज्याचा तापन, ऊर्जादायक प्रभाव असतो. हे त्यांच्यासाठी फायदेशीर असू शकते जे तरोताज़ा आणि ऊर्जावान होऊन जागे व्हायचे आहेत.

आधुनिक झोप विज्ञान या प्राचीन तत्वांचे समर्थन करते.`
      },
      author: 'Yogacharya Mohan Kalburgi',
      date: '2024-04-21',
      readTime: { en: '8 min read', hi: '8 मिनट पढ़ने का समय', mr: '8 मिनिट वाचन' },
      image: 'https://images.postimg.cc/D0DvYkfJ/blog-1.jpg',
      category: 'Health',
    },
    {
      id: '2',
      slug: 'science-of-breath-swar-yoga',
      title: {
        en: 'The Science of Breath: Understanding Swar Yoga Fundamentals',
        hi: 'श्वास का विज्ञान: स्वर योग मूल बातों को समझना',
        mr: 'श्वासाचा विज्ञान: स्वर योग मूलतत्वांची समज',
      },
      excerpt: {
        en: 'Explore the deep connection between breath patterns and bodily functions. Discover how Swar Yoga uses nostril breathing to balance the body\'s energy systems and improve overall wellness.',
        hi: 'श्वास पैटर्न और शारीरिक कार्यों के बीच गहरे संबंध का अन्वेषण करें। खोजें कि स्वर योग शरीर की ऊर्जा प्रणालियों को संतुलित करने और समग्र कल्याण में सुधार के लिए नथुने की श्वास का उपयोग कैसे करता है।',
        mr: 'श्वास पैटर्न आणि शारीरिक कार्यांमधील गहन संबंध शोधा. स्वर योग शरीराच्या ऊर्जा प्रणालीला संतुलित करण्यासाठी आणि एकूण आरोग्य सुधारण्यासाठी नसिका श्वास कसे वापरते हे शोधा.',
      },
      content: {
        en: `Breath is the bridge between the physical and subtle bodies. In Swar Yoga, the ancient Indian science of nostril breathing, understanding breath patterns is fundamental to unlocking optimal health and spiritual development.

The term "Swar" comes from Sanskrit, meaning "current" or "flow," referring specifically to the flow of breath through the nostrils. The principles of Swar Yoga are rooted in thousands of years of observation and experience by Indian yogis and healers.

The Two Energy Channels:

In Swar Yoga, there are two primary energy channels (nadis) through which vital life force (prana) flows:

1. Ida Nadi: The left energy channel, associated with the left nostril. This channel carries the cooling, calming energy. When Ida is dominant, your mind is calm, intuitive, and relaxed.

2. Pingala Nadi: The right energy channel, associated with the right nostril. This channel carries the warming, activating energy. When Pingala is dominant, your mind is alert, logical, and energized.

The Balance Point:

There is a third state called Sushumna, where both channels flow simultaneously in perfect balance. This state is considered ideal for meditation, spiritual practice, and overall well-being.

Natural Rhythm and Cycles:

One of the most fascinating discoveries of Swar Yoga is that nostril dominance changes naturally throughout the day in predictable cycles. Generally:

- The left nostril (Ida) dominates during cool parts of the day
- The right nostril (Pingala) dominates during warm parts of the day
- This cycle shifts approximately every 90-120 minutes

Understanding these natural rhythms allows us to align our activities with our body's inherent capabilities.

Practical Applications:

1. Creative and Mental Work: Perform when Ida is dominant (left nostril active) for enhanced intuition and creativity.

2. Physical Activities: Perform when Pingala is dominant (right nostril active) for better endurance and strength.

3. Important Decisions: Make when Sushumna is active for balanced, clear thinking.

4. Meditation: Best performed when Ida and Pingala are balanced, or when Ida is dominant.

Scientific Validation:

Modern neuroscience has begun validating these ancient principles. Research has shown that:

- Nostril dominance corresponds with hemispheric brain activation
- Left nostril breathing increases parasympathetic activation (relaxation)
- Right nostril breathing increases sympathetic activation (arousal)
- These breathing patterns affect heart rate, blood pressure, and digestive function

Practical Swar Yoga Technique:

The simplest Swar Yoga practice is Alternate Nostril Breathing (Nadi Shodhana):
1. Close the right nostril and breathe in through the left for 4 counts
2. Close the left nostril and breathe out through the right for 4 counts
3. Breathe in through the right for 4 counts
4. Close the right nostril and breathe out through the left for 4 counts
5. Repeat this cycle 5-10 times

This practice balances the nervous system, reduces stress, and prepares the mind for meditation.

Conclusion:

The science of breath in Swar Yoga offers a practical, accessible approach to health and wellness. By understanding and working with our natural breathing patterns, we can optimize our physical health, mental clarity, and spiritual development. This ancient wisdom, now validated by modern science, provides a roadmap for living in greater harmony with our body's natural rhythms.`,
        hi: `श्वास भौतिक और सूक्ष्म शरीर के बीच का पुल है। स्वर योग में, नथुने की श्वास का प्राचीन भारतीय विज्ञान, श्वास पैटर्न को समझना इष्टतम स्वास्थ्य और आध्यात्मिक विकास को अनलॉक करने के लिए मौलिक है।

"स्वर" शब्द संस्कृत से आता है, जिसका अर्थ है "करंट" या "प्रवाह", विशेष रूप से नथुने के माध्यम से श्वास के प्रवाह को संदर्भित करता है। स्वर योग के सिद्धांत हजारों वर्षों की भारतीय योगियों और चिकित्सकों द्वारा अवलोकन और अनुभव पर निहित हैं।

दो ऊर्जा चैनल:

स्वर योग में, दो प्राथमिक ऊर्जा चैनल (नाड़ियां) हैं जिनके माध्यम से महत्वपूर्ण जीवन शक्ति (प्राण) बहती है:

1. इड़ा नाड़ी: बाईं ऊर्जा चैनल, बाईं नथुने से जुड़ी। यह चैनल ठंडी, शांत ऊर्जा ले जाती है।

2. पिंगला नाड़ी: दाईं ऊर्जा चैनल, दाईं नथुने से जुड़ी। यह चैनल तापन, सक्रिय ऊर्जा ले जाती है।

संतुलन बिंदु:

एक तीसरी स्थिति है जिसे सुषुम्ना कहा जाता है, जहां दोनों चैनल एक साथ परिपूर्ण संतुलन में बहते हैं। इस स्थिति को ध्यान, आध्यात्मिक अभ्यास, और समग्र कल्याण के लिए आदर्श माना जाता है।`,
        mr: `श्वास हा भौतिक आणि सूक्ष्म शरीरांमधील पूल आहे. स्वर योगामध्ये, नसिका श्वासाचे प्राचीन भारतीय विज्ञान, श्वास पैटर्न समजणे इष्टतम आरोग्य आणि आध्यात्मिक विकास अनलॉक करण्यासाठी मूलभूत आहे.

"स्वर" शब्द संस्कृत भाषेतून आला आहे, ज्याचा अर्थ "प्रवाह" किंवा "प्रवाह" आहे, विशेषतः नसिकेद्वारे श्वासाच्या प्रवाहाचा संदर्भ घेते. स्वर योगाचे तत्व हजार वर्षांच्या भारतीय योगींच्या आणि चिकित्सकांच्या निरीक्षण आणि अनुभवावर आधारित आहेत.`
      },
      author: 'Yogacharya Mohan Kalburgi',
      date: '2024-04-28',
      readTime: { en: '10 min read', hi: '10 मिनट पढ़ने का समय', mr: '10 मिनिट वाचन' },
      image: 'https://images.postimg.cc/d8D8qGqV/blog-2.jpg',
      category: 'Education',
    },
    {
      id: '3',
      slug: 'healing-breath-swar-yoga-health',
      title: {
        en: 'Healing Through Breath: Swar Yoga for Common Health Issues',
        hi: 'श्वास के माध्यम से उपचार: सामान्य स्वास्थ्य समस्याओं के लिए स्वर योग',
        mr: 'श्वासाद्वारे उपचार: सामान्य आरोग्य समस्यांसाठी स्वर योग',
      },
      excerpt: {
        en: 'Learn practical Swar Yoga techniques to address common health challenges including stress, anxiety, digestion problems, and sleep disorders. Discover how simple breathing practices can transform your wellness journey.',
        hi: 'तनाव, चिंता, पाचन समस्याओं और नींद की समस्याओं सहित सामान्य स्वास्थ्य चुनौतियों का समाधान करने के लिए व्यावहारिक स्वर योग तकनीकें सीखें।',
        mr: 'तणाव, चिंता, पाचन समस्या आणि झोपेच्या विकारांसह सामान्य आरोग्य आव्हानांना सोडविण्यासाठी व्यावहारिक स्वर योग तंत्र शिका. साध्या श्वास अभ्यासांनी तुमच्या आरोग्य प्रवासास कसे बदलू शकते हे शोधा.',
      },
      content: {
        en: `In today's fast-paced world, many of us struggle with various health issues ranging from chronic stress and anxiety to digestive problems and sleep disorders. While modern medicine offers valuable solutions, the ancient practice of Swar Yoga provides complementary, natural approaches that can be incredibly effective.

One of the greatest gifts of Swar Yoga is its simplicity and accessibility. Unlike complex yoga asanas that require flexibility or strength, Swar Yoga techniques can be practiced by anyone, anywhere, at any time. Here are practical applications for common health challenges:

1. Stress and Anxiety:

When we're stressed, our breathing becomes shallow and rapid, typically through the right nostril (Pingala activation). This further activates our sympathetic nervous system, creating a vicious cycle of stress.

Swar Yoga Solution:
Practice left nostril breathing (Ida Nadi breathing) for 5-10 minutes:
1. Close your right nostril with your thumb
2. Breathe naturally through the left nostril
3. Focus on slow, deep breaths
4. Do this for 5-10 minutes, ideally in a quiet, comfortable space

This immediately activates the parasympathetic nervous system, bringing calm and relaxation. You can practice this whenever you feel stressed or anxious.

2. Sleep Disorders and Insomnia:

People with insomnia often have excessive Pingala (right channel) dominance, which keeps them in an alert, activated state even when trying to sleep.

Swar Yoga Solution:
Practice the following before bed:
1. Lie on your right side to naturally activate the left nostril
2. Practice left nostril breathing as described above
3. Try Alternate Nostril Breathing (Nadi Shodhana) with longer exhalations
4. When exhaling, make it slightly longer than the inhalation (4:6 count)
5. Practice for 10-15 minutes before sleep

This shifts the nervous system toward relaxation and prepares the mind for deep sleep.

3. Digestive Issues:

The right nostril (Pingala) controls digestive fire. When we're stressed, we often block the right nostril, suppressing digestion. Conversely, when digestion is weak, we lack the warming energy needed for proper metabolism.

Swar Yoga Solution:
1. Check which nostril is dominant
2. If left nostril is dominant and you're having digestive issues, practice right nostril breathing
3. Right nostril breathing increases digestive fire (agni)
4. Practice for 5 minutes before meals to enhance digestion
5. Warm herbal teas complement this practice

4. Headaches and Migraines:

Many headaches result from an imbalance between Ida and Pingala. Some people experience headaches when Pingala is too dominant (overheating) or when the channels are blocked.

Swar Yoga Solution:
1. Practice Alternate Nostril Breathing to balance both channels
2. If experiencing a hot headache, practice left nostril breathing
3. If experiencing a cold, dull headache, practice right nostril breathing
4. Regular practice prevents chronic headaches

5. High Blood Pressure:

Excessive Pingala activation (right nostril dominance) combined with stress elevates blood pressure.

Swar Yoga Solution:
1. Daily practice of left nostril breathing
2. Regular Alternate Nostril Breathing practice
3. Monitor nostril dominance and rest when left nostril is active
4. Practice during the cooler parts of the day when possible
5. Combine with meditation for enhanced effects

6. Low Energy and Fatigue:

Excessive Ida activation without Pingala balance leads to low energy and sluggishness.

Swar Yoga Solution:
1. Practice right nostril breathing when you need to boost energy
2. Practice in the warmer parts of the day
3. Combine with light exercise
4. Regular practice helps maintain energy balance throughout the day

7. Hormonal Balance:

The endocrine system is highly responsive to breathing patterns. Right nostril breathing activates warming, masculine energies, while left nostril breathing activates cooling, feminine energies.

Swar Yoga Solution:
1. Women can practice left nostril breathing during menstruation to ease symptoms
2. Both men and women benefit from balanced practice with Alternate Nostril Breathing
3. Consistent practice helps regulate hormonal cycles

Practical Guidelines:

1. Best Times to Practice: Early morning (5-7 AM) is ideal when the body is most receptive
2. Duration: Start with 5 minutes and gradually increase to 15-20 minutes
3. Frequency: Daily practice yields best results
4. Consistency: Even 5 minutes daily is better than sporadic long sessions
5. Patience: Allow 2-4 weeks to notice significant changes

Important Notes:

- These practices complement but do not replace medical treatment
- If you have a serious health condition, consult your doctor before starting
- If one nostril is completely blocked, consult an ENT specialist
- Practice should be gentle and comfortable, never forced

Conclusion:

Swar Yoga offers a powerful, accessible tool for addressing common health challenges. By understanding and working with our body's natural breathing rhythms, we can activate our inherent healing capacity. These simple practices, performed regularly, can transform not just our health, but our entire approach to living in harmony with our body's wisdom.

Start with just one technique that resonates with your current health concern. Practice consistently, observe the results, and gradually explore more techniques. The beauty of Swar Yoga is that its benefits compound over time, and its principles can be integrated into daily life effortlessly.`,
        hi: `आज की तेजी से चलती दुनिया में, हम में से कई लोग पुरानी तनाव और चिंता से लेकर पाचन समस्याओं और नींद की समस्याओं तक विभिन्न स्वास्थ्य समस्याओं से जूझते हैं। जबकि आधुनिक चिकित्सा मूल्यवान समाधान प्रदान करता है, स्वर योग की प्राचीन प्रथा पूरक, प्राकृतिक दृष्टिकोण प्रदान करती है जो अविश्वसनीय रूप से प्रभावी हो सकते हैं।

स्वर योग के सबसे बड़े उपहारों में से एक इसकी सरलता और सुलभता है। जटिल योग आसन के विपरीत जिनके लिए लचक या शक्ति की आवश्यकता होती है, स्वर योग तकनीकें किसी के द्वारा, कहीं भी, किसी भी समय अभ्यास की जा सकती हैं।

तनाव और चिंता:

जब हम तनावग्रस्त होते हैं, तो हमारी श्वास उथली और तेजी से हो जाती है, आमतौर पर दाईं नथुने के माध्यम से (पिंगला सक्रियण)। यह आगे हमारी सहानुभूतिशील तंत्रिका तंत्र को सक्रिय करता है, तनाव का एक दुष्चक्र बनाता है।

स्वर योग समाधान:
बाईं नथुने की श्वास (इड़ा नाड़ी श्वास) 5-10 मिनट के लिए अभ्यास करें:
1. अपनी दाईं नथुने को अपने अंगूठे से बंद करें
2. बाईं नथुने के माध्यम से स्वाभाविक रूप से सांस लें
3. धीमी, गहरी सांसों पर ध्यान दें
4. यह 5-10 मिनट के लिए करें, अधिमानतः एक शांत, आरामदायक स्थान में`,
        mr: `आजच्या वेगवान दुनियेत, आपल्या बहुतेकांना पुरानी तणाव आणि चिंता ते पाचन समस्या आणि झोपेच्या विकार पर्यंत विविध आरोग्य समस्यांचा सामना करावा लागतो. आधुनिक वैद्यकशास्त्र मूल्यवान समाधान प्रदान करते असले, तरी स्वर योगाची प्राचीन पद्धति पूरक, नैसर्गिक पद्धती प्रदान करते ज्या अविश्वसनीयरीत्या प्रभावी असू शकते.

स्वर योगाचे सर्वात मोठे उपहार म्हणजे त्याची सरलता आणि सुलभता. क्लिष्ट योग आसनांच्या विपरीत ज्यांना लचकपणा किंवा शक्तीची गरज आहे, स्वर योग तंत्र कोणीही कोठूही कधीही अभ्यास करू शकते.`
      },
      author: 'Yogacharya Mohan Kalburgi',
      date: '2024-05-05',
      readTime: { en: '12 min read', hi: '12 मिनट पढ़ने का समय', mr: '12 मिनिट वाचन' },
      image: 'https://images.postimg.cc/cVDjxyVc/blog-3.jpg',
      category: 'Health',
    },
  ]), []);

  useEffect(() => {
    const foundPost = blogPosts.find(p => p.slug === slug);
    setPost(foundPost || null);
    setLoading(false);
  }, [slug, blogPosts]);

  if (loading) {
    return (
      <>
        <Navigation />
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-yoga-50 to-white">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yoga-600 mx-auto mb-4"></div>
            <p className="text-swar-accent">Loading article...</p>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  if (!post) {
    return (
      <>
        <Navigation />
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-yoga-50 to-white">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-swar-accent mb-4">Article Not Found</h1>
            <p className="text-swar-primary mb-6">Sorry, we couldn't find the article you're looking for.</p>
            <Link href="/blog" className="inline-flex items-center gap-2 px-6 py-3 bg-swar-primary text-white rounded-lg hover:bg-swar-primary-hover transition">
              <ArrowLeft size={20} />
              Back to Blog
            </Link>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Navigation />
      
      <main className="min-h-screen bg-gradient-to-b from-yoga-50 to-white">
        {/* Header */}
        <div className="w-full bg-white border-b border-yoga-100">
          <div className="max-w-4xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
            <Link href="/blog" className="inline-flex items-center gap-2 text-swar-primary hover:text-swar-accent mb-6 transition">
              <ArrowLeft size={20} />
              Back to Blog
            </Link>
            
            <h1 className="text-3xl sm:text-4xl font-bold text-yoga-900 mb-4">
              {post.title[language]}
            </h1>

            {/* Metadata */}
            <div className="flex flex-wrap gap-4 text-sm text-swar-primary mb-6">
              <div className="flex items-center gap-2">
                <User size={16} />
                <span>{post.author}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar size={16} />
                <span>{new Date(post.date).toLocaleDateString(language === 'en' ? 'en-US' : language === 'hi' ? 'hi-IN' : 'mr-IN')}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock size={16} />
                <span>{post.readTime[language]}</span>
              </div>
              <div className="flex items-center gap-2">
                <Tag size={16} />
                <span className="px-3 py-1 bg-yoga-100 text-swar-accent rounded-full text-xs font-medium">
                  {post.category}
                </span>
              </div>
            </div>

            {/* Language Selector */}
            <div className="flex gap-2">
              <button
                onClick={() => setLanguage('en')}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  language === 'en'
                    ? 'bg-swar-primary text-white'
                    : 'bg-yoga-100 text-swar-accent hover:bg-yoga-200'
                }`}
              >
                English
              </button>
              <button
                onClick={() => setLanguage('hi')}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  language === 'hi'
                    ? 'bg-swar-primary text-white'
                    : 'bg-yoga-100 text-swar-accent hover:bg-yoga-200'
                }`}
              >
                हिंदी
              </button>
              <button
                onClick={() => setLanguage('mr')}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  language === 'mr'
                    ? 'bg-swar-primary text-white'
                    : 'bg-yoga-100 text-swar-accent hover:bg-yoga-200'
                }`}
              >
                मराठी
              </button>
            </div>
          </div>
        </div>

        {/* Featured Image */}
        <div className="w-full bg-yoga-100 py-8">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="relative w-full h-96 rounded-lg overflow-hidden shadow-lg">
              <Image
                src={post.image}
                alt={post.title[language]}
                fill
                className="object-cover"
                priority
              />
            </div>
          </div>
        </div>

        {/* Content */}
        <article className="max-w-4xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
          <div className="prose prose-lg max-w-none">
            <div className="text-yoga-800 leading-relaxed space-y-6">
              {post.content[language].split('\n\n').map((paragraph, index) => (
                <p key={index} className="text-base sm:text-lg">
                  {paragraph}
                </p>
              ))}
            </div>
          </div>

          {/* Author Bio */}
          <div className="mt-12 pt-8 border-t border-yoga-200">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-yoga-400 to-yoga-600 flex items-center justify-center text-white font-bold text-xl">
                MK
              </div>
              <div>
                <h3 className="font-bold text-yoga-900 mb-1">{post.author}</h3>
                <p className="text-swar-primary text-sm">
                  Renowned Swar Yoga expert and wellness educator with 20+ years of experience in holistic health practices.
                </p>
              </div>
            </div>
          </div>

          {/* Back to Blog Button */}
          <div className="mt-12 flex justify-center">
            <Link
              href="/blog"
              className="inline-flex items-center gap-2 px-8 py-3 bg-swar-primary text-white rounded-lg hover:bg-swar-primary-hover transition font-medium"
            >
              <ArrowLeft size={20} />
              Back to All Articles
            </Link>
          </div>
        </article>
      </main>

      <Footer />
    </>
  );
}
