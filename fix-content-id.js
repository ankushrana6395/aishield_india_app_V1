const mongoose = require('mongoose');
require('./config/environment');

async function fixContentIdAssignment() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    const Lecture = require('./models/Lecture');
    const FileCategory = require('./models/FileCategory');
    const Category = require('./models/Category');

    console.log('🔧 FIXING CONTENTID ASSIGNMENT FOR EXISTING LECTURES');
    console.log('====================================================');

    // Step 1: Find all lectures that might need contentId fixes
    const webPentestingCat = await Category.findOne({ slug: 'webpentesting' });
    if (!webPentestingCat) {
      console.log('❌ WebPentesting category not found');
      return;
    }

    console.log('✅ Found WebPentesting category:', webPentestingCat._id);

    // Step 2: Find lectures linked to WebPentesting category
    const lectures = await Lecture.find({ category: webPentestingCat._id });
    console.log(`📚 Found ${lectures.length} lectures in WebPentesting category`);

    if (lectures.length === 0) {
      console.log('❌ No lectures found in WebPentesting category');
      return;
    }

    // Step 3: Check each lecture for contentId
    const lecturesNeedingFix = [];

    for (const lecture of lectures) {
      console.log(`\n🔍 Checking lecture: "${lecture.title}"`);
      console.log(`   ID: ${lecture._id}`);
      console.log(`   Current contentId: ${lecture.contentId || 'NONE'}`);
      console.log(`   Course ID: ${lecture.course || 'NONE'}`);

      if (!lecture.contentId || lecture.contentId === '') {
        lecturesNeedingFix.push(lecture);
        console.log('   ⚠️  NEEDS CONTENTID FIX');
      } else {
        console.log('   ✅ Has contentId');
      }
    }

    // Step 4: Find corresponding FileCategory entries
    if (lecturesNeedingFix.length > 0) {
      console.log(`\n📁 Looking for FileCategory entries for ${lecturesNeedingFix.length} lectures...`);

      for (const lecture of lecturesNeedingFix) {
        // Try to find FileCategory by title or filename pattern
        const filename = lecture.slug ? `${lecture.slug}.html` : null;
        let fileCategory = null;

        // Try multiple search patterns
        const searchPatterns = [
          { filename: filename },
          { title: lecture.title },
          { $text: { $search: lecture.title } }
        ];

        for (const pattern of searchPatterns) {
          if (pattern.filename) {
            fileCategory = await FileCategory.findOne(pattern);
            if (fileCategory) break;
          } else if (pattern.title) {
            fileCategory = await FileCategory.findOne(pattern);
            if (fileCategory) break;
          }
        }

        if (fileCategory) {
          console.log(`✅ Found FileCategory for "${lecture.title}": ${fileCategory.filename}`);

          // Update the lecture with the correct contentId
          await Lecture.updateOne(
            { _id: lecture._id },
            { $set: { contentId: fileCategory.filename } }
          );

          console.log(`   🔄 Updated lecture contentId to: ${fileCategory.filename}`);
        } else {
          console.log(`❌ No FileCategory found for "${lecture.title}"`);

          // Try a more lenient search
          const allFileCategories = await FileCategory.find({}).limit(10);
          console.log('   Available FileCategories:');
          allFileCategories.forEach((fc, idx) => {
            console.log(`     ${idx + 1}. ${fc.title} (${fc.filename})`);
          });
        }
      }
    } else {
      console.log('\n✅ All lectures already have contentId assigned');
    }

    // Step 5: Verify the fixes
    console.log('\n🔍 VERIFICATION: Checking all WebPentesting lectures after fixes...');

    const updatedLectures = await Lecture.find({ category: webPentestingCat._id });
    console.log(`📊 Total lectures: ${updatedLectures.length}`);

    let fixedCount = 0;
    let stillBroken = 0;

    updatedLectures.forEach((lecture, index) => {
      const hasContentId = lecture.contentId && lecture.contentId !== '';
      const status = hasContentId ? '✅ FIXED' : '❌ STILL BROKEN';

      console.log(`${index + 1}. "${lecture.title}" - ${status}`);
      console.log(`   Content ID: ${lecture.contentId || 'NONE'}`);
      console.log(`   Course ID: ${lecture.course || 'NONE'}`);

      if (hasContentId) {
        fixedCount++;
      } else {
        stillBroken++;
      }
    });

    console.log('\n✨ FIX SUMMARY:');
    console.log('─'.repeat(60));
    console.log(`Total lectures: ${updatedLectures.length}`);
    console.log(`Fixed: ${fixedCount}`);
    console.log(`Still broken: ${stillBroken}`);

    if (fixedCount > 0 && stillBroken === 0) {
      console.log('🎉 SUCCESS: All lectures now have contentId!');
    } else if (fixedCount > 0) {
      console.log('⚡ PARTIAL SUCCESS: Some lectures fixed, others need manual intervention');
    } else {
      console.log('❌ FAILURE: No lectures were fixed');
    }

    // Step 6: Specific check for Command Injection
    const commandInjection = updatedLectures.find(l =>
      l.title.toLowerCase().includes('command injection')
    );

    if (commandInjection) {
      console.log('\n🎯 COMMAND INJECTION STATUS:');
      console.log(`   Title: "${commandInjection.title}"`);
      console.log(`   Content ID: ${commandInjection.contentId || 'NONE'}`);
      console.log(`   Has Content: ${commandInjection.contentId ? '✅ YES' : '❌ NO'}`);
      console.log(`   Course Linked: ${commandInjection.course ? '✅ YES' : '❌ NO'}`);

      if (commandInjection.contentId) {
        console.log('🎉 COMMAND INJECTION IS READY TO DISPLAY!');
      } else {
        console.log('⚠️ COMMAND INJECTION STILL NEEDS CONTENTID FIX');
      }
    }

    await mongoose.connection.close();
    console.log('\n✅ Database closed');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

fixContentIdAssignment();