const axios = require('axios');

const API_BASE = 'http://localhost:5002/api';
const AUTH_TOKEN = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OGFlOTg0NWFmYzNkY2M3YmZkMDNjOTIiLCJpYXQiOjE3NTc1MDgxNjgsImV4cCI6MTc2MDEwMDE2OH0.rS1r6nbJZDHD6oqURQ';

const axiosConfig = {
  headers: {
    'Authorization': AUTH_TOKEN,
    'Content-Type': 'application/json'
  }
};

async function testLectureLinking() {
  console.log('🔗 TESTING LECTURE CONTENT LINKING...');

  try {
    // Step 1: Get user's enrolled courses
    console.log('\n1️⃣ Getting enrolled courses...');
    const enrolledResponse = await axios.get(`${API_BASE}/courses/user/enrolled`, axiosConfig);
    const enrolledCourses = enrolledResponse.data.enrolledCourses || [];

    if (enrolledCourses.length === 0) {
      console.log('❌ No enrolled courses found');
      return;
    }

    console.log(`Found ${enrolledCourses.length} enrolled courses`);

    // Find a course with lectures
    let testCourse = null;
    for (const enrollment of enrolledCourses) {
      if (enrollment.course && enrollment.course.slug) {
        testCourse = enrollment.course;
        break;
      }
    }

    if (!testCourse) {
      console.log('❌ No suitable course found');
      return;
    }

    console.log(`\n2️⃣ Testing course: ${testCourse.title} (${testCourse.slug})`);

    // Step 2: Get course details with populated lectures
    console.log('\n3️⃣ Fetching course details with lecture content...');
    const courseResponse = await axios.get(`${API_BASE}/courses/${testCourse.slug}`, axiosConfig);
    const course = courseResponse.data.course;

    console.log(`Course: "${course.title}"`);
    console.log(`Categories: ${course.categories?.length || 0}`);
    console.log(`Total Lectures: ${course.totalLectures || 0}`);

    // Step 3: Analyze lecture content population
    console.log('\n4️⃣ Analyzing lecture content population...');
    let totalLectures = 0;
    let lecturesWithContent = 0;
    let validContentLinks = 0;

    course.categories?.forEach((category, catIndex) => {
      console.log(`\n📂 Category ${catIndex + 1}: "${category.name}"`);
      console.log(`   Lectures: ${category.lectures?.length || 0}`);

      category.lectures?.forEach((lecture, lecIndex) => {
        totalLectures++;
        console.log(`     ${lecIndex + 1}. "${lecture.title}"`);

        if (lecture.contentId) {
          lecturesWithContent++;
          console.log(`         ✅ Has contentId: ${typeof lecture.contentId}`);

          // Check if contentId is populated (object) or just ID (string)
          if (typeof lecture.contentId === 'object' && lecture.contentId !== null) {
            console.log(`         ✅ POPULATED: filename="${lecture.contentId.filename}"`);
            console.log(`         ✅ POPULATED: title="${lecture.contentId.title}"`);
            validContentLinks++;

            // Test the frontend navigation format
            console.log(`         🔗 Frontend URL would be: /lecture/${lecture.contentId.filename}`);
          } else if (typeof lecture.contentId === 'string') {
            console.log(`         ⚠️ STRING ID ONLY: ${lecture.contentId}`);
            console.log(`         🔗 Frontend URL would be: /lecture/${lecture.contentId}`);
          } else {
            console.log(`         ❌ INVALID contentId: ${JSON.stringify(lecture.contentId)}`);
          }
        } else {
          console.log(`         ❌ NO contentId`);
        }
      });
    });

    // Step 4: Summary
    console.log(`\n📊 LECTURE LINKING SUMMARY:`);
    console.log(`Total Lectures: ${totalLectures}`);
    console.log(`Lectures with Content ID: ${lecturesWithContent}`);
    console.log(`Properly Populated Content: ${validContentLinks}`);
    console.log(`Content Coverage: ${totalLectures > 0 ? ((lecturesWithContent / totalLectures) * 100).toFixed(1) : 0}%`);
    console.log(`Proper Linking: ${totalLectures > 0 ? ((validContentLinks / totalLectures) * 100).toFixed(1) : 0}%`);

    // Step 5: Test actual lecture access
    if (validContentLinks > 0) {
      console.log(`\n5️⃣ Testing lecture content access...`);
      const sampleLecture = course.categories.find(cat => cat.lectures?.find(l => l.contentId && typeof l.contentId === 'object'))?.lectures?.find(l => l.contentId);

      if (sampleLecture) {
        console.log(`Testing sample lecture: "${sampleLecture.title}"`);
        const filename = sampleLecture.contentId.filename;

        try {
          // Test access to lecture content
          const lectureResponse = await axios.get(`${API_BASE}/admin/lectures/content/${filename}`, axiosConfig);
          const contentLength = lectureResponse.data ? lectureResponse.data.length : 0;
          console.log(`✅ Lecture content accessible: ${contentLength} characters`);
          console.log(`🔗 Content URL: /api/admin/lectures/content/${filename}`);
        } catch (error) {
          console.log(`❌ Lecture content NOT accessible: ${error.response?.status}`);
        }
      }
    }

    // Step 6: Recommendations
    console.log(`\n🎯 RECOMMENDATIONS:`);
    if (validContentLinks === totalLectures) {
      console.log(`✅ EXCELLENT: All lectures properly linked!`);
    } else if (validContentLinks > 0) {
      console.log(`⚠️ PARTIAL: Some lectures linked but not all`);
      console.log(`   - Remaining ${totalLectures - validContentLinks} need linking`);
    } else {
      console.log(`❌ CRITICAL: No lectures properly linked`);
      console.log(`   - Admin upload auto-linking may still be failing`);
    }

    return {
      totalLectures,
      linkedLectures: validContentLinks,
      coveragePercentage: totalLectures > 0 ? (validContentLinks / totalLectures) * 100 : 0
    };

  } catch (error) {
    console.error('❌ Lecture linking test failed:', error.message);
    return { success: false, error: error.message };
  }
}

testLectureLinking();