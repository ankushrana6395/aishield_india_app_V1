const mongoose = require('mongoose');

// Load environment configuration (same as server)
const config = require('./config/environment');

// Models
const Course = require('./models/Course');
const FileCategory = require('./models/FileCategory');

/**
 * Immediately sync ALL FileCategory entries to course structure
 * @param {string} courseId - Course ID to sync
 * @returns {Promise<object>} Sync results
 */
const autoSyncAllFileCategoriesToCourse = async (courseId) => {
  console.log('🚀 IMMEDIATE SYNC: Syncing ALL FileCategory entries to course structure...');
  console.log(`   Course ID: ${courseId}`);

  try {
    // Get the course
    const course = await Course.findById(courseId);
    if (!course) {
      console.log('   ❌ Course not found');
      return { success: false, error: 'Course not found' };
    }

    console.log(`   📚 Course: "${course.title}" (${course.slug})`);
    console.log(`   📂 Current categories: ${course.categories?.length || 0}`);

    // Get ALL FileCategory entries for this course
    const courseFileCategories = await FileCategory.find({
      course: courseId,
      isAssignedToCourse: true
    });

    console.log(`   📄 Total FileCategory entries: ${courseFileCategories.length}`);

    if (courseFileCategories.length === 0) {
      console.log('   ℹ️ No FileCategory entries to sync');
      return {
        success: true,
        message: 'No FileCategory entries to sync',
        totalLectures: 0,
        syncedLectures: 0
      };
    }

    let syncCount = 0;
    let processedLectures = [];

    // Process each FileCategory entry
    for (const fileCategory of courseFileCategories) {
      const lectureTitle = fileCategory.title || fileCategory.filename;
      console.log(`     🔍 Processing: "${lectureTitle}"`);

      let lectureExists = false;
      let lectureInCategory = null;

      // Check if lecture exists in any course category
      if (course.categories && course.categories.length > 0) {
        for (const category of course.categories) {
          if (category.lectures && category.lectures.length > 0) {
            const foundLecture = category.lectures.findIndex(lec => lec.title === lectureTitle);
            if (foundLecture !== -1) {
              lectureExists = true;
              lectureInCategory = { categoryIndex: course.categories.indexOf(category), lectureIndex: foundLecture };
              console.log(`        ✅ FOUND in category "${category.name}"`);

              // Check if content is linked
              if (!category.lectures[foundLecture].contentId) {
                console.log(`        🔗 LINKING: Adding content reference`);
                category.lectures[foundLecture].contentId = fileCategory._id;
                syncCount++;
              } else {
                console.log(`        ✅ ALREADY LINKED`);
              }
              break;
            }
          }
        }
      }

      // If lecture doesn't exist, create it
      if (!lectureExists) {
        console.log(`        📝 CREATING new lecture in structure`);

        // Find or create appropriate category
        let targetCategory = null;
        let targetCategoryIndex = null;

        if (!course.categories || course.categories.length === 0) {
          // No categories exist, create one using FileCategory's category
          const newCategory = {
            _id: new mongoose.Types.ObjectId(),
            name: fileCategory.category?.toString() || fileCategory.category || 'Basic',
            estimatedDuration: 15,
            lectures: []
          };
          if (!course.categories) course.categories = [];
          course.categories.push(newCategory);
          targetCategoryIndex = course.categories.length - 1;
          targetCategory = newCategory;
          console.log(`        📁 Created category: "${newCategory.name}"`);
        } else {
          // Find matching category by name
          const fileCatName = fileCategory.category?.toString() || fileCategory.category || 'Basic';
          targetCategoryIndex = course.categories.findIndex(cat =>
            cat.name === fileCatName ||
            cat.name.toLowerCase() === fileCatName.toString().toLowerCase()
          );

          if (targetCategoryIndex === -1) {
            // Use first category as fallback
            targetCategoryIndex = 0;
            console.log(`        ⚠️ Category "${fileCatName}" not found, using: "${course.categories[0].name}"`);
          }
          targetCategory = course.categories[targetCategoryIndex];
        }

        // Create new lecture object
        const newLecture = {
          _id: new mongoose.Types.ObjectId(),
          title: lectureTitle,
          subtitle: fileCategory.description || 'Added automatically',
          contentId: fileCategory._id,
          order: targetCategory.lectures ? targetCategory.lectures.length : 0,
          estimatedDuration: 15,
          isRequired: true
        };

        // Add lecture to category
        if (!targetCategory.lectures) targetCategory.lectures = [];
        targetCategory.lectures.push(newLecture);

        // Update total lecture count
        course.totalLectures = course.categories.reduce((total, cat) =>
          total + (cat.lectures?.length || 0), 0
        );

        syncCount++;
        console.log(`        ✅ ADDED to category "${targetCategory.name}"`);
      }

      processedLectures.push({
        title: lectureTitle,
        existed: lectureExists,
        synced: !lectureExists || syncCount > 0
      });
    }

    // Save course changes if any syncs were made
    if (syncCount > 0) {
      await course.save();
      console.log(`\n   ✅ COURSE STRUCTURE UPDATED: ${syncCount} changes made`);
    } else {
      console.log(`\n   ✅ NO CHANGES NEEDED: All lectures already in sync`);
    }

    // Return results
    const finalLectureCount = course.categories?.reduce((total, cat) => total + (cat.lectures?.length || 0), 0) || 0;

    return {
      success: true,
      message: `Successfully synced ${syncCount} lectures`,
      totalLectures: courseFileCategories.length,
      syncedLectures: finalLectureCount,
      changesMade: syncCount,
      courseId: courseId,
      courseTitle: course.title
    };

  } catch (error) {
    console.error('❌ IMMEDIATE SYNC FAILED:', error);
    return {
      success: false,
      error: error.message,
      totalLectures: 0,
      syncedLectures: 0
    };
  }
};

module.exports = {
  autoSyncAllFileCategoriesToCourse
};