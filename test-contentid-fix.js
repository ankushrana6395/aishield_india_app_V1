const mongoose = require('mongoose');
require('dotenv').config();

// Connect to database
async function testContentIdFix() {
  try {
    console.log('🔧 Testing ContentId Fix...');
    await mongoose.connect(process.env.MONGODB_URI || process.env.DATABASE_URL);
    console.log('✅ Connected to database');

    // Test 1: Check existing lectures with missing contentId
    const Lecture = require('./models/Lecture');
    const FileCategory = require('./models/FileCategory');

    console.log('\n📊 CHECKING EXISTING LECTURES WITH MISSING CONTENTID...');

    const lecturesWithoutContentId = await Lecture.find({
      $or: [
        { contentId: null },
        { contentId: '' },
        { contentId: { $exists: false } }
      ]
    });

    console.log(`Found ${lecturesWithoutContentId.length} lectures with missing contentId`);

    if (lecturesWithoutContentId.length > 0) {
      console.log('❌ Lectures with missing contentId:');
      lecturesWithoutContentId.forEach(lecture => {
        console.log(`  - ${lecture.title} (ID: ${lecture._id})`);
      });
    } else {
      console.log('✅ No lectures found with missing contentId');
    }

    // Test 2: Check FileCategory entries
    console.log('\n📊 CHECKING FILECATEGORY ENTRIES...');
    const fileCategories = await FileCategory.find({}).limit(5);
    console.log(`Found ${fileCategories.length} FileCategory entries (showing first 5)`);

    fileCategories.forEach(fc => {
      console.log(`  - ${fc.filename}: ${fc.title} (course: ${fc.course ? 'assigned' : 'not assigned'})`);
    });

    console.log('\n🔧 CONTENTID FIX TEST SUMMARY:');
    console.log('✅ Database connection: SUCCESS');
    console.log(`📊 Lectures without contentId: ${lecturesWithoutContentId.length}`);
    console.log(`📁 FileCategory entries: ${fileCategories.length}`);
    console.log('\n🎯 NEXT STEPS:');
    console.log('1. Upload a new lecture via admin panel');
    console.log('2. Check if contentId is properly assigned');
    console.log('3. Verify lecture is accessible in frontend');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await mongoose.connection.close();
    console.log('✅ Database connection closed');
  }
}

testContentIdFix();