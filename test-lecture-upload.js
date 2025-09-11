/**
 * Test Script: Verify Lecture Upload to Database
 * Tests the successful upload of "command injection" lecture with all details
 */

const mongoose = require('mongoose');
const path = require('path');

// Load environment configuration
require('./config/environment');
const config = require('./config/environment');

// Import models
const Lecture = require('./models/Lecture');
const Category = require('./models/Category');
const Course = require('./models/Course');

async function testLectureUpload() {
    console.log('🔍 TESTING LECTURE UPLOAD VERIFICATION');
    console.log('========================================');
    console.log('Target Lecture: "command injection"');
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
        console.log(`   Database: ${connection.db.databaseName}`);
        console.log(`   Host: ${connection.host}`);
        console.log('');

        // Step 2: Get all lectures in database
        console.log('2️⃣ ANALYZING ALL LECTURES IN DATABASE...');

        const allLectures = await Lecture.find({})
            .populate('category', 'name slug')
            .populate('course', 'title slug')
            .sort({ createdAt: -1 });

        console.log(`   📊 Total Lectures in Database: ${allLectures.length}`);

        if (allLectures.length === 0) {
            console.log('\n❌ NO LECTURES FOUND IN DATABASE');
            console.log('   This means no lectures have been uploaded yet.');
            console.log('   Available lecture content files:');

            // List available lecture files
            const fs = require('fs');
            const path = require('path');
            const lecturesDir = path.join(__dirname, 'backup-lectures');

            try {
                const files = fs.readdirSync(lecturesDir);
                const htmlFiles = files.filter(file => file.endsWith('.html'));
                console.log(`   Found ${htmlFiles.length} lecture files in backup-lectures/`);
                htmlFiles.forEach((file, idx) => {
                    console.log(`   ${idx + 1}. ${file}`);
                });
                console.log('\n   💡 Upload lectures from admin panel to populate the database');
            } catch (error) {
                console.log('   Could not read backup-lectures directory');
            }
            return;
        }

        // Display all lectures
        console.log('\n   📚 ALL LECTURES IN DATABASE:');
        console.log('   ──────────────────────────────────────────────────────');

        allLectures.forEach((lecture, idx) => {
            console.log(`   ${idx + 1}. "${lecture.title}"`);
            console.log(`      📝 Slug: ${lecture.slug}`);
            console.log(`      📂 Category: ${lecture.category?.name || 'Not linked'}`);
            console.log(`      📖 Course: ${lecture.course?.title || 'Not linked'}`);
            console.log(`      📄 Sections: ${lecture.sections?.length || 0}`);
            console.log(`      ❓ Quiz Questions: ${lecture.quizQuestions?.length || 0}`);
            console.log(`      🕒 Created: ${lecture.createdAt ? lecture.createdAt.toLocaleString() : 'N/A'}`);
            console.log(`      🔄 Updated: ${lecture.updatedAt ? lecture.updatedAt.toLocaleString() : 'N/A'}`);
            console.log('   ──────────────────────────────────────────────────────');
        });

        // Step 3: Check for "command injection" specifically
        console.log('\n3️⃣ CHECKING FOR "COMMAND INJECTION" LECTURE...');

        const commandInjectionLecture = allLectures.find(lec =>
            lec.title.toLowerCase().includes('command injection') ||
            lec.slug.toLowerCase().includes('command-injection') ||
            lec.slug.toLowerCase().includes('commandinjection')
        );

        if (!commandInjectionLecture) {
            console.log('❌ COMMAND INJECTION LECTURE NOT FOUND');
            console.log('   The lecture "command injection" has not been uploaded yet');
            console.log('   Available lecture files that could be uploaded:');

            // Check available files
            const fs = require('fs');
            const path = require('path');
            const lecturesDir = path.join(__dirname, 'backup-lectures');
            const commandInjectionFile = path.join(lecturesDir, 'commandinjection.html');

            try {
                if (fs.existsSync(commandInjectionFile)) {
                    const stats = fs.statSync(commandInjectionFile);
                    console.log(`   ✅ commandinjection.html exists (${(stats.size / 1024).toFixed(1)} KB)`);
                    console.log('   💡 Upload this lecture from your admin panel');
                } else {
                    console.log('   ❌ commandinjection.html not found');
                }
            } catch (error) {
                console.log('   Could not check commandinjection.html');
            }
            return;
        }

        // Use the found lecture for validation
        const lecture = commandInjectionLecture;

        console.log('✅ LECTURE FOUND');
        console.log(`   Title: "${lecture.title}"`);
        console.log(`   Slug: "${lecture.slug}"`);
        console.log(`   ID: ${lecture._id}`);
        console.log('');

        // Step 4: Validate required fields
        console.log('4️⃣ VALIDATING REQUIRED FIELDS...');

        const validationResults = [];
        let allRequiredValid = true;

        // Check required fields according to schema
        const requiredFields = [
            { field: 'title', value: lecture.title, type: 'string' },
            { field: 'subtitle', value: lecture.subtitle, type: 'string' },
            { field: 'description', value: lecture.description, type: 'string' },
            { field: 'slug', value: lecture.slug, type: 'string' },
            { field: 'category', value: lecture.category, type: 'object' }
        ];

        requiredFields.forEach(({ field, value, type }) => {
            const isValid = value && (type === 'object' ? typeof value === 'object' : typeof value === 'string' && value.trim().length > 0);
            validationResults.push({
                field,
                isValid,
                value: type === 'string' ? `"${value}"` : value ? '[OBJECT]' : 'null/undefined'
            });

            if (!isValid) {
                allRequiredValid = false;
            }
        });

        // Display validation results
        validationResults.forEach(result => {
            console.log(`   ${result.field}: ${result.isValid ? '✅' : '❌'} ${result.value}`);
        });

        if (!allRequiredValid) {
            console.log('\n❌ REQUIRED FIELDS VALIDATION FAILED');
            return;
        }

        console.log('\n✅ ALL REQUIRED FIELDS ARE VALID');
        console.log('');

        // Step 5: Check optional fields and content structure
        console.log('5️⃣ ANALYZING CONTENT STRUCTURE...');

        // Check sections
        if (lecture.sections && lecture.sections.length > 0) {
            console.log(`   Sections: ✅ ${lecture.sections.length} section(s) found`);
            lecture.sections.forEach((section, idx) => {
                console.log(`      Section ${idx + 1}: "${section.title}"`);
                if (section.content && section.content.length > 0) {
                    console.log(`         Content items: ${section.content.length}`);
                    section.content.forEach((item, itemIdx) => {
                        console.log(`            ${itemIdx + 1}. "${item.heading}"`);
                        if (item.paragraphs && item.paragraphs.length > 0) {
                            console.log(`               English paragraphs: ${item.paragraphs.length}`);
                        }
                        if (item.paragraphsHi && item.paragraphsHi.length > 0) {
                            console.log(`               Hindi paragraphs: ${item.paragraphsHi.length}`);
                        }
                        if (item.list && item.list.length > 0) {
                            console.log(`               English list items: ${item.list.length}`);
                        }
                        if (item.listHi && item.listHi.length > 0) {
                            console.log(`               Hindi list items: ${item.listHi.length}`);
                        }
                    });
                } else {
                    console.log('         ❌ No content items');
                }
            });
        } else {
            console.log('   Sections: ❌ No sections found');
        }

        // Check quiz questions
        if (lecture.quizQuestions && lecture.quizQuestions.length > 0) {
            console.log(`   Quiz Questions: ✅ ${lecture.quizQuestions.length} question(s) found`);
            lecture.quizQuestions.forEach((question, idx) => {
                console.log(`      Question ${idx + 1}: "${question.question.en}"`);
                console.log(`         Options (EN): ${question.options.en.length}, (HI): ${question.options.hi.length}`);
                console.log(`         Correct Answer: ${question.correctAnswer}`);
            });
        } else {
            console.log('   Quiz Questions: ⚠️ No quiz questions (optional)');
        }

        // Check other metadata
        console.log(`   Hinglish Support: ${lecture.isHinglish ? '✅ YES' : '❌ NO'}`);
        console.log(`   Created: ${lecture.createdAt ? lecture.createdAt.toISOString() : 'N/A'}`);
        console.log(`   Updated: ${lecture.updatedAt ? lecture.updatedAt.toISOString() : 'N/A'}`);
        console.log('');

        // Step 6: Check relationships
        console.log('6️⃣ VERIFYING RELATIONSHIPS...');

        // Check category relationship
        if (lecture.category) {
            console.log(`   Category: ✅ "${lecture.category.name}" (slug: ${lecture.category.slug})`);
        } else {
            console.log('   Category: ❌ Not populated');
        }

        // Check course relationship (optional)
        if (lecture.course) {
            console.log(`   Course: ✅ "${lecture.course.title}" (slug: ${lecture.course.slug})`);
        } else {
            console.log('   Course: ⚠️ Not linked to any course (optional)');
        }
        console.log('');

        // Step 7: Comprehensive assessment
        console.log('7️⃣ COMPREHENSIVE ASSESSMENT...');

        const assessment = {
            lectureFound: true,
            requiredFieldsValid: allRequiredValid,
            hasSections: !!(lecture.sections && lecture.sections.length > 0),
            hasContentInSections: lecture.sections?.some(section =>
                section.content && section.content.length > 0 &&
                section.content.some(item =>
                    (item.paragraphs && item.paragraphs.length > 0) ||
                    (item.list && item.list.length > 0)
                )
            ) || false,
            hasQuizQuestions: !!(lecture.quizQuestions && lecture.quizQuestions.length > 0),
            categoryLinked: !!lecture.category,
            courseLinked: !!lecture.course,
            timestampsValid: !!(lecture.createdAt && lecture.updatedAt)
        };

        console.log('   ASSESSMENT RESULTS:');
        Object.entries(assessment).forEach(([key, value]) => {
            const displayKey = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
            console.log(`      ${displayKey}: ${value ? '✅' : '❌'}`);
        });

        const overallSuccess = Object.values(assessment).every(v => v === true);

        console.log('\n   OVERALL RESULT:', overallSuccess ? '✅ SUCCESS' : '⚠️ PARTIAL SUCCESS');

        // Step 8: Detailed summary
        console.log('\n8️⃣ DETAILED SUMMARY');

        console.log(`   📚 Lecture: "${lecture.title}"`);
        console.log(`   🔗 Slug: "${lecture.slug}"`);
        console.log(`   📁 Category: ${lecture.category?.name || 'Not linked'}`);
        console.log(`   📖 Course: ${lecture.course?.title || 'Not linked'}`);
        console.log(`   📝 Sections: ${lecture.sections?.length || 0}`);
        console.log(`   ❓ Quiz Questions: ${lecture.quizQuestions?.length || 0}`);
        console.log(`   🕒 Created: ${lecture.createdAt ? lecture.createdAt.toLocaleString() : 'N/A'}`);
        console.log(`   🔄 Updated: ${lecture.updatedAt ? lecture.updatedAt.toLocaleString() : 'N/A'}`);

        // Step 9: Recommendations
        console.log('\n9️⃣ RECOMMENDATIONS');

        if (overallSuccess) {
            console.log('   ✅ Lecture upload appears to be fully successful!');
            console.log('   🎉 The "command injection" lecture is properly stored in the database');
            console.log('   📖 All required fields are present and properly formatted');
            console.log('   🔗 Relationships are correctly established');
            console.log('   📚 Content structure is valid');
        } else {
            console.log('   ⚠️ Some issues were detected:');

            if (!assessment.hasSections) {
                console.log('   📝 Add lecture sections with content');
            }
            if (!assessment.hasContentInSections) {
                console.log('   📄 Add content (paragraphs/lists) to sections');
            }
            if (!assessment.hasQuizQuestions) {
                console.log('   ❓ Consider adding quiz questions for better learning');
            }
            if (!assessment.categoryLinked) {
                console.log('   📁 Link lecture to a category');
            }
            if (!assessment.courseLinked) {
                console.log('   📚 Link lecture to a course (optional)');
            }
        }

        // Final success message
        if (overallSuccess) {
            console.log('\n🎉 LECTURE UPLOAD VERIFICATION: SUCCESS');
            console.log('The "command injection" lecture has been successfully uploaded to the database with all required details.');
        } else {
            console.log('\n⚠️ LECTURE UPLOAD VERIFICATION: PARTIAL SUCCESS');
            console.log('The lecture exists but may need additional content or relationships.');
        }

    } catch (error) {
        console.error('\n❌ TEST FAILED');
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
    testLectureUpload().then(() => {
        console.log('\n🏁 Test completed');
        process.exit(0);
    }).catch((error) => {
        console.error('\n💥 Test failed with error:', error.message);
        process.exit(1);
    });
}

module.exports = { testLectureUpload };