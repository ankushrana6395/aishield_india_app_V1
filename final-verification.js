const mongoose = require('mongoose');
require('./config/environment');

async function finalVerification() {
  try {
    console.log('🎯 FINAL VERIFICATION - LECTURE ACCESSIBILITY');
    console.log('===============================================');

    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    const Lecture = require('./models/Lecture');
    const Category = require('./models/Category');
    const Course = require('./models/Course');

    // Find WebApp Pentesting course
    const course = await Course.findOne({ slug: 'webapp-pentesting' });
    if (!course) {
      console.log('❌ Course not found');
      return;
    }

    console.log(`✅ Found course: "${course.title}"`);
    console.log(`   Course ID: ${course._id}`);

    // Find WebPentesting category
    const webPentestingCat = await Category.findOne({ slug: 'webpentesting' });
    if (!webPentestingCat) {
      console.log('❌ WebPentesting category not found');
      return;
    }

    console.log(`✅ Found category: "${webPentestingCat.name}"`);
    console.log(`   Category ID: ${webPentestingCat._id}`);

    // Use EXACT SAME query as course API (lines 164-167 in routes/courses.js)
    console.log('\n🔍 TESTING COURSE API QUERY:');
    console.log('GET /api/courses/webapp-pentesting');

    let lectures = await Lecture.find({ course: course._id })
      .populate('category', 'name slug')
      .sort({ createdAt: 1 })
      .lean();

    console.log(`📚 Direct course lectures: ${lectures.length}`);

    // If no direct links, try category-based lookup (lines 172-204 in routes/courses.js)
    if (lectures.length === 0 && course.categories && course.categories.length > 0) {
      console.log('🔍 No direct links, trying category-based lookup...');

      const categoryIds = course.categories.map(cat => cat._id);
      const categoryLectures = await Lecture.find({
        category: { $in: categoryIds },
        $or: [
          { course: { $exists: false } },
          { course: null },
          { course: course._id }
        ]
      })
      .populate('category', 'name slug')
      .sort({ createdAt: 1 })
      .lean();

      if (categoryLectures.length > 0) {
        console.log(`✅ Found ${categoryLectures.length} additional lectures by category matching`);
        lectures = categoryLectures;
      }
    }

    console.log('\n📋 COURSE API WOULD RETURN:');
    console.log(`   Total Lectures: ${lectures.length}`);

    if (lectures.length > 0) {
      // Group by category like the API does
      const lecturesByCategory = {};
      lectures.forEach(lecture => {
        const categoryId = lecture.category?._id?.toString() || 'uncategorized';
        if (!lecturesByCategory[categoryId]) {
          lecturesByCategory[categoryId] = {
            category: lecture.category || { name: 'Uncategorized', slug: 'uncategorized' },
            lectures: []
          };
        }
        lecturesByCategory[categoryId].lectures.push({
          _id: lecture._id,
          title: lecture.title,
          subtitle: lecture.subtitle,
          description: lecture.description,
          slug: lecture.slug,
          contentId: lecture.contentId, // This is what matters for frontend validation
          isRequired: lecture.isHinglish ? true : false,
          duration: 15,
          order: 0,
          createdAt: lecture.createdAt
        });
      });

      const courseData = {
        ...course,
        categories: Object.values(lecturesByCategory),
        totalLectures: lectures.length,
        totalDuration: lectures.length * 15
      };

      console.log(`   Categories with Lectures: ${courseData.categories?.length || 0}`);
      console.log(`   Total Duration: ${courseData.totalDuration} minutes`);

      // Check each category
      if (courseData.categories && courseData.categories.length > 0) {
        courseData.categories.forEach((categoryGroup, catIndex) => {
          const category = categoryGroup.category;
          const categoryLectures = categoryGroup.lectures;
          console.log(`\n📂 Category ${catIndex + 1}: "${category.name}"`);

          categoryLectures.forEach((lecture, lecIndex) => {
            const hasContentId = !!lecture.contentId;
            const status = hasContentId ? '✅ ACCESSIBLE' : '❌ NOT ACCESSIBLE';

            console.log(`     ${lecIndex + 1}. "${lecture.title}" - ${status}`);
            console.log(`        Content ID: ${lecture.contentId || 'NONE'}`);
            console.log(`        Lecture ID: ${lecture._id}`);

            if (lecture.title === 'Command Injection') {
              console.log(`        🎯 COMMAND INJECTION STATUS: ${hasContentId ? 'ACCESSIBLE' : 'NOT ACCESSIBLE'}`);
            }
          });
        });
      }

      // Specific check for Command Injection accessibility
      let commandInjectionFound = false;
      let commandInjectionAccessible = false;

      courseData.categories?.forEach(categoryGroup => {
        categoryGroup.lectures?.forEach(lecture => {
          if (lecture.title === 'Command Injection') {
            commandInjectionFound = true;
            commandInjectionAccessible = !!lecture.contentId;
          }
        });
      });

      console.log('\n🎯 COMMAND INJECTION VERIFICATION:');
      console.log(`   Found in course: ${commandInjectionFound ? '✅ YES' : '❌ NO'}`);
      console.log(`   Content accessible: ${commandInjectionAccessible ? '✅ YES' : '❌ NO'}`);

      if (commandInjectionFound && commandInjectionAccessible) {
        console.log('\n🎉 SUCCESS: Command Injection lecture is now fully accessible!');
        console.log('   - Appears in course structure');
        console.log('   - Has valid contentId');
        console.log('   - Should be clickable in frontend');
      } else {
        console.log('\n❌ ISSUE: Command Injection lecture still has problems');
        if (!commandInjectionFound) {
          console.log('   - Not found in course structure');
        }
        if (!commandInjectionAccessible) {
          console.log('   - Content ID is missing/invalid');
        }
      }

    } else {
      console.log('❌ No lectures found for this course');
    }

    await mongoose.connection.close();
    console.log('\n✅ Verification complete');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

finalVerification();