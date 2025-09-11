/**
 * Database Inspection Script
 * Checks and prints all data stored in the database
 */

const mongoose = require('mongoose');
const path = require('path');

// Load environment configuration
require('./config/environment');
const config = require('./config/environment');

// Import models
const Category = require('./models/Category');
const Course = require('./models/Course');
const FileCategory = require('./models/FileCategory');
const Lecture = require('./models/Lecture');
const Payment = require('./models/Payment');
const SubscriptionPlan = require('./models/SubscriptionPlan');
const User = require('./models/User');
const UserSubscription = require('./models/UserSubscription');

async function checkDatabase() {
    console.log('🔍 DATABASE INSPECTION - COMPLETE DATA ANALYSIS');
    console.log('===============================================');
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

        // Step 2: Get all collections
        console.log('2️⃣ ANALYZING DATABASE COLLECTIONS...');

        const collections = await connection.db.listCollections().toArray();
        console.log(`   📊 Total Collections: ${collections.length}`);

        collections.forEach((col, idx) => {
            console.log(`   ${idx + 1}. ${col.name}`);
        });
        console.log('');

        // Step 3: Define models to check
        const models = [
            { name: 'Users', model: User, collection: 'users' },
            { name: 'Categories', model: Category, collection: 'categories' },
            { name: 'Courses', model: Course, collection: 'courses' },
            { name: 'Lectures', model: Lecture, collection: 'lectures' },
            { name: 'FileCategories', model: FileCategory, collection: 'filecategories' },
            { name: 'Payments', model: Payment, collection: 'payments' },
            { name: 'SubscriptionPlans', model: SubscriptionPlan, collection: 'subscriptionplans' },
            { name: 'UserSubscriptions', model: UserSubscription, collection: 'usersubscriptions' }
        ];

        // Step 4: Check each collection
        for (const { name, model, collection } of models) {
            console.log(`📋 CHECKING ${name.toUpperCase()} COLLECTION`);
            console.log('─'.repeat(50));

            try {
                // Get count
                const count = await model.countDocuments();
                console.log(`   📊 Total ${name}: ${count}`);

                if (count === 0) {
                    console.log(`   ℹ️  No ${name.toLowerCase()} found in database`);
                    console.log('');
                    continue;
                }

                // Get all documents
                const documents = await model.find({}).sort({ createdAt: -1 }).limit(20); // Limit to avoid huge output

                console.log(`   📄 Showing ${documents.length} ${name.toLowerCase()}:`);
                console.log('');

                documents.forEach((doc, idx) => {
                    console.log(`   ${idx + 1}. ${name.slice(0, -1)} Details:`);
                    console.log(`      🆔 ID: ${doc._id}`);

                    // Print relevant fields based on model type
                    if (name === 'Users') {
                        console.log(`      👤 Name: ${doc.name || 'N/A'}`);
                        console.log(`      📧 Email: ${doc.email || 'N/A'}`);
                        console.log(`      🎭 Role: ${doc.role || 'N/A'}`);
                        console.log(`      ✅ Verified: ${doc.isVerified ? 'Yes' : 'No'}`);
                        console.log(`      💰 Subscribed: ${doc.isSubscribed ? 'Yes' : 'No'}`);
                    } else if (name === 'Categories') {
                        console.log(`      📂 Name: ${doc.name || 'N/A'}`);
                        console.log(`      🔗 Slug: ${doc.slug || 'N/A'}`);
                        console.log(`      📝 Description: ${doc.description || 'N/A'}`);
                    } else if (name === 'Courses') {
                        console.log(`      📚 Title: ${doc.title || 'N/A'}`);
                        console.log(`      🔗 Slug: ${doc.slug || 'N/A'}`);
                        console.log(`      📝 Description: ${doc.description || 'N/A'}`);
                        console.log(`      ✅ Published: ${doc.published ? 'Yes' : 'No'}`);
                        console.log(`      📖 Total Lectures: ${doc.totalLectures || 0}`);
                    } else if (name === 'Lectures') {
                        console.log(`      📖 Title: ${doc.title || 'N/A'}`);
                        console.log(`      🔗 Slug: ${doc.slug || 'N/A'}`);
                        console.log(`      📝 Subtitle: ${doc.subtitle || 'N/A'}`);
                        console.log(`      📄 Sections: ${doc.sections?.length || 0}`);
                        console.log(`      ❓ Quiz Questions: ${doc.quizQuestions?.length || 0}`);
                        console.log(`      🌍 Hinglish: ${doc.isHinglish ? 'Yes' : 'No'}`);
                    } else if (name === 'FileCategories') {
                        console.log(`      📁 Category: ${doc.category || 'N/A'}`);
                        console.log(`      📄 Filename: ${doc.filename || 'N/A'}`);
                        console.log(`      📂 Path: ${doc.filePath || 'N/A'}`);
                    } else if (name === 'Payments') {
                        console.log(`      💳 Amount: ${doc.amount || 'N/A'}`);
                        console.log(`      💰 Currency: ${doc.currency || 'N/A'}`);
                        console.log(`      ✅ Status: ${doc.status || 'N/A'}`);
                        console.log(`      🔗 Order ID: ${doc.razorpayOrderId || 'N/A'}`);
                    } else if (name === 'SubscriptionPlans') {
                        console.log(`      📋 Name: ${doc.name || 'N/A'}`);
                        console.log(`      💰 Price: ${doc.price || 'N/A'}`);
                        console.log(`      ⏰ Duration: ${doc.duration || 'N/A'}`);
                        console.log(`      ✅ Active: ${doc.isActive ? 'Yes' : 'No'}`);
                    } else if (name === 'UserSubscriptions') {
                        console.log(`      👤 User: ${doc.user || 'N/A'}`);
                        console.log(`      📋 Plan: ${doc.plan || 'N/A'}`);
                        console.log(`      ✅ Active: ${doc.isActive ? 'Yes' : 'No'}`);
                        console.log(`      📅 Expires: ${doc.expiresAt ? doc.expiresAt.toLocaleString() : 'N/A'}`);
                    }

                    console.log(`      🕒 Created: ${doc.createdAt ? doc.createdAt.toLocaleString() : 'N/A'}`);
                    console.log(`      🔄 Updated: ${doc.updatedAt ? doc.updatedAt.toLocaleString() : 'N/A'}`);
                    console.log('');
                });

                if (count > 20) {
                    console.log(`   ⚠️  Showing first 20 of ${count} ${name.toLowerCase()}`);
                    console.log('');
                }

            } catch (error) {
                console.log(`   ❌ Error checking ${name}: ${error.message}`);
                console.log('');
            }
        }

        // Step 5: Database statistics
        console.log('📊 DATABASE STATISTICS');
        console.log('─'.repeat(50));

        try {
            const db = connection.db;
            const stats = await db.stats();

            console.log(`   🗄️  Database Name: ${stats.db}`);
            console.log(`   📊 Collections: ${stats.collections}`);
            console.log(`   📄 Documents: ${stats.objects}`);
            console.log(`   💾 Data Size: ${(stats.dataSize / 1024 / 1024).toFixed(2)} MB`);
            console.log(`   🗂️  Storage Size: ${(stats.storageSize / 1024 / 1024).toFixed(2)} MB`);
            console.log(`   📈 Index Size: ${(stats.indexSize / 1024 / 1024).toFixed(2)} MB`);
            console.log('');

        } catch (error) {
            console.log(`   ❌ Error getting database stats: ${error.message}`);
            console.log('');
        }

        // Step 6: Summary
        console.log('📋 DATABASE SUMMARY');
        console.log('─'.repeat(50));

        let totalDocuments = 0;
        const summary = [];

        for (const { name, model } of models) {
            try {
                const count = await model.countDocuments();
                totalDocuments += count;
                summary.push(`${name}: ${count}`);
            } catch (error) {
                summary.push(`${name}: Error`);
            }
        }

        console.log(`   📊 Total Documents Across All Collections: ${totalDocuments}`);
        console.log(`   📋 Collection Breakdown:`);
        summary.forEach(item => {
            console.log(`      • ${item}`);
        });

        if (totalDocuments === 0) {
            console.log('');
            console.log('   ℹ️  DATABASE IS EMPTY');
            console.log('   💡 Use admin panel to upload content and create user accounts');
        }

        console.log('');
        console.log('✅ DATABASE INSPECTION COMPLETED');

    } catch (error) {
        console.error('\n❌ DATABASE INSPECTION FAILED');
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
    checkDatabase().then(() => {
        console.log('\n🏁 Database inspection completed');
        process.exit(0);
    }).catch((error) => {
        console.error('\n💥 Database inspection failed with error:', error.message);
        process.exit(1);
    });
}

module.exports = { checkDatabase };