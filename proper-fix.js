const mongoose = require('mongoose');
require('./config/environment');

async function properFix() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    const Course = require('./models/Course');
    const Category = require('./models/Category');
    const Lecture = require('./models/Lecture');

    console.log('🔧 PROPER CATEGORY AND LECTURE FIX');
    console.log('====================================');

    // Step 1: Find the WebPentesting category
    const webPentestingCat = await Category.findOne({ slug: 'webpentesting' });
    if (!webPentestingCat) {
      console.log('❌ WebPentesting category not found');
      return;
    }
    console.log('✅ Found WebPentesting category:', webPentestingCat.name);
    console.log('   Category ID:', webPentestingCat._id);

    // Step 2: Find the WebApp Pentesting course
    const course = await Course.findOne({ slug: 'webapp-pentesting' });
    if (!course) {
      console.log('❌ WebApp Pentesting course not found');
      return;
    }
    console.log('✅ Found course:', course.title);
    console.log('   Course ID:', course._id);

    // Step 3: Check if course already has this category
    const hasWebPentestingCat = course.categories?.some(cat =>
      cat._id && cat._id.toString() === webPentestingCat._id.toString()
    );

    if (hasWebPentestingCat) {
      console.log('⚠️ Course already has WebPentesting category');
    } else {
      // Step 4: Add the WebPentesting category to the course
      const newCategory = {
        name: webPentestingCat.name,
        slug: webPentestingCat.slug,
        description: webPentestingCat.description || 'Web application penetration testing lectures',
        order: course.categories?.length || 0,
        lectures: [], // Will populate with actual lectures
        estimatedDuration: 0
      };

      await Course.updateOne(
        { _id: course._id },
        { $push: { categories: newCategory } }
      );

      console.log('✅ Added WebPentesting category to course');
    }

    // Step 5: Find all lectures linked to WebPentesting category
    const lectures = await Lecture.find({ category: webPentestingCat._id });
    console.log(`📚 Found ${lectures.length} lectures in WebPentesting category`);

    lectures.forEach((lecture, index) => {
      console.log(`${index + 1}. ${lecture.title}`);
      console.log(`   Content ID: ${lecture.contentId || 'NONE'}`);
      console.log(`   Course ID: ${lecture.course || 'NONE'}`);
    });

    // Step 6: Update the course's category with the actual lectures
    if (lectures.length > 0) {
      const lectureObjects = lectures.map(lecture => ({
        title: lecture.title,
        slug: lecture.slug,
        contentId: lecture.contentId,
        order: lecture.order || 0,
        duration: lecture.duration || 45,
        isPreview: lecture.isPreview || false,
        isRequired: lecture.isRequired !== false
      }));

      // Find the WebPentesting category in the course and update its lectures
      const courseCategories = course.categories || [];
      const webPentestingIndex = courseCategories.findIndex(cat =>
        cat.slug === 'webpentesting'
      );

      if (webPentestingIndex >= 0) {
        const updatePath = `categories.${webPentestingIndex}.lectures`;
        await Course.updateOne(
          { _id: course._id },
          { $set: { [updatePath]: lectureObjects } }
        );
        console.log('✅ Updated course category with lectures');
      }
    }

    // Step 7: Update lecture count for the course
    const totalLectures = course.categories?.reduce((total, cat) =>
      total + (cat.lectures?.length || 0), 0
    ) || 0;

    if (totalLectures > 0) {
      await Course.updateOne(
        { _id: course._id },
        { $set: { totalLectures: totalLectures } }
      );
      console.log(`📊 Updated course lecture count to ${totalLectures}`);
    }

    // Step 8: Verify the fix
    const updatedCourse = await Course.findOne({ slug: 'webapp-pentesting' });
    if (updatedCourse) {
      console.log('\n🎯 VERIFICATION:');
      console.log(`Course title: ${updatedCourse.title}`);
      console.log(`Categories: ${updatedCourse.categories?.length || 0}`);
      console.log(`Total lectures: ${updatedCourse.totalLectures || 0}`);

      updatedCourse.categories?.forEach((cat, catIndex) => {
        if (cat.slug === 'webpentesting') {
          console.log(`WebPentesting category lectures: ${cat.lectures?.length || 0}`);
          cat.lectures?.forEach((lecture, lecIndex) => {
            console.log(`  ${lecIndex + 1}. ${lecture.title}`);
            console.log(`     Content ID: ${lecture.contentId || 'NONE'}`);
          });
        }
      });

      // Check for Command Injection
      const commandInjection = updatedCourse.categories?.flatMap(cat => cat.lectures || [])
        .find(lecture => lecture.title.toLowerCase().includes('command injection'));

      if (commandInjection) {
        console.log('\n🎯 COMMAND INJECTION STATUS:');
        console.log(`Title: ${commandInjection.title}`);
        console.log(`Has Content: ${commandInjection.contentId ? '✅ YES' : '❌ NO'}`);
      }
    }

    await mongoose.connection.close();
    console.log('\n✅ Database closed');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

properFix();