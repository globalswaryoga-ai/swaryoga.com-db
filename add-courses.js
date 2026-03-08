/**
 * Add D-Learning Courses
 * Run: node add-courses.js
 */

const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

async function addCourses() {
  const uri = process.env.MONGODB_URI_MAIN || process.env.MONGODB_URI;
  if (!uri) {
    console.error('❌ MONGODB_URI_MAIN not found in .env.local');
    process.exit(1);
  }

  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');

    const db = client.db('swaryogaDB');
    const coursesCollection = db.collection('recordedcourses');

    // Course 1: Basic Swar Yoga
    const basicCourse = {
      slug: 'basic-swar-yoga',
      isActive: true,
      isPublished: true,
      order: 1,
      content: {
        en: {
          title: 'Basic Swar Yoga',
          subtitle: 'Introduction to the ancient science of breath',
          description: 'Learn the fundamentals of Swar Yoga - the ancient Indian science of breath and its connection to cosmic rhythms. This beginner-friendly course covers the basics of nasal cycles, their impact on daily activities, and simple techniques to harness the power of breath for better health and decision making.',
          whatYouWillLearn: [
            'Understanding Ida, Pingala, and Sushumna nadis',
            'How to identify your active nostril',
            'Basic Swar predictions for daily activities',
            'Simple breathing techniques',
            'Connection between breath and mind',
          ],
          requirements: [
            'No prior yoga experience required',
            'Open mind to learn ancient wisdom',
          ],
          targetAudience: [
            'Beginners interested in yoga',
            'Anyone curious about breath science',
            'People seeking better decision-making tools',
          ],
        },
        hi: {
          title: 'बेसिक स्वर योग',
          subtitle: 'श्वास के प्राचीन विज्ञान का परिचय',
          description: 'स्वर योग की मूल बातें सीखें - श्वास का प्राचीन भारतीय विज्ञान और ब्रह्मांडीय लय से इसका संबंध। यह शुरुआती-अनुकूल पाठ्यक्रम नाक चक्रों की मूल बातें, दैनिक गतिविधियों पर उनके प्रभाव और बेहतर स्वास्थ्य के लिए श्वास की शक्ति का उपयोग करने की सरल तकनीकों को कवर करता है।',
          whatYouWillLearn: [
            'इड़ा, पिंगला और सुषुम्ना नाड़ियों को समझना',
            'अपने सक्रिय नथुने की पहचान कैसे करें',
            'दैनिक गतिविधियों के लिए बुनियादी स्वर भविष्यवाणियां',
            'सरल श्वास तकनीकें',
            'श्वास और मन के बीच संबंध',
          ],
          requirements: [
            'पूर्व योग अनुभव आवश्यक नहीं',
            'प्राचीन ज्ञान सीखने के लिए खुला मन',
          ],
          targetAudience: [
            'योग में रुचि रखने वाले शुरुआती',
            'श्वास विज्ञान में जिज्ञासु कोई भी',
            'बेहतर निर्णय लेने के उपकरण खोजने वाले लोग',
          ],
        },
      },
      thumbnail: '/images/courses/basic-swar-yoga.jpg',
      level: 'beginner',
      category: 'swar-yoga',
      tags: ['swar-yoga', 'beginner', 'breathing', 'basics'],
      totalDuration: 120, // 2 hours approx
      totalVideos: 5,
      totalMaterials: 2,
      pricing: {
        INR: { price: 73, originalPrice: 199 },
        USD: { price: 2, originalPrice: 5 },
        NPR: { price: 120, originalPrice: 320 },
      },
      isFree: false,
      giftHours: {
        enabled: true,
        hours: 1,
        description: 'Try 1 hour free before purchasing',
      },
      accessSettings: {
        maxDevices: 3,
        allowDownload: false,
        allowScreenRecording: false,
        allowScreenSharing: false,
        videoTimeGap: 30,
        requireAssignmentCompletion: false,
        certificateOnCompletion: true,
      },
      instructorName: 'Swar Yoga Team',
      instructorBio: 'Expert instructors from Swar Yoga tradition',
      enrolledCount: 0,
      completionRate: 0,
      averageRating: 0,
      reviewCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Course 2: Swar Yoga Master Part-1
    const masterCourse = {
      slug: 'swar-yoga-master-part-1',
      isActive: true,
      isPublished: true,
      order: 2,
      content: {
        en: {
          title: 'Swar Yoga Master Part-1',
          subtitle: 'Deep dive into advanced Swar Yoga practices',
          description: 'Take your Swar Yoga knowledge to the next level with this comprehensive 20-video course. Learn advanced techniques, detailed predictions, health applications, and practical methods to apply Swar Yoga in every aspect of your life. This course covers ancient texts, practical exercises, and real-world applications.',
          whatYouWillLearn: [
            'Advanced Swar Shastra techniques',
            'Detailed study of Tattvas (elements)',
            'Health diagnosis through breath',
            'Auspicious timing with Swar',
            'Meditation techniques using Swar',
            'Relationship between Swar and Astrology',
            'Practical applications in daily life',
            'Business and career decisions using Swar',
          ],
          requirements: [
            'Basic understanding of Swar Yoga (Basic course recommended)',
            'Commitment to daily practice',
            'Notebook for taking notes',
          ],
          targetAudience: [
            'Those who completed Basic Swar Yoga',
            'Yoga practitioners wanting to deepen practice',
            'Astrology enthusiasts',
            'Health-conscious individuals',
            'Spiritual seekers',
          ],
        },
        hi: {
          title: 'स्वर योग मास्टर भाग-1',
          subtitle: 'उन्नत स्वर योग अभ्यास में गहन अध्ययन',
          description: 'इस व्यापक 20-वीडियो पाठ्यक्रम के साथ अपने स्वर योग ज्ञान को अगले स्तर पर ले जाएं। उन्नत तकनीकें, विस्तृत भविष्यवाणियां, स्वास्थ्य अनुप्रयोग, और अपने जीवन के हर पहलू में स्वर योग लागू करने के व्यावहारिक तरीके सीखें।',
          whatYouWillLearn: [
            'उन्नत स्वर शास्त्र तकनीकें',
            'तत्वों का विस्तृत अध्ययन',
            'श्वास के माध्यम से स्वास्थ्य निदान',
            'स्वर के साथ शुभ समय',
            'स्वर का उपयोग करके ध्यान तकनीकें',
            'स्वर और ज्योतिष के बीच संबंध',
            'दैनिक जीवन में व्यावहारिक अनुप्रयोग',
            'स्वर का उपयोग करके व्यापार और करियर निर्णय',
          ],
          requirements: [
            'स्वर योग की बुनियादी समझ (बेसिक कोर्स अनुशंसित)',
            'दैनिक अभ्यास के लिए प्रतिबद्धता',
            'नोट्स लेने के लिए नोटबुक',
          ],
          targetAudience: [
            'जिन्होंने बेसिक स्वर योग पूरा किया',
            'अभ्यास को गहरा करने के इच्छुक योग अभ्यासी',
            'ज्योतिष उत्साही',
            'स्वास्थ्य-जागरूक व्यक्ति',
            'आध्यात्मिक साधक',
          ],
        },
      },
      thumbnail: '/images/courses/swar-yoga-master.jpg',
      level: 'intermediate',
      category: 'swar-yoga',
      tags: ['swar-yoga', 'advanced', 'master', 'comprehensive'],
      totalDuration: 600, // 10 hours approx
      totalVideos: 20,
      totalMaterials: 10,
      pricing: {
        INR: { price: 1999, originalPrice: 4999 },
        USD: { price: 31, originalPrice: 75 },
        NPR: { price: 3200, originalPrice: 8000 },
      },
      isFree: false,
      giftHours: {
        enabled: true,
        hours: 2,
        description: 'Try 2 hours free before purchasing',
      },
      accessSettings: {
        maxDevices: 3,
        allowDownload: false,
        allowScreenRecording: false,
        allowScreenSharing: false,
        videoTimeGap: 60,
        requireAssignmentCompletion: true,
        certificateOnCompletion: true,
      },
      instructorName: 'Swar Yoga Master',
      instructorBio: 'Senior instructor with 20+ years of Swar Yoga experience',
      enrolledCount: 0,
      completionRate: 0,
      averageRating: 0,
      reviewCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Upsert courses (update if exists, insert if not)
    const result1 = await coursesCollection.updateOne(
      { slug: 'basic-swar-yoga' },
      { $set: basicCourse },
      { upsert: true }
    );
    console.log(`✅ Basic Swar Yoga: ${result1.upsertedId ? 'Created' : 'Updated'}`);

    const result2 = await coursesCollection.updateOne(
      { slug: 'swar-yoga-master-part-1' },
      { $set: masterCourse },
      { upsert: true }
    );
    console.log(`✅ Swar Yoga Master Part-1: ${result2.upsertedId ? 'Created' : 'Updated'}`);

    // Verify courses
    const courses = await coursesCollection.find({ isPublished: true }).toArray();
    console.log('\n📚 Published Courses:');
    courses.forEach((c, i) => {
      console.log(`   ${i + 1}. ${c.content.en.title} - ₹${c.pricing.INR.price} ($${c.pricing.USD.price}) - ${c.totalVideos} videos`);
    });

    console.log('\n✅ Done! Courses added successfully.');
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
  }
}

addCourses();
