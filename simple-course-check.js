const mongoose = require('mongoose');

// Configure database connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/aishield';

async function checkForCourse() {
  console.log('🔍 SIMPLE COURSE CHECK: "c-programing"\n');

  try {
    // Connect to database
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Check with Mongoose model first (preferred)
    console.log('🧩 CHECKING WITH MONGOOSE MODEL:');
    try {
      const Course = require('./models/Course');
      const course = await Course.findOne({ slug: 'c-programing' });

      if (course) {
        console.log('✅ COURSE FOUND in Mongoose!');
        console.log(`   Title: "${course.title}"`);
        console.log(`   Slug: ${course.slug}`);
        console.log(`   Published: ${course.published}`);
        console.log(`   Categories: ${course.categories?.length || 0}`);

        if (course.categories && course.categories.length > 0) {
          console.log('\n   📂 CATEGORIES AND LECTURES:');
          course.categories.forEach((cat, idx) => {
            console.log(`      ${idx + 1}. "${cat.name}": ${cat.lectures?.length || 0} lectures`);
          });
        }
      } else {
        console.log('❌ COURSE "c-programing" NOT FOUND in Mongoose');

        // Try alternative searches
        const altCourses = await Course.find({
          $or: [
            { slug: 'c-programming' },
            { title: { $regex: 'program', $options: 'i' } }
          ]
        }).limit(5);

        if (altCourses.length > 0) {
          console.log('\n🔍 ALTERNATIVE COURSES FOUND:');
          altCourses.forEach(alt => {
            console.log(`   - "${alt.title}" (slug: ${alt.slug}) - ${alt.published ? 'Published' : 'Draft'}`);
          });
        }
      }
    } catch (mongooseErr) {
      console.log('⚠️  Mongoose error:', mongooseErr.message);
    }

    console.log('\n' + '='.repeat(40));

    // Check with raw collection access
    console.log('\n💾 CHECKING WITH RAW COLLECTION:');
    try {
      const CourseCollection = mongoose.connection.db.collection('courses');
      const rawCourse = await CourseCollection.findOne({ slug: 'c-programing' });

      if (rawCourse) {
        console.log('✅ COURSE FOUND in raw collection!');
        console.log(`   Title: "${rawCourse.title}"`);
        console.log(`   Slug: ${rawCourse.slug}`);
        console.log(`   Categories: ${rawCourse.categories?.length || 0}`);
      } else {
        console.log('❌ COURSE "c-programing" NOT FOUND in raw collection');
      }

      // Count total courses in collection
      const totalCourses = await CourseCollection.countDocuments();
      console.log(`\n📊 TOTAL COURSES IN DATABASE: ${totalCourses}`);

    } catch (rawErr) {
      console.log('⚠️  Raw collection error:', rawErr.message);
    }

  } catch (connectionErr) {
    console.log('❌ DATABASE CONNECTION FAILED');
    console.log('Error:', connectionErr.message);
  } finally {
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
      console.log('\n📡 Disconnected from MongoDB');
    }
  }
}

// Run check
checkForCourse().catch(console.error);