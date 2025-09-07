const express = require('express');
const User = require('../models/User');
const Lecture = require('../models/Lecture');
const Category = require('../models/Category');
const FileCategory = require('../models/FileCategory');
const auth = require('../middleware/auth');
const subscription = require('../middleware/subscription');

const router = express.Router();

// CLEAN CONTENT SERVING - FRESH IMPLEMENTATION
console.log('🚀 INITIALIZING FRESH CONTENT SERVING ARCHITECTURE');

// Get list of available lectures from database
router.get('/lectures', auth, subscription, async (req, res) => {
  try {
    // Get file-category mappings from database, ensure uniqueness by filename
    const fileCategories = await FileCategory.find({})
      .populate('category')
      .sort({ createdAt: -1 });

    // Create a map to ensure uniqueness and include _id for better key management
    const uniqueLectures = new Map();
    fileCategories.forEach(fileCategory => {
      if (!uniqueLectures.has(fileCategory.filename)) {
        uniqueLectures.set(fileCategory.filename, {
          _id: fileCategory._id, // Include the document ID for unique keys
          fileName: fileCategory.filename,
          displayName: fileCategory.title,
          description: fileCategory.description,
          url: `/lectures/${fileCategory.filename}`,
          category: fileCategory.category ? {
            _id: fileCategory.category._id,
            name: fileCategory.category.name
          } : null
        });
      }
    });

    // Convert map to array
    const lectures = Array.from(uniqueLectures.values());

    res.json(lectures);
  } catch (err) {
    console.error('Error fetching lectures:', err);
    res.status(500).json({ message: 'Error fetching lecture list' });
  }
});

// Get user's lecture progress
router.get('/progress', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    res.json(user.lectureProgress || []);
  } catch (err) {
    console.error('Error fetching progress:', err);
    res.status(500).json({ message: 'Error fetching lecture progress' });
  }
});

// Get all file-based lectures from FileCategory
router.get('/lectures/file-based', auth, subscription, async (req, res) => {
  try {
    const fileCategories = await FileCategory.find({})
      .populate('category')
      .sort({ createdAt: -1 });

    const lectures = fileCategories.map(fileCat => ({
      fileName: fileCat.filename,
      displayName: fileCat.title,
      description: fileCat.description || 'Lecture content description',
      url: `/lecture/${fileCat.filename}`,
      category: fileCat.category ? fileCat.category.name : 'Uncategorized',
      categoryObj: fileCat.category,
      createdAt: fileCat.createdAt,
      size: fileCat.content ? Buffer.byteLength(fileCat.content, 'utf8') : 0
    }));

    res.json(lectures);
  } catch (err) {
    console.error('Error fetching file-based lectures:', err);
    res.status(500).json({ message: 'Error fetching lectures', error: err.message });
  }
});

// Get all lectures from database
router.get('/lectures/database', auth, subscription, async (req, res) => {
  try {
    const lectures = await Lecture.find({}).sort({ createdAt: -1 });
    res.json(lectures);
  } catch (err) {
    console.error('Error fetching lectures:', err);
    res.status(500).json({ message: 'Error fetching lectures', error: err.message });
  }
});

// Get a specific lecture by slug
router.get('/lectures/database/:slug', auth, subscription, async (req, res) => {
  try {
    const { slug } = req.params;
    const lecture = await Lecture.findOne({ slug });
    
    if (!lecture) {
      return res.status(404).json({ message: 'Lecture not found' });
    }
    
    res.json(lecture);
  } catch (err) {
    console.error('Error fetching lecture:', err);
    res.status(500).json({ message: 'Error fetching lecture', error: err.message });
  }
});

// Get lecture content from database by filename - FRESH IMPLEMENTATION (ENHANCED DEBUGGING)
router.get('/lecture-content/:filename', auth, subscription, async (req, res) => {
  try {
    const { filename } = req.params;
    
    console.log(`🔍 FRESH API REQUEST: Fetching content for ${filename}`);

    // DIRECT QUERY WITH EXPLICIT PROJECTION AND LEAN FOR PERFORMANCE
    const lecture = await FileCategory.findOne({ filename: filename })
      .select('content filename title description category')
      .lean()
      .exec();

    // IMMEDIATE VALIDATION - NO COMPLEX PROCESSING
    if (!lecture) {
      console.log(`❌ FRESH API: Lecture not found - ${filename}`);
      return res.status(404).json({ 
        message: 'Lecture not found', 
        filename 
      });
    }

    console.log(`📊 LECTURE DOCUMENT FOUND:`, {
      id: lecture._id,
      filename: lecture.filename,
      hasContentField: lecture.content !== undefined,
      contentIsNull: lecture.content === null,
      contentType: typeof lecture.content,
      contentLength: lecture.content ? (Buffer.isBuffer(lecture.content) ? lecture.content.length : lecture.content.length) : 0
    });

    // ENHANCED CONTENT VALIDATION - Handle all possible content states with detailed debugging
    const content = lecture.content;
    
    // Check if content exists and is not empty
    if (content === null || content === undefined) {
      console.log(`❌ FRESH API: Content is null/undefined - ${filename}`);
      return res.status(404).json({ 
        message: 'Lecture content not available', 
        filename,
        contentState: 'null_or_undefined',
        lectureId: lecture._id
      });
    }

    // Handle different content types properly with enhanced debugging
    let contentString = '';
    let contentLength = 0;

    if (Buffer.isBuffer(content)) {
      contentString = content.toString('utf8');
      contentLength = contentString.length;
      console.log(`📄 Buffer content converted: ${contentLength} chars`);
    } else if (typeof content === 'string') {
      contentString = content;
      contentLength = contentString.length;
      console.log(`📄 String content: ${contentLength} chars`);
    } else if (content && typeof content === 'object') {
      // Handle object content (might be MongoDB Binary or other formats)
      console.log(`🔧 Object content detected:`, {
        constructor: content.constructor.name,
        keys: Object.keys(content),
        hasToString: typeof content.toString === 'function'
      });
      
      try {
        contentString = content.toString();
        contentLength = contentString.length;
        console.log(`📄 Object content converted: ${contentLength} chars`);
      } catch (convertError) {
        console.log(`❌ Object content conversion failed:`, convertError.message);
        contentString = '';
        contentLength = 0;
      }
    } else {
      // Handle unexpected content types
      console.log(`❓ Unexpected content type: ${typeof content}`);
      try {
        contentString = content ? content.toString() : '';
        contentLength = contentString.length;
        console.log(`📄 Unexpected content type converted: ${contentLength} chars`);
      } catch (convertError) {
        console.log(`❌ Unexpected content conversion failed:`, convertError.message);
        contentString = '';
        contentLength = 0;
      }
    }

    console.log(`📊 CONTENT ANALYSIS:`, {
      finalContentLength: contentLength,
      finalContentType: typeof contentString,
      isContentEmpty: contentLength === 0
    });

    // VALIDATE CONTENT LENGTH - RELAXED VALIDATION FOR DEBUGGING
    if (contentLength < 50) {  // Reduced from 100 for better debugging
      console.log(`❌ FRESH API: Content too short (${contentLength} chars) - ${filename}`);
      return res.status(404).json({ 
        message: 'Lecture content incomplete', 
        filename,
        contentLength,
        contentState: 'too_short',
        lectureId: lecture._id
      });
    }

    // IMMEDIATE RESPONSE WITHOUT ANY ADDITIONAL PROCESSING
    console.log(`✅ FRESH API SERVED: ${contentLength} chars for ${filename}`);
    
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Content-Length', contentLength);
    res.setHeader('X-Content-Source', 'Fresh-Database-Direct');
    res.setHeader('X-File-Size', contentLength);
    
    res.status(200).send(contentString);

  } catch (error) {
    console.error('❌ FRESH API ERROR:', error);
    res.status(500).json({ 
      message: 'Error serving lecture content',
      error: error.message 
    });
  }
});

// Get all categories
router.get('/categories', auth, subscription, async (req, res) => {
  try {
    const categories = await Category.find({ isActive: true }).sort({ order: 1, name: 1 });
    res.json(categories);
  } catch (err) {
    console.error('Error fetching categories:', err);
    res.status(500).json({ message: 'Error fetching categories', error: err.message });
  }
});

// Get file-based lectures by category
router.get('/lectures/category/:categoryId', auth, subscription, async (req, res) => {
  try {
    const { categoryId } = req.params;

    // Find file-category mappings for this category
    const fileCategories = await FileCategory.find({ category: categoryId }).populate('category');

    // Ensure uniqueness
    const uniqueLectures = new Map();
    fileCategories.forEach(fc => {
      if (!uniqueLectures.has(fc.filename)) {
        uniqueLectures.set(fc.filename, {
          _id: fc._id,
          fileName: fc.filename,
          displayName: fc.title,
          description: fc.description,
          url: `/lectures/${fc.filename}`,
          category: fc.category ? {
            _id: fc.category._id,
            name: fc.category.name
          } : null
        });
      }
    });

    const lectures = Array.from(uniqueLectures.values());
    res.json(lectures);
  } catch (err) {
    console.error('Error fetching lectures by category:', err);
    res.status(500).json({ message: 'Error fetching lectures', error: err.message });
  }
});

module.exports = router;
