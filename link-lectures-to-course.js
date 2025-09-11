const mongoose = require('mongoose');
require('./config/environment');

async function linkLecturesToCourse() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    const Course = require('./models/Course');
    const Lecture = require('./models/Lecture');
    const Category = require('./models/Category');

    console.log('🔗 LINKING LECTURES TO COURSE');
    console.log('==============================');

    // Step 1: Find the WebApp Pentesting course
    const course = await Course.findOne({ slug: 'webapp-pentesting' });
    if (!course) {
      console.log('❌ WebApp Pentesting course not found');
      return;
    }
    console.log('✅ Found course:', course.title);
    console.log('   Course ID:', course._id);

    // Step 2: Find the WebPentesting category
    const webPentestingCat = await Category.findOne({ slug: 'webpentesting' });
    if (!webPentestingCat) {
      console.log('❌ WebPentesting category not found');
      return;
    }
    console.log('✅ Found category:', webPentestingCat.name);
    console.log('   Category ID:', webPentestingCat._id);

    // Step 3: Find all lectures in the WebPentesting category
    const lectures = await Lecture.find({ category: webPentestingCat._id });
    console.log(`📚 Found ${lectures.length} lectures in WebPentesting category`);

    if (lectures.length === 0) {
      console.log('❌ No lectures found in WebPentesting category');
      return;
    }

    // Step 4: Link lectures to the course
    console.log('🔄 Linking lectures to course...');

    const bulkOps = lectures.map(lecture => ({
      updateOne: {
        filter: { _id: lecture._id },
        update: {
          $set: {
            course: course._id,
            updatedAt: new Date()
          }
        }
      }
    }));

    const bulkResult = await Lecture.bulkWrite(bulkOps);
    console.log('✅ Bulk update result:');
    console.log('   Matched:', bulkResult.matchedCount);
    console.log('   Modified:', bulkResult.modifiedCount);

    // Step 5: Verify the linking
    const linkedLectures = await Lecture.find({
      category: webPentestingCat._id,
      course: course._id
    });

    console.log(`🔗 Verification: ${linkedLectures.length} lectures now linked to course`);

    // Step 6: Test the course API logic
    console.log('\n🧪 TESTING COURSE API LOGIC:');

    // This is what the course API does
    const apiLectures = await Lecture.find({
      $or: [
        { course: course._id },
        { category: { $in: [webPentestingCat._id] } }
      ]
    })
    .populate('category', 'name slug')
    .sort({ createdAt: 1 })
    .lean();

    console.log(`🎯 Course API would return ${apiLectures.length} lectures`);

    if (apiLectures.length > 0) {
      console.log('📋 Lectures that would be returned:');
      apiLectures.forEach((lecture, index) => {
        const hasContentId = lecture.contentId ? '✅ Has content' : '❌ No content';
        const categoryName = lecture.category?.name || 'No category';
        console.log(`   ${index + 1}. "${lecture.title}" - ${categoryName} - ${hasContentId}`);
      });

      // Check for Command Injection specifically
      const commandInjection = apiLectures.find(l =>
        l.title.toLowerCase().includes('command injection')
      );

      if (commandInjection) {
        console.log('\n🎯 COMMAND INJECTION STATUS:');
        console.log(`   Title: "${commandInjection.title}"`);
        console.log(`   Category: "${commandInjection.category?.name}"`);
        console.log(`   Has Content: ${commandInjection.contentId ? '✅ YES' : '❌ NO'}`);
        if (commandInjection.contentId) {
          console.log(`   Content ID: ${commandInjection.contentId}`);
        }
      }
    }

    // Step 7: Update course lecture count
    const totalLectures = apiLectures.length;
    if (totalLectures > 0) {
      await Course.updateOne(
        { _id: course._id },
        { $set: { totalLectures: totalLectures } }
      );
      console.log(`📊 Updated course lecture count to ${totalLectures}`);
    }

    await mongoose.connection.close();
    console.log('\n✅ Database closed');

    // Summary
    console.log('\n✨ SUMMARY:');
    console.log('─'.repeat(60));
    console.log(`Course: "${course.title}"`);
    console.log(`Category: "${webPentestingCat.name}"`);
    console.log(`Lectures linked: ${linkedLectures.length}`);
    console.log(`Total lectures in course: ${totalLectures}`);

    if (totalLectures > 0) {
      console.log('✅ SUCCESS: Lectures are now linked and should appear in frontend!');
    } else {
      console.log('❌ ISSUE: No lectures linked to course');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

linkLecturesToCourse();