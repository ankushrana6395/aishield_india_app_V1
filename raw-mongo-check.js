const mongoose = require('mongoose');
require('./config/environment');

async function rawMongoCheck() {
  try {
    console.log('🔧 RAW MONGODB CHECK');
    console.log('====================');

    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    const db = mongoose.connection.db;
    const lecturesCollection = db.collection('lectures');
    const categoriesCollection = db.collection('categories');

    // Find WebPentesting category
    const webPentestingCat = await categoriesCollection.findOne({ slug: 'webpentesting' });
    if (!webPentestingCat) {
      console.log('❌ WebPentesting category not found');
      return;
    }

    console.log('✅ Found WebPentesting category:', webPentestingCat._id);

    // Get ALL lectures (without filtering)
    const allLectures = await lecturesCollection.find({}).toArray();
    console.log(`📚 Total lectures in database: ${allLectures.length}`);

    // Filter by category
    const webPentestingLectures = allLectures.filter(l => l.category && l.category.toString() === webPentestingCat._id.toString());
    console.log(`🎯 WebPentesting lectures: ${webPentestingLectures.length}`);

    // Check each lecture directly from MongoDB
    webPentestingLectures.forEach((lecture, index) => {
      console.log(`\n${index + 1}. "${lecture.title}"`);
      console.log(`   Raw contentId: ${JSON.stringify(lecture.contentId)}`);
      console.log(`   contentId type: ${typeof lecture.contentId}`);
      console.log(`   contentId is null: ${lecture.contentId === null}`);
      console.log(`   contentId is undefined: ${lecture.contentId === undefined}`);
      console.log(`   contentId length: ${lecture.contentId ? lecture.contentId.length : 'N/A'}`);
      console.log(`   Has course: ${lecture.course ? 'YES' : 'NO'}`);
      console.log(`   Course ID: ${lecture.course || 'NONE'}`);
    });

    // Check for Host Header Attacks specifically
    const hostHeaderAttack = webPentestingLectures.find(l => l.title === 'Host Header Attacks');
    if (hostHeaderAttack) {
      console.log('\n🎯 HOST HEADER ATTACKS RAW DATA:');
      console.log('Complete document:', JSON.stringify(hostHeaderAttack, null, 2));
    }

    // Try to update one lecture directly
    if (webPentestingLectures.length > 0) {
      const testLecture = webPentestingLectures.find(l => l.title === 'Host Header Attacks');
      if (testLecture) {
        console.log('\n🔄 ATTEMPTING DIRECT UPDATE:');
        console.log(`Updating lecture: ${testLecture._id}`);

        const updateResult = await lecturesCollection.updateOne(
          { _id: testLecture._id },
          {
            $set: {
              contentId: 'host-header-attacks.html',
              updatedAt: new Date()
            }
          }
        );

        console.log('Update result:', updateResult);

        // Re-fetch the same document
        const updatedDoc = await lecturesCollection.findOne({ _id: testLecture._id });
        console.log('Re-fetched contentId:', updatedDoc.contentId);
      }
    }

    await mongoose.connection.close();

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

rawMongoCheck();