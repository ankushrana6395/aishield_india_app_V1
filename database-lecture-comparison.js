const mongoose = require('mongoose');

// Load environment configuration (same as server)
const config = require('./config/environment');

// Models
const Course = require('./models/Course');
const FileCategory = require('./models/FileCategory');

async function compareDatabaseToApi() {
  console.log('🔍 DATABASE vs API LECTURE COMPARISON');
  console.log('=====================================');

  try {
    // Step 1: Get C programming course from database directly
    console.log('1️⃣ GETTING COURSE DATA FROM DATABASE:');

    const courseId = await findCProgrammingId();
    if (!courseId) {
      console.log('❌ Could not find C programming course in database');
      return;
    }

    console.log(`   📚 Found Course ID: ${courseId}`);

    // Get course with populated lectures
    const dbCourse = await Course.findById(courseId).populate('categories');
    console.log(`   📖 Course Title: "${dbCourse.title}"`);
    console.log(`   📄 Course Slug: "${dbCourse.slug}"`);
    console.log(`   📂 Categories: ${dbCourse.categories?.length || 0}`);

    // Collect all database lectures
    const dbLectures = [];
    dbCourse.categories?.forEach((category, catIdx) => {
      console.log(`   📂 Category ${catIdx + 1}: "${category.name}"`);

      if (category.lectures) {
        category.lectures.forEach((lecture, lectIdx) => {
          dbLectures.push({
            title: lecture.title,
            contentId: lecture.contentId,
            isRequired: lecture.isRequired || false,
            order: lecture.order || 0,
            category: category.name,
            source: 'database'
          });

          const lectureHasContent = !!lecture.contentId;
          console.log(lectureHasContent ? '✅' : '❌', ` Lecture ${lectIdx + 1}: "${lecture.title}"`);
        });
      }
    });

    // Step 2: Get FileCategory entries for this course
    console.log('\n2️⃣ GETTING FILECATEGORY ENTRIES FROM DATABASE:');

    const fileCategories = await FileCategory.find({ course: courseId });
    console.log(`   📁 FileCategory Entries: ${fileCategories.length}`);

    const fileCategoryLectures = fileCategories.map(fc => ({
      title: fc.title,
      contentId: fc._id, // FileCategory ID itself is the content ID
      filename: fc.filename,
      category: fc.category,
      source: 'filecategory'
    }));

    // Step 3: Get course data via API (simulating frontend)
    console.log('\n3️⃣ GETTING COURSE DATA VIA API:');

    const axios = require('axios');
    const API_BASE = 'http://localhost:5002/api';
    const AUTH_TOKEN = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OGFlOTg0NWFmYzNkY2M3YmZkMDNjOTIiLCJpYXQiOjE3NTc1MTAxNjcsImV4cCI6MTc2MDEwMjE2N30.Fb4qFKAfGIlel6JmpEYM7nKTTS_w9-7h-f8w7xJx_ng';

    const apiCourseResponse = await axios.get(`${API_BASE}/courses/c-programing`, {
      headers: {
        'Authorization': AUTH_TOKEN,
        'Content-Type': 'application/json'
      }
    });

    const apiCourse = apiCourseResponse.data.course;
    console.log(`   🌐 API Response Status: ${apiCourseResponse.status}`);
    console.log(`   📚 API Course Title: "${apiCourse.title}"`);
    console.log(`   📊 API Total Lectures: ${apiCourse.totalLectures}`);

    // Collect all API lectures
    const apiLectures = [];
    apiCourse.categories?.forEach((category, catIdx) => {
      if (category.lectures) {
        category.lectures.forEach((lecture, lecIdx) => {
          apiLectures.push({
            title: lecture.title,
            contentId: lecture.contentId,
            isRequired: lecture.isRequired || false,
            order: lecture.order || 0,
            category: category.name,
            source: 'api'
          });
        });
      }
    });

    // Step 4: Comprehensive comparison
    console.log('\n4️⃣ COMPREHENSIVE DATA COMPARISON:');

    const comparison = {
      databaseLectures: dbLectures.length,
      apiLectures: apiLectures.length,
      fileCategoryEntries: fileCategories.length,
      lectureMatches: 0,
      contentMatches: 0,
      issues: []
    };

    console.log(`   🔢 Lecture Counts:`);
    console.log(`      Database Course Lectures: ${comparison.databaseLectures}`);
    console.log(`      API Course Lectures: ${comparison.apiLectures}`);
    console.log(`      FileCategory Entries: ${comparison.fileCategoryEntries}`);

    // Compare lecture titles
    dbLectures.forEach(dbLecture => {
      const apiMatch = apiLectures.find(apiLecture => apiLecture.title === dbLecture.title);
      if (apiMatch) {
        comparison.lectureMatches++;

        // Check content consistency
        const dbContentId = dbLecture.contentId || 'none';
        const apiContentId = typeof apiMatch.contentId === 'object' ?
          (apiMatch.contentId?.filename || apiMatch.contentId?.toString() || 'object') :
          (apiMatch.contentId || 'none');

        console.log(`   ✅ MATCH: "${dbLecture.title}"`);
        console.log(`      DB Content ID: ${dbContentId}`);
        console.log(`      API Content ID: ${apiContentId}`);

        if (dbContentId !== 'none' && apiContentId !== 'none' && dbContentId === apiContentId) {
          comparison.contentMatches++;
          console.log(`      🔗 Content Match: ✅`);
        } else if (dbContentId === 'none' && apiContentId === 'none') {
          console.log(`      🔗 Content: Both null - OK`);
        } else {
          comparison.issues.push(`Content mismatch for "${dbLecture.title}": DB=${dbContentId}, API=${apiContentId}`);
          console.log(`      🔗 Content Match: ❌`);
        }
      } else {
        comparison.issues.push(`Lecture "${dbLecture.title}" found in database but missing from API`);
      }
    });

    // Check for extra lectures in API
    apiLectures.forEach(apiLecture => {
      const dbMatch = dbLectures.find(dbLecture => dbLecture.title === apiLecture.title);
      if (!dbMatch) {
        comparison.issues.push(`Lecture "${apiLecture.title}" found in API but missing from database`);
      }
    });

    console.log('\n   🎯 SUMMARY:');
    console.log(`      🎯 Lecture Matches: ${comparison.lectureMatches}/${comparison.apiLectures}`);
    console.log(`      🔗 Content Links: ${comparison.contentMatches}/${comparison.apiLectures}`);

    if (comparison.issues.length === 0) {
      console.log(`      ✅ Issues: None - Perfect data consistency`);
    } else {
      console.log(`      ⚠️ Issues: ${comparison.issues.length} detected:`);
      comparison.issues.forEach((issue, idx) => {
        console.log(`         ${idx + 1}. ${issue}`);
      });
    }

    // Step 5: Content Accessibility Test
    console.log('\n5️⃣ CONTENT ACCESSIBILITY VERIFICATION:');

    const accessibleContent = [];
    const inaccessibleContent = [];

    for (const apiLecture of apiLectures) {
      if (!apiLecture.contentId) continue;

      const contentId = typeof apiLecture.contentId === 'object' ?
        (apiLecture.contentId.filename || apiLecture.contentId._id) :
        apiLecture.contentId;

      try {
        const contentResponse = await axios.get(`${API_BASE}/content/lecture-content/${contentId}`, {
          headers: {
            'Authorization': AUTH_TOKEN,
            'Content-Type': 'application/json'
          }
        });

        if (contentResponse.status === 200) {
          accessibleContent.push({
            title: apiLecture.title,
            size: contentResponse.data ? contentResponse.data.length : 0
          });
        } else {
          inaccessibleContent.push({
            title: apiLecture.title,
            status: contentResponse.status
          });
        }
      } catch (contentError) {
        inaccessibleContent.push({
          title: apiLecture.title,
          error: contentError.response?.status || contentError.message
        });
      }
    }

    console.log(`   📋 Content Access Results:`);
    console.log(`      ✅ Accessible: ${accessibleContent.length}/${apiLectures.length}`);

    accessibleContent.forEach(content => {
      console.log(`         "${content.title}": ${content.size} bytes`);
    });

    if (inaccessibleContent.length > 0) {
      console.log(`      ❌ Inaccessible: ${inaccessibleContent.length}`);
      inaccessibleContent.forEach(content => {
        console.log(`         "${content.title}": ${content.status || content.error}`);
      });
    }

    // Step 6: Final Assessment
    console.log('\n6️⃣ FINAL VERIFICATION ASSESSMENT:');

    const assessment = {
      'Data Consistency': comparison.issues.length === 0,
      'All Lectures Present': comparison.databaseLectures === comparison.apiLectures && comparison.apiLectures > 0,
      'Content Links Valid': comparison.contentMatches === comparison.apiLectures && comparison.apiLectures > 0,
      'API Response Valid': apiCourseResponse.status === 200,
      'Database Query Valid': dbCourse !== null,
      'Content Accessible': accessibleContent.length === (apiLectures.filter(l => l.contentId).length || 0)
    };

    console.log('   ASSESSMENT RESULTS:');
    Object.entries(assessment).forEach(([test, result]) => {
      console.log(`      ${test}: ${result ? '✅ PASS' : '❌ FAIL'}`);
    });

    const overallSuccess = Object.values(assessment).every(v => v);

    console.log('\n   🏁 OVERALL RESULT:', overallSuccess ? '✅ DATABASE & API PERFECTLY SYNCED' : '❌ ISSUES DETECTED');

    if (overallSuccess) {
      console.log('\n🎉 SUCCESS: Lecture fetching is working perfectly!');
      console.log('   ✅ Database entries match API responses');
      console.log('   ✅ All lectures are properly synced');
      console.log('   ✅ Content is accessible');
      console.log('   ✅ Users will see all available lectures');
    } else {
      console.log('\n🚨 ISSUES DETECTED: Action required');
      console.log('   1. Check server console for detailed error messages');
      console.log('   2. Run sync script to fix data inconsistencies');
      console.log('   3. Verify database connections and model definitions');
    }

  } catch (error) {
    console.error('❌ COMPARISON FAILED:', error);
    if (error.response?.data) {
      console.log('API Error details:', error.response.data);
    }
  } finally {
    await mongoose.disconnect();
  }
}

async function findCProgrammingId() {
  try {
    const course = await Course.findOne({ slug: 'c-programing' });
    return course?._id;
  } catch (error) {
    console.error('Error finding course ID:', error);
    return null;
  }
}

// Connect to MongoDB and run comparison
mongoose.connect(config.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => {
  compareDatabaseToApi();
}).catch(error => {
  console.error('❌ Database connection failed:', error);
});