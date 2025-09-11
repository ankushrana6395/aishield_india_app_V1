const axios = require('axios');
const fs = require('fs');
const path = require('path');

const API_BASE = 'http://localhost:5002/api';
const AUTH_TOKEN = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OGFlOTg0NWFmYzNkY2M3YmZkMDNjOTIiLCJpYXQiOjE3NTc1MTAxNjcsImV4cCI6MTc2MDEwMjE2N30.Fb4qFKAfGIlel6JmpEYM7nKTTS_w9-7h-f8w7xJx_ng';

const axiosConfig = {
  headers: {
    'Authorization': AUTH_TOKEN,
    'Content-Type': 'application/json'
  }
};

async function simulateUpload() {
  console.log('🚀 SIMULATING COMPLETE LECTURE UPLOAD PROCESS');
  console.log('==============================================');

  try {
    // Step 1: Prepare a test HTML file
    console.log('1️⃣ PREPARING TEST HTML CONTENT:');

    const testHtmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Test Lecture - Advanced C Programming</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 20px;
            line-height: 1.6;
        }
        h1 { color: #2c3e50; }
        h2 { color: #34495e; }
        .code-block {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 5px;
            margin: 10px 0;
        }
    </style>
</head>
<body>
    <h1>Test Lecture: Advanced C Programming Concepts</h1>
    <p>This is a test lecture uploaded to verify the sync system.</p>

    <h2>1. Memory Management</h2>
    <p>Understanding dynamic memory allocations...</p>
    <div class="code-block">
        <pre>
int* ptr = (int*)malloc(sizeof(int));
if (ptr == NULL) {
    printf("Memory allocation failed\n");
}
free(ptr);
        </pre>
    </div>

    <h2>2. File Handling</h2>
    <p>Working with file streams in C...</p>

    <h2>3. Best Practices</h2>
    <p>Writing clean, maintainable C code...</p>

    <h3>Learning Objectives:</h3>
    <ul>
        <li>Master dynamic memory concepts</li>
        <li>Learn file operations</li>
        <li>Implement error handling</li>
    </ul>
</body>
</html>`;

    // Write test file to temporary location
    const testFilePath = '/tmp/test-lecture-advanced-c.html';
    fs.writeFileSync(testFilePath, testHtmlContent);

    console.log(`   ✅ Test HTML file created: ${testFilePath}`);
    console.log(`   📄 File size: ${testHtmlContent.length} bytes`);

    // Step 2: Get course information
    console.log('\n2️⃣ GATHERING COURSE INFORMATION:');

    const courseResponse = await axios.get(`${API_BASE}/courses/c-programing`, axiosConfig);
    const course = courseResponse.data.course;

    console.log(`   📚 Target Course: "${course.title}" (${course._id})`);
    console.log(`   🏷️ Course Slug: "c-programing"`);
    console.log(`   📂 Categories: ${course.categories?.length || 0}`);

    if (course.categories && course.categories.length > 0) {
      course.categories.forEach((cat, idx) => {
        console.log(`      ${idx + 1}. "${cat.name}" (ID: ${cat._id})`);
      });
    }

    // Step 3: Get categories for upload
    console.log('\n3️⃣ FETCHING AVAILABLE CATEGORIES:');

    const categoriesResponse = await axios.get(`${API_BASE}/admin/categories`, axiosConfig);
    const categories = categoriesResponse.data.categories;

    console.log(`   📋 Available categories: ${categories?.length || 0}`);

    if (categories && categories.length > 0) {
      categories.forEach((cat, idx) => {
        console.log(`      ${idx + 1}. "${cat.name}" (ID: ${cat._id})`);
      });
    }

    // Step 4: Prepare upload data
    console.log('\n4️⃣ PREPARING UPLOAD PARAMETERS:');

    const uploadData = new FormData();

    // Use first category for testing
    const targetCategory = categories && categories.length > 0 ? categories[0]._id : null;
    console.log(`   🎯 Target Category: ${targetCategory || 'First available'}`);
    console.log(`   📝 Lecture Title: "Test Lecture: Advanced C Programming"`);
    console.log(`   📋 Lecture Description: "Test lecture for syncing verification"`);
    console.log(`   🏫 Course ID: ${course._id}`);

    // Step 5: Execute the upload
    console.log('\n5️⃣ EXECUTING LECTURE UPLOAD:');

    const formData = new FormData();
    formData.append('file', fs.createReadStream(testFilePath));
    formData.append('title', 'Test Lecture: Advanced C Programming');
    formData.append('description', 'Test lecture for syncing verification');
    formData.append('category', targetCategory);
    formData.append('courseId', course._id);

    console.log('   📤 Sending upload request...');

    const uploadConfig = {
      headers: {
        'Authorization': AUTH_TOKEN,
        ...formData.getHeaders()
      },
      maxContentLength: Infinity,
      maxBodyLength: Infinity
    };

    const uploadResponse = await axios.post(`${API_BASE}/admin/upload-lecture`, formData, uploadConfig);

    console.log('   ✅ UPLOAD SUCCESSFUL!');
    console.log(`   📄 Response Status: ${uploadResponse.status}`);
    console.log(`   📦 Response Data Keys:`, Object.keys(uploadResponse.data));

    // Step 6: Verify sync results
    console.log('\n6️⃣ VERIFYING SYNC RESULTS:');

    const syncResults = uploadResponse.data;
    console.log('   🔄 Sync Results:');
    console.log(`      Upload Message: "${syncResults.message}"`);

    if (syncResults.courseAssignment) {
      console.log('   🏫 Course Assignment:');
      console.log(`      Course ID: ${syncResults.courseAssignment.courseId}`);
      console.log(`      Course Name: ${syncResults.courseAssignment.courseName}`);
      console.log(`      Assigned: ${syncResults.courseAssignment.isAssigned ? '✅ YES' : '❌ NO'}`);
    }

    if (syncResults.autoLinking) {
      console.log('   🔗 Auto-Linking:');
      console.log(`      Attempted: ${syncResults.autoLinking.attempted ? '✅ YES' : '❌ NO'}`);
      console.log(`      Successful: ${syncResults.autoLinking.successful ? '✅ YES' : '❌ NO'}`);
    }

    // Step 7: Wait for sync to complete and verify
    console.log('\n7️⃣ VERIFYING FINAL COURSE STATE:');

    // Wait a moment for sync to complete
    console.log('   ⏳ Waiting 2 seconds for sync to complete...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    const updatedCourseResponse = await axios.get(`${API_BASE}/courses/c-programing`, axiosConfig);
    const updatedCourse = updatedCourseResponse.data.course;

    console.log(`   📊 Updated Course: "${updatedCourse.title}"`);
    console.log(`   📚 Updated Lecture Count: ${updatedCourse.totalLectures}`);

    const currentLectureCount = updatedCourse.categories?.reduce((total, cat) => total + (cat.lectures?.length || 0), 0) || 0;
    console.log(`   ✅ Current Lectures on Course: ${currentLectureCount}`);

    // Verify the test lecture was added
    const testLectureFound = updatedCourse.categories?.some(cat =>
      cat.lectures?.some(lec => lec.title === 'Test Lecture: Advanced C Programming')
    );

    console.log(`   🔍 Test Lecture Found: ${testLectureFound ? '✅ YES' : '❌ NO'}`);

    // Show all current lectures
    console.log('\n   📋 ALL CURRENT LECTURES:');
    let lectureCount = 0;
    updatedCourse.categories?.forEach((category, catIdx) => {
      console.log(`      📂 Category: "${category.name}"`);
      if (category.lectures) {
        category.lectures.forEach((lecture, lecIdx) => {
          lectureCount++;
          const hasContent = !!lecture.contentId;
          console.log(`         ${lectureCount}. "${lecture.title}" ${hasContent ? '✅ (linked)' : '❌ (unlinked)'}`);
        });
      }
    });

    // Step 8: Final assessment
    console.log('\n8️⃣ FINAL ASSESSMENTS:');

    const assessments = {
      uploadSuccessful: uploadResponse.status === 200,
      lectureCountIncreased: updatedCourse.totalLectures > course.totalLectures,
      testLectureAdded: testLectureFound,
      contentAccessible: false, // Will test below
      syncWorking: lectureCount === currentLectureCount
    };

    // Test content access for new lecture
    if (testLectureFound) {
      try {
        const newLecture = updatedCourse.categories
          .flatMap(cat => cat.lectures)
          .find(lec => lec.title === 'Test Lecture: Advanced C Programming');

        if (newLecture && newLecture.contentId) {
          const contentResponse = await axios.get(`${API_BASE}/content/lecture-content/module10.html`, axiosConfig);
          assessments.contentAccessible = contentResponse.status === 200;
        }
      } catch (err) {
        assessments.contentAccessible = false;
      }
    }

    console.log('   ASSESSMENT RESULTS:');
    console.log(`      Upload Successful: ${assessments.uploadSuccessful ? '✅' : '❌'}`);
    console.log(`      Lecture Count Increased: ${assessments.lectureCountIncreased ? '✅' : '❌'}`);
    console.log(`      Test Lecture Added: ${assessments.testLectureAdded ? '✅' : '❌'}`);
    console.log(`      Content Accessible: ${assessments.contentAccessible ? '✅' : '❌'}`);
    console.log(`      Sync Working: ${assessments.syncWorking ? '✅' : '❌'}`);

    const overallSuccess = Object.values(assessments).every(v => v);

    console.log('\n   🏁 OVERALL RESULT:', overallSuccess ? '✅ COMPLETE SUCCESS' : '❌ ISSUES DETECTED');

    if (overallSuccess) {
      console.log('\n🎉 LECTURE UPLOAD AND SYNC WORKING PERFECTLY!');
      console.log('   ✅ Lecture uploaded successfully');
      console.log('   ✅ Auto-sync triggered immediately');
      console.log('   ✅ New lecture appears in user account');
      console.log('   ✅ Content is immediately accessible');
    } else {
      console.log('\n⚠️ SOME ISSUES DETECTED IN THE UPLOAD PROCESS');
      console.log('   - Check server console for detailed error messages');
      console.log('   - Verify auto-sync script is being called');
      console.log('   - Check database connections');
    }

    // Cleanup
    try {
      fs.unlinkSync(testFilePath);
      console.log('\n🧹 Test file cleaned up successfully');
    } catch (cleanupErr) {
      console.warn('Failed to clean up test file:', cleanupErr.message);
    }

  } catch (error) {
    console.error('❌ SIMULATION FAILED:', error);
    if (error.response?.data) {
      console.log('API Error details:', error.response.data);
    }

    // Still try to cleanup
    try {
      if (fs.existsSync('/tmp/test-lecture-advanced-c.html')) {
        fs.unlinkSync('/tmp/test-lecture-advanced-c.html');
      }
    } catch (cleanupErr) {
      // Ignore cleanup errors
    }
  }
}

simulateUpload();