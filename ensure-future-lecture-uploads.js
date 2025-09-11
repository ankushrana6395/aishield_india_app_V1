const Course = require('./models/Course');
const Lecture = require('./models/Lecture');
const FileCategory = require('./models/FileCategory');

/**
 * Auto-links uploaded content to course lectures based on categories
 * @param {string} courseId - MongoDB ObjectId of the course
 * @param {string} fileCategoryId - MongoDB ObjectId of the uploaded FileCategory
 * @returns {Promise<object>} Result indicating success/failure and details
 */
async function autoLinkContentToLectures(courseId, fileCategoryId) {
  console.log('🔗 AUTO-LINKING CONTENT TO COURSE:');
  console.log(`   Course ID: ${courseId}`);
  console.log(`   FileCategory ID: ${fileCategoryId}`);

  try {
    // Step 1: Get the course details
    const course = await Course.findById(courseId);
    if (!course) {
      throw new Error(`Course with ID ${courseId} not found`);
    }

    console.log(`   Course Title: ${course.title}`);
    console.log(`   Course Categories: ${course.categories?.length || 0}`);

    // Step 2: Get the uploaded file category
    const fileCategory = await FileCategory.findById(fileCategoryId);
    if (!fileCategory) {
      throw new Error(`FileCategory with ID ${fileCategoryId} not found`);
    }

    console.log(`   File Category: ${fileCategory.title}`);
    console.log(`   File Filename: ${fileCategory.filename}`);
    console.log(`   File Category ID: ${fileCategory.category}`);

    // Step 3: Find matching course category
    if (!course.categories || course.categories.length === 0) {
      console.log('   ⚠️ Course has no categories - cannot auto-link');
      return {
        success: false,
        message: 'Course has no categories defined',
        reason: 'empty_course_categories'
      };
    }

    // Find course category that matches the file's category (by name or ID)
    const matchingCategory = course.categories.find(cat =>
      cat.name === fileCategory.category ||
      cat._id.toString() === fileCategory.category?.toString()
    );

    if (!matchingCategory) {
      console.log('   ⚠️ No matching category found in course');
      console.log('   Course categories:', course.categories.map(c => c.name));
      console.log('   File category:', fileCategory.category);

      return {
        success: false,
        message: 'No matching category found in course',
        reason: 'category_mismatch'
      };
    }

    console.log(`   ✅ Found matching category: ${matchingCategory.name}`);

    // Step 4: Look for an existing lecture in this category that might need content
    let existingLecture = null;

    // First, check if there's already a structured lecture in this category
    if (matchingCategory.lectures && matchingCategory.lectures.length > 0) {
      // Try to find a lecture without content first
      existingLecture = matchingCategory.lectures.find(lecture =>
        !lecture.contentId && lecture.title &&
        (lecture.title.toLowerCase().includes(fileCategory.title.toLowerCase()) ||
         fileCategory.title.toLowerCase().includes(lecture.title.toLowerCase()))
      );

      console.log(`   Found ${matchingCategory.lectures.length} lectures in category`);
      if (!existingLecture) {
        console.log('   No matching lecture found');
      }
    }

    // Step 5: Update the lecture with content reference
    if (existingLecture) {
      // Link existing lecture to uploaded content
      console.log(`   🔗 Linking to existing lecture: ${existingLecture.title}`);

      // Update the existing lecture in the course structure
      const categoryIndex = course.categories.findIndex(cat =>
        cat._id.toString() === matchingCategory._id.toString()
      );
      const lectureIndex = course.categories[categoryIndex].lectures.findIndex(lec =>
        lec.title === existingLecture.title
      );

      if (categoryIndex !== -1 && lectureIndex !== -1) {
        course.categories[categoryIndex].lectures[lectureIndex].contentId = fileCategoryId;
        await course.save();

        console.log('   ✅ Successfully linked content to existing course structure');
        return {
          success: true,
          message: `Content linked to existing lecture "${existingLecture.title}"`,
          linkedTo: 'existing_lecture',
          categoryName: matchingCategory.name,
          lectureTitle: existingLecture.title
        };
      }
    }

    // Step 6: If no existing lecture, create a new one in the category
    console.log('   📝 Creating new lecture in course category');

    const newLecture = {
      title: fileCategory.title,
      subtitle: fileCategory.description || 'Lecture content added automatically',
      contentId: fileCategoryId,
      order: matchingCategory.lectures ? matchingCategory.lectures.length : 0,
      estimatedDuration: 15 // Default 15 minutes
    };

    // Find the category and add the new lecture
    const categoryIndex = course.categories.findIndex(cat =>
      cat._id.toString() === matchingCategory._id.toString()
    );

    if (categoryIndex === -1) {
      throw new Error('Category not found during lecture creation');
    }

    if (!course.categories[categoryIndex].lectures) {
      course.categories[categoryIndex].lectures = [];
    }

    course.categories[categoryIndex].lectures.push(newLecture);
    await course.save();

    console.log(`   ✅ Successfully created new lecture in category "${matchingCategory.name}"`);

    return {
      success: true,
      message: `New lecture created and content linked`,
      linkedTo: 'new_lecture',
      categoryName: matchingCategory.name,
      lectureTitle: newLecture.title
    };

  } catch (error) {
    console.error('❌ AUTO-LINKING ERROR:', error);
    return {
      success: false,
      message: `Auto-linking failed: ${error.message}`,
      error: error.message
    };
  }
}

/**
 * Triggers auto-linking for all courses that might need content updates
 * Useful for bulk processing or when content has been updated
 */
async function triggerBulkAutoLinking() {
  console.log('🔄 TRIGGERING BULK AUTO-LINKING...');

  try {
    const courses = await Course.find({ published: true });
    const fileCategories = await FileCategory.find({ isAssignedToCourse: true });

    console.log(`Found ${courses.length} courses and ${fileCategories.length} file categories`);

    const results = [];

    for (const fileCat of fileCategories) {
      if (fileCat.course) {
        const courseId = fileCat.course.toString();
        const course = courses.find(c => c._id.toString() === courseId);

        if (course) {
          console.log(`Processing: ${fileCat.title} -> ${course.title}`);
          const result = await autoLinkContentToLectures(courseId, fileCat._id);
          results.push(result);
        }
      }
    }

    console.log('✅ BULK AUTO-LINKING COMPLETED');
    return {
      processed: results.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results
    };

  } catch (error) {
    console.error('❌ BULK AUTO-LINKING FAILED:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Validates course-content relationships for a specific user
 */
async function validateUserCourseAccess(userId, courseId) {
  console.log('🔍 VALIDATING USER COURSE ACCESS...');

  try {
    const course = await Course.findById(courseId)
      .populate('categories.lectures.contentId')
      .lean();

    if (!course) {
      return { valid: false, reason: 'Course not found' };
    }

    let totalLectures = 0;
    let lecturesWithContent = 0;

    course.categories.forEach(category => {
      category.lectures.forEach(lecture => {
        totalLectures++;
        if (lecture.contentId) {
          lecturesWithContent++;
        }
      });
    });

    return {
      valid: true,
      courseId,
      courseTitle: course.title,
      totalLectures,
      lecturesWithContent,
      contentCoverage: totalLectures > 0 ? (lecturesWithContent / totalLectures) * 100 : 0
    };

  } catch (error) {
    console.error('❌ USER COURSE VALIDATION FAILED:', error);
    return { valid: false, reason: error.message };
  }
}

module.exports = {
  autoLinkContentToLectures,
  triggerBulkAutoLinking,
  validateUserCourseAccess
};