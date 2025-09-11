const mongoose = require('mongoose');
require('./config/environment');

async function finalContentIdFix() {
  try {
    console.log('🚀 FINAL CONTENTID FIX');
    console.log('=======================');

    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    const Lecture = require('./models/Lecture');
    const FileCategory = require('./models/FileCategory');
    const Category = require('./models/Category');

    // Find WebPentesting category
    const webPentestingCat = await Category.findOne({ slug: 'webpentesting' });
    if (!webPentestingCat) {
      console.log('❌ WebPentesting category not found');
      return;
    }

    console.log('✅ Found WebPentesting category');

    // Get all lectures that need fixing
    const lectures = await Lecture.find({
      category: webPentestingCat._id,
      course: { $exists: true, $ne: null }
    });

    console.log(`📚 Found ${lectures.length} lectures to fix`);

    // Manual mapping of lecture titles to filenames
    const titleToFilename = {
      'Command Injection': 'commandinjection.html',
      'Authentication Vulnerabilities': 'authenticationvulnerability.html',
      'API Testing': 'apipentest.html',
      'Access Control': 'access-control.html'
    };

    let fixed = 0;
    let failed = 0;

    for (const lecture of lectures) {
      console.log(`\n🔧 Fixing: "${lecture.title}"`);
      console.log(`   Current contentId: ${lecture.contentId || 'NONE'}`);

      const expectedFilename = titleToFilename[lecture.title];
      if (!expectedFilename) {
        console.log('   ❌ No filename mapping found');
        failed++;
        continue;
      }

      console.log(`   Expected filename: ${expectedFilename}`);

      // Verify FileCategory exists
      const fileCategory = await FileCategory.findOne({ filename: expectedFilename });
      if (!fileCategory) {
        console.log('   ❌ FileCategory not found');
        failed++;
        continue;
      }

      console.log('   ✅ FileCategory exists');

      // Use findOneAndUpdate for guaranteed atomic operation
      const updatedLecture = await Lecture.findOneAndUpdate(
        { _id: lecture._id },
        {
          $set: {
            contentId: expectedFilename,
            updatedAt: new Date()
          }
        },
        {
          new: true, // Return the updated document
          runValidators: true
        }
      );

      if (updatedLecture) {
        console.log(`   ✅ Updated contentId to: ${updatedLecture.contentId}`);
        fixed++;
      } else {
        console.log('   ❌ Update failed');
        failed++;
      }
    }

    // Final verification
    console.log('\n🔍 FINAL VERIFICATION:');
    const finalLectures = await Lecture.find({
      category: webPentestingCat._id,
      course: { $exists: true, $ne: null }
    });

    console.log(`Total lectures: ${finalLectures.length}`);
    finalLectures.forEach((lecture, index) => {
      const hasContent = lecture.contentId && lecture.contentId !== '';
      const status = hasContent ? '✅ WORKING' : '❌ BROKEN';
      console.log(`${index + 1}. "${lecture.title}" - ${status} (${lecture.contentId || 'NONE'})`);
    });

    console.log('\n📊 SUMMARY:');
    console.log(`Fixed: ${fixed}`);
    console.log(`Failed: ${failed}`);
    console.log(`Total: ${lectures.length}`);

    if (fixed > 0 && failed === 0) {
      console.log('\n🎉 SUCCESS: All contentId assignments fixed!');
      console.log('The lectures should now be accessible in the frontend.');
    }

    await mongoose.connection.close();
    console.log('\n✅ Database closed');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

finalContentIdFix();