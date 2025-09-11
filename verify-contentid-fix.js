const mongoose = require('mongoose');
require('./config/environment');

async function verifyContentIdFix() {
  try {
    console.log('🔍 VERIFYING CONTENTID FIX');
    console.log('===========================');

    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    const Lecture = require('./models/Lecture');
    const Category = require('./models/Category');
    const FileCategory = require('./models/FileCategory');

    // Find WebPentesting category
    const webPentestingCat = await Category.findOne({ slug: 'webpentesting' });
    if (!webPentestingCat) {
      console.log('❌ WebPentesting category not found');
      return;
    }

    console.log('✅ Found WebPentesting category');

    // Get all lectures in this category
    const lectures = await Lecture.find({ category: webPentestingCat._id }).sort({ createdAt: 1 });
    console.log(`\n📚 Total lectures in WebPentesting category: ${lectures.length}`);

    // Check each lecture
    let workingCount = 0;
    let brokenCount = 0;

    for (const lecture of lectures) {
      const hasContentId = lecture.contentId && lecture.contentId !== '';
      const status = hasContentId ? '✅ WORKING' : '❌ BROKEN';

      console.log(`\n${status} "${lecture.title}"`);
      console.log(`   ID: ${lecture._id}`);
      console.log(`   contentId: "${lecture.contentId || 'NULL'}"`);
      console.log(`   Course: ${lecture.course || 'NONE'}`);

      if (hasContentId) {
        workingCount++;

        // Verify that the FileCategory exists
        const fileCategory = await FileCategory.findOne({ filename: lecture.contentId });
        if (fileCategory) {
          console.log(`   ✅ FileCategory exists: ${fileCategory.filename} (${fileCategory.title})`);
        } else {
          console.log(`   ⚠️ FileCategory NOT found for: ${lecture.contentId}`);
        }
      } else {
        brokenCount++;
      }
    }

    console.log('\n📊 SUMMARY:');
    console.log(`Working: ${workingCount}`);
    console.log(`Broken: ${brokenCount}`);
    console.log(`Total: ${lectures.length}`);

    // Specific check for Host Header Attacks
    const hostHeaderAttack = lectures.find(l => l.title === 'Host Header Attacks');
    if (hostHeaderAttack) {
      console.log('\n🎯 HOST HEADER ATTACKS ANALYSIS:');
      console.log(`Title: "${hostHeaderAttack.title}"`);
      console.log(`ID: ${hostHeaderAttack._id}`);
      console.log(`contentId: "${hostHeaderAttack.contentId || 'NULL'}"`);
      console.log(`Has valid contentId: ${hostHeaderAttack.contentId ? 'YES' : 'NO'}`);

      if (hostHeaderAttack.contentId) {
        const fileCat = await FileCategory.findOne({ filename: hostHeaderAttack.contentId });
        if (fileCat) {
          console.log(`File exists: ✅ ${fileCat.filename}`);
          console.log('LECTURE SHOULD BE ACCESSIBLE NOW!');
        } else {
          console.log('File missing: ❌ FileCategory not found');
        }
      }
    }

    // Check if we need to run the fix again
    if (brokenCount > 0) {
      console.log('\n🔧 RECOMMENDATION:');
      console.log('Some lectures still need contentId fixes.');
      console.log('The fix may not have applied correctly.');
      console.log('Consider running the fix script again.');
    } else {
      console.log('\n🎉 SUCCESS:');
      console.log('All lectures have valid contentId assignments!');
      console.log('The lectures should be accessible in the frontend now.');
    }

    await mongoose.connection.close();

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

verifyContentIdFix();