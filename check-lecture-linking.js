/**
 * Check Lecture Linking Status
 * Verifies how lectures are linked to courses and categories
 */

const mongoose = require('mongoose');
const path = require('path');

// Load environment configuration
require('./config/environment');
const config = require('./config/environment');

// Import models
const Lecture = require('./models/Lecture');
const Course = require('./models/Course');
const Category = require('./models/Category');

async function checkLectureLinking() {
    console.log('🔗 CHECKING LECTURE LINKING STATUS');
    console.log('==================================');
    console.log('Database:', config.MONGODB_URI);
    console.log('');

    let connection = null;

    try {
        // Step 1: Connect to database
        console.log('1️⃣ CONNECTING TO DATABASE...');

        await mongoose.connect(config.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            maxPoolSize: 10,
            serverSelectionTimeoutMS: 5000
        });

        connection = mongoose.connection;
        console.log('✅ Database connected successfully');
        console.log('');

        // Step 2: Get all courses
        console.log('2️⃣ FETCHING ALL COURSES...');

        const courses = await Course.find({}).populate('categories').lean();
        console.log(`   📊 Found ${courses.length} courses:`);

        courses.forEach((course, index) => {
            console.log(`   ${index + 1}. "${course.title}" (${course.slug})`);
            console.log(`      Categories: ${course.categories?.length || 0}`);
            course.categories?.forEach((cat, catIndex) => {
                console.log(`         ${catIndex + 1}. ${cat.name} (${cat._id})`);
            });
            console.log('');
        });

        // Step 3: Get all lectures
        console.log('3️⃣ FETCHING ALL LECTURES...');

        const lectures = await Lecture.find({})
            .populate('category', 'name slug')
            .populate('course', 'title slug')
            .sort({ createdAt: -1 })
            .lean();

        console.log(`   📊 Found ${lectures.length} lectures:`);

        lectures.forEach((lecture, index) => {
            console.log(`   ${index + 1}. "${lecture.title}" (${lecture.slug})`);
            console.log(`      Content ID: ${lecture.contentId || 'MISSING'}`);
            console.log(`      Category: ${lecture.category?.name || 'NOT LINKED'} (${lecture.category?._id || 'N/A'})`);
            console.log(`      Course: ${lecture.course?.title || 'NOT LINKED'} (${lecture.course?._id || 'N/A'})`);
            console.log('');
        });

        // Step 4: Analyze linking issues
        console.log('4️⃣ ANALYZING LINKING ISSUES...');

        let linkedLectures = 0;
        let unlinkedLectures = 0;
        let missingContentId = 0;
        let courseLinking = {};

        lectures.forEach(lecture => {
            if (lecture.course && lecture.category) {
                linkedLectures++;
            } else {
                unlinkedLectures++;
            }

            if (!lecture.contentId) {
                missingContentId++;
            }

            // Track course linking
            const courseId = lecture.course?._id?.toString() || 'unlinked';
            if (!courseLinking[courseId]) {
                courseLinking[courseId] = {
                    courseName: lecture.course?.title || 'Unlinked',
                    lectures: 0
                };
            }
            courseLinking[courseId].lectures++;
        });

        console.log(`   ✅ Fully linked lectures: ${linkedLectures}`);
        console.log(`   ❌ Partially linked lectures: ${unlinkedLectures}`);
        console.log(`   📄 Missing contentId: ${missingContentId}`);
        console.log('');

        console.log('   📈 COURSE LINKING BREAKDOWN:');
        Object.entries(courseLinking).forEach(([courseId, data]) => {
            console.log(`      ${data.courseName}: ${data.lectures} lectures`);
        });
        console.log('');

        // Step 5: Check if WebApp Pentesting course has lectures
        console.log('5️⃣ CHECKING WEBAPP PENTESTING COURSE...');

        const webappCourse = courses.find(c => c.slug === 'webapp-pentesting');
        if (!webappCourse) {
            console.log('   ❌ WebApp Pentesting course not found');
        } else {
            console.log(`   ✅ Found WebApp Pentesting course: ${webappCourse._id}`);
            console.log(`   📂 Categories: ${webappCourse.categories?.length || 0}`);

            // Check if our lectures are linked to this course
            const linkedToWebapp = lectures.filter(l => l.course?._id?.toString() === webappCourse._id.toString());
            console.log(`   📖 Lectures linked to this course: ${linkedToWebapp.length}`);

            if (linkedToWebapp.length > 0) {
                console.log('   🎯 Linked lectures:');
                linkedToWebapp.forEach(lecture => {
                    console.log(`      - "${lecture.title}" (${lecture.contentId})`);
                });
            } else {
                console.log('   ⚠️ No lectures linked to WebApp Pentesting course');
            }
        }

        // Step 6: Recommendations
        console.log('\n6️⃣ RECOMMENDATIONS');

        if (unlinkedLectures > 0) {
            console.log('   🔗 ISSUE: Some lectures are not properly linked');
            console.log('   💡 SOLUTION: Run a script to link lectures to appropriate courses');
        }

        if (missingContentId > 0) {
            console.log('   📄 ISSUE: Some lectures missing contentId');
            console.log('   💡 SOLUTION: Ensure all lectures have valid contentId pointing to HTML files');
        }

        if (linkedLectures === lectures.length && missingContentId === 0) {
            console.log('   ✅ SUCCESS: All lectures are properly linked and have content!');
        } else {
            console.log('   ⚠️ PARTIAL SUCCESS: Some linking issues need to be resolved');
        }

    } catch (error) {
        console.error('\n❌ LINKING CHECK FAILED');
        console.error('Error details:', error.message);
        if (error.stack) {
            console.error('Stack trace:', error.stack);
        }
    } finally {
        // Close database connection
        if (connection) {
            await mongoose.connection.close();
            console.log('\n🔌 Database connection closed');
        }
    }
}

// Handle promise rejections
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    process.exit(1);
});

// Run the check
if (require.main === module) {
    console.log('🚀 Starting lecture linking check...');
    checkLectureLinking().then(() => {
        console.log('\n🏁 Lecture linking check completed');
        process.exit(0);
    }).catch((error) => {
        console.error('\n💥 Lecture linking check failed with error:', error.message);
        process.exit(1);
    });
}

module.exports = { checkLectureLinking };