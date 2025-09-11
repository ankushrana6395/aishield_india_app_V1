const axios = require('axios');

// Configure API base URL
const API_BASE = process.env.API_BASE || 'http://localhost:5002/api';
axios.defaults.baseURL = API_BASE;

// User credentials
const USER_CREDENTIALS = {
  email: 'ankush980@gmail.com',
  password: 'Abcd@12345'
};

let userToken = null;

async function debugFrontendIssue() {
  try {
    console.log('🎯 DEBUGGING FRONTEND LECTURE DISPLAY ISSUE');
    console.log('=' .repeat(60));
    console.log();

    // Step 1: Login and get detailed user info
    console.log('1️⃣ 🔐 AUTHENTICATION & USER PROFILE');
    const authResponse = await axios.post('/auth/login', USER_CREDENTIALS);
    userToken = authResponse.data.token;

    console.log('   ✅ Login successful');
    console.log('   📧 Email:', authResponse.data.user?.email);
    console.log('   👤 Name:', authResponse.data.user?.name);
    console.log('   🎛️  Role:', authResponse.data.user?.role);
    console.log('   💰 isSubscribed:', authResponse.data.user?.isSubscribed);

    if (authResponse.data.user?.subscription) {
      console.log('   📋 Subscription:', authResponse.data.user.subscription);
    }
    console.log();

    // Step 2: Fetch course data (simulate frontend call)
    console.log('2️⃣ 📚 COURSE DATA FETCH (as frontend would see it)');

    const courseHeaders = {
      'Authorization': `Bearer ${userToken}`,
      'Content-Type': 'application/json'
    };

    const courseResponse = await axios.get('/courses/c-programing', { headers: courseHeaders });

    const courseData = courseResponse.data.course;

    console.log('   ✅ Course data received');
    console.log('   📖 Course Title:', courseData.title);
    console.log('   🔖 Course Slug:', courseData.slug);
    console.log('   📚 Total Lectures:', courseData.totalLectures);
    console.log('   🏷️  Categories Count:', courseData.categories?.length || 0);
    console.log();

    // Step 3: Simulate CourseDetail.js logic
    console.log('3️⃣ 🎨 SIMULATING FRONTEND COMPONENT LOGIC');

    // Check subscription state (from AuthContext)
    const isSubscribed = authResponse.data.user?.isSubscribed || false;
    console.log('   🔑 Frontend isSubscribed state:', isSubscribed);
    console.log();

    // Check access permissions (from course data)
    const hasAccess = courseData.access?.isSubscribed && isSubscribed;
    console.log('   🏛️  Course Access Check:');
    console.log('      course.access.isSubscribed:', courseData.access?.isSubscribed);
    console.log('      canEnroll:', courseData.access?.canEnroll);
    console.log('      Overall access granted:', hasAccess);
    console.log();

    if (!hasAccess) {
      console.log('❌ FRONTEND WOULD SHOW: "Course Access Required" page');
      console.log('   Reason: User is not subscribed OR course does not allow access');
      console.log();

      // This is likely the issue if user sees access blocked
      console.log('🔧 POSSIBLE FIXES:');
      console.log('   1. Check user subscription status in database');
      console.log('   2. Ensure user is enrolled in this course');
      console.log('   3. Verify plan permissions allow access to this course');
      console.log();

      return;
    }

    console.log('✅ FRONTEND WOULD CONTINUE TO LECTURE DISPLAY');

    // Step 4: Check selected category logic
    if (!courseData.categories || courseData.categories.length === 0) {
      console.log('❌ FRONTEND WOULD SHOW: "No Categories Available"');
      console.log('   Reason: course.categories is empty or undefined');
      return;
    }

    const selectedCategory = courseData.categories[0];
    console.log('   📁 Selected Category:', selectedCategory.name);
    console.log('   📄 Lectures in category:', selectedCategory.lectures?.length || 0);
    console.log();

    // Step 5: Check lecture rendering logic
    if (!selectedCategory.lectures || selectedCategory.lectures.length === 0) {
      console.log('❌ FRONTEND WOULD SHOW: "No Lectures Available"');
      console.log('   Reason: selectedCategory.lectures is empty');
      return;
    }

    console.log('   📋 LECTURES TO DISPLAY:');
    selectedCategory.lectures.forEach((lecture, index) => {
      console.log(`      ${index + 1}. "${lecture.title}"`);
      console.log(`         📎 Has contentId: ${!!lecture.contentId}`);
      console.log(`         📄 Content filename: ${lecture.contentId?.filename || 'N/A'}`);
      console.log(`         🔢 Order: ${lecture.order || 'N/A'}`);
      console.log(`         ⚡ isRequired: ${lecture.isRequired}`);
      console.log(`         ⏱️  Duration: ${lecture.duration || 'N/A'} min`);

      // Simulate frontend filtering
      const validLecture = lecture && lecture.title;
      console.log(`         ✅ Passes frontend filter: ${validLecture}`);
      console.log();
    });

    // Step 6: Check for potential rendering issues
    console.log('4️⃣ 🎨 POTENTIAL FRONTEND RENDERING ISSUES');

    const totalLectures = selectedCategory.lectures.length;
    const validLectures = selectedCategory.lectures.filter(l => l && l.title).length;
    const lecturesWithContent = selectedCategory.lectures.filter(l => l && l.contentId).length;

    console.log('   📊 Lecture Statistics:');
    console.log(`      Total lectures in data: ${totalLectures}`);
    console.log(`      Valid lectures (with titles): ${validLectures}`);
    console.log(`      Lectures with content: ${lecturesWithContent}`);

    if (validLectures === 0) {
      console.log('   ❌ ISSUE: No lectures pass the frontend validation');
    } else if (lecturesWithContent === 0) {
      console.log('   ❌ ISSUE: No lectures have contentId - this could prevent clicks');
    } else {
      console.log('   ✅ All lectures should render and be clickable');
    }
    console.log();

    // Step 7: Specific debugging for your component
    console.log('5️⃣ 🎯 COURSEDETAIL.JS SPECIFIC CHECKS');

    console.log('   📋 Component State Simulation:');
    console.log(`      course: ${!!courseData} (object exists)`);
    console.log(`      course.title: "${courseData.title}"`);
    console.log(`      selectedCategory: "${selectedCategory?.name}"`);
    console.log(`      totaleCategories: ${courseData.categories?.length || 0} (should be >= 1)`);
    console.log(`      totalLectures: ${courseData.totalLectures} (should be >= 1)`);
    console.log(`      loading: false`);
    console.log(`      error: null`);

    const wouldRenderLectures = courseData.categories?.length > 0 && selectedCategory.lectures?.length > 0;
    console.log(`   🖥️  Would render lecture grid: ${wouldRenderLectures}`);

    if (wouldRenderLectures) {
      console.log('   ✅ Frontend should display lecture cards');
    } else {
      console.log('   ❌ Frontend would show empty state');
    }
    console.log();

    console.log('💡 DEBUGGING RECOMMENDATIONS FOR FRONTEND:');
    console.log('   1. Open browser DevTools (F12)');
    console.log('   2. Navigate to Network tab');
    console.log('   3. Load /course/c-programing');
    console.log('   4. Check if /api/courses/c-programing returns correct data');
    console.log('   5. Look in Console tab for the debug logs from CourseDetail.js');

  } catch (error) {
    console.error('💥 DEBUG PROCESS FAILED');
    console.error('   Error:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Response:', error.response.data);
    }
    console.error();

    console.error('🔧 TROUBLESHOOTING:');
    console.log('   1. Ensure server is running on port 5002');
    console.log('   2. Check database connectivity');
    console.log('   3. Verify user credentials are correct');
    console.log('   4. Test login manually in web interface');

  }
}

// Run the debug process
debugFrontendIssue().catch(console.error);