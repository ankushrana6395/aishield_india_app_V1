const axios = require('axios');

const API_BASE = 'http://localhost:5002/api';
const AUTH_TOKEN = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OGFlOTg0NWFmYzNkY2M3YmZkMDNjOTIiLCJpYXQiOjE3NTc1MTAxNjcsImV4cCI6MTc2MDEwMjE2N30.Fb4qFKAfGIlel6JmpEYM7nKTTS_w9-7h-f8w7xJx_ng';

const axiosConfig = {
  headers: {
    'Authorization': AUTH_TOKEN,
    'Content-Type': 'application/json'
  }
};

async function testLectureFetching() {
  console.log('🔍 TESTING LECTURE FETCHING LOGIC');
  console.log('===================================');
  console.log('Testing: Database → API → User Account Display');

  try {
    // Step 1: Check user authorization
    console.log('1️⃣ CHECKING USER AUTHORIZATION:');

    // Get user info from auth endpoint
    let userInfo = null;
    try {
      const authResponse = await axios.get(`${API_BASE}/admin/test-auth`, axiosConfig);
      userInfo = authResponse.data.user;
      console.log(`   ✅ AUTHENTICATION SUCCESS:`);
      console.log(`      User: ${userInfo.name} (${userInfo.email})`);
      console.log(`      Subscribed: ${userInfo.isSubscribed ? 'YES' : 'NO'}`);
      console.log(`      Role: ${userInfo.role}`);
    } catch (authError) {
      console.log(`   ❌ AUTHENTICATION FAILED:`, authError.response?.status || authError.message);
    }

    // Step 2: Check course API data
    console.log('\n2️⃣ CHECKING COURSE API DATA:');

    const courseResponse = await axios.get(`${API_BASE}/courses/c-programing`, axiosConfig);
    const course = courseResponse.data.course;

    console.log(`   📚 Course API Response:`);
    console.log(`      Course: "${course.title}"`);
    console.log(`      Published: ${course.published ? '✅ YES' : '❌ NO'}`);
    console.log(`      Total Lectures: ${course.totalLectures || 0}`);
    console.log(`      Categories: ${course.categories?.length || 0}`);

    // Step 3: Analyze lecture data structure
    console.log('\n3️⃣ LECTURE DATA STRUCTURE ANALYSIS:');

    if (course.categories && course.categories.length > 0) {
      course.categories.forEach((category, catIdx) => {
        console.log(`   📂 Category ${catIdx + 1}: "${category.name}"`);
        console.log(`      Server-side lectures: ${category.lectures?.length || 0}`);

        if (category.lectures && category.lectures.length > 0) {
          category.lectures.forEach((lecture, lecIdx) => {
            const hasContent = !!lecture.contentId;
            const contentType = typeof lecture.contentId;

            console.log(`         ${lecIdx + 1}. "${lecture.title}"`);
            console.log(`            Content ID: ${hasContent ? '✅ SET' : '❌ NULL'}`);
            console.log(`            Content Type: "${contentType}"`);
            console.log(`            Required: ${lecture.isRequired || false}`);
            console.log(`            Populated: ${contentType === 'object' ? '✅ YES' : '❌ NO'}`);

            if (lecture.contentId && typeof lecture.contentId === 'object') {
              console.log(`            File: "${lecture.contentId.filename}"`);
              console.log(`            Title: "${lecture.contentId.title}"`);
            }
            console.log('');
          });
        } else {
          console.log('         ❌ NO LECTURES IN THIS CATEGORY');
        }
      });
    } else {
      console.log('   ❌ NO CATEGORIES FOUND');
    }

    // Step 4: Check course access permissions
    console.log('4️⃣ COURSE ACCESS PERMISSIONS:');

    console.log(`   User Authorized: ${userInfo?.isSubscribed ? '✅ YES' : '❌ NO'}`);
    console.log(`   Can Enroll: ${course.access?.canEnroll ? '✅ YES' : '❌ NO'}`);
    console.log(`   Access Level: ${course.access?.accessLevel || 'none'}`);
    console.log(`   Overall Access: ${(userInfo?.isSubscribed && course.access?.canEnroll) ? '✅ GRANTED' : '❌ DENIED'}`);

    // Step 5: Test individual lecture content access
    console.log('\n5️⃣ INDIVIDUAL LECTURE CONTENT ACCESS:');

    for (const category of course.categories || []) {
      for (const lecture of category.lectures || []) {
        if (lecture.contentId) {
          const contentId = typeof lecture.contentId === 'object' ?
            lecture.contentId.filename : lecture.contentId;

          console.log(`   Testing: "${lecture.title}" (${contentId})`);

          try {
            const contentResponse = await axios.get(`${API_BASE}/content/lecture-content/${contentId}`, axiosConfig);

            if (contentResponse.status === 200) {
              console.log(`      ✅ CONTENT ACCESSIBLE: ${contentResponse.data?.length || 0} bytes`);
            } else {
              console.log(`      ❌ CONTENT ACCESS DENIED: Status ${contentResponse.status}`);
            }
          } catch (contentError) {
            console.log(`      ❌ CONTENT FETCH ERROR: ${contentError.response?.status || contentError.message}`);
          }

          console.log('');
        }
      }
    }

    // Step 6: Verify data consistency
    console.log('6️⃣ DATA CONSISTENCY VERIFICATION:');

    console.log(`   API Response Status: ${courseResponse.status} ✅`);
    console.log(`   Has Course Data: ${!!course} ✅`);
    console.log(`   Has Categories: ${!!course.categories} ${course.categories ? '✅' : '❌'}`);
    console.log(`   Has Lectures: ${!!course.categories?.some(cat => cat.lectures?.length > 0)} ${course.categories?.some(cat => cat.lectures?.length > 0) ? '✅' : '❌'}`);
    console.log(`   All Lectures Linked: ${course.categories?.flatMap(cat => cat.lectures)?.every(l => l.contentId)} ${course.categories?.flatMap(cat => cat.lectures)?.every(l => l.contentId) ? '✅' : '⚠️ SOME MISSING'}`);

    // Step 7: Test the lecture fetching flow as it would happen in frontend
    console.log('\n7️⃣ FRONTEND LECTURE FETCHING SIMULATION:');

    const frontendData = course.categories?.flatMap(category =>
      (category.lectures || []).map(lecture => ({
        id: lecture._id,
        title: lecture.title,
        category: category.name,
        contentId: lecture.contentId,
        isRequired: lecture.isRequired || false,
        duration: lecture.estimatedDuration || 15,
        hasContent: !!lecture.contentId
      }))
    );

    console.log(`   Frontend would receive: ${frontendData?.length || 0} lectures`);

    if (frontendData && frontendData.length > 0) {
      console.log('   Sample lecture data for frontend:');
      frontendData.slice(0, 3).forEach((lecture, idx) => {
        console.log(`      ${idx + 1}. "${lecture.title}" (${lecture.category}) - ${lecture.hasContent ? 'Content: ✅' : 'Content: ❌'}`);
      });
    }

    // Step 8: Complete flow assessment
    console.log('\n8️⃣ COMPLETE FLOW ASSESSMENT:');

    const assessments = {
      userAuthorized: userInfo?.isSubscribed,
      coursePublished: course.published,
      courseAccessible: course.access?.canEnroll,
      hasCategories: course.categories?.length > 0,
      hasLectures: (course.categories?.flatMap(cat => cat.lectures)?.length || 0) > 0,
      allLecturesLinked: course.categories?.flatMap(cat => cat.lectures)?.every(l => l.contentId),
      contentAccessible: true // Will be updated below
    };

    // Test content access
    let contentAccessTested = 0;
    let contentAccessSuccessful = 0;

    for (const category of course.categories || []) {
      for (const lecture of category.lectures || []) {
        if (lecture.contentId) {
          contentAccessTested++;
          try {
            const contentId = typeof lecture.contentId === 'object' ?
              lecture.contentId.filename : lecture.contentId;
            const contentResponse = await axios.get(`${API_BASE}/content/lecture-content/${contentId}`, axiosConfig);
            if (contentResponse.status === 200) {
              contentAccessSuccessful++;
            }
          } catch (err) {
            // Content access failed, continue
          }
        }
      }
    }

    assessments.contentAccessible = contentAccessSuccessful === contentAccessTested;

    console.log('   ASSESSMENT RESULTS:');
    Object.entries(assessments).forEach(([key, value]) => {
      console.log(`      ${key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}: ${value ? '✅' : '❌'}`);
    });

    const overallSuccess = Object.values(assessments).every(v => v);

    console.log('\n   OVERALL RESULT:', overallSuccess ? '✅ SUCCESS' : '❌ ISSUES DETECTED');

    // Step 9: Troubleshooting recommendations
    console.log('\n9️⃣ TROUBLESHOOTING RECOMMENDATIONS:');

    if (!overallSuccess) {
      console.log('   If issues detected, try these steps:');

      if (!assessments.userAuthorized) {
        console.log('   🔐 User Authorization Issue:');
        console.log('      - Ensure user has active subscription');
        console.log('      - Check subscription plan coverage');
        console.log('      - Verify payment status');
      }

      if (!assessments.coursePublished) {
        console.log('   📚 Course Publishing Issue:');
        console.log('      - Admin must publish the course');
        console.log('      - Check publication timestamp');
      }

      if (!assessments.hasLectures) {
        console.log('   📖 Lecture Population Issue:');
        console.log('      - Run auto-sync script');
        console.log('      - Check FileCategory entries for course');
        console.log('      - Verify category alignments');
      }

      if (!assessments.allLecturesLinked) {
        console.log('   🔗 Content Linking Issue:');
        console.log('      - Check contentId population in course structure');
        console.log('      - Verify FileCategory entries exist');
        console.log('      - Run sync to link missing content');
      }

      if (!assessments.contentAccessible) {
        console.log('   📄 Content Access Issue:');
        console.log('      - Check FileCategory entries exist in database');
        console.log('      - Verify filename matches in content requests');
        console.log('      - Check server-side file serving');
      }
    } else {
      console.log('   ✅ All systems operational - no troubleshooting required');
    }

  } catch (error) {
    console.error('❌ TEST FAILED:', error);
    if (error.response?.data) {
      console.log('API Error details:', error.response.data);
    }
  }
}

testLectureFetching();