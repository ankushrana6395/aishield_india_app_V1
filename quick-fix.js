const mongoose = require('mongoose');
require('./config/environment');

async function quickFix() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    const Course = require('./models/Course');
    const Category = require('./models/Category');

    // Find the WebApp Pentesting course
    const course = await Course.findOne({ slug: 'webapp-pentesting' });
    console.log('Course found:', course ? course.title : 'Not found');

    // Find the WebPentesting category
    const category = await Category.findOne({ slug: 'webpentesting' });
    console.log('Category found:', category ? category.name : 'Not found');

    if (course && category) {
      // Add the category if not already present
      const hasCategory = course.categories?.some(catId =>
        catId.toString() === category._id.toString()
      );

      if (!hasCategory) {
        await Course.updateOne(
          { _id: course._id },
          { $push: { categories: category._id } }
        );
        console.log('✅ Added WebPentesting category to WebApp Pentesting course');
      } else {
        console.log('⚠️ Category already assigned to course');
      }
    }

    await mongoose.connection.close();
    console.log('✅ Database connection closed');
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

quickFix();