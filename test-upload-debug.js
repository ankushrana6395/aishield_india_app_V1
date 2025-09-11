const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();

// Configure multer for debugging
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, 'debug-uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    console.log('DEBUG MULTER FILENAME:', {
      originalname: file.originalname,
      fieldname: file.fieldname,
      mimetype: file.mimetype,
      size: file.size
    });
    cb(null, file.originalname);
  }
});

const upload = multer({ storage });

// Debug middleware
app.use((req, res, next) => {
  console.log('🔍 REQUEST RECEIVED:', {
    method: req.method,
    url: req.url,
    headers: req.headers,
    contentType: req.headers['content-type']
  });
  next();
});

// Debug upload endpoint
app.post('/debug-upload', upload.single('file'), (req, res) => {
  console.log('📤 DEBUG UPLOAD REQUEST BODY:', req.body);
  console.log('📄 DEBUG FILE DETAILS:', req.file ? {
    fieldname: req.file.fieldname,
    originalname: req.file.originalname,
    filename: req.file.filename,
    size: req.file.size,
    path: req.file.path
  } : 'NO FILE RECEIVED');

  // Check if parsedLectureData exists and is valid JSON
  if (req.body.parsedLectureData) {
    try {
      const parsed = JSON.parse(req.body.parsedLectureData);
      console.log('✅ PARSED LECTURE DATA:', {
        title: parsed.title,
        sections: parsed.sections?.length,
        quizQuestions: parsed.quizQuestions?.length
      });
    } catch (error) {
      console.log('❌ INVALID PARSED LECTURE DATA:', error.message);
    }
  } else {
    console.log('⚠️ NO PARSED LECTURE DATA RECEIVED');
  }

  res.json({
    message: 'Debug upload successful',
    received: {
      category: req.body.category,
      title: req.body.title,
      description: req.body.description,
      courseId: req.body.courseId,
      hasParsedData: !!req.body.parsedLectureData,
      hasFile: !!req.file
    }
  });
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`🚀 Debug server running on port ${PORT}`);
  console.log(`📤 Test endpoint: POST http://localhost:${PORT}/debug-upload`);
});