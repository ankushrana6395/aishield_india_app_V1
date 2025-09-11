/**
 * Fix Lecture Linking Issues
 * Links lectures to courses and sets proper contentId values
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
const FileCategory = require('./models/FileCategory');

async function fixLectureLinking() {
    console.log('🔧 FIXING LECTURE LINKING ISSUES');
    console.log('================================');
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

        // Step 2: Get all courses with their categories
        console.log('2️⃣ FETCHING COURSES WITH CATEGORIES...');

        const courses = await Course.find({}).populate('categories').lean();
        console.log(`   📊 Found ${courses.length} courses`);

        // Create a map of category -> course for easy lookup
        const categoryToCourseMap = {};
        courses.forEach(course => {
            course.categories?.forEach(category => {
                categoryToCourseMap[category._id.toString()] = {
                    courseId: course._id,
                    courseName: course.title,
                    courseSlug: course.slug
                };
            });
        });

        console.log(`   📋 Category to course mappings: ${Object.keys(categoryToCourseMap).length}`);
        console.log('');

        // Step 3: Get all lectures that need fixing
        console.log('3️⃣ FETCHING LECTURES THAT NEED FIXING...');

        const lectures = await Lecture.find({})
            .populate('category', 'name slug')
            .sort({ createdAt: -1 });

        console.log(`   📊 Found ${lectures.length} lectures to check`);

        let fixedContentId = 0;
        let fixedCourseLinking = 0;
        let alreadyFixed = 0;

        // Step 4: Fix each lecture
        for (const lecture of lectures) {
            console.log(`\n🎯 PROCESSING: "${lecture.title}"`);
            console.log('─'.repeat(50));

            let needsUpdate = false;
            const updateData = {};

            // Fix 1: Set contentId if missing
            if (!lecture.contentId) {
                // Try to find corresponding FileCategory entry
                const fileCategory = await FileCategory.findOne({
                    filename: lecture.slug + '.html'
                });

                if (fileCategory) {
                    updateData.contentId = fileCategory.filename;
                    console.log(`   ✅ Found FileCategory: ${fileCategory.filename}`);
                    fixedContentId++;
                    needsUpdate = true;
                } else {
                    // Fallback: create contentId from slug
                    updateData.contentId = lecture.slug + '.html';
                    console.log(`   ⚠️ No FileCategory found, using fallback: ${updateData.contentId}`);
                    fixedContentId++;
                    needsUpdate = true;
                }
            } else {
                console.log(`   ✅ ContentId already set: ${lecture.contentId}`);
            }

            // Fix 2: Link to course if not linked
            if (!lecture.course && lecture.category) {
                const categoryMapping = categoryToCourseMap[lecture.category._id.toString()];

                if (categoryMapping) {
                    updateData.course = categoryMapping.courseId;
                    console.log(`   ✅ Linked to course: ${categoryMapping.courseName}`);
                    fixedCourseLinking++;
                    needsUpdate = true;
                } else {
                    console.log(`   ⚠️ No course mapping found for category: ${lecture.category.name}`);
                }
            } else if (lecture.course) {
                console.log(`   ✅ Already linked to course`);
            } else {
                console.log(`   ⚠️ No category to link from`);
            }

            // Update the lecture if needed
            if (needsUpdate) {
                await Lecture.updateOne(
                    { _id: lecture._id },
                    { $set: updateData }
                );
                console.log(`   🔄 Lecture updated successfully`);
            } else {
                console.log(`   ℹ️ No updates needed`);
                alreadyFixed++;
            }

            console.log(`   Final state:`);
            console.log(`      ContentId: ${updateData.contentId || lecture.contentId}`);
            console.log(`      Course: ${updateData.course || lecture.course || 'Not linked'}`);
        }

        // Step 5: Verify fixes
        console.log('\n5️⃣ VERIFYING FIXES...');

        const updatedLectures = await Lecture.find({})
            .populate('category', 'name')
            .populate('course', 'title')
            .lean();

        let fullyLinked = 0;
        let hasContentId = 0;

        updatedLectures.forEach(lecture => {
            if (lecture.contentId) hasContentId++;
            if (lecture.category && lecture.course) fullyLinked++;
        });

        console.log(`   ✅ Lectures with contentId: ${hasContentId}/${updatedLectures.length}`);
        console.log(`   ✅ Fully linked lectures: ${fullyLinked}/${updatedLectures.length}`);

        // Step 6: Update course lecture counts
        console.log('\n6️⃣ UPDATING COURSE LECTURE COUNTS...');

        for (const course of courses) {
            const lectureCount = await Lecture.countDocuments({ course: course._id });
            if (course.totalLectures !== lectureCount) {
                await Course.updateOne(
                    { _id: course._id },
                    { totalLectures: lectureCount, updatedAt: new Date() }
                );
                console.log(`   📊 Updated ${course.title}: ${lectureCount} lectures`);
            }
        }

        // Step 7: Final summary
        console.log('\n📋 FIXING SUMMARY');
        console.log('─'.repeat(50));
        console.log(`   🔧 Fixed contentId: ${fixedContentId} lectures`);
        console.log(`   🔗 Fixed course linking: ${fixedCourseLinking} lectures`);
        console.log(`   ℹ️ Already properly configured: ${alreadyFixed} lectures`);
        console.log(`   📊 Total lectures processed: ${lectures.length}`);

        if (fixedContentId > 0 || fixedCourseLinking > 0) {
            console.log('\n🎉 SUCCESS: Lecture linking issues have been fixed!');
            console.log('Your lectures should now appear properly in the user interface.');
        } else if (alreadyFixed === lectures.length) {
            console.log('\n✅ All lectures were already properly configured.');
        }

    } catch (error) {
        console.error('\n❌ FIXING FAILED');
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

// Run the fix
if (require.main === module) {
    console.log('🚀 Starting lecture linking fixes...');
    console.log('This will fix missing contentId and course linking issues.');
    console.log('');

    fixLectureLinking().then(() => {
        console.log('\n🏁 Lecture linking fixes completed');
        process.exit(0);
    }).catch((error) => {
        console.error('\n💥 Lecture linking fixes failed with error:', error.message);
        process.exit(1);
    });
}

module.exports = { fixLectureLinking };