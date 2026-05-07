const mongoose = require('mongoose');

async function checkEnrollments() {
  await mongoose.connect('mongodb://localhost:27017/swaryogaDB');
  
  const db = mongoose.connection.db;
  const usersColl = db.collection('users');
  const enrollmentsColl = db.collection('courseenrollments');
  const coursesColl = db.collection('recordedcourses');

  // Get Mohan's user ID
  const mohanUser = await usersColl.findOne({ name: 'Mohan Kalburgi' });
  if (!mohanUser) {
    console.log('❌ User not found');
    await mongoose.disconnect();
    return;
  }

  console.log('👤 User Found: Mohan Kalburgi');
  console.log('   ID: ' + mohanUser._id);
  console.log('   Email: ' + mohanUser.email);
  console.log('\n');

  // Check enrollments
  console.log('📚 Checking E-Learning Enrollments...');
  const enrollments = await enrollmentsColl.find({ userId: mohanUser._id }).toArray();
  console.log(`   Found: ${enrollments.length} enrollment(s)\n`);

  if (enrollments.length > 0) {
    console.log('Enrollments:');
    for (const enrollment of enrollments) {
      const course = await coursesColl.findOne({ _id: enrollment.courseId });
      console.log(`  - ${course?.content?.en?.title || 'Unknown Course'}`);
      console.log(`    Status: ${enrollment.status}`);
      console.log(`    Progress: ${enrollment.progress}%`);
    }
  }

  // Check courses available
  console.log('\n📖 Available E-Learning Courses:');
  const courses = await coursesColl.find({ isPublished: true }).toArray();
  console.log(`   Found: ${courses.length} published course(s)\n`);

  if (courses.length > 0) {
    courses.forEach((course, i) => {
      console.log(`${i + 1}. ${course.content?.en?.title || 'Unknown'}`);
      console.log(`   Level: ${course.level}`);
      console.log(`   Videos: ${course.videos?.length || 0}`);
    });
  } else {
    console.log('   No courses found. Courses need to be created first.');
  }

  await mongoose.disconnect();
}

checkEnrollments().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
