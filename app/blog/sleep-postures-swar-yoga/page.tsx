'use client';

import BlogPostPage from '@/components/BlogPostPage';

export default function SleepPosturesPage() {
  const authorBio = {
    en: 'With over 25 years of experience in yoga and wellness, Mohan has helped thousands discover the transformative power of Swar Yoga.',
    hi: 'योग और स्वास्थ्य में 25 साल के अनुभव के साथ, मोहन ने हजारों लोगों को स्वर योग की परिवर्तनकारी शक्ति की खोज करने में मदद की है।',
    mr: 'योग आणि आरोग्यातील 25 वर्षांच्या अनुभवासह, मोहन यांनी हजारोंना स्वर योगाची परिवर्तनकारी शक्ती शोधण्यास मदत केली आहे.',
  };

  return (
    <BlogPostPage
      title={{
        en: 'Mastering Sleep Postures for Better Health with Swar Yoga',
        hi: 'स्वर योग के साथ बेहतर स्वास्थ्य के लिए नींद की मुद्राओं में महारत हासिल करना',
        mr: 'स्वर योगासह उत्तम आरोग्यासाठी झोपेच्या मुद्रांमध्ये प्रावीण्य मिळवणे',
      }}
      breadcrumbs={[
        { name: 'Blog', path: '/blog' },
        { name: 'Sleep Postures', path: '/blog/sleep-postures-swar-yoga' },
      ]}
      headerImage="https://images.pexels.com/photos/3822622/pexels-photo-3822622.jpeg"
      author="Yogacharya Mohan Kalburgi"
      date="2024-04-21"
      readTime={{
        en: '8 min read',
        hi: '8 मिनट का पठन',
        mr: '8 मिनिटांचे वाचन',
      }}
      category="Health"
      authorBio={authorBio}
      authorTitle="Swar Yoga Expert & Founder"
      authorInitials="MK"
    >
      {/* Introduction */}
      <div className="mb-12">
        <p className="text-lg leading-relaxed text-swar-text mb-6">
          In the realm of health, sleep posture plays a crucial role, and Swar Yoga offers a deeply
          insightful perspective on this. Traditional medical advice often recommends patients with
          back pain, sciatica, or neck issues to avoid using pillows and bolsters. However, Swar Yoga
          provides a more nuanced approach to sleep positioning that can enhance both comfort and
          health benefits.
        </p>
      </div>

      {/* Left Side Sleeping Benefits */}
      <div className="mb-12">
        <h2 className="text-2xl font-bold text-swar-text mb-4">The Power of Left-Side Sleep Position</h2>
        <div className="relative group mb-8">
          <img
            src="https://images.pexels.com/photos/3822621/pexels-photo-3822621.jpeg"
            alt="Person sleeping on left side"
            className="w-full h-[400px] object-cover rounded-lg shadow-lg"
          />
        </div>
        <p className="text-lg leading-relaxed text-swar-text mb-6">
          Swar Yoga emphasizes the importance of sleeping on the left side at night. This is not
          enforced rigidly but happens naturally when the mind is calm, allowing the body to remain
          in a relaxed posture all night. The left-side posture naturally applies pressure on the
          left side of the body, where an essential energy channel, or Nadi, becomes active.
        </p>
        <div className="bg-swar-primary-light p-6 rounded-lg mb-8">
          <h3 className="text-xl font-semibold text-swar-primary mb-3">Key Benefits of Left-Side Sleeping:</h3>
          <ul className="list-disc list-inside text-swar-text space-y-2">
            <li>Activates the Pingala Nadi (Sun Nadi)</li>
            <li>Enhances energy and alertness</li>
            <li>Improves digestion efficiency</li>
            <li>Maintains optimal body temperature</li>
          </ul>
        </div>
      </div>

      {/* Body Temperature and Sleep */}
      <div className="mb-12">
        <h2 className="text-2xl font-bold text-swar-text mb-4">Body Temperature Regulation During Sleep</h2>
        <p className="text-lg leading-relaxed text-swar-text mb-6">
          Maintaining body warmth during sleep is vital. The activation of the Pingala or Sun Nadi
          ensures the body's warmth is preserved, which is crucial for digestion, immune defense, and
          body temperature regulation.
        </p>
      </div>

      {/* Breathing Patterns */}
      <div className="mb-12">
        <h2 className="text-2xl font-bold text-swar-text mb-4">Understanding Sleep Breathing Patterns</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-md border border-green-100">
            <h4 className="font-semibold text-swar-text mb-2">Rest State</h4>
            <p className="text-swar-text-secondary text-lg">12-15 breaths per minute</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md border border-green-100">
            <h4 className="font-semibold text-swar-text mb-2">During Activity</h4>
            <p className="text-swar-text-secondary text-lg">18 breaths per minute</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md border border-green-100">
            <h4 className="font-semibold text-swar-text mb-2">During Sleep</h4>
            <p className="text-swar-text-secondary text-lg">18-25 breaths per minute</p>
          </div>
        </div>
      </div>

      {/* Practical Tips */}
      <div className="mb-12">
        <h2 className="text-2xl font-bold text-swar-text mb-4">Practical Sleep Tips from Swar Yoga</h2>
        <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-green-600">
          <ul className="space-y-4">
            <li className="flex items-start">
              <span className="w-2 h-2 bg-swar-primary-light0 rounded-full mt-2 mr-3 flex-shrink-0"></span>
              <p className="text-swar-text">Sleep on the left side to activate the warm Pingala Nadi</p>
            </li>
            <li className="flex items-start">
              <span className="w-2 h-2 bg-swar-primary-light0 rounded-full mt-2 mr-3 flex-shrink-0"></span>
              <p className="text-swar-text">Use a pillow and bolster for proper alignment and support</p>
            </li>
            <li className="flex items-start">
              <span className="w-2 h-2 bg-swar-primary-light0 rounded-full mt-2 mr-3 flex-shrink-0"></span>
              <p className="text-swar-text">
                Avoid drinking water or milk after 9 PM to prevent fluid buildup in the lungs
              </p>
            </li>
          </ul>
        </div>
      </div>

      {/* Conclusion */}
      <div className="bg-swar-bg p-8 rounded-lg mb-12 border-l-4 border-green-600">
        <h2 className="text-2xl font-bold text-swar-text mb-4">Conclusion</h2>
        <p className="text-lg leading-relaxed text-swar-text mb-4">
          The practices described in Swar Yoga provide a holistic and effective approach to
          maintaining physical balance through proper sleep and breathing techniques. While these
          practices have proven beneficial in my 20 years of teaching, it is always advisable to
          consult a healthcare professional before making significant changes to your health
          routines.
        </p>
        <p className="text-lg leading-relaxed text-swar-text">
          This blog is based on long-standing principles of Swar Yoga and personal experiences, and
          it should ideally be integrated with professional medical guidance for best results.
        </p>
      </div>
    </BlogPostPage>
  );
}
