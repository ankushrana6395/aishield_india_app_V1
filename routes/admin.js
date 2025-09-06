const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const User = require('../models/User');
const Lecture = require('../models/Lecture');
const Category = require('../models/Category');
const FileCategory = require('../models/FileCategory');
const auth = require('../middleware/auth');

const router = express.Router();

// Admin middleware
const adminAuth = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Access denied. Admins only.' });
  }
  next();
};

// Get all users (for admin panel)
router.get('/users', auth, adminAuth, async (req, res) => {
  try {
    const users = await User.find({}).select('-password');
    res.json(users);
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({ message: 'Error fetching users' });
  }
});

// Get all subscribers
router.get('/subscribers', auth, adminAuth, async (req, res) => {
  try {
    const subscribers = await User.find({ isSubscribed: true }).select('-password');
    res.json(subscribers);
  } catch (err) {
    console.error('Error fetching subscribers:', err);
    res.status(500).json({ message: 'Error fetching subscribers' });
  }
});

// Manually verify/revoke subscription
router.put('/subscription/:userId', auth, adminAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    const { action } = req.body; // 'verify' or 'revoke'
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    if (action === 'verify') {
      user.isSubscribed = true;
      user.subscription = {
        status: 'completed',
        subscribedAt: new Date(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
      };
    } else if (action === 'revoke') {
      user.isSubscribed = false;
      user.subscription = {
        status: 'cancelled'
      };
    } else {
      return res.status(400).json({ message: 'Invalid action. Use "verify" or "revoke"' });
    }
    
    await user.save();
    
    res.json({
      message: `Subscription ${action}ed successfully`,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        isSubscribed: user.isSubscribed,
        subscription: user.subscription
      }
    });
  } catch (err) {
    console.error('Error updating subscription:', err);
    res.status(500).json({ message: 'Error updating subscription' });
  }
});

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Ensure the client public lectures directory exists
    const lecturesDir = path.join(__dirname, '..', 'client', 'public', 'lectures');
    if (!fs.existsSync(lecturesDir)) {
      fs.mkdirSync(lecturesDir, { recursive: true });
    }
    cb(null, lecturesDir);
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => {
    // Only allow HTML files
    if (file.mimetype === 'text/html' || file.originalname.endsWith('.html')) {
      cb(null, true);
    } else {
      cb(new Error('Only HTML files are allowed'));
    }
  }
});

// Upload lecture files with category
router.post('/upload-lecture', auth, adminAuth, upload.single('lecture'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
    
    const { category, title, description } = req.body;
    
    // Validate category
    if (!category) {
      return res.status(400).json({ message: 'Category is required' });
    }
    
    // Check if category exists
    const categoryDoc = await Category.findById(category);
    if (!categoryDoc) {
      return res.status(400).json({ message: 'Invalid category' });
    }
    
    // Create or update file-category mapping
    const filename = req.file.filename;
    let fileCategory = await FileCategory.findOne({ filename });
    
    if (!title) {
      // Generate title from filename if not provided
      const generatedTitle = filename
        .replace('.html', '')
        .replace(/[-_]/g, ' ')
        .replace(/\b\w/g, l => l.toUpperCase());
      
      if (!fileCategory) {
        fileCategory = new FileCategory({
          filename,
          category,
          title: generatedTitle,
          description: description || ''
        });
      } else {
        fileCategory.category = category;
        fileCategory.title = generatedTitle;
        fileCategory.description = description || '';
      }
    } else {
      if (!fileCategory) {
        fileCategory = new FileCategory({
          filename,
          category,
          title,
          description: description || ''
        });
      } else {
        fileCategory.category = category;
        fileCategory.title = title;
        fileCategory.description = description || '';
      }
    }
    
    await fileCategory.save();
    
    // Update category lecture count
    const lectureCount = await FileCategory.countDocuments({ category });
    categoryDoc.lectureCount = lectureCount;
    await categoryDoc.save();
    
    res.json({
      message: 'Lecture uploaded successfully',
      file: {
        filename: req.file.filename,
        path: req.file.path,
        size: req.file.size
      }
    });
  } catch (err) {
    console.error('Error uploading lecture:', err);
    res.status(500).json({ message: 'Error uploading lecture' });
  }
});

// Get list of all lecture files
router.get('/lectures', auth, adminAuth, (req, res) => {
  try {
    const lecturesDir = path.join(__dirname, '..', 'client', 'public', 'lectures');
    
    if (!fs.existsSync(lecturesDir)) {
      return res.json([]);
    }
    
    const files = fs.readdirSync(lecturesDir);
    const lectures = files
      .filter(file => file.endsWith('.html'))
      .map(file => {
        const stats = fs.statSync(path.join(lecturesDir, file));
        return {
          fileName: file,
          displayName: file.replace('.html', '').replace(/[-_]/g, ' '),
          size: stats.size,
          createdAt: stats.birthtime,
          updatedAt: stats.mtime
        };
      })
      .sort((a, b) => a.displayName.localeCompare(b.displayName));
    
    res.json(lectures);
  } catch (err) {
    console.error('Error fetching lectures:', err);
    res.status(500).json({ message: 'Error fetching lectures' });
  }
});

// Delete a lecture file
router.delete('/lectures/:filename', auth, adminAuth, (req, res) => {
  try {
    const { filename } = req.params;
    
    // Security check to prevent directory traversal
    if (filename.includes('..') || filename.includes('/')) {
      return res.status(400).json({ message: 'Invalid filename' });
    }
    
    const filePath = path.join(__dirname, '..', 'client', 'public', 'lectures', filename);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'File not found' });
    }
    
    fs.unlinkSync(filePath);
    
    res.json({ message: 'Lecture deleted successfully' });
  } catch (err) {
    console.error('Error deleting lecture:', err);
    res.status(500).json({ message: 'Error deleting lecture' });
  }
});

// Create a new lecture
router.post('/lectures/create', auth, adminAuth, async (req, res) => {
  try {
    const { title, subtitle, description, slug, sections, quizQuestions, isHinglish } = req.body;
    
    // Check if lecture with this slug already exists
    const existingLecture = await Lecture.findOne({ slug });
    if (existingLecture) {
      return res.status(400).json({ message: 'A lecture with this slug already exists' });
    }
    
    const lecture = new Lecture({
      title,
      subtitle,
      description,
      slug,
      sections,
      quizQuestions,
      isHinglish
    });
    
    await lecture.save();
    
    res.status(201).json({
      message: 'Lecture created successfully',
      lecture
    });
  } catch (err) {
    console.error('Error creating lecture:', err);
    res.status(500).json({ message: 'Error creating lecture', error: err.message });
  }
});

// Update a lecture
router.put('/lectures/:id', auth, adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, subtitle, description, slug, sections, quizQuestions, isHinglish } = req.body;
    
    // Check if lecture exists
    const lecture = await Lecture.findById(id);
    if (!lecture) {
      return res.status(404).json({ message: 'Lecture not found' });
    }
    
    // Check if another lecture with this slug already exists
    if (slug !== lecture.slug) {
      const existingLecture = await Lecture.findOne({ slug });
      if (existingLecture) {
        return res.status(400).json({ message: 'A lecture with this slug already exists' });
      }
    }
    
    lecture.title = title;
    lecture.subtitle = subtitle;
    lecture.description = description;
    lecture.slug = slug;
    lecture.sections = sections;
    lecture.quizQuestions = quizQuestions;
    lecture.isHinglish = isHinglish;
    
    await lecture.save();
    
    res.json({
      message: 'Lecture updated successfully',
      lecture
    });
  } catch (err) {
    console.error('Error updating lecture:', err);
    res.status(500).json({ message: 'Error updating lecture', error: err.message });
  }
});

// Delete a lecture from database
router.delete('/lectures/delete/:id', auth, adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    
    const lecture = await Lecture.findByIdAndDelete(id);
    if (!lecture) {
      return res.status(404).json({ message: 'Lecture not found' });
    }
    
    res.json({ message: 'Lecture deleted successfully' });
  } catch (err) {
    console.error('Error deleting lecture:', err);
    res.status(500).json({ message: 'Error deleting lecture', error: err.message });
  }
});

// Get all lectures from database
router.get('/lectures/database', auth, adminAuth, async (req, res) => {
  try {
    const lectures = await Lecture.find({}).sort({ createdAt: -1 });
    res.json(lectures);
  } catch (err) {
    console.error('Error fetching lectures:', err);
    res.status(500).json({ message: 'Error fetching lectures', error: err.message });
  }
});

// Get a specific lecture by ID
router.get('/lectures/database/:id', auth, adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const lecture = await Lecture.findById(id);
    
    if (!lecture) {
      return res.status(404).json({ message: 'Lecture not found' });
    }
    
    res.json(lecture);
  } catch (err) {
    console.error('Error fetching lecture:', err);
    res.status(500).json({ message: 'Error fetching lecture', error: err.message });
  }
});

// Category management routes

// Create a new category
router.post('/categories', auth, adminAuth, async (req, res) => {
  try {
    const { name, description, slug, parentCategory, order } = req.body;
    
    // Check if category with this slug already exists
    const existingCategory = await Category.findOne({ slug });
    if (existingCategory) {
      return res.status(400).json({ message: 'A category with this slug already exists' });
    }
    
    const category = new Category({
      name,
      description,
      slug,
      parentCategory: parentCategory || null,
      order: order || 0
    });
    
    await category.save();
    
    res.status(201).json({
      message: 'Category created successfully',
      category
    });
  } catch (err) {
    console.error('Error creating category:', err);
    res.status(500).json({ message: 'Error creating category', error: err.message });
  }
});

// Get all categories
router.get('/categories', auth, adminAuth, async (req, res) => {
  try {
    const categories = await Category.find({}).sort({ order: 1, name: 1 });
    res.json(categories);
  } catch (err) {
    console.error('Error fetching categories:', err);
    res.status(500).json({ message: 'Error fetching categories', error: err.message });
  }
});

// Get a specific category by ID
router.get('/categories/:id', auth, adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const category = await Category.findById(id);
    
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }
    
    res.json(category);
  } catch (err) {
    console.error('Error fetching category:', err);
    res.status(500).json({ message: 'Error fetching category', error: err.message });
  }
});

// Update a category
router.put('/categories/:id', auth, adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, slug, parentCategory, order } = req.body;
    
    // Check if category exists
    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }
    
    // Check if another category with this slug already exists
    if (slug !== category.slug) {
      const existingCategory = await Category.findOne({ slug });
      if (existingCategory) {
        return res.status(400).json({ message: 'A category with this slug already exists' });
      }
    }
    
    category.name = name;
    category.description = description;
    category.slug = slug;
    category.parentCategory = parentCategory || null;
    category.order = order !== undefined ? order : category.order;
    
    await category.save();
    
    res.json({
      message: 'Category updated successfully',
      category
    });
  } catch (err) {
    console.error('Error updating category:', err);
    res.status(500).json({ message: 'Error updating category', error: err.message });
  }
});

// Delete a category
router.delete('/categories/:id', auth, adminAuth, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if category has child categories
    const childCount = await Category.countDocuments({ parentCategory: id });
    if (childCount > 0) {
      return res.status(400).json({
        message: 'Cannot delete category that has child categories. Please delete child categories first.'
      });
    }

    // Check if category is being used by any lectures or file categories
    const lectureCount = await Lecture.countDocuments({ category: id });
    const fileCategoryCount = await FileCategory.countDocuments({ category: id });

    if (lectureCount > 0 || fileCategoryCount > 0) {
      const totalCount = lectureCount + fileCategoryCount;

      // Get more details about what is associated
      const lectures = await Lecture.find({ category: id }).select('title');
      const fileCategories = await FileCategory.find({ category: id }).select('filename title');

      const details = [];
      if (lectures.length > 0) {
        details.push(`Database lectures: ${lectures.map(l => l.title).join(', ')}`);
      }
      if (fileCategories.length > 0) {
        details.push(`File-based lectures: ${fileCategories.map(f => f.title || f.filename).join(', ')}`);
      }

      return res.status(400).json({
        message: `Cannot delete category that is associated with ${totalCount} lecture(s). Please reassign lectures first.`,
        details: details,
        associatedContent: {
          lectureCount,
          fileCategoryCount,
          lectures: lectures,
          fileCategories: fileCategories
        }
      });
    }

    const category = await Category.findByIdAndDelete(id);
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    res.json({ message: 'Category deleted successfully' });
  } catch (err) {
    console.error('Error deleting category:', err);
    res.status(500).json({ message: 'Error deleting category', error: err.message });
  }
});

// Reorder categories
router.put('/categories/reorder', auth, adminAuth, async (req, res) => {
  try {
    const { categories } = req.body; // Array of { id, order } objects
    
    // Update order for each category
    const updatePromises = categories.map(({ id, order }) => 
      Category.findByIdAndUpdate(id, { order })
    );
    
    await Promise.all(updatePromises);
    
    res.json({ message: 'Categories reordered successfully' });
  } catch (err) {
    console.error('Error reordering categories:', err);
    res.status(500).json({ message: 'Error reordering categories', error: err.message });
  }
});

module.exports = router;
