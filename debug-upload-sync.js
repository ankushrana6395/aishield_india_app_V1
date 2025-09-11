const axios = require('axios');

const API_BASE = 'http://localhost:5002/api';
const AUTH_TOKEN = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OGFlOTg0NWFmYzNkY2M3YmZkMDNjOTIiLCJpYXQiOjE3NTc1MTAxNjcsImV4cCI6MTc2MDEwMjE2N30.Fb4qFKAfGIlel6JmpEYM7nKTTS_w9-7h-f8w7xJx_ng';

const axiosConfig = {
  headers: {
    'Authorization': AUTH_TOKEN,
    'Content-Type': 'application/json'
  }
};

async function debugUploadSync() {
  console.log('🔍 DEBUGGING ADMIN UPLOAD & USER SYNC');
  console.log('=====================================');

  try {
    // Step 1: Check current course state before upload
    console.log('1️⃣ CURRENT LECTURE STATE (before upload):');
    const courseResponse = await axios.get(`${API_BASE}/courses/c-programing`, axiosConfig);
    const course = courseResponse.data.course;

    console.log(`   Course: "${course.title}" (${course.slug})`);
    console.log(`   Categories: ${course.categories?.length || 0}`);
    console.log(`   Total Lectures: ${course.totalLectures || 0}`);

    if (course.categories && course.categories.length > 0) {
      course.categories.forEach((category, catIdx) => {
        console.log(`   📂 Category "${category.name}": ${category.lectures?.length || 0} lectures`);
        if (category.lectures) {
          category.lectures.forEach((lecture, lecIdx) => {
            console.log(`      ${lecIdx + 1}. "${lecture.title}" - ${lecture.contentId ? '✅ LINKED' : '❌ NOT LINKED'}`);
          });
        }
      });
    }
    console.log('');

    // Step 2: Check FileCategory entries for this course
    console.log('2️⃣ FILECATEGORY ENTRIES CHECK:');
    const filesResponse = await axios.get(`${API_BASE}/admin/lectures/detailed`, axiosConfig);
    const fileLectures = filesResponse.data;

    console.log(`   Total FileCategory entries: ${fileLectures.length}`);

    // Find entries for C programming course
    const cProgrammingEntries = fileLectures.filter(lec => lec.courseId === course._id);
    console.log(`   Entries for C programming course: ${cProgrammingEntries.length}`);

    cProgrammingEntries.forEach((entry, idx) => {
      console.log(`   ${idx + 1}. "${entry.title}" - Course: ${entry.courseId ? entry.courseId.slice(-6) : 'N/A'}`);
    });
    console.log('');

    // Step 3: Simulation of upload process
    console.log('3️⃣ SIMULATION: Upload process and expected results');

    console.log('   📤 SIMULATED UPLOAD:');
    console.log('      - HTML file: test-lecture.html');
    console.log('      - Title: "New Test Lecture"');
    console.log('      - Course: C programming');
    console.log('      - Category: Basic programming');
    console.log('');

    console.log('   🚀 EXPECTED AUTO-SYNC BEHAVIOR:');
    console.log('      1. File uploaded to FileCategory collection');
    console.log('      2. Course assignment flag set');
    console.log('      3. IMMEDIATE AUTO-SYNC ACTIVATED');
    console.log('      4. Fetch ALL FileCategory entries for course');
    console.log('      5. Check which entries are missing from course structure');
    console.log('      6. Create missing lecture entries');
    console.log('      7. Link content to course categories');
    console.log('      8. Update total lecture count');
    console.log('      9. Return sync results');
    console.log('');

    // Step 4: Check for any synchronization issues
    console.log('4️⃣ POTENTIAL SYNC ISSUES TO CHECK:');

    // Check if user has proper access to course
    console.log(`   🔐 User Access Check:`);
    console.log(`      Can Enroll: ${course.access?.canEnroll ? 'YES' : 'NO'}`);
    console.log(`      Access Level: ${course.access?.accessLevel || 'none'}`);
    console.log(`      Subscription: ${course.access?.isSubscribed ? 'ACTIVE' : 'INACTIVE'}`);

    if (!course.access?.canEnroll || !course.access?.isSubscribed) {
      console.log('      ❌ USER ACCESS ISSUE: User does not have required access');
      console.log('         Solution: Ensure user is subscribed and enrolled in the course');
    } else {
      console.log('      ✅ USER ACCESS: Proper authorization confirmed');
    }
    console.log('');

    // Check for category mismatches
    console.log(`   📂 Category Matching Check:`);
    const fileCategories = cProgrammingEntries.map(entry => entry.categoryId);
    const courseCategories = course.categories?.map(cat => cat._id.toString()) || [];

    console.log(`      FileCategory entries have ${fileCategories.length} categories`);
    console.log(`      Course has ${courseCategories.length} categories`);

    // Check for missing categories
    const missingCategories = fileCategories.filter(catId =>
      !courseCategories.includes(catId)
    );

    if (missingCategories.length > 0) {
      console.log(`      ⚠️ CATEGORY MISMATCH: ${missingCategories.length} categories in FileCategory but missing in course`);
      console.log(`      This could cause lectures to not appear in user view`);
    } else {
      console.log(`      ✅ CATEGORY MATCH: All categories aligned`);
    }
    console.log('');

    // Step 5: Recommended verification steps
    console.log('5️⃣ VERIFICATION STEPS TO DEBUG UPLOAD-SYNC:');

    console.log('   🔍 IMMEDIATE CHECKS:');
    console.log('      1. Check server console logs during upload');
    console.log('      2. Verify "IMMEDIATE SYNC" messages in server logs');
    console.log('      3. Confirm auto-sync function is being called');
    console.log(`      4. Check total lecture count changes (${course.totalLectures} → expected increase)`);

    console.log('\n   🔧 MANUAL VERIFICATION:');
    console.log('      1. Admin: Upload a new HTML file to C programming course');
    console.log('      2. Server: Check console for "IMMEDIATE SYNC" messages');
    console.log('      3. User: Refresh course page and check lecture count');
    console.log('      4. API: Query /courses/c-programing to verify new lecture');
    console.log('      5. Debug: Check Category and FileCategory alignments');

    console.log('\n   🐛 COMMON ISSUES:');
    console.log('      - Server restart required after code changes');
    console.log('      - Database connection issues in auto-sync script');
    console.log('      - Category ID mismatches between collections');
    console.log('      - Missing import statements');
    console.log('      - FileCategory entries not saved with course IDs');

    // Step 6: Real-time monitoring recommendation
    console.log('\n6️⃣ RECOMMENDED MONITORING:');

    console.log('   📊 Server Console Monitoring:');
    console.log('      Watch for these messages during next upload:');
    console.log('      • "🔄 IMMEDIATE SYNC: Auto-syncing ALL lectures for this course..."');
    console.log('      • "✅ IMMEDIATE SYNC COMPLETE: ..."');
    console.log('      • "📊 Total lectures synchronized: ..."');

    console.log('\n   🔄 API Response Monitoring:');
    console.log('      Check admin upload response for sync statistics');
    console.log('      Verify sync success in response object');

    console.log('\n   👤 User Experience Testing:');
    console.log('      1. Upload completed in admin panel');
    console.log('      2. Switch to user account immediately');
    console.log('      3. Visit course page (automatic refresh enabled)');
    console.log('      4. Verify new lecture appears');

  } catch (error) {
    console.error('❌ DEBUG FAILED:', error);
    if (error.response?.data) {
      console.log('API Error details:', error.response.data);
    }
  }
}

debugUploadSync();