/**
 * Test Course API to verify lecture linking
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

async function testCourseAPI() {
    console.log('🧪 TESTING COURSE API FOR LECTURE LINKING');
    console.log('========================================');
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

        // Step 2: Find WebApp Pentesting course
        console.log('2️⃣ FETCHING WEBAPP PENTESTING COURSE...');

        const course = await Course.findOne({ slug: 'webapp-pentesting' })
            .populate('categories')
            .lean();

        if (!course) {
            console.log('❌ WebApp Pentesting course not found');
            return;
        }

        console.log(`✅ Found course: "${course.title}"`);
        console.log(`   Course ID: ${course._id}`);
        console.log(`   Categories: ${course.categories?.length || 0}`);

        if (course.categories) {
            course.categories.forEach((cat, index) => {
                console.log(`     ${index + 1}. "${cat?.name || 'undefined'}" (${cat?.slug || 'undefined'})`);
                console.log(`        Category ID: ${cat?._id}`);
            });
        }
        console.log('');

        // Step 3: Find all lectures for this course
        console.log('3️⃣ FINDING LECTURES FOR THIS COURSE...');

        // Method 1: Lectures directly linked to course
        const directLectures = await Lecture.find({ course: course._id })
            .select('title slug category contentId course')
            .sort({ createdAt: -1 })
            .lean();

        console.log(`Direct lectures linked to course: ${directLectures.length}`);
        if (directLectures.length > 0) {
            directLectures.forEach((lecture, index) => {
                const hasContentId = lecture.contentId ? '✅ Has content' : '❌ No content';
                console.log(`   ${index + 1}. "${lecture.title}" - ${hasContentId}`);
            });
        }
        console.log('');

        // Method 2: Lectures linked to course categories
        console.log('4️⃣ FINDING LECTURES BY COURSE CATEGORIES...');

        if (course.categories && course.categories.length > 0) {
            const categoryIds = course.categories.map(cat => cat._id).filter(id => id);

            for (const cat of course.categories) {
                if (!cat || !cat._id) {
                    console.log(`   ⚠️  Skipping invalid category: ${JSON.stringify(cat)}`);
                    continue;
                }

                console.log(`\n📂 Category: "${cat.name || 'undefined'}"`);

                const categoryLectures = await Lecture.find({
                    category: cat._id
                })
                .select('title slug category contentId course')
                .sort({ createdAt: -1 })
                .lean();

                console.log(`   Lectures found: ${categoryLectures.length}`);

                if (categoryLectures.length > 0) {
                    categoryLectures.forEach((lecture, index) => {
                        const hasContentId = lecture.contentId ? '✅ Has content' : '❌ No content';
                        const linkedToCourse = lecture.course ? '✅ Course linked' : '❌ Not linked';
                        console.log(`     ${index + 1}. "${lecture.title}" - ${hasContentId}, ${linkedToCourse}`);
                    });
                }
            }
        }

        // Method 3: Combined search (like the course API does)
        console.log('\n5️⃣ COMBINED SEARCH (LIKE COURSE API)...');

        const categoryIds = course.categories?.map(cat => cat._id).filter(id => id) || [];

        const combinedLectures = await Lecture.find({
            $or: [
                { course: course._id },
                { category: { $in: categoryIds } }
            ]
        })
        .select('title slug category contentId course')
        .sort({ createdAt: -1 })
        .populate('category', 'name slug')
        .lean();

        console.log(`✅ Combined lectures found: ${combinedLectures.length}`);
        console.log('');

        if (combinedLectures.length > 0) {
            console.log('📋 LECTURES AVAILABLE FOR WEBAPP PENTESTING COURSE:');
            console.log('─'.repeat(60));

            combinedLectures.forEach((lecture, index) => {
                const hasContentId = lecture.contentId ? '✅ Has content' : '❌ No content';
                const linkedToCourse = lecture.course ? '✅ Course linked' : '❌ Category only';
                const categoryName = lecture.category?.name || 'No category';

                console.log(`${index + 1}. "${lecture.title}"`);
                console.log(`   Category: ${categoryName}`);
                console.log(`   Content: ${hasContentId}`);
                console.log(`   Link Type: ${linkedToCourse}`);
                console.log('');
            });

            // Check specifically for "Command Injection" lecture
            const commandInjection = combinedLectures.find(l =>
                l.title.toLowerCase().includes('command injection')
            );

            if (commandInjection) {
                console.log('🎯 COMMAND INJECTION LECTURE FOUND:');
                console.log(`   Title: "${commandInjection.title}"`);
                console.log(`   Has Content ID: ${commandInjection.contentId ? '✅ YES' : '❌ NO'}`);
                console.log(`   Content ID: ${commandInjection.contentId || 'None'}`);
            } else {
                console.log('❌ Command Injection lecture not found in available lectures');
            }
        } else {
            console.log('❌ No lectures found for this course');
        }

        // Step 6: Summary
        console.log('\n✨ SUMMARY:');
        console.log('─'.repeat(60));
        console.log(`Course: "${course.title}"`);
        console.log(`Categories: ${course.categories?.length || 0}`);
        console.log(`Direct Lectures: ${directLectures.length}`);
        console.log(`Category Lectures: ${combinedLectures.length - directLectures.length}`);
        console.log(`Total Lectures: ${combinedLectures.length}`);

        if (combinedLectures.length > 0) {
            console.log('✅ SUCCESS: Course should now display lectures in frontend!');
        } else {
            console.log('❌ ISSUE: No lectures found for this course');
        }

    } catch (error) {
        console.error('\n❌ TESTING FAILED');
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

// Run the test
if (require.main === module) {
    console.log('🚀 Starting course API test...');
    testCourseAPI().then(() => {
        console.log('\n🏁 Course API test completed');
        process.exit(0);
    }).catch((error) => {
        console.error('\n💥 Course API test failed with error:', error.message);
        process.exit(1);
    });
}

module.exports = { testCourseAPI };