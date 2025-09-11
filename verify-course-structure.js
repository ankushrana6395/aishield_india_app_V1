const mongoose = require('mongoose');

// Configure database connection - adjust if needed
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/aishield';

async function verifyCourseStructure() {
  console.log('🔍 VERIFICATION: DATABASE COURSE STRUCTURE ANALYSIS');
  console.log('='.repeat(50));
  console.log();

  try {
    // Connect to database
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    console.log();

    // Access Course collection directly
    const Course = mongoose.connection.db.collection('courses');

    // LIST ALL COURSES FIRST to see what exists
    console.log('📚 LISTING ALL COURSES IN DATABASE WITH FULL DETAILS:');

    // Use toArray() for cursor-based results
    const allCourses = await Course.find({}).limit(20).toArray();

    if (allCourses.length === 0) {
      console.log('❌ NO COURSES FOUND in database at all!');
      console.log('This explains why there are no lectures - no courses exist.');
      console.log('You need to create courses first.');
      console.log('\n🔧 SOLUTION: Go to Admin Dashboard → Courses → Create Course');
      return;
    }

    console.log(`📊 FOUND ${allCourses.length} COURSE(S) TOTAL:`);
    console.log();

    // Analyze each course in detail
    for (let i = 0; i < allCourses.length; i++) {
      const course = allCourses[i];
      console.log(`🏫 COURSE ${i + 1}: "${course.title}"`);
      console.log(`   Slug: ${course.slug}`);
      console.log(`   Published: ${course.published ? '✅ YES' : '❌ NO (DRAFT)'}`);
      console.log(`   ID: ${course._id}`);
      console.log(`   Categories: ${course.categories?.length || 0}`);
      console.log();

      // Analyze categories and lectures
      if (course.categories && course.categories.length > 0) {
        let totalLectures = 0;
        let linkedLectures = 0;

        course.categories.forEach((category, catIndex) => {
          console.log(`   📂 Category ${catIndex + 1}: "${category.name}"`);
          console.log(`      Category ID: ${category._id}`);
          console.log(`      Lectures: ${category.lectures?.length || 0}`);

          if (category.lectures && category.lectures.length > 0) {
            category.lectures.forEach((lecture, lecIndex) => {
              totalLectures++;
              const hasContent = !!lecture.contentId;
              if (hasContent) linkedLectures++;

              console.log(`        📖 "${lecture.title}" - ${hasContent ? '✅ LINKED' : '❌ NO CONTENT'}`);
              if (hasContent) {
                if (typeof lecture.contentId === 'string') {
                  console.log(`           Content Ref: ${lecture.contentId} (filename)`);
                } else if (typeof lecture.contentId === 'object' && lecture.contentId.filename) {
                  console.log(`           Content File: ${lecture.contentId.filename}`);
                }
              }
            });
          } else {
            console.log(`      ❗ No lectures in this category`);
          }
          console.log();
        });

        // Summary for this course
        console.log(`   📊 COURSE SUMMARY:`);
        console.log(`      Total Lectures: ${totalLectures}`);
        console.log(`      Linked Lectures: ${linkedLectures}`);
        console.log(`      Unlinked Lectures: ${totalLectures - linkedLectures}`);
        console.log(`      Lecture Link Rate: ${totalLectures > 0 ? ((linkedLectures / totalLectures) * 100).toFixed(1) : 0}%`);
        console.log();

      } else {
        console.log(`   🚨 NO CATEGORIES IN THIS COURSE`);
        console.log(`   This course has no lectures because it has no categories.`);
        console.log();
      }

      console.log('━'.repeat(60));
      console.log();
    }

    // Find the specific course we're debugging
    let courseDoc = await Course.findOne({
      slug: 'c-programing'
    });

    if (!courseDoc) {
      console.log('❌ TARGET COURSE "c-programing" NOT FOUND');
      console.log('Looking for alternative course names...');

      // Try alternative searches
      const alternativeDoc = await Course.findOne({
        $or: [
          { title: { $regex: 'programing', $options: 'i' } },
          { slug: { $regex: 'progr', $options: 'i' } },
          { title: 'C Programming' },
          { slug: 'c-programming' }
        ]
      });

      if (alternativeDoc) {
        console.log('✅ FOUND ALTERNATIVE COURSE:');
        console.log(`  Title: "${alternativeDoc.title}"`);
        console.log(`  Slug: ${alternativeDoc.slug}`);
        console.log(`  Published: ${alternativeDoc.published}`);
        console.log('🎯 Using this course instead for analysis.');
        console.log();

        // Use the alternative course for analysis
        courseDoc = alternativeDoc;
      } else {
        console.log('❌ NO SIMILAR COURSES FOUND');
        console.log('Available courses:');
        allCourses.forEach(course => {
          console.log(`  - ${course.title} (slug: ${course.slug})`);
        });
        return;
      }
    }

    console.log('✅ COURSE FOUND IN DATABASE');
    console.log('📋 Course Details:');
    console.log(`  ID: ${courseDoc._id}`);
    console.log(`  Title: ${courseDoc.title}`);
    console.log(`  Slug: ${courseDoc.slug}`);
    console.log(`  Published: ${courseDoc.published}`);
    console.log(`  Has Categories: ${!!courseDoc.categories}`);
    console.log(`  Categories Count: ${courseDoc.categories?.length || 0}`);
    console.log();

    // Check categories structure
    if (courseDoc.categories && courseDoc.categories.length > 0) {
      console.log('📂 CATEGORIES STRUCTURE ANALYSIS:');
      console.log();

      courseDoc.categories.forEach((category, catIndex) => {
        console.log(`  📁 Category ${catIndex + 1}: "${category.name}"`);
        console.log(`     ID: ${category._id}`);
        console.log(`     Has Lectures: ${!!category.lectures}`);
        console.log(`     Lectures Count: ${category.lectures?.length || 0}`);
        console.log();

        if (category.lectures && category.lectures.length > 0) {
          category.lectures.forEach((lecture, lecIndex) => {
            console.log(`    📖 Lecture ${lecIndex + 1}: "${lecture.title}"`);
            console.log(`       Lecture ID: ${lecture._id}`);
            console.log(`       Has ContentId: ${!!lecture.contentId}`);

            if (lecture.contentId) {
              // Check if contentId is populated (for populated queries)
              if (typeof lecture.contentId === 'object') {
                console.log(`       ContentId Type: OBJECT (populated)`);
                console.log(`       Content File: ${lecture.contentId.filename}`);
                console.log(`       ContentId ObjectID: ${lecture.contentId._id}`);
              } else if (typeof lecture.contentId === 'string') {
                console.log(`       ContentId Type: STRING (reference)`);
                console.log(`       ContentId Ref: ${lecture.contentId}`);
              }

              // Check if file actually exists in FileCategory collection
              if (typeof lecture.contentId === 'object') {
                console.log(`       🔗 CONTENT LINKED: YES`);
              } else if (typeof lecture.contentId === 'string') {
                console.log(`       🔗 REFERENCE TYPE: String (needs content verification)`);
                console.log(`       Referenced File: ${lecture.contentId}`);
              }
            } else {
              console.log(`       ❌ CONTENT NOT LINKED: No contentId field`);
            }

            console.log(`       Order: ${lecture.order || 'N/A'}`);
            console.log(`       Required: ${lecture.isRequired ? 'Yes' : 'No'}`);
            console.log(`       Duration: ${lecture.duration || 'N/A'} min`);
            console.log();
          });
        } else {
          console.log('    ⚠️  NO LECTURES IN THIS CATEGORY');
          console.log();
        }
      });
    } else {
      console.log('🚨 CRITICAL ISSUE: Course has no categories!');
      console.log('This means:');
      console.log('  1. Admin never created categories for this course');
      console.log('  2. Categories were deleted');
      console.log('  3. Database corruption');
      console.log();
    }

    // Check FileCategory collection for ALL uploaded content
    console.log('📁 CHECKING FILECATEGORY COLLECTION (ALL UPLOADED CONTENT):');
    const FileCategory = mongoose.connection.db.collection('filecategories');
    const allUploads = await FileCategory.find({}).limit(50).toArray(); // Get up to 50 files

    console.log(`📊 TOTAL UPLOADS IN DATABASE: ${allUploads.length}`);
    console.log();

    if (allUploads.length > 0) {
      console.log('📋 DETAILED UPLOAD LIST:');
      allUploads.forEach((upload, index) => {
        console.log(`  ${index + 1}. ${upload.filename}`);
        console.log(`     Title: ${upload.title}`);
        console.log(`     Category: ${upload.category || 'Uncategorized'}`);
        console.log(`     Course: ${upload.course || 'NOT ASSIGNED TO COURSE'}`);
        console.log(`     isAssignedToCourse: ${upload.isAssignedToCourse ? '✅ YES' : '❌ NO'}`);
        console.log(`     Content Size: ${upload.content?.length || 0} characters`);
        console.log(`     Created: ${upload.createdAt}`);
        console.log();
      });

      // Show assignment status summary
      const assignedCount = allUploads.filter(u => u.isAssignedToCourse).length;
      const unassignedCount = allUploads.length - assignedCount;
      console.log('📊 UPLOAD ASSIGNMENT SUMMARY:');
      console.log(`   Files assigned to courses: ${assignedCount}`);
      console.log(`   Files NOT assigned to courses: ${unassignedCount}`);
      console.log(`   Assignment Rate: ${((assignedCount / allUploads.length) * 100).toFixed(1)}%`);
      console.log();
    } else {
      console.log('   🚨 NO UPLOADED CONTENT FOUND AT ALL');
    }

    // Show recommendation
    console.log('💡 COURSE CREATION RECOMMENDATION:');
    console.log('Since there are NO courses but there may be uploaded content,');
    console.log('you need to:');
    console.log('1. Create course(s) in Admin Dashboard');
    console.log('2. Add categories to each course');
    console.log('3. Add lectures to each category');
    console.log('4. Use auto-linking system if content uploaded by filename matching');
    console.log();
    console.log();

    // SUMMARY
    console.log('📊 VERIFICATION SUMMARY:');
    console.log('='.repeat(25));
    console.log();

    const totalCategories = courseDoc.categories?.length || 0;
    let totalLectures = 0;
    let linkedLectures = 0;
    let unlinkedLectures = 0;

    if (courseDoc.categories) {
      courseDoc.categories.forEach(cat => {
        if (cat.lectures) {
          totalLectures += cat.lectures.length;
          cat.lectures.forEach(lecture => {
            if (lecture.contentId) {
              linkedLectures++;
            } else {
              unlinkedLectures++;
            }
          });
        }
      });
    }

    console.log(`Total Categories: ${totalCategories}`);
    console.log(`Total Lectures: ${totalLectures}`);
    console.log(`Linked Lectures: ${linkedLectures}`);
    console.log(`Unlinked Lectures: ${unlinkedLectures}`);
    console.log(`Lecture Link Rate: ${totalLectures > 0 ? ((linkedLectures / totalLectures) * 100).toFixed(1) : 0}%`);
    console.log();

    if (totalLectures > 0 && linkedLectures === totalLectures) {
      console.log('✅ DATABASE STRUCTURE: PERFECT');
      console.log('   All lectures are properly embedded in course structure');
      console.log('   Issue must be in frontend rendering or API calls');
    } else if (totalLectures > 0 && linkedLectures < totalLectures) {
      console.log('⚠️ DATABASE STRUCTURE: PARTIALLY BROKEN');
      console.log('   Some lectures are missing contentId links');
      console.log('   Recommended: Run auto-sync to fix linking issues');
    } else if (totalLectures === 0) {
      console.log('❌ DATABASE STRUCTURE: EMPTY');
      console.log('   No lectures found in course structure');
      console.log('   This explains why frontend shows no lectures');
    }

  } catch (error) {
    console.error('💥 VERIFICATION FAILED');
    console.error('Error:', error.message);

    if (error.message.includes('MongoNetworkError')) {
      console.error('🔧 CONNECTION ISSUE: Cannot connect to MongoDB');
      console.error('Make sure MongoDB is running and connection string is correct');
    }
  } finally {
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
      console.log('📡 Disconnected from MongoDB');
    }
  }
}

// Run verification
verifyCourseStructure().catch(console.error);