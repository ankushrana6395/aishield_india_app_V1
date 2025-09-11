const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

async function simulateFrontendUpload() {
  try {
    console.log('🚀 Simulating frontend upload to debug server...');

    // Create FormData like the frontend does
    const formData = new FormData();

    // Add file
    const filePath = './test-lecture.html';
    if (!fs.existsSync(filePath)) {
      console.error('❌ Test file not found:', filePath);
      return;
    }

    const fileStream = fs.createReadStream(filePath);
    formData.append('file', fileStream, 'test-lecture.html');

    // Add form data like frontend
    formData.append('category', '66c3a9a8a6b6f9b3b5e0f0f1'); // Example category ID
    formData.append('title', 'Test Lecture');
    formData.append('description', 'Test lecture for debugging');

    // Simulate parsedLectureData like frontend
    const parsedLectureData = {
      title: 'Test Lecture',
      subtitle: 'Test Lecture - Interactive Learning Module',
      slug: 'test-lecture',
      sections: [
        {
          title: "Introduction",
          content: [
            {
              heading: "What is Test?",
              paragraphs: ["This is a test lecture"]
            }
          ]
        }
      ],
      quizQuestions: [
        {
          question: { en: "What is this?", hi: "यह क्या है?" },
          options: {
            en: ["Test", "Real", "Debug", "Production"],
            hi: ["टेस्ट", "रीयल", "डिबग", "प्रोडक्शन"]
          },
          correctAnswer: 0,
          explanation: { en: "This is a test", hi: "यह एक टेस्ट है" }
        }
      ],
      description: "Test lecture covering debugging techniques."
    };

    formData.append('parsedLectureData', JSON.stringify(parsedLectureData));

    console.log('📤 Sending FormData with:');
    console.log('  - File: test-lecture.html');
    console.log('  - Category: 66c3a9a8a6b6f9b3b5e0f0f1');
    console.log('  - Title: Test Lecture');
    console.log('  - Parsed Data: Yes');

    // Send to debug server
    const response = await axios.post('http://localhost:3001/debug-upload', formData, {
      headers: {
        ...formData.getHeaders(),
      },
      maxContentLength: Infinity,
      maxBodyLength: Infinity
    });

    console.log('✅ Debug server response:', response.data);

  } catch (error) {
    console.error('❌ Simulation failed:', error.response?.data || error.message);
    if (error.response) {
      console.log('Response status:', error.response.status);
      console.log('Response headers:', error.response.headers);
    }
  }
}

simulateFrontendUpload();