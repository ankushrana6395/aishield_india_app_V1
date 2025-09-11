const mongoose = require('mongoose');
require('./config/environment');

async function mongooseContentIdFix() {
  try {
    console.log('🔧 MONGOOSE CONTENTID FIX');
    console.log('==========================');

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

    // Get lectures that need fixing
    const lecturesToFix = await Lecture.find({
      category: webPentestingCat._id,
      $or: [
        { contentId: { $exists: false } },
        { contentId: null },
        { contentId: '' }
      ]
    });

    console.log(`📚 Found ${lecturesToFix.length} lectures needing contentId fixes`);

    // Get all FileCategories for matching
    const allFileCategories = await FileCategory.find({});
    console.log(`📁 Found ${allFileCategories.length} FileCategories available`);

    // Create manual mappings for known lectures
    const manualMappings = {
      'Command Injection': 'commandinjection.html',
      'Authentication Vulnerabilities': 'authenticationvulnerability.html',
      'API Testing': 'apipentest.html',
      'Access Control': 'access-control.html',
      'Host Header Attacks': 'host-header-attacks.html'
    };

    let fixed = 0;

    for (const lecture of lecturesToFix) {
      console.log(`\n🔧 Processing: "${lecture.title}"`);

      const expectedFilename = manualMappings[lecture.title];

      if (!expectedFilename) {
        console.log(`   ❌ No manual mapping found for "${lecture.title}"`);
        continue;
      }

      console.log(`   Expected filename: ${expectedFilename}`);

      // Verify FileCategory exists
      const fileCategory = await FileCategory.findOne({ filename: expectedFilename });
      if (!fileCategory) {
        console.log(`   ❌ FileCategory not found: ${expectedFilename}`);
        continue;
      }

      console.log(`   ✅ FileCategory found: ${fileCategory.filename}`);

      // Use Mongoose updateOne with validation disabled
      try {
        const updateResult = await Lecture.updateOne(
          { _id: lecture._id },
          {
            $set: {
              contentId: expectedFilename,
              updatedAt: new Date()
            }
          },
          {
            runValidators: false, // Disable validation to avoid schema issues
            upsert: false
          }
        );

        console.log(`   📊 Update result:`);
        console.log(`     - Matched: ${updateResult.matchedCount}`);
        console.log(`     - Modified: ${updateResult.modifiedCount}`);
        console.log(`     - Acknowledged: ${updateResult.acknowledged}`);

        // Verify the update by re-fetching
        const updatedLecture = await Lecture.findById(lecture._id);
        console.log(`   🔍 Re-fetched contentId: "${updatedLecture.contentId || 'NULL'}"`);

        if (updatedLecture.contentId === expectedFilename) {
          fixed++;
          console.log('   ✅ SUCCESS: contentId properly updated and verified');
        } else {
          console.log('   ❌ FAILED: contentId not updated despite successful operation');
        }

      } catch (updateError) {
        console.log(`   ❌ UPDATE ERROR: ${updateError.message}`);
        console.log(`   Stack: ${updateError.stack}`);
      }
    }

    // Final comprehensive verification
    console.log('\n🔍 COMPREHENSIVE FINAL VERIFICATION:');
    console.log('─'.repeat(60));

    const finalLectures = await Lecture.find({ category: webPentestingCat._id }).sort({ createdAt: 1 });

    console.log(`Total lectures: ${finalLectures.length}`);

    let workingCount = 0;
    let brokenCount = 0;

    finalLectures.forEach((lecture, index) => {
      const hasContentId = lecture.contentId && lecture.contentId !== '';
      const status = hasContentId ? '✅ WORKING' : '❌ BROKEN';

      console.log(`${index + 1}. "${lecture.title}" - ${status} (${lecture.contentId || 'NONE'})`);

      if (lecture.title === 'Host Header Attacks') {
        console.log(`   🎯 HOST HEADER ATTACKS: ${hasContentId ? 'ACCESSIBLE' : 'NOT ACCESSIBLE'}`);
      }

      if (hasContentId) {
        workingCount++;
      } else {
        brokenCount++;
      }
    });

    console.log('\n📊 FINAL RESULTS:');
    console.log(`Working: ${workingCount}`);
    console.log(`Broken: ${brokenCount}`);
    console.log(`Total: ${finalLectures.length}`);
    console.log(`Fixed in this run: ${fixed}`);

    if (workingCount > 0) {
      console.log('\n🎉 SUCCESS: Some lectures now have working contentId!');
      console.log('\n🧪 TESTING INSTRUCTIONS:');
      console.log('1. Refresh your browser');
      console.log('2. Go to WebApp Pentesting course');
      console.log('3. Try clicking on "Host Header Attacks"');
      console.log('4. The lecture should load successfully now');

      if (workingCount === finalLectures.length) {
        console.log('\n🎯 PERFECT: All lectures are now accessible!');
      }
    } else {
      console.log('\n❌ ISSUE: All lectures still broken');
      console.log('The update operations are not persisting.');
      console.log('This may require manual database intervention.');
    }

    await mongoose.connection.close();

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

mongooseContentIdFix();