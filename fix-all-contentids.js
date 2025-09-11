const mongoose = require('mongoose');
require('./config/environment');

async function fixAllContentIds() {
  try {
    console.log('🚀 FIXING ALL LECTURE CONTENTIDS');
    console.log('==================================');

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

    // Get all lectures without contentId
    const lecturesToFix = await Lecture.find({
      category: webPentestingCat._id,
      $or: [
        { contentId: { $exists: false } },
        { contentId: null },
        { contentId: '' }
      ]
    }).sort({ createdAt: 1 });

    console.log(`📚 Found ${lecturesToFix.length} lectures needing contentId fixes`);

    if (lecturesToFix.length === 0) {
      console.log('✅ No lectures need contentId fixes');
      return;
    }

    // Get all available FileCategories for matching
    const allFileCategories = await FileCategory.find({});
    console.log(`📁 Found ${allFileCategories.length} FileCategories for matching`);

    // Create mapping from filename to FileCategory
    const filenameToFileCategory = {};
    allFileCategories.forEach(fc => {
      filenameToFileCategory[fc.filename] = fc;
      // Also map variations
      const baseName = fc.filename.replace('.html', '');
      filenameToFileCategory[baseName] = fc;
      filenameToFileCategory[baseName.toLowerCase()] = fc;
    });

    let fixed = 0;
    let failed = 0;

    for (const lecture of lecturesToFix) {
      console.log(`\n🔧 Processing: "${lecture.title}"`);

      let matchedFileCategory = null;

      // Try multiple matching strategies
      const strategies = [
        // Strategy 1: Direct filename match
        () => {
          const filename = `${lecture.slug}.html`;
          return filenameToFileCategory[filename] || filenameToFileCategory[lecture.slug];
        },

        // Strategy 2: Title-based matching
        () => {
          const titleLower = lecture.title.toLowerCase().replace(/[^a-z0-9]/g, '');
          return filenameToFileCategory[titleLower];
        },

        // Strategy 3: Partial title matching
        () => {
          const partialTitle = lecture.title.split(' ')[0].toLowerCase();
          return filenameToFileCategory[partialTitle];
        }
      ];

      for (const strategy of strategies) {
        matchedFileCategory = strategy();
        if (matchedFileCategory) {
          console.log(`   ✅ Found match using strategy: ${matchedFileCategory.filename}`);
          break;
        }
      }

      if (matchedFileCategory) {
        // Use MongoDB native driver for guaranteed update
        const db = mongoose.connection.db;
        const result = await db.collection('lectures').updateOne(
          { _id: lecture._id },
          {
            $set: {
              contentId: matchedFileCategory.filename,
              updatedAt: new Date()
            }
          }
        );

        console.log(`   📊 Update result - Modified: ${result.modifiedCount}, Acknowledged: ${result.acknowledged}`);

        if (result.modifiedCount > 0) {
          fixed++;
          console.log('   ✅ SUCCESS: contentId updated');
        } else {
          failed++;
          console.log('   ❌ FAILED: contentId not updated');
        }
      } else {
        console.log('   ❌ No matching FileCategory found');
        failed++;
      }
    }

    // Final verification
    console.log('\n🔍 FINAL VERIFICATION:');
    const finalLectures = await Lecture.find({ category: webPentestingCat._id }).sort({ createdAt: 1 });

    console.log(`Total lectures: ${finalLectures.length}`);

    let workingCount = 0;
    let brokenCount = 0;

    finalLectures.forEach((lecture, index) => {
      const hasContentId = lecture.contentId && lecture.contentId !== '';
      const status = hasContentId ? '✅ WORKING' : '❌ BROKEN';

      console.log(`${index + 1}. "${lecture.title}" - ${status} (${lecture.contentId || 'NONE'})`);

      if (hasContentId) {
        workingCount++;
      } else {
        brokenCount++;
      }
    });

    console.log('\n📊 FINAL SUMMARY:');
    console.log(`Working: ${workingCount}`);
    console.log(`Broken: ${brokenCount}`);
    console.log(`Total: ${finalLectures.length}`);

    if (workingCount > 0) {
      console.log('\n🎉 SUCCESS: ContentId assignments completed!');
      console.log('The lectures should now be accessible in the frontend.');
      console.log('\n🧪 TEST INSTRUCTIONS:');
      console.log('1. Refresh the WebApp Pentesting course page');
      console.log('2. Try clicking on "Host Header Attacks"');
      console.log('3. The lecture should now load properly');
    } else {
      console.log('\n❌ FAILURE: All lectures still have missing contentId');
    }

    await mongoose.connection.close();

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

fixAllContentIds();