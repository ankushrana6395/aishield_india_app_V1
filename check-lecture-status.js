const mongoose = require('mongoose');
require('./config/environment');

async function checkLectureStatus() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    const Lecture = require('./models/Lecture');
    const FileCategory = require('./models/FileCategory');
    const Category = require('./models/Category');

    console.log('🔍 CHECKING LECTURE CONTENTID STATUS');
    console.log('=====================================');

    // Find WebPentesting category
    const webPentestingCat = await Category.findOne({ slug: 'webpentesting' });
    if (!webPentestingCat) {
      console.log('❌ WebPentesting category not found');
      return;
    }

    // Get all lectures in this category
    const lectures = await Lecture.find({ category: webPentestingCat._id }).sort({ createdAt: 1 });
    console.log(`📚 Found ${lectures.length} lectures in WebPentesting category\n`);

    let workingCount = 0;
    let brokenCount = 0;

    for (const lecture of lectures) {
      const hasContentId = lecture.contentId && lecture.contentId !== '';
      const status = hasContentId ? '✅ WORKING' : '❌ BROKEN';

      console.log(`${status} "${lecture.title}"`);
      console.log(`   ID: ${lecture._id}`);
      console.log(`   contentId: ${lecture.contentId || 'UNDEFINED'}`);
      console.log(`   Course: ${lecture.course || 'NONE'}`);
      console.log('');

      if (hasContentId) {
        workingCount++;
      } else {
        brokenCount++;
      }
    }

    console.log('📊 SUMMARY:');
    console.log(`Working: ${workingCount}`);
    console.log(`Broken: ${brokenCount}`);
    console.log(`Total: ${lectures.length}`);

    // Check for Host Header Attacks specifically
    const hostHeaderAttack = lectures.find(l => l.title === 'Host Header Attacks');
    if (hostHeaderAttack) {
      console.log('\n🎯 HOST HEADER ATTACKS ANALYSIS:');
      console.log(`Title: "${hostHeaderAttack.title}"`);
      console.log(`contentId: ${hostHeaderAttack.contentId || 'UNDEFINED'}`);
      console.log(`Has valid contentId: ${hostHeaderAttack.contentId ? 'YES' : 'NO'}`);

      if (!hostHeaderAttack.contentId) {
        console.log('\n🔧 NEED TO FIX HOST HEADER ATTACKS');

        // Look for possible matching files
        const allFiles = await FileCategory.find({}).limit(10);
        console.log('\nAvailable FileCategories:');
        allFiles.forEach((file, index) => {
          console.log(`${index + 1}. "${file.title}" -> ${file.filename}`);
        });

        // Try to find by slug pattern
        const slugPattern = hostHeaderAttack.slug ? `${hostHeaderAttack.slug}.html` : null;
        if (slugPattern) {
          const matchingFile = await FileCategory.findOne({ filename: slugPattern });
          if (matchingFile) {
            console.log(`\n✅ FOUND MATCHING FILE: ${matchingFile.filename} (${matchingFile.title})`);
          } else {
            console.log(`\n❌ NO FILE MATCHES SLUG PATTERN: ${slugPattern}`);
          }
        }
      }
    }

    await mongoose.connection.close();

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkLectureStatus();