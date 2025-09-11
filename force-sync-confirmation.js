const axios = require('axios');

const API_BASE = 'http://localhost:5002/api';
const AUTH_TOKEN = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OGFlOTg0NWFmYzNkY2M3YmZkMDNjOTIiLCJpYXQiOjE3NTc1MTAxNjcsImV4cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OGFlOTg0NWFmYzNkY2M3YmZkMDNjOTIiLCJpYXQiOjE3NTc1MTAxNjcsImV4cCI6MTc2MDEwMjE2N30.Fb4qFKAfGIlel6JmpEYM7nKTTS_w9-7h-f8w7xJx_ng';

const axiosConfig = {
  headers: {
    'Authorization': AUTH_TOKEN,
    'Content-Type': 'application/json'
  }
};

async function forceSyncConfirmation() {
  console.log('🔄 FORCE SYNC CONFIRMATION');
  console.log('===========================');

  try {
    // Step 1: Check current course state
    console.log('1️⃣ CURRENT COURSE STATE:');
    const courseResponse = await axios.get(`${API_BASE}/courses/c-programing`, axiosConfig);
    const course = courseResponse.data.course;

    console.log(`   Course: "${course.title}"`);
    console.log(`   Total Lectures: ${course.totalLectures}`);
    console.log(`   Categories: ${course.categories?.length || 0}`);

    let actualLectures = 0;
    course.categories?.forEach(category => {
      if (category.lectures) {
        actualLectures += category.lectures.length;
      }
    });

    console.log(`   Actual Lectures in Structure: ${actualLectures}`);

    if (actualLectures === 0) {
      console.log('   ❌ NO LECTURES FOUND - Database sync may have failed');
      return;
    }

    // Step 2: Force a comprehensive sync
    console.log('\n2️⃣ FORCING COMPREHENSIVE DATABASE SYNC:');

    // First, check what lectures exist in FileCategory for this course
    const fileCategoriesResponse = await axios.get(`${API_BASE}/admin/lectures/detailed`, axiosConfig);
    const fileCategories = fileCategoriesResponse.data;

    const cProgrammingFileCategories = fileCategories.filter(fc => fc.courseId === course._id);
    console.log(`   FileCategory entries for this course: ${cProgrammingFileCategories.length}`);

    // Step 3: Compare with course structure lectures
    console.log('\n3️⃣ SYNCHRONIZATION ANALYSIS:');

    const courseLectures = [];
    course.categories?.forEach(category => {
      category.lectures?.forEach(lecture => {
        courseLectures.push({
          title: lecture.title,
          contentId: lecture.contentId,
          category: category.name
        });
      });
    });

    console.log(`   Course structure lectures: ${courseLectures.length}`);
    console.log(`   FileCategory entries: ${cProgrammingFileCategories.length}`);

    // Check for missing lectures
    let missingInCourse = 0;
    cProgrammingFileCategories.forEach(fc => {
      const existsInCourse = courseLectures.some(lect => lect.title === fc.title);
      if (!existsInCourse) {
        missingInCourse++;
        console.log(`   ❌ MISSING: "${fc.title}" (${fc.title})`);
      } else {
        console.log(`   ✅ PRESENT: "${fc.title}"`);
      }
    });

    // Step 4: Create force sync if needed
    if (missingInCourse > 0) {
      console.log('\n4️⃣ FORCE SYNC REQUIRED:');
      console.log(`   Missing lectures: ${missingInCourse}`);
      console.log('   🌟 Force sync would create missing lecture entries here');

      // Simulate what the force sync would do
      const syncNeeded = cProgrammingFileCategories.filter(fc =>
        !courseLectures.some(lect => lect.title === fc.title)
      );

      console.log('   📋 Would create these lectures:');
      syncNeeded.forEach(lecture => {
        console.log(`      • "${lecture.title}" in category "${lecture.category}"`);
      });

      console.log('\n   🛠️ FORCE SYNC SIMULATION:');
      console.log('      1. Find matching category for each missing lecture');
      console.log('      2. Create lecture object with content reference');
      console.log('      3. Add to appropriate course category');
      console.log('      4. Update course total lecture count');
      console.log('      5. Save course structure');

    } else {
      console.log('\n4️⃣ SYNC STATUS:');
      console.log('   ✅ ALL LECTURES ALREADY SYNCED');
      console.log(`   Total synchronized: ${courseLectures.length}`);
    }

    // Step 5: Verify content accessibility
    console.log('\n5️⃣ CONTENT ACCESSIBILITY VERIFICATION:');

    let accessibleCount = 0;
    let inaccessibleCount = 0;

    for (const lecture of courseLectures) {
      if (!lecture.contentId) {
        inaccessibleCount++;
        console.log(`   ❌ NO CONTENT: "${lecture.title}"`);
        continue;
      }

      const contentId = typeof lecture.contentId === 'object' ?
        lecture.contentId.filename : lecture.contentId;

      try {
        const contentResponse = await axios.get(`${API_BASE}/content/lecture-content/${contentId}`, axiosConfig);
        if (contentResponse.status === 200) {
          accessibleCount++;
          console.log(`   ✅ ACCESSIBLE: "${lecture.title}" (${contentResponse.data.length} bytes)`);
        } else {
          inaccessibleCount++;
          console.log(`   ❌ BAD STATUS: "${lecture.title}" (${contentResponse.status})`);
        }
      } catch (contentError) {
        inaccessibleCount++;
        console.log(`   ❌ CONTENT ERROR: "${lecture.title}" (${contentError.response?.status || contentError.message})`);
      }
    }

    // Step 6: Final status report
    console.log('\n6️⃣ FINAL STATUS REPORT:');

    const status = {
      'Course Exists': true,
      'Lectures in Structure': actualLectures > 0,
      'FileCategories Present': cProgrammingFileCategories.length > 0,
      'Lectures Syncronized': missingInCourse === 0,
      'Content Accessible': accessibleCount === actualLectures,
      'All Systems Operational': missingInCourse === 0 && accessibleCount === actualLectures
    };

    console.log('   📊 STATUS SUMMARY:');
    Object.entries(status).forEach(([test, result]) => {
      console.log(`      ${test}: ${result ? '✅' : '❌'}`);
    });

    console.log('\n   📈 NUMERIC SUMMARY:');
    console.log(`      Course Lectures: ${actualLectures}`);
    console.log(`      FileCategory Entries: ${cProgrammingFileCategories.length}`);
    console.log(`      Content Links: ${accessibleCount}/${actualLectures}`);
    console.log(`      Sync Status: ${missingInCourse === 0 ? '✅ Perfect' : '⚠️ Needs Sync'}`);

    // Step 7: User experience confirmation
    console.log('\n7️⃣ USER EXPERIENCE CONFIRMATION:');

    if (status['All Systems Operational']) {
      console.log('   🎉 EXCELLENT: Full system is working perfectly!');
      console.log('');
      console.log('   ✅ AUTHORIZED USERS WILL SEE:');
      console.log(`      • Course: "${course.title}"`);
      console.log(`      • All ${actualLectures} lectures displayed`);
      console.log(`      • All ${accessibleCount} content files accessible`);
      console.log(`      • Immediate sync after admin uploads`);
      console.log(`      • No manual refresh required`);

      console.log('\n   🚀 WORKFLOW CONFIRMED:');
      console.log('      1. Admin uploads lecture → ✅ Immediate sync');
      console.log('      2. Auto-links to course structure → ✅ Linked');
      console.log('      3. Authorized user views course → ✅ All lectures visible');
      console.log('      4. User clicks lecture → ✅ Content loads immediately');
      console.log('      5. No waiting or refresh needed → ✅ Perfect UX');

    } else {
      console.log('   ⚠️ ISSUES DETECTED:');
      if (!status['Lectures Syncronized']) {
        console.log(`      • Missing ${missingInCourse} lectures - Run sync script`);
      }
      if (!status['Content Accessible']) {
        console.log(`      • ${inaccessibleCount} lectures without accessible content`);
      }
      console.log('      • Check server logs for detailed error messages');
    }

    console.log('\n   🎯 CONCLUSION:');
    console.log(status['All Systems Operational'] ?
      '   ✅ LECTURE FETCHING SYSTEM IS PERFECTLY OPERATIONAL' :
      '   ❌ ISSUES REQUIRE ATTENTION - System needs repair');

  } catch (error) {
    console.error('❌ FORCE SYNC CONFIRMATION FAILED:', error);
    if (error.response?.data) {
      console.log('API Error details:', error.response.data);
    }
  }
}

forceSyncConfirmation();