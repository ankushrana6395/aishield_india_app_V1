const mongoose = require('mongoose');
require('./config/environment');

async function directFix() {
  try {
    console.log('🔧 DIRECT CONTENTID FIX');
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

    // List all FileCategory entries first
    console.log('\n📁 ALL FILECATEGORY ENTRIES:');
    const allFiles = await FileCategory.find({}).limit(10);
    allFiles.forEach((file, index) => {
      console.log(`${index + 1}. "${file.title}" -> ${file.filename}`);
    });

    // Get lectures that need fixing
    const lectures = await Lecture.find({
      category: webPentestingCat._id,
      $or: [
        { contentId: { $exists: false } },
        { contentId: null },
        { contentId: '' }
      ]
    });

    console.log(`\n📚 Lectures needing contentId fix: ${lectures.length}`);

    if (lectures.length === 0) {
      console.log('✅ No lectures need contentId fixes');
      return;
    }

    // Direct manual assignment based on title matching
    const manualMappings = {
      'Command Injection': 'commandinjection.html',
      'Authentication Vulnerabilities': 'authenticationvulnerability.html',
      'API Testing': 'apipentest.html',
      'Access Control': 'access-control.html'
    };

    let fixed = 0;

    for (const lecture of lectures) {
      console.log(`\n🔧 Processing: "${lecture.title}"`);

      const expectedFilename = manualMappings[lecture.title];
      if (!expectedFilename) {
        console.log('   ❌ No manual mapping found');
        continue;
      }

      // Verify the file exists
      const fileExists = await FileCategory.findOne({ filename: expectedFilename });
      if (!fileExists) {
        console.log(`   ❌ File not found: ${expectedFilename}`);
        continue;
      }

      console.log(`   ✅ File exists: ${expectedFilename}`);

      // Use MongoDB native driver for guaranteed update
      const db = mongoose.connection.db;
      const result = await db.collection('lectures').updateOne(
        { _id: lecture._id },
        {
          $set: {
            contentId: expectedFilename,
            updatedAt: new Date()
          }
        }
      );

      console.log(`   📊 Update result - Modified: ${result.modifiedCount}, Acknowledged: ${result.acknowledged}`);

      if (result.modifiedCount > 0) {
        fixed++;
        console.log('   ✅ SUCCESS: contentId updated');
      } else {
        console.log('   ❌ FAILED: contentId not updated');
      }
    }

    // Final verification
    console.log('\n🔍 FINAL VERIFICATION:');
    const finalLectures = await Lecture.find({ category: webPentestingCat._id });

    console.log(`Total lectures: ${finalLectures.length}`);
    finalLectures.forEach((lecture, index) => {
      const hasContent = lecture.contentId && lecture.contentId !== '';
      const status = hasContent ? '✅ WORKING' : '❌ BROKEN';
      console.log(`${index + 1}. "${lecture.title}" - ${status} (${lecture.contentId || 'NONE'})`);

      if (lecture.title === 'Command Injection') {
        console.log(`   🎯 COMMAND INJECTION: ${hasContent ? 'ACCESSIBLE' : 'NOT ACCESSIBLE'}`);
      }
    });

    console.log('\n📊 SUMMARY:');
    console.log(`Fixed: ${fixed}`);
    console.log(`Total lectures: ${finalLectures.length}`);

    if (fixed > 0) {
      console.log('\n🎉 SUCCESS: contentId assignments completed!');
      console.log('Try accessing Command Injection lecture in the frontend now.');
    }

    await mongoose.connection.close();

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

directFix();