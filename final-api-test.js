const mongoose = require('mongoose');
require('./config/environment');

async function finalApiTest() {
  try {
    console.log('🎯 FINAL COURSE API TEST');
    console.log('========================');

    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    const Course = require('./models/Course');

    // Simulate the exact course API call that the frontend makes
    console.log('🔍 SIMULATING: GET /api/courses/webapp-pentesting');

    const course = await Course.findOne({ slug: 'webapp-pentesting' });
    if (!course) {
      console.log('❌ Course not found');
      return;
    }

    console.log('✅ Found course:', course.title);

    // Get lectures like the course API does (lines 164-204 in routes/courses.js)
    const Lecture = require('./models/Lecture');
    let lectures = await Lecture.find({ course: course._id })
      .populate('category', 'name slug')
      .sort({ createdAt: 1 });

    console.log(`📚 Direct course lectures: ${lectures.length}`);

    // If no direct links, try category-based lookup
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
      .sort({ createdAt: 1 });

      if (categoryLectures.length > 0) {
        console.log(`✅ Found ${categoryLectures.length} additional lectures by category matching`);
        lectures = categoryLectures;
      }
    }

    console.log('\n📋 API RESPONSE SIMULATION:');
    console.log(`Total Lectures: ${lectures.length}`);

    if (lectures.length > 0) {
      // Group lectures by category like the API does
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
        ...course.toObject(),
        categories: Object.values(lecturesByCategory),
        totalLectures: lectures.length,
        totalDuration: lectures.length * 15
      };

      console.log(`Categories with Lectures: ${courseData.categories?.length || 0}`);

      // Check each lecture for contentId
      courseData.categories?.forEach((categoryGroup, catIndex) => {
        const category = categoryGroup.category;
        const categoryLectures = categoryGroup.lectures;

        console.log(`\n📂 Category "${category.name}":`);

        categoryLectures.forEach((lecture, lecIndex) => {
          const hasContentId = !!lecture.contentId;
          const status = hasContentId ? '✅ ACCESSIBLE' : '❌ NOT ACCESSIBLE';

          console.log(`   ${lecIndex + 1}. "${lecture.title}" - ${status}`);
          console.log(`      Content ID: ${lecture.contentId || 'NONE'}`);
          console.log(`      Lecture ID: ${lecture._id}`);

          if (lecture.title === 'Host Header Attacks') {
            console.log(`      🎯 HOST HEADER ATTACKS STATUS: ${hasContentId ? 'ACCESSIBLE' : 'NOT ACCESSIBLE'}`);

            if (hasContentId) {
              console.log(`      ✅ Ready to navigate to: /lecture/${lecture.contentId}`);
            }
          }
        });
      });

      // Final accessibility summary
      const totalLectures = courseData.totalLectures;
      const accessibleLectures = courseData.categories?.flatMap(cat => cat.lectures || [])
        .filter(lecture => lecture.contentId).length || 0;

      console.log('\n🎯 FINAL ACCESSIBILITY SUMMARY:');
      console.log('─'.repeat(50));
      console.log(`Total Lectures: ${totalLectures}`);
      console.log(`Accessible Lectures: ${accessibleLectures}`);
      console.log(`Accessibility Rate: ${totalLectures > 0 ? Math.round((accessibleLectures / totalLectures) * 100) : 0}%`);

      if (accessibleLectures === totalLectures && totalLectures > 0) {
        console.log('\n🎉 SUCCESS: ALL LECTURES ARE ACCESSIBLE!');
        console.log('The frontend should work perfectly now.');
        console.log('\n🧪 USER TESTING:');
        console.log('1. Refresh the WebApp Pentesting course page');
        console.log('2. Click on "Host Header Attacks"');
        console.log('3. The lecture should load successfully');
        console.log('4. Try other lectures - they should all work');
      } else if (accessibleLectures > 0) {
        console.log('\n⚡ PARTIAL SUCCESS: Some lectures are accessible');
        console.log('The system is working but may need additional fixes.');
      } else {
        console.log('\n❌ FAILURE: No lectures are accessible');
        console.log('The contentId assignments may still have issues.');
      }

    } else {
      console.log('❌ No lectures found for this course');
    }

    await mongoose.connection.close();

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

finalApiTest();