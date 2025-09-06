const express = require('express');
const fs = require('fs');
const path = require('path');
const User = require('../models/User');
const Lecture = require('../models/Lecture');
const Category = require('../models/Category');
const FileCategory = require('../models/FileCategory');
const auth = require('../middleware/auth');
const subscription = require('../middleware/subscription');

const router = express.Router();

// Get list of available lectures
router.get('/lectures', auth, subscription, async (req, res) => {
  try {
    // Read the lectures directory
    const lecturesDir = path.join(__dirname, '..', 'client', 'public', 'lectures');
    
    // Read all files in the directory
    const files = fs.readdirSync(lecturesDir);
    
    // Filter only HTML files
    const htmlFiles = files.filter(file => file.endsWith('.html'));
    
    // Get file-category mappings for all files
    const fileCategories = await FileCategory.find({
      filename: { $in: htmlFiles }
    }).populate('category');
    
    // Create a map for quick lookup
    const fileCategoryMap = {};
    fileCategories.forEach(fc => {
      fileCategoryMap[fc.filename] = fc;
    });
    
    // Create the lectures list with category information when available
    const lectures = htmlFiles
      .map(file => {
        const fileCategory = fileCategoryMap[file];
        
        if (fileCategory) {
          // Use FileCategory information when available
          return {
            fileName: file,
            displayName: fileCategory.title,
            description: fileCategory.description,
            url: `/lectures/${file}`,
            category: fileCategory.category ? {
              _id: fileCategory.category._id,
              name: fileCategory.category.name
            } : null
          };
        } else {
          // Fallback to generating display name from filename
          const displayName = file
            .replace('.html', '')
            .replace(/[-_]/g, ' ')
            .replace(/\b\w/g, l => l.toUpperCase());
          
          return {
            fileName: file,
            displayName: displayName,
            url: `/lectures/${file}`
          };
        }
      })
      .sort((a, b) => a.displayName.localeCompare(b.displayName)); // Sort alphabetically
    
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
    const fileCategories = await FileCategory.find({ category: categoryId });
    
    // Transform to match the expected format
    const lectures = fileCategories.map(fc => ({
      fileName: fc.filename,
      displayName: fc.title,
      description: fc.description,
      url: `/lectures/${fc.filename}`,
      category: fc.category
    }));
    
    res.json(lectures);
  } catch (err) {
    console.error('Error fetching lectures by category:', err);
    res.status(500).json({ message: 'Error fetching lectures', error: err.message });
  }
});

module.exports = router;
