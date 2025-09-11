const mongoose = require('mongoose');
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

async function testUploadFix() {
  try {
    console.log('🔧 Testing the ContentId Fix...');

    // Check if test file exists
    if (!fs.existsSync('./test-lecture.html')) {
      console.error('❌ Test file ./test-lecture.html not found');
      return;
    }

    // Start the server if not running
    const server = require('./server');
    console.log('🚀 Starting server...');

    // Wait a moment for server to start
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Prepare upload data
    const formData = new FormData();
    const fileStream = fs.createReadStream('./test-lecture.html');

    formData.append('file', fileStream, 'test-lecture.html');
    formData.append('category', '66c3a9a8a6b6f9b3b5e0f0f1'); // Example category ID
    formData.append('title', 'Test Lecture - Fixed');
    formData.append('description', 'Testing the contentId fix');

    // Simulate parsedLectureData
    const parsedLectureData = {
      title: 'Test Lecture - Fixed',
      subtitle: 'Test Lecture - Interactive Learning Module',
      slug: 'test-lecture-fixed',
      sections: [
        {
          title: "Introduction",
          content: [
            {
              heading: "What is Test?",
              paragraphs: ["This is a test lecture with fixed contentId"]
            }
          ]
        }
      ],
      quizQuestions: [
        {
          question: { en: "Is contentId fixed?", hi: "क्या contentId ठीक है?" },
          options: {
            en: ["Yes", "No", "Maybe", "Hopefully"],
            hi: ["हाँ", "नहीं", "शायद", "आशा है"]
          },
          correctAnswer: 0,
          explanation: { en: "Yes, contentId is now fixed!", hi: "हाँ, contentId अब ठीक है!" }
        }
      ],
      description: "Test lecture to verify contentId fix."
    };

    formData.append('parsedLectureData', JSON.stringify(parsedLectureData));

    console.log('📤 Sending test upload request...');

    const response = await axios.post('http://localhost:5000/api/admin/upload-lecture', formData, {
      headers: {
        ...formData.getHeaders(),
        // Add auth header if needed (this might need adjustment based on your auth setup)
        // 'Authorization': 'Bearer your-token-here'
      },
      maxContentLength: Infinity,
      maxBodyLength: Infinity
    });

    console.log('✅ UPLOAD SUCCESSFUL!');
    console.log('📄 Response:', response.data);

    // Verify contentId was assigned
    if (response.data.lecture && response.data.lecture.contentId) {
      console.log('🎉 SUCCESS: contentId properly assigned:', response.data.lecture.contentId);
    } else {
      console.log('❌ ISSUE: contentId still missing in response');
    }

    // Check database for the created lecture
    if (response.data.lecture && response.data.lecture.id) {
      const Lecture = require('./models/Lecture');
      const createdLecture = await Lecture.findById(response.data.lecture.id);
      if (createdLecture) {
        console.log('🔍 DATABASE VERIFICATION:');
        console.log('  - Lecture found in DB:', createdLecture.title);
        console.log('  - contentId in DB:', createdLecture.contentId);
        console.log('  - contentId exists:', !!createdLecture.contentId);
      }
    }

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Full response:', error.response.data);
    }
  } finally {
    // Close server
    process.exit(0);
  }
}

testUploadFix();