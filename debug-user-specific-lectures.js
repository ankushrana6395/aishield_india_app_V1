const axios = require('axios');

// Configure API base URL
const API_BASE = process.env.API_BASE || 'http://localhost:5002/api';
axios.defaults.baseURL = API_BASE;

// User credentials from the user
const USER_CREDENTIALS = {
  email: 'ankush980@gmail.com',
  password: 'Abcd@12345'
};

// Global variables for tokens
let userToken = null;
let adminToken = null;

async function authenticateUser() {
  try {
    console.log('🔐 AUTHENTICATING USER:', USER_CREDENTIALS.email);
    console.log('');

    const response = await axios.post('/auth/login', USER_CREDENTIALS);
    userToken = response.data.token;

    console.log('✅ USER AUTHENTICATION SUCCESSFUL');
    console.log('   Token received:', userToken ? 'YES' : 'NO');
    console.log('   User ID:', response.data.user?._id);
    console.log('   Name:', response.data.user?.name);
    console.log('   Role:', response.data.user?.role);
    console.log('   isSubscribed:', response.data.user?.isSubscribed);
    console.log('');

    return response.data;
  } catch (error) {
    console.error('❌ USER AUTHENTICATION FAILED');
    console.error('   Error:', error.response?.data?.message || error.message);
    throw error;
  }
}

async function getAdminToken() {
  // Try to get admin token if available (you'll need to provide this)
  try {
    // This will need to be manually added
    adminToken = 'YOUR_ADMIN_TOKEN_HERE'; // Replace with actual admin token
    console.log('🔑 ADMIN TOKEN SET:', adminToken ? 'YES' : 'NO');
  } catch (error) {
    console.log('⚠️  No admin token provided - some debugging features will be limited');
  }
}

async function fetchCourseData() {
  try {
    console.log('📚 FETCHING COURSE DATA FOR:', USER_CREDENTIALS.email);
    console.log('');

    const headers = userToken ? { 'Authorization': `Bearer ${userToken}` } : {};
    const response = await axios.get('/courses/c-programing', { headers });

    console.log('✅ COURSE FETCH SUCCESSFUL');
    const course = response.data.course;

    console.log('📊 COURSE INFORMATION:');
    console.log(`   Title: ${course.title}`);
    console.log(`   Slug: ${course.slug}`);
    console.log(`   Published: ${course.published}`);
    console.log(`   Total Lectures (calculated): ${course.totalLectures}`);
    console.log(`   Total Duration: ${course.totalDuration} minutes`);
    console.log('');

    console.log('🔐 ACCESS INFORMATION:');
    console.log(`   isSubscribed: ${course.access?.isSubscribed}`);
    console.log(`   canEnroll: ${course.access?.canEnroll}`);
    console.log(`   accessLevel: ${course.access?.accessLevel}`);
    console.log('');

    console.log('📂 CATEGORIES AND LECTURES:');
    console.log(`   Total Categories: ${course.categories?.length || 0}`);
    console.log('');

    if (course.categories && course.categories.length > 0) {
      course.categories.forEach((category, catIndex) => {
        console.log(`   📁 Category ${catIndex + 1}: "${category.name}"`);
        console.log(`      ID: ${category._id}`);
        console.log(`      Lectures: ${category.lectures?.length || 0}`);

        if (category.lectures && category.lectures.length > 0) {
          category.lectures.forEach((lecture, lecIndex) => {
            console.log(`         📄 Lecture ${lecIndex + 1}: "${lecture.title}"`);
            console.log(`            ID: ${lecture._id}`);
            console.log(`            Order: ${lecture.order || 'N/A'}`);
            console.log(`            Content ID: ${lecture.contentId ? lecture.contentId.filename : '❌ MISSING'}`);
            console.log(`            isRequired: ${lecture.isRequired}`);
            console.log(`            Duration: ${lecture.duration || 'N/A'} min`);

            if (lecture.contentId) {
              console.log(`            Content Filename: ${lecture.contentId.filename}`);
              console.log(`            Content Status: ✅ LINKED`);
            } else {
              console.log(`            ❌ CONTENT NOT LINKED - This is the root cause!`);
            }
            console.log('');
          });
        } else {
          console.log('         ⚠️  No lectures in this category');
          console.log('');
        }
      });
    } else {
      console.log('   ⚠️  No categories found in this course!');
    }

    return course;
  } catch (error) {
    console.error('❌ COURSE FETCH FAILED');
    console.error('   Status:', error.response?.status);
    console.error('   Message:', error.response?.data?.message || error.message);
    throw error;
  }
}

async function checkDatabaseState() {
  try {
    console.log('🗄️  CHECKING DATABASE STATE (requires admin access)');
    console.log('');

    if (!adminToken || adminToken === 'YOUR_ADMIN_TOKEN_HERE') {
      console.log('⚠️  Admin token not provided - skipping database state check');
      return;
    }

    const adminHeaders = { 'Authorization': `Bearer ${adminToken}` };

    // Check if we can access admin endpoints
    try {
      const usersResponse = await axios.get('/admin/users', { headers: adminHeaders });
      const users = usersResponse.data;

      // Find our test user
      const testUser = users.find(u => u.email === USER_CREDENTIALS.email);
      if (testUser) {
        console.log('👤 USER PROFILE FROM DATABASE:');
        console.log(`   Name: ${testUser.name}`);
        console.log(`   Email: ${testUser.email}`);
        console.log(`   isSubscribed: ${testUser.isSubscribed}`);
        console.log(`   Role: ${testUser.role}`);

        if (testUser.subscription) {
          console.log('   Subscription:', testUser.subscription);
        } else {
          console.log('   Subscription: None');
        }
        console.log('');
      } else {
        console.log('⚠️  Test user not found in database');
      }
    } catch (error) {
      console.log('⚠️  Could not access admin users endpoint:', error.message);
    }

    // Check course from admin perspective
    try {
      console.log('📚 ADMIN VIEW OF COURSE:');
      const adminCourseResponse = await axios.get('/admin/courses/c-programing', { headers: adminHeaders });
      const adminCourse = adminCourseResponse.data.course;

      console.log(`   Categories: ${adminCourse.categories?.length || 0}`);
      console.log(`   Total Lectures (server): ${adminCourse.totalLectures || 0}`);

      if (adminCourse.categories && adminCourse.categories.length > 0) {
        adminCourse.categories.forEach((category, catIndex) => {
          console.log(`   Category ${catIndex + 1} "${category.name}": ${category.lectures?.length || 0} lectures`);
          if (category.lectures && category.lectures.length > 0) {
            category.lectures.forEach((lecture) => {
              console.log(`      "${lecture.title}": ${lecture.contentId ? '✅ Linked' : '❌ Not linked'}`);
            });
          }
        });
      }
      console.log('');
    } catch (error) {
      console.log('⚠️  Could not access admin course endpoint:', error.message);
    }

  } catch (error) {
    console.log('⚠️  Database state check failed:', error.message);
  }
}

async function diagnoseLectureLinkingIssue(courseData) {
  console.log('🔍 DIAGNOSING LECTURE LINKING ISSUES');
  console.log('=' .repeat(50));
  console.log('');

  let issues = [];
  let totalLectures = 0;
  let linkedLectures = 0;
  let unlinkedLectures = 0;

  if (courseData.categories && courseData.categories.length > 0) {
    courseData.categories.forEach((category) => {
      if (category.lectures && category.lectures.length > 0) {
        category.lectures.forEach((lecture) => {
          totalLectures++;
          if (lecture.contentId) {
            linkedLectures++;
          } else {
            unlinkedLectures++;
            console.log(`❌ UNLINKED LECTURE: "${lecture.title}" (Category: ${category.name})`);
          }
        });
      }
    });
  }

  console.log('');
  console.log('📊 LECTURE LINKING STATISTICS:');
  console.log(`   Total Lectures: ${totalLectures}`);
  console.log(`   Linked Lectures: ${linkedLectures}`);
  console.log(`   Unlinked Lectures: ${unlinkedLectures}`);
  console.log(`   Linking Rate: ${totalLectures > 0 ? ((linkedLectures / totalLectures) * 100).toFixed(1) : 0}%`);
  console.log('');

  // Diagnostic checks
  console.log('🔧 POTENTIAL ROOT CAUSES:');
  console.log('');

  if (unlinkedLectures > 0) {
    console.log('1️⃣  Content Upload Issues:');
    console.log('   - Lectures may have been uploaded without proper file categorization');
    console.log('   - Auto-sync system might have failed during upload');
    console.log('   - Content files may not exist in the database');
    console.log('');

    console.log('2️⃣  Auto-Sync System Issues:');
    console.log('   - The auto-sync-lectures.js script may not be working properly');
    console.log('   - FileCategory entries might not match lecture structure');
    console.log('   - Database inconsistencies between Content and Lectures collections');
    console.log('');

    console.log('3️⃣  Database State Issues:');
    console.log('   - FileCategory records may be missing or corrupted');
    console.log('   - Lecture records may not have contentId fields populated');
    console.log('   - Reference integrity issues in MongoDB');
    console.log('');

    console.log('4️⃣  Race Conditions:');
    console.log('   - Content might be uploaded after lectures are queried');
    console.log('   - Database synchronization delays');
    console.log('');
  } else {
    console.log('✅ All lectures appear to be properly linked!');
    console.log('');
  }

  return {
    totalLectures,
    linkedLectures,
    unlinkedLectures,
    issues
  };
}

async function runDiagnostics() {
  try {
    console.log('🚀 STARTING LECTURE LINKING DIAGNOSIS');
    console.log('=' .repeat(60));
    console.log();

    // Step 1: Authenticate user
    await authenticateUser();

    // Step 2: Get admin access (optional)
    await getAdminToken();

    // Step 3: Fetch course data from user perspective
    const courseData = await fetchCourseData();

    // Step 4: Check database state
    await checkDatabaseState();

    // Step 5: Diagnose issues
    const diagnostics = await diagnoseLectureLinkingIssue(courseData);

    // Step 6: Provide recommendations
    console.log('💡 RECOMMENDED FIXES:');
    console.log('=' .repeat(30));
    console.log();

    if (diagnostics.unlinkedLectures > 0) {
      console.log('1. Run the auto-sync script:');
      console.log('   node auto-sync-lectures.js');
      console.log();

      console.log('2. Check content upload process:');
      console.log('   node test-lecture-linking.js');
      console.log();

      console.log('3. Verify database consistency:');
      console.log('   node database-lecture-comparison.js');
      console.log();

      console.log('4. Manual linking if needed (admin only):');
      console.log('   - Check Admin Dashboard -> Lecture Management');
      console.log('   - Ensure lectures are properly associated with content files');
      console.log();
    } else {
      console.log('✅ No issues detected! Lectures are properly linked.');
      console.log();
    }

  } catch (error) {
    console.error('💥 DIAGNOSTIC PROCESS FAILED');
    console.error('Error:', error.message);
    console.error('');
    console.error('Troubleshooting steps:');
    console.log('1. Ensure the server is running on port 5002');
    console.log('2. Check database connectivity');
    console.log('3. Verify the course "c-programing" exists and is published');
    console.log('4. Test login credentials manually in the web interface');
  }
}

// Run the diagnostic
if (require.main === module) {
  runDiagnostics().catch(console.error);
}

module.exports = { runDiagnostics, authenticateUser, fetchCourseData, diagnoseLectureLinkingIssue };