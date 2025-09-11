const mongoose = require('mongoose');
require('./config/environment');

async function testMongoConnection() {
  try {
    console.log('🔧 TESTING MONGODB CONNECTION AND SCHEMA');
    console.log('==========================================');

    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000
    });

    console.log('✅ Database connected successfully');

    const Lecture = require('./models/Lecture');

    // Step 1: Test basic find operation
    console.log('\n1️⃣ Testing basic find operation...');
    const allLectures = await Lecture.find({}).limit(1);
    console.log(`✅ Basic find works: ${allLectures.length} lectures found`);

    // Step 2: Test update operation with simple field
    console.log('\n2️⃣ Testing update operation...');
    const testLecture = allLectures[0];
    if (testLecture) {
      console.log(`   Testing with lecture ID: ${testLecture._id}`);
      console.log(`   Current contentId: ${testLecture.contentId || 'NONE'}`);

      const updateResult = await Lecture.updateOne(
        { _id: testLecture._id },
        { $set: { updatedAt: new Date() } } // Try updating a safe field
      );

      console.log('   📊 Update result:');
      console.log(`     - Matched: ${updateResult.matchedCount}`);
      console.log(`     - Modified: ${updateResult.modifiedCount}`);
      console.log(`     - Acknowledged: ${updateResult.acknowledged}`);

      if (updateResult.acknowledged) {
        console.log('   ✅ Update operation works!');
      } else {
        console.log('   ❌ Update operation NOT acknowledged');
      }
    } else {
      console.log('   ❌ No lectures found to test update');
    }

    // Step 3: Test direct MongoDB client
    console.log('\n3️⃣ Testing direct MongoDB client...');
    const db = mongoose.connection.db;
    const collection = db.collection('lectures');

    // Test findOne
    const doc = await collection.findOne({});
    console.log(`✅ Direct MongoDB findOne works: ${doc ? doc.title : 'none'}`);

    // Test updateOne
    if (doc) {
      const updateResult = await collection.updateOne(
        { _id: doc._id },
        { $set: { lastTested: new Date() } }
      );

      console.log('   📊 Direct MongoDB update result:');
      console.log(`     - Matched: ${updateResult.matchedCount}`);
      console.log(`     - Modified: ${updateResult.modifiedCount}`);
      console.log(`     - Acknowledged: ${updateResult.acknowledged}`);

      if (updateResult.acknowledged) {
        console.log('   ✅ Direct MongoDB update works!');
      } else {
        console.log('   ❌ Direct MongoDB update NOT acknowledged');
      }
    }

    // Step 4: Check schema validation
    console.log('\n4️⃣ Testing schema validation...');

    const testDoc = {
      title: 'Test Lecture',
      slug: 'test-lecture-' + Date.now(),
      category: null, // Will be set properly
      course: null,
      contentId: 'test-content-id',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    try {
      const newLecture = new Lecture(testDoc);
      await newLecture.validate();
      console.log('✅ Schema validation passes');

      // Try to save (but don't actually save it)
      // await newLecture.save();
      // console.log('✅ Schema save works');

    } catch (validationError) {
      console.log('❌ Schema validation failed:');
      console.log('   Error:', validationError.message);
      if (validationError.errors) {
        Object.keys(validationError.errors).forEach(key => {
          console.log(`   ${key}: ${validationError.errors[key].message}`);
        });
      }
    }

    // Step 5: Check for any write concerns
    console.log('\n5️⃣ Checking MongoDB connection details...');

    const connection = mongoose.connection;
    console.log(`   Connection ready state: ${connection.readyState}`);
    console.log(`   Database name: ${connection.name}`);
    console.log(`   Host: ${connection.host}`);

    // Get collection stats
    const stats = await collection.stats();
    console.log(`   Collection size: ${stats.size} bytes`);
    console.log(`   Document count: ${stats.count}`);

    console.log('\n✨ CONNECTION TEST SUMMARY:');
    console.log('─'.repeat(60));

    const issues = [];

    if (!updateResult?.acknowledged) {
      issues.push('Mongoose update operations not acknowledged');
    }

    if (!doc) {
      issues.push('No documents found in collection');
    }

    if (issues.length === 0) {
      console.log('✅ All connection tests passed');
      console.log('🔧 Issue might be with specific field updates or document selection');
    } else {
      console.log('❌ Connection issues found:');
      issues.forEach((issue, index) => {
        console.log(`   ${index + 1}. ${issue}`);
      });
    }

    await mongoose.connection.close();
    console.log('\n✅ Database closed');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

testMongoConnection();