const mongoose = require('mongoose');
require('./config/environment');

async function debugContentIdFix() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    const Lecture = require('./models/Lecture');
    const FileCategory = require('./models/FileCategory');
    const Category = require('./models/Category');

    console.log('🔧 DEBUGGING CONTENTID FIX');
    console.log('===========================');

    // Step 1: Find WebPentesting category
    const webPentestingCat = await Category.findOne({ slug: 'webpentesting' });
    if (!webPentestingCat) {
      console.log('❌ WebPentesting category not found');
      return;
    }

    console.log('✅ Found WebPentesting category:', webPentestingCat._id);

    // Step 2: Find lectures in this category
    const lectures = await Lecture.find({ category: webPentestingCat._id });
    console.log(`📚 Found ${lectures.length} lectures in WebPentesting category`);

    // Step 3: Debug each lecture update
    for (const lecture of lectures) {
      console.log(`\n🔍 Processing lecture: "${lecture.title}"`);
      console.log(`   Current contentId: ${lecture.contentId || 'NONE'}`);

      // Find corresponding FileCategory
      const fileCategory = await FileCategory.findOne({
        $or: [
          { filename: `${lecture.slug}.html` },
          { title: lecture.title },
          // Try partial matches for title
          { title: { $regex: lecture.title.split(' ')[0], $options: 'i' } }
        ]
      });

      if (fileCategory) {
        console.log(`   ✅ Found FileCategory: ${fileCategory.filename}`);
        console.log(`   FileCategory title: "${fileCategory.title}"`);

        // Try to update the lecture
        console.log(`   🔄 Attempting to update lecture ${lecture._id} with contentId: ${fileCategory.filename}`);

        const updateResult = await Lecture.updateOne(
          { _id: lecture._id },
          { $set: { contentId: fileCategory.filename } }
        );

        console.log('   📊 Update result:');
        console.log(`     - Matched: ${updateResult.matchedCount}`);
        console.log(`     - Modified: ${updateResult.modifiedCount}`);
        console.log(`     - Acknowledged: ${updateResult.acknowledged}`);

        if (updateResult.modifiedCount > 0) {
          console.log('   ✅ Update successful!');
        } else {
          console.log('   ⚠️  Update did not modify anything');

          // Check if contentId is already set correctly
          const currentLecture = await Lecture.findById(lecture._id);
          console.log(`   Current contentId after update: ${currentLecture.contentId || 'NONE'}`);
        }

      } else {
        console.log('   ❌ No FileCategory found');

        // List all available FileCategories for debugging
        const allFileCats = await FileCategory.find({}).limit(5);
        console.log('   Available FileCategories:');
        allFileCats.forEach((fc, idx) => {
          console.log(`     ${idx + 1}. "${fc.title}" (${fc.filename})`);
        });
      }
    }

    // Step 4: Final verification
    console.log('\n🔍 FINAL VERIFICATION:');
    console.log('─'.repeat(60));

    const finalLectures = await Lecture.find({ category: webPentestingCat._id });
    console.log(`Total lectures: ${finalLectures.length}`);

    let workingCount = 0;
    let brokenCount = 0;

    finalLectures.forEach((lecture, index) => {
      const hasContentId = lecture.contentId && lecture.contentId !== '';
      const status = hasContentId ? '✅ WORKING' : '❌ BROKEN';

      console.log(`${index + 1}. "${lecture.title}" - ${status}`);
      console.log(`   Content ID: ${lecture.contentId || 'NONE'}`);
      console.log(`   Course: ${lecture.course || 'NONE'}`);

      if (hasContentId) {
        workingCount++;
      } else {
        brokenCount++;
      }
    });

    console.log('\n📊 FINAL SUMMARY:');
    console.log(`Working: ${workingCount}`);
    console.log(`Broken: ${brokenCount}`);

    if (workingCount > 0) {
      console.log('🎉 SUCCESS: Some lectures now have contentId!');
    } else {
      console.log('❌ FAILURE: All lectures still missing contentId');
      console.log('\n🔧 MANUAL FIX NEEDED:');
      console.log('The FileCategory entries exist but the update operation is failing.');
      console.log('This might be due to:');
      console.log('1. Database permissions');
      console.log('2. Schema validation issues');
      console.log('3. Concurrency issues');
    }

    await mongoose.connection.close();
    console.log('\n✅ Database closed');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

debugContentIdFix();