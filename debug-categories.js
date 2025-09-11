/**
 * Debug Category Mappings
 * Check how categories are linked to courses
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

async function debugCategories() {
    console.log('🔍 DEBUGGING CATEGORY MAPPINGS');
    console.log('==============================');
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

        // Step 2: Get all courses with populated categories
        console.log('2️⃣ FETCHING COURSES WITH CATEGORIES...');

        const courses = await Course.find({}).populate('categories').lean();
        console.log(`   📊 Found ${courses.length} courses`);

        console.log('\n📚 COURSES AND THEIR CATEGORIES:');
        console.log('─'.repeat(60));

        courses.forEach((course, index) => {
            console.log(`${index + 1}. "${course.title}"`);
            console.log(`   Course ID: ${course._id}`);
            console.log(`   Slug: ${course.slug}`);
            console.log(`   Categories: ${course.categories?.length || 0}`);

            if (course.categories && course.categories.length > 0) {
                course.categories.forEach((cat, catIndex) => {
                    console.log(`     ${catIndex + 1}. "${cat.name}" (ID: ${cat._id}, Slug: ${cat.slug})`);
                });
            } else {
                console.log('     ❌ No categories assigned to this course');
            }
            console.log('');
        });

        // Step 3: Get all categories
        console.log('3️⃣ FETCHING ALL CATEGORIES...');

        const allCategories = await Category.find({}).sort({ name: 1 }).lean();
        console.log(`   📊 Found ${allCategories.length} categories`);

        console.log('\n📂 ALL CATEGORIES IN DATABASE:');
        console.log('─'.repeat(60));

        allCategories.forEach((cat, index) => {
            console.log(`${index + 1}. "${cat.name}"`);
            console.log(`   Category ID: ${cat._id}`);
            console.log(`   Slug: ${cat.slug}`);
            console.log(`   Created: ${cat.createdAt ? cat.createdAt.toLocaleDateString() : 'N/A'}`);
            console.log('');
        });

        // Step 4: Analyze WebApp Pentesting course specifically
        console.log('4️⃣ ANALYZING WEBAPP PENTESTING COURSE...');
        console.log('─'.repeat(60));

        const webappCourse = courses.find(c => c.slug === 'webapp-pentesting');
        if (!webappCourse) {
            console.log('❌ WebApp Pentesting course not found');
        } else {
            console.log(`✅ Found WebApp Pentesting course: ${webappCourse._id}`);
            console.log(`   Title: "${webappCourse.title}"`);
            console.log(`   Categories: ${webappCourse.categories?.length || 0}`);

            if (webappCourse.categories && webappCourse.categories.length > 0) {
                webappCourse.categories.forEach((cat, index) => {
                    console.log(`   Category ${index + 1}: "${cat.name}" (${cat.slug})`);
                });
            }
        }

        // Step 5: Check which categories have lectures
        console.log('\n5️⃣ CATEGORIES WITH LECTURES:');
        console.log('─'.repeat(60));

        for (const category of allCategories) {
            const lectureCount = await Lecture.countDocuments({ category: category._id });
            if (lectureCount > 0) {
                console.log(`"${category.name}" (${category.slug}): ${lectureCount} lectures`);

                // Show lecture details
                const lectures = await Lecture.find({ category: category._id })
                    .select('title slug course contentId')
                    .sort({ createdAt: -1 })
                    .limit(3)
                    .lean();

                lectures.forEach((lecture, index) => {
                    const courseLinked = lecture.course ? '✅ Linked' : '❌ Not linked';
                    const hasContentId = lecture.contentId ? '✅ Has content' : '❌ No content';
                    console.log(`   ${index + 1}. "${lecture.title}" - ${courseLinked}, ${hasContentId}`);
                });
            }
        }

        // Step 6: Category matching analysis
        console.log('\n6️⃣ CATEGORY MATCHING ANALYSIS:');
        console.log('─'.repeat(60));

        // Find WebPentesting category
        const webPentestingCategory = allCategories.find(c => c.slug === 'webpentesting');
        console.log('WebPentesting category exists:', !!webPentestingCategory);

        if (webPentestingCategory) {
            console.log(`   Category ID: ${webPentestingCategory._id}`);
            console.log(`   Category Name: "${webPentestingCategory.name}"`);
            console.log(`   Category Slug: "${webPentestingCategory.slug}"`);
        }

        // Check if WebApp Pentesting course has this category
        if (webappCourse && webPentestingCategory) {
            const hasWebPentesting = webappCourse.categories?.some(cat =>
                cat._id.toString() === webPentestingCategory._id.toString()
            );

            console.log('WebApp Pentesting course has WebPentesting category:', hasWebPentesting);

            if (!hasWebPentesting) {
                console.log('❌ ISSUE FOUND: WebApp Pentesting course is missing WebPentesting category!');
                console.log('   This is why lectures are not linking to the course.');
                console.log('');
                console.log('   SOLUTION: Add WebPentesting category to WebApp Pentesting course');
            }
        }

        // Step 7: Recommendations
        console.log('\n7️⃣ RECOMMENDATIONS:');
        console.log('─'.repeat(60));

        const issues = [];

        // Check for courses without categories
        const coursesWithoutCategories = courses.filter(c => !c.categories || c.categories.length === 0);
        if (coursesWithoutCategories.length > 0) {
            issues.push(`${coursesWithoutCategories.length} courses have no categories assigned`);
        }

        // Check for categories not used in any course
        const unusedCategories = [];
        for (const category of allCategories) {
            const coursesUsingCategory = courses.filter(course =>
                course.categories?.some(cat => cat._id.toString() === category._id.toString())
            );
            if (coursesUsingCategory.length === 0) {
                unusedCategories.push(category.name);
            }
        }

        if (unusedCategories.length > 0) {
            issues.push(`${unusedCategories.length} categories are not assigned to any course: ${unusedCategories.join(', ')}`);
        }

        if (issues.length > 0) {
            console.log('❌ ISSUES FOUND:');
            issues.forEach((issue, index) => {
                console.log(`   ${index + 1}. ${issue}`);
            });
        } else {
            console.log('✅ No major category mapping issues found');
        }

    } catch (error) {
        console.error('\n❌ DEBUGGING FAILED');
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

// Run the debug check
if (require.main === module) {
    console.log('🚀 Starting category debugging...');
    debugCategories().then(() => {
        console.log('\n🏁 Category debugging completed');
        process.exit(0);
    }).catch((error) => {
        console.error('\n💥 Category debugging failed with error:', error.message);
        process.exit(1);
    });
}

module.exports = { debugCategories };