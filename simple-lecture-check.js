const mongoose = require('mongoose');
require('./config/environment');

async function simpleLectureCheck() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    const Lecture = require('./models/Lecture');
    const Category = require('./models/Category');
    const Course = require('./models/Course');

    console.log('🔍 SIMPLE LECTURE CHECK');
    console.log('======================');

    // 1. Check if WebPentesting category exists
    const webPentestingCat = await Category.findOne({ slug: 'webpentesting' });
    console.log('WebPentesting category:', webPentestingCat ? webPentestingCat.name : 'NOT FOUND');

    if (webPentestingCat) {
      console.log('Category ID:', webPentestingCat._id);

      // 2. Find lectures linked to this category
      const lectures = await Lecture.find({ category: webPentestingCat._id });
      console.log(`Lectures in WebPentesting category: ${lectures.length}`);

      lectures.forEach((lecture, index) => {
        console.log(`${index + 1}. ${lecture.title}`);
        console.log(`   ID: ${lecture._id}`);
        console.log(`   Content ID: ${lecture.contentId || 'NONE'}`);
        console.log(`   Course ID: ${lecture.course || 'NONE'}`);
        console.log('');
      });

      // 3. Check if course has this category
      const course = await Course.findOne({ slug: 'webapp-pentesting' });
      if (course) {
        const hasWebPentesting = course.categories?.some(cat =>
          cat._id && cat._id.toString() === webPentestingCat._id.toString()
        );
        console.log('Course has WebPentesting category:', hasWebPentesting);
      }
    }

    await mongoose.connection.close();
    console.log('✅ Database closed');
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

simpleLectureCheck();