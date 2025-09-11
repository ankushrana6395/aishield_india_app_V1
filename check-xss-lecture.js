const mongoose = require('mongoose');
require('./config/environment');

async function checkXSSLecture() {
  try {
    console.log('🔍 CHECKING XSS LECTURE CONTENTID');
    console.log('==================================');

    await mongoose.connect(process.env.MONGODB_URI);

    const Lecture = require('./models/Lecture');
    const FileCategory = require('./models/FileCategory');

    // Find the XSS lecture
    const lecture = await Lecture.findById('68c2746a4418b53065151ec9');
    if (!lecture) {
      console.log('❌ XSS lecture not found');
      return;
    }

    console.log('🎯 XSS LECTURE DETAILS:');
    console.log('Title:', lecture.title);
    console.log('ID:', lecture._id);
    console.log('contentId:', lecture.contentId || 'UNDEFINED');
    console.log('Course:', lecture.course);
    console.log('Category:', lecture.category);

    // Check if there's a corresponding FileCategory
    if (lecture.contentId) {
      const fileCat = await FileCategory.findOne({ filename: lecture.contentId });
      if (fileCat) {
        console.log('✅ FileCategory found:', fileCat.filename);
        console.log('FileCategory title:', fileCat.title);
      } else {
        console.log('❌ FileCategory NOT found for contentId:', lecture.contentId);
      }
    } else {
      console.log('❌ No contentId to search for FileCategory');

      // Try to find any FileCategory that might match this lecture
      const possibleFiles = await FileCategory.find({}).sort({ createdAt: -1 }).limit(5);
      console.log('\n🔍 RECENT FILECATEGORIES:');
      possibleFiles.forEach((file, i) => {
        console.log(`${i+1}. "${file.title}" -> ${file.filename} (${file.createdAt.toISOString()})`);
      });

      // Try to find by title match
      const titleMatch = await FileCategory.findOne({
        title: { $regex: 'Cross-Site Scripting', $options: 'i' }
      });
      if (titleMatch) {
        console.log('\n✅ FOUND BY TITLE MATCH:', titleMatch.filename);
        console.log('This should be the contentId for the XSS lecture');

        // Update the lecture with the correct contentId
        const updateResult = await Lecture.updateOne(
          { _id: lecture._id },
          { $set: { contentId: titleMatch.filename } }
        );

        console.log('Update result:', {
          matched: updateResult.matchedCount,
          modified: updateResult.modifiedCount
        });

        if (updateResult.modifiedCount > 0) {
          console.log('✅ FIXED: XSS lecture contentId updated!');
        }
      } else {
        console.log('\n❌ NO TITLE MATCH FOUND');
      }
    }

    await mongoose.connection.close();

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkXSSLecture();